import { API_OPERATIONS } from "@common/constants/domain";
import { CAPABILITY_NAMES } from "@providersv2/providers/constants/capability-names.constants";
/**
 * 数据接收操作相关常量（精简版）
 * 仅保留本组件实际使用的导出
 */

/**
 * 支持的能力类型常量（用于数据提供商路由和能力匹配）
 * 重构说明：从 SUPPORTED_DATA_TYPES 重命名为 SUPPORTED_CAPABILITY_TYPES
 * 以更准确地反映其在能力映射中的作用
 */
export const SUPPORTED_CAPABILITY_TYPES = Object.freeze([
  CAPABILITY_NAMES.GET_STOCK_QUOTE,
  CAPABILITY_NAMES.GET_STOCK_BASIC_INFO,
  CAPABILITY_NAMES.GET_STOCK_HISTORY,
  CAPABILITY_NAMES.GET_CRYPTO_QUOTE,
  CAPABILITY_NAMES.GET_CRYPTO_BASIC_INFO,
  CAPABILITY_NAMES.GET_INDEX_QUOTE,
  CAPABILITY_NAMES.GET_MARKET_STATUS,
  CAPABILITY_NAMES.GET_TRADING_DAYS,
  CAPABILITY_NAMES.GET_SUPPORT_LIST,
] as const);

function normalizeCapabilityName(capabilityName: string): string {
  return String(capabilityName || "").trim().toLowerCase();
}

function isStreamCapability(capabilityName: string): boolean {
  const normalizedCapability = normalizeCapabilityName(capabilityName);
  return (
    normalizedCapability ===
      normalizeCapabilityName(API_OPERATIONS.STOCK_DATA.STREAM_QUOTE) ||
    normalizedCapability.includes("stream")
  );
}

/**
 * 启动期一致性断言：receiver 白名单与 active provider 能力集合保持同步
 *
 * 说明：
 * - activeProviderCapabilities 可包含流能力，本断言会自动过滤。
 * - 若出现漂移，直接抛错阻止启动。
 */
export function assertReceiverCapabilityWhitelistSync(
  receiverWhitelist: readonly string[],
  activeProviderCapabilities: Iterable<string>,
): void {
  const whitelistSet = new Set(
    receiverWhitelist
      .map((capability) => normalizeCapabilityName(capability))
      .filter((capability) => capability.length > 0),
  );
  const activeReceiverSet = new Set(
    Array.from(activeProviderCapabilities)
      .map((capability) => normalizeCapabilityName(capability))
      .filter(
        (capability) =>
          capability.length > 0 && !isStreamCapability(capability),
      ),
  );

  const missingInWhitelist = Array.from(activeReceiverSet)
    .filter((capability) => !whitelistSet.has(capability))
    .sort((a, b) => a.localeCompare(b));
  const staleInWhitelist = Array.from(whitelistSet)
    .filter((capability) => !activeReceiverSet.has(capability))
    .sort((a, b) => a.localeCompare(b));

  if (missingInWhitelist.length === 0 && staleInWhitelist.length === 0) {
    return;
  }

  throw new Error(
    `Receiver capability whitelist drift detected: missingInWhitelist=[${missingInWhitelist.join(", ")}], staleInWhitelist=[${staleInWhitelist.join(", ")}]`,
  );
}

/**
 * 数据接收操作类型常量
 */
export const RECEIVER_OPERATIONS = Object.freeze({
  HANDLE_REQUEST: "handleRequest",
  VALIDATE_REQUEST: "validateRequest",
  DETERMINE_PROVIDER: "determineOptimalProvider",
  VALIDATE_PREFERRED_PROVIDER: "validatePreferredProvider",
  TRANSFORM_SYMBOLS: "transformSymbols",
  EXECUTE_DATA_FETCHING: "executeDataFetching",
  RECORD_PERFORMANCE: "recordPerformanceMetrics",
  INFER_MARKET: "inferMarketFromSymbols",
  GET_MARKET_FROM_SYMBOL: "getMarketFromSymbol",
} as const);
