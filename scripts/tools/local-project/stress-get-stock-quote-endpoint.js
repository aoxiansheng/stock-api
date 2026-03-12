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
  parsePositiveInteger,
  runConcurrentPressure,
  summarizePressureRun,
} = require("./pressure-test-helpers");

function printHelp() {
  console.log(`用法:
node "scripts/tools/local-project/stress-get-stock-quote-endpoint.js" \\
  --app-key "<APP_KEY>" \\
  --access-token "<ACCESS_TOKEN>" \\
  --symbols "00700.HK,00941.HK,AAPL.US" \\
  --concurrency 20 \\
  --requests 200 \\
  --symbol-strategy round-robin

参数:
  --base-url                 默认 http://127.0.0.1:3001
  --provider                 默认 infoway
  --symbols                  标的池，逗号分隔
  --symbol-strategy          fixed | round-robin | window，默认 fixed
  --request-symbol-count     每次请求携带的 symbol 数，默认 fixed=全量，其它=1
  --concurrency              并发数，默认 10
  --requests                 总请求数，默认 100
  --market                   可选市场
  --realtime                 默认 true
  --use-smart-cache          默认 false，压测 scheduler 时建议 false
  --storage-mode             可选
  --stagger-ms               每个 worker 的请求间隔，默认 0
  --min-success-rate         默认 1
`);
}

function validateQuoteResponse(response) {
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      errorMessage: `HTTP ${response.status}`,
      details: response.data,
    };
  }

  if (response.data?.success !== true || response.data?.statusCode !== 200) {
    return {
      ok: false,
      status: response.status,
      errorMessage: "顶层 success/statusCode 校验失败",
      details: response.data,
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
    };
  }

  return {
    ok: true,
    status: response.status,
  };
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
  const symbols = parseSymbols(args.symbols, "00700.HK");
  const symbolStrategy = String(args["symbol-strategy"] || "fixed").trim().toLowerCase();
  const requestSymbolCount = parsePositiveInteger(
    args["request-symbol-count"],
    symbolStrategy === "fixed" ? Math.max(1, symbols.length) : 1,
  );
  const concurrency = parsePositiveInteger(args.concurrency, 10);
  const totalRequests = parsePositiveInteger(args.requests, 100);
  const minSuccessRate = Number(args["min-success-rate"] || 1);
  const staggerMs = Math.max(0, Number(args["stagger-ms"] || 0));
  const realtime = parseBoolean(args.realtime, true);
  const useSmartCache = parseBoolean(args["use-smart-cache"], false);
  const market = String(args.market || "").trim().toUpperCase();
  const storageMode = String(args["storage-mode"] || "").trim();

  if (symbols.length === 0) {
    throw new Error("symbols 不能为空");
  }

  const run = await runConcurrentPressure({
    concurrency,
    totalRequests,
    staggerMs,
    onRequest: async ({ requestIndex }) => {
      const requestSymbols = buildRequestSymbols({
        symbols,
        strategy: symbolStrategy,
        requestIndex,
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
      if (market) {
        body.options.market = market;
      }
      if (storageMode) {
        body.options.storageMode = storageMode;
      }
      const response = await client.post("/receiver/data", body);
      return validateQuoteResponse(response);
    },
  });

  const summary = summarizePressureRun(run, {
    sampleFailureLimit: parsePositiveInteger(args["sample-failures"], 5),
  });
  assertMinSuccessRate(summary, minSuccessRate);

  console.log("[PASS] stress get-stock-quote endpoint");
  console.log(
    JSON.stringify(
      {
        endpoint: "POST /api/v1/receiver/data",
        receiverType: "get-stock-quote",
        provider,
        symbols,
        symbolStrategy,
        requestSymbolCount,
        concurrency,
        totalRequests,
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
