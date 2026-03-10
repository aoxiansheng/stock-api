import { BadRequestException } from "@nestjs/common";
import { INFOWAY_SUPPORT_LIST_TYPES } from "@providersv2/providers/infoway/utils/infoway-support-list.util";

export const SUPPORT_LIST_RETENTION_DAYS = 7;
export const SUPPORT_LIST_DELTA_TTL_SECONDS =
  SUPPORT_LIST_RETENTION_DAYS * 24 * 60 * 60;
export const SUPPORT_LIST_VERSION_PATTERN = /^\d{14}$/;
export const SUPPORT_LIST_META_PROVIDER = "system-support-list";
const SUPPORT_LIST_MAX_ITEMS_DEFAULT = 100_000;
const SUPPORT_LIST_MAX_PAYLOAD_BYTES_DEFAULT = 16 * 1024 * 1024;
const SUPPORT_LIST_GATEWAY_ERROR_REASON_MAX_LENGTH_DEFAULT = 256;
const SUPPORT_LIST_TYPES_ENV_KEY = "SUPPORT_LIST_TYPES";

const SUPPORT_LIST_CURRENT_KEY_PREFIX = "support_list_current";
const SUPPORT_LIST_META_KEY_PREFIX = "support_list_meta";
const SUPPORT_LIST_DELTA_KEY_PREFIX = "support_list_delta";
const SUPPORT_LIST_REFRESH_LOCK_KEY_PREFIX = "support_list_refresh_lock";
export const SUPPORT_LIST_REFRESH_LOCK_TTL_SECONDS = 120;

function parseSupportListTypesFromEnv(raw: string | undefined): string[] {
  if (!raw || !raw.trim()) {
    return [...INFOWAY_SUPPORT_LIST_TYPES];
  }

  const parsed = raw
    .split(",")
    .map((item) => String(item || "").trim().toUpperCase())
    .filter((item) => item.length > 0)
    .filter((item, index, array) => array.indexOf(item) === index);

  return parsed.length > 0 ? parsed : [...INFOWAY_SUPPORT_LIST_TYPES];
}

export const SUPPORT_LIST_TYPES = Object.freeze(
  parseSupportListTypesFromEnv(process.env[SUPPORT_LIST_TYPES_ENV_KEY]),
);
const SUPPORT_LIST_TYPE_SET = new Set<string>(SUPPORT_LIST_TYPES);

export function normalizeSupportListType(type: string): string {
  return String(type || "").trim().toUpperCase();
}

export function isSupportListTypeSupported(type: string): boolean {
  return SUPPORT_LIST_TYPE_SET.has(normalizeSupportListType(type));
}

export function getSupportListTypeValidationMessage(): string {
  return `type 仅支持以下值: ${SUPPORT_LIST_TYPES.join(", ")}`;
}

export function assertSupportListTypeSupported(type: string): string {
  const normalizedType = normalizeSupportListType(type);
  if (!isSupportListTypeSupported(normalizedType)) {
    throw new BadRequestException(getSupportListTypeValidationMessage());
  }
  return normalizedType;
}

export function buildSupportListCurrentKey(type: string): string {
  return `${SUPPORT_LIST_CURRENT_KEY_PREFIX}_${normalizeSupportListType(type)}`;
}

export function buildSupportListMetaKey(type: string): string {
  return `${SUPPORT_LIST_META_KEY_PREFIX}_${normalizeSupportListType(type)}`;
}

export function buildSupportListDeltaKey(type: string, toVersion: string): string {
  return `${SUPPORT_LIST_DELTA_KEY_PREFIX}_${toVersion}_${normalizeSupportListType(type)}`;
}

export function buildSupportListRefreshLockKey(type: string): string {
  return `${SUPPORT_LIST_REFRESH_LOCK_KEY_PREFIX}_${normalizeSupportListType(type)}`;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function buildSupportListVersion(date = new Date()): string {
  return [
    date.getUTCFullYear(),
    pad2(date.getUTCMonth() + 1),
    pad2(date.getUTCDate()),
    pad2(date.getUTCHours()),
    pad2(date.getUTCMinutes()),
    pad2(date.getUTCSeconds()),
  ].join("");
}

export function parseSupportListTimestampVersion(version: string): Date | null {
  const normalized = String(version || "").trim();
  if (!SUPPORT_LIST_VERSION_PATTERN.test(normalized)) {
    return null;
  }

  const year = Number(normalized.slice(0, 4));
  const month = Number(normalized.slice(4, 6));
  const day = Number(normalized.slice(6, 8));
  const hour = Number(normalized.slice(8, 10));
  const minute = Number(normalized.slice(10, 12));
  const second = Number(normalized.slice(12, 14));

  const utcMillis = Date.UTC(year, month - 1, day, hour, minute, second);
  const date = new Date(utcMillis);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  if (buildSupportListVersion(date) !== normalized) {
    return null;
  }
  return date;
}

function parsePositiveIntWithFallback(
  raw: string | undefined,
  fallback: number,
): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolveSupportListMaxItems(
  raw = process.env.SUPPORT_LIST_MAX_ITEMS,
): number {
  return parsePositiveIntWithFallback(raw, SUPPORT_LIST_MAX_ITEMS_DEFAULT);
}

export function resolveSupportListMaxPayloadBytes(
  raw = process.env.SUPPORT_LIST_MAX_PAYLOAD_BYTES,
): number {
  return parsePositiveIntWithFallback(raw, SUPPORT_LIST_MAX_PAYLOAD_BYTES_DEFAULT);
}

export function resolveSupportListGatewayErrorReasonMaxLength(
  raw = process.env.SUPPORT_LIST_GATEWAY_ERROR_REASON_MAX_LENGTH,
): number {
  return parsePositiveIntWithFallback(
    raw,
    SUPPORT_LIST_GATEWAY_ERROR_REASON_MAX_LENGTH_DEFAULT,
  );
}
