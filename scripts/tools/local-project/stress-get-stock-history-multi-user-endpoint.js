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
node "scripts/tools/local-project/stress-get-stock-history-multi-user-endpoint.js" \\
  --app-key "<APP_KEY>" \\
  --access-token "<ACCESS_TOKEN>" \\
  --symbols "09618.HK,00700.HK,09988.HK,01810.HK" \\
  --provider infoway \\
  --market HK \\
  --kline-num 500 \\
  --timestamp 1773417599 \\
  --user-count 12 \\
  --concurrency 12 \\
  --requests 120 \\
  --shared-symbol-count 2 \\
  --shared-user-ratio 0.5 \\
  --use-smart-cache false \\
  --global-interval-ms 20

也支持环境变量:
APP_KEY=xxx ACCESS_TOKEN=yyy BASE_URL="http://127.0.0.1:3001" \\
node "scripts/tools/local-project/stress-get-stock-history-multi-user-endpoint.js" \\
  --symbols "09618.HK,00700.HK"

参数:
  --base-url                 默认 http://127.0.0.1:3001
  --provider                 默认 infoway
  --symbols                  标的池；每次请求只会取 1 个 symbol
  --market                   可选；同市场压测建议显式传入 HK/US
  --kline-num                默认 500，更贴近 snapshot 的历史回填
  --timestamp                可选；建议传交易日结束秒级时间戳，复现 snapshot 场景
  --min-rows                 每次至少返回多少条历史记录，默认 1
  --user-count               虚拟用户数，默认 12
  --shared-symbol-count      共享 symbol 数，默认 2
  --shared-user-ratio        共享用户占比，默认 0.5
  --per-user-unique-count    每个用户附带的独有 symbol 数，默认 1
  --user-symbol-strategy     fixed | round-robin | window，默认 round-robin
  --concurrency              并发数，默认等于 user-count
  --requests                 总请求数，默认 120
  --use-smart-cache          默认 false，建议关闭以贴近 snapshot 直连抓数
  --storage-mode             可选
  --stagger-ms               每个 worker 的本地间隔，默认 0
  --global-interval-ms       全局发包间隔，默认 0
  --min-success-rate         最低成功率阈值，默认 1
  --sample-users             输出多少个用户样本，默认 8
  --sample-plan              输出多少个请求计划样本，默认 12
  --sample-failures          输出多少个失败样本，默认 5
  --output-file              可选，保存 JSON 报告到文件
`);
}

function normalizeSymbol(value) {
  return String(value || "").trim().toUpperCase();
}

function parseOptionalPositiveTimestamp(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`timestamp 非法: ${normalized}`);
  }

  return parsed;
}

function validateRows(rows) {
  const issues = [];

  rows.forEach((row, index) => {
    if (!row || typeof row !== "object") {
      issues.push(`data[${index}] 不是对象`);
      return;
    }

    const requiredStringFields = [
      "symbol",
      "lastPrice",
      "openPrice",
      "highPrice",
      "lowPrice",
      "volume",
      "turnover",
      "timestamp",
    ];

    requiredStringFields.forEach((field) => {
      const value = row[field];
      if (typeof value !== "string" || !value.trim()) {
        issues.push(`data[${index}].${field} 缺失`);
      }
    });
  });

  return issues;
}

function validateHistoryResponse(response, expectedSymbol, metadata, minRows) {
  if (!response || response.ok !== true) {
    return {
      ok: false,
      status: response?.status || 0,
      errorMessage: `history HTTP ${response?.status || 0}`,
      details: response?.data || null,
      metadata,
    };
  }

  if (response.data?.success !== true || response.data?.statusCode !== 200) {
    return {
      ok: false,
      status: response.status,
      errorMessage: "顶层 success/statusCode 校验失败",
      details: response.data,
      metadata,
    };
  }

  const business = response.data?.data;
  const rows = Array.isArray(business?.data) ? business.data : [];
  const metadataBlock = business?.metadata || {};
  if (rows.length < minRows) {
    return {
      ok: false,
      status: response.status,
      errorMessage: `历史记录数不足: expected>=${minRows}, actual=${rows.length}`,
      details: response.data,
      metadata,
    };
  }

  const issues = validateRows(rows);
  if (issues.length > 0) {
    return {
      ok: false,
      status: response.status,
      errorMessage: "业务字段校验失败",
      details: issues,
      metadata,
    };
  }

  const returnedSymbols = new Set(
    rows.map((row) => normalizeSymbol(row?.symbol)).filter(Boolean),
  );
  if (!returnedSymbols.has(normalizeSymbol(expectedSymbol))) {
    return {
      ok: false,
      status: response.status,
      errorMessage: `返回缺少请求标的: ${expectedSymbol}`,
      details: response.data,
      metadata,
    };
  }

  return {
    ok: true,
    status: response.status,
    metadata: {
      ...metadata,
      requestSymbol: expectedSymbol,
      provider: metadataBlock.provider || null,
      returnedCount: rows.length,
      firstTimestamp: rows[0]?.timestamp || null,
      lastTimestamp: rows[rows.length - 1]?.timestamp || null,
      firstPrice: rows[0]?.lastPrice || null,
      lastPrice: rows[rows.length - 1]?.lastPrice || null,
    },
  };
}

function buildSampleRequestPlan(users, options) {
  const samplePlanCount = Math.max(1, parsePositiveInteger(options.samplePlanCount, 12));
  const totalRequests = Math.max(1, parsePositiveInteger(options.totalRequests, samplePlanCount));
  const userSymbolStrategy = String(options.userSymbolStrategy || "round-robin")
    .trim()
    .toLowerCase();

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
      symbol: normalizeSymbol(requestSymbols[0] || user.symbols[0]),
    };
  });
}

function summarizeBySymbol(results) {
  const map = new Map();

  for (const item of Array.isArray(results) ? results : []) {
    const symbol = normalizeSymbol(item?.metadata?.requestSymbol);
    if (!symbol) {
      continue;
    }

    if (!map.has(symbol)) {
      map.set(symbol, {
        symbol,
        requests: 0,
        success: 0,
        failure: 0,
        rowsTotal: 0,
        rowsSamples: 0,
      });
    }

    const stat = map.get(symbol);
    stat.requests += 1;
    if (item.ok) {
      stat.success += 1;
    } else {
      stat.failure += 1;
    }

    const returnedCount = Number(item?.metadata?.returnedCount);
    if (Number.isFinite(returnedCount) && returnedCount >= 0) {
      stat.rowsTotal += returnedCount;
      stat.rowsSamples += 1;
    }
  }

  return Array.from(map.values())
    .map((item) => ({
      symbol: item.symbol,
      requests: item.requests,
      success: item.success,
      failure: item.failure,
      successRate: Number((item.success / Math.max(1, item.requests)).toFixed(4)),
      avgReturnedRows:
        item.rowsSamples > 0
          ? Number((item.rowsTotal / item.rowsSamples).toFixed(2))
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
    "09618.HK,00700.HK,09988.HK,01810.HK,02318.HK,00941.HK",
  );
  const market = String(args.market || "").trim().toUpperCase();
  const klineNum = Math.max(1, parsePositiveInteger(args["kline-num"] || args.klineNum, 500));
  const timestamp = parseOptionalPositiveTimestamp(args.timestamp);
  const minRows = Math.max(1, parsePositiveInteger(args["min-rows"], 1));
  const userCount = parsePositiveInteger(args["user-count"], 12);
  const sharedSymbolCount = Math.max(0, Number(args["shared-symbol-count"] || 2));
  const sharedUserRatio = Number(args["shared-user-ratio"] || 0.5);
  const perUserUniqueCount = parsePositiveInteger(args["per-user-unique-count"], 1);
  const userSymbolStrategy = String(args["user-symbol-strategy"] || "round-robin")
    .trim()
    .toLowerCase();
  const concurrency = parsePositiveInteger(args.concurrency, userCount);
  const totalRequests = parsePositiveInteger(args.requests, 120);
  const useSmartCache = parseBoolean(args["use-smart-cache"], false);
  const storageMode = String(args["storage-mode"] || "").trim();
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

      const body = {
        symbols: [requestSymbol],
        receiverType: "get-stock-history",
        options: {
          preferredProvider: provider,
          klineNum,
          useSmartCache,
        },
      };
      if (market) {
        body.options.market = market;
      }
      if (timestamp) {
        body.options.timestamp = timestamp;
      }
      if (storageMode) {
        body.options.storageMode = storageMode;
      }

      const metadata = {
        userId: user.userId,
        workerId,
        requestIndex,
        userRound,
        requestSymbol,
        market: market || null,
        klineNum,
        timestamp,
        useSmartCache,
      };

      const response = await client.post("/receiver/data", body, {
        headers: {
          "X-Stress-User-Id": user.userId,
          "X-Stress-Worker-Id": String(workerId),
        },
      });

      return validateHistoryResponse(response, requestSymbol, metadata, minRows);
    },
  });

  const summary = summarizePressureRun(run, {
    sampleFailureLimit: parsePositiveInteger(args["sample-failures"], 5),
  });
  assertMinSuccessRate(summary, minSuccessRate);

  const report = {
    endpoint: "POST /api/v1/receiver/data",
    receiverType: "get-stock-history",
    provider,
    symbols,
    checks: {
      minRows,
      minSuccessRate,
    },
    requestPattern: {
      userSymbolStrategy,
      market: market || null,
      klineNum,
      timestamp,
      useSmartCache,
      storageMode: storageMode || null,
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
      symbolFanoutTop: fanout.slice(0, 12),
    },
    samplePlan,
    summary,
    bySymbol: summarizeBySymbol(run.results),
  };

  if (outputFile) {
    const absolutePath = path.resolve(outputFile);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, JSON.stringify(report, null, 2));
    report.outputFile = absolutePath;
  }

  console.log("[PASS] stress get-stock-history multi-user endpoint");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error("[FAIL]", error?.message || String(error));
  process.exit(1);
});
