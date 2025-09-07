/**
 * 操作状态枚举
 * 定义系统中所有操作的标准状态
 *
 * 位置：contracts/enums - 跨层共享的枚举定义
 * 用途：安全审计、系统监控、业务操作状态标准化
 */

/**
 * 操作状态枚举
 * 涵盖认证、授权、业务操作等各种场景的状态
 */
export enum OperationStatus {
  // 基础操作状态
  SUCCESS = "success",
  FAILED = "failed",
  PENDING = "pending",
  PROCESSING = "processing",
  CANCELLED = "cancelled",
  TIMEOUT = "timeout",

  // 认证相关状态
  AUTHENTICATED = "authenticated",
  UNAUTHENTICATED = "unauthenticated",
  AUTHORIZED = "authorized",
  UNAUTHORIZED = "unauthorized",

  // 安全相关状态
  BLOCKED = "blocked",

  // 系统状态
  ACTIVE = "active",
  INACTIVE = "inactive",
  DISABLED = "disabled",
  ENABLED = "enabled",

  // 数据操作状态
  CREATED = "created",
  UPDATED = "updated",
  RETRIEVED = "retrieved",

  // 网络相关状态
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  RECONNECTING = "reconnecting",

  // 业务流程状态
  INITIATED = "initiated",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  ABORTED = "aborted",
}


/**
 * 检查操作是否成功
 */
export function isSuccessOperation(status: OperationStatus): boolean {
  const successStatuses = [
    OperationStatus.SUCCESS,
    OperationStatus.AUTHENTICATED,
    OperationStatus.AUTHORIZED,
    OperationStatus.ACTIVE,
    OperationStatus.ENABLED,
    OperationStatus.CREATED,
    OperationStatus.UPDATED,
    OperationStatus.RETRIEVED,
    OperationStatus.CONNECTED,
    OperationStatus.COMPLETED,
  ];
  return successStatuses.includes(status);
}

/**
 * 检查操作是否失败
 */
export function isFailureOperation(status: OperationStatus): boolean {
  const failureStatuses = [
    OperationStatus.FAILED,
    OperationStatus.UNAUTHENTICATED,
    OperationStatus.UNAUTHORIZED,
    OperationStatus.BLOCKED,
    OperationStatus.TIMEOUT,
    OperationStatus.CANCELLED,
    OperationStatus.DISABLED,
    OperationStatus.DISCONNECTED,
    OperationStatus.ABORTED,
  ];
  return failureStatuses.includes(status);
}

/**
 * 检查操作是否进行中
 */
export function isInProgressOperation(status: OperationStatus): boolean {
  const inProgressStatuses = [
    OperationStatus.PENDING,
    OperationStatus.PROCESSING,
    OperationStatus.RECONNECTING,
    OperationStatus.IN_PROGRESS,
    OperationStatus.INITIATED,
  ];
  return inProgressStatuses.includes(status);
}


/**
 * 所有操作状态值数组
 */
export const ALL_OPERATION_STATUSES = Object.values(OperationStatus);

