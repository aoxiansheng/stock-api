/**
 * 业务操作相关统一常量
 * 包含CRUD操作消息、操作类型等业务层面的标准定义
 *
 * 设计原则：
 * - 一致性：统一的消息格式和用词
 * - 语义化：清晰表达操作意图和结果
 * - 可扩展：便于添加新的业务操作类型
 * - 国际化就绪：为多语言支持预留接口
 */

import { OperationStatus } from "@monitoring/contracts/enums/operation-status.enum";

import { deepFreeze } from "../../utils/object-immutability.util";
import { QUICK_MESSAGES } from "./message-templates.constants";
export const OPERATION_CONSTANTS = deepFreeze({
  // CRUD操作消息
  CRUD_MESSAGES: {
    // 成功消息
    CREATE_SUCCESS: "创建成功",
    UPDATE_SUCCESS: "更新成功",
    DELETE_SUCCESS: "删除成功",
    QUERY_SUCCESS: "查询成功",
    SAVE_SUCCESS: "保存成功",
    IMPORT_SUCCESS: "导入成功",
    EXPORT_SUCCESS: "导出成功",
    SYNC_SUCCESS: "同步成功",

    // 失败消息
    CREATE_FAILED: "创建失败",
    UPDATE_FAILED: "更新失败",
    DELETE_FAILED: "删除失败",
    QUERY_FAILED: "查询失败",
    SAVE_FAILED: "保存失败",
    IMPORT_FAILED: "导入失败",
    EXPORT_FAILED: "导出失败",
    SYNC_FAILED: "同步失败",

    // 验证消息
    VALIDATION_FAILED: "数据验证失败",
    VALIDATION_SUCCESS: "数据验证成功",
    SCHEMA_VALIDATION_FAILED: "数据格式验证失败",
    BUSINESS_VALIDATION_FAILED: "业务规则验证失败",

    // 资源状态消息
    RESOURCE_NOT_FOUND: QUICK_MESSAGES.RESOURCE_NOT_FOUND, // 使用模板，避免重复
    RESOURCE_ALREADY_EXISTS: "资源已存在",
    RESOURCE_LOCKED: "资源被锁定",
    RESOURCE_EXPIRED: "资源已过期",
    RESOURCE_UNAVAILABLE: "资源暂时不可用",
    RESOURCE_CONFLICT: "资源冲突",

    // 权限相关消息
    PERMISSION_DENIED: "权限不足",
    ACCESS_DENIED: "访问被拒绝",
    AUTHENTICATION_REQUIRED: "需要身份验证",
    AUTHORIZATION_FAILED: "授权失败",

    // 处理状态消息
    PROCESSING_STARTED: "处理已开始",
    PROCESSING_COMPLETED: "处理已完成",
    PROCESSING_FAILED: "处理失败",
    PROCESSING_CANCELLED: "处理已取消",
    PROCESSING_TIMEOUT: "处理超时",
  } as const,

  // 操作类型定义
  OPERATION_TYPES: {
    // 基础CRUD操作
    CREATE: "create",
    READ: "read",
    UPDATE: "update",
    DELETE: "delete",

    // 扩展操作
    VALIDATE: "validate",
    PROCESS: "process",
    TRANSFORM: "transform",
    SYNC: "sync",
    IMPORT: "import",
    EXPORT: "export",

    // 批量操作
    BATCH_CREATE: "batch_create",
    BATCH_UPDATE: "batch_update",
    BATCH_DELETE: "batch_delete",

    // 查询操作
    QUERY: "query",
    SEARCH: "search",
    FILTER: "filter",
    AGGREGATE: "aggregate",

    // 系统操作
    BACKUP: "backup",
    RESTORE: "restore",
    CLEANUP: "cleanup",
    MAINTENANCE: "maintenance",
  } as const,

  // 数据状态定义
  DATA_STATES: {
    FRESH: "fresh", // 新鲜数据
    STALE: "stale", // 过期数据
    DIRTY: "dirty", // 脏数据
    CACHED: "cached", // 缓存数据
    PERSISTED: "persisted", // 持久化数据
    SYNCHRONIZED: "synchronized", // 已同步数据
    PENDING: OperationStatus.PENDING, // 待处理数据
    PROCESSING: "processing", // 处理中数据
    CORRUPTED: "corrupted", // 损坏数据
  } as const,

  // 业务优先级定义
  PRIORITY_LEVELS: {
    CRITICAL: "critical", // 关键优先级
    HIGH: "high", // 高优先级
    MEDIUM: "medium", // 中等优先级
    LOW: "low", // 低优先级
    BACKGROUND: "background", // 后台优先级
  } as const,

  // 数据质量等级
  QUALITY_LEVELS: {
    EXCELLENT: "excellent", // 优秀
    GOOD: "good", // 良好
    FAIR: "fair", // 一般
    POOR: "poor", // 较差
    UNKNOWN: "unknown", // 未知
  } as const,

  // 处理模式
  PROCESSING_MODES: {
    REAL_TIME: "real_time", // 实时处理
    BATCH: "batch", // 批量处理
    STREAMING: "streaming", // 流式处理
    SCHEDULED: "scheduled", // 定时处理
    ON_DEMAND: "on_demand", // 按需处理
  } as const,

  // 通知类型
  NOTIFICATION_TYPES: {
    INFO: "info", // 信息通知
    SUCCESS: "success", // 成功通知
    WARNING: "warning", // 警告通知
    ERROR: "error", // 错误通知
    CRITICAL: "critical", // 严重通知
  } as const,
});

// 导出类型定义
export type CrudMessage =
  (typeof OPERATION_CONSTANTS.CRUD_MESSAGES)[keyof typeof OPERATION_CONSTANTS.CRUD_MESSAGES];
export type OperationType =
  (typeof OPERATION_CONSTANTS.OPERATION_TYPES)[keyof typeof OPERATION_CONSTANTS.OPERATION_TYPES];
export type DataState =
  (typeof OPERATION_CONSTANTS.DATA_STATES)[keyof typeof OPERATION_CONSTANTS.DATA_STATES];
export type PriorityLevel =
  (typeof OPERATION_CONSTANTS.PRIORITY_LEVELS)[keyof typeof OPERATION_CONSTANTS.PRIORITY_LEVELS];
export type QualityLevel =
  (typeof OPERATION_CONSTANTS.QUALITY_LEVELS)[keyof typeof OPERATION_CONSTANTS.QUALITY_LEVELS];
export type ProcessingMode =
  (typeof OPERATION_CONSTANTS.PROCESSING_MODES)[keyof typeof OPERATION_CONSTANTS.PROCESSING_MODES];
export type NotificationType =
  (typeof OPERATION_CONSTANTS.NOTIFICATION_TYPES)[keyof typeof OPERATION_CONSTANTS.NOTIFICATION_TYPES];

/**
 * 根据操作类型获取对应的成功消息
 * @param operationType 操作类型
 */
export function getSuccessMessage(operationType: OperationType): string {
  const messageMap: Partial<Record<OperationType, CrudMessage>> = {
    create: OPERATION_CONSTANTS.CRUD_MESSAGES.CREATE_SUCCESS,
    update: OPERATION_CONSTANTS.CRUD_MESSAGES.UPDATE_SUCCESS,
    delete: OPERATION_CONSTANTS.CRUD_MESSAGES.DELETE_SUCCESS,
    read: OPERATION_CONSTANTS.CRUD_MESSAGES.QUERY_SUCCESS,
    query: OPERATION_CONSTANTS.CRUD_MESSAGES.QUERY_SUCCESS,
    import: OPERATION_CONSTANTS.CRUD_MESSAGES.IMPORT_SUCCESS,
    export: OPERATION_CONSTANTS.CRUD_MESSAGES.EXPORT_SUCCESS,
    sync: OPERATION_CONSTANTS.CRUD_MESSAGES.SYNC_SUCCESS,
    validate: OPERATION_CONSTANTS.CRUD_MESSAGES.VALIDATION_SUCCESS,
  };

  return (
    messageMap[operationType] ||
    OPERATION_CONSTANTS.CRUD_MESSAGES.PROCESSING_COMPLETED
  );
}

/**
 * 根据操作类型获取对应的失败消息
 * @param operationType 操作类型
 */
export function getFailureMessage(operationType: OperationType): string {
  const messageMap: Partial<Record<OperationType, CrudMessage>> = {
    create: OPERATION_CONSTANTS.CRUD_MESSAGES.CREATE_FAILED,
    update: OPERATION_CONSTANTS.CRUD_MESSAGES.UPDATE_FAILED,
    delete: OPERATION_CONSTANTS.CRUD_MESSAGES.DELETE_FAILED,
    read: OPERATION_CONSTANTS.CRUD_MESSAGES.QUERY_FAILED,
    query: OPERATION_CONSTANTS.CRUD_MESSAGES.QUERY_FAILED,
    import: OPERATION_CONSTANTS.CRUD_MESSAGES.IMPORT_FAILED,
    export: OPERATION_CONSTANTS.CRUD_MESSAGES.EXPORT_FAILED,
    sync: OPERATION_CONSTANTS.CRUD_MESSAGES.SYNC_FAILED,
    validate: OPERATION_CONSTANTS.CRUD_MESSAGES.VALIDATION_FAILED,
  };

  return (
    messageMap[operationType] ||
    OPERATION_CONSTANTS.CRUD_MESSAGES.PROCESSING_FAILED
  );
}

/**
 * 检查操作类型是否为查询类操作
 * @param operationType 操作类型
 */
export function isQueryOperation(operationType: OperationType): boolean {
  const queryOperations: OperationType[] = [
    "read",
    "query",
    "search",
    "filter",
    "aggregate",
  ];
  return queryOperations.includes(operationType);
}

/**
 * 检查操作类型是否为修改类操作
 * @param operationType 操作类型
 */
export function isMutationOperation(operationType: OperationType): boolean {
  const mutationOperations: OperationType[] = [
    "create",
    "update",
    "delete",
    "batch_create",
    "batch_update",
    "batch_delete",
    "import",
    "sync",
    "backup",
    "restore",
    "cleanup",
  ];
  return mutationOperations.includes(operationType);
}

/**
 * 检查操作类型是否为批量操作
 * @param operationType 操作类型
 */
export function isBatchOperation(operationType: OperationType): boolean {
  return (
    operationType.startsWith("batch_") ||
    ["import", "export", "sync", "cleanup"].includes(operationType)
  );
}

/**
 * 根据数据状态判断是否需要刷新
 * @param dataState 数据状态
 */
export function shouldRefreshData(dataState: DataState): boolean {
  const refreshRequiredStates: DataState[] = ["stale", "dirty", "corrupted"];
  return refreshRequiredStates.includes(dataState);
}

/**
 * 根据优先级获取处理顺序权重
 * @param priority 优先级
 */
export function getPriorityWeight(priority: PriorityLevel): number {
  const weightMap: Record<PriorityLevel, number> = {
    critical: 100,
    high: 80,
    medium: 60,
    low: 40,
    background: 20,
  };

  return weightMap[priority];
}
