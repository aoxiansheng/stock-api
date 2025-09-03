/**
 * 消息模板常量
 * 🎯 符合开发规范指南 - 使用模板减少重复，提高一致性
 *
 * 设计原则：
 * - 模板化：使用函数模板减少重复的消息定义
 * - 一致性：确保相同类型的消息使用统一格式
 * - 可扩展：便于添加新的消息模板类型
 * - 类型安全：提供完整的TypeScript类型支持
 */

import { deepFreeze } from "../../utils/object-immutability.util";

/**
 * 预定义资源类型常量
 * 用于NOT_FOUND等模板消息中的资源标识
 */
export const RESOURCE_TYPES = deepFreeze({
  USER: "用户",
  API_KEY: "API Key",
  DATA: "数据",
  RESOURCE: "资源",
  SYMBOL: "符号",
  MAPPING: "映射",
  CACHE: "缓存",
  SESSION: "会话",
  TOKEN: "令牌",
  PERMISSION: "权限",
  ROLE: "角色",
  CONFIG: "配置",
  SERVICE: "服务",
  PROVIDER: "提供商",
  MARKET: "市场",
  STOCK: "股票",
  INDEX: "指数",
  QUOTE: "报价",
} as const);

/**
 * 预定义操作类型常量
 * 用于操作结果消息模板
 */
export const OPERATION_TYPES = deepFreeze({
  CREATE: "创建",
  UPDATE: "更新",
  DELETE: "删除",
  QUERY: "查询",
  SAVE: "保存",
  LOAD: "加载",
  PROCESS: "处理",
  VALIDATE: "验证",
  AUTHENTICATE: "认证",
  AUTHORIZE: "授权",
  SYNC: "同步",
  IMPORT: "导入",
  EXPORT: "导出",
  BACKUP: "备份",
  RESTORE: "恢复",
  RESET: "重置",
  REFRESH: "刷新",
} as const);

/**
 * 消息模板函数集合
 * 通过模板函数减少重复的消息定义，提高维护性
 */
export const MESSAGE_TEMPLATES = deepFreeze({
  /**
   * 资源不存在消息模板
   * @param resource 资源类型，默认为"资源"
   * @returns 格式化的不存在消息
   * 
   * @example
   * MESSAGE_TEMPLATES.NOT_FOUND() // "资源不存在"
   * MESSAGE_TEMPLATES.NOT_FOUND("用户") // "用户不存在"
   * MESSAGE_TEMPLATES.NOT_FOUND(RESOURCE_TYPES.API_KEY) // "API Key不存在"
   */
  NOT_FOUND: (resource: string = RESOURCE_TYPES.RESOURCE) => `${resource}不存在`,

  /**
   * 资源已存在消息模板
   * @param resource 资源类型，默认为"资源"
   * @returns 格式化的已存在消息
   */
  ALREADY_EXISTS: (resource: string = RESOURCE_TYPES.RESOURCE) => `${resource}已存在`,

  /**
   * 操作成功消息模板
   * @param operation 操作类型，默认为"操作"
   * @returns 格式化的成功消息
   * 
   * @example
   * MESSAGE_TEMPLATES.OPERATION_SUCCESS() // "操作成功"
   * MESSAGE_TEMPLATES.OPERATION_SUCCESS("创建") // "创建成功"
   * MESSAGE_TEMPLATES.OPERATION_SUCCESS(OPERATION_TYPES.UPDATE) // "更新成功"
   */
  OPERATION_SUCCESS: (operation: string = "操作") => `${operation}成功`,

  /**
   * 操作失败消息模板
   * @param operation 操作类型，默认为"操作"
   * @returns 格式化的失败消息
   */
  OPERATION_FAILED: (operation: string = "操作") => `${operation}失败`,

  /**
   * 权限不足消息模板
   * @param action 具体动作，默认为"执行此操作"
   * @returns 格式化的权限不足消息
   * 
   * @example
   * MESSAGE_TEMPLATES.INSUFFICIENT_PERMISSION() // "权限不足，无法执行此操作"
   * MESSAGE_TEMPLATES.INSUFFICIENT_PERMISSION("访问此资源") // "权限不足，无法访问此资源"
   */
  INSUFFICIENT_PERMISSION: (action: string = "执行此操作") => `权限不足，无法${action}`,

  /**
   * 验证失败消息模板
   * @param field 字段名称，默认为"数据"
   * @returns 格式化的验证失败消息
   */
  VALIDATION_FAILED: (field: string = "数据") => `${field}验证失败`,

  /**
   * 连接失败消息模板
   * @param service 服务名称，默认为"服务"
   * @returns 格式化的连接失败消息
   */
  CONNECTION_FAILED: (service: string = "服务") => `连接${service}失败`,

  /**
   * 超时消息模板
   * @param operation 操作名称，默认为"操作"
   * @returns 格式化的超时消息
   */
  TIMEOUT: (operation: string = "操作") => `${operation}超时`,

  /**
   * 配置错误消息模板
   * @param configItem 配置项名称，默认为"配置"
   * @returns 格式化的配置错误消息
   */
  CONFIG_ERROR: (configItem: string = "配置") => `${configItem}配置错误`,

  /**
   * 资源锁定消息模板
   * @param resource 资源类型，默认为"资源"
   * @returns 格式化的资源锁定消息
   */
  RESOURCE_LOCKED: (resource: string = RESOURCE_TYPES.RESOURCE) => `${resource}被锁定`,

  /**
   * 资源过期消息模板
   * @param resource 资源类型，默认为"资源"
   * @returns 格式化的资源过期消息
   */
  RESOURCE_EXPIRED: (resource: string = RESOURCE_TYPES.RESOURCE) => `${resource}已过期`,
} as const);

/**
 * 常用消息快捷方式
 * 预定义常见资源和操作的消息，减少重复调用
 */
export const QUICK_MESSAGES = deepFreeze({
  // 常见资源不存在消息
  USER_NOT_FOUND: MESSAGE_TEMPLATES.NOT_FOUND(RESOURCE_TYPES.USER),
  API_KEY_NOT_FOUND: MESSAGE_TEMPLATES.NOT_FOUND(RESOURCE_TYPES.API_KEY),
  DATA_NOT_FOUND: MESSAGE_TEMPLATES.NOT_FOUND(RESOURCE_TYPES.DATA),
  RESOURCE_NOT_FOUND: MESSAGE_TEMPLATES.NOT_FOUND(RESOURCE_TYPES.RESOURCE),

  // 常见操作成功消息
  CREATE_SUCCESS: MESSAGE_TEMPLATES.OPERATION_SUCCESS(OPERATION_TYPES.CREATE),
  UPDATE_SUCCESS: MESSAGE_TEMPLATES.OPERATION_SUCCESS(OPERATION_TYPES.UPDATE),
  DELETE_SUCCESS: MESSAGE_TEMPLATES.OPERATION_SUCCESS(OPERATION_TYPES.DELETE),

  // 常见操作失败消息
  CREATE_FAILED: MESSAGE_TEMPLATES.OPERATION_FAILED(OPERATION_TYPES.CREATE),
  UPDATE_FAILED: MESSAGE_TEMPLATES.OPERATION_FAILED(OPERATION_TYPES.UPDATE),
  DELETE_FAILED: MESSAGE_TEMPLATES.OPERATION_FAILED(OPERATION_TYPES.DELETE),

  // 常见权限消息
  INSUFFICIENT_READ_PERMISSION: MESSAGE_TEMPLATES.INSUFFICIENT_PERMISSION("读取此资源"),
  INSUFFICIENT_WRITE_PERMISSION: MESSAGE_TEMPLATES.INSUFFICIENT_PERMISSION("修改此资源"),
  INSUFFICIENT_DELETE_PERMISSION: MESSAGE_TEMPLATES.INSUFFICIENT_PERMISSION("删除此资源"),
} as const);

// 导出类型定义
export type ResourceType = (typeof RESOURCE_TYPES)[keyof typeof RESOURCE_TYPES];
export type OperationType = (typeof OPERATION_TYPES)[keyof typeof OPERATION_TYPES];
export type MessageTemplate = (typeof MESSAGE_TEMPLATES)[keyof typeof MESSAGE_TEMPLATES];
export type QuickMessage = (typeof QUICK_MESSAGES)[keyof typeof QUICK_MESSAGES];

/**
 * 消息模板工具类
 * 提供便捷的消息生成方法
 */
export class MessageTemplateUtil {
  /**
   * 生成资源相关消息
   * @param template 消息模板类型
   * @param resource 资源类型
   */
  static resource(
    template: keyof typeof MESSAGE_TEMPLATES,
    resource: ResourceType
  ): string {
    const templateFunc = MESSAGE_TEMPLATES[template];
    return typeof templateFunc === 'function' ? templateFunc(resource) : '';
  }

  /**
   * 生成操作相关消息
   * @param template 消息模板类型
   * @param operation 操作类型
   */
  static operation(
    template: keyof typeof MESSAGE_TEMPLATES,
    operation: OperationType
  ): string {
    const templateFunc = MESSAGE_TEMPLATES[template];
    return typeof templateFunc === 'function' ? templateFunc(operation) : '';
  }

  /**
   * 检查消息模板是否存在
   * @param template 模板名称
   */
  static hasTemplate(template: string): boolean {
    return template in MESSAGE_TEMPLATES;
  }

  /**
   * 获取所有可用的消息模板名称
   */
  static getAvailableTemplates(): string[] {
    return Object.keys(MESSAGE_TEMPLATES);
  }
}