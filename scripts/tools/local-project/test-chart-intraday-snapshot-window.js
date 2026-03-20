#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("fs");
const path = require("path");
const {
  createEndpointClient,
  parseBoolean,
  parseCliArgs,
} = require("./project-api-client");

const tradingDayFormatterCache = new Map();

function printHelp() {
  console.log(`用法:
node "scripts/tools/local-project/test-chart-intraday-snapshot-window.js" \\
  --app-key "<APP_KEY>" \\
  --access-token "<ACCESS_TOKEN>" \\
  --symbol "AAPL.US"

也支持环境变量：
APP_KEY=xxx ACCESS_TOKEN=yyy BASE_URL="http://127.0.0.1:3001" \\
node "scripts/tools/local-project/test-chart-intraday-snapshot-window.js"

参数：
  --base-url                         默认 http://127.0.0.1:3001
  --api-prefix                       默认 /api/v1
  --symbol                           默认 AAPL.US
  --market                           可选；默认由服务端推断
  --trading-day                      可选；默认由服务端推断
  --provider                         可选；默认不传，验证真实自动选 provider 行为
  --point-limit                      默认 30000
  --allow-empty-snapshot             默认 false；仅 live 模式下生效
  --expect-live                      默认 false；true 时要求 runtimeMode=live
  --strict-history-match             默认 true；校验 metadata.historyPoints 是否等于上游同日分钟历史数
  --require-first-point-match-history 默认 true；live 且存在历史基线时，要求 snapshot.firstPoint 与上游首根分钟线一致
  --max-attempts                     默认 4；命中 429 时重试
  --retry-delay-ms                   默认 1500
  --output-file                      可选，保存 JSON 报告
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

function normalizeSymbol(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeMarket(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeProvider(value) {
  return String(value || "").trim().toLowerCase();
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

function buildClientArgv(rawArgs) {
  const argv = [];
  appendArg(argv, "base-url", readFromArgsOrEnv(rawArgs, "base-url", ["BASE_URL"]));
  appendArg(argv, "api-prefix", readFromArgsOrEnv(rawArgs, "api-prefix", ["API_PREFIX"]));
  appendArg(argv, "timeout-ms", readFromArgsOrEnv(rawArgs, "timeout-ms", ["TIMEOUT_MS"]));

  const bearer = readFromArgsOrEnv(rawArgs, "bearer", ["AUTH_BEARER", "BEARER"]);
  if (bearer) {
    appendArg(argv, "bearer", bearer);
    return argv;
  }

  appendArg(argv, "app-key", readFromArgsOrEnv(rawArgs, "app-key", ["APP_KEY"]));
  appendArg(
    argv,
    "access-token",
    readFromArgsOrEnv(rawArgs, "access-token", ["ACCESS_TOKEN"]),
  );
  return argv;
}

function toIsoFromSeconds(seconds) {
  const parsed = Number(seconds);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return new Date(parsed * 1000).toISOString();
}

function resolveMarketTimezone(market) {
  switch (normalizeMarket(market)) {
    case "US":
      return "America/New_York";
    case "HK":
      return "Asia/Hong_Kong";
    case "CN":
    case "SH":
    case "SZ":
      return "Asia/Shanghai";
    case "CRYPTO":
      return "UTC";
    default:
      return "UTC";
  }
}

function getTradingDayFormatter(timeZone) {
  let formatter = tradingDayFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    tradingDayFormatterCache.set(timeZone, formatter);
  }
  return formatter;
}

function formatTradingDayFromTimestamp(timestampMs, market) {
  return getTradingDayFormatter(resolveMarketTimezone(market))
    .format(new Date(timestampMs))
    .replace(/-/g, "");
}

function isTimestampInTradingDay(timestampMs, tradingDay, market) {
  return formatTradingDayFromTimestamp(timestampMs, market) === tradingDay;
}

function getTimezoneOffsetMs(timezone, date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const values = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = Number(part.value);
    }
  }

  if (values.hour === 24) {
    values.hour = 0;
  }

  const timezoneAsUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  );
  return timezoneAsUtc - date.getTime();
}

function zonedDateTimeToUtcMs(ymd, hour, minute, second, timezone) {
  const year = Number(ymd.slice(0, 4));
  const month = Number(ymd.slice(4, 6));
  const day = Number(ymd.slice(6, 8));
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const offsetMs = getTimezoneOffsetMs(timezone, new Date(targetAsUtc));
  return targetAsUtc - offsetMs;
}

function resolveCurrentTradingDay(market) {
  return formatTradingDayFromTimestamp(Date.now(), market);
}

function resolveHistoryAnchorSeconds(tradingDay, market) {
  const normalizedTradingDay = String(tradingDay || "").trim();
  const normalizedMarket = normalizeMarket(market);

  assert(/^\d{8}$/.test(normalizedTradingDay), "tradingDay 必须是 YYYYMMDD", {
    tradingDay,
  });

  if (normalizedMarket === "CRYPTO") {
    if (normalizedTradingDay === resolveCurrentTradingDay("CRYPTO")) {
      return Math.floor(Date.now() / 1000);
    }

    return Math.floor(
      zonedDateTimeToUtcMs(normalizedTradingDay, 23, 59, 59, "UTC") / 1000,
    );
  }

  return Math.floor(
    zonedDateTimeToUtcMs(
      normalizedTradingDay,
      23,
      59,
      59,
      resolveMarketTimezone(normalizedMarket),
    ) / 1000,
  );
}

function resolveTradingDayStartUtcMs(tradingDay, market) {
  const normalizedMarket = normalizeMarket(market);
  const timezone =
    normalizedMarket === "CRYPTO" ? "UTC" : resolveMarketTimezone(market);
  return zonedDateTimeToUtcMs(tradingDay, 0, 0, 0, timezone);
}

function resolveTradingDayEndUtcMs(tradingDay, market) {
  const normalizedMarket = normalizeMarket(market);
  const timezone =
    normalizedMarket === "CRYPTO" ? "UTC" : resolveMarketTimezone(market);
  return zonedDateTimeToUtcMs(tradingDay, 23, 59, 59, timezone);
}

function resolveHistoryReceiverType(market) {
  return normalizeMarket(market) === "CRYPTO"
    ? "get-crypto-history"
    : "get-stock-history";
}

function extractRows(rawResponseData) {
  const business = rawResponseData?.data?.data;
  if (Array.isArray(business)) {
    return business;
  }
  return [];
}

function flattenHistoryRows(rows) {
  const flattened = [];
  let hasNested = false;

  for (const row of rows) {
    const respList = row?.respList;
    if (Array.isArray(respList)) {
      hasNested = true;
      for (const item of respList) {
        if (item && typeof item === "object") {
          flattened.push(item);
        }
      }
      continue;
    }

    flattened.push(row);
  }

  return hasNested ? flattened : rows;
}

function parseTimestampToMs(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
      return null;
    }
    const digits = Math.trunc(Math.abs(value)).toString().length;
    if (digits === 10) {
      return value * 1000;
    }
    if (digits === 13) {
      return value;
    }
    return null;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    if (/^[0-9]+$/.test(normalized)) {
      return parseTimestampToMs(Number(normalized));
    }
    const parsed = Date.parse(normalized);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function parseNumber(value) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return Number.NaN;
    }
    return Number(normalized.replace(/,/g, ""));
  }
  return Number.NaN;
}

function normalizeHistoryRows(rows, targetSymbol, tradingDay, market) {
  return rows
    .map((row) => {
      const timestampMs = parseTimestampToMs(row?.timestamp ?? row?.t);
      const price = parseNumber(
        row?.lastPrice ?? row?.closePrice ?? row?.close ?? row?.c,
      );
      const volume = parseNumber(row?.volume ?? row?.v ?? 0);
      const symbol = normalizeSymbol(row?.symbol ?? targetSymbol);

      if (!timestampMs || !Number.isFinite(price)) {
        return null;
      }
      if (symbol && targetSymbol && symbol !== targetSymbol) {
        return null;
      }
      if (!isTimestampInTradingDay(timestampMs, tradingDay, market)) {
        return null;
      }

      return {
        symbol,
        timestamp: new Date(timestampMs).toISOString(),
        price,
        volume: Number.isFinite(volume) ? volume : 0,
      };
    })
    .filter(Boolean)
    .sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp));
}

function buildPointSummary(point, tradingDayStartMs) {
  if (!point) {
    return null;
  }

  const timestampMs = Date.parse(point.timestamp);
  return {
    timestamp: point.timestamp,
    price: Number(point.price),
    volume: Number(point.volume),
    offsetFromTradingDayStartSeconds: Number.isFinite(timestampMs)
      ? Math.floor((timestampMs - tradingDayStartMs) / 1000)
      : null,
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

function extractErrorMessage(response) {
  return String(
    response?.data?.message ||
      response?.data?.error?.message ||
      response?.data?.error?.code ||
      response?.status ||
      "unknown error",
  ).trim();
}

function summarizeErrorResponse(response) {
  return {
    status: Number(response?.status || 0),
    message: extractErrorMessage(response),
    body: response?.data || null,
  };
}

function assertTopLevelSuccess(response, label) {
  assert(response?.ok === true, `${label} HTTP 调用失败`, summarizeErrorResponse(response));
  assert(response?.data?.success === true, `${label} 顶层 success 应为 true`, response?.data);
  assert(
    Number(response?.data?.statusCode || 0) === 200,
    `${label} 顶层 statusCode 应为 200`,
    response?.data,
  );
}

async function postWithRetry(client, pathValue, body, options = {}) {
  const maxAttempts = Math.max(1, Number(options.maxAttempts || 1));
  const retryDelayMs = Math.max(0, Number(options.retryDelayMs || 0));
  const label = String(options.label || pathValue);

  let lastResponse = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await client.post(pathValue, body);
    lastResponse = response;
    if (response?.ok) {
      return response;
    }
    if (!isRateLimitResponse(response) || attempt >= maxAttempts) {
      return response;
    }

    const delayMs = retryDelayMs * attempt;
    console.warn(
      `[retry] ${label} 命中 429，准备第 ${attempt + 1}/${maxAttempts} 次尝试，等待 ${delayMs}ms`,
    );
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return lastResponse;
}

async function main() {
  const rawArgs = parseCliArgs();

  if (parseBoolean(rawArgs.help, false)) {
    printHelp();
    return;
  }

  const client = createEndpointClient(buildClientArgv(rawArgs));

  const symbol = normalizeSymbol(rawArgs.symbol || "AAPL.US");
  const market = normalizeMarket(rawArgs.market || "");
  const tradingDay = String(rawArgs["trading-day"] || "").trim();
  const provider = normalizeProvider(rawArgs.provider || "");
  const pointLimit = parsePositiveInteger(rawArgs["point-limit"], 30000);
  const allowEmptySnapshot = parseBoolean(rawArgs["allow-empty-snapshot"], false);
  const expectLive = parseBoolean(rawArgs["expect-live"], false);
  const strictHistoryMatch = parseBoolean(rawArgs["strict-history-match"], true);
  const requireFirstPointMatchHistory = parseBoolean(
    rawArgs["require-first-point-match-history"],
    true,
  );
  const maxAttempts = parsePositiveInteger(rawArgs["max-attempts"], 4);
  const retryDelayMs = Math.max(0, Number(rawArgs["retry-delay-ms"] || 1500));
  const outputFile = String(rawArgs["output-file"] || "").trim();

  const snapshotBody = {
    symbol,
    ...(market ? { market } : {}),
    ...(tradingDay ? { tradingDay } : {}),
    ...(provider ? { provider } : {}),
    pointLimit,
  };

  const snapshotResponse = await postWithRetry(
    client,
    "/chart/intraday-line/snapshot",
    snapshotBody,
    {
      maxAttempts,
      retryDelayMs,
      label: "snapshot",
    },
  );
  assertTopLevelSuccess(snapshotResponse, "snapshot");

  const payload = snapshotResponse.data?.data || {};
  const line = payload.line || {};
  const metadata = payload.metadata || {};
  const reference = payload.reference || {};
  const sync = payload.sync || {};
  const points = Array.isArray(line.points) ? line.points : [];

  const resolvedMarket = normalizeMarket(line.market || market);
  const resolvedTradingDay = String(line.tradingDay || tradingDay).trim();
  const resolvedProvider = normalizeProvider(metadata.provider || provider);
  const runtimeMode = String(metadata.runtimeMode || "").trim() || null;
  const timezone = resolveMarketTimezone(resolvedMarket);
  const tradingDayStartMs = resolveTradingDayStartUtcMs(
    resolvedTradingDay,
    resolvedMarket,
  );
  const tradingDayEndMs = resolveTradingDayEndUtcMs(
    resolvedTradingDay,
    resolvedMarket,
  );

  assert(resolvedMarket, "snapshot line.market 缺失", line);
  assert(resolvedTradingDay, "snapshot line.tradingDay 缺失", line);
  assert(resolvedProvider, "snapshot metadata.provider 缺失", metadata);
  assert(typeof sync.cursor === "string" && sync.cursor.trim(), "snapshot sync.cursor 缺失", sync);
  assert(
    ["live", "paused", "frozen"].includes(String(runtimeMode)),
    "snapshot metadata.runtimeMode 非法",
    metadata,
  );

  if (expectLive) {
    assert(runtimeMode === "live", "当前不是 live 模式，无法验证首屏实时主路径", {
      runtimeMode,
      market: resolvedMarket,
      tradingDay: resolvedTradingDay,
    });
  }

  points.forEach((point, index) => {
    const timestampMs = Date.parse(String(point?.timestamp || ""));
    assert(
      Number.isFinite(timestampMs),
      `snapshot.points[${index}].timestamp 非法`,
      point,
    );
    assert(
      isTimestampInTradingDay(timestampMs, resolvedTradingDay, resolvedMarket),
      `snapshot.points[${index}] 不在 tradingDay 内`,
      {
        point,
        tradingDay: resolvedTradingDay,
        market: resolvedMarket,
        timezone,
      },
    );
  });

  if (runtimeMode === "live" && !allowEmptySnapshot) {
    assert(points.length > 0, "live snapshot 首屏 points 为空", {
      market: resolvedMarket,
      tradingDay: resolvedTradingDay,
      provider: resolvedProvider,
    });
  }

  const report = {
    endpointGroup: "chart-intraday-snapshot-window",
    baseUrl: client.baseUrl,
    apiPrefix: client.apiPrefix,
    target: {
      symbol,
      market: market || null,
      tradingDay: tradingDay || null,
      provider: provider || null,
      pointLimit,
    },
    snapshot: {
      market: resolvedMarket,
      tradingDay: resolvedTradingDay,
      provider: resolvedProvider,
      runtimeMode,
      timezone,
      referenceStatus: String(reference.status || "").trim() || null,
      historyPoints: Number(metadata.historyPoints || 0),
      realtimeMergedPoints: Number(metadata.realtimeMergedPoints || 0),
      deduplicatedPoints: Number(metadata.deduplicatedPoints || 0),
      pointsCount: points.length,
      firstPoint: buildPointSummary(points[0], tradingDayStartMs),
      lastPoint: buildPointSummary(points[points.length - 1], tradingDayStartMs),
      tradingDayWindow: {
        startUtc: new Date(tradingDayStartMs).toISOString(),
        endUtc: new Date(tradingDayEndMs).toISOString(),
      },
    },
    upstreamHistory: {
      compared: false,
      skipped: null,
    },
    assertions: {
      snapshotPointsWithinTradingDay: true,
    },
    cleanup: {
      attempted: false,
      release: null,
      skipped: null,
    },
  };

  if (runtimeMode !== "live") {
    report.upstreamHistory.skipped =
      `runtimeMode=${runtimeMode}；当前实现非 live 时不会重新回源拉首屏历史基线`;
  } else {
    const historyReceiverType = resolveHistoryReceiverType(resolvedMarket);
    const historyKlineNum = Math.max(1, Math.min(500, Math.ceil(pointLimit / 60)));
    const anchorTimestamp = resolveHistoryAnchorSeconds(
      resolvedTradingDay,
      resolvedMarket,
    );

    const historyRequest = {
      symbols: [symbol],
      receiverType: historyReceiverType,
      options: {
        preferredProvider: resolvedProvider,
        market: resolvedMarket,
        klineNum: historyKlineNum,
        timestamp: anchorTimestamp,
        useSmartCache: false,
      },
    };

    const historyResponse = await postWithRetry(
      client,
      "/receiver/data",
      historyRequest,
      {
        maxAttempts,
        retryDelayMs,
        label: historyReceiverType,
      },
    );
    assertTopLevelSuccess(historyResponse, historyReceiverType);

    const historyRows = normalizeHistoryRows(
      flattenHistoryRows(extractRows(historyResponse.data)),
      symbol,
      resolvedTradingDay,
      resolvedMarket,
    );

    const snapshotHistoryPoints = Number(metadata.historyPoints || 0);
    const snapshotRealtimeMergedPoints = Number(metadata.realtimeMergedPoints || 0);
    const snapshotDeduplicatedPoints = Number(metadata.deduplicatedPoints || 0);
    const expectedMergedCount =
      snapshotHistoryPoints + snapshotRealtimeMergedPoints - snapshotDeduplicatedPoints;

    report.upstreamHistory = {
      compared: true,
      skipped: null,
      receiverType: historyReceiverType,
      klineNum: historyKlineNum,
      anchorTimestamp,
      anchorIso: toIsoFromSeconds(anchorTimestamp),
      filteredRowsCount: historyRows.length,
      firstRow: buildPointSummary(historyRows[0], tradingDayStartMs),
      lastRow: buildPointSummary(historyRows[historyRows.length - 1], tradingDayStartMs),
      firstRowMatchesSnapshotFirstPoint:
        historyRows.length > 0 && points.length > 0
          ? historyRows[0].timestamp === points[0].timestamp
          : null,
    };

    if (strictHistoryMatch) {
      assert(
        snapshotHistoryPoints === historyRows.length,
        "snapshot metadata.historyPoints 与上游同日分钟历史数不一致",
        {
          snapshotHistoryPoints,
          upstreamHistoryRows: historyRows.length,
          market: resolvedMarket,
          tradingDay: resolvedTradingDay,
          provider: resolvedProvider,
        },
      );
      report.assertions.historyPointsMatchUpstream = true;
    }

    if (expectedMergedCount <= pointLimit) {
      assert(
        points.length === expectedMergedCount,
        "snapshot pointsCount 与 history/realtime/dedup 计算结果不一致",
        {
          pointsCount: points.length,
          expectedMergedCount,
          historyPoints: snapshotHistoryPoints,
          realtimeMergedPoints: snapshotRealtimeMergedPoints,
          deduplicatedPoints: snapshotDeduplicatedPoints,
          pointLimit,
        },
      );
      report.assertions.pointsCountMatchesMergedWindow = true;
    } else {
      assert(
        points.length === pointLimit,
        "snapshot pointsCount 应被 pointLimit 截断",
        {
          pointsCount: points.length,
          expectedPointLimit: pointLimit,
          expectedMergedCount,
        },
      );
      report.assertions.pointsCountTrimmedByPointLimit = true;
    }

    if (
      requireFirstPointMatchHistory &&
      snapshotHistoryPoints > 0 &&
      historyRows.length > 0 &&
      points.length > 0
    ) {
      assert(
        points[0].timestamp === historyRows[0].timestamp,
        "snapshot 首点与上游同日历史基线首点不一致",
        {
          snapshotFirstPoint: points[0],
          upstreamFirstRow: historyRows[0],
          market: resolvedMarket,
          tradingDay: resolvedTradingDay,
          provider: resolvedProvider,
        },
      );
      report.assertions.firstPointMatchesHistoryStart = true;
    }
  }

  const releaseBody = {
    symbol,
    market: resolvedMarket,
    provider: resolvedProvider,
  };
  report.cleanup.attempted = true;
  const releaseResponse = await postWithRetry(
    client,
    "/chart/intraday-line/release",
    releaseBody,
    {
      maxAttempts,
      retryDelayMs,
      label: "release",
    },
  );
  assertTopLevelSuccess(releaseResponse, "release");
  const releasePayload = releaseResponse.data?.data?.release || {};
  report.cleanup.release = {
    leaseReleased: Boolean(releasePayload.leaseReleased),
    upstreamReleased: Boolean(releasePayload.upstreamReleased),
    reason: String(releasePayload.reason || "").trim() || null,
    provider: String(releasePayload.provider || "").trim() || null,
    activeLeaseCount: Number(releasePayload.activeLeaseCount || 0),
    graceExpiresAt: releasePayload.graceExpiresAt || null,
  };

  if (outputFile) {
    const outputPath = path.resolve(outputFile);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  console.log("[PASS] chart intraday snapshot window");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error("[FAIL] chart intraday snapshot window");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
