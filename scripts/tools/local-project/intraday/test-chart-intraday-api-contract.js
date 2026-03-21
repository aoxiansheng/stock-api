#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("fs");
const path = require("path");
const { createEndpointClient, parseBoolean, parseCliArgs } = require("../project-api-client");

function printHelp() {
  console.log(`用法:
node "scripts/tools/local-project/intraday/test-chart-intraday-api-contract.js" \\
  --app-key "<APP_KEY>" \\
  --access-token "<ACCESS_TOKEN>" \\
  --symbol "AAPL.US"

也支持环境变量：
APP_KEY=xxx ACCESS_TOKEN=yyy BASE_URL="http://127.0.0.1:3001" \\
node "scripts/tools/local-project/intraday/test-chart-intraday-api-contract.js"

可选参数：
  --base-url                     默认 http://127.0.0.1:3001
  --api-prefix                   默认 /api/v1
  --symbol                       默认 AAPL.US
  --market                       可选，默认空（由服务端推断）
  --trading-day                  可选，格式 YYYYMMDD
  --provider                     可选；不传时走服务端真实 provider 选择逻辑
  --point-limit                  snapshot pointLimit，默认 30000
  --delta-limit                  delta limit，默认 2000
  --allow-empty-snapshot         是否允许空快照，默认 false
  --require-reference            是否强制 previousClose/sessionOpen 非空，默认 false
  --negative-tests               是否执行负例，默认 true
  --output-file                  可选，保存 JSON 报告到文件

可选的第二身份租约隔离测试：
  --secondary-bearer
  --secondary-app-key
  --secondary-access-token

或使用环境变量：
  SECONDARY_AUTH_BEARER
  SECONDARY_APP_KEY
  SECONDARY_ACCESS_TOKEN
`);
}

function assert(condition, message, extra) {
  if (condition) {
    return;
  }

  if (extra !== undefined) {
    throw new Error(`${message} | extra=${JSON.stringify(extra)}`);
  }

  throw new Error(message);
}

function parsePositiveInteger(value, fallback, min = 1) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) {
    return fallback;
  }
  return parsed;
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

function buildClientArgv(rawArgs, options = {}) {
  const prefix = String(options.prefix || "").trim();
  const resolveKey = (key) => `${prefix}${key}`;
  const secondary = prefix === "secondary-";

  const argv = [];
  appendArg(argv, "base-url", readFromArgsOrEnv(rawArgs, resolveKey("base-url"), ["BASE_URL"]));
  appendArg(argv, "api-prefix", readFromArgsOrEnv(rawArgs, resolveKey("api-prefix"), ["API_PREFIX"]));
  appendArg(argv, "timeout-ms", readFromArgsOrEnv(rawArgs, resolveKey("timeout-ms"), ["TIMEOUT_MS"]));

  const bearer = readFromArgsOrEnv(
    rawArgs,
    resolveKey("bearer"),
    secondary ? ["SECONDARY_AUTH_BEARER", "SECONDARY_BEARER"] : ["AUTH_BEARER", "BEARER"],
  );
  if (bearer) {
    appendArg(argv, "bearer", bearer);
    return argv;
  }

  const appKey = readFromArgsOrEnv(
    rawArgs,
    resolveKey("app-key"),
    secondary ? ["SECONDARY_APP_KEY"] : ["APP_KEY"],
  );
  const accessToken = readFromArgsOrEnv(
    rawArgs,
    resolveKey("access-token"),
    secondary ? ["SECONDARY_ACCESS_TOKEN"] : ["ACCESS_TOKEN"],
  );

  appendArg(argv, "app-key", appKey);
  appendArg(argv, "access-token", accessToken);
  return argv;
}

function hasSecondaryCredentials(rawArgs) {
  const bearer = readFromArgsOrEnv(rawArgs, "secondary-bearer", [
    "SECONDARY_AUTH_BEARER",
    "SECONDARY_BEARER",
  ]);
  const appKey = readFromArgsOrEnv(rawArgs, "secondary-app-key", ["SECONDARY_APP_KEY"]);
  const accessToken = readFromArgsOrEnv(rawArgs, "secondary-access-token", [
    "SECONDARY_ACCESS_TOKEN",
  ]);

  return Boolean(bearer || (appKey && accessToken));
}

function normalizeSymbol(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeProvider(value) {
  return String(value || "").trim().toLowerCase();
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

function summarizeErrorResponse(response) {
  return {
    status: Number(response?.status || 0),
    message: extractErrorMessage(response),
    body: response?.data || null,
  };
}

function assertTopLevelSuccess(response, label) {
  assert(response && response.ok === true, `${label} HTTP 调用失败`, {
    status: response?.status || 0,
    body: response?.data || null,
  });
  assert(response.data?.success === true, `${label} 顶层 success 应为 true`, response.data);
  assert(response.data?.statusCode === 200, `${label} 顶层 statusCode 应为 200`, response.data);
}

function assertErrorStatus(response, options) {
  const expectedStatus = Number(options.status);
  const messageIncludes = String(options.messageIncludes || "").trim();

  assert(Number(response?.status || 0) === expectedStatus, `${options.label} 状态码不符合预期`, {
    expectedStatus,
    actualStatus: Number(response?.status || 0),
    body: response?.data || null,
  });

  if (messageIncludes) {
    const message = extractErrorMessage(response);
    assert(message.includes(messageIncludes), `${options.label} 错误消息不符合预期`, {
      expectedMessageIncludes: messageIncludes,
      actualMessage: message,
      body: response?.data || null,
    });
  }
}

function validatePoint(point, contextLabel) {
  assert(point && typeof point === "object", `${contextLabel} 点位不是对象`, point);
  assert(typeof point.timestamp === "string" && point.timestamp.trim(), `${contextLabel} timestamp 非法`, point);
  assert(Number.isFinite(Number(point.price)), `${contextLabel} price 非法`, point);
  assert(Number.isFinite(Number(point.volume)), `${contextLabel} volume 非法`, point);
}

function validateSnapshotResponse(response, expected, options) {
  assertTopLevelSuccess(response, "snapshot");

  const payload = response.data?.data || {};
  const line = payload.line || {};
  const capability = payload.capability || {};
  const reference = payload.reference || {};
  const sync = payload.sync || {};
  const metadata = payload.metadata || {};
  const points = Array.isArray(line.points) ? line.points : [];

  assert(line && typeof line === "object", "snapshot 缺少 data.line", response.data);
  assert(normalizeSymbol(line.symbol) === normalizeSymbol(expected.symbol), "snapshot 返回 symbol 不匹配", {
    expected: normalizeSymbol(expected.symbol),
    actual: normalizeSymbol(line.symbol),
  });
  assert(typeof line.market === "string" && line.market.trim(), "snapshot line.market 非法", line);
  assert(typeof line.tradingDay === "string" && line.tradingDay.trim(), "snapshot line.tradingDay 非法", line);
  assert(line.granularity === "1s", "snapshot line.granularity 应为 1s", line);
  assert(Array.isArray(line.points), "snapshot line.points 应为数组", line);

  if (!options.allowEmptySnapshot) {
    assert(points.length > 0, "snapshot 首屏 points 为空", {
      market: line.market,
      tradingDay: line.tradingDay,
      runtimeMode: metadata.runtimeMode || null,
    });
  }

  points.forEach((point, index) => validatePoint(point, `snapshot.points[${index}]`));

  assert(
    capability.snapshotBaseGranularity === "1m",
    "snapshot capability.snapshotBaseGranularity 应为 1m",
    capability,
  );
  assert(
    typeof capability.supportsFullDay1sHistory === "boolean",
    "snapshot capability.supportsFullDay1sHistory 应为布尔值",
    capability,
  );

  assert(typeof sync.cursor === "string" && sync.cursor.trim(), "snapshot sync.cursor 缺失", sync);
  assert(
    typeof sync.lastPointTimestamp === "string" && sync.lastPointTimestamp.trim(),
    "snapshot sync.lastPointTimestamp 缺失",
    sync,
  );
  assert(typeof sync.serverTime === "string" && sync.serverTime.trim(), "snapshot sync.serverTime 缺失", sync);

  assert(typeof reference.priceBase === "string" && reference.priceBase.trim(), "snapshot reference.priceBase 非法", reference);
  assert(
    typeof reference.marketSession === "string" && reference.marketSession.trim(),
    "snapshot reference.marketSession 非法",
    reference,
  );
  assert(typeof reference.timezone === "string" && reference.timezone.trim(), "snapshot reference.timezone 非法", reference);
  assert(
    ["complete", "partial", "unavailable"].includes(String(reference.status || "").trim()),
    "snapshot reference.status 非法",
    reference,
  );
  if (reference.previousClosePrice !== null && reference.previousClosePrice !== undefined) {
    assert(Number.isFinite(Number(reference.previousClosePrice)), "snapshot previousClosePrice 非法", reference);
  }
  if (reference.sessionOpenPrice !== null && reference.sessionOpenPrice !== undefined) {
    assert(Number.isFinite(Number(reference.sessionOpenPrice)), "snapshot sessionOpenPrice 非法", reference);
  }
  if (options.requireReference) {
    assert(reference.previousClosePrice !== null, "snapshot reference.previousClosePrice 不能为空", reference);
    assert(reference.sessionOpenPrice !== null, "snapshot reference.sessionOpenPrice 不能为空", reference);
  }

  assert(typeof metadata.provider === "string" && metadata.provider.trim(), "snapshot metadata.provider 非法", metadata);
  assert(Number.isFinite(Number(metadata.historyPoints)), "snapshot metadata.historyPoints 非法", metadata);
  assert(
    Number.isFinite(Number(metadata.realtimeMergedPoints)),
    "snapshot metadata.realtimeMergedPoints 非法",
    metadata,
  );
  assert(
    Number.isFinite(Number(metadata.deduplicatedPoints)),
    "snapshot metadata.deduplicatedPoints 非法",
    metadata,
  );
  assert(
    ["live", "paused", "frozen"].includes(String(metadata.runtimeMode || "").trim()),
    "snapshot metadata.runtimeMode 非法",
    metadata,
  );
  assert(
    typeof metadata.effectiveTradingDay === "string" && metadata.effectiveTradingDay.trim(),
    "snapshot metadata.effectiveTradingDay 非法",
    metadata,
  );
  assert(typeof metadata.frozenSnapshotHit === "boolean", "snapshot metadata.frozenSnapshotHit 非法", metadata);
  assert(
    typeof metadata.frozenSnapshotFallback === "boolean",
    "snapshot metadata.frozenSnapshotFallback 非法",
    metadata,
  );

  const runtimeMode = String(metadata.runtimeMode || "").trim();
  if (runtimeMode === "live") {
    assert(sync.realtime && typeof sync.realtime === "object", "live snapshot sync.realtime 缺失", sync);
    assert(
      typeof sync.realtime.wsCapabilityType === "string" && sync.realtime.wsCapabilityType.trim(),
      "live snapshot sync.realtime.wsCapabilityType 非法",
      sync.realtime,
    );
    assert(sync.realtime.event === "chart.intraday.point", "live snapshot sync.realtime.event 非法", sync.realtime);
    assert(
      normalizeProvider(sync.realtime.preferredProvider) === normalizeProvider(metadata.provider),
      "live snapshot sync.realtime.preferredProvider 应与 metadata.provider 一致",
      {
        realtime: sync.realtime,
        metadata,
      },
    );
  } else {
    assert(sync.realtime === null, "非 live snapshot sync.realtime 应为 null", {
      runtimeMode,
      realtime: sync.realtime,
    });
  }

  return {
    symbol: normalizeSymbol(line.symbol),
    market: String(line.market).trim().toUpperCase(),
    tradingDay: String(line.tradingDay).trim(),
    provider: normalizeProvider(metadata.provider || expected.provider),
    cursor: String(sync.cursor).trim(),
    lastPointTimestamp: String(sync.lastPointTimestamp).trim(),
    runtimeMode,
    referenceStatus: String(reference.status || "").trim(),
    pointsCount: points.length,
    capability,
    metadata,
    realtime: sync.realtime || null,
    firstPoint: points[0] || null,
    lastPoint: points[points.length - 1] || null,
  };
}

function validateDeltaResponse(response) {
  assertTopLevelSuccess(response, "delta");

  const payload = response.data?.data || {};
  const delta = payload.delta || {};
  const points = Array.isArray(delta.points) ? delta.points : [];

  assert(delta && typeof delta === "object", "delta 缺少 data.delta", response.data);
  assert(Array.isArray(delta.points), "delta points 应为数组", delta);
  assert(typeof delta.hasMore === "boolean", "delta hasMore 应为布尔值", delta);
  assert(typeof delta.nextCursor === "string" && delta.nextCursor.trim(), "delta nextCursor 缺失", delta);
  assert(
    typeof delta.lastPointTimestamp === "string" && delta.lastPointTimestamp.trim(),
    "delta lastPointTimestamp 缺失",
    delta,
  );
  assert(typeof delta.serverTime === "string" && delta.serverTime.trim(), "delta serverTime 缺失", delta);

  points.forEach((point, index) => validatePoint(point, `delta.points[${index}]`));

  return {
    pointsCount: points.length,
    hasMore: delta.hasMore,
    nextCursor: String(delta.nextCursor).trim(),
    lastPointTimestamp: String(delta.lastPointTimestamp).trim(),
    firstPoint: points[0] || null,
    lastPoint: points[points.length - 1] || null,
  };
}

function validateReleaseResponse(response, expected) {
  assertTopLevelSuccess(response, "release");

  const payload = response.data?.data || {};
  const release = payload.release || {};

  assert(release && typeof release === "object", "release 缺少 data.release", response.data);
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
    expected.provider === undefined ||
      normalizeProvider(release.provider) === normalizeProvider(expected.provider),
    "release provider 不匹配",
    { expected: expected.provider ?? null, actual: release.provider },
  );
  assert(typeof release.wsCapabilityType === "string" && release.wsCapabilityType.trim(), "release wsCapabilityType 非法", release);
  assert(Number.isInteger(Number(release.activeLeaseCount)), "release activeLeaseCount 非法", release);
  assert(
    release.graceExpiresAt === null ||
      (typeof release.graceExpiresAt === "string" && release.graceExpiresAt.trim()),
    "release graceExpiresAt 非法",
    release,
  );

  if (expected.reason) {
    assert(String(release.reason).trim() === expected.reason, "release reason 不符合预期", {
      expected: expected.reason,
      actual: release.reason,
    });
  }

  return {
    leaseReleased: release.leaseReleased,
    upstreamReleased: release.upstreamReleased,
    reason: String(release.reason).trim(),
    provider: normalizeProvider(release.provider),
    activeLeaseCount: Number(release.activeLeaseCount),
    graceExpiresAt: release.graceExpiresAt || null,
  };
}

function buildSnapshotBody(options) {
  const body = {
    symbol: options.symbol,
    pointLimit: options.pointLimit,
  };

  if (options.market) {
    body.market = options.market;
  }
  if (options.tradingDay) {
    body.tradingDay = options.tradingDay;
  }
  if (options.includeProvider && options.provider) {
    body.provider = options.provider;
  }

  return body;
}

function buildDeltaBody(context, options) {
  const body = {
    symbol: context.symbol,
    cursor: options.cursor,
    limit: options.limit,
  };

  if (context.market) {
    body.market = context.market;
  }
  if (context.tradingDay) {
    body.tradingDay = context.tradingDay;
  }
  if (options.includeProvider && context.provider) {
    body.provider = context.provider;
  }
  if (options.provider !== undefined) {
    body.provider = options.provider;
  }
  if (options.strictProviderConsistency === true) {
    body.strictProviderConsistency = true;
  }
  if (options.extraFields && typeof options.extraFields === "object") {
    Object.assign(body, options.extraFields);
  }

  return body;
}

function buildReleaseBody(context, options = {}) {
  const body = {
    symbol: context.symbol,
    market: context.market,
  };

  if (options.includeProvider && context.provider) {
    body.provider = context.provider;
  }
  if (options.provider !== undefined) {
    body.provider = options.provider;
  }

  return body;
}

function pickStrictMismatchProvider(provider) {
  const current = normalizeProvider(provider);
  const candidates = ["infoway", "longport", "jvquant"];
  return candidates.find((item) => item !== current) || "longport";
}

function tamperCursor(cursor) {
  const parsed = JSON.parse(Buffer.from(String(cursor || ""), "base64").toString("utf8"));
  parsed.lastPointTimestamp = "1999-01-01T00:00:00.000Z";
  return Buffer.from(JSON.stringify(parsed), "utf8").toString("base64");
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

async function main() {
  const rawArgs = parseCliArgs();
  if (parseBoolean(rawArgs.help, false)) {
    printHelp();
    return;
  }

  const primaryClient = createEndpointClient(buildClientArgv(rawArgs));
  const secondaryEnabled = hasSecondaryCredentials(rawArgs);
  const secondaryClient = secondaryEnabled
    ? createEndpointClient(buildClientArgv(rawArgs, { prefix: "secondary-" }))
    : null;

  const symbol = normalizeSymbol(rawArgs.symbol || "AAPL.US");
  const market = String(rawArgs.market || "").trim().toUpperCase();
  const tradingDay = String(rawArgs["trading-day"] || "").trim();
  const provider = normalizeProvider(rawArgs.provider);
  const providerExplicitlySet = Boolean(provider);
  const pointLimit = parsePositiveInteger(rawArgs["point-limit"], 30000);
  const deltaLimit = parsePositiveInteger(rawArgs["delta-limit"], 2000);
  const allowEmptySnapshot = parseBoolean(rawArgs["allow-empty-snapshot"], false);
  const requireReference = parseBoolean(rawArgs["require-reference"], false);
  const negativeTests = parseBoolean(rawArgs["negative-tests"], true);
  const outputFile = String(rawArgs["output-file"] || "").trim();

  const report = {
    endpointGroup: "chart-intraday-http-contract",
    baseUrl: primaryClient.baseUrl,
    apiPrefix: primaryClient.apiPrefix,
    target: {
      symbol,
      market: market || null,
      tradingDay: tradingDay || null,
      provider: providerExplicitlySet ? provider : null,
      pointLimit,
      deltaLimit,
    },
    options: {
      allowEmptySnapshot,
      requireReference,
      negativeTests,
      providerMode: providerExplicitlySet ? "explicit" : "auto-resolve",
      secondaryIsolationEnabled: secondaryEnabled,
    },
    primary: {},
    negativeCases: {},
    ownerIsolation: {
      enabled: secondaryEnabled,
      skipped: secondaryEnabled ? null : "未提供第二套认证信息，跳过跨调用方租约隔离测试",
    },
  };

  const snapshotBody = buildSnapshotBody({
    symbol,
    market,
    tradingDay,
    provider,
    pointLimit,
    includeProvider: providerExplicitlySet,
  });
  const snapshotResponse = await primaryClient.post("/chart/intraday-line/snapshot", snapshotBody);
  const snapshotContext = validateSnapshotResponse(
    snapshotResponse,
    { symbol, provider },
    { allowEmptySnapshot, requireReference },
  );
  report.primary.snapshot = {
    market: snapshotContext.market,
    tradingDay: snapshotContext.tradingDay,
    provider: snapshotContext.provider,
    runtimeMode: snapshotContext.runtimeMode,
    referenceStatus: snapshotContext.referenceStatus,
    pointsCount: snapshotContext.pointsCount,
    realtime: snapshotContext.realtime,
    capability: snapshotContext.capability,
    metadata: snapshotContext.metadata,
    firstPoint: snapshotContext.firstPoint,
    lastPoint: snapshotContext.lastPoint,
  };

  const deltaResponse = await primaryClient.post(
    "/chart/intraday-line/delta",
    buildDeltaBody(snapshotContext, {
      cursor: snapshotContext.cursor,
      limit: deltaLimit,
      provider: snapshotContext.provider,
    }),
  );
  const deltaSummary = validateDeltaResponse(deltaResponse);
  report.primary.delta = deltaSummary;

  if (negativeTests) {
    const noCursorResponse = await primaryClient.post(
      "/chart/intraday-line/delta",
      {
        symbol: snapshotContext.symbol,
        market: snapshotContext.market,
        tradingDay: snapshotContext.tradingDay,
        limit: deltaLimit,
        provider: snapshotContext.provider,
      },
    );
    assertErrorStatus(noCursorResponse, {
      label: "delta 缺失 cursor",
      status: 400,
    });
    report.negativeCases.deltaMissingCursor = summarizeErrorResponse(noCursorResponse);

    const tamperedCursorResponse = await primaryClient.post(
      "/chart/intraday-line/delta",
      buildDeltaBody(snapshotContext, {
        cursor: tamperCursor(snapshotContext.cursor),
        limit: deltaLimit,
        provider: snapshotContext.provider,
      }),
    );
    assertErrorStatus(tamperedCursorResponse, {
      label: "delta 篡改 cursor",
      status: 400,
      messageIncludes: "INVALID_ARGUMENT",
    });
    report.negativeCases.deltaTamperedCursor = summarizeErrorResponse(tamperedCursorResponse);

    const strictMismatchProvider = pickStrictMismatchProvider(snapshotContext.provider);
    const providerMismatchResponse = await primaryClient.post(
      "/chart/intraday-line/delta",
      buildDeltaBody(snapshotContext, {
        cursor: deltaSummary.nextCursor,
        limit: deltaLimit,
        provider: strictMismatchProvider,
        strictProviderConsistency: true,
      }),
    );
    assertErrorStatus(providerMismatchResponse, {
      label: "delta strictProviderConsistency 冲突",
      status: 409,
      messageIncludes: "CURSOR_EXPIRED",
    });
    report.negativeCases.deltaStrictProviderMismatch = summarizeErrorResponse(providerMismatchResponse);

    const deltaSinceResponse = await primaryClient.post(
      "/chart/intraday-line/delta",
      buildDeltaBody(snapshotContext, {
        cursor: deltaSummary.nextCursor,
        limit: deltaLimit,
        provider: snapshotContext.provider,
        extraFields: {
          since: new Date().toISOString(),
        },
      }),
    );
    assertErrorStatus(deltaSinceResponse, {
      label: "delta 携带 since 字段",
      status: 400,
    });
    report.negativeCases.deltaWithSince = summarizeErrorResponse(deltaSinceResponse);

    const snapshotIncludePrePostResponse = await primaryClient.post(
      "/chart/intraday-line/snapshot",
      {
        ...snapshotBody,
        includePrePost: false,
      },
    );
    assertErrorStatus(snapshotIncludePrePostResponse, {
      label: "snapshot 携带 includePrePost 字段",
      status: 400,
    });
    report.negativeCases.snapshotWithIncludePrePost = summarizeErrorResponse(
      snapshotIncludePrePostResponse,
    );
  }

  const releaseResponse = await primaryClient.post(
    "/chart/intraday-line/release",
    buildReleaseBody(snapshotContext, {
      provider: snapshotContext.provider,
    }),
  );
  report.primary.release = validateReleaseResponse(releaseResponse, {
    symbol: snapshotContext.symbol,
    market: snapshotContext.market,
    provider: snapshotContext.provider,
    reason: "RELEASED",
  });

  const releaseAgainResponse = await primaryClient.post(
    "/chart/intraday-line/release",
    buildReleaseBody(snapshotContext, {
      provider: snapshotContext.provider,
    }),
  );
  report.primary.releaseAgain = validateReleaseResponse(releaseAgainResponse, {
    symbol: snapshotContext.symbol,
    market: snapshotContext.market,
    provider: providerExplicitlySet ? snapshotContext.provider : undefined,
    reason: "ALREADY_RELEASED",
  });

  const deltaAfterReleaseResponse = await primaryClient.post(
    "/chart/intraday-line/delta",
    buildDeltaBody(snapshotContext, {
      cursor: deltaSummary.nextCursor,
      limit: deltaLimit,
      provider: snapshotContext.provider,
    }),
  );
  assertErrorStatus(deltaAfterReleaseResponse, {
    label: "release 后继续 delta",
    status: 409,
    messageIncludes: "LEASE_CONFLICT",
  });
  report.primary.deltaAfterRelease = summarizeErrorResponse(deltaAfterReleaseResponse);

  if (secondaryClient) {
    const primaryIsolationSnapshotResponse = await primaryClient.post(
      "/chart/intraday-line/snapshot",
      snapshotBody,
    );
    const primaryIsolationContext = validateSnapshotResponse(
      primaryIsolationSnapshotResponse,
      { symbol, provider },
      { allowEmptySnapshot, requireReference },
    );

    const secondarySnapshotResponse = await secondaryClient.post(
      "/chart/intraday-line/snapshot",
      snapshotBody,
    );
    const secondarySnapshotContext = validateSnapshotResponse(
      secondarySnapshotResponse,
      { symbol, provider },
      { allowEmptySnapshot, requireReference },
    );

    const primaryIsolationReleaseResponse = await primaryClient.post(
      "/chart/intraday-line/release",
      buildReleaseBody(primaryIsolationContext, {
        provider: primaryIsolationContext.provider,
      }),
    );
    const primaryIsolationRelease = validateReleaseResponse(primaryIsolationReleaseResponse, {
      symbol: primaryIsolationContext.symbol,
      market: primaryIsolationContext.market,
      provider: primaryIsolationContext.provider,
      reason: "RELEASED",
    });

    const secondaryDeltaResponse = await secondaryClient.post(
      "/chart/intraday-line/delta",
      buildDeltaBody(secondarySnapshotContext, {
        cursor: secondarySnapshotContext.cursor,
        limit: deltaLimit,
        provider: secondarySnapshotContext.provider,
      }),
    );
    const secondaryDelta = validateDeltaResponse(secondaryDeltaResponse);

    const primaryDeltaAfterOwnReleaseResponse = await primaryClient.post(
      "/chart/intraday-line/delta",
      buildDeltaBody(primaryIsolationContext, {
        cursor: primaryIsolationContext.cursor,
        limit: deltaLimit,
        provider: primaryIsolationContext.provider,
      }),
    );
    assertErrorStatus(primaryDeltaAfterOwnReleaseResponse, {
      label: "主调用方释放后 delta",
      status: 409,
      messageIncludes: "LEASE_CONFLICT",
    });

    const secondaryReleaseResponse = await secondaryClient.post(
      "/chart/intraday-line/release",
      buildReleaseBody(secondarySnapshotContext, {
        provider: secondarySnapshotContext.provider,
      }),
    );
    const secondaryRelease = validateReleaseResponse(secondaryReleaseResponse, {
      symbol: secondarySnapshotContext.symbol,
      market: secondarySnapshotContext.market,
      provider: secondarySnapshotContext.provider,
      reason: "RELEASED",
    });

    report.ownerIsolation = {
      enabled: true,
      primaryRelease: primaryIsolationRelease,
      primaryDeltaAfterOwnRelease: summarizeErrorResponse(primaryDeltaAfterOwnReleaseResponse),
      secondarySnapshot: {
        pointsCount: secondarySnapshotContext.pointsCount,
        runtimeMode: secondarySnapshotContext.runtimeMode,
      },
      secondaryDelta,
      secondaryRelease,
    };
  }

  const writtenReport = writeReport(outputFile, report);
  if (writtenReport) {
    report.outputFile = writtenReport;
  }

  console.log("[PASS] chart intraday API contract");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error("[FAIL] chart intraday API contract");
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
