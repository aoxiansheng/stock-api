#!/usr/bin/env node
/* eslint-disable no-console */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parsePositiveInteger(value, fallback, min = 1) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) {
    return fallback;
  }
  return parsed;
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function normalizeSymbols(symbols) {
  return Array.from(
    new Set(
      (Array.isArray(symbols) ? symbols : [])
        .map((item) => String(item || "").trim().toUpperCase())
        .filter(Boolean),
    ),
  );
}

function percentile(sortedValues, ratio) {
  if (!Array.isArray(sortedValues) || sortedValues.length === 0) {
    return 0;
  }
  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil(sortedValues.length * ratio) - 1),
  );
  return sortedValues[index];
}

function buildLatencySummary(latencies) {
  const values = Array.isArray(latencies)
    ? latencies.filter((value) => Number.isFinite(value)).sort((a, b) => a - b)
    : [];

  if (values.length === 0) {
    return {
      min: 0,
      avg: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      max: 0,
    };
  }

  const sum = values.reduce((accumulator, value) => accumulator + value, 0);
  return {
    min: values[0],
    avg: Number((sum / values.length).toFixed(2)),
    p50: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    p99: percentile(values, 0.99),
    max: values[values.length - 1],
  };
}

function buildRequestSymbols(options) {
  const symbols = normalizeSymbols(options.symbols);
  if (symbols.length === 0) {
    return [];
  }

  const strategy = String(options.strategy || "fixed").trim().toLowerCase();
  const requestSymbolCount = Math.max(
    1,
    parsePositiveInteger(options.requestSymbolCount, strategy === "fixed" ? symbols.length : 1),
  );

  if (strategy === "round-robin") {
    const index = Number(options.requestIndex || 0) % symbols.length;
    return [symbols[index]];
  }

  if (strategy === "window") {
    const result = [];
    const start = Number(options.requestIndex || 0) % symbols.length;
    for (let offset = 0; offset < Math.min(requestSymbolCount, symbols.length); offset += 1) {
      result.push(symbols[(start + offset) % symbols.length]);
    }
    return result;
  }

  return symbols.slice(0, Math.min(requestSymbolCount, symbols.length));
}

function buildVirtualUserProfiles(options) {
  const symbols = normalizeSymbols(options.symbols);
  if (symbols.length === 0) {
    return [];
  }

  const userCount = parsePositiveInteger(options.userCount, symbols.length);
  const sharedSymbolCount = Math.max(
    0,
    Math.min(symbols.length, Math.floor(parseNumber(options.sharedSymbolCount, 1))),
  );
  const sharedUserRatio = clampNumber(options.sharedUserRatio, 0, 1, 0.5);
  const perUserUniqueCount = Math.max(1, parsePositiveInteger(options.perUserUniqueCount, 1));

  const sharedPool = symbols.slice(0, sharedSymbolCount);
  const uniquePoolBase = symbols.slice(sharedSymbolCount);
  const uniquePool = uniquePoolBase.length > 0 ? uniquePoolBase : symbols;
  const sharedUserCount = Math.min(userCount, Math.max(0, Math.round(userCount * sharedUserRatio)));

  return Array.from({ length: userCount }, (_, userIndex) => {
    const profileSymbols = [];

    if (sharedPool.length > 0 && userIndex < sharedUserCount) {
      profileSymbols.push(sharedPool[userIndex % sharedPool.length]);
    }

    for (let offset = 0; offset < perUserUniqueCount; offset += 1) {
      const uniqueIndex = (userIndex * perUserUniqueCount + offset) % uniquePool.length;
      profileSymbols.push(uniquePool[uniqueIndex]);
    }

    const normalizedProfile = Array.from(new Set(profileSymbols)).filter(Boolean);
    return {
      userId: `user-${String(userIndex + 1).padStart(3, "0")}`,
      symbols: normalizedProfile.length > 0 ? normalizedProfile : [symbols[userIndex % symbols.length]],
    };
  });
}

function buildUserFanout(users) {
  const fanout = new Map();
  for (const user of Array.isArray(users) ? users : []) {
    for (const symbol of normalizeSymbols(user.symbols)) {
      fanout.set(symbol, (fanout.get(symbol) || 0) + 1);
    }
  }
  return Array.from(fanout.entries())
    .map(([symbol, usersCount]) => ({ symbol, usersCount }))
    .sort((left, right) => right.usersCount - left.usersCount || left.symbol.localeCompare(right.symbol));
}

async function runConcurrentPressure(options) {
  const totalRequests = parsePositiveInteger(options.totalRequests, 1);
  const concurrency = parsePositiveInteger(options.concurrency, 1);
  const staggerMs = Math.max(0, parseNumber(options.staggerMs, 0));
  const globalIntervalMs = Math.max(0, parseNumber(options.globalIntervalMs, 0));
  const onRequest = options.onRequest;
  if (typeof onRequest !== "function") {
    throw new Error("onRequest 必须是函数");
  }

  let nextIndex = 0;
  let nextGlobalDispatchAt = 0;
  let dispatchGate = Promise.resolve();
  const results = [];
  const startedAt = Date.now();

  async function waitForGlobalDispatchWindow() {
    if (globalIntervalMs <= 0) {
      return;
    }

    const gate = dispatchGate.then(async () => {
      const now = Date.now();
      const target = Math.max(now, nextGlobalDispatchAt);
      const waitMs = Math.max(0, target - now);
      if (waitMs > 0) {
        await sleep(waitMs);
      }
      nextGlobalDispatchAt = target + globalIntervalMs;
    });

    dispatchGate = gate.catch(() => undefined);
    await gate;
  }

  async function worker(workerId) {
    while (true) {
      const requestIndex = nextIndex;
      nextIndex += 1;
      if (requestIndex >= totalRequests) {
        return;
      }

      if (staggerMs > 0) {
        await sleep(staggerMs);
      }

      await waitForGlobalDispatchWindow();

      const requestStartedAt = Date.now();
      try {
        const response = await onRequest({ requestIndex, workerId });
        const durationMs = Date.now() - requestStartedAt;
        results.push({
          ok: !!response?.ok,
          status: Number.isFinite(Number(response?.status)) ? Number(response.status) : 0,
          durationMs,
          requestIndex,
          workerId,
          errorMessage: response?.errorMessage ? String(response.errorMessage) : "",
          details: response?.details,
          metadata: response?.metadata || null,
        });
      } catch (error) {
        const durationMs = Date.now() - requestStartedAt;
        results.push({
          ok: false,
          status: 0,
          durationMs,
          requestIndex,
          workerId,
          errorMessage: (error && error.message) || String(error),
          details: null,
          metadata: null,
        });
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, (_, workerId) => worker(workerId)));

  const finishedAt = Date.now();
  return {
    startedAt,
    finishedAt,
    totalDurationMs: finishedAt - startedAt,
    results,
  };
}

function summarizePressureRun(run, options = {}) {
  const sampleFailureLimit = Math.max(1, parsePositiveInteger(options.sampleFailureLimit, 5));
  const results = Array.isArray(run?.results) ? run.results : [];
  const successCount = results.filter((item) => item.ok).length;
  const failureCount = results.length - successCount;
  const statusCounts = {};

  results.forEach((item) => {
    const key = String(item.status || 0);
    statusCounts[key] = (statusCounts[key] || 0) + 1;
  });

  const latencies = results.map((item) => item.durationMs);
  const failures = results
    .filter((item) => !item.ok)
    .slice(0, sampleFailureLimit)
    .map((item) => ({
      requestIndex: item.requestIndex,
      workerId: item.workerId,
      status: item.status,
      errorMessage: item.errorMessage,
      metadata: item.metadata,
    }));

  const totalDurationMs = Math.max(1, Number(run?.totalDurationMs || 1));
  const totalRequests = results.length;

  return {
    totalRequests,
    successCount,
    failureCount,
    successRate: Number((successCount / Math.max(1, totalRequests)).toFixed(4)),
    totalDurationMs,
    achievedRps: Number(((totalRequests * 1000) / totalDurationMs).toFixed(2)),
    latencyMs: buildLatencySummary(latencies),
    statusCounts,
    sampleFailures: failures,
  };
}

function assertMinSuccessRate(summary, minSuccessRate) {
  const target = Number.isFinite(Number(minSuccessRate)) ? Number(minSuccessRate) : 1;
  if (summary.successRate < target) {
    throw new Error(`成功率未达标: actual=${summary.successRate}, expected>=${target}`);
  }
}

module.exports = {
  assertMinSuccessRate,
  buildRequestSymbols,
  buildUserFanout,
  buildVirtualUserProfiles,
  normalizeSymbols,
  parsePositiveInteger,
  runConcurrentPressure,
  sleep,
  summarizePressureRun,
};
