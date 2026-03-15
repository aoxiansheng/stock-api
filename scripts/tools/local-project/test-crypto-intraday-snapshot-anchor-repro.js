#!/usr/bin/env node
/* eslint-disable no-console */

const { createEndpointClient, parseBoolean } = require("./project-api-client");

function assert(condition, message, extra) {
  if (condition) {
    return;
  }
  if (extra !== undefined) {
    throw new Error(`${message} | extra=${JSON.stringify(extra)}`);
  }
  throw new Error(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toIsoFromSeconds(seconds) {
  const value = Number(seconds);
  return Number.isFinite(value) ? new Date(value * 1000).toISOString() : null;
}

function resolveUtcTradingDay(inputTradingDay) {
  if (inputTradingDay) {
    return String(inputTradingDay).trim();
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function resolveCryptoAnchorSeconds(tradingDay) {
  const normalized = String(tradingDay || "").trim();
  assert(/^\d{8}$/.test(normalized), "tradingDay 必须是 YYYYMMDD", {
    tradingDay,
  });

  const currentTradingDay = resolveUtcTradingDay();
  if (normalized === currentTradingDay) {
    return Math.floor(Date.now() / 1000);
  }

  const year = Number(normalized.slice(0, 4));
  const month = Number(normalized.slice(4, 6));
  const day = Number(normalized.slice(6, 8));
  return Math.floor(Date.UTC(year, month - 1, day, 23, 59, 59) / 1000);
}

function normalizeHistoryRows(responseData) {
  const businessData = responseData?.data?.data;
  const rows = Array.isArray(businessData) ? businessData : [];
  return rows
    .map((row) => {
      const timestamp = String(row?.timestamp || "").trim();
      const lastPrice = String(row?.lastPrice || "").trim();
      const volume = String(row?.volume || "").trim();
      const market = String(row?.market || "").trim();
      const symbol = String(row?.symbol || "").trim();
      return {
        symbol,
        market,
        timestamp,
        lastPrice,
        volume,
      };
    })
    .filter((row) => row.timestamp && row.lastPrice);
}

function filterRowsByTradingDay(rows, tradingDay) {
  return rows.filter((row) => {
    const timestampMs = Date.parse(row.timestamp);
    if (!Number.isFinite(timestampMs)) {
      return false;
    }

    const date = new Date(timestampMs);
    const rowTradingDay = `${date.getUTCFullYear()}${String(
      date.getUTCMonth() + 1,
    ).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
    return rowTradingDay === tradingDay;
  });
}

function normalizeSnapshotReference(reference) {
  return {
    previousClosePrice:
      typeof reference?.previousClosePrice === "number" &&
      Number.isFinite(reference.previousClosePrice)
        ? reference.previousClosePrice
        : null,
    sessionOpenPrice:
      typeof reference?.sessionOpenPrice === "number" &&
      Number.isFinite(reference.sessionOpenPrice)
        ? reference.sessionOpenPrice
        : null,
    priceBase: String(reference?.priceBase || "").trim() || null,
    marketSession: String(reference?.marketSession || "").trim() || null,
    timezone: String(reference?.timezone || "").trim() || null,
    status: String(reference?.status || "").trim() || null,
  };
}

function isRateLimitResponse(response) {
  const status = Number(response?.status || 0);
  const statusCode = Number(response?.data?.statusCode || 0);
  const errorCode = String(response?.data?.error?.code || "").trim();
  return (
    status === 429 ||
    statusCode === 429 ||
    errorCode === "RESOURCE_EXHAUSTED"
  );
}

async function postWithRetry(client, path, body, options = {}) {
  const maxAttempts = Math.max(1, Number(options.maxAttempts || 1));
  const retryDelayMs = Math.max(0, Number(options.retryDelayMs || 0));
  const label = String(options.label || path);

  let lastResponse = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await client.post(path, body);
    lastResponse = response;
    if (response?.ok) {
      return response;
    }

    if (!isRateLimitResponse(response) || attempt >= maxAttempts) {
      return response;
    }

    const nextDelayMs = retryDelayMs * attempt;
    console.warn(
      `[retry] ${label} 命中 429，准备第 ${attempt + 1}/${maxAttempts} 次尝试，等待 ${nextDelayMs}ms`,
    );
    await sleep(nextDelayMs);
  }

  return lastResponse;
}

async function main() {
  const client = createEndpointClient();
  const { args } = client;

  const symbol = String(args.symbol || "BTCUSDT")
    .trim()
    .toUpperCase();
  const market = String(args.market || "CRYPTO")
    .trim()
    .toUpperCase();
  const provider = String(args.provider || "infoway")
    .trim()
    .toLowerCase();
  const pointLimit = Math.max(1, Number(args["point-limit"] || 30000));
  const klineNum = Math.max(
    1,
    Math.min(500, Number(args["kline-num"] || Math.ceil(pointLimit / 60))),
  );
  const minHistoryRows = Math.max(0, Number(args["min-history-rows"] || 2));
  const minSnapshotHistoryPoints = Math.max(
    0,
    Number(args["min-snapshot-history-points"] || 2),
  );
  const tradingDay = resolveUtcTradingDay(args["trading-day"]);
  const anchorTimestamp = resolveCryptoAnchorSeconds(tradingDay);
  const allowEmptySnapshot = parseBoolean(args["allow-empty-snapshot"], false);
  const requireReference = parseBoolean(args["require-reference"], false);
  const maxAttempts = Math.max(1, Number(args["max-attempts"] || 4));
  const retryDelayMs = Math.max(0, Number(args["retry-delay-ms"] || 1500));

  const snapshotRequest = {
    symbol,
    market,
    provider,
    tradingDay,
    pointLimit,
  };

  const historyRequest = {
    symbols: [symbol],
    receiverType: "get-crypto-history",
    options: {
      preferredProvider: provider,
      market,
      klineNum,
      timestamp: anchorTimestamp,
      useSmartCache: false,
    },
  };

  const snapshotResponse = await postWithRetry(
    client,
    "/chart/intraday-line/snapshot",
    snapshotRequest,
    {
      maxAttempts,
      retryDelayMs,
      label: "snapshot",
    },
  );
  const historyResponse = await postWithRetry(
    client,
    "/receiver/data",
    historyRequest,
    {
      maxAttempts,
      retryDelayMs,
      label: "get-crypto-history",
    },
  );

  assert(snapshotResponse.ok, "snapshot 调用失败", snapshotResponse);
  assert(historyResponse.ok, "get-crypto-history 调用失败", historyResponse);

  const snapshotData = snapshotResponse.data?.data || {};
  const snapshotPoints = Array.isArray(snapshotData?.line?.points)
    ? snapshotData.line.points
    : [];
  const snapshotMetadata = snapshotData?.metadata || {};
  const snapshotReference = normalizeSnapshotReference(snapshotData?.reference);
  const historyRows = normalizeHistoryRows(historyResponse.data);
  const inTradingDayRows = filterRowsByTradingDay(historyRows, tradingDay);

  if (!allowEmptySnapshot) {
    assert(snapshotPoints.length > 0, "snapshot 首屏 points 为空", {
      tradingDay,
      anchorTimestamp,
      anchorIso: toIsoFromSeconds(anchorTimestamp),
      historyRows: historyRows.length,
      inTradingDayRows: inTradingDayRows.length,
    });
  }

  assert(
    inTradingDayRows.length >= minHistoryRows,
    "crypto 历史基线不足，疑似未按 tradingDay 返回分钟历史",
    {
      tradingDay,
      anchorTimestamp,
      anchorIso: toIsoFromSeconds(anchorTimestamp),
      klineNum,
      minHistoryRows,
      rowsCount: historyRows.length,
      inTradingDayRowsCount: inTradingDayRows.length,
    },
  );

  assert(
    Number(snapshotMetadata.historyPoints || 0) >= minSnapshotHistoryPoints,
    "snapshot historyPoints 不足，首屏未建立有效历史基线",
    {
      tradingDay,
      anchorTimestamp,
      anchorIso: toIsoFromSeconds(anchorTimestamp),
      minSnapshotHistoryPoints,
      historyPoints: Number(snapshotMetadata.historyPoints || 0),
      realtimeMergedPoints: Number(snapshotMetadata.realtimeMergedPoints || 0),
      pointsCount: snapshotPoints.length,
    },
  );

  if (requireReference) {
    assert(
      snapshotReference.previousClosePrice !== null,
      "snapshot reference.previousClosePrice 为空",
      {
        tradingDay,
        reference: snapshotReference,
      },
    );
    assert(
      snapshotReference.sessionOpenPrice !== null,
      "snapshot reference.sessionOpenPrice 为空",
      {
        tradingDay,
        reference: snapshotReference,
      },
    );
  }

  console.log("[PASS] crypto intraday snapshot anchor repro");
  console.log(
    JSON.stringify(
      {
        baseUrl: client.baseUrl,
        tradingDay,
        market,
        provider,
        symbol,
        pointLimit,
        klineNum,
        anchorTimestamp,
        anchorIso: toIsoFromSeconds(anchorTimestamp),
        snapshot: {
          success: snapshotResponse.data?.success ?? null,
          statusCode:
            snapshotResponse.data?.statusCode ?? snapshotResponse.status,
          pointsCount: snapshotPoints.length,
          firstPoint: snapshotPoints[0] || null,
          lastPoint: snapshotPoints[snapshotPoints.length - 1] || null,
          metadata: snapshotMetadata,
          capability: snapshotData?.capability || null,
          reference: snapshotReference,
        },
        history: {
          success: historyResponse.data?.success ?? null,
          statusCode:
            historyResponse.data?.statusCode ?? historyResponse.status,
          rowsCount: historyRows.length,
          inTradingDayRowsCount: inTradingDayRows.length,
          firstRow: historyRows[0] || null,
          lastRow: historyRows[historyRows.length - 1] || null,
          firstInTradingDayRow: inTradingDayRows[0] || null,
          lastInTradingDayRow:
            inTradingDayRows[inTradingDayRows.length - 1] || null,
        },
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
