#!/usr/bin/env node
/* eslint-disable no-console */
const { io } = require("socket.io-client");
const { parseCliArgs, parseSymbols, parseBoolean } = require("./project-api-client");
const { parsePositiveInteger, sleep } = require("./pressure-test-helpers");

function printHelp() {
  console.log(`用法:
node "scripts/tools/local-project/stress-ws-subscription-clients.js" \\
  --app-key "<APP_KEY>" \\
  --access-token "<ACCESS_TOKEN>" \\
  --symbols "00700.HK" \\
  --client-count 50 \\
  --provider infoway

参数:
  --base-url                 默认 http://127.0.0.1:3001
  --ws-path                  默认 /api/v1/stream-receiver/connect
  --symbols                  标的池，逗号分隔
  --symbol-strategy          fixed | round-robin，默认 fixed
  --provider                 默认 infoway
  --client-count             默认 20
  --hold-ms                  建立订阅后维持多久，默认 3000
  --connect-stagger-ms       每个客户端的连接间隔，默认 20
  --ack-timeout-ms           默认 15000
  --wait-data-ms             是否等待 data 事件，默认 0（不等待）
`);
}

function buildSocketAuth(args) {
  const appKey = String(args["app-key"] || "").trim();
  const accessToken = String(args["access-token"] || "").trim();
  if (!appKey || !accessToken) {
    throw new Error("缺少认证参数：请提供 --app-key 与 --access-token");
  }
  return { appKey, accessToken };
}

function resolveSymbols(symbols, strategy, clientIndex) {
  if (symbols.length === 0) {
    return [];
  }
  if (strategy === "round-robin") {
    return [symbols[clientIndex % symbols.length]];
  }
  return [symbols[0]];
}

async function main() {
  const args = parseCliArgs();
  if (parseBoolean(args.help, false)) {
    printHelp();
    return;
  }

  const baseUrl = String(args["base-url"] || "http://127.0.0.1:3001").replace(/\/$/, "");
  const wsPath = String(args["ws-path"] || "/api/v1/stream-receiver/connect");
  const provider = String(args.provider || "infoway").trim().toLowerCase();
  const symbols = parseSymbols(args.symbols, "00700.HK");
  const symbolStrategy = String(args["symbol-strategy"] || "fixed").trim().toLowerCase();
  const clientCount = parsePositiveInteger(args["client-count"], 20);
  const holdMs = Math.max(0, Number(args["hold-ms"] || 3000));
  const connectStaggerMs = Math.max(0, Number(args["connect-stagger-ms"] || 20));
  const ackTimeoutMs = parsePositiveInteger(args["ack-timeout-ms"], 15000);
  const waitDataMs = Math.max(0, Number(args["wait-data-ms"] || 0));
  const auth = buildSocketAuth(args);

  if (symbols.length === 0) {
    throw new Error("symbols 不能为空");
  }

  const clients = [];
  const results = [];
  const suiteStartedAt = Date.now();

  async function createClient(clientIndex) {
    return await new Promise((resolve) => {
      const requestSymbols = resolveSymbols(symbols, symbolStrategy, clientIndex);
      const startedAt = Date.now();
      const socket = io(baseUrl, {
        path: wsPath,
        transports: ["websocket"],
        timeout: ackTimeoutMs,
        reconnection: false,
        auth,
      });

      const state = {
        clientIndex,
        symbols: requestSymbols,
        connectLatencyMs: 0,
        subscribeLatencyMs: 0,
        acked: false,
        connected: false,
        dataCount: 0,
        failure: "",
        socket,
      };

      const timer = setTimeout(() => {
        state.failure = `client-${clientIndex} ack timeout`;
        socket.close();
        resolve(state);
      }, ackTimeoutMs);

      socket.on("connect", () => {
        state.connected = true;
        state.connectLatencyMs = Date.now() - startedAt;
        socket.emit("subscribe", {
          symbols: requestSymbols,
          wsCapabilityType: "stream-stock-quote",
          preferredProvider: provider,
        });
      });

      socket.on("subscribe-ack", async () => {
        state.acked = true;
        state.subscribeLatencyMs = Date.now() - startedAt;
        clearTimeout(timer);
        if (waitDataMs > 0) {
          await sleep(waitDataMs);
        }
        resolve(state);
      });

      socket.on("data", () => {
        state.dataCount += 1;
      });

      socket.on("subscribe-error", (error) => {
        clearTimeout(timer);
        state.failure = `subscribe-error: ${JSON.stringify(error)}`;
        socket.close();
        resolve(state);
      });

      socket.on("connect_error", (error) => {
        clearTimeout(timer);
        state.failure = `connect-error: ${error?.message || String(error)}`;
        socket.close();
        resolve(state);
      });
    });
  }

  for (let index = 0; index < clientCount; index += 1) {
    const clientResult = await createClient(index);
    clients.push(clientResult);
    results.push(clientResult);
    if (connectStaggerMs > 0) {
      await sleep(connectStaggerMs);
    }
  }

  if (holdMs > 0) {
    await sleep(holdMs);
  }

  clients.forEach((client) => {
    try {
      client.socket?.close();
    } catch {
      // noop
    }
  });

  const suiteDurationMs = Date.now() - suiteStartedAt;
  const successClients = results.filter((item) => item.acked && !item.failure).length;
  const failedClients = results.length - successClients;
  const connectLatencies = results
    .map((item) => item.connectLatencyMs)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);
  const subscribeLatencies = results
    .map((item) => item.subscribeLatencyMs)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);

  function pick(values, ratio) {
    if (values.length === 0) {
      return 0;
    }
    const index = Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * ratio) - 1));
    return values[index];
  }

  const summary = {
    baseUrl,
    wsPath,
    provider,
    symbols,
    symbolStrategy,
    clientCount,
    successClients,
    failedClients,
    successRate: Number((successClients / Math.max(1, results.length)).toFixed(4)),
    totalDataEvents: results.reduce((sum, item) => sum + item.dataCount, 0),
    suiteDurationMs,
    connectLatencyMs: {
      p50: pick(connectLatencies, 0.5),
      p95: pick(connectLatencies, 0.95),
      max: connectLatencies[connectLatencies.length - 1] || 0,
    },
    subscribeLatencyMs: {
      p50: pick(subscribeLatencies, 0.5),
      p95: pick(subscribeLatencies, 0.95),
      max: subscribeLatencies[subscribeLatencies.length - 1] || 0,
    },
    sampleFailures: results
      .filter((item) => item.failure)
      .slice(0, 5)
      .map((item) => ({
        clientIndex: item.clientIndex,
        symbols: item.symbols,
        failure: item.failure,
      })),
  };

  if (failedClients > 0) {
    console.error("[FAIL] stress ws subscription clients");
    console.error(JSON.stringify(summary, null, 2));
    process.exit(1);
  }

  console.log("[PASS] stress ws subscription clients");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("[FAIL]", error?.message || String(error));
  process.exit(1);
});
