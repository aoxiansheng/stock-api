/**
 * 提供商元数据键值常量
 * 职责：统一管理装饰器和依赖注入的元数据键值
 */

/**
 * 元数据键值常量
 * 统一管理所有装饰器和依赖注入的元数据键值
 */
export const METADATA_KEYS = {
  PROVIDER_METADATA: Symbol("provider:metadata"),
  CAPABILITY_METADATA: Symbol("capability:metadata"),
  HEALTH_CHECK_METADATA: Symbol("health-check:metadata"),
} as const;

// 为了兼容性，提供旧的命名导出
export const PROVIDER_METADATA_KEY = METADATA_KEYS.PROVIDER_METADATA;
export const CAPABILITY_METADATA_KEY = METADATA_KEYS.CAPABILITY_METADATA;

// 类型定义
export type MetadataKey = (typeof METADATA_KEYS)[keyof typeof METADATA_KEYS];

/**
 * 元数据键值验证函数
 */
export function validateMetadataKeys(): boolean {
  const requiredKeys = [
    "PROVIDER_METADATA",
    "CAPABILITY_METADATA",
    "STREAM_METADATA",
    "HEALTH_CHECK_METADATA",
  ];

  return requiredKeys.every((key) => key in METADATA_KEYS);
}
