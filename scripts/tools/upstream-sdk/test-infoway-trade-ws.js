#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Infoway WebSocket 实时成交明细（Trade）测试脚本
 *
 * 协议约定（按文档）：
 * - 订阅请求: 10000
 * - 订阅应答: 10001
 * - 实时推送: 10002
 * - 心跳请求: 10010
 *
 * 常用环境变量：
 * - API_KEY: Infoway API Key（必填）
 * - CODES: 订阅标的，逗号分隔（默认 AAPL.US）
 * - BUSINESS: ws business 参数（默认 stock）
 * - WS_BASE_URL: WebSocket 基础地址（默认 wss://data.infoway.io/ws）
 * - TIMEOUT_MS: 超时时间（默认 45000）
 * - MIN_PUSH_COUNT: 最少推送条数（默认 5）
 * - HEARTBEAT_INTERVAL_MS: 心跳间隔（默认 30000）
 * - OUTPUT_FILE: 原始报文输出文件（默认 /tmp/infoway-trade-ws.ndjson）
 */

const { appendFileSync, mkdirSync } = require("node:fs");
const { dirname } = require("node:path");
const { randomUUID } = require("node:crypto");

const API_KEY = String(process.env.API_KEY || process.env.TOKEN || "").trim();
const CODES = String(process.env.CODES || "AAPL.US")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const BUSINESS = String(process.env.BUSINESS || "stock").trim();
const WS_BASE_URL = String(process.env.WS_BASE_URL || "wss://data.infoway.io/ws").trim();
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 45000);
const MIN_PUSH_COUNT = Number(process.env.MIN_PUSH_COUNT || 5);
const HEARTBEAT_INTERVAL_MS = Number(process.env.HEARTBEAT_INTERVAL_MS || 30000);
const OUTPUT_FILE = String(process.env.OUTPUT_FILE || "/tmp/infoway-trade-ws.ndjson");

function fail(message, extra) {
  if (extra) {
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

function buildWsUrl() {
  const base = WS_BASE_URL.replace(/\?+$/, "");
  const params = new URLSearchParams({
    business: BUSINESS,
    apikey: API_KEY,
  });
  return `${base}?${params.toString()}`;
}

function createWebSocket(url) {
  if (typeof WebSocket !== "undefined") {
    return new WebSocket(url);
  }

  try {
    // 可选兼容：若运行环境没有全局 WebSocket，尝试使用 ws 包
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

function writeRawLine(lineObj) {
  mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
  appendFileSync(OUTPUT_FILE, `${JSON.stringify(lineObj)}\n`, "utf8");
}

function sendJson(ws, payload) {
  const text = JSON.stringify(payload);
  if (typeof ws.send === "function") {
    ws.send(text);
    return;
  }
  throw new Error("WebSocket send 不可用");
}

async function main() {
  if (!API_KEY) {
    fail("[FAIL] 缺少 API_KEY（可通过 API_KEY 或 TOKEN 传入）");
  }
  if (CODES.length === 0) {
    fail("[FAIL] CODES 不能为空");
  }
  if (!Number.isFinite(TIMEOUT_MS) || TIMEOUT_MS <= 0) {
    fail("[FAIL] TIMEOUT_MS 必须是正数");
  }
  if (!Number.isFinite(MIN_PUSH_COUNT) || MIN_PUSH_COUNT <= 0) {
    fail("[FAIL] MIN_PUSH_COUNT 必须是正数");
  }

  const wsUrl = buildWsUrl();
  const subscribeTrace = randomUUID().replace(/-/g, "");
  const heartbeatTracePrefix = randomUUID().replace(/-/g, "").slice(0, 12);

  console.log("== 配置 ==");
  console.log(
    JSON.stringify(
      {
        wsUrl: wsUrl.replace(API_KEY, maskKey(API_KEY)),
        business: BUSINESS,
        codes: CODES,
        timeoutMs: TIMEOUT_MS,
        minPushCount: MIN_PUSH_COUNT,
        heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
        outputFile: OUTPUT_FILE,
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

    if (details) {
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
      expectedPushCount: MIN_PUSH_COUNT,
    });
  }, TIMEOUT_MS);

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
        error: error && error.message ? error.message : String(error),
      });
    }
  };

  attachEvent(ws, "open", () => {
    const subscribePayload = {
      code: 10000,
      trace: subscribeTrace,
      data: {
        codes: CODES.join(","),
      },
    };

    console.log("[open] ws connected");
    console.log("[subscribe]", subscribePayload);
    sendJson(ws, subscribePayload);

    // 文档要求 1 分钟内需要心跳续期，这里每 30 秒发送一次
    heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
  });

  attachEvent(ws, "message", async (evt) => {
    const rawText = await normalizeMessagePayload(evt);
    const receivedAt = new Date().toISOString();
    writeRawLine({ receivedAt, raw: rawText });
    console.log("[raw]", rawText);

    let payload;
    try {
      payload = JSON.parse(rawText);
    } catch {
      console.log("[warn] 非 JSON 消息，已透传");
      return;
    }

    const code = Number(payload.code);
    if (code === 10001) {
      const trace = String(payload.trace || "");
      const msg = String(payload.msg || "");
      console.log("[ack]", { code, trace, msg });
      if (trace === subscribeTrace && msg.toLowerCase() === "ok") {
        ackReceived = true;
      }
      return;
    }

    if (code === 10002) {
      const rows = Array.isArray(payload.data) ? payload.data : [payload.data].filter(Boolean);
      for (const row of rows) {
        pushCount += 1;
        console.log("[push]", {
          symbol: row?.s,
          price: row?.p,
          timestamp: row?.t,
          td: row?.td,
          volume: row?.v,
          turnover: row?.vw,
          pushCount,
        });
      }

      if (ackReceived && pushCount >= MIN_PUSH_COUNT) {
        finish(0, "[PASS] Infoway Trade WebSocket 测试通过", {
          ackReceived,
          pushCount,
          outputFile: OUTPUT_FILE,
        });
      }
      return;
    }

    if (payload && (payload.msg || payload.error || payload.code)) {
      console.log("[info] 其他协议消息", payload);
    }
  });

  attachEvent(ws, "error", (error) => {
    finish(1, "[FAIL] WebSocket 错误", {
      error: error && error.message ? error.message : String(error),
      ackReceived,
      pushCount,
    });
  });

  attachEvent(ws, "close", (eventOrCode, reasonMaybe) => {
    if (settled) return;
    let code = eventOrCode;
    let reason = reasonMaybe;

    if (eventOrCode && typeof eventOrCode === "object" && "code" in eventOrCode) {
      code = eventOrCode.code;
      reason = eventOrCode.reason;
    }

    finish(1, "[FAIL] WebSocket 连接关闭", {
      code: typeof code === "number" ? code : null,
      reason: reason || "",
      ackReceived,
      pushCount,
    });
  });
}

main().catch((error) => {
  fail("[FAIL] 脚本异常", error && error.message ? error.message : String(error));
});
