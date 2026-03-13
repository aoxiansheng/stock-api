#!/usr/bin/env bash
set -euo pipefail

# 分时图前端 WS 联调脚本
# 目标：
# 1. 通过 snapshot 获取首屏，确保分时图 API 可用
# 2. 建立前端 WebSocket 连接，发送 subscribe + wsCapabilityType
# 3. 断言能收到 chart.intraday.point
# 4. 结束时执行 unsubscribe + release 清理

node <<'NODE'
/* eslint-disable no-console */
const { io } = require("socket.io-client");

function parseBooleanFlag(value, defaultValue) {
  const raw = String(value ?? (defaultValue ? "1" : "0"))
    .trim()
    .toLowerCase();
  return ["1", "true", "yes", "on"].includes(raw);
}

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3001";
const SNAPSHOT_ENDPOINT =
  process.env.SNAPSHOT_ENDPOINT || "/api/v1/chart/intraday-line/snapshot";
const RELEASE_ENDPOINT =
  process.env.RELEASE_ENDPOINT || "/api/v1/chart/intraday-line/release";
const WS_PATH = process.env.WS_PATH || "/api/v1/stream-receiver/connect";

const SYMBOL = String(process.env.SYMBOL || "AAPL.US").trim();
const PROVIDER = String(process.env.PROVIDER || "infoway").trim();
const MARKET = String(process.env.MARKET || "").trim();
const TRADING_DAY = String(process.env.TRADING_DAY || "").trim();
const POINT_LIMIT = Number(process.env.POINT_LIMIT || 30000);
const MIN_CHART_POINT_COUNT = Number(process.env.MIN_CHART_POINT_COUNT || 3);
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 45000);
const UNSUBSCRIBE_TIMEOUT_MS = Number(
  process.env.UNSUBSCRIBE_TIMEOUT_MS || 1500,
);
const VERBOSE_PACKET = parseBooleanFlag(process.env.VERBOSE_PACKET, false);
const RELEASE_AFTER_TEST = parseBooleanFlag(process.env.RELEASE_AFTER_TEST, true);
const REQUIRE_UNSUBSCRIBE_ACK = parseBooleanFlag(
  process.env.REQUIRE_UNSUBSCRIBE_ACK,
  true,
);
const REQUIRE_RELEASE_RESPONSE = parseBooleanFlag(
  process.env.REQUIRE_RELEASE_RESPONSE,
  true,
);

function resolveWsCapabilityType(symbol) {
  const explicit = String(process.env.WS_CAPABILITY_TYPE || "").trim();
  if (explicit) {
    return explicit;
  }

  const normalized = String(symbol || "").trim().toUpperCase();
  if (normalized.endsWith(".CRYPTO")) {
    return "stream-crypto-quote";
  }

  return "stream-stock-quote";
}

const WS_CAPABILITY_TYPE = resolveWsCapabilityType(SYMBOL);

function fail(message, extra) {
  if (extra !== undefined) {
    console.error(message, extra);
  } else {
    console.error(message);
  }
  process.exit(1);
}

function assert(condition, message, extra) {
  if (!condition) {
    const error = new Error(message);
    error.extra = extra;
    throw error;
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${url}: ${JSON.stringify(body)}`);
  }

  return body;
}

async function resolveApiKeyPair() {
  const appKey = String(process.env.APP_KEY || "").trim();
  const accessToken = String(process.env.ACCESS_TOKEN || "").trim();
  if (appKey && accessToken) {
    return { appKey, accessToken, source: "env" };
  }

  const username = String(process.env.USERNAME || "").trim();
  const password = String(process.env.PASSWORD || "").trim();
  assert(
    username && password,
    "[FAIL] 缺少认证参数：请提供 APP_KEY+ACCESS_TOKEN，或 USERNAME+PASSWORD",
  );

  const login = await requestJson(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const jwt =
    login?.accessToken || login?.data?.accessToken || login?.token || "";
  assert(jwt, "[FAIL] 登录未返回 accessToken", login);

  const keyResp = await requestJson(`${BASE_URL}/api/v1/auth/api-keys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      name: `chart-intraday-ws-${Date.now()}`,
      profile: "READ",
    }),
  });

  const createdAppKey = keyResp?.appKey || keyResp?.data?.appKey || "";
  const createdAccessToken =
    keyResp?.accessToken || keyResp?.data?.accessToken || "";
  assert(
    createdAppKey && createdAccessToken,
    "[FAIL] 创建 API Key 失败",
    keyResp,
  );

  return {
    appKey: createdAppKey,
    accessToken: createdAccessToken,
    source: "created",
  };
}

function buildAuthHeaders(auth) {
  return {
    "Content-Type": "application/json",
    "X-App-Key": auth.appKey,
    "X-Access-Token": auth.accessToken,
  };
}

function buildSnapshotPayload() {
  const payload = {
    symbol: SYMBOL,
    provider: PROVIDER,
    pointLimit: POINT_LIMIT,
  };

  if (MARKET) {
    payload.market = MARKET;
  }

  if (TRADING_DAY) {
    payload.tradingDay = TRADING_DAY;
  }

  return payload;
}

function buildReleasePayload(snapshotData) {
  const payload = {
    symbol: SYMBOL,
    provider: PROVIDER,
  };

  const market =
    MARKET ||
    snapshotData?.line?.market ||
    snapshotData?.release?.market ||
    "";
  if (market) {
    payload.market = market;
  }

  return payload;
}

function buildUnsubscribePayload() {
  return {
    symbols: [SYMBOL],
    wsCapabilityType: WS_CAPABILITY_TYPE,
  };
}

function normalizeEventSymbol(payload) {
  return String(payload?.symbol || "").trim().toUpperCase();
}

function validateChartPointPayload(payload) {
  assert(
    payload && typeof payload === "object",
    "[FAIL] chart.intraday.point 载荷必须是对象",
    payload,
  );
  assert(
    normalizeEventSymbol(payload) === SYMBOL.toUpperCase(),
    "[FAIL] chart.intraday.point.symbol 不匹配",
    payload,
  );
  assert(
    payload.granularity === "1s",
    "[FAIL] chart.intraday.point.granularity 必须为 1s",
    payload,
  );
  assert(
    typeof payload.cursor === "string" && payload.cursor.length > 0,
    "[FAIL] chart.intraday.point.cursor 缺失",
    payload,
  );
  assert(
    payload.point && typeof payload.point === "object",
    "[FAIL] chart.intraday.point.point 缺失",
    payload,
  );
  assert(
    typeof payload.point.timestamp === "string" &&
      payload.point.timestamp.length > 0,
    "[FAIL] chart.intraday.point.point.timestamp 缺失",
    payload,
  );
  assert(
    Number.isFinite(Number(payload.point.price)),
    "[FAIL] chart.intraday.point.point.price 非法",
    payload,
  );
}

async function callSnapshot(auth) {
  const payload = buildSnapshotPayload();
  const body = await requestJson(`${BASE_URL}${SNAPSHOT_ENDPOINT}`, {
    method: "POST",
    headers: buildAuthHeaders(auth),
    body: JSON.stringify(payload),
  });

  assert(body?.success === true, "[FAIL] snapshot success=false", body);
  assert(body?.statusCode === 200, "[FAIL] snapshot statusCode 非 200", body);
  assert(
    body?.data?.line && typeof body.data.line === "object",
    "[FAIL] snapshot data.line 缺失",
    body,
  );
  assert(
    Array.isArray(body?.data?.line?.points),
    "[FAIL] snapshot data.line.points 不是数组",
    body,
  );
  assert(
    typeof body?.data?.sync?.cursor === "string" &&
      body.data.sync.cursor.length > 0,
    "[FAIL] snapshot 未返回 cursor",
    body,
  );

  return body.data;
}

async function callRelease(auth, snapshotData) {
  if (!RELEASE_AFTER_TEST) {
    return null;
  }

  const payload = buildReleasePayload(snapshotData);
  return requestJson(`${BASE_URL}${RELEASE_ENDPOINT}`, {
    method: "POST",
    headers: buildAuthHeaders(auth),
    body: JSON.stringify(payload),
  });
}

function validateReleaseResponse(body) {
  assert(body?.success === true, "[FAIL] release success=false", body);
  assert(body?.statusCode === 200, "[FAIL] release statusCode 非 200", body);
  assert(
    body?.data?.release && typeof body.data.release === "object",
    "[FAIL] release data.release 缺失",
    body,
  );
  assert(
    typeof body.data.release.released === "boolean",
    "[FAIL] release data.release.released 必须是布尔值",
    body,
  );

  if (body.data.release.symbol) {
    assert(
      normalizeEventSymbol(body.data.release) === SYMBOL.toUpperCase(),
      "[FAIL] release data.release.symbol 不匹配",
      body,
    );
  }

  if (body.data.release.provider) {
    assert(
      String(body.data.release.provider).toLowerCase() ===
        PROVIDER.toLowerCase(),
      "[FAIL] release data.release.provider 不匹配",
      body,
    );
  }

  if (body.data.release.wsCapabilityType) {
    assert(
      String(body.data.release.wsCapabilityType) === WS_CAPABILITY_TYPE,
      "[FAIL] release data.release.wsCapabilityType 不匹配",
      body,
    );
  }

  return body.data.release;
}

async function unsubscribeWithAck(socket) {
  const payload = buildUnsubscribePayload();
  if (!socket || typeof socket.emit !== "function") {
    return {
      attempted: false,
      status: "skipped",
      reason: "socket-missing",
      payload,
    };
  }

  if (!socket.connected) {
    return {
      attempted: false,
      status: "skipped",
      reason: "socket-not-connected",
      payload,
    };
  }

  return new Promise((resolve) => {
    let finished = false;
    let timeout = null;

    const finish = (status, detail) => {
      if (finished) {
        return;
      }
      finished = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      socket.off("unsubscribe-ack", handleAck);
      socket.off("unsubscribe-error", handleError);
      resolve({
        attempted: true,
        status,
        detail,
        payload,
      });
    };

    const handleAck = (message) => finish("ack", message);
    const handleError = (message) => finish("error", message);

    socket.once("unsubscribe-ack", handleAck);
    socket.once("unsubscribe-error", handleError);

    try {
      socket.emit("unsubscribe", payload);
    } catch (error) {
      finish("emit-error", error?.message || String(error || ""));
      return;
    }

    timeout = setTimeout(() => {
      finish("timeout", `no-ack-within-${UNSUBSCRIBE_TIMEOUT_MS}ms`);
    }, UNSUBSCRIBE_TIMEOUT_MS);
  });
}

async function main() {
  assert(SYMBOL.length > 0, "[FAIL] SYMBOL 不能为空");
  assert(PROVIDER.length > 0, "[FAIL] PROVIDER 不能为空");
  assert(
    Number.isFinite(POINT_LIMIT) && POINT_LIMIT > 0,
    "[FAIL] POINT_LIMIT 必须是正数",
  );
  assert(
    Number.isFinite(MIN_CHART_POINT_COUNT) && MIN_CHART_POINT_COUNT > 0,
    "[FAIL] MIN_CHART_POINT_COUNT 必须是正数",
  );
  assert(
    Number.isFinite(TIMEOUT_MS) && TIMEOUT_MS > 0,
    "[FAIL] TIMEOUT_MS 必须是正数",
  );
  assert(
    Number.isFinite(UNSUBSCRIBE_TIMEOUT_MS) && UNSUBSCRIBE_TIMEOUT_MS > 0,
    "[FAIL] UNSUBSCRIBE_TIMEOUT_MS 必须是正数",
  );

  const auth = await resolveApiKeyPair();
  const snapshotData = await callSnapshot(auth);
  const snapshotPoints = snapshotData?.line?.points || [];
  const snapshotCursor = snapshotData?.sync?.cursor || "";
  const realtimeMergedPoints = Number(
    snapshotData?.metadata?.realtimeMergedPoints || 0,
  );

  console.log("[config]", {
    baseUrl: BASE_URL,
    snapshotEndpoint: SNAPSHOT_ENDPOINT,
    releaseEndpoint: RELEASE_ENDPOINT,
    wsPath: WS_PATH,
    symbol: SYMBOL,
    provider: PROVIDER,
    market: MARKET || snapshotData?.line?.market || "",
    tradingDay: TRADING_DAY || snapshotData?.line?.tradingDay || "",
    pointLimit: POINT_LIMIT,
    wsCapabilityType: WS_CAPABILITY_TYPE,
    minChartPointCount: MIN_CHART_POINT_COUNT,
    timeoutMs: TIMEOUT_MS,
    unsubscribeTimeoutMs: UNSUBSCRIBE_TIMEOUT_MS,
    authSource: auth.source,
    releaseAfterTest: RELEASE_AFTER_TEST,
    requireUnsubscribeAck: REQUIRE_UNSUBSCRIBE_ACK,
    requireReleaseResponse: REQUIRE_RELEASE_RESPONSE,
  });

  console.log("[snapshot]", {
    pointsCount: snapshotPoints.length,
    lastPrice:
      snapshotPoints.length > 0
        ? snapshotPoints[snapshotPoints.length - 1]?.price ?? null
        : null,
    lastTimestamp:
      snapshotPoints.length > 0
        ? snapshotPoints[snapshotPoints.length - 1]?.timestamp ?? ""
        : "",
    realtimeMergedPoints,
    cursorLength: snapshotCursor.length,
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

  let settled = false;
  let chartPointCount = 0;
  let rawDataCount = 0;
  let lastChartPayload = null;
  let lastRawPayload = null;
  let lastAck = null;

  async function cleanupAndExit(code, message, extra) {
    if (settled) {
      return;
    }
    settled = true;

    let finalCode = code;
    let finalMessage = message;
    let unsubscribeResult = null;

    try {
      unsubscribeResult = await unsubscribeWithAck(socket);
    } catch (error) {
      unsubscribeResult = {
        attempted: true,
        status: "exception",
        detail: error?.message || String(error || ""),
      };
    }

    if (
      finalCode === 0 &&
      REQUIRE_UNSUBSCRIBE_ACK &&
      unsubscribeResult?.status !== "ack"
    ) {
      finalCode = 1;
      finalMessage = "[FAIL] 清理阶段 unsubscribe 未收到 ack";
    }

    try {
      socket.disconnect();
    } catch {
      // ignore
    }

    let releaseResult = null;
    try {
      const releaseResponse = await callRelease(auth, snapshotData);
      if (releaseResponse) {
        const releaseData = validateReleaseResponse(releaseResponse);
        releaseResult = {
          status: "ok",
          success: releaseResponse?.success ?? null,
          statusCode: releaseResponse?.statusCode ?? null,
          data: releaseData,
        };
      } else {
        releaseResult = {
          status: "skipped",
          reason: "release-disabled",
        };
      }
    } catch (error) {
      releaseResult = {
        status: "error",
        error: error?.message || String(error || ""),
        extra: error?.extra,
      };
      if (finalCode === 0 && REQUIRE_RELEASE_RESPONSE) {
        finalCode = 1;
        finalMessage = "[FAIL] 清理阶段 release 校验失败";
      }
    }

    const payload = extra ? { ...extra } : {};
    payload.cleanup = {
      unsubscribe: unsubscribeResult,
      release: releaseResult,
    };
    console.log(finalMessage, payload);
    process.exit(finalCode);
  }

  const timeout = setTimeout(() => {
    void cleanupAndExit(2, "[FAIL] 超时未收到足够的 chart.intraday.point", {
      chartPointCount,
      rawDataCount,
      lastAck,
      lastChartPayload,
      lastRawPayload,
    });
  }, TIMEOUT_MS);

  socket.on("connect", () => {
    console.log("[connect]", socket.id);
    socket.emit("subscribe", {
      symbols: [SYMBOL],
      wsCapabilityType: WS_CAPABILITY_TYPE,
      preferredProvider: PROVIDER,
    });
  });

  socket.on("connected", (message) => {
    console.log("[connected]", message);
  });

  socket.on("subscribe-ack", (message) => {
    lastAck = message;
    console.log("[subscribe-ack]", message);
  });

  socket.on("subscribe-error", (error) => {
    clearTimeout(timeout);
    void cleanupAndExit(1, "[FAIL] subscribe-error", {
      error,
      chartPointCount,
      rawDataCount,
    });
  });

  socket.on("connect_error", (error) => {
    clearTimeout(timeout);
    void cleanupAndExit(1, "[FAIL] connect_error", {
      error: error?.message || String(error || ""),
    });
  });

  socket.on("error", (error) => {
    clearTimeout(timeout);
    void cleanupAndExit(1, "[FAIL] socket error", {
      error: error?.message || String(error || ""),
    });
  });

  socket.on("data", (payload) => {
    rawDataCount += 1;
    lastRawPayload = payload;
    if (VERBOSE_PACKET || rawDataCount <= 3) {
      console.log("[data]", JSON.stringify(payload));
    }
  });

  socket.on("chart.intraday.point", (payload) => {
    try {
      validateChartPointPayload(payload);
    } catch (error) {
      clearTimeout(timeout);
      void cleanupAndExit(1, "[FAIL] chart.intraday.point 断言失败", {
        error: error?.message || String(error || ""),
        payload,
      });
      return;
    }

    chartPointCount += 1;
    lastChartPayload = payload;
    console.log("[chart.intraday.point]", {
      count: chartPointCount,
      price: payload?.point?.price ?? null,
      timestamp: payload?.point?.timestamp ?? "",
      cursorLength: String(payload?.cursor || "").length,
    });

    if (VERBOSE_PACKET) {
      console.log("[chart.intraday.point.raw]", JSON.stringify(payload));
    }

    if (chartPointCount >= MIN_CHART_POINT_COUNT) {
      clearTimeout(timeout);
      void cleanupAndExit(0, "[PASS] chart.intraday.point 联调通过", {
        chartPointCount,
        rawDataCount,
        lastAck,
        lastChartPayload,
      });
    }
  });

  socket.on("unsubscribe-ack", (message) => {
    console.log("[unsubscribe-ack]", message);
  });

  socket.on("unsubscribe-error", (message) => {
    console.log("[unsubscribe-error]", message);
  });
}

void main().catch((error) => {
  fail(
    "[FAIL] 脚本执行异常",
    error?.extra
      ? { message: error?.message || String(error || ""), extra: error.extra }
      : error?.stack || error?.message || String(error || ""),
  );
});
NODE
