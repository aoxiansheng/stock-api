#!/usr/bin/env bun
/**
 * 使用 LongPort 官方 SDK (longport npm 包) 直接调用 QuoteContext.quote，
 * 以便在本地快速抓取原始行情响应，核对字段与数据结构。
 *
 * 运行方式（确保 LONGPORT_* 环境变量已配置，可通过 .env* 或 shell 导出）：
 *    bun scripts/tools/longport-quote-dump.ts AMD.US 700.HK
 *
 * 支持的环境变量：
 *    LONGPORT_APP_KEY
 *    LONGPORT_APP_SECRET
 *    LONGPORT_ACCESS_TOKEN
 *    LONGPORT_ENABLE_OVERNIGHT (可选，true 时返回 overnight_quote，SDK 内部控制)
 *    LONGPORT_DEBUG_SYMBOLS (可选，逗号分隔符号列表，脚本未传参数时使用)
 */

import process from "node:process";
import { Config, QuoteContext } from "longport";

type QuotePayload = Record<string, unknown> | unknown[];
type CallableMethod = () => Promise<unknown> | unknown;

async function main() {
  const symbols = collectSymbols();
  if (symbols.length === 0) {
    console.error(
      "[longport-quote-dump] 未提供符号。请在命令后追加 symbol，或设置 LONGPORT_DEBUG_SYMBOLS。",
    );
    process.exitCode = 1;
    return;
  }

  console.info(
    `[longport-quote-dump] 即将请求 ${symbols.length} 个标的：${symbols.join(", ")}`,
  );

  let ctx: QuoteContext | null = null;
  try {
    const config = Config.fromEnv();
    ctx = await QuoteContext.new(config);

    // 始终直接请求官方 SDK 默认 payload，不设置任何字段/子场景过滤
    const response = await ctx.quote(symbols);

    // SDK 响应可能包含 toJSON/toObject 方法，优先转换为可序列化对象
    const payload = toSerializablePayload(response);

    console.info("[longport-quote-dump] === 原始响应开始 ===");
    console.log(JSON.stringify(payload));
    const sample =
      extractFirstRecordFromList(response) ?? extractFirstRecordFromList(payload);
    if (sample) {
      console.info(
        "[longport-quote-dump] sample keys",
        Object.keys(sample),
      );
      const pre = extractRecordField(sample, "preMarketQuote");
      const post = extractRecordField(sample, "postMarketQuote");
      const overnight = extractRecordField(sample, "overnightQuote");
      if (pre) {
        console.info(
          "[longport-quote-dump] preMarketQuote keys",
          Object.keys(pre),
        );
      }
      if (post) {
        console.info(
          "[longport-quote-dump] postMarketQuote keys",
          Object.keys(post),
        );
      }
      if (overnight) {
        console.info(
          "[longport-quote-dump] overnightQuote keys",
          Object.keys(overnight),
        );
      }
    }
    console.info("[longport-quote-dump] === 原始响应结束 ===");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : JSON.stringify(error);
    console.error("[longport-quote-dump] 请求失败：", message);
    process.exitCode = 1;
  } finally {
    await closeQuoteContext(ctx);
  }
}

function collectSymbols(): string[] {
  const args = process.argv.slice(2).filter(Boolean);
  if (args.length > 0) {
    return args;
  }

  const envSymbols = process.env.LONGPORT_DEBUG_SYMBOLS;
  if (envSymbols) {
    return envSymbols
      .split(",")
      .map((symbol) => symbol.trim())
      .filter(Boolean);
  }

  return [];
}

async function closeQuoteContext(ctx: QuoteContext | null) {
  if (!ctx) {
    return;
  }
  const context: unknown = ctx;
  try {
    if (hasCallableMethod(context, "close")) {
      await Promise.resolve(context.close());
    } else if (hasCallableMethod(context, "disconnect")) {
      await Promise.resolve(context.disconnect());
    } else if (hasCallableMethod(context, "destroy")) {
      await Promise.resolve(context.destroy());
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : JSON.stringify(error);
    console.warn("[longport-quote-dump] 关闭 QuoteContext 失败：", message);
  }
}

function toSerializablePayload(response: unknown): QuotePayload {
  if (hasCallableMethod(response, "toObject")) {
    const converted = response.toObject();
    if (isQuotePayload(converted)) {
      return converted;
    }
  }

  if (hasCallableMethod(response, "toJSON")) {
    const converted = response.toJSON();
    if (isQuotePayload(converted)) {
      return converted;
    }
  }

  if (isQuotePayload(response)) {
    return response;
  }

  return { raw: response };
}

function isQuotePayload(value: unknown): value is QuotePayload {
  return Array.isArray(value) || isRecord(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasCallableMethod<K extends string>(
  value: unknown,
  methodName: K,
): value is Record<K, CallableMethod> {
  return isRecord(value) && typeof value[methodName] === "function";
}

function extractFirstRecordFromList(
  value: unknown,
): Record<string, unknown> | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }
  return isRecord(value[0]) ? value[0] : null;
}

function extractRecordField(
  obj: Record<string, unknown>,
  field: string,
): Record<string, unknown> | null {
  const value = obj[field];
  return isRecord(value) ? value : null;
}

void main();
