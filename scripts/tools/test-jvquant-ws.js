#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * JvQuant WebSocket 连通性与数据断言脚本
 *
 * 目标：
 * 1. 连接 /api/v1/stream-receiver/connect
 * 2. 订阅 stream-stock-quote（preferredProvider=jvquant）
 * 3. 校验预期市场是否收到数据，并输出价格/成交量等关键字段
 *
 * 常用环境变量：
 * - BASE_URL: 服务地址（默认 http://127.0.0.1:3001）
 * - WS_PATH: WebSocket 路径（默认 /api/v1/stream-receiver/connect）
 * - APP_KEY / ACCESS_TOKEN: API Key 认证对（必填，除非使用 USERNAME/PASSWORD 自动创建）
 * - USERNAME / PASSWORD: 当未提供 APP_KEY/ACCESS_TOKEN 时，自动登录并创建临时 API Key
 * - SYMBOLS: 逗号分隔符号列表（默认 00700.HK,AAPL.US,600519.SH）
 * - EXPECT_MARKETS: 逗号分隔预期市场（默认 HK,US,CN）
 * - MIN_DATA_COUNT: 最少数据条数阈值（默认 3）
 * - TIMEOUT_MS: 测试超时毫秒（默认 60000）
 * - VERBOSE_PACKET=1: 打印完整原始 packet
 */

const { io } = require("socket.io-client");

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3001";
const WS_PATH = process.env.WS_PATH || "/api/v1/stream-receiver/connect";
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 60000);
const VERBOSE_PACKET = ["1", "true", "yes", "on"].includes(
  String(process.env.VERBOSE_PACKET || "").toLowerCase(),
);
const EXPECT_MARKETS = (process.env.EXPECT_MARKETS || "HK,US,CN")
  .split(",")
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);

const symbols = (process.env.SYMBOLS || "00700.HK,AAPL.US,600519.SH")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function detectMarket(symbol) {
  const upper = String(symbol || "").toUpperCase();
  if (upper.endsWith(".HK")) return "HK";
  if (upper.endsWith(".US")) return "US";
  if (upper.endsWith(".SH") || upper.endsWith(".SZ")) return "CN";
  return "UNKNOWN";
}

async function requestJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${url}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function resolveApiKeyPair() {
  const fromEnv = {
    appKey: process.env.APP_KEY,
    accessToken: process.env.ACCESS_TOKEN,
  };
  if (fromEnv.appKey && fromEnv.accessToken) {
    return { ...fromEnv, source: "env" };
  }

  const username = process.env.USERNAME;
  const password = process.env.PASSWORD;
  if (!username || !password) {
    throw new Error(
      "缺少认证参数：请提供 APP_KEY+ACCESS_TOKEN，或 USERNAME+PASSWORD",
    );
  }

  const login = await requestJson(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const jwt = login?.accessToken;
  if (!jwt) {
    throw new Error(`登录未返回 accessToken: ${JSON.stringify(login)}`);
  }

  const keyResp = await requestJson(`${BASE_URL}/api/v1/auth/api-keys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      name: `ws-jvquant-test-${Date.now()}`,
      profile: "READ",
    }),
  });

  if (!keyResp?.appKey || !keyResp?.accessToken) {
    throw new Error(`创建 API Key 失败: ${JSON.stringify(keyResp)}`);
  }

  return {
    appKey: keyResp.appKey,
    accessToken: keyResp.accessToken,
    source: "created",
  };
}

async function main() {
  const auth = await resolveApiKeyPair();
  const requiredMarkets = new Set(EXPECT_MARKETS);
  const seenMarkets = new Set();
  let dataCount = 0;
  let settled = false;

  console.log("[config]", {
    baseUrl: BASE_URL,
    wsPath: WS_PATH,
    symbols,
    timeoutMs: TIMEOUT_MS,
    authSource: auth.source,
    expectMarkets: Array.from(requiredMarkets),
  });

  if (auth.source === "created") {
    console.log("[generated-api-key]", {
      appKey: auth.appKey,
      accessToken: auth.accessToken,
    });
  }

  const socket = io(BASE_URL, {
    path: WS_PATH,
    transports: ["websocket"],
    timeout: 10000,
    reconnection: false,
    auth: {
      appKey: auth.appKey,
      accessToken: auth.accessToken,
    },
  });

  function finish(code, message, extra) {
    if (settled) return;
    settled = true;
    try {
      socket.emit("unsubscribe", { symbols });
    } catch {
      // ignore
    }
    try {
      socket.disconnect();
    } catch {
      // ignore
    }
    if (message) {
      console.log(message, extra || "");
    }
    process.exit(code);
  }

  const timeout = setTimeout(() => {
    finish(
      2,
      "[FAIL] 超时未满足断言",
      {
        dataCount,
        seenMarkets: Array.from(seenMarkets),
        missingMarkets: Array.from(requiredMarkets).filter(
          (m) => !seenMarkets.has(m),
        ),
      },
    );
  }, TIMEOUT_MS);

  socket.on("connect", () => {
    console.log("[connect]", socket.id);
    socket.emit("subscribe", {
      symbols,
      wsCapabilityType: "stream-stock-quote",
      preferredProvider: "jvquant",
    });
  });

  socket.on("connected", (msg) => {
    console.log("[connected]", msg);
  });

  socket.on("subscribe-ack", (msg) => {
    console.log("[subscribe-ack]", msg);
  });

  socket.on("subscribe-error", (err) => {
    clearTimeout(timeout);
    finish(1, "[FAIL] subscribe-error", err);
  });

  socket.on("connect_error", (err) => {
    clearTimeout(timeout);
    finish(1, "[FAIL] connect_error", err?.message || err);
  });

  socket.on("data", (packet) => {
    dataCount += 1;

    // packet 结构通常是: { symbol, timestamp, data: [...] }
    const firstQuote = Array.isArray(packet?.data)
      ? packet.data[0]
      : packet?.data;
    const guessedSymbol =
      packet?.symbol ||
      firstQuote?.symbol ||
      "";
    const price = firstQuote?.lastPrice ?? firstQuote?.price ?? null;
    const volume = firstQuote?.volume ?? null;
    const quoteTs = firstQuote?.timestamp || packet?.timestamp || null;
    const market = detectMarket(guessedSymbol);
    if (requiredMarkets.has(market)) {
      seenMarkets.add(market);
    }

    console.log("[data]", {
      symbol: guessedSymbol,
      lastPrice: price,
      volume,
      quoteTimestamp: quoteTs,
      market,
      dataCount,
      seenMarkets: Array.from(seenMarkets),
    });

    if (VERBOSE_PACKET) {
      console.log("[packet]", JSON.stringify(packet));
    }

    const allMarketsSeen = Array.from(requiredMarkets).every((m) =>
      seenMarkets.has(m),
    );
    if (allMarketsSeen && dataCount >= Number(process.env.MIN_DATA_COUNT || 3)) {
      clearTimeout(timeout);
      finish(0, "[PASS] jvquant WS 流测试通过", {
        dataCount,
        seenMarkets: Array.from(seenMarkets),
      });
    }
  });
}

main().catch((err) => {
  console.error("[FAIL] 脚本异常", err?.message || err);
  process.exit(1);
});
