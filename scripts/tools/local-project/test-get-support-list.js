#!/usr/bin/env node
/* eslint-disable no-console */
const { existsSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");

/**
 * 测试 Infoway get-support-list 新能力
 * 
 * 接口：GET /api/v1/receiver/support-list
 * 查询参数：type, symbols (可选), preferredProvider (可选)
 */

function parseDotEnv(filePath) {
    if (!existsSync(filePath)) {
        return {};
    }
    const content = readFileSync(filePath, "utf8");
    const result = {};
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) {
            continue;
        }
        const index = line.indexOf("=");
        if (index <= 0) {
            continue;
        }
        const key = line.slice(0, index).trim();
        let value = line.slice(index + 1).trim();
        if (
            (value.startsWith("\"") && value.endsWith("\"")) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        if (key) {
            result[key] = value;
        }
    }
    return result;
}

const DOTENV = parseDotEnv(resolve(process.cwd(), ".env"));

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3001";
const API_PREFIX = process.env.API_PREFIX || "/api/v1";
const HTTP_TIMEOUT_MS = Number(process.env.HTTP_TIMEOUT_MS || 15000);

const TEST_TYPE = process.env.TEST_TYPE || "STOCK_US";
const TEST_SYMBOLS = process.env.TEST_SYMBOLS || "";
const TEST_PROVIDER = process.env.TEST_PROVIDER || "infoway";

function buildUrl(path) {
    return `${BASE_URL}${API_PREFIX}${path}`;
}

async function requestJson(url, { method = "GET", body, headers = {} } = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
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
                data && typeof data === "object" && "data" in data ? data.data : data,
        };
    } finally {
        clearTimeout(timeout);
    }
}

function isUserExistsResp(resp) {
    const msg = resp?.data?.message || resp?.data?.error || "";
    return resp.status === 409 || String(msg).includes("已存在");
}

async function resolveApiKeyPair() {
    const envPair = {
        appKey: process.env.APP_KEY || DOTENV.APP_KEY,
        accessToken: process.env.ACCESS_TOKEN || DOTENV.ACCESS_TOKEN,
    };
    if (envPair.appKey && envPair.accessToken) {
        return { ...envPair, source: "env" };
    }

    const username = process.env.USERNAME || DOTENV.USERNAME || "admin";
    const password = process.env.PASSWORD || DOTENV.PASSWORD || "admin123!@#";
    const email = process.env.EMAIL || `${username || "infoway"}@example.com`;
    if (!username || !password) {
        throw new Error(
            "缺少认证参数：请提供 APP_KEY+ACCESS_TOKEN，或 USERNAME+PASSWORD",
        );
    }

    const registerResp = await requestJson(buildUrl("/auth/register"), {
        method: "POST",
        body: { username, password, email },
    });
    if (!registerResp.ok && !isUserExistsResp(registerResp)) {
        throw new Error(
            `注册失败(${registerResp.status}): ${JSON.stringify(registerResp.data)}`,
        );
    }

    const loginResp = await requestJson(buildUrl("/auth/login"), {
        method: "POST",
        body: { username, password },
    });
    if (!loginResp.ok || !loginResp.payload?.accessToken) {
        throw new Error(
            `登录失败(${loginResp.status}): ${JSON.stringify(loginResp.data)}`,
        );
    }

    const keyResp = await requestJson(buildUrl("/auth/api-keys"), {
        method: "POST",
        headers: {
            Authorization: `Bearer ${loginResp.payload.accessToken}`,
        },
        body: {
            name: `support-list-test-${Date.now()}`,
            profile: "READ",
        },
    });

    if (!keyResp.ok || !keyResp.payload?.appKey || !keyResp.payload?.accessToken) {
        throw new Error(
            `创建 API Key 失败(${keyResp.status}): ${JSON.stringify(keyResp.data)}`,
        );
    }

    return {
        appKey: keyResp.payload.appKey,
        accessToken: keyResp.payload.accessToken,
        source: "created",
    };
}

async function testSupportList(auth) {
    const url = new URL(buildUrl("/receiver/support-list"));
    url.searchParams.set("type", TEST_TYPE);
    if (TEST_SYMBOLS) {
        url.searchParams.set("symbols", TEST_SYMBOLS);
    }
    if (TEST_PROVIDER) {
        url.searchParams.set("preferredProvider", TEST_PROVIDER);
    }

    console.log(`[REQ] ${url.toString()}`);

    const resp = await requestJson(url.toString(), {
        method: "GET",
        headers: {
            "X-App-Key": auth.appKey,
            "X-Access-Token": auth.accessToken,
        },
    });

    if (!resp.ok) {
        throw new Error(
            `receiver 调用失败 (${resp.status}): ${JSON.stringify(resp.data)}`,
        );
    }

    const payload = resp.payload;
    const dataList = resp.data?.data?.data || resp.data?.data || payload?.data || [];

    // 把完整的原始 JSON 输出以便抓取或重定向验证
    console.log(JSON.stringify(resp.data, null, 2));

    const fs = require('fs');
    const path = require('path');
    const outPath = path.resolve(__dirname, '../../tmp/support-list-raw.json');
    if (!fs.existsSync(path.dirname(outPath))) {
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
    }
    fs.writeFileSync(outPath, JSON.stringify(resp.data, null, 2), 'utf8');

    console.log("\n[PASS] get-support-list API");
    console.log("响应项个数:", dataList.length || 0);
    console.log(`完整原始 JSON 已保存到文件: ${outPath}`);

    return dataList;
}

async function main() {
    const auth = await resolveApiKeyPair();
    console.log("[config]", {
        baseUrl: BASE_URL,
        type: TEST_TYPE,
        symbols: TEST_SYMBOLS,
        provider: TEST_PROVIDER,
        authSource: auth.source,
    });

    await testSupportList(auth);
    console.log("======== 测试完成 ========");
}

main().catch((err) => {
    console.error("[FAIL]", err.message || String(err));
    process.exit(1);
});
