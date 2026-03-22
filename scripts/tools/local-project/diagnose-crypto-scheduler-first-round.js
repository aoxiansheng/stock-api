#!/usr/bin/env node
/* eslint-disable no-console */
const { parseCliArgs, parseBoolean } = require("./project-api-client");

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
  const startedAt = Date.now();
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
      startedAt,
      finishedAt: Date.now(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildRequestPlan(config) {
  const commonOptions = {
    preferredProvider: "infoway",
    market: "CRYPTO",
    useSmartCache: false,
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
        symbols: ["BTCUSDT", "ETHUSDT", "DOGEUSDT"],
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
        symbols: ["BTCUSDT"],
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
        symbols: ["ETHUSDT"],
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
        symbols: ["DOGEUSDT"],
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

async function runTrial(config, trialIndex) {
  const plan = buildRequestPlan(config);
  const trialStartedAt = Date.now();

  const settled = await Promise.all(
    plan.map(async (request) => {
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
        startedOffsetMs: response.startedAt - trialStartedAt,
        finishedOffsetMs: response.finishedAt - trialStartedAt,
        durationMs: response.finishedAt - response.startedAt,
        failure: response.ok ? null : normalizeFailure(response),
      };
    }),
  );

  const byFinishOrder = [...settled].sort(
    (left, right) => left.finishedOffsetMs - right.finishedOffsetMs,
  );

  return {
    trial: trialIndex + 1,
    startedAt: new Date(trialStartedAt).toISOString(),
    success: settled.every((item) => item.ok),
    failures: settled.filter((item) => !item.ok),
    results: settled,
    completionOrder: byFinishOrder.map((item, index) => ({
      finishRank: index + 1,
      label: item.label,
      ok: item.ok,
      status: item.status,
      finishedOffsetMs: item.finishedOffsetMs,
      durationMs: item.durationMs,
    })),
  };
}

async function main() {
  const args = parseCliArgs();
  const trials = Math.max(1, Number(args.trials || 6));
  const intervalMs = Math.max(0, Number(args["interval-ms"] || 8000));
  const timeoutMs = Math.max(1000, Number(args["timeout-ms"] || 15000));
  const klineNum = Math.max(1, Number(args["kline-num"] || 5));
  const rawOnlyFailures = parseBoolean(args["only-failures"], false);

  const config = {
    baseUrl: String(args["base-url"] || "http://127.0.0.1:3001").replace(/\/$/, ""),
    apiPrefix: String(args["api-prefix"] || "/api/v1"),
    appKey: args["app-key"],
    accessToken: args["access-token"],
    secondaryAppKey: args["secondary-app-key"],
    secondaryAccessToken: args["secondary-access-token"],
    timeoutMs,
    klineNum,
  };

  const reports = [];
  for (let index = 0; index < trials; index += 1) {
    const report = await runTrial(config, index);
    reports.push(report);
    if (index < trials - 1 && intervalMs > 0) {
      await sleep(intervalMs);
    }
  }

  const failures = reports.filter((item) => !item.success);
  console.log("[PASS] diagnose crypto scheduler first round");
  console.log(
    JSON.stringify(
      {
        trials,
        intervalMs,
        failures: failures.length,
        reports: rawOnlyFailures ? failures : reports,
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
