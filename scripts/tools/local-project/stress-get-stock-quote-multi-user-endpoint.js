#!/usr/bin/env node
/* eslint-disable no-console */
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
node "scripts/tools/local-project/stress-get-stock-quote-multi-user-endpoint.js" \\
  --app-key "<APP_KEY>" \\
  --access-token "<ACCESS_TOKEN>" \\
  --symbols "AAPL.US,QQQ.US,00700.HK,00941.HK" \\
  --user-count 12 \\
  --concurrency 12 \\
  --requests 120 \\
  --shared-symbol-count 2 \\
  --shared-user-ratio 0.5 \\
  --global-interval-ms 20

参数:
  --base-url                 默认 http://127.0.0.1:3001
  --provider                 默认 infoway
  --symbols                  标的池，建议混合多地区股票
  --user-count               虚拟用户数，默认 12
  --shared-symbol-count      共享 symbol 数，默认 2
  --shared-user-ratio        共享用户占比，默认 0.5
  --per-user-unique-count    每个用户附带的独有 symbol 数，默认 1
  --user-symbol-strategy     fixed | round-robin | window，默认 fixed
  --request-symbol-count     每次请求携带多少个 symbol，默认 1
  --concurrency              并发数，默认等于 user-count
  --requests                 总请求数，默认 120
  --realtime                 默认 true
  --use-smart-cache          默认 false，压测 scheduler 时建议 false
  --storage-mode             可选
  --stagger-ms               每个 worker 的本地间隔，默认 0
  --global-interval-ms       全局发包间隔，默认 0
  --min-success-rate         默认 1
  --sample-users             输出多少个用户样本，默认 8
  --sample-plan              输出多少个请求计划样本，默认 12
`);
}

function validateQuoteResponse(response, expectedSymbols, requestMetadata) {
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      errorMessage: `HTTP ${response.status}`,
      details: response.data,
      metadata: requestMetadata,
    };
  }

  if (response.data?.success !== true || response.data?.statusCode !== 200) {
    return {
      ok: false,
      status: response.status,
      errorMessage: "顶层 success/statusCode 校验失败",
      details: response.data,
      metadata: requestMetadata,
    };
  }

  const business = response.data?.data;
  const rows = Array.isArray(business?.data) ? business.data : [];
  if (rows.length === 0) {
    return {
      ok: false,
      status: response.status,
      errorMessage: "data.data 为空",
      details: response.data,
      metadata: requestMetadata,
    };
  }

  const returnedSymbols = new Set(
    rows.map((row) => String(row?.symbol || "").trim().toUpperCase()).filter(Boolean),
  );
  const missingSymbols = expectedSymbols.filter((symbol) => !returnedSymbols.has(symbol));
  if (missingSymbols.length > 0) {
    return {
      ok: false,
      status: response.status,
      errorMessage: `返回缺少请求标的: ${missingSymbols.join(",")}`,
      details: response.data,
      metadata: requestMetadata,
    };
  }

  return {
    ok: true,
    status: response.status,
    metadata: requestMetadata,
  };
}

function buildSampleRequestPlan(users, options) {
  const samplePlanCount = Math.max(1, parsePositiveInteger(options.samplePlanCount, 12));
  const totalRequests = Math.max(1, parsePositiveInteger(options.totalRequests, samplePlanCount));
  const requestSymbolCount = Math.max(1, parsePositiveInteger(options.requestSymbolCount, 1));
  const userSymbolStrategy = String(options.userSymbolStrategy || "fixed").trim().toLowerCase();

  return Array.from({ length: Math.min(samplePlanCount, totalRequests) }, (_, requestIndex) => {
    const userIndex = requestIndex % users.length;
    const userRound = Math.floor(requestIndex / users.length);
    const user = users[userIndex];
    return {
      requestIndex,
      userId: user.userId,
      userRound,
      requestSymbols: buildRequestSymbols({
        symbols: user.symbols,
        strategy: userSymbolStrategy,
        requestIndex: userRound,
        requestSymbolCount,
      }),
    };
  });
}

async function main() {
  const rawArgs = parseCliArgs();
  if (parseBoolean(rawArgs.help, false)) {
    printHelp();
    return;
  }

  const client = createEndpointClient();
  const { args } = client;

  const provider = String(args.provider || "infoway").trim().toLowerCase();
  const symbols = parseSymbols(
    args.symbols,
    "AAPL.US,QQQ.US,00700.HK,00941.HK,MSFT.US,00005.HK",
  );
  const userCount = parsePositiveInteger(args["user-count"], 12);
  const sharedSymbolCount = Math.max(0, Number(args["shared-symbol-count"] || 2));
  const sharedUserRatio = Number(args["shared-user-ratio"] || 0.5);
  const perUserUniqueCount = parsePositiveInteger(args["per-user-unique-count"], 1);
  const userSymbolStrategy = String(args["user-symbol-strategy"] || "fixed").trim().toLowerCase();
  const requestSymbolCount = parsePositiveInteger(args["request-symbol-count"], 1);
  const concurrency = parsePositiveInteger(args.concurrency, userCount);
  const totalRequests = parsePositiveInteger(args.requests, 120);
  const minSuccessRate = Number(args["min-success-rate"] || 1);
  const staggerMs = Math.max(0, Number(args["stagger-ms"] || 0));
  const globalIntervalMs = Math.max(0, Number(args["global-interval-ms"] || 0));
  const realtime = parseBoolean(args.realtime, true);
  const useSmartCache = parseBoolean(args["use-smart-cache"], false);
  const storageMode = String(args["storage-mode"] || "").trim();
  const sampleUsers = Math.max(1, parsePositiveInteger(args["sample-users"], 8));
  const samplePlanCount = Math.max(1, parsePositiveInteger(args["sample-plan"], 12));

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
    requestSymbolCount,
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
        requestSymbolCount,
      });

      const body = {
        symbols: requestSymbols,
        receiverType: "get-stock-quote",
        options: {
          preferredProvider: provider,
          realtime,
          useSmartCache,
        },
      };

      if (storageMode) {
        body.options.storageMode = storageMode;
      }

      const requestMetadata = {
        userId: user.userId,
        workerId,
        userRound,
        requestSymbols,
      };

      const response = await client.post("/receiver/data", body, {
        headers: {
          "X-Stress-User-Id": user.userId,
          "X-Stress-Worker-Id": String(workerId),
        },
      });
      return validateQuoteResponse(response, requestSymbols, requestMetadata);
    },
  });

  const summary = summarizePressureRun(run, {
    sampleFailureLimit: parsePositiveInteger(args["sample-failures"], 5),
  });
  assertMinSuccessRate(summary, minSuccessRate);

  console.log("[PASS] stress get-stock-quote multi-user endpoint");
  console.log(
    JSON.stringify(
      {
        endpoint: "POST /api/v1/receiver/data",
        receiverType: "get-stock-quote",
        provider,
        symbols,
        requestModel: "virtual-users-mixed-markets",
        virtualUsers: {
          userCount: users.length,
          sharedSymbolCount,
          sharedUserRatio,
          perUserUniqueCount,
          sampleUsers: users.slice(0, sampleUsers),
          symbolFanoutTop: fanout.slice(0, 12),
        },
        requestPattern: {
          userSymbolStrategy,
          requestSymbolCount,
          concurrency,
          totalRequests,
          staggerMs,
          globalIntervalMs,
          samplePlan,
        },
        useSmartCache,
        summary,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("[FAIL]", error?.message || String(error));
  process.exit(1);
});
