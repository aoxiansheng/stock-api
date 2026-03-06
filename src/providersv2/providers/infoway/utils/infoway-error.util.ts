import {
  BusinessErrorCode,
  BusinessException,
  ComponentIdentifier,
  UniversalExceptionFactory,
} from "@common/core/exceptions";

const LOG_MSG_MAX_LENGTH = 200;
const INFOWAY_AUTH_BEARER_PATTERN =
  /(authorization)\s*[:=]\s*bearer\s+[^\s,;]+/gi;
const INFOWAY_SENSITIVE_PAIR_PATTERN =
  /(apikey|api_key|authorization|token)\s*[:=]\s*([^\s,;]+)/gi;
const INFOWAY_SENSITIVE_KEY_PATTERN = /^(apikey|api_key|authorization|token)$/i;

export function sanitizeInfowayUpstreamMessage(raw: unknown): string {
  const text = resolveInfowayMessageText(raw);
  if (!text) {
    return "";
  }

  const redactedAuthorization = text.replace(
    INFOWAY_AUTH_BEARER_PATTERN,
    "$1=[REDACTED]",
  );
  const redacted = redactedAuthorization.replace(
    INFOWAY_SENSITIVE_PAIR_PATTERN,
    "$1=[REDACTED]",
  );

  if (redacted.length <= LOG_MSG_MAX_LENGTH) {
    return redacted;
  }
  return `${redacted.slice(0, LOG_MSG_MAX_LENGTH)}...`;
}

function resolveInfowayMessageText(raw: unknown): string {
  if (raw === null || raw === undefined) {
    return "";
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      return "";
    }

    const parsedJson = tryParseJson(trimmed);
    if (parsedJson !== undefined) {
      return stringifyInfowayJson(parsedJson);
    }
    return normalizeInfowayLogText(trimmed);
  }

  if (Array.isArray(raw) || isPlainObject(raw)) {
    return stringifyInfowayJson(raw);
  }

  return String(raw);
}

function stringifyInfowayJson(raw: unknown): string {
  const seen = new WeakSet<object>();
  try {
    const redacted = redactInfowaySensitiveFields(raw, seen);
    return JSON.stringify(redacted);
  } catch {
    return String(raw);
  }
}

function redactInfowaySensitiveFields(raw: unknown, seen: WeakSet<object>): unknown {
  if (raw === null || raw === undefined) {
    return raw;
  }

  if (typeof raw !== "object") {
    return raw;
  }

  if (seen.has(raw)) {
    return "[Circular]";
  }
  seen.add(raw);

  if (Array.isArray(raw)) {
    return raw.map((item) => redactInfowaySensitiveFields(item, seen));
  }

  if (!isPlainObject(raw)) {
    return raw;
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (INFOWAY_SENSITIVE_KEY_PATTERN.test(key)) {
      redacted[key] = "[REDACTED]";
      continue;
    }
    redacted[key] = redactInfowaySensitiveFields(value, seen);
  }
  return redacted;
}

function tryParseJson(text: string): unknown | undefined {
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function normalizeInfowayLogText(text: unknown): string {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function isPlainObject(raw: unknown): raw is Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(raw);
  return prototype === Object.prototype || prototype === null;
}

export function buildInfowayFixedError(
  operation: string,
  upstream: { ret?: unknown; msg?: unknown } = {},
): BusinessException {
  return UniversalExceptionFactory.createBusinessException({
    message: `Infoway ${operation} 响应异常`,
    errorCode: BusinessErrorCode.EXTERNAL_API_ERROR,
    operation,
    component: ComponentIdentifier.PROVIDER,
    context: {
      provider: "infoway",
      operation,
      upstream: {
        ret: upstream.ret ?? null,
        msg: sanitizeInfowayUpstreamMessage(upstream.msg),
      },
    },
  });
}
