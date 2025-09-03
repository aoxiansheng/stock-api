/**
 * 监控系统消息常量
 * 🎯 统一管理监控系统中的所有消息模板和文本，避免硬编码字符串
 * 提供多语言支持和消息分类管理
 */

/**
 * 监控操作消息模板
 * 用于监控操作成功、失败等状态的标准化消息
 */
export const MONITORING_OPERATION_MESSAGES = Object.freeze({
  /**
   * 监控启动消息
   */
  MONITORING_STARTED: "监控系统已启动",
  MONITORING_STARTING: "监控系统正在启动...",
  MONITORING_START_FAILED: "监控系统启动失败",
  
  /**
   * 监控停止消息
   */
  MONITORING_STOPPED: "监控系统已停止",
  MONITORING_STOPPING: "监控系统正在停止...",
  MONITORING_STOP_FAILED: "监控系统停止失败",
  
  /**
   * 健康检查消息
   */
  HEALTH_CHECK_PASSED: "健康检查通过",
  HEALTH_CHECK_FAILED: "健康检查失败",
  HEALTH_CHECK_WARNING: "健康检查警告",
  HEALTH_CHECK_RUNNING: "正在执行健康检查...",
  
  /**
   * 指标收集消息
   */
  METRICS_COLLECTED: "指标收集完成",
  METRICS_COLLECTION_STARTED: "开始收集指标",
  METRICS_COLLECTION_FAILED: "指标收集失败",
  METRICS_UPDATED: "指标已更新",
  
  /**
   * 告警消息
   */
  ALERT_TRIGGERED: "告警已触发",
  ALERT_RESOLVED: "告警已解决",
  ALERT_ACKNOWLEDGED: "告警已确认",
  ALERT_ESCALATED: "告警已升级"
} as const);

/**
 * 监控错误消息模板
 * 用于错误处理和异常情况的消息定义
 */
export const MONITORING_ERROR_MESSAGES = Object.freeze({
  /**
   * 通用错误消息
   */
  UNKNOWN_ERROR: "监控系统遇到未知错误",
  OPERATION_TIMEOUT: "监控操作超时",
  INVALID_PARAMETER: "监控参数无效",
  RESOURCE_NOT_FOUND: "监控资源未找到",
  
  /**
   * 连接错误消息
   */
  CONNECTION_FAILED: "监控连接失败",
  CONNECTION_LOST: "监控连接丢失",
  CONNECTION_TIMEOUT: "监控连接超时",
  RECONNECTION_FAILED: "监控重连失败",
  
  /**
   * 配置错误消息
   */
  INVALID_CONFIGURATION: "监控配置无效",
  MISSING_CONFIGURATION: "监控配置缺失",
  CONFIGURATION_LOAD_FAILED: "监控配置加载失败",
  
  /**
   * 存储错误消息
   */
  STORAGE_ERROR: "监控存储错误",
  DATABASE_CONNECTION_FAILED: "监控数据库连接失败",
  CACHE_ERROR: "监控缓存错误",
  PERSISTENCE_FAILED: "监控数据持久化失败"
} as const);

/**
 * 监控日志消息模板
 * 用于日志记录的标准化消息
 */
export const MONITORING_LOG_MESSAGES = Object.freeze({
  /**
   * 调试日志消息
   */
  DEBUG_METRIC_VALUE: (metric: string, value: number) => `调试: 指标 ${metric} 当前值为 ${value}`,
  DEBUG_HEALTH_STATUS: (component: string, status: string) => `调试: 组件 ${component} 健康状态为 ${status}`,
  DEBUG_CACHE_OPERATION: (operation: string, key: string) => `调试: 缓存操作 ${operation}，键为 ${key}`,
  
  /**
   * 信息日志消息
   */
  INFO_MONITORING_ENABLED: (component: string) => `信息: 组件 ${component} 监控已启用`,
  INFO_THRESHOLD_CHECK: (metric: string, threshold: number) => `信息: 指标 ${metric} 阈值检查，阈值为 ${threshold}`,
  INFO_ALERT_SENT: (recipient: string, alertType: string) => `信息: 告警已发送给 ${recipient}，类型为 ${alertType}`,
  
  /**
   * 警告日志消息
   */
  WARN_HIGH_METRIC_VALUE: (metric: string, value: number, threshold: number) => 
    `警告: 指标 ${metric} 值 ${value} 超过警告阈值 ${threshold}`,
  WARN_COMPONENT_DEGRADED: (component: string) => `警告: 组件 ${component} 性能降级`,
  WARN_CACHE_MISS_RATE_HIGH: (rate: number) => `警告: 缓存命中率低 ${rate}%`,
  
  /**
   * 错误日志消息
   */
  ERROR_METRIC_COLLECTION_FAILED: (metric: string, error: string) => 
    `错误: 指标 ${metric} 收集失败，原因: ${error}`,
  ERROR_ALERT_DELIVERY_FAILED: (recipient: string, error: string) => 
    `错误: 告警发送给 ${recipient} 失败，原因: ${error}`,
  ERROR_COMPONENT_UNHEALTHY: (component: string, reason: string) => 
    `错误: 组件 ${component} 不健康，原因: ${reason}`
} as const);

/**
 * 监控通知消息模板
 * 用于外部通知系统的消息定义
 */
export const MONITORING_NOTIFICATION_MESSAGES = Object.freeze({
  /**
   * 邮件通知模板
   */
  EMAIL: {
    ALERT_SUBJECT: (severity: string, component: string) => `[${severity}] 监控告警 - ${component}`,
    ALERT_BODY: (component: string, metric: string, value: number, threshold: number) => 
      `组件 ${component} 的指标 ${metric} 当前值 ${value} 超过阈值 ${threshold}，请及时处理。`,
    RECOVERY_SUBJECT: (component: string) => `[已恢复] 监控告警恢复 - ${component}`,
    RECOVERY_BODY: (component: string) => `组件 ${component} 的告警已恢复正常。`
  },
  
  /**
   * Slack通知模板
   */
  SLACK: {
    ALERT_MESSAGE: (severity: string, component: string, metric: string, value: number) =>
      `🚨 *${severity}告警* - ${component}\n指标: ${metric}\n当前值: ${value}`,
    RECOVERY_MESSAGE: (component: string) => `✅ *告警恢复* - ${component} 已恢复正常`
  },
  
  /**
   * 微信通知模板
   */
  WECHAT: {
    ALERT_MESSAGE: (component: string, metric: string, value: number) =>
      `监控告警\n组件: ${component}\n指标: ${metric}\n值: ${value}`,
    RECOVERY_MESSAGE: (component: string) => `告警恢复\n组件: ${component} 已恢复`
  }
} as const);

/**
 * 监控状态描述消息
 * 用于状态展示和用户界面的消息定义
 */
export const MONITORING_STATUS_DESCRIPTIONS = Object.freeze({
  /**
   * 健康状态描述
   */
  HEALTHY: "系统运行正常，所有指标都在正常范围内",
  WARNING: "系统存在潜在问题，部分指标接近阈值",
  UNHEALTHY: "系统存在严重问题，需要立即处理",
  DEGRADED: "系统性能降级，功能可用但性能受影响",
  UNKNOWN: "系统状态未知，无法获取监控数据",
  
  /**
   * 指标状态描述
   */
  METRIC_NORMAL: "指标值在正常范围内",
  METRIC_WARNING: "指标值接近警告阈值",
  METRIC_CRITICAL: "指标值超过严重阈值",
  METRIC_IMPROVING: "指标趋势正在改善",
  METRIC_DETERIORATING: "指标趋势正在恶化"
} as const);

/**
 * 监控操作提示消息
 * 用于操作指导和用户提示
 */
export const MONITORING_ACTION_PROMPTS = Object.freeze({
  /**
   * 系统建议操作
   */
  RESTART_COMPONENT: "建议重启相关组件",
  CHECK_RESOURCES: "建议检查系统资源使用情况",
  SCALE_UP: "建议增加系统资源",
  CONTACT_ADMIN: "建议联系系统管理员",
  
  /**
   * 用户操作提示
   */
  ACKNOWLEDGE_ALERT: "请确认此告警",
  UPDATE_CONFIGURATION: "请更新监控配置",
  REVIEW_LOGS: "请查看详细日志",
  RUN_DIAGNOSTIC: "请运行系统诊断"
} as const);

/**
 * 消息类型枚举
 * 用于消息分类和处理
 */
export const MONITORING_MESSAGE_TYPES = Object.freeze({
  OPERATION: 'operation',
  ERROR: 'error',
  LOG: 'log',
  NOTIFICATION: 'notification',
  STATUS: 'status',
  ACTION: 'action'
} as const);

/**
 * 消息严重性级别
 * 用于消息优先级排序
 */
export const MONITORING_MESSAGE_SEVERITY = Object.freeze({
  INFO: 0,
  WARNING: 1,
  ERROR: 2,
  CRITICAL: 3
} as const);

/**
 * 消息模板类型定义
 */
export type MonitoringOperationMessage = typeof MONITORING_OPERATION_MESSAGES[keyof typeof MONITORING_OPERATION_MESSAGES];
export type MonitoringErrorMessage = typeof MONITORING_ERROR_MESSAGES[keyof typeof MONITORING_ERROR_MESSAGES];
export type MonitoringMessageType = typeof MONITORING_MESSAGE_TYPES[keyof typeof MONITORING_MESSAGE_TYPES];
export type MonitoringMessageSeverity = typeof MONITORING_MESSAGE_SEVERITY[keyof typeof MONITORING_MESSAGE_SEVERITY];

/**
 * 消息格式化工具函数
 * 🎯 提供消息的标准化格式化功能
 */
export class MonitoringMessageFormatter {
  /**
   * 格式化带时间戳的消息
   */
  static withTimestamp(message: string): string {
    return `[${new Date().toISOString()}] ${message}`;
  }
  
  /**
   * 格式化带组件名的消息
   */
  static withComponent(component: string, message: string): string {
    return `[${component}] ${message}`;
  }
  
  /**
   * 格式化带严重性级别的消息
   */
  static withSeverity(severity: keyof typeof MONITORING_MESSAGE_SEVERITY, message: string): string {
    return `[${severity}] ${message}`;
  }
  
  /**
   * 格式化完整的监控消息
   */
  static formatFullMessage(
    component: string,
    severity: keyof typeof MONITORING_MESSAGE_SEVERITY,
    message: string,
    withTimestamp: boolean = true
  ): string {
    let formattedMessage = `[${severity}] [${component}] ${message}`;
    
    if (withTimestamp) {
      formattedMessage = `[${new Date().toISOString()}] ${formattedMessage}`;
    }
    
    return formattedMessage;
  }
}