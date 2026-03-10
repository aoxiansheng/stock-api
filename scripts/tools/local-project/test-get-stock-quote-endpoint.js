#!/usr/bin/env node
/* eslint-disable no-console */
const {
  createEndpointClient,
  parseBoolean,
  parseSymbols,
} = require("./project-api-client");

function assert(condition, message, extra) {
  if (condition) {
    return;
  }
  if (extra !== undefined) {
    throw new Error(`${message} | extra=${JSON.stringify(extra)}`);
  }
  throw new Error(message);
}

function validateRows(rows) {
  const issues = [];

  rows.forEach((row, index) => {
    if (!row || typeof row !== "object") {
      issues.push(`data[${index}] 不是对象`);
      return;
    }

    if (typeof row.symbol !== "string" || !row.symbol.trim()) {
      issues.push(`data[${index}].symbol 缺失`);
    }

    if (typeof row.market !== "string" || !row.market.trim()) {
      issues.push(`data[${index}].market 缺失`);
    }

    const lastPrice = Number(row.lastPrice);
    if (!Number.isFinite(lastPrice)) {
      issues.push(`data[${index}].lastPrice 不是数字`);
    }

    if (row.volume !== undefined) {
      const volume = Number(row.volume);
      if (!Number.isFinite(volume)) {
        issues.push(`data[${index}].volume 不是数字`);
      }
    }

    if (row.change !== undefined) {
      const change = Number(row.change);
      if (!Number.isFinite(change)) {
        issues.push(`data[${index}].change 不是数字`);
      }
    }

    if (row.changePercent !== undefined) {
      const changePercent = Number(row.changePercent);
      if (!Number.isFinite(changePercent)) {
        issues.push(`data[${index}].changePercent 不是数字`);
      }
    }

    if (row.timestamp !== undefined && (typeof row.timestamp !== "string" || !row.timestamp.trim())) {
      issues.push(`data[${index}].timestamp 非法`);
    }
  });

  return issues;
}

async function main() {
  const client = createEndpointClient();
  const { args } = client;
  const symbols = parseSymbols(args.symbols, "00700.HK");
  const provider = String(args.provider || "infoway").trim().toLowerCase();
  const market = String(args.market || "").trim().toUpperCase();
  const realtime = parseBoolean(args.realtime, true);
  const requireProviderMatch = parseBoolean(args["require-provider-match"], true);
  const strictSymbolMatch = parseBoolean(args["strict-symbol-match"], true);
  const sampleLimit = Math.max(1, Number(args["sample-limit"] || 5));
  const storageMode = String(args["storage-mode"] || "").trim();

  assert(symbols.length > 0, "symbols 不能为空");

  const requestBody = {
    symbols,
    receiverType: "get-stock-quote",
    options: {
      preferredProvider: provider,
      realtime,
      useSmartCache: false,
    },
  };

  if (market) {
    requestBody.options.market = market;
  }

  if (storageMode) {
    requestBody.options.storageMode = storageMode;
  }

  const response = await client.post("/receiver/data", requestBody);
  assert(response.ok, "receiver/data 调用失败", {
    status: response.status,
    body: response.data,
  });

  assert(response.data?.success === true, "顶层 success 应为 true", response.data);
  assert(response.data?.statusCode === 200, "顶层 statusCode 应为 200", response.data);

  const business = response.data?.data;
  const rows = Array.isArray(business?.data) ? business.data : [];
  const metadata = business?.metadata || {};

  assert(rows.length > 0, "data.data 不能为空", response.data);
  assert(typeof metadata === "object" && metadata, "data.metadata 缺失", response.data);

  const issues = validateRows(rows);
  assert(issues.length === 0, "业务字段校验失败", issues);

  const returnedSymbols = new Set(
    rows.map((row) => String(row.symbol || "").trim().toUpperCase()).filter(Boolean),
  );
  const missingSymbols = symbols.filter((symbol) => !returnedSymbols.has(symbol));
  if (strictSymbolMatch) {
    assert(missingSymbols.length === 0, "返回缺少请求标的", missingSymbols);
  }

  if (requireProviderMatch) {
    const actualProvider = String(metadata.provider || "").trim().toLowerCase();
    assert(actualProvider === provider, "metadata.provider 与请求不一致", {
      expected: provider,
      actual: actualProvider || null,
    });
  }

  console.log("[PASS] POST /api/v1/receiver/data get-stock-quote");
  console.log(
    JSON.stringify(
      {
        endpoint: "POST /api/v1/receiver/data",
        receiverType: "get-stock-quote",
        requestedSymbols: symbols,
        returnedCount: rows.length,
        provider: metadata.provider || null,
        sample: rows.slice(0, sampleLimit),
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
