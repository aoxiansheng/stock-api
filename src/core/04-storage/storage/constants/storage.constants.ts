import { HTTP_TIMEOUTS } from "@common/constants/semantic";
import { RETRY_BUSINESS_SCENARIOS } from "@common/constants/semantic/retry-semantics.constants";

// 注意：错误消息和警告消息已迁移到 storage-error-codes.constants.ts 中
// 统一使用 STORAGE_ERROR_MESSAGES 和 STORAGE_WARNING_MESSAGES
// 为了向后兼容性，重新导出这些常量
export { STORAGE_ERROR_MESSAGES, STORAGE_WARNING_MESSAGES } from './storage-error-codes.constants';

/**
 * 安全地从环境变量中解析整数，处理'0'和无效值。
 * @param value 环境变量的值
 * @param defaultValue 默认值
 * @returns 解析后的整数或默认值
 */
const parseEnvInt = (value: string | undefined, defaultValue: number): number => {
  if (value === undefined || value === null || value.trim() === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * 安全地从环境变量中解析浮点数，处理'0'和无效值。
 * @param value 环境变量的值
 * @param defaultValue 默认值
 * @returns 解析后的浮点数或默认值
 */
const parseEnvFloat = (value: string | undefined, defaultValue: number): number => {
  if (value === undefined || value === null || value.trim() === '') {
    return defaultValue;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * 存储配置常量
 */
export const STORAGE_CONFIG = Object.freeze({
  DEFAULT_COMPRESSION_THRESHOLD: parseEnvInt(
    process.env.STORAGE_COMPRESS_THRESHOLD,
    5 * 1024,
  ), // 默认压缩阈值（5KB）
  DEFAULT_COMPRESSION_RATIO: parseEnvFloat(
    process.env.STORAGE_COMPRESS_RATIO,
    0.8,
  ), // 默认压缩比例（80%）
  MAX_KEY_LENGTH: 250, // 最大键长度
  MAX_DATA_SIZE_MB: 16, // 最大数据大小（16MB）
  DEFAULT_RETRY_ATTEMPTS: RETRY_BUSINESS_SCENARIOS.STORAGE.maxAttempts, // 默认重试次数
  DEFAULT_TIMEOUT_MS: HTTP_TIMEOUTS.REQUEST.NORMAL_MS, // 默认超时时间
} as const);

/**
 * 存储性能阈值常量
 */
// 其余监控/批处理/健康检查相关常量已移除，聚焦核心功能
