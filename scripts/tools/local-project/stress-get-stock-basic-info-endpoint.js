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
node "scripts/tools/local-project/stress-get-stock-basic-info-endpoint.js" \\
  --app-key "<APP_KEY>" \\
  --access-token "<ACCESS_TOKEN>" \\
  --symbols "AAPL.US,00700.HK" \\
  --concurrency 10 \\
  --requests 100

说明:
  - 默认 useSmartCache=false，便于验证 scheduler 与 stale fallback 主路径
  - 如需测试同 symbol 合并，传单个 symbol
  - 如需测试不同 symbol 合并，传多个 symbol 并设置 --symbol-strategy round-robin
`);
}

function validateBasicInfoResponse(response) {
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
  const symbols = parseSymbols(args.symbols, "AAPL.US,00700.HK");
  const symbolStrategy = String(args["symbol-strategy"] || "fixed").trim().toLowerCase();
  const requestSymbolCount = parsePositiveInteger(
    args["request-symbol-count"],
    symbolStrategy === "fixed" ? Math.max(1, symbols.length) : 1,
  );
  const concurrency = parsePositiveInteger(args.concurrency, 10);
  const totalRequests = parsePositiveInteger(args.requests, 100);
  const minSuccessRate = Number(args["min-success-rate"] || 1);
  const staggerMs = Math.max(0, Number(args["stagger-ms"] || 0));
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
        receiverType: "get-stock-basic-info",
        options: {
          preferredProvider: provider,
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
      return validateBasicInfoResponse(response);
    },
  });

  const summary = summarizePressureRun(run, {
    sampleFailureLimit: parsePositiveInteger(args["sample-failures"], 5),
  });
  assertMinSuccessRate(summary, minSuccessRate);

  console.log("[PASS] stress get-stock-basic-info endpoint");
  console.log(
    JSON.stringify(
      {
        endpoint: "POST /api/v1/receiver/data",
        receiverType: "get-stock-basic-info",
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
