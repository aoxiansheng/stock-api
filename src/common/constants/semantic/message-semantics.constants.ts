/**
 * 消息模板语义常量
 * 🎯 Semantic层 - 消息模板的业务无关语义分类
 * 📋 基于Foundation层构建，专注于消息语义分类
 * 🆕 从Unified层迁移，解决消息模板重复定义问题
 */

import { CORE_VALUES } from '../foundation';

/**
 * 基础消息语义模板
 * 🎯 解决BASE_MESSAGES重复定义问题
 */
export const MESSAGE_SEMANTICS = Object.freeze({
  // 权限相关基础消息语义 - 🆕 从permission-message.constants.ts迁移并扩充
  PERMISSION: {
    // 通用权限消息
    INSUFFICIENT: "权限不足",
    ACCESS_DENIED: "访问被拒绝",
    UNAUTHORIZED_ACCESS: "未授权访问",
    
    // 角色权限消息
    ROLE_INSUFFICIENT: "角色权限不足",
    DENIED: "权限被拒绝",
    
    // API Key权限消息
    API_KEY_INSUFFICIENT: "API Key权限不足",
    
    // 数据库访问权限消息
    DB_ACCESS_DENIED: "数据库访问权限不足",
    
    // 资源权限消息
    
    // 功能权限消息
  },

  // 资源相关基础消息语义
  RESOURCE: {
    NOT_FOUND: "资源未找到",
    ALREADY_EXISTS: "资源已存在",
  },

  // 操作相关基础消息语义
  OPERATION: {
    SUCCESS: "操作成功",
    FAILED: "操作失败",
    PROCESSING: "操作处理中",
    TIMEOUT: "操作超时",
  },

  // 服务相关基础消息语义
  SERVICE: {
    ERROR: "服务错误",
    TIMEOUT: "服务超时",
  },

  // 网络相关基础消息语义
  NETWORK: {
  },

  // 数据相关基础消息语义
  DATA: {
  },

  // 验证相关基础消息语义
  VALIDATION: {
    FAILED: "验证失败",
    INVALID_FORMAT: "格式无效",
  },

  // 时间相关基础消息语义
  TIME: {
    TIMEOUT: "超时",
  },

  // 配置相关基础消息语义
  CONFIG: {
  },
});

/**
 * 消息模板参数化工具
 * 🎯 支持变量替换的消息模板系统
 */
export const MESSAGE_TEMPLATE_SEMANTICS = Object.freeze({
  // 参数化模板
  TEMPLATES: {
    RESOURCE_NOT_FOUND: "{resource}未找到",
    RESOURCE_ALREADY_EXISTS: "{resource}已存在",
    OPERATION_FAILED_WITH_REASON: "{operation}失败: {reason}",
    VALIDATION_ERROR_FIELD: "字段'{field}'验证失败: {message}",
    PERMISSION_DENIED_RESOURCE: "没有权限访问{resource}",
    RATE_LIMIT_EXCEEDED: "{endpoint}请求频率超限，请等待{waitTime}秒",
    SERVICE_TIMEOUT: "{service}服务响应超时({timeout}ms)",
    DATA_SIZE_EXCEEDED: "数据大小({actualSize})超出限制({maxSize})",
    INVALID_PARAMETER: "参数'{parameter}'无效: {expected}",
    QUOTA_EXCEEDED: "{resource}配额已满({current}/{limit})",
  },

  // 快速消息(无参数)
  QUICK: {
    // 成功消息
    SUCCESS: "成功",
    CREATED: "创建成功", 
    UPDATED: "更新成功",
    DELETED: "删除成功",
    SAVED: "保存成功",
    
    // 失败消息
    FAILED: "失败",
    ERROR: "错误",
    TIMEOUT: "超时",
    CANCELLED: "已取消",
    ABORTED: "已中止",
    
    // 状态消息
    LOADING: "加载中...",
    PROCESSING: "处理中...",
    PENDING: "待处理",
    COMPLETED: "已完成",
    IN_PROGRESS: "进行中",
  },

  // 消息优先级语义
  PRIORITIES: {
    LOW: 1,
    NORMAL: 2, 
    HIGH: 3,
    CRITICAL: 4,
    EMERGENCY: 5,
  },

  // 消息类型语义
  TYPES: {
    INFO: "info",
    SUCCESS: "success",
    WARNING: "warning", 
    ERROR: "error",
    DEBUG: "debug",
  },
});

/**
 * 消息格式化语义
 * 🎯 统一消息格式标准
 */
export const MESSAGE_FORMAT_SEMANTICS = Object.freeze({
  // 日志格式语义
  LOG_FORMATS: {
  },

  // 消息长度限制语义 - 基于Foundation层
  LENGTH_LIMITS: {
    MEDIUM_MESSAGE: CORE_VALUES.QUANTITIES.FIVE_HUNDRED, // 500字符 - 中等消息  
    DESCRIPTION: CORE_VALUES.QUANTITIES.TWO_THOUSAND,   // 2000字符 - 描述信息
  },

  // 消息分隔符语义
  SEPARATORS: {
    FIELD: " | ",           // 字段分隔
    LIST: ", ",             // 列表分隔
    NAMESPACE: "::",        // 命名空间分隔
  },
});

/**
 * 消息语义工具函数类
 * 🎯 语义层专用消息处理工具
 */
export class MessageSemanticsUtil {
  /**
   * 格式化参数化模板
   */
  static formatTemplate(template: string, params: Record<string, any>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] !== undefined ? String(params[key]) : match;
    });
  }

  /**
   * 🆕 权限消息工具方法 - 从permission-message.constants.ts迁移
   * 获取具体资源的权限拒绝消息
   */
  static getResourceDeniedMessage(resource: string): string {
    return `${resource}访问权限不足`;
  }

  /**
   * 获取具体操作的权限拒绝消息
   */
  static getOperationDeniedMessage(operation: string): string {
    return `无权执行${operation}操作`;
  }

  /**
   * 获取角色相关的权限消息
   */
  static getRolePermissionMessage(role: string): string {
    return `需要${role}角色权限`;
  }

  /**
   * 生成资源相关消息
   */
  static generateResourceMessage(
    resource: string, 
    operation: 'not_found' | 'already_exists' | 'access_denied'
  ): string {
    const templates = {
      not_found: MESSAGE_TEMPLATE_SEMANTICS.TEMPLATES.RESOURCE_NOT_FOUND,
      already_exists: MESSAGE_TEMPLATE_SEMANTICS.TEMPLATES.RESOURCE_ALREADY_EXISTS,
      access_denied: MESSAGE_TEMPLATE_SEMANTICS.TEMPLATES.PERMISSION_DENIED_RESOURCE,
    };
    
    return this.formatTemplate(templates[operation], { resource });
  }

  /**
   * 生成验证错误消息
   */
  static generateValidationMessage(field: string, message: string): string {
    return this.formatTemplate(
      MESSAGE_TEMPLATE_SEMANTICS.TEMPLATES.VALIDATION_ERROR_FIELD,
      { field, message }
    );
  }

  /**
   * 生成频率限制消息
   */
  static generateRateLimitMessage(endpoint: string, waitTime: number): string {
    return this.formatTemplate(
      MESSAGE_TEMPLATE_SEMANTICS.TEMPLATES.RATE_LIMIT_EXCEEDED,
      { endpoint, waitTime }
    );
  }

  /**
   * 截断长消息
   */
  static truncateMessage(message: string, maxLength: number = MESSAGE_FORMAT_SEMANTICS.LENGTH_LIMITS.MEDIUM_MESSAGE): string {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength - 3) + '...';
  }

  /**
   * 获取消息优先级文本
   */
  static getPriorityText(priority: number): string {
    const priorities = MESSAGE_TEMPLATE_SEMANTICS.PRIORITIES;
    const entries = Object.entries(priorities);
    const found = entries.find(([, value]) => value === priority);
    return found ? found[0].toLowerCase() : 'unknown';
  }

  /**
   * 验证消息类型
   */
  static isValidMessageType(type: string): boolean {
    return Object.values(MESSAGE_TEMPLATE_SEMANTICS.TYPES).includes(type as any);
  }

  /**
   * 构建结构化日志消息
   */
  static buildLogMessage(
    level: string,
    message: string, 
    context?: Record<string, any>,
    timestamp: Date = new Date()
  ): string {
    const parts = [
      timestamp.toISOString(),
      `[${level.toUpperCase()}]`,
      message
    ];
    
    if (context && Object.keys(context).length > 0) {
      const contextStr = Object.entries(context)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(MESSAGE_FORMAT_SEMANTICS.SEPARATORS.LIST);
      parts.push(`(${contextStr})`);
    }
    
    return parts.join(MESSAGE_FORMAT_SEMANTICS.SEPARATORS.FIELD);
  }
}

/**
 * 从Unified层迁移：资源类型常量
 * 🎯 解决message-templates.constants.ts重复定义问题
 */
export const RESOURCE_TYPE_SEMANTICS = Object.freeze({
  USER: "用户",
  API_KEY: "API Key",
  DATA: "数据",
  RESOURCE: "资源",
  SYMBOL: "符号",
  MAPPING: "映射",
  CACHE: "缓存",
  TOKEN: "令牌",
  PERMISSION: "权限",
  ROLE: "角色",
  CONFIG: "配置",
  PROVIDER: "提供商",
  MARKET: "市场",
  STOCK: "股票",
  QUOTE: "报价",
});

/**
 * 从Unified层迁移：操作类型常量
 * 🎯 解决message-templates.constants.ts重复定义问题
 */
export const OPERATION_TYPE_SEMANTICS = Object.freeze({
  CREATE: "创建",
  UPDATE: "更新",
  DELETE: "删除",
  QUERY: "查询",
  PROCESS: "处理",
});

/**
 * 从Unified层迁移：消息模板函数集合
 * 🎯 解决MESSAGE_TEMPLATES重复定义问题，提供语义化模板函数
 */
export const MESSAGE_TEMPLATE_FUNCTIONS = Object.freeze({
  // 资源相关模板函数
  NOT_FOUND: (resource: string = RESOURCE_TYPE_SEMANTICS.RESOURCE) => `${resource}不存在`,
  ALREADY_EXISTS: (resource: string = RESOURCE_TYPE_SEMANTICS.RESOURCE) => `${resource}已存在`,
  RESOURCE_LOCKED: (resource: string = RESOURCE_TYPE_SEMANTICS.RESOURCE) => `${resource}被锁定`,
  RESOURCE_EXPIRED: (resource: string = RESOURCE_TYPE_SEMANTICS.RESOURCE) => `${resource}已过期`,
  RESOURCE_EXISTS: (resource: string = RESOURCE_TYPE_SEMANTICS.RESOURCE) => `${resource}已存在`,

  // 操作相关模板函数
  OPERATION_SUCCESS: (operation: string = "操作") => `${operation}成功`,
  OPERATION_FAILED: (operation: string = "操作") => `${operation}失败`,
  OPERATION_TIMEOUT: (operation: string = "操作") => `${operation}超时`,

  // 权限相关模板函数 - 引用基础语义定义避免重复
  INSUFFICIENT_PERMISSION: (action: string = "执行此操作") => `${MESSAGE_SEMANTICS.PERMISSION.INSUFFICIENT}，无法${action}`,
  AUTHORIZATION_FAILED: (resource: string = "操作") => `${resource}授权失败`,

  // 连接和超时模板函数
  CONNECTION_FAILED: (service: string = "服务") => `连接${service}失败`,
  CONNECTION_TIMEOUT: (target: string = "服务") => `连接${target}超时`,
  REQUEST_TIMEOUT: (resource: string = "请求") => `${resource}超时，请稍后重试`,
  TIMEOUT: (operation: string = "操作") => `${operation}超时`,

  // 服务相关模板函数
  SERVICE_UNAVAILABLE: (service: string = "服务") => `${service}暂时不可用`,
  CONFIG_ERROR: (configItem: string = "配置") => `${configItem}配置错误`,

  // 验证相关模板函数
  VALIDATION_FAILED: (field: string = "数据") => `${field}验证失败`,
  INVALID_VALUE: (field: string = "值") => `无效的${field}`,
});

/**
 * 从Unified层迁移：常用消息快捷方式
 * 🎯 解决QUICK_MESSAGES重复定义问题，预定义常见消息
 */
export const QUICK_MESSAGE_SEMANTICS = Object.freeze({
  // 常见资源不存在消息
  DATA_NOT_FOUND: MESSAGE_TEMPLATE_FUNCTIONS.NOT_FOUND(RESOURCE_TYPE_SEMANTICS.DATA),
  RESOURCE_NOT_FOUND: MESSAGE_TEMPLATE_FUNCTIONS.NOT_FOUND(RESOURCE_TYPE_SEMANTICS.RESOURCE),
  API_KEY_NOT_FOUND: MESSAGE_TEMPLATE_FUNCTIONS.NOT_FOUND(RESOURCE_TYPE_SEMANTICS.API_KEY),

  // 常见操作成功消息

  // 常见操作失败消息
  DELETE_FAILED: MESSAGE_TEMPLATE_FUNCTIONS.OPERATION_FAILED(OPERATION_TYPE_SEMANTICS.DELETE),

  // 常见权限消息

  // 常见超时消息

  // 常见服务不可用消息
  DATABASE_UNAVAILABLE: MESSAGE_TEMPLATE_FUNCTIONS.SERVICE_UNAVAILABLE("数据库"),
  API_SERVICE_UNAVAILABLE: MESSAGE_TEMPLATE_FUNCTIONS.SERVICE_UNAVAILABLE("API服务"),
  SERVICE_UNAVAILABLE: MESSAGE_TEMPLATE_FUNCTIONS.SERVICE_UNAVAILABLE("服务"),

  // 常见失败消息

  // 常见已存在消息

  // 常见无效值消息
});

/**
 * 从Unified层迁移：消息模板工具类
 * 🎯 提供便捷的消息生成方法，替代原MessageTemplateUtil
 */
export class MessageTemplateSemanticsUtil {
  /**
   * 生成资源相关消息
   * @param template 消息模板类型
   * @param resource 资源类型
   */
  static resource(
    template: keyof typeof MESSAGE_TEMPLATE_FUNCTIONS,
    resource: string
  ): string {
    const templateFunc = MESSAGE_TEMPLATE_FUNCTIONS[template];
    return typeof templateFunc === 'function' ? templateFunc(resource) : '';
  }

  /**
   * 生成操作相关消息
   * @param template 消息模板类型
   * @param operation 操作类型
   */
  static operation(
    template: keyof typeof MESSAGE_TEMPLATE_FUNCTIONS,
    operation: string
  ): string {
    const templateFunc = MESSAGE_TEMPLATE_FUNCTIONS[template];
    return typeof templateFunc === 'function' ? templateFunc(operation) : '';
  }

  /**
   * 检查消息模板是否存在
   * @param template 模板名称
   */
  static hasTemplate(template: string): boolean {
    return template in MESSAGE_TEMPLATE_FUNCTIONS;
  }

  /**
   * 获取所有可用的消息模板名称
   */
  static getAvailableTemplates(): string[] {
    return Object.keys(MESSAGE_TEMPLATE_FUNCTIONS);
  }
}

/**
 * 🆕 权限消息兼容性别名 - 从permission-message.constants.ts迁移
 * 为了向后兼容，提供常用的别名 - 引用基础语义避免重复
 */
export const PERMISSION_MESSAGE_ALIASES = Object.freeze({
  // 与现有代码兼容的别名 - 引用基础定义避免重复
});

/**
 * 🆕 权限消息常量 - 从permission-message.constants.ts迁移的向后兼容导出
 */
export const PERMISSION_MESSAGES = MESSAGE_SEMANTICS.PERMISSION;

/**
 * 🆕 权限消息工具函数 - 从permission-message.constants.ts迁移的向后兼容导出
 */
export const PERMISSION_UTILS = Object.freeze({
  getResourceDeniedMessage: MessageSemanticsUtil.getResourceDeniedMessage,
  getOperationDeniedMessage: MessageSemanticsUtil.getOperationDeniedMessage,
  getRolePermissionMessage: MessageSemanticsUtil.getRolePermissionMessage,
});

/**
 * 类型定义
 */
export type MessageSemantics = typeof MESSAGE_SEMANTICS;
export type MessageTemplateSemantics = typeof MESSAGE_TEMPLATE_SEMANTICS;
export type MessageFormatSemantics = typeof MESSAGE_FORMAT_SEMANTICS;
export type ResourceTypeSemantics = typeof RESOURCE_TYPE_SEMANTICS;
export type OperationTypeSemantics = typeof OPERATION_TYPE_SEMANTICS;
export type MessageTemplateFunctions = typeof MESSAGE_TEMPLATE_FUNCTIONS;
export type QuickMessageSemantics = typeof QUICK_MESSAGE_SEMANTICS;

// 🆕 权限消息相关类型定义 - 从permission-message.constants.ts迁移
export type PermissionMessageKey = keyof typeof MESSAGE_SEMANTICS.PERMISSION;
export type PermissionMessages = typeof PERMISSION_MESSAGES;
export type PermissionMessageAliases = typeof PERMISSION_MESSAGE_ALIASES;