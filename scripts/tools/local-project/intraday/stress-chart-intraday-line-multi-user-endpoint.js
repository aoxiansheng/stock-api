#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("fs");
const path = require("path");
const {
  createEndpointClient,
  parseBoolean,
  parseCliArgs,
  parseSymbols,
} = require("../project-api-client");
const {
  assertMinSuccessRate,
  buildRequestSymbols,
  buildUserFanout,
  buildVirtualUserProfiles,
  parsePositiveInteger,
  runConcurrentPressure,
  summarizePressureRun,
} = require("../pressure-test-helpers");

function printHelp() {
  console.log(`用法:
node "scripts/tools/local-project/intraday/stress-chart-intraday-line-multi-user-endpoint.js" \\
  --app-key "<APP_KEY>" \\
  --access-token "<ACCESS_TOKEN>" \\
  --secondary-app-key "<SECONDARY_APP_KEY>" \\
  --secondary-access-token "<SECONDARY_ACCESS_TOKEN>" \\
  --symbols "AAPL.US,MSFT.US,NVDA.US" \\
  --user-count 8 \\
  --concurrency 8 \\
  --requests 40

说明：
  - 默认按消费指南执行 snapshot，必要时再跟一次 delta
  - snapshot 默认不显式传 provider，让后端真实自动选择
  - delta/release 始终复用 snapshot.metadata.provider
  - 若提供第二套凭证，则按真实 owner 隔离做双调用方压测

参数：
  --base-url                 默认 http://127.0.0.1:3001
  --provider                 可选；默认不传
  --symbols                  标的池，逗号分隔
  --user-count               逻辑前端用户数，默认 8
  --shared-symbol-count      默认 3
  --shared-user-ratio        默认 0.6
  --per-user-unique-count    默认 2
  --user-symbol-strategy     fixed | round-robin | window，默认 round-robin
  --concurrency              默认等于 user-count
  --requests                 默认 40
  --point-limit              默认 30000
  --market                   可选
  --trading-day              可选
  --min-points               snapshot 至少返回点位数，默认 1
  --verify-delta             是否额外压测 delta，默认 false
  --delta-limit              默认 2000
  --min-delta-points         默认 0
  --stagger-ms               默认 0
  --global-interval-ms       默认 0
  --min-success-rate         默认 1
  --sample-users             默认 8
  --sample-failures          默认 5
  --output-file              可选，写入 JSON 报告
`);
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
  const secondary = prefix === "secondary-";
  const keyOf = (key) => `${prefix}${key}`;

  const argv = [];
  appendArg(argv, "base-url", readFromArgsOrEnv(rawArgs, keyOf("base-url"), ["BASE_URL"]));
  appendArg(argv, "api-prefix", readFromArgsOrEnv(rawArgs, keyOf("api-prefix"), ["API_PREFIX"]));
  appendArg(argv, "timeout-ms", readFromArgsOrEnv(rawArgs, keyOf("timeout-ms"), ["TIMEOUT_MS"]));

  const bearer = readFromArgsOrEnv(
    rawArgs,
    keyOf("bearer"),
    secondary ? ["SECONDARY_AUTH_BEARER", "SECONDARY_BEARER"] : ["AUTH_BEARER", "BEARER"],
  );
  if (bearer) {
    appendArg(argv, "bearer", bearer);
    return argv;
  }

  appendArg(
    argv,
    "app-key",
    readFromArgsOrEnv(rawArgs, keyOf("app-key"), secondary ? ["SECONDARY_APP_KEY"] : ["APP_KEY"]),
  );
  appendArg(
    argv,
    "access-token",
    readFromArgsOrEnv(
      rawArgs,
      keyOf("access-token"),
      secondary ? ["SECONDARY_ACCESS_TOKEN"] : ["ACCESS_TOKEN"],
    ),
  );
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

function parseNonNegativeInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function normalizeSymbol(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeProvider(value) {
  return String(value || "").trim().toLowerCase();
}

function validateSnapshotResponse(response, expected, minPoints) {
  if (!response || response.ok !== true) {
    return {
      ok: false,
      status: response?.status || 0,
      errorMessage: `snapshot HTTP ${response?.status || 0}`,
      details: response?.data || null,
      metadata: expected,
    };
  }

  if (response.data?.success !== true || response.data?.statusCode !== 200) {
    return {
      ok: false,
      status: response.status,
      errorMessage: "snapshot 顶层 success/statusCode 校验失败",
      details: response.data,
      metadata: expected,
    };
  }

  const line = response.data?.data?.line || {};
  const sync = response.data?.data?.sync || {};
  const metadata = response.data?.data?.metadata || {};
  const points = Array.isArray(line.points) ? line.points : [];
  const resolvedProvider = normalizeProvider(metadata.provider);

  if (normalizeSymbol(line.symbol) !== normalizeSymbol(expected.symbol)) {
    return {
      ok: false,
      status: response.status,
      errorMessage: "snapshot 返回 symbol 不匹配",
      details: response.data,
      metadata: expected,
    };
  }

  if (points.length < minPoints) {
    return {
      ok: false,
      status: response.status,
      errorMessage: `snapshot 点位不足: expected>=${minPoints}, actual=${points.length}`,
      details: response.data,
      metadata: expected,
    };
  }

  if (!sync.cursor || !sync.lastPointTimestamp || !resolvedProvider) {
    return {
      ok: false,
      status: response.status,
      errorMessage: "snapshot 缺少 cursor/lastPointTimestamp/provider",
      details: response.data,
      metadata: expected,
    };
  }

  return {
    ok: true,
    status: response.status,
    metadata: {
      ...expected,
      symbol: normalizeSymbol(line.symbol),
      market: String(line.market || "").trim().toUpperCase(),
      tradingDay: String(line.tradingDay || "").trim(),
      provider: resolvedProvider,
      runtimeMode: String(metadata.runtimeMode || "").trim() || null,
      snapshotPoints: points.length,
      snapshotLastPointTimestamp: String(sync.lastPointTimestamp || "").trim(),
      realtimeMergedPoints: Number(metadata.realtimeMergedPoints || 0),
      cursor: String(sync.cursor || "").trim(),
    },
  };
}

function validateDeltaResponse(response, metadata, minDeltaPoints) {
  if (!response || response.ok !== true) {
    return {
      ok: false,
      status: response?.status || 0,
      errorMessage: `delta HTTP ${response?.status || 0}`,
      details: response?.data || null,
      metadata,
    };
  }

  if (response.data?.success !== true || response.data?.statusCode !== 200) {
    return {
      ok: false,
      status: response.status,
      errorMessage: "delta 顶层 success/statusCode 校验失败",
      details: response.data,
      metadata,
    };
  }

  const delta = response.data?.data?.delta || {};
  const points = Array.isArray(delta.points) ? delta.points : [];
  if (points.length < minDeltaPoints) {
    return {
      ok: false,
      status: response.status,
      errorMessage: `delta 点位不足: expected>=${minDeltaPoints}, actual=${points.length}`,
      details: response.data,
      metadata,
    };
  }
  if (!delta.nextCursor || !delta.lastPointTimestamp) {
    return {
      ok: false,
      status: response.status,
      errorMessage: "delta 缺少 nextCursor/lastPointTimestamp",
      details: response.data,
      metadata,
    };
  }

  return {
    ok: true,
    status: response.status,
    metadata: {
      ...metadata,
      deltaPoints: points.length,
      deltaLastPointTimestamp: String(delta.lastPointTimestamp || "").trim(),
    },
  };
}

async function releaseContext(client, context) {
  const response = await client.post("/chart/intraday-line/release", {
    symbol: context.symbol,
    market: context.market,
    provider: context.provider,
  });

  return {
    ok: response?.ok === true,
    status: Number(response?.status || 0),
    body: response?.data || null,
    context,
  };
}

function summarizeBySymbol(results) {
  const map = new Map();

  for (const item of Array.isArray(results) ? results : []) {
    const symbol = normalizeSymbol(item?.metadata?.symbol || item?.metadata?.requestSymbol);
    if (!symbol) {
      continue;
    }

    if (!map.has(symbol)) {
      map.set(symbol, {
        symbol,
        requests: 0,
        success: 0,
        failure: 0,
        snapshotPointsTotal: 0,
        snapshotPointsSamples: 0,
        deltaRequests: 0,
        deltaPointsTotal: 0,
      });
    }

    const stat = map.get(symbol);
    stat.requests += 1;
    if (item.ok) {
      stat.success += 1;
    } else {
      stat.failure += 1;
    }

    const snapshotPoints = Number(item?.metadata?.snapshotPoints);
    if (Number.isFinite(snapshotPoints) && snapshotPoints >= 0) {
      stat.snapshotPointsTotal += snapshotPoints;
      stat.snapshotPointsSamples += 1;
    }

    const deltaPoints = Number(item?.metadata?.deltaPoints);
    if (Number.isFinite(deltaPoints) && deltaPoints >= 0) {
      stat.deltaRequests += 1;
      stat.deltaPointsTotal += deltaPoints;
    }
  }

  return Array.from(map.values())
    .map((item) => ({
      symbol: item.symbol,
      requests: item.requests,
      success: item.success,
      failure: item.failure,
      successRate: Number((item.success / Math.max(1, item.requests)).toFixed(4)),
      avgSnapshotPoints:
        item.snapshotPointsSamples > 0
          ? Number((item.snapshotPointsTotal / item.snapshotPointsSamples).toFixed(2))
          : 0,
      deltaRequests: item.deltaRequests,
      avgDeltaPoints:
        item.deltaRequests > 0
          ? Number((item.deltaPointsTotal / item.deltaRequests).toFixed(2))
          : 0,
    }))
    .sort((left, right) => right.requests - left.requests || left.symbol.localeCompare(right.symbol));
}

function buildSampleRequestPlan(users, options) {
  const samplePlanCount = Math.max(1, parsePositiveInteger(options.samplePlanCount, 12));
  const totalRequests = Math.max(1, parsePositiveInteger(options.totalRequests, samplePlanCount));
  const userSymbolStrategy = String(options.userSymbolStrategy || "round-robin").trim().toLowerCase();

  return Array.from({ length: Math.min(samplePlanCount, totalRequests) }, (_, requestIndex) => {
    const userIndex = requestIndex % users.length;
    const userRound = Math.floor(requestIndex / users.length);
    const user = users[userIndex];
    const requestSymbols = buildRequestSymbols({
      symbols: user.symbols,
      strategy: userSymbolStrategy,
      requestIndex: userRound,
      requestSymbolCount: 1,
    });

    return {
      requestIndex,
      logicalUserId: user.userId,
      ownerSlot: user.ownerSlot,
      userRound,
      symbol: requestSymbols[0] || user.symbols[0],
    };
  });
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
  const ownerProfiles = [
    { ownerSlot: "primary", client: primaryClient },
    ...(secondaryClient ? [{ ownerSlot: "secondary", client: secondaryClient }] : []),
  ];

  const provider = normalizeProvider(rawArgs.provider);
  const providerExplicitlySet = Boolean(provider);
  const symbols = parseSymbols(rawArgs.symbols, "AAPL.US,MSFT.US,NVDA.US");
  const userCount = parsePositiveInteger(rawArgs["user-count"], 8);
  const sharedSymbolCount = Math.max(0, Number(rawArgs["shared-symbol-count"] || 3));
  const sharedUserRatio = Number(rawArgs["shared-user-ratio"] || 0.6);
  const perUserUniqueCount = parsePositiveInteger(rawArgs["per-user-unique-count"], 2);
  const userSymbolStrategy = String(rawArgs["user-symbol-strategy"] || "round-robin").trim().toLowerCase();
  const concurrency = parsePositiveInteger(rawArgs.concurrency, userCount);
  const totalRequests = parsePositiveInteger(rawArgs.requests, 40);
  const pointLimit = parsePositiveInteger(rawArgs["point-limit"], 30000);
  const market = String(rawArgs.market || "").trim().toUpperCase();
  const tradingDay = String(rawArgs["trading-day"] || "").trim();
  const minPoints = parseNonNegativeInteger(rawArgs["min-points"], 1);
  const verifyDelta = parseBoolean(rawArgs["verify-delta"], false);
  const deltaLimit = parsePositiveInteger(rawArgs["delta-limit"], 2000);
  const minDeltaPoints = parseNonNegativeInteger(rawArgs["min-delta-points"], 0);
  const minSuccessRate = Number(rawArgs["min-success-rate"] || 1);
  const staggerMs = Math.max(0, Number(rawArgs["stagger-ms"] || 0));
  const globalIntervalMs = Math.max(0, Number(rawArgs["global-interval-ms"] || 0));
  const sampleUsers = Math.max(1, parsePositiveInteger(rawArgs["sample-users"], 8));
  const samplePlanCount = Math.max(1, parsePositiveInteger(rawArgs["sample-plan"], 12));
  const sampleFailures = parsePositiveInteger(rawArgs["sample-failures"], 5);
  const outputFile = String(rawArgs["output-file"] || "").trim();

  if (symbols.length === 0) {
    throw new Error("symbols 不能为空");
  }

  const users = buildVirtualUserProfiles({
    symbols,
    userCount,
    sharedSymbolCount,
    sharedUserRatio,
    perUserUniqueCount,
  }).map((user, index) => ({
    ...user,
    ownerSlot: ownerProfiles[index % ownerProfiles.length].ownerSlot,
  }));

  const fanout = buildUserFanout(users);
  const samplePlan = buildSampleRequestPlan(users, {
    totalRequests,
    samplePlanCount,
    userSymbolStrategy,
  });
  const cleanupMap = new Map();

  const run = await runConcurrentPressure({
    concurrency,
    totalRequests,
    staggerMs,
    globalIntervalMs,
    onRequest: async ({ requestIndex, workerId }) => {
      const userIndex = requestIndex % users.length;
      const userRound = Math.floor(requestIndex / users.length);
      const user = users[userIndex];
      const ownerProfile = ownerProfiles.find((item) => item.ownerSlot === user.ownerSlot) || ownerProfiles[0];
      const requestSymbols = buildRequestSymbols({
        symbols: user.symbols,
        strategy: userSymbolStrategy,
        requestIndex: userRound,
        requestSymbolCount: 1,
      });
      const requestSymbol = normalizeSymbol(requestSymbols[0] || user.symbols[0]);

      const snapshotBody = {
        symbol: requestSymbol,
        pointLimit,
        ...(market ? { market } : {}),
        ...(tradingDay ? { tradingDay } : {}),
        ...(providerExplicitlySet ? { provider } : {}),
      };

      const baseMetadata = {
        logicalUserId: user.userId,
        ownerSlot: ownerProfile.ownerSlot,
        workerId,
        requestIndex,
        requestSymbol,
        verifyDelta,
      };

      const snapshotResponse = await ownerProfile.client.post("/chart/intraday-line/snapshot", snapshotBody);
      const snapshotValidation = validateSnapshotResponse(snapshotResponse, {
        ...baseMetadata,
        symbol: requestSymbol,
      }, minPoints);

      if (!snapshotValidation.ok) {
        return snapshotValidation;
      }

      const snapshotMeta = snapshotValidation.metadata;
      const cleanupKey = [
        ownerProfile.ownerSlot,
        snapshotMeta.symbol,
        snapshotMeta.market,
        snapshotMeta.provider,
      ].join("|");
      cleanupMap.set(cleanupKey, {
        ownerSlot: ownerProfile.ownerSlot,
        symbol: snapshotMeta.symbol,
        market: snapshotMeta.market,
        provider: snapshotMeta.provider,
      });

      if (!verifyDelta) {
        return snapshotValidation;
      }

      const deltaResponse = await ownerProfile.client.post("/chart/intraday-line/delta", {
        symbol: snapshotMeta.symbol,
        market: snapshotMeta.market,
        tradingDay: snapshotMeta.tradingDay,
        provider: snapshotMeta.provider,
        cursor: snapshotMeta.cursor,
        limit: deltaLimit,
        strictProviderConsistency: false,
      });

      return validateDeltaResponse(deltaResponse, snapshotMeta, minDeltaPoints);
    },
  });

  const summary = summarizePressureRun(run, {
    sampleFailureLimit: sampleFailures,
  });
  assertMinSuccessRate(summary, minSuccessRate);

  const cleanupResults = [];
  for (const context of cleanupMap.values()) {
    const ownerProfile = ownerProfiles.find((item) => item.ownerSlot === context.ownerSlot);
    if (!ownerProfile) {
      continue;
    }
    cleanupResults.push(await releaseContext(ownerProfile.client, context));
  }

  const report = {
    endpoint: verifyDelta
      ? "POST /api/v1/chart/intraday-line/snapshot + POST /api/v1/chart/intraday-line/delta"
      : "POST /api/v1/chart/intraday-line/snapshot",
    requestedProvider: providerExplicitlySet ? provider : null,
    ownerProfiles: ownerProfiles.map((item) => ({
      ownerSlot: item.ownerSlot,
      baseUrl: item.client.baseUrl,
    })),
    symbols,
    checks: {
      minPoints,
      verifyDelta,
      minDeltaPoints,
      minSuccessRate,
    },
    requestPattern: {
      userSymbolStrategy,
      market: market || null,
      tradingDay: tradingDay || null,
      pointLimit,
      deltaLimit,
      concurrency,
      totalRequests,
      staggerMs,
      globalIntervalMs,
    },
    logicalUsers: {
      userCount: users.length,
      sharedSymbolCount,
      sharedUserRatio,
      perUserUniqueCount,
      sampleUsers: users.slice(0, sampleUsers),
      symbolFanoutTop: fanout.slice(0, 20),
      sampleRequestPlan: samplePlan,
    },
    summary,
    symbolSummary: summarizeBySymbol(run.results),
    cleanup: {
      attempted: cleanupResults.length,
      succeeded: cleanupResults.filter((item) => item.ok).length,
      failed: cleanupResults.filter((item) => !item.ok).length,
      results: cleanupResults,
    },
  };

  if (outputFile) {
    const resolved = path.resolve(outputFile);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, JSON.stringify(report, null, 2), "utf8");
    report.outputFile = resolved;
  }

  console.log("[PASS] stress chart intraday line multi-owner");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error("[FAIL] stress chart intraday line multi-owner");
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
