#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const {
  createEndpointClient,
  parseBoolean,
  parseCliArgs,
  parseSymbols,
} = require("./project-api-client");
const {
  assertMinSuccessRate,
  buildRequestSymbols,
  buildUserFanout,
  buildVirtualUserProfiles,
  parsePositiveInteger,
  runConcurrentPressure,
  summarizePressureRun,
} = require("./pressure-test-helpers");

function printHelp() {
  console.log(`用法:
node "scripts/tools/local-project/stress-chart-intraday-line-multi-user-endpoint.js" \\
  --app-key "<APP_KEY>" \\
  --access-token "<ACCESS_TOKEN>" \\
  --symbols "00700.HK,00941.HK,00005.HK,09988.HK,01810.HK,02318.HK" \\
  --user-count 20 \\
  --concurrency 20 \\
  --requests 200 \\
  --shared-symbol-count 3 \\
  --shared-user-ratio 0.6 \\
  --verify-delta true

也支持直接使用环境变量（无需显式传参）:
APP_KEY=xxx ACCESS_TOKEN=yyy BASE_URL="http://127.0.0.1:3001" \\
node "scripts/tools/local-project/stress-chart-intraday-line-multi-user-endpoint.js" --provider infoway

参数:
  --base-url                 默认 http://127.0.0.1:3001
  --provider                 默认 infoway
  --symbols                  股票池（会自动去重）
  --user-count               虚拟用户数，默认 20
  --shared-symbol-count      共享 symbol 数，默认 3
  --shared-user-ratio        共享用户占比，默认 0.6
  --per-user-unique-count    每个用户附带独有 symbol 数，默认 2
  --user-symbol-strategy     fixed | round-robin | window，默认 round-robin
  --concurrency              并发数，默认等于 user-count
  --requests                 总请求数，默认 200
  --point-limit              snapshot pointLimit，默认 30000
  --market                   可选，默认空（由服务端推断）
  --trading-day              可选，格式 YYYYMMDD
  --min-points               snapshot 至少返回点位数，默认 1
  --verify-delta             是否额外校验 delta，默认 false
  --delta-limit              verify-delta=true 时使用，默认 2000
  --min-delta-points         verify-delta=true 时 delta 最少点位，默认 0
  --stagger-ms               每个 worker 的本地间隔，默认 0
  --global-interval-ms       全局发包间隔，默认 0
  --min-success-rate         最低成功率阈值，默认 1
  --sample-users             用户样本输出数量，默认 8
  --sample-failures          失败样本输出数量，默认 5
  --output-file              可选，保存 JSON 报告到文件
`);
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

function validateSnapshotResponse(response, expectedSymbol, metadata, minPoints) {
  if (!response || response.ok !== true) {
    return {
      ok: false,
      status: response?.status || 0,
      errorMessage: `snapshot HTTP ${response?.status || 0}`,
      details: response?.data || null,
      metadata,
    };
  }

  if (response.data?.success !== true || response.data?.statusCode !== 200) {
    return {
      ok: false,
      status: response.status,
      errorMessage: "snapshot 顶层 success/statusCode 校验失败",
      details: response.data,
      metadata,
    };
  }

  const line = response.data?.data?.line;
  const sync = response.data?.data?.sync;
  const symbol = normalizeSymbol(line?.symbol);
  const points = Array.isArray(line?.points) ? line.points : [];
  const cursor = String(sync?.cursor || "").trim();
  const lastPointTimestamp = String(sync?.lastPointTimestamp || "").trim();

  if (!line || typeof line !== "object") {
    return {
      ok: false,
      status: response.status,
      errorMessage: "snapshot 缺少 data.line",
      details: response.data,
      metadata,
    };
  }

  if (symbol !== normalizeSymbol(expectedSymbol)) {
    return {
      ok: false,
      status: response.status,
      errorMessage: `snapshot 返回 symbol 不匹配: expected=${expectedSymbol}, actual=${symbol}`,
      details: response.data,
      metadata,
    };
  }

  if (points.length < minPoints) {
    return {
      ok: false,
      status: response.status,
      errorMessage: `snapshot 点位不足: expected>=${minPoints}, actual=${points.length}`,
      details: response.data,
      metadata,
    };
  }

  if (!cursor) {
    return {
      ok: false,
      status: response.status,
      errorMessage: "snapshot 未返回 cursor",
      details: response.data,
      metadata,
    };
  }

  if (!lastPointTimestamp) {
    return {
      ok: false,
      status: response.status,
      errorMessage: "snapshot 未返回 lastPointTimestamp",
      details: response.data,
      metadata,
    };
  }

  return {
    ok: true,
    status: response.status,
    metadata: {
      ...metadata,
      symbol,
      market: String(line?.market || "").trim(),
      tradingDay: String(line?.tradingDay || "").trim(),
      snapshotPoints: points.length,
      snapshotLastPointTimestamp: lastPointTimestamp,
      realtimeMergedPoints: Number(response.data?.data?.metadata?.realtimeMergedPoints || 0),
      cursor,
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

  const delta = response.data?.data?.delta;
  const points = Array.isArray(delta?.points) ? delta.points : [];
  const nextCursor = String(delta?.nextCursor || "").trim();
  const lastPointTimestamp = String(delta?.lastPointTimestamp || "").trim();

  if (!delta || typeof delta !== "object") {
    return {
      ok: false,
      status: response.status,
      errorMessage: "delta 缺少 data.delta",
      details: response.data,
      metadata,
    };
  }

  if (points.length < minDeltaPoints) {
    return {
      ok: false,
      status: response.status,
      errorMessage: `delta 点位不足: expected>=${minDeltaPoints}, actual=${points.length}`,
      details: response.data,
      metadata,
    };
  }

  if (!nextCursor) {
    return {
      ok: false,
      status: response.status,
      errorMessage: "delta 未返回 nextCursor",
      details: response.data,
      metadata,
    };
  }

  if (!lastPointTimestamp) {
    return {
      ok: false,
      status: response.status,
      errorMessage: "delta 未返回 lastPointTimestamp",
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
      deltaLastPointTimestamp: lastPointTimestamp,
    },
  };
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
      userId: user.userId,
      userRound,
      symbol: requestSymbols[0] || user.symbols[0],
    };
  });
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

async function main() {
  const rawArgs = parseCliArgs();
  if (parseBoolean(rawArgs.help, false)) {
    printHelp();
    return;
  }

  const clientArgv = [...process.argv.slice(2)];
  if (!rawArgs["app-key"] && process.env.APP_KEY) {
    clientArgv.push("--app-key", process.env.APP_KEY);
  }
  if (!rawArgs["access-token"] && process.env.ACCESS_TOKEN) {
    clientArgv.push("--access-token", process.env.ACCESS_TOKEN);
  }
  if (!rawArgs.bearer && process.env.AUTH_BEARER) {
    clientArgv.push("--bearer", process.env.AUTH_BEARER);
  }
  if (!rawArgs["base-url"] && process.env.BASE_URL) {
    clientArgv.push("--base-url", process.env.BASE_URL);
  }

  const client = createEndpointClient(clientArgv);
  const { args } = client;

  const provider = String(args.provider || "infoway").trim().toLowerCase();
  const symbols = parseSymbols(
    args.symbols,
    "00700.HK,00941.HK,00005.HK,09988.HK,01810.HK,02318.HK",
  );
  const userCount = parsePositiveInteger(args["user-count"], 20);
  const sharedSymbolCount = Math.max(0, Number(args["shared-symbol-count"] || 3));
  const sharedUserRatio = Number(args["shared-user-ratio"] || 0.6);
  const perUserUniqueCount = parsePositiveInteger(args["per-user-unique-count"], 2);
  const userSymbolStrategy = String(args["user-symbol-strategy"] || "round-robin").trim().toLowerCase();
  const concurrency = parsePositiveInteger(args.concurrency, userCount);
  const totalRequests = parsePositiveInteger(args.requests, 200);
  const pointLimit = parsePositiveInteger(args["point-limit"], 30000);
  const market = String(args.market || "").trim().toUpperCase();
  const tradingDay = String(args["trading-day"] || "").trim();
  const minPoints = parseNonNegativeInteger(args["min-points"], 1);
  const verifyDelta = parseBoolean(args["verify-delta"], false);
  const deltaLimit = parsePositiveInteger(args["delta-limit"], 2000);
  const minDeltaPoints = parseNonNegativeInteger(args["min-delta-points"], 0);
  const minSuccessRate = Number(args["min-success-rate"] || 1);
  const staggerMs = Math.max(0, Number(args["stagger-ms"] || 0));
  const globalIntervalMs = Math.max(0, Number(args["global-interval-ms"] || 0));
  const sampleUsers = Math.max(1, parsePositiveInteger(args["sample-users"], 8));
  const samplePlanCount = Math.max(1, parsePositiveInteger(args["sample-plan"], 12));
  const outputFile = String(args["output-file"] || "").trim();

  if (symbols.length === 0) {
    throw new Error("symbols 不能为空");
  }

  const users = buildVirtualUserProfiles({
    symbols,
    userCount,
    sharedSymbolCount,
    sharedUserRatio,
    perUserUniqueCount,
  });
  if (users.length === 0) {
    throw new Error("未生成任何虚拟用户");
  }

  const fanout = buildUserFanout(users);
  const samplePlan = buildSampleRequestPlan(users, {
    totalRequests,
    samplePlanCount,
    userSymbolStrategy,
  });

  const run = await runConcurrentPressure({
    concurrency,
    totalRequests,
    staggerMs,
    globalIntervalMs,
    onRequest: async ({ requestIndex, workerId }) => {
      const userIndex = requestIndex % users.length;
      const userRound = Math.floor(requestIndex / users.length);
      const user = users[userIndex];
      const requestSymbols = buildRequestSymbols({
        symbols: user.symbols,
        strategy: userSymbolStrategy,
        requestIndex: userRound,
        requestSymbolCount: 1,
      });
      const requestSymbol = normalizeSymbol(requestSymbols[0] || user.symbols[0]);

      const baseMetadata = {
        userId: user.userId,
        workerId,
        requestIndex,
        userRound,
        requestSymbol,
        verifyDelta,
      };

      const snapshotBody = {
        symbol: requestSymbol,
        provider,
        pointLimit,
      };
      if (market) {
        snapshotBody.market = market;
      }
      if (tradingDay) {
        snapshotBody.tradingDay = tradingDay;
      }

      const snapshotResponse = await client.post(
        "/chart/intraday-line/snapshot",
        snapshotBody,
        {
          headers: {
            "X-Stress-User-Id": user.userId,
            "X-Stress-Worker-Id": String(workerId),
          },
        },
      );

      const snapshotValidation = validateSnapshotResponse(
        snapshotResponse,
        requestSymbol,
        baseMetadata,
        minPoints,
      );
      if (!snapshotValidation.ok || !verifyDelta) {
        return snapshotValidation;
      }

      const snapshotMeta = snapshotValidation.metadata || baseMetadata;
      const deltaBody = {
        symbol: requestSymbol,
        provider,
        cursor: snapshotMeta.cursor,
        limit: deltaLimit,
      };
      if (snapshotMeta.market) {
        deltaBody.market = snapshotMeta.market;
      }
      if (snapshotMeta.tradingDay) {
        deltaBody.tradingDay = snapshotMeta.tradingDay;
      }

      const deltaResponse = await client.post(
        "/chart/intraday-line/delta",
        deltaBody,
        {
          headers: {
            "X-Stress-User-Id": user.userId,
            "X-Stress-Worker-Id": String(workerId),
          },
        },
      );

      return validateDeltaResponse(deltaResponse, snapshotMeta, minDeltaPoints);
    },
  });

  const summary = summarizePressureRun(run, {
    sampleFailureLimit: parsePositiveInteger(args["sample-failures"], 5),
  });
  assertMinSuccessRate(summary, minSuccessRate);

  const report = {
    endpoint: verifyDelta
      ? "POST /api/v1/chart/intraday-line/snapshot + POST /api/v1/chart/intraday-line/delta"
      : "POST /api/v1/chart/intraday-line/snapshot",
    provider,
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
    virtualUsers: {
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
  };

  if (outputFile) {
    const resolved = path.resolve(outputFile);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, JSON.stringify(report, null, 2), "utf8");
    report.outputFile = resolved;
  }

  console.log("[PASS] stress chart-intraday-line multi-user");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error("[FAIL] stress chart-intraday-line multi-user");
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
