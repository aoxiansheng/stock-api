#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Infoway WebSocket CRYPTO 实时 K 线测试脚本（默认 BTCUSDT / 1 分钟）
 *
 * 协议约定：
 * - 订阅请求: 10006
 * - 订阅应答: 10007
 * - 实时推送: 10008
 * - 心跳请求: 10010
 *
 * 常用环境变量：
 * - API_KEY / TOKEN / INFOWAY_API_KEY: 上游 API Key（必填）
 * - CODE / SYMBOL / CODES: 订阅标的（默认 BTCUSDT）
 * - TYPE: K 线类型（默认 1，1=1m）
 * - BUSINESS: ws business 参数（默认 crypto）
 * - WS_BASE_URL: WebSocket 基础地址（默认 wss://data.infoway.io/ws）
 * - RUN_DURATION_MS: 观察时长（默认 90000）
 * - MIN_PUSH_COUNT: 最少推送条数（默认 1）
 * - HEARTBEAT_INTERVAL_MS: 心跳间隔（默认 30000）
 * - OUTPUT_FILE: 原始报文输出文件（默认 /tmp/infoway-kline-ws.ndjson）
 *
 * 运行示例：
 * API_KEY="<INFOWAY_API_KEY>" \
 * CODE="BTCUSDT" \
 * TYPE=1 \
 * node "scripts/tools/upstream-sdk/test-infoway-kline-ws.js"
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
      (value.startsWith("\"") && value.endsWith("\"")) ||
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

function normalizeCloseEventArgs(codeValue, reasonValue) {
  if (
    codeValue &&
    typeof codeValue === "object" &&
    "code" in codeValue &&
    "reason" in codeValue
  ) {
    return {
      code: codeValue.code,
      reason: String(codeValue.reason || ""),
    };
  }

  return {
    code: codeValue,
    reason: String(reasonValue || ""),
  };
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

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function formatEpochSeconds(epochSeconds) {
  const value = toNumber(epochSeconds);
  if (value === null) return null;
  return new Date(value * 1000).toISOString();
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
  const klineType = Number(process.env.TYPE || 1);
  const business = String(process.env.BUSINESS || "crypto").trim();
  const wsBaseUrl = String(process.env.WS_BASE_URL || "wss://data.infoway.io/ws").trim();
  const runDurationMs = Number(process.env.RUN_DURATION_MS || 90000);
  const minPushCount = Number(process.env.MIN_PUSH_COUNT || 1);
  const heartbeatIntervalMs = Number(process.env.HEARTBEAT_INTERVAL_MS || 30000);
  const outputFile = String(process.env.OUTPUT_FILE || "/tmp/infoway-kline-ws.ndjson").trim();

  if (!apiKey) {
    fail("[FAIL] 缺少 API_KEY（可通过 API_KEY / TOKEN / INFOWAY_API_KEY 传入）");
  }
  if (!code) {
    fail("[FAIL] CODE 不能为空（默认 BTCUSDT）");
  }
  if (!Number.isInteger(klineType) || klineType <= 0) {
    fail("[FAIL] TYPE 必须是正整数");
  }
  if (!Number.isFinite(runDurationMs) || runDurationMs <= 0) {
    fail("[FAIL] RUN_DURATION_MS 必须是正数");
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
        klineType,
        runDurationMs,
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
  let runTimer = null;
  let heartbeatTimer = null;
  const barsByTimestamp = new Map();
  const pushSamples = [];

  const finish = (exitCode, message, details) => {
    if (settled) return;
    settled = true;

    if (runTimer) clearTimeout(runTimer);
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

  runTimer = setTimeout(() => {
    const repeatedBars = [...barsByTimestamp.entries()]
      .filter(([, count]) => count > 1)
      .map(([timestamp, count]) => ({ timestamp, count }));

    if (!ackReceived || pushCount < minPushCount) {
      finish(2, "[FAIL] 观察窗口结束，但未满足最小断言", {
        ackReceived,
        pushCount,
        expectedPushCount: minPushCount,
        code,
        klineType,
        repeatedBars,
      });
      return;
    }

    finish(0, "[PASS] K 线订阅观察完成", {
      ackReceived,
      pushCount,
      uniqueBarCount: barsByTimestamp.size,
      repeatedBars,
      lastSamples: pushSamples.slice(-5),
    });
  }, runDurationMs);

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
      code: 10006,
      trace: subscribeTrace,
      data: {
        arr: [
          {
            type: klineType,
            codes: code,
          },
        ],
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
    if (packetCode === 10007) {
      const trace = String(payload.trace || "");
      const msg = String(payload.msg || "");
      console.log("[ack]", { code: packetCode, trace, msg });
      if (trace === subscribeTrace && msg.toLowerCase() === "ok") {
        ackReceived = true;
      }
      return;
    }

    if (packetCode !== 10008) {
      return;
    }

    const rows = Array.isArray(payload.data) ? payload.data : [payload.data].filter(Boolean);
    for (const row of rows) {
      const rowSymbol = String(row?.s || "").trim().toUpperCase();
      const rowType = Number(row?.ty);
      if (rowSymbol && rowSymbol !== code) {
        continue;
      }
      if (Number.isFinite(rowType) && rowType !== klineType) {
        continue;
      }

      pushCount += 1;
      const epochSeconds = toNumber(row?.t);
      const barIso = formatEpochSeconds(epochSeconds);
      const currentCount = barsByTimestamp.get(barIso || String(row?.t)) || 0;
      barsByTimestamp.set(barIso || String(row?.t), currentCount + 1);

      const sample = {
        symbol: row?.s,
        type: row?.ty,
        epochSeconds,
        barTimeIso: barIso,
        open: row?.o,
        high: row?.h,
        low: row?.l,
        close: row?.c,
        volume: row?.v,
        turnover: row?.vw,
        change: row?.pca,
        changePercent: row?.pfr,
        pushCount,
      };
      pushSamples.push(sample);
      console.log("[push]", sample);
    }
  });

  attachEvent(ws, "error", (eventOrError) => {
    const message =
      eventOrError instanceof Error
        ? eventOrError.message
        : (eventOrError && eventOrError.message) || String(eventOrError);
    finish(1, "[FAIL] WebSocket error", { error: message });
  });

  if (typeof ws.on === "function") {
    ws.on("unexpected-response", (request, response) => {
      const chunks = [];

      response.on("data", (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      });

      response.on("end", () => {
        finish(1, "[FAIL] WebSocket 握手被上游拒绝", {
          statusCode: response.statusCode,
          statusMessage: response.statusMessage,
          headers: response.headers,
          body: Buffer.concat(chunks).toString("utf8"),
        });
      });

      response.resume();
    });
  }

  attachEvent(ws, "close", (codeValue, reasonValue) => {
    if (settled) return;
    const closeEvent = normalizeCloseEventArgs(codeValue, reasonValue);
    finish(1, "[FAIL] WebSocket 提前关闭", {
      code: closeEvent.code,
      reason: closeEvent.reason,
      ackReceived,
      pushCount,
    });
  });
}

void main().catch((error) => {
  fail("[FAIL] 脚本异常", error instanceof Error ? error.message : String(error));
});
