#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * API Key 引导脚本（注册/登录/创建 API Key 一体化）
 *
 * 目标：
 * 1. 自动注册用户（若已存在则跳过）
 * 2. 登录获取 JWT
 * 3. 创建带流权限的 API Key（默认 stream:read,stream:subscribe）
 * 4. 输出 APP_KEY / ACCESS_TOKEN 供 WebSocket 测试使用
 *
 * 常用环境变量：
 * - BASE_URL: 服务地址（默认 http://127.0.0.1:3001）
 * - API_PREFIX: API 前缀（默认 /api/v1）
 * - USERNAME / PASSWORD / EMAIL: 指定用户（不传则自动生成）
 * - API_KEY_NAME: API Key 名称
 * - API_KEY_PROFILE: READ/ADMIN（默认 READ）
 * - API_KEY_PERMISSIONS: 逗号分隔权限（默认 stream:read,stream:subscribe）
 * - API_KEY_EXPIRES_IN: 过期时间（如 30d）
 */

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3001";
const API_PREFIX = process.env.API_PREFIX || "/api/v1";

const ts = Date.now();
const username = process.env.USERNAME || `jvquant_u_${ts}`;
const password = process.env.PASSWORD || `JvQ_${ts}_pass`;
const email = process.env.EMAIL || `${username}@example.com`;
const apiKeyName = process.env.API_KEY_NAME || `jvquant-ws-${ts}`;
const profile = process.env.API_KEY_PROFILE || "READ";
const expiresIn = process.env.API_KEY_EXPIRES_IN; // 可选，如 30d
const defaultPermissions = ["stream:read", "stream:subscribe"];
const permissions = (process.env.API_KEY_PERMISSIONS || defaultPermissions.join(","))
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const rawOutput = process.argv.includes("--raw");

function maskSecret(secret) {
  const value = String(secret ?? "");
  if (!value) return "";
  if (value.length <= 2) {
    return "*".repeat(value.length);
  }
  if (value.length <= 4) {
    return `${value[0]}${"*".repeat(value.length - 2)}${value[value.length - 1]}`;
  }
  return `${value.slice(0, 2)}${"*".repeat(value.length - 4)}${value.slice(-2)}`;
}

function displaySecret(secret, raw = false) {
  return raw ? secret : maskSecret(secret);
}

function buildUrl(path) {
  return `${BASE_URL}${API_PREFIX}${path}`;
}

async function httpJson(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(buildUrl(path), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  return {
    ok: res.ok,
    status: res.status,
    data,
    payload:
      data && typeof data === "object" && "data" in data
        ? data.data
        : data,
  };
}

function isUserExistsResp(resp) {
  const msg =
    resp?.data?.message ||
    resp?.data?.error ||
    "";
  return resp.status === 409 || String(msg).includes("已存在");
}

async function registerOrLogin() {
  const registerResp = await httpJson("/auth/register", {
    method: "POST",
    body: { username, password, email },
  });

  if (registerResp.ok) {
    console.log("[register] 成功", { username, email });
  } else if (isUserExistsResp(registerResp)) {
    console.log("[register] 用户已存在，跳过注册", { username });
  } else {
    throw new Error(
      `注册失败(${registerResp.status}): ${JSON.stringify(registerResp.data)}`,
    );
  }

  const loginResp = await httpJson("/auth/login", {
    method: "POST",
    body: { username, password },
  });

  if (!loginResp.ok || !loginResp.payload?.accessToken) {
    throw new Error(
      `登录失败(${loginResp.status}): ${JSON.stringify(loginResp.data)}`,
    );
  }

  return {
    jwt: loginResp.payload.accessToken,
    refreshToken: loginResp.payload.refreshToken,
    user: loginResp.payload.user,
  };
}

async function createApiKey(jwt) {
  const body = {
    name: apiKeyName,
    profile,
    permissions,
  };

  if (expiresIn) {
    body.expiresIn = expiresIn;
  }

  const resp = await httpJson("/auth/api-keys", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body,
  });

  if (!resp.ok || !resp.payload?.appKey || !resp.payload?.accessToken) {
    throw new Error(
      `创建 API Key 失败(${resp.status}): ${JSON.stringify(resp.data)}`,
    );
  }

  return resp.payload;
}

async function main(options = {}) {
  const raw = options.raw ?? rawOutput;
  console.log("[config]", {
    baseUrl: BASE_URL,
    apiPrefix: API_PREFIX,
    username,
    email,
    apiKeyName,
    profile,
    permissions,
    expiresIn: expiresIn || null,
  });

  const login = await registerOrLogin();
  const apiKey = await createApiKey(login.jwt);

  console.log("\n=== 凭证输出（请妥善保管） ===");
  console.log(`USERNAME=${username}`);
  console.log(`PASSWORD=${displaySecret(password, raw)}`);
  console.log(`EMAIL=${email}`);
  console.log(`APP_KEY=${displaySecret(apiKey.appKey, raw)}`);
  console.log(`ACCESS_TOKEN=${displaySecret(apiKey.accessToken, raw)}`);
  console.log(`JWT_ACCESS_TOKEN=${displaySecret(login.jwt, raw)}`);
  console.log("=== END ===\n");

  console.log("[json]");
  console.log(
    JSON.stringify(
      {
        username,
        password: displaySecret(password, raw),
        email,
        appKey: displaySecret(apiKey.appKey, raw),
        accessToken: displaySecret(apiKey.accessToken, raw),
        permissions,
        jwtAccessToken: displaySecret(login.jwt, raw),
        refreshToken: displaySecret(login.refreshToken, raw),
        apiKeyMeta: {
          name: apiKeyName,
          profile: apiKey.profile,
          expiresAt: apiKey.expiresAt || null,
          createdAt: apiKey.createdAt || null,
        },
      },
      null,
      2,
    ),
  );
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[FAIL]", err?.message || err);
    process.exit(1);
  });
}

module.exports = {
  maskSecret,
  main,
};
