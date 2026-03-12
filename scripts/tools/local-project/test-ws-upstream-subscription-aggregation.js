#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * 多客户端真实 WebSocket 上游订阅聚合验收脚本
 *
 * 目标：
 * 1. 启动本地项目服务（可关闭）
 * 2. 使用多个客户端订阅同一 symbol
 * 3. 通过服务日志验证：
 *    - 多客户端共享同一上游订阅（上游订阅日志仅 1 次）
 *    - 非最后订阅者退订时不上游退订
 *    - 最后一个订阅者退订后，grace period 到期才上游退订
 *
 * 关键环境变量：
 * - BASE_URL: 服务地址，默认 http://127.0.0.1:3011
 * - PORT: 启动子进程时使用的端口，默认 3011
 * - START_APP: 1/true 表示脚本内启动应用，默认 true
 * - APP_START_CMD: 默认 bun run dev
 * - APP_KEY / ACCESS_TOKEN: API Key 认证对（必填）
 * - PROVIDER: infoway | jvquant | longport，默认 infoway
 * - SYMBOL: 默认 00700.HK
 * - CLIENT_COUNT: 默认 5
 * - SUBSCRIBE_SETTLE_MS: 订阅后等待日志稳定时间，默认 1500
 * - UNSUBSCRIBE_GRACE_MS: 启动应用时注入的 grace，默认 1200
 * - POST_LAST_UNSUB_WAIT_MS: 最后一个退订后等待时间，默认 1800
 * - LOG_STDOUT: 1/true 时透传应用日志
 *
 * 说明：
 * - LongPort 在缺少上游凭证时预期失败，可用于验证“环境阻塞”而非逻辑回归。
 * - JvQuant 若上游 server allocate 失败，将标记为 ENV_BLOCKED。
 */

const { spawn } = require("child_process");
const { io } = require("socket.io-client");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../..");
const START_APP = ["1", "true", "yes", "on", ""].includes(
  String(process.env.START_APP ?? "true").toLowerCase(),
);
const PORT = Number(process.env.PORT || 3011);
const BASE_URL = process.env.BASE_URL || `http://127.0.0.1:${PORT}`;
const WS_PATH = process.env.WS_PATH || "/api/v1/stream-receiver/connect";
const APP_START_CMD = process.env.APP_START_CMD || "bun run dev";
const APP_KEY = process.env.APP_KEY || "";
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || "";
const PROVIDER = String(process.env.PROVIDER || "infoway").trim();
const SYMBOL = String(process.env.SYMBOL || "00700.HK").trim();
const CLIENT_COUNT = Number(process.env.CLIENT_COUNT || 5);
const SUBSCRIBE_SETTLE_MS = Number(process.env.SUBSCRIBE_SETTLE_MS || 1500);
const UNSUBSCRIBE_GRACE_MS = Number(process.env.UNSUBSCRIBE_GRACE_MS || 1200);
const POST_LAST_UNSUB_WAIT_MS = Number(process.env.POST_LAST_UNSUB_WAIT_MS || 1800);
const READY_TIMEOUT_MS = Number(process.env.READY_TIMEOUT_MS || 120000);
const ACK_TIMEOUT_MS = Number(process.env.ACK_TIMEOUT_MS || 15000);
const LOG_STDOUT = ["1", "true", "yes", "on"].includes(
  String(process.env.LOG_STDOUT || "").toLowerCase(),
);

if (!APP_KEY || !ACCESS_TOKEN) {
  console.error("[FAIL] 缺少 APP_KEY 或 ACCESS_TOKEN");
  process.exit(1);
}

if (!Number.isFinite(CLIENT_COUNT) || CLIENT_COUNT < 2) {
  console.error("[FAIL] CLIENT_COUNT 必须 >= 2");
  process.exit(1);
}

const providerRules = {
  infoway: {
    expectedEnvironment: "supported",
    envBlockedPatterns: [],
  },
  jvquant: {
    expectedEnvironment: "conditional",
    envBlockedPatterns: [
      /JvQuant 分配服务器失败/i,
      /JVQUANT_TOKEN 未配置/i,
      /JvQuant WebSocket 未连接/i,
    ],
  },
  longport: {
    expectedEnvironment: "expected_fail_without_credentials",
    envBlockedPatterns: [
      /LongPort/i,
      /credential/i,
      /token/i,
      /auth/i,
      /未配置/i,
    ],
  },
};

const rule = providerRules[PROVIDER] || providerRules.infoway;

const state = {
  appLogs: "",
  upstreamSubscribeCount: 0,
  upstreamUnsubscribeCount: 0,
  providerSubscribeCount: 0,
  providerUnsubscribeCount: 0,
  subscribeErrors: [],
  connectErrors: [],
  subscribeAcks: 0,
  ready: false,
};

let appProcess = null;
const sockets = [];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shellSplit(command) {
  const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  return parts.map((part) => part.replace(/^"|"$/g, ""));
}

function recordLogChunk(chunk) {
  const text = chunk.toString();
  state.appLogs += text;
  if (LOG_STDOUT) {
    process.stdout.write(text);
  }

  const subscribeMatches = text.match(/符号数据流订阅成功/g);
  if (subscribeMatches) state.upstreamSubscribeCount += subscribeMatches.length;

  const unsubscribeMatches = text.match(/符号数据流取消订阅成功/g);
  if (unsubscribeMatches) state.upstreamUnsubscribeCount += unsubscribeMatches.length;

  if (PROVIDER === "infoway") {
    const providerSub = text.match(/Infoway WebSocket 订阅发送成功/g);
    if (providerSub) state.providerSubscribeCount += providerSub.length;
    const providerUnsub = text.match(/code":11000|"code":11000|11000/g);
    if (providerUnsub) state.providerUnsubscribeCount += providerUnsub.length;
  }

  if (PROVIDER === "jvquant") {
    const providerSub = text.match(/JvQuant 发送订阅命令[\s\S]*?command["': ]+add/g);
    if (providerSub) state.providerSubscribeCount += providerSub.length;
    const providerUnsub = text.match(/JvQuant 发送订阅命令[\s\S]*?command["': ]+del/g);
    if (providerUnsub) state.providerUnsubscribeCount += providerUnsub.length;
  }

  if (PROVIDER === "longport") {
    const providerSub = text.match(/LongPort WebSocket.*订阅成功/g);
    if (providerSub) state.providerSubscribeCount += providerSub.length;
    const providerUnsub = text.match(/LongPort WebSocket 取消订阅成功/g);
    if (providerUnsub) state.providerUnsubscribeCount += providerUnsub.length;
  }

  if (!state.ready && /智能股票数据系统启动成功|服务地址: http:\/\/localhost:/i.test(text)) {
    state.ready = true;
  }
}

async function startAppIfNeeded() {
  if (!START_APP) {
    return;
  }

  const parts = shellSplit(APP_START_CMD);
  const cmd = parts[0];
  const args = parts.slice(1);
  const env = {
    ...process.env,
    PORT: String(PORT),
    UPSTREAM_SUBSCRIPTION_UNSUBSCRIBE_GRACE_MS: String(UNSUBSCRIBE_GRACE_MS),
  };

  appProcess = spawn(cmd, args, {
    cwd: ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });

  appProcess.stdout.on("data", recordLogChunk);
  appProcess.stderr.on("data", recordLogChunk);

  appProcess.on("exit", (code, signal) => {
    if (!state.ready) {
      console.error("[FAIL] 本地服务在 ready 前退出", { code, signal });
    }
  });

  const startAt = Date.now();
  while (!state.ready) {
    if (Date.now() - startAt > READY_TIMEOUT_MS) {
      throw new Error(`等待应用启动超时: ${READY_TIMEOUT_MS}ms`);
    }
    await sleep(1000);
  }

  await sleep(1000);
}

function createClient(index) {
  return new Promise((resolve, reject) => {
    const socket = io(BASE_URL, {
      path: WS_PATH,
      transports: ["websocket"],
      timeout: 10000,
      reconnection: false,
      auth: {
        appKey: APP_KEY,
        accessToken: ACCESS_TOKEN,
      },
    });

    const client = {
      index,
      socket,
      connected: false,
      acked: false,
    };
    sockets.push(client);

    const timeout = setTimeout(() => {
      reject(new Error(`client-${index} 连接/订阅超时`));
    }, ACK_TIMEOUT_MS);

    socket.on("connect", () => {
      client.connected = true;
      socket.emit("subscribe", {
        symbols: [SYMBOL],
        wsCapabilityType: "stream-stock-quote",
        preferredProvider: PROVIDER,
      });
    });

    socket.on("subscribe-ack", () => {
      clearTimeout(timeout);
      client.acked = true;
      state.subscribeAcks += 1;
      resolve(client);
    });

    socket.on("subscribe-error", (err) => {
      clearTimeout(timeout);
      state.subscribeErrors.push({ index, err });
      reject(new Error(`client-${index} subscribe-error: ${JSON.stringify(err)}`));
    });

    socket.on("connect_error", (err) => {
      clearTimeout(timeout);
      state.connectErrors.push({ index, err: err?.message || String(err) });
      reject(new Error(`client-${index} connect_error: ${err?.message || err}`));
    });
  });
}

async function unsubscribeClient(client) {
  if (!client?.socket) {
    return;
  }

  try {
    client.socket.emit("unsubscribe", { symbols: [SYMBOL] });
  } catch {
    // ignore
  }

  await sleep(120);

  try {
    client.socket.disconnect();
  } catch {
    // ignore
  }
}

function detectEnvironmentBlocked(errorText) {
  return rule.envBlockedPatterns.some((pattern) => pattern.test(errorText));
}

async function cleanup() {
  for (const client of sockets.splice(0)) {
    try {
      client.socket.disconnect();
    } catch {
      // ignore
    }
  }

  if (appProcess) {
    appProcess.kill("SIGINT");
    await sleep(1000);
    if (!appProcess.killed) {
      appProcess.kill("SIGKILL");
    }
  }
}

async function main() {
  console.log("[config]", {
    baseUrl: BASE_URL,
    provider: PROVIDER,
    symbol: SYMBOL,
    clientCount: CLIENT_COUNT,
    startApp: START_APP,
    unsubscribeGraceMs: UNSUBSCRIBE_GRACE_MS,
    postLastUnsubWaitMs: POST_LAST_UNSUB_WAIT_MS,
    expectedEnvironment: rule.expectedEnvironment,
  });

  try {
    await startAppIfNeeded();

    const clients = [];
    for (let i = 0; i < CLIENT_COUNT; i += 1) {
      try {
        clients.push(await createClient(i + 1));
      } catch (error) {
        const errorText = error?.message || String(error);
        if (detectEnvironmentBlocked(errorText)) {
          console.log("[ENV_BLOCKED] 上游环境阻塞，跳过严格判定", {
            provider: PROVIDER,
            error: errorText,
          });
          return;
        }
        throw error;
      }
      await sleep(80);
    }

    await sleep(SUBSCRIBE_SETTLE_MS);

    const subscribePhase = {
      subscribeAcks: state.subscribeAcks,
      upstreamSubscribeCount: state.upstreamSubscribeCount,
      providerSubscribeCount: state.providerSubscribeCount,
    };

    console.log("[subscribe-phase]", subscribePhase);

    if (state.subscribeErrors.length > 0 || state.connectErrors.length > 0) {
      const errorText = JSON.stringify({
        subscribeErrors: state.subscribeErrors,
        connectErrors: state.connectErrors,
      });
      if (detectEnvironmentBlocked(errorText)) {
        console.log("[ENV_BLOCKED] 上游环境阻塞，跳过严格判定", {
          provider: PROVIDER,
          error: errorText,
        });
        return;
      }
      throw new Error(`存在连接或订阅错误: ${errorText}`);
    }

    if (state.upstreamSubscribeCount !== 1) {
      throw new Error(`期望上游订阅 1 次，实际 ${state.upstreamSubscribeCount} 次`);
    }

    for (let i = 0; i < clients.length - 1; i += 1) {
      await unsubscribeClient(clients[i]);
    }

    await sleep(Math.max(300, Math.floor(UNSUBSCRIBE_GRACE_MS / 2)));

    const partialUnsubscribePhase = {
      upstreamUnsubscribeCount: state.upstreamUnsubscribeCount,
      providerUnsubscribeCount: state.providerUnsubscribeCount,
    };
    console.log("[partial-unsubscribe-phase]", partialUnsubscribePhase);

    if (state.upstreamUnsubscribeCount !== 0) {
      throw new Error(`非最后订阅者退订后不应上游退订，实际 ${state.upstreamUnsubscribeCount} 次`);
    }

    await unsubscribeClient(clients[clients.length - 1]);
    await sleep(POST_LAST_UNSUB_WAIT_MS);

    const finalPhase = {
      upstreamSubscribeCount: state.upstreamSubscribeCount,
      upstreamUnsubscribeCount: state.upstreamUnsubscribeCount,
      providerSubscribeCount: state.providerSubscribeCount,
      providerUnsubscribeCount: state.providerUnsubscribeCount,
      subscribeAcks: state.subscribeAcks,
    };
    console.log("[final-phase]", finalPhase);

    if (state.upstreamUnsubscribeCount !== 1) {
      throw new Error(`最后一个订阅者退订后应上游退订 1 次，实际 ${state.upstreamUnsubscribeCount} 次`);
    }

    console.log("[PASS] WebSocket 上游订阅聚合验收通过", {
      provider: PROVIDER,
      symbol: SYMBOL,
      clientCount: CLIENT_COUNT,
      ...finalPhase,
    });
  } finally {
    await cleanup();
  }
}

main().catch(async (error) => {
  console.error("[FAIL] WebSocket 上游订阅聚合验收失败", {
    provider: PROVIDER,
    symbol: SYMBOL,
    message: error?.message || String(error),
    upstreamSubscribeCount: state.upstreamSubscribeCount,
    upstreamUnsubscribeCount: state.upstreamUnsubscribeCount,
    subscribeErrors: state.subscribeErrors,
    connectErrors: state.connectErrors,
  });
  await cleanup();
  process.exit(1);
});
