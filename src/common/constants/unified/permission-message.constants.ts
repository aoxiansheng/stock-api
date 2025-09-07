/**
 * 统一权限消息常量
 * 🎯 解决权限相关消息在多个位置重复定义的问题
 * 
 * 解决的重复位置：
 * - DB_ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS
 * - AUTH_ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS
 * - AUTH_ERROR_MESSAGES.PERMISSION_DENIED
 * - AUTH_ERROR_MESSAGES.ROLE_INSUFFICIENT
 * - AUTH_ERROR_MESSAGES.API_KEY_PERMISSIONS_INSUFFICIENT
 *
 * 设计原则：
 * - 集中管理：所有权限相关消息统一定义
 * - 语义明确：每个权限级别有明确的消息定义
 * - 易于维护：单一数据源，避免不一致问题
 * - 类型安全：使用deepFreeze确保运行时不可变
 */

import { deepFreeze } from "../../utils/object-immutability.util";

/**
 * 权限消息常量集合
 * 按照权限类型和场景分类组织
 */
export const PERMISSION_MESSAGES = deepFreeze({
  // 通用权限消息
  INSUFFICIENT: "权限不足",
  DENIED: "权限被拒绝",
  ACCESS_DENIED: "访问被拒绝",
  
  // 角色权限消息
  ROLE_INSUFFICIENT: "角色权限不足",
  ROLE_REQUIRED: "需要特定角色权限",
  
  // API Key权限消息
  API_KEY_INSUFFICIENT: "API Key权限不足",
  API_KEY_ACCESS_DENIED: "API Key访问被拒绝",
  API_KEY_OPERATION_DENIED: "API Key无权执行此操作",
  
  // 数据库访问权限消息
  DB_ACCESS_DENIED: "数据库访问权限不足",
  DB_OPERATION_DENIED: "数据库操作权限不足",
  
  // 资源权限消息
  RESOURCE_ACCESS_DENIED: "资源访问权限不足",
  RESOURCE_OPERATION_DENIED: "资源操作权限不足",
  
  // 功能权限消息
  FEATURE_ACCESS_DENIED: "功能访问权限不足",
  OPERATION_NOT_ALLOWED: "操作不被允许",
});

/**
 * 权限消息类型定义
 * 提供完整的TypeScript类型支持
 */
export type PermissionMessageKey = keyof typeof PERMISSION_MESSAGES;

/**
 * 权限消息工具函数
 * 提供便捷的权限消息构建方法
 */
export const PERMISSION_UTILS = deepFreeze({
  /**
   * 获取具体资源的权限拒绝消息
   * @param resource 资源名称
   * @returns 格式化的权限拒绝消息
   */
  getResourceDeniedMessage: (resource: string): string => 
    `${resource}访问权限不足`,
    
  /**
   * 获取具体操作的权限拒绝消息
   * @param operation 操作名称
   * @returns 格式化的操作权限拒绝消息
   */
  getOperationDeniedMessage: (operation: string): string => 
    `无权执行${operation}操作`,
    
  /**
   * 获取角色相关的权限消息
   * @param role 角色名称
   * @returns 格式化的角色权限消息
   */
  getRolePermissionMessage: (role: string): string => 
    `需要${role}角色权限`,
});

/**
 * 兼容性别名
 * 为了向后兼容，提供常用的别名
 */
export const PERMISSION_ALIASES = deepFreeze({
  // 与现有代码兼容的别名
  INSUFFICIENT_PERMISSIONS: PERMISSION_MESSAGES.INSUFFICIENT,
  PERMISSION_DENIED: PERMISSION_MESSAGES.DENIED,
  ROLE_INSUFFICIENT: PERMISSION_MESSAGES.ROLE_INSUFFICIENT,
  API_KEY_INSUFFICIENT_PERM: PERMISSION_MESSAGES.API_KEY_INSUFFICIENT,
  DB_INSUFFICIENT_PERMISSIONS: PERMISSION_MESSAGES.DB_ACCESS_DENIED,
});

// 默认导出权限消息常量
export default PERMISSION_MESSAGES;