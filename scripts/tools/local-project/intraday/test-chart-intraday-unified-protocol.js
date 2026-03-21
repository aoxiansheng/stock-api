#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * 分时图协议统一 — 标准接入链路回归脚本
 *
 * 验证链路：
 *   snapshot -> WS subscribe(no sessionId) -> chart.intraday.point ->
 *   unsubscribe -> delta(用最新 cursor 补洞) -> release -> delta after release(409)
 */

const fs = require("fs");
const path = require("path");
const { io } = require("socket.io-client");
const { createEndpointClient, parseBoolean, parseCliArgs } = require("../project-api-client");

function assert(condition, message, extra) {
  if (condition) {
    return;
  }
  const error = new Error(message);
  error.extra = extra;
  throw error;
}

function normalizeSymbol(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeProvider(value) {
  return String(value || "").trim().toLowerCase();
}

function appendArg(argv, key, value) {
  if (value === undefined || value === null || value === "") {
    return;
  }
  argv.push(`--${key}`, String(value));
}

function readFromArgsOrEnv(rawArgs, argKey, envKeys = []) {
  if (rawArgs[argKey] !== undefined) {
    return String(rawArgs[argKey]);
  }

  for (const envKey of envKeys) {
    if (process.env[envKey] !== undefined) {
      return String(process.env[envKey]);
    }
  }

  return "";
}

function buildClientArgv(rawArgs) {
  const argv = [];
  appendArg(argv, "base-url", readFromArgsOrEnv(rawArgs, "base-url", ["BASE_URL"]));
  appendArg(argv, "api-prefix", readFromArgsOrEnv(rawArgs, "api-prefix", ["API_PREFIX"]));
  appendArg(argv, "timeout-ms", readFromArgsOrEnv(rawArgs, "timeout-ms", ["TIMEOUT_MS"]));

  const bearer = readFromArgsOrEnv(rawArgs, "bearer", ["AUTH_BEARER", "BEARER"]);
  if (bearer) {
    appendArg(argv, "bearer", bearer);
    return argv;
  }

  appendArg(argv, "app-key", readFromArgsOrEnv(rawArgs, "app-key", ["APP_KEY"]));
  appendArg(argv, "access-token", readFromArgsOrEnv(rawArgs, "access-token", ["ACCESS_TOKEN"]));
  return argv;
}

function extractErrorMessage(response) {
  const candidates = [
    response?.data?.message,
    response?.data?.error?.message,
    response?.data?.error?.code,
  ]
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);

  if (candidates.length > 0) {
    return candidates[0];
  }

  try {
    return JSON.stringify(response?.data || {});
  } catch {
    return String(response?.data || "");
  }
}

function assertOk(response, label) {
  assert(response && response.ok === true, `${label} HTTP 调用失败`, {
    status: response?.status || 0,
    body: response?.data || null,
  });
  assert(response.data?.success === true, `${label} success 应为 true`, response.data);
  assert(response.data?.statusCode === 200, `${label} statusCode 应为 200`, response.data);
}

function summarizeErrorResponse(response) {
  return {
    status: Number(response?.status || 0),
    message: extractErrorMessage(response),
    body: response?.data || null,
  };
}

function writeReport(outputFile, report) {
  if (!outputFile) {
    return null;
  }

  const resolved = path.resolve(outputFile);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, JSON.stringify(report, null, 2), "utf8");
  return resolved;
}

function validateSnapshot(response, options) {
  assertOk(response, "snapshot");

  const payload = response.data?.data || {};
  const line = payload.line || {};
  const sync = payload.sync || {};
  const metadata = payload.metadata || {};
  const reference = payload.reference || {};
  const capability = payload.capability || {};
  const points = Array.isArray(line.points) ? line.points : [];

  assert(normalizeSymbol(line.symbol) === normalizeSymbol(options.symbol), "snapshot symbol 不匹配", {
    expected: normalizeSymbol(options.symbol),
    actual: normalizeSymbol(line.symbol),
  });
  assert(typeof line.market === "string" && line.market.trim(), "snapshot market 非法", line);
  assert(typeof line.tradingDay === "string" && line.tradingDay.trim(), "snapshot tradingDay 非法", line);
  assert(line.granularity === "1s", "snapshot granularity 应为 1s", line);
  assert(typeof sync.cursor === "string" && sync.cursor.trim(), "snapshot sync.cursor 缺失", sync);
  assert(
    typeof sync.lastPointTimestamp === "string" && sync.lastPointTimestamp.trim(),
    "snapshot sync.lastPointTimestamp 缺失",
    sync,
  );
  assert(typeof sync.serverTime === "string" && sync.serverTime.trim(), "snapshot sync.serverTime 缺失", sync);
  assert(typeof metadata.provider === "string" && metadata.provider.trim(), "snapshot metadata.provider 缺失", metadata);
  assert(
    ["live", "paused", "frozen"].includes(String(metadata.runtimeMode || "").trim()),
    "snapshot metadata.runtimeMode 非法",
    metadata,
  );

  if (!options.allowEmpty) {
    assert(points.length > 0, "snapshot points 为空", {
      runtimeMode: metadata.runtimeMode,
      market: line.market,
      tradingDay: line.tradingDay,
    });
  }

  if (metadata.runtimeMode === "live") {
    assert(sync.realtime && typeof sync.realtime === "object", "live snapshot sync.realtime 缺失", sync);
    assert(
      typeof sync.realtime.wsCapabilityType === "string" &&
        sync.realtime.wsCapabilityType.trim(),
      "sync.realtime.wsCapabilityType 缺失",
      sync.realtime,
    );
    assert(sync.realtime.event === "chart.intraday.point", "sync.realtime.event 非法", sync.realtime);
    assert(
      normalizeProvider(sync.realtime.preferredProvider) === normalizeProvider(metadata.provider),
      "sync.realtime.preferredProvider 应与 metadata.provider 一致",
      {
        realtime: sync.realtime,
        metadata,
      },
    );
  } else {
    assert(sync.realtime === null, "非 live 模式 sync.realtime 应为 null", {
      runtimeMode: metadata.runtimeMode,
      realtime: sync.realtime,
    });
  }

  return {
    symbol: normalizeSymbol(line.symbol),
    market: String(line.market || "").trim().toUpperCase(),
    tradingDay: String(line.tradingDay || "").trim(),
    provider: normalizeProvider(metadata.provider),
    runtimeMode: String(metadata.runtimeMode || "").trim(),
    cursor: String(sync.cursor || "").trim(),
    lastPointTimestamp: String(sync.lastPointTimestamp || "").trim(),
    realtime: sync.realtime || null,
    pointsCount: points.length,
    firstPoint: points[0] || null,
    lastPoint: points[points.length - 1] || null,
    capability,
    metadata,
    reference,
  };
}

function validateDelta(response) {
  assertOk(response, "delta");

  const payload = response.data?.data || {};
  const delta = payload.delta || {};
  const points = Array.isArray(delta.points) ? delta.points : [];

  assert(Array.isArray(delta.points), "delta points 应为数组", delta);
  assert(typeof delta.hasMore === "boolean", "delta hasMore 应为布尔值", delta);
  assert(typeof delta.nextCursor === "string" && delta.nextCursor.trim(), "delta nextCursor 缺失", delta);
  assert(
    typeof delta.lastPointTimestamp === "string" && delta.lastPointTimestamp.trim(),
    "delta lastPointTimestamp 缺失",
    delta,
  );
  assert(typeof delta.serverTime === "string" && delta.serverTime.trim(), "delta serverTime 缺失", delta);

  return {
    pointsCount: points.length,
    hasMore: delta.hasMore,
    nextCursor: String(delta.nextCursor || "").trim(),
    lastPointTimestamp: String(delta.lastPointTimestamp || "").trim(),
    firstPoint: points[0] || null,
    lastPoint: points[points.length - 1] || null,
  };
}

function validateRelease(response, expected) {
  assertOk(response, "release");

  const payload = response.data?.data || {};
  const release = payload.release || {};

  assert(typeof release.leaseReleased === "boolean", "release leaseReleased 非法", release);
  assert(typeof release.upstreamReleased === "boolean", "release upstreamReleased 非法", release);
  assert(["RELEASED", "ALREADY_RELEASED"].includes(String(release.reason || "").trim()), "release reason 非法", release);
  assert(normalizeSymbol(release.symbol) === normalizeSymbol(expected.symbol), "release symbol 不匹配", {
    expected: normalizeSymbol(expected.symbol),
    actual: normalizeSymbol(release.symbol),
  });
  assert(
    String(release.market || "").trim().toUpperCase() === String(expected.market || "").trim().toUpperCase(),
    "release market 不匹配",
    { expected: expected.market, actual: release.market },
  );
  assert(
    normalizeProvider(release.provider) === normalizeProvider(expected.provider),
    "release provider 不匹配",
    { expected: expected.provider, actual: release.provider },
  );
  assert(typeof release.wsCapabilityType === "string" && release.wsCapabilityType.trim(), "release wsCapabilityType 非法", release);
  assert(Number.isInteger(Number(release.activeLeaseCount)), "release activeLeaseCount 非法", release);

  if (expected.reason) {
    assert(String(release.reason || "").trim() === expected.reason, "release reason 不符合预期", {
      expected: expected.reason,
      actual: release.reason,
    });
  }

  return {
    leaseReleased: Boolean(release.leaseReleased),
    upstreamReleased: Boolean(release.upstreamReleased),
    reason: String(release.reason || "").trim(),
    provider: normalizeProvider(release.provider),
    activeLeaseCount: Number(release.activeLeaseCount || 0),
    graceExpiresAt: release.graceExpiresAt || null,
  };
}

function validateWsPoint(payload, expected) {
  assert(payload && typeof payload === "object", "chart.intraday.point 载荷非法", payload);
  assert(normalizeSymbol(payload.symbol) === normalizeSymbol(expected.symbol), "WS point.symbol 不匹配", {
    expected: normalizeSymbol(expected.symbol),
    actual: normalizeSymbol(payload.symbol),
    payload,
  });
  assert(String(payload.market || "").trim().toUpperCase() === expected.market, "WS point.market 不匹配", payload);
  assert(String(payload.tradingDay || "").trim() === expected.tradingDay, "WS point.tradingDay 不匹配", payload);
  assert(payload.granularity === "1s", "WS point.granularity 应为 1s", payload);
  assert(typeof payload.cursor === "string" && payload.cursor.trim(), "WS point.cursor 缺失", payload);
  assert(payload.point && typeof payload.point === "object", "WS point.point 缺失", payload);
  assert(typeof payload.point.timestamp === "string" && payload.point.timestamp.trim(), "WS point.timestamp 缺失", payload);
  assert(Number.isFinite(Number(payload.point.price)), "WS point.price 非法", payload);
  assert(Number.isFinite(Number(payload.point.volume)), "WS point.volume 非法", payload);
}

async function runWsPhase(options) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    let settled = false;
    let pointCount = 0;
    let lastPayload = null;
    let unsubscribeAck = null;
    let postUnsubscribeViolations = 0;

    const socket = io(options.baseUrl, {
      path: "/api/v1/stream-receiver/connect",
      transports: ["websocket"],
      timeout: 10000,
      reconnection: false,
      auth: {
        appKey: options.auth.appKey,
        accessToken: options.auth.accessToken,
      },
    });

    let timeout = null;
    let pingTimer = null;
    let unsubscribeTimer = null;
    let postUnsubscribeTimer = null;
    let phase = "connecting";

    const cleanup = () => {
      if (timeout) clearTimeout(timeout);
      if (pingTimer) clearInterval(pingTimer);
      if (unsubscribeTimer) clearTimeout(unsubscribeTimer);
      if (postUnsubscribeTimer) clearTimeout(postUnsubscribeTimer);
      try {
        socket.disconnect();
      } catch {
        // ignore
      }
    };

    const finish = (error, result) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      if (error) {
        reject(error);
        return;
      }
      resolve(result);
    };

    timeout = setTimeout(() => {
      finish(
        new Error(`WS 超时：${options.wsTimeoutMs}ms 内仅收到 ${pointCount}/${options.minWsPoints} 个 chart.intraday.point`),
      );
    }, options.wsTimeoutMs);

    socket.on("connect_error", (error) => {
      finish(new Error(`WS connect_error: ${error?.message || String(error)}`));
    });

    socket.on("subscribe-error", (message) => {
      finish(new Error(`WS subscribe-error: ${JSON.stringify(message)}`));
    });

    socket.on("unsubscribe-error", (message) => {
      finish(new Error(`WS unsubscribe-error: ${JSON.stringify(message)}`));
    });

    socket.on("unsubscribe-ack", (message) => {
      unsubscribeAck = message || null;
      if (phase !== "unsubscribing") {
        return;
      }
      phase = "observing-after-unsubscribe";
      postUnsubscribeTimer = setTimeout(() => {
        finish(null, {
          pointCount,
          lastPayload,
          lastCursor: String(lastPayload?.cursor || "").trim() || null,
          durationMs: Date.now() - startedAt,
          unsubscribeAck,
          postUnsubscribeSilent: true,
          postUnsubscribeViolations,
        });
      }, options.postUnsubscribeObserveMs);
    });

    socket.on("connect", () => {
      phase = "subscribing";
      socket.emit("subscribe", {
        symbols: [options.symbol],
        preferredProvider: options.realtime.preferredProvider,
        wsCapabilityType: options.realtime.wsCapabilityType,
      });

      if (options.wsTimeoutMs > 30000) {
        pingTimer = setInterval(() => {
          socket.emit("ping");
        }, 25000);
      }
    });

    socket.on("chart.intraday.point", (payload) => {
      if (phase === "observing-after-unsubscribe") {
        postUnsubscribeViolations += 1;
        finish(new Error("unsubscribe 后仍收到 chart.intraday.point"), payload);
        return;
      }

      validateWsPoint(payload, options.expectedStreamContext);
      pointCount += 1;
      lastPayload = payload;

      if (pointCount >= options.minWsPoints && phase !== "unsubscribing") {
        phase = "unsubscribing";
        socket.emit("unsubscribe", {
          symbols: [options.symbol],
          wsCapabilityType: options.realtime.wsCapabilityType,
        });

        unsubscribeTimer = setTimeout(() => {
          finish(new Error(`unsubscribe 未在 ${options.unsubscribeTimeoutMs}ms 内收到 ack`));
        }, options.unsubscribeTimeoutMs);
      }
    });
  });
}

async function safeRelease(client, context, state) {
  if (!state.snapshotAcquired || state.releaseDone) {
    return null;
  }

  const response = await client.post("/chart/intraday-line/release", {
    symbol: context.symbol,
    market: context.market,
    provider: context.provider,
  });
  state.releaseDone = true;
  return summarizeErrorResponse(response.ok ? {
    status: response.status,
    data: response.data,
  } : response);
}

async function main() {
  const rawArgs = parseCliArgs();
  if (parseBoolean(rawArgs.help, false)) {
    console.log("用法见文件头注释");
    return;
  }

  const client = createEndpointClient(buildClientArgv(rawArgs));
  const symbol = normalizeSymbol(rawArgs.symbol || "AAPL.US");
  const market = String(rawArgs.market || "").trim().toUpperCase();
  const tradingDay = String(rawArgs["trading-day"] || "").trim();
  const provider = normalizeProvider(rawArgs.provider);
  const pointLimit = Number(rawArgs["point-limit"] || 30000);
  const deltaLimit = Number(rawArgs["delta-limit"] || 2000);
  const minWsPoints = Number(rawArgs["min-ws-points"] || 1);
  const wsTimeoutMs = Number(rawArgs["ws-timeout-ms"] || 45000);
  const unsubscribeTimeoutMs = Number(rawArgs["unsubscribe-timeout-ms"] || 5000);
  const postUnsubscribeObserveMs = Number(rawArgs["post-unsubscribe-observe-ms"] || 1500);
  const skipWs = parseBoolean(rawArgs["skip-ws"], false);
  const allowEmpty = parseBoolean(rawArgs["allow-empty"], false);
  const outputFile = String(rawArgs["output-file"] || "").trim();

  const report = {
    testName: "chart-intraday-unified-protocol",
    baseUrl: client.baseUrl,
    apiPrefix: client.apiPrefix,
    target: {
      symbol,
      market: market || null,
      tradingDay: tradingDay || null,
      requestedProvider: provider || null,
    },
    steps: {},
    cleanup: {
      releaseAttempted: false,
      releaseDone: false,
      fallbackRelease: null,
    },
  };

  const cleanupState = {
    snapshotAcquired: false,
    releaseDone: false,
  };
  let snap = null;

  try {
    console.log("[1/5] snapshot ...");
    const snapshotBody = {
      symbol,
      pointLimit,
      ...(market ? { market } : {}),
      ...(tradingDay ? { tradingDay } : {}),
      ...(provider ? { provider } : {}),
    };

    const snapshotResponse = await client.post("/chart/intraday-line/snapshot", snapshotBody);
    snap = validateSnapshot(snapshotResponse, { symbol, allowEmpty });
    cleanupState.snapshotAcquired = true;
    report.steps.snapshot = {
      runtimeMode: snap.runtimeMode,
      provider: snap.provider,
      pointsCount: snap.pointsCount,
      realtimeHint: snap.realtime,
      firstPoint: snap.firstPoint,
      lastPoint: snap.lastPoint,
    };
    console.log(`  runtimeMode=${snap.runtimeMode} provider=${snap.provider} points=${snap.pointsCount}`);

    let wsResult = null;
    let deltaCursor = snap.cursor;
    let deltaCursorSource = "snapshot";

    if (!skipWs && snap.realtime) {
      console.log(`[2/5] WS subscribe -> unsubscribe (preferredProvider=${snap.realtime.preferredProvider}) ...`);
      wsResult = await runWsPhase({
        baseUrl: client.baseUrl,
        auth: {
          appKey: client.args["app-key"] || process.env.APP_KEY || "",
          accessToken: client.args["access-token"] || process.env.ACCESS_TOKEN || "",
        },
        symbol: snap.symbol,
        realtime: snap.realtime,
        minWsPoints,
        wsTimeoutMs,
        unsubscribeTimeoutMs,
        postUnsubscribeObserveMs,
        expectedStreamContext: {
          symbol: snap.symbol,
          market: snap.market,
          tradingDay: snap.tradingDay,
        },
      });
      report.steps.ws = {
        pointCount: wsResult.pointCount,
        durationMs: wsResult.durationMs,
        lastPayload: wsResult.lastPayload,
        unsubscribeAck: wsResult.unsubscribeAck,
        postUnsubscribeSilent: wsResult.postUnsubscribeSilent,
      };
      if (wsResult.lastCursor) {
        deltaCursor = wsResult.lastCursor;
        deltaCursorSource = "ws";
      }
      console.log(`  收到 ${wsResult.pointCount} 个 WS 点位，已完成 unsubscribe 并观察静默`);
    } else {
      const reason = skipWs ? "用户跳过 WS 阶段" : "非 live 模式，无需建立 WS";
      report.steps.ws = { skipped: true, reason };
      console.log(`[2/5] WS 跳过: ${reason}`);
    }

    console.log(`[3/5] delta 补洞（cursor=${deltaCursorSource}）...`);
    const deltaResponse = await client.post("/chart/intraday-line/delta", {
      symbol: snap.symbol,
      market: snap.market,
      tradingDay: snap.tradingDay,
      provider: snap.provider,
      cursor: deltaCursor,
      limit: deltaLimit,
      strictProviderConsistency: false,
    });
    const delta = validateDelta(deltaResponse);
    report.steps.delta = {
      ...delta,
      cursorSource: deltaCursorSource,
    };
    console.log(`  points=${delta.pointsCount} hasMore=${delta.hasMore}`);

    console.log("[4/5] release ...");
    report.cleanup.releaseAttempted = true;
    const releaseResponse = await client.post("/chart/intraday-line/release", {
      symbol: snap.symbol,
      market: snap.market,
      provider: snap.provider,
    });
    const release = validateRelease(releaseResponse, {
      symbol: snap.symbol,
      market: snap.market,
      provider: snap.provider,
      reason: "RELEASED",
    });
    cleanupState.releaseDone = true;
    report.cleanup.releaseDone = true;
    report.steps.release = release;
    console.log(`  leaseReleased=${release.leaseReleased} upstreamReleased=${release.upstreamReleased}`);

    console.log("[5/5] release 后 delta 应返回 409 ...");
    const deltaAfterReleaseResponse = await client.post("/chart/intraday-line/delta", {
      symbol: snap.symbol,
      market: snap.market,
      tradingDay: snap.tradingDay,
      provider: snap.provider,
      cursor: delta.nextCursor,
      limit: deltaLimit,
      strictProviderConsistency: false,
    });
    assert(Number(deltaAfterReleaseResponse?.status || 0) === 409, "release 后 delta 应返回 409", {
      status: deltaAfterReleaseResponse?.status || 0,
      body: deltaAfterReleaseResponse?.data || null,
    });
    report.steps.deltaAfterRelease = summarizeErrorResponse(deltaAfterReleaseResponse);
    report.result = "PASS";

    const written = writeReport(outputFile, report);
    if (written) {
      report.outputFile = written;
    }

    console.log("\n[PASS] 分时图协议统一回归通过");
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    if (snap) {
      try {
        report.cleanup.releaseAttempted = true;
        const fallbackRelease = await safeRelease(client, snap, cleanupState);
        report.cleanup.releaseDone = cleanupState.releaseDone;
        report.cleanup.fallbackRelease = fallbackRelease;
      } catch (releaseError) {
        report.cleanup.fallbackRelease = {
          status: 0,
          message: releaseError?.message || String(releaseError),
          body: null,
        };
      }
    }

    console.error("\n[FAIL] 分时图协议统一回归失败");
    console.error(error.extra ? { message: error.message, extra: error.extra } : error);
    if (outputFile) {
      report.result = "FAIL";
      report.error = error.extra ? { message: error.message, extra: error.extra } : { message: error.message || String(error) };
      writeReport(outputFile, report);
    }
    process.exit(1);
  }
}

main();
