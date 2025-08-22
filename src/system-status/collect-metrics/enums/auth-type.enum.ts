// 重新导出统一的认证类型
export { AuthType } from "../../../common/types/enums/auth.enum";

/**
 * 认证状态枚举
 * 用于记录认证的结果状态
 */
export enum AuthStatus {
  SUCCESS = "success",
  FAILURE = "failure",
}

/**
 * 认证操作状态枚举
 * 用于记录各种操作的状态
 */
export enum OperationStatus {
  SUCCESS = "success",
  ERROR = "error",
  ALLOWED = "allowed",
  BLOCKED = "blocked",
  HIT = "hit",
  MISS = "miss",
}
