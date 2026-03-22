#!/usr/bin/env node
/* eslint-disable no-console */
const {
  parseCliArgs,
  parseBoolean,
  parseSymbols,
} = require("./project-api-client");

function printHelp() {
  console.log(`用法:
node "scripts/tools/local-project/repro-crypto-mixed-scheduler-429.js" \\
  --app-key "<APP_KEY>" \\
  --access-token "<ACCESS_TOKEN>" \\
  --secondary-app-key "<SECONDARY_APP_KEY>" \\
  --secondary-access-token "<SECONDARY_ACCESS_TOKEN>" \\
  --rounds 4 \\
  --use-smart-cache false

参数:
  --base-url                   默认 http://127.0.0.1:3001
  --api-prefix                 默认 /api/v1
  --provider                   默认 infoway
  --quote-symbols              默认 BTCUSDT,ETHUSDT,DOGEUSDT
  --history-symbols            默认 BTCUSDT,ETHUSDT,DOGEUSDT
  --kline-num                  默认 5
  --rounds                     默认 4
  --round-interval-ms          默认 6000
  --timeout-ms                 默认 15000
  --use-smart-cache            默认 false
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildAuthHeaders(appKey, accessToken) {
  const normalizedAppKey = String(appKey || "").trim();
  const normalizedAccessToken = String(accessToken || "").trim();
  assert(normalizedAppKey && normalizedAccessToken, "缺少认证参数", {
    hasAppKey: Boolean(normalizedAppKey),
    hasAccessToken: Boolean(normalizedAccessToken),
  });
  return {
    "X-App-Key": normalizedAppKey,
    "X-Access-Token": normalizedAccessToken,
  };
}

async function postJson(config, authHeaders, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.baseUrl}${config.apiPrefix}/receiver/data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildRoundRequests(config) {
  const commonOptions = {
    preferredProvider: config.provider,
    market: "CRYPTO",
    useSmartCache: config.useSmartCache,
  };

  const primaryAuth = buildAuthHeaders(config.appKey, config.accessToken);
  const secondaryAuth = buildAuthHeaders(
    config.secondaryAppKey,
    config.secondaryAccessToken,
  );

  return [
    {
      label: "quote:BTCUSDT,ETHUSDT,DOGEUSDT",
      authHeaders: primaryAuth,
      body: {
        symbols: config.quoteSymbols,
        receiverType: "get-crypto-quote",
        options: {
          ...commonOptions,
          realtime: true,
        },
      },
    },
    {
      label: "history:BTCUSDT",
      authHeaders: primaryAuth,
      body: {
        symbols: [config.historySymbols[0]],
        receiverType: "get-crypto-history",
        options: {
          ...commonOptions,
          klineNum: config.klineNum,
        },
      },
    },
    {
      label: "history:ETHUSDT",
      authHeaders: secondaryAuth,
      body: {
        symbols: [config.historySymbols[1]],
        receiverType: "get-crypto-history",
        options: {
          ...commonOptions,
          klineNum: config.klineNum,
        },
      },
    },
    {
      label: "history:DOGEUSDT",
      authHeaders: primaryAuth,
      body: {
        symbols: [config.historySymbols[2]],
        receiverType: "get-crypto-history",
        options: {
          ...commonOptions,
          klineNum: config.klineNum,
        },
      },
    },
  ];
}

function normalizeFailure(response) {
  const body = response?.data || {};
  const error = body?.error || {};
  const details = error?.details || {};
  return {
    status: response?.status || 0,
    code: error?.code || null,
    message: body?.message || null,
    capability: details?.context?.capability || null,
    provider: details?.context?.provider || null,
    upstreamStatus: details?.context?.upstreamStatus || null,
    timestamp: body?.timestamp || null,
    requestId: details?.requestId || null,
  };
}

async function runRound(config, roundIndex) {
  const requests = buildRoundRequests(config);
  const startedAt = new Date().toISOString();

  const settled = await Promise.all(
    requests.map(async (request) => {
      const response = await postJson(config, request.authHeaders, request.body);
      const business = response?.data?.data || {};
      const metadata = business?.metadata || {};
      const rows = Array.isArray(business?.data) ? business.data : [];

      return {
        label: request.label,
        ok: response.ok,
        status: response.status,
        provider: metadata.provider || null,
        returnedCount: rows.length,
        failure: response.ok ? null : normalizeFailure(response),
      };
    }),
  );

  const failures = settled.filter((item) => !item.ok);
  return {
    round: roundIndex + 1,
    startedAt,
    path: config.useSmartCache ? "smart-cache + scheduler" : "scheduler-only (bypass cache)",
    success: failures.length === 0,
    failures,
    results: settled,
  };
}

function summarizeRounds(rounds) {
  const summary = {
    totalRounds: rounds.length,
    successfulRounds: 0,
    failedRounds: 0,
    totalRequests: 0,
    failedRequests: 0,
    failuresByLabel: {},
    failuresByCapability: {},
  };

  for (const round of rounds) {
    summary.totalRequests += round.results.length;
    if (round.success) {
      summary.successfulRounds += 1;
    } else {
      summary.failedRounds += 1;
    }

    for (const failure of round.failures) {
      summary.failedRequests += 1;
      summary.failuresByLabel[failure.label] =
        (summary.failuresByLabel[failure.label] || 0) + 1;
      const capability = failure.failure?.capability || "unknown";
      summary.failuresByCapability[capability] =
        (summary.failuresByCapability[capability] || 0) + 1;
    }
  }

  return summary;
}

async function main() {
  const args = parseCliArgs();
  if (parseBoolean(args.help, false)) {
    printHelp();
    return;
  }

  const quoteSymbols = parseSymbols(args["quote-symbols"], "BTCUSDT,ETHUSDT,DOGEUSDT");
  const historySymbols = parseSymbols(
    args["history-symbols"],
    "BTCUSDT,ETHUSDT,DOGEUSDT",
  );
  assert(quoteSymbols.length === 3, "quote-symbols 必须恰好包含 3 个 symbol", {
    quoteSymbols,
  });
  assert(historySymbols.length === 3, "history-symbols 必须恰好包含 3 个 symbol", {
    historySymbols,
  });

  const config = {
    baseUrl: String(args["base-url"] || "http://127.0.0.1:3001").replace(/\/$/, ""),
    apiPrefix: String(args["api-prefix"] || "/api/v1"),
    timeoutMs: Math.max(1000, Number(args["timeout-ms"] || 15000)),
    provider: String(args.provider || "infoway").trim().toLowerCase(),
    appKey: args["app-key"],
    accessToken: args["access-token"],
    secondaryAppKey: args["secondary-app-key"],
    secondaryAccessToken: args["secondary-access-token"],
    quoteSymbols,
    historySymbols,
    klineNum: Math.max(1, Number(args["kline-num"] || 5)),
    rounds: Math.max(1, Number(args.rounds || 4)),
    roundIntervalMs: Math.max(0, Number(args["round-interval-ms"] || 6000)),
    useSmartCache: parseBoolean(args["use-smart-cache"], false),
  };

  const rounds = [];
  for (let index = 0; index < config.rounds; index += 1) {
    rounds.push(await runRound(config, index));
    if (index < config.rounds - 1 && config.roundIntervalMs > 0) {
      await sleep(config.roundIntervalMs);
    }
  }

  console.log("[PASS] crypto mixed scheduler repro");
  console.log(
    JSON.stringify(
      {
        provider: config.provider,
        path: config.useSmartCache ? "smart-cache + scheduler" : "scheduler-only (bypass cache)",
        quoteSymbols: config.quoteSymbols,
        historySymbols: config.historySymbols,
        rounds,
        summary: summarizeRounds(rounds),
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
