/**
 * basic-cache 模块常量聚合
 *
 * 目标：
 * - 作为 basic-cache 的本地常量入口
 * - 统一从 05-caching/shared/constants/cache-unified.constants.ts 重导缓存常量（SSOT）
 * - 提供注入令牌 CACHE_REDIS_CLIENT_TOKEN
 * - 其他导出按需最小占位（YAGNI），后续若有真实使用再补齐
 */

// 统一注入令牌（basic-cache 内使用）
export const CACHE_REDIS_CLIENT_TOKEN = 'CACHE_REDIS_CLIENT' as const;

// 从统一缓存常量处重导所需常量（保持单一事实来源）
export {
  CACHE_KEY_PREFIXES,
  CACHE_RESULT_STATUS,
  CACHE_PRIORITY,
} from '../../../foundation/constants/cache-unified.constants';

// 占位导出（按 YAGNI 最小化，若后续有真实使用场景再完善具体枚举/配置）
export const DATA_SOURCE = Object.freeze({} as const);
export const COMPRESSION_ALGORITHMS = Object.freeze({} as const);
export const CACHE_DEFAULTS = Object.freeze({} as const);
export const REDIS_SPECIAL_VALUES = Object.freeze({} as const);

