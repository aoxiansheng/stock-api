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
    DENIED: "权限被拒绝",
    ACCESS_DENIED: "访问被拒绝",
    INSUFFICIENT_PRIVILEGES: "权限不足", 
    UNAUTHORIZED_ACCESS: "未授权访问",
    FORBIDDEN_OPERATION: "禁止的操作",
    AUTHENTICATION_REQUIRED: "需要身份验证",
    AUTHORIZATION_FAILED: "授权失败",
    PERMISSION_DENIED: "权限拒绝",
    ACCESS_RESTRICTED: "访问受限",
    
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
  },

  // 资源相关基础消息语义
  RESOURCE: {
    NOT_FOUND: "资源未找到",
    ALREADY_EXISTS: "资源已存在",
    CREATION_FAILED: "资源创建失败",
    UPDATE_FAILED: "资源更新失败", 
    DELETION_FAILED: "资源删除失败",
    ACCESS_FAILED: "资源访问失败",
    LOCKED: "资源被锁定",
    EXPIRED: "资源已过期",
    UNAVAILABLE: "资源不可用",
    CORRUPTED: "资源已损坏",
  },

  // 操作相关基础消息语义
  OPERATION: {
    SUCCESS: "操作成功",
    FAILED: "操作失败",
    PENDING: "操作待处理", 
    PROCESSING: "操作处理中",
    COMPLETED: "操作已完成",
    CANCELLED: "操作已取消",
    TIMEOUT: "操作超时",
    ABORTED: "操作已中止",
    RETRY_REQUIRED: "需要重试操作",
    INVALID_OPERATION: "无效操作",
  },

  // 服务相关基础消息语义
  SERVICE: {
    UNAVAILABLE: "服务不可用",
    MAINTENANCE: "服务维护中",
    OVERLOADED: "服务过载",
    DEGRADED: "服务降级",
    STARTUP: "服务启动中", 
    SHUTDOWN: "服务关闭中",
    ERROR: "服务错误",
    RECOVERY: "服务恢复中",
    TIMEOUT: "服务超时",
    CONNECTION_FAILED: "服务连接失败",
  },

  // 网络相关基础消息语义
  NETWORK: {
    CONNECTION_ERROR: "网络连接错误",
    TIMEOUT_ERROR: "网络超时",
    UNREACHABLE: "网络不可达",
    INTERRUPTED: "网络中断",
    SLOW_CONNECTION: "网络连接缓慢",
    DNS_RESOLUTION_FAILED: "DNS解析失败",
    SSL_ERROR: "SSL错误",
    PROXY_ERROR: "代理错误",
    BANDWIDTH_EXCEEDED: "带宽超限",
    CONNECTION_REFUSED: "连接被拒绝",
  },

  // 数据相关基础消息语义
  DATA: {
    INVALID_FORMAT: "数据格式无效",
    CORRUPTION_DETECTED: "检测到数据损坏", 
    SYNC_FAILED: "数据同步失败",
    BACKUP_FAILED: "数据备份失败",
    RESTORE_FAILED: "数据恢复失败",
    MIGRATION_FAILED: "数据迁移失败",
    CONSISTENCY_ERROR: "数据一致性错误",
    INTEGRITY_VIOLATION: "数据完整性违规", 
    SIZE_EXCEEDED: "数据大小超限",
    ENCODING_ERROR: "数据编码错误",
  },

  // 验证相关基础消息语义
  VALIDATION: {
    FAILED: "验证失败",
    REQUIRED_FIELD: "必填字段",
    INVALID_FORMAT: "格式无效",
    OUT_OF_RANGE: "超出范围",
    TOO_SHORT: "长度过短",
    TOO_LONG: "长度过长",
    PATTERN_MISMATCH: "格式不匹配",
    DUPLICATE_VALUE: "重复值",
    INVALID_TYPE: "类型无效", 
    CONSTRAINT_VIOLATION: "约束违规",
  },

  // 时间相关基础消息语义
  TIME: {
    EXPIRED: "已过期",
    NOT_YET_VALID: "尚未生效",
    TIMEOUT: "超时",
    SCHEDULE_CONFLICT: "时间冲突", 
    INVALID_DURATION: "无效时长",
    INVALID_TIMEZONE: "无效时区",
    PARSE_ERROR: "时间解析错误",
    FORMAT_ERROR: "时间格式错误",
    OUT_OF_RANGE: "时间超出范围",
    SYNCHRONIZATION_ERROR: "时间同步错误",
  },

  // 配置相关基础消息语义
  CONFIG: {
    MISSING: "配置缺失",
    INVALID: "配置无效",
    LOAD_FAILED: "配置加载失败",
    SAVE_FAILED: "配置保存失败",
    PARSE_ERROR: "配置解析错误",
    VALIDATION_FAILED: "配置验证失败",
    CONFLICT: "配置冲突",
    OUTDATED: "配置过期",
    RESET_REQUIRED: "需要重置配置",
    MIGRATION_REQUIRED: "需要配置迁移",
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
    TIMESTAMP: "YYYY-MM-DD HH:mm:ss",
    DATE_ONLY: "YYYY-MM-DD",
    TIME_ONLY: "HH:mm:ss",
    ISO_FORMAT: "YYYY-MM-DDTHH:mm:ssZ",
  },

  // 消息长度限制语义 - 基于Foundation层
  LENGTH_LIMITS: {
    SHORT_MESSAGE: CORE_VALUES.QUANTITIES.HUNDRED,      // 100字符 - 短消息
    MEDIUM_MESSAGE: CORE_VALUES.QUANTITIES.FIVE_HUNDRED, // 500字符 - 中等消息  
    LONG_MESSAGE: CORE_VALUES.QUANTITIES.THOUSAND,      // 1000字符 - 长消息
    DESCRIPTION: CORE_VALUES.QUANTITIES.TWO_THOUSAND,   // 2000字符 - 描述信息
  },

  // 消息分隔符语义
  SEPARATORS: {
    FIELD: " | ",           // 字段分隔
    SECTION: " - ",         // 章节分隔
    LIST: ", ",             // 列表分隔
    PATH: " -> ",           // 路径分隔
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

  // 权限相关模板函数
  INSUFFICIENT_PERMISSION: (action: string = "执行此操作") => `权限不足，无法${action}`,
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
  USER_NOT_FOUND: MESSAGE_TEMPLATE_FUNCTIONS.NOT_FOUND(RESOURCE_TYPE_SEMANTICS.USER),
  API_KEY_NOT_FOUND: MESSAGE_TEMPLATE_FUNCTIONS.NOT_FOUND(RESOURCE_TYPE_SEMANTICS.API_KEY),
  DATA_NOT_FOUND: MESSAGE_TEMPLATE_FUNCTIONS.NOT_FOUND(RESOURCE_TYPE_SEMANTICS.DATA),
  RESOURCE_NOT_FOUND: MESSAGE_TEMPLATE_FUNCTIONS.NOT_FOUND(RESOURCE_TYPE_SEMANTICS.RESOURCE),

  // 常见操作成功消息
  CREATE_SUCCESS: MESSAGE_TEMPLATE_FUNCTIONS.OPERATION_SUCCESS(OPERATION_TYPE_SEMANTICS.CREATE),
  UPDATE_SUCCESS: MESSAGE_TEMPLATE_FUNCTIONS.OPERATION_SUCCESS(OPERATION_TYPE_SEMANTICS.UPDATE),
  DELETE_SUCCESS: MESSAGE_TEMPLATE_FUNCTIONS.OPERATION_SUCCESS(OPERATION_TYPE_SEMANTICS.DELETE),

  // 常见操作失败消息
  CREATE_FAILED: MESSAGE_TEMPLATE_FUNCTIONS.OPERATION_FAILED(OPERATION_TYPE_SEMANTICS.CREATE),
  UPDATE_FAILED: MESSAGE_TEMPLATE_FUNCTIONS.OPERATION_FAILED(OPERATION_TYPE_SEMANTICS.UPDATE),
  DELETE_FAILED: MESSAGE_TEMPLATE_FUNCTIONS.OPERATION_FAILED(OPERATION_TYPE_SEMANTICS.DELETE),

  // 常见权限消息
  INSUFFICIENT_READ_PERMISSION: MESSAGE_TEMPLATE_FUNCTIONS.INSUFFICIENT_PERMISSION("读取此资源"),
  INSUFFICIENT_WRITE_PERMISSION: MESSAGE_TEMPLATE_FUNCTIONS.INSUFFICIENT_PERMISSION("修改此资源"),
  INSUFFICIENT_DELETE_PERMISSION: MESSAGE_TEMPLATE_FUNCTIONS.INSUFFICIENT_PERMISSION("删除此资源"),

  // 常见超时消息
  OPERATION_TIMEOUT: MESSAGE_TEMPLATE_FUNCTIONS.OPERATION_TIMEOUT(),
  REQUEST_TIMEOUT: MESSAGE_TEMPLATE_FUNCTIONS.REQUEST_TIMEOUT(),
  CONNECTION_TIMEOUT: MESSAGE_TEMPLATE_FUNCTIONS.CONNECTION_TIMEOUT(),
  DATABASE_TIMEOUT: MESSAGE_TEMPLATE_FUNCTIONS.CONNECTION_TIMEOUT("数据库"),
  API_TIMEOUT: MESSAGE_TEMPLATE_FUNCTIONS.REQUEST_TIMEOUT("API"),

  // 常见服务不可用消息
  SERVICE_UNAVAILABLE: MESSAGE_TEMPLATE_FUNCTIONS.SERVICE_UNAVAILABLE(),
  DATABASE_UNAVAILABLE: MESSAGE_TEMPLATE_FUNCTIONS.SERVICE_UNAVAILABLE("数据库"),
  API_SERVICE_UNAVAILABLE: MESSAGE_TEMPLATE_FUNCTIONS.SERVICE_UNAVAILABLE("API服务"),

  // 常见失败消息
  OPERATION_FAILED: MESSAGE_TEMPLATE_FUNCTIONS.OPERATION_FAILED(),
  CREATION_FAILED: MESSAGE_TEMPLATE_FUNCTIONS.OPERATION_FAILED("创建"),
  DELETION_FAILED: MESSAGE_TEMPLATE_FUNCTIONS.OPERATION_FAILED("删除"),
  CONNECTION_FAILED: MESSAGE_TEMPLATE_FUNCTIONS.CONNECTION_FAILED(),
  AUTHORIZATION_FAILED: MESSAGE_TEMPLATE_FUNCTIONS.AUTHORIZATION_FAILED(),

  // 常见已存在消息
  RESOURCE_EXISTS: MESSAGE_TEMPLATE_FUNCTIONS.RESOURCE_EXISTS(),
  USER_EXISTS: MESSAGE_TEMPLATE_FUNCTIONS.RESOURCE_EXISTS("用户"),
  API_KEY_EXISTS: MESSAGE_TEMPLATE_FUNCTIONS.RESOURCE_EXISTS("API Key"),

  // 常见无效值消息
  INVALID_VALUE: MESSAGE_TEMPLATE_FUNCTIONS.INVALID_VALUE(),
  INVALID_PARAMETER: MESSAGE_TEMPLATE_FUNCTIONS.INVALID_VALUE("参数"),
  INVALID_FORMAT: MESSAGE_TEMPLATE_FUNCTIONS.INVALID_VALUE("格式"),
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
 * 为了向后兼容，提供常用的别名
 */
export const PERMISSION_MESSAGE_ALIASES = Object.freeze({
  // 与现有代码兼容的别名
  INSUFFICIENT_PERMISSIONS: MESSAGE_SEMANTICS.PERMISSION.INSUFFICIENT,
  PERMISSION_DENIED: MESSAGE_SEMANTICS.PERMISSION.DENIED,
  ROLE_INSUFFICIENT: MESSAGE_SEMANTICS.PERMISSION.ROLE_INSUFFICIENT,
  API_KEY_INSUFFICIENT_PERM: MESSAGE_SEMANTICS.PERMISSION.API_KEY_INSUFFICIENT,
  DB_INSUFFICIENT_PERMISSIONS: MESSAGE_SEMANTICS.PERMISSION.DB_ACCESS_DENIED,
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