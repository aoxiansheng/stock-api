#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Infoway 上游 CRYPTO 基础信息透传测试脚本
 *
 * 接口：
 * - GET /common/basic/symbols/info?type=CRYPTO&symbols=...
 *
 * 目标：
 * - 直接查看上游原始响应（ret/msg/traceId/data），不做映射和字段裁剪。
 *
 * 运行示例：
 * node "scripts/tools/upstream-sdk/test-infoway-crypto-info-raw.js" \
 *   --symbols "BTCUSDT.CRYPTO,ETHUSDT.CRYPTO" \
 *   --api-key "<INFOWAY_API_KEY>" \
 *   --allow-upstream-errors true
 */

const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { dirname, resolve } = require("node:path");

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = String(argv[index] || "").trim();
    if (!token.startsWith("--")) {
      continue;
    }

    const body = token.slice(2);
    const equalIndex = body.indexOf("=");
    if (equalIndex >= 0) {
      const key = body.slice(0, equalIndex);
      const value = body.slice(equalIndex + 1);
      if (key) {
        args[key] = value;
      }
      continue;
    }

    const key = body;
    if (!key) {
      continue;
    }

    const nextToken = argv[index + 1];
    if (nextToken !== undefined && !String(nextToken).startsWith("--")) {
      args[key] = String(nextToken);
      index += 1;
    } else {
      args[key] = "true";
    }
  }

  return args;
}

function parseDotEnv(filePath) {
  if (!existsSync(filePath)) return {};

  const content = readFileSync(filePath, "utf8");
  const result = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const index = line.indexOf("=");
    if (index <= 0) continue;

    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key) result[key] = value;
  }

  return result;
}

function maskKey(key) {
  if (!key || key.length <= 10) return "***";
  return `${key.slice(0, 6)}***${key.slice(-4)}`;
}

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "off"].includes(normalized)) return false;
  return defaultValue;
}

function parseSymbols(input) {
  const strictCryptoPattern = /^[A-Z0-9]{2,20}\.CRYPTO$/;
  const requestedSymbols = String(input || "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
  const invalidSymbols = requestedSymbols.filter(
    (symbol) => !strictCryptoPattern.test(symbol),
  );

  if (invalidSymbols.length > 0) {
    return {
      requestedSymbols,
      upstreamSymbols: [],
      invalidSymbols,
    };
  }

  return {
    requestedSymbols,
    upstreamSymbols: requestedSymbols.map((symbol) => symbol.slice(0, -7)),
    invalidSymbols: [],
  };
}

async function requestJson(url, { timeoutMs = 15000, headers = {} } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { rawText: text };
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      rawText: text,
    };
  } finally {
    clearTimeout(timer);
  }
}

function fail(message, extra) {
  if (extra !== undefined) {
    console.error(message, extra);
  } else {
    console.error(message);
  }
  process.exit(1);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dotenv = parseDotEnv(resolve(process.cwd(), ".env"));

  const baseUrl = String(
    args["base-url"] ||
      process.env.BASE_URL ||
      process.env.UPSTREAM_BASE_URL ||
      process.env.INFOWAY_BASE_URL ||
      dotenv.INFOWAY_BASE_URL ||
      "https://data.infoway.io",
  ).replace(/\/$/, "");

  const apiKey = String(
    args["api-key"] ||
      process.env.API_KEY ||
      process.env.TOKEN ||
      process.env.UPSTREAM_API_KEY ||
      process.env.INFOWAY_API_KEY ||
      dotenv.INFOWAY_API_KEY ||
      "",
  ).trim();

  const parsedSymbols = parseSymbols(
    args.symbols || process.env.SYMBOLS || "BTCUSDT.CRYPTO",
  );
  const symbols = parsedSymbols.requestedSymbols;
  const upstreamSymbols = parsedSymbols.upstreamSymbols;
  const timeoutMs = Number(args["timeout-ms"] || process.env.HTTP_TIMEOUT_MS || 15000);
  const outputFile = String(args["output-file"] || process.env.OUTPUT_FILE || "").trim();
  const sampleLimit = Math.max(1, Number(args["sample-limit"] || process.env.SAMPLE_LIMIT || 5));
  const allowUpstreamErrors = parseBoolean(
    args["allow-upstream-errors"] ?? process.env.ALLOW_UPSTREAM_ERRORS,
    false,
  );
  const allowEmpty = parseBoolean(args["allow-empty"] ?? process.env.ALLOW_EMPTY, true);

  if (!apiKey) {
    fail("[FAIL] 缺少 API_KEY（可通过 --api-key 或环境变量传入）");
  }
  if (symbols.length === 0) {
    fail("[FAIL] SYMBOLS 不能为空（示例：BTCUSDT.CRYPTO,ETHUSDT.CRYPTO）");
  }
  if (parsedSymbols.invalidSymbols.length > 0) {
    fail("[FAIL] SYMBOLS 必须使用 *.CRYPTO 格式", {
      invalidSymbols: parsedSymbols.invalidSymbols,
      example: "BTCUSDT.CRYPTO",
    });
  }
  if (upstreamSymbols.length > 500) {
    fail("[FAIL] SYMBOLS 数量超过上游限制 500", { count: upstreamSymbols.length });
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    fail("[FAIL] timeout-ms 必须是正数");
  }

  const url = new URL(`${baseUrl}/common/basic/symbols/info`);
  url.searchParams.set("type", "CRYPTO");
  url.searchParams.set("symbols", upstreamSymbols.join(","));

  console.log("== 请求配置 ==");
  console.log(
    JSON.stringify(
      {
        url: url.toString(),
        apiKeyMasked: maskKey(apiKey),
        symbols,
        upstreamSymbols,
        timeoutMs,
        allowUpstreamErrors,
        allowEmpty,
        outputFile: outputFile || null,
      },
      null,
      2,
    ),
  );

  let response;
  try {
    response = await requestJson(url.toString(), {
      timeoutMs,
      headers: { apiKey },
    });
  } catch (error) {
    fail("[FAIL] 请求异常", error instanceof Error ? error.message : String(error));
  }

  const payload = response.data && typeof response.data === "object" ? response.data : {};
  const ret = Number(payload.ret);
  const rows = Array.isArray(payload.data) ? payload.data : [];

  console.log("== 上游原始响应（透传） ==");
  console.log(JSON.stringify(payload, null, 2));

  if (outputFile) {
    mkdirSync(dirname(outputFile), { recursive: true });
    writeFileSync(outputFile, JSON.stringify(payload, null, 2), "utf8");
    console.log(`[INFO] 已写入原始响应: ${outputFile}`);
  }

  if (!allowUpstreamErrors) {
    if (!response.ok) {
      fail("[FAIL] HTTP 状态异常", { status: response.status, payload });
    }
    if (ret !== 200) {
      fail("[FAIL] 上游业务返回异常", {
        ret: payload.ret,
        msg: payload.msg,
        traceId: payload.traceId,
      });
    }
  }

  if (!allowEmpty && rows.length === 0) {
    fail("[FAIL] data 为空，但 allow-empty=false", {
      ret: payload.ret,
      msg: payload.msg,
      traceId: payload.traceId,
    });
  }

  console.log("[PASS] GET /common/basic/symbols/info?type=CRYPTO");
  console.log(
    JSON.stringify(
      {
        status: response.status,
        ret: payload.ret,
        msg: payload.msg,
        traceId: payload.traceId || null,
        count: rows.length,
        sample: rows.slice(0, sampleLimit),
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
