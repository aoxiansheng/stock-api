#!/usr/bin/env node
/* eslint-disable no-console */
const {
  createEndpointClient,
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

async function main() {
  const client = createEndpointClient();
  const { args } = client;
  const symbols = parseSymbols(args.symbols, "00700.HK");
  const provider = String(args.provider || "infoway").trim().toLowerCase();
  const market = String(args.market || "HK").trim().toUpperCase();
  const klineNum = Math.max(1, Number(args["kline-num"] || args.klineNum || 5));
  const sampleLimit = Math.max(1, Number(args["sample-limit"] || 5));
  const timestampArg = String(args.timestamp || "").trim();

  assert(symbols.length === 1, "get-stock-history 仅支持单标的", { symbols });
  assert(Number.isFinite(klineNum) && klineNum > 0, "klineNum 必须是正数", {
    klineNum,
  });

  const requestBody = {
    symbols,
    receiverType: "get-stock-history",
    options: {
      preferredProvider: provider,
      market,
      klineNum,
    },
  };

  if (timestampArg) {
    const timestamp = Number(timestampArg);
    assert(Number.isSafeInteger(timestamp) && timestamp > 0, "timestamp 必须是正整数", {
      timestamp: timestampArg,
    });
    requestBody.options.timestamp = timestamp;
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
  assert(missingSymbols.length === 0, "返回缺少请求标的", missingSymbols);

  console.log("[PASS] POST /api/v1/receiver/data get-stock-history");
  console.log(
    JSON.stringify(
      {
        endpoint: "POST /api/v1/receiver/data",
        receiverType: "get-stock-history",
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
