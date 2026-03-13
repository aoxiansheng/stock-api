#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Infoway WebSocket CRYPTO 实时成交明细测试脚本（默认 BTCUSDT）
 *
 * 协议约定：
 * - 订阅请求: 10000
 * - 订阅应答: 10001
 * - 实时推送: 10002
 * - 心跳请求: 10010
 *
 * 常用环境变量：
 * - API_KEY / TOKEN / INFOWAY_API_KEY: 上游 API Key（必填）
 * - CODE / SYMBOL / CODES: 订阅标的（默认 BTCUSDT）
 * - BUSINESS: ws business 参数（默认 crypto）
 * - WS_BASE_URL: WebSocket 基础地址（默认 wss://data.infoway.io/ws）
 * - TIMEOUT_MS: 超时时间（默认 45000）
 * - MIN_PUSH_COUNT: 最少推送条数（默认 3）
 * - HEARTBEAT_INTERVAL_MS: 心跳间隔（默认 30000）
 * - OUTPUT_FILE: 原始报文输出文件（默认 /tmp/infoway-btcusdt-trade-ws.ndjson）
 *
 * 运行示例：
 * API_KEY="<INFOWAY_API_KEY>" \
 * CODE="BTCUSDT" \
 * node "scripts/tools/upstream-sdk/test-infoway-btcusdt-trade-ws.js"
 */

const { appendFileSync, existsSync, mkdirSync, readFileSync } = require("node:fs");
const { dirname, resolve } = require("node:path");
const { randomUUID } = require("node:crypto");

function parseDotEnv(filePath) {
  if (!existsSync(filePath)) return {};

  const result = {};
  const content = readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalIndex = line.indexOf("=");
    if (equalIndex <= 0) continue;

    const key = line.slice(0, equalIndex).trim();
    let value = line.slice(equalIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) {
      result[key] = value;
    }
  }

  return result;
}

function fail(message, extra) {
  if (extra !== undefined) {
    console.error(message, extra);
  } else {
    console.error(message);
  }
  process.exit(1);
}

function maskKey(key) {
  if (!key || key.length <= 10) return "***";
  return `${key.slice(0, 6)}***${key.slice(-4)}`;
}

function normalizeCode(input) {
  return String(input || "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)[0] || "";
}

function buildWsUrl(baseUrl, business, apiKey) {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set("business", business);
    url.searchParams.set("apikey", apiKey);
    return url.toString();
  } catch {
    const sanitizedBase = String(baseUrl).replace(/\?+$/, "");
    const params = new URLSearchParams({
      business,
      apikey: apiKey,
    });
    return `${sanitizedBase}?${params.toString()}`;
  }
}

function createWebSocket(url) {
  if (typeof WebSocket !== "undefined") {
    return new WebSocket(url);
  }

  try {
    // eslint-disable-next-line import/no-extraneous-dependencies, global-require
    const WS = require("ws");
    return new WS(url);
  } catch {
    throw new Error(
      "当前 Node 环境无全局 WebSocket，且未安装 ws 依赖。请升级 Node 或安装 ws。",
    );
  }
}

function attachEvent(ws, eventName, handler) {
  if (typeof ws.addEventListener === "function") {
    ws.addEventListener(eventName, handler);
    return;
  }
  if (typeof ws.on === "function") {
    ws.on(eventName, handler);
    return;
  }
  throw new Error("WebSocket 实例不支持事件监听");
}

async function normalizeMessagePayload(eventOrData) {
  const raw = eventOrData && typeof eventOrData === "object" && "data" in eventOrData
    ? eventOrData.data
    : eventOrData;

  if (typeof raw === "string") return raw;
  if (Buffer.isBuffer(raw)) return raw.toString("utf8");
  if (raw instanceof ArrayBuffer) return Buffer.from(raw).toString("utf8");
  if (ArrayBuffer.isView(raw)) return Buffer.from(raw.buffer).toString("utf8");
  if (raw && typeof raw.text === "function") return raw.text();
  return String(raw);
}

function sendJson(ws, payload) {
  if (typeof ws.send !== "function") {
    throw new Error("WebSocket send 不可用");
  }
  ws.send(JSON.stringify(payload));
}

function writeRawLine(filePath, lineObj) {
  mkdirSync(dirname(filePath), { recursive: true });
  appendFileSync(filePath, `${JSON.stringify(lineObj)}\n`, "utf8");
}

async function main() {
  const dotenv = parseDotEnv(resolve(process.cwd(), ".env"));

  const apiKey = String(
    process.env.API_KEY ||
      process.env.TOKEN ||
      process.env.UPSTREAM_API_KEY ||
      process.env.INFOWAY_API_KEY ||
      dotenv.INFOWAY_API_KEY ||
      "",
  ).trim();
  const code = normalizeCode(process.env.CODE || process.env.SYMBOL || process.env.CODES || "BTCUSDT");
  const business = String(process.env.BUSINESS || "crypto").trim();
  const wsBaseUrl = String(process.env.WS_BASE_URL || "wss://data.infoway.io/ws").trim();
  const timeoutMs = Number(process.env.TIMEOUT_MS || 45000);
  const minPushCount = Number(process.env.MIN_PUSH_COUNT || 3);
  const heartbeatIntervalMs = Number(process.env.HEARTBEAT_INTERVAL_MS || 30000);
  const outputFile = String(
    process.env.OUTPUT_FILE || "/tmp/infoway-btcusdt-trade-ws.ndjson",
  ).trim();

  if (!apiKey) {
    fail("[FAIL] 缺少 API_KEY（可通过 API_KEY / TOKEN / INFOWAY_API_KEY 传入）");
  }
  if (!code) {
    fail("[FAIL] CODE 不能为空（默认 BTCUSDT）");
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    fail("[FAIL] TIMEOUT_MS 必须是正数");
  }
  if (!Number.isFinite(minPushCount) || minPushCount <= 0) {
    fail("[FAIL] MIN_PUSH_COUNT 必须是正数");
  }
  if (!Number.isFinite(heartbeatIntervalMs) || heartbeatIntervalMs <= 0) {
    fail("[FAIL] HEARTBEAT_INTERVAL_MS 必须是正数");
  }

  const wsUrl = buildWsUrl(wsBaseUrl, business, apiKey);
  const subscribeTrace = randomUUID().replace(/-/g, "");
  const heartbeatTracePrefix = randomUUID().replace(/-/g, "").slice(0, 16);

  console.log("== 配置 ==");
  console.log(
    JSON.stringify(
      {
        wsUrl: wsUrl.replace(apiKey, maskKey(apiKey)),
        business,
        code,
        timeoutMs,
        minPushCount,
        heartbeatIntervalMs,
        outputFile,
      },
      null,
      2,
    ),
  );

  const ws = createWebSocket(wsUrl);
  let settled = false;
  let ackReceived = false;
  let pushCount = 0;
  let heartbeatSeq = 0;
  let timeoutTimer = null;
  let heartbeatTimer = null;

  const finish = (exitCode, message, details) => {
    if (settled) return;
    settled = true;

    if (timeoutTimer) clearTimeout(timeoutTimer);
    if (heartbeatTimer) clearInterval(heartbeatTimer);

    try {
      if (typeof ws.close === "function") {
        ws.close();
      }
    } catch {
      // ignore
    }

    if (details !== undefined) {
      console.log(message, details);
    } else {
      console.log(message);
    }
    process.exit(exitCode);
  };

  timeoutTimer = setTimeout(() => {
    finish(2, "[FAIL] 超时未满足断言", {
      ackReceived,
      pushCount,
      expectedPushCount: minPushCount,
      code,
    });
  }, timeoutMs);

  const sendHeartbeat = () => {
    heartbeatSeq += 1;
    const trace = `${heartbeatTracePrefix}${String(heartbeatSeq).padStart(4, "0")}`;
    const payload = {
      code: 10010,
      trace,
    };
    try {
      sendJson(ws, payload);
      console.log("[heartbeat]", payload);
    } catch (error) {
      finish(1, "[FAIL] 心跳发送失败", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  attachEvent(ws, "open", () => {
    const subscribePayload = {
      code: 10000,
      trace: subscribeTrace,
      data: {
        codes: code,
      },
    };

    console.log("[open] ws connected");
    console.log("[subscribe]", subscribePayload);

    try {
      sendJson(ws, subscribePayload);
    } catch (error) {
      finish(1, "[FAIL] 订阅发送失败", {
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    // 限频要求 1 分钟最多 60 次请求，默认每 30s 一次心跳，足够保守
    heartbeatTimer = setInterval(sendHeartbeat, heartbeatIntervalMs);
  });

  attachEvent(ws, "message", async (evt) => {
    const rawText = await normalizeMessagePayload(evt);
    const receivedAt = new Date().toISOString();
    writeRawLine(outputFile, { receivedAt, raw: rawText });
    console.log("[raw]", rawText);

    let payload;
    try {
      payload = JSON.parse(rawText);
    } catch {
      console.log("[warn] 非 JSON 消息，已忽略结构化解析");
      return;
    }

    const packetCode = Number(payload.code);
    if (packetCode === 10001) {
      const trace = String(payload.trace || "");
      const msg = String(payload.msg || "");
      console.log("[ack]", { code: packetCode, trace, msg });
      if (trace === subscribeTrace && msg.toLowerCase() === "ok") {
        ackReceived = true;
      }
      return;
    }

    if (packetCode !== 10002) {
      return;
    }

    const rows = Array.isArray(payload.data) ? payload.data : [payload.data].filter(Boolean);
    for (const row of rows) {
      const rowSymbol = String(row?.s || "").trim().toUpperCase();
      if (rowSymbol && rowSymbol !== code) {
        continue;
      }

      pushCount += 1;
      console.log("[push]", {
        symbol: row?.s,
        price: row?.p,
        timestamp: row?.t,
        side: row?.td,
        volume: row?.v,
        turnover: row?.vw,
        pushCount,
      });
    }

    if (ackReceived && pushCount >= minPushCount) {
      finish(0, "[PASS] BTCUSDT 实时成交订阅成功", {
        code,
        pushCount,
        ackReceived,
      });
    }
  });

  attachEvent(ws, "error", (eventOrError) => {
    const message =
      eventOrError instanceof Error
        ? eventOrError.message
        : (eventOrError && eventOrError.message) || String(eventOrError);
    finish(1, "[FAIL] WebSocket error", { error: message });
  });

  attachEvent(ws, "close", (codeValue, reasonValue) => {
    if (settled) return;
    finish(1, "[FAIL] WebSocket 提前关闭", {
      code: codeValue,
      reason: String(reasonValue || ""),
      ackReceived,
      pushCount,
    });
  });
}

void main().catch((error) => {
  fail("[FAIL] 脚本异常", error instanceof Error ? error.message : String(error));
});
