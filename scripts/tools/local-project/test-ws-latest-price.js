#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * 本地项目 WebSocket 最新价测试脚本
 *
 * 目标：
 * 1. 连接本地 /api/v1/stream-receiver/connect
 * 2. 订阅 stream-stock-quote
 * 3. 至少收到 MIN_TICK_COUNT 条含最新价的数据后通过
 *
 * 环境变量：
 * - BASE_URL: 服务地址（默认 http://127.0.0.1:3001）
 * - WS_PATH: WebSocket 路径（默认 /api/v1/stream-receiver/connect）
 * - APP_KEY / ACCESS_TOKEN: 认证对（优先）
 * - USERNAME / PASSWORD: 未传 API Key 时自动登录并创建临时 API Key
 * - SYMBOL: 订阅标的（默认 AAPL.US）
 * - PROVIDER: 数据源（默认 infoway）
 * - MIN_TICK_COUNT: 最少 tick 条数（默认 10）
 * - TIMEOUT_MS: 超时毫秒（默认 45000）
 * - VERBOSE_PACKET: 1/true 时打印完整 packet
 * - HOLD_CONNECTION_AFTER_TARGET: 达到最少 tick 后保持连接到超时（默认 false）
 */

const { io } = require("socket.io-client");

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3001";
const WS_PATH = process.env.WS_PATH || "/api/v1/stream-receiver/connect";
const SYMBOL = process.env.SYMBOL || "AAPL.US";
const PROVIDER = process.env.PROVIDER || "infoway";
const MIN_TICK_COUNT = Number(process.env.MIN_TICK_COUNT || 10);
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 45000);
const VERBOSE_PACKET = ["1", "true", "yes", "on"].includes(
  String(process.env.VERBOSE_PACKET || "").toLowerCase(),
);
const HOLD_CONNECTION_AFTER_TARGET = ["1", "true", "yes", "on"].includes(
  String(process.env.HOLD_CONNECTION_AFTER_TARGET || "").toLowerCase(),
);

function fail(message, extra) {
  if (extra) {
    console.error(message, extra);
  } else {
    console.error(message);
  }
  process.exit(1);
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
      name: `ws-latest-price-${Date.now()}`,
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

function extractQuote(packet) {
  if (!packet || typeof packet !== "object") {
    return null;
  }
  if (Array.isArray(packet.data) && packet.data.length > 0) {
    return packet.data[0];
  }
  if (packet.data && typeof packet.data === "object") {
    return packet.data;
  }
  return null;
}

async function main() {
  if (!Number.isFinite(MIN_TICK_COUNT) || MIN_TICK_COUNT <= 0) {
    fail("[FAIL] MIN_TICK_COUNT 必须是正数");
  }
  if (!Number.isFinite(TIMEOUT_MS) || TIMEOUT_MS <= 0) {
    fail("[FAIL] TIMEOUT_MS 必须是正数");
  }

  const auth = await resolveApiKeyPair();
  let tickCount = 0;
  let settled = false;
  let reachedTarget = false;

  console.log("[config]", {
    baseUrl: BASE_URL,
    wsPath: WS_PATH,
    symbol: SYMBOL,
    provider: PROVIDER,
    minTickCount: MIN_TICK_COUNT,
    timeoutMs: TIMEOUT_MS,
    authSource: auth.source,
    holdConnectionAfterTarget: HOLD_CONNECTION_AFTER_TARGET,
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
      socket.emit("unsubscribe", { symbols: [SYMBOL] });
    } catch {
      // ignore
    }
    try {
      socket.disconnect();
    } catch {
      // ignore
    }
    if (extra) {
      console.log(message, extra);
    } else {
      console.log(message);
    }
    process.exit(code);
  }

  const timeout = setTimeout(() => {
    if (reachedTarget) {
      finish(0, "[PASS] 已达到最少 tick，并保持连接到超时窗口结束", {
        tickCount,
        required: MIN_TICK_COUNT,
        symbol: SYMBOL,
        provider: PROVIDER,
      });
      return;
    }
    finish(2, "[FAIL] 超时未收到足够的最新价推送", {
      tickCount,
      required: MIN_TICK_COUNT,
      symbol: SYMBOL,
      provider: PROVIDER,
    });
  }, TIMEOUT_MS);

  socket.on("connect", () => {
    console.log("[connect]", socket.id);
    socket.emit("subscribe", {
      symbols: [SYMBOL],
      wsCapabilityType: "stream-stock-quote",
      preferredProvider: PROVIDER,
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
    const quote = extractQuote(packet);
    const symbol = quote?.symbol || packet?.symbol || SYMBOL;
    const price = quote?.lastPrice ?? quote?.price ?? quote?.p ?? null;
    const volume = quote?.volume ?? quote?.v ?? null;
    const timestamp = quote?.timestamp ?? quote?.t ?? packet?.timestamp ?? null;

    if (VERBOSE_PACKET) {
      console.log("[packet]", JSON.stringify(packet));
    }

    if (price !== null && price !== undefined && String(price).trim() !== "") {
      tickCount += 1;
      console.log("[latest-price]", {
        symbol,
        lastPrice: price,
        volume,
        timestamp,
        tickCount,
      });
    } else {
      console.log("[skip]", {
        reason: "missing price",
        symbol,
      });
    }

    if (tickCount >= MIN_TICK_COUNT) {
      reachedTarget = true;
      if (!HOLD_CONNECTION_AFTER_TARGET) {
        clearTimeout(timeout);
        finish(0, "[PASS] WebSocket 最新价获取成功", {
          symbol,
          provider: PROVIDER,
          tickCount,
        });
        return;
      }
    }
  });
}

main().catch((err) => {
  fail("[FAIL] 脚本异常", err?.message || err);
});
