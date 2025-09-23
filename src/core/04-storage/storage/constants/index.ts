/**
 * Storage Constants Index
 * 🎯 统一导出存储相关的所有常量
 *
 * 重构说明：
 * - 错误消息和警告消息已合并到 storage-error-codes.constants.ts
 * - storage.constants.ts 重新导出错误相关常量以保持向后兼容性
 * - 建议新代码直接从 storage-error-codes.constants.ts 导入错误相关常量
 */

// 主要配置和业务常量
export * from './storage.constants';

// 错误码和错误消息（推荐直接使用）
export * from './storage-error-codes.constants';