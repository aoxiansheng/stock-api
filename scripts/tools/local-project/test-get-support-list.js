#!/usr/bin/env node
/* eslint-disable no-console */
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { dirname, resolve } = require("node:path");
const {
  parseBoolean,
  parseCliArgs,
  parseSymbols,
} = require("./project-api-client");

/**
 * 测试 support-list 弱时效接口
 *
 * 接口：
 * - GET /api/v1/query/support-list/meta
 * - GET /api/v1/query/support-list
 *
 * 常用参数：
 * --type STOCK_HK
 * --symbols 09168.HK,00700.HK
 * --app-key <appKey> --access-token <accessToken>
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
const CLI_ARGS = parseCliArgs(process.argv.slice(2));

function findFirstPositionalToken(argv = process.argv.slice(2)) {
    for (let index = 0; index < argv.length; index += 1) {
        const token = String(argv[index] || "");
        if (!token) {
            continue;
        }
        if (!token.startsWith("--")) {
            return token;
        }

        const hasInlineValue = token.includes("=");
        if (hasInlineValue) {
            continue;
        }

        const next = argv[index + 1];
        if (next && !String(next).startsWith("--")) {
            index += 1;
        }
    }
    return "";
}

const BASE_URL = String(
    CLI_ARGS["base-url"] || process.env.BASE_URL || "http://127.0.0.1:3001",
).replace(/\/$/, "");
const API_PREFIX = CLI_ARGS["api-prefix"] || process.env.API_PREFIX || "/api/v1";
const HTTP_TIMEOUT_MS = Number(
    CLI_ARGS["timeout-ms"] || process.env.HTTP_TIMEOUT_MS || 15000,
);

const TEST_TYPE = String(
    CLI_ARGS.type || process.env.TEST_TYPE || "STOCK_US",
).trim().toUpperCase();
const TEST_SYMBOLS = parseSymbols(
    CLI_ARGS.symbols ||
        CLI_ARGS.symbol ||
        process.env.TEST_SYMBOLS ||
        findFirstPositionalToken(),
    "",
);
const TEST_SINCE = String(
    CLI_ARGS.since || process.env.TEST_SINCE || "",
).trim();
const SAMPLE_LIMIT = Math.max(
    1,
    Number(CLI_ARGS["sample-limit"] || process.env.SAMPLE_LIMIT || 5),
);
const SKIP_DELTA = parseBoolean(
    CLI_ARGS["skip-delta"] || process.env.SKIP_DELTA,
    false,
);
const OUT_FILE = CLI_ARGS["out-file"] || process.env.OUT_FILE || "support-list-query-result.json";

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
    const cliPair = {
        appKey: CLI_ARGS["app-key"],
        accessToken: CLI_ARGS["access-token"],
    };
    if (cliPair.appKey && cliPair.accessToken) {
        return { ...cliPair, source: "cli" };
    }

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

function ensureSuccessResponse(resp, label) {
    if (!resp.ok) {
        throw new Error(`${label} 调用失败 (${resp.status}): ${JSON.stringify(resp.data)}`);
    }
    if (resp.data?.success !== true || Number(resp.data?.statusCode) !== 200) {
        throw new Error(`${label} 业务返回异常: ${JSON.stringify(resp.data)}`);
    }
}

function ensureString(value, field) {
    if (typeof value !== "string" || !value.trim()) {
        throw new Error(`${field} 必须是非空字符串`);
    }
}

function ensureArray(value, field) {
    if (!Array.isArray(value)) {
        throw new Error(`${field} 必须是数组`);
    }
}

function buildSupportListUrl({ since } = {}) {
    const url = new URL(buildUrl("/query/support-list"));
    url.searchParams.set("type", TEST_TYPE);
    if (since) {
        url.searchParams.set("since", since);
    }
    if (TEST_SYMBOLS.length > 0) {
        url.searchParams.set("symbols", TEST_SYMBOLS.join(","));
    }
    return url;
}

async function testSupportListMeta(authHeaders) {
    const url = new URL(buildUrl("/query/support-list/meta"));
    url.searchParams.set("type", TEST_TYPE);

    console.log(`[REQ] ${url.toString()}`);

    const resp = await requestJson(url.toString(), {
        method: "GET",
        headers: authHeaders,
    });
    ensureSuccessResponse(resp, "query/support-list/meta");

    const payload = resp.payload || {};
    ensureString(payload.type, "meta.type");
    ensureString(payload.currentVersion, "meta.currentVersion");
    ensureString(payload.lastUpdated, "meta.lastUpdated");

    const retentionDays = Number(payload.retentionDays);
    if (!Number.isInteger(retentionDays) || retentionDays <= 0) {
        throw new Error("meta.retentionDays 必须是正整数");
    }

    return payload;
}

async function testSupportListFull(authHeaders) {
    const url = buildSupportListUrl();
    console.log(`[REQ] ${url.toString()}`);

    const resp = await requestJson(url.toString(), {
        method: "GET",
        headers: authHeaders,
    });
    ensureSuccessResponse(resp, "query/support-list(full)");

    const payload = resp.payload;
    if (payload?.full !== true) {
        throw new Error(`full 返回形态异常: ${JSON.stringify(payload)}`);
    }
    ensureString(payload.version, "full.version");
    ensureArray(payload.items, "full.items");

    return payload;
}

async function testSupportListDelta(authHeaders, since) {
    const url = buildSupportListUrl({ since });
    console.log(`[REQ] ${url.toString()}`);

    const resp = await requestJson(url.toString(), {
        method: "GET",
        headers: authHeaders,
    });
    ensureSuccessResponse(resp, "query/support-list(delta)");

    const payload = resp.payload;
    if (payload?.full !== false) {
        throw new Error(`delta 返回形态异常: ${JSON.stringify(payload)}`);
    }
    ensureString(payload.from, "delta.from");
    ensureString(payload.to, "delta.to");
    ensureArray(payload.added, "delta.added");
    ensureArray(payload.updated, "delta.updated");
    ensureArray(payload.removed, "delta.removed");

    return payload;
}

function buildAuthHeaders(auth) {
    const bearer = String(
        CLI_ARGS.bearer || process.env.BEARER || DOTENV.BEARER || "",
    ).trim();
    if (bearer) {
        return {
            Authorization: `Bearer ${bearer}`,
        };
    }

    return {
        "X-App-Key": auth.appKey,
        "X-Access-Token": auth.accessToken,
    };
}

function printSummary(meta, full, delta) {
    const summary = {
        type: TEST_TYPE,
        symbols: TEST_SYMBOLS,
        meta: {
            currentVersion: meta.currentVersion,
            lastUpdated: meta.lastUpdated,
            retentionDays: meta.retentionDays,
        },
        full: {
            version: full.version,
            itemsCount: full.items.length,
            sample: full.items.slice(0, SAMPLE_LIMIT),
        },
    };

    if (delta) {
        summary.delta = {
            from: delta.from,
            to: delta.to,
            addedCount: delta.added.length,
            updatedCount: delta.updated.length,
            removedCount: delta.removed.length,
            sampleAdded: delta.added.slice(0, SAMPLE_LIMIT),
            sampleUpdated: delta.updated.slice(0, SAMPLE_LIMIT),
            sampleRemoved: delta.removed.slice(0, SAMPLE_LIMIT),
        };
    }

    console.log(JSON.stringify(summary, null, 2));
}

function persistResult(data) {
    const outPath = resolve(__dirname, `../../tmp/${OUT_FILE}`);
    if (!existsSync(dirname(outPath))) {
        mkdirSync(dirname(outPath), { recursive: true });
    }
    writeFileSync(outPath, JSON.stringify(data, null, 2), "utf8");
    return outPath;
}

async function testSupportList(auth) {
    const authHeaders = buildAuthHeaders(auth);
    const meta = await testSupportListMeta(authHeaders);
    const full = await testSupportListFull(authHeaders);

    let delta = null;
    if (!SKIP_DELTA) {
        const since = TEST_SINCE || full.version;
        delta = await testSupportListDelta(authHeaders, since);
    }

    const outData = {
        config: {
            baseUrl: BASE_URL,
            apiPrefix: API_PREFIX,
            type: TEST_TYPE,
            symbols: TEST_SYMBOLS,
            since: TEST_SINCE,
            skipDelta: SKIP_DELTA,
            sampleLimit: SAMPLE_LIMIT,
            authSource: auth.source,
        },
        data: {
            meta,
            full,
            delta,
        },
    };

    const outPath = persistResult(outData);
    printSummary(meta, full, delta);

    console.log("\n[PASS] query/support-list.* API");
    console.log(`完整结果已保存到文件: ${outPath}`);
}

async function main() {
    const auth = await resolveApiKeyPair();
    console.log("[config]", {
        baseUrl: BASE_URL,
        apiPrefix: API_PREFIX,
        type: TEST_TYPE,
        symbols: TEST_SYMBOLS,
        since: TEST_SINCE,
        skipDelta: SKIP_DELTA,
        sampleLimit: SAMPLE_LIMIT,
        authSource: auth.source,
    });

    await testSupportList(auth);
    console.log("======== 测试完成 ========");
}

main().catch((err) => {
    console.error("[FAIL]", err.message || String(err));
    process.exit(1);
});
