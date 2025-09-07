/**
 * 共享常量定义
 * 用于避免跨模块的常量重复定义
 */

/**
 * 字符串长度限制
 */
export const SHARED_STRING_LIMITS = Object.freeze({
  // 消息内容最大长度（统一标准）
  MAX_MESSAGE_LENGTH: 1000,
  // 批量操作标准大小
  STANDARD_BATCH_SIZE: 1000,
  // 最小消息长度
  MIN_MESSAGE_LENGTH: 1,
});

/**
 * 批量操作限制
 * 注意：虽然值相同(1000)，但语义不同，属于合理的业务区分
 * 
 * 业务语义说明：
 * - MAX_SEARCH_RESULTS: 用户搜索场景的结果集限制，防止UI性能问题
 * - BATCH_SIZE_LIMIT: 通用批处理操作的标准大小，平衡性能与内存使用
 * - MAX_ALERTS_PER_RULE: 单个告警规则触发的告警数量上限，防止告警风暴
 * - MAX_BATCH_UPDATE_SIZE: 批量数据更新操作的大小限制，保证数据库性能
 * - CLEANUP_BATCH_SIZE: 数据清理任务的批次大小，避免长时间锁定资源
 */
export const SHARED_BATCH_LIMITS = Object.freeze({
  // 搜索结果最大数量 - 用户界面展示限制
  MAX_SEARCH_RESULTS: 1000,
  // 批量操作标准大小 - 通用业务处理限制
  BATCH_SIZE_LIMIT: 1000,
  // 单规则最大告警数 - 防止告警规则触发过多告警
  MAX_ALERTS_PER_RULE: 1000,
  // 批量更新最大大小 - 数据库批量操作性能优化
  MAX_BATCH_UPDATE_SIZE: 1000,
  // 清理批次大小 - 后台清理任务资源控制
  CLEANUP_BATCH_SIZE: 1000,
});

/**
 * 时间间隔常量（毫秒）
 * 不同语义，保持分离
 */
export const SHARED_TIME_INTERVALS = Object.freeze({
  // 重试初始延迟时间
  RETRY_INITIAL_DELAY_MS: 1000,
  // 最小评估间隔时间
  MIN_EVALUATION_INTERVAL_MS: 1000,
});

/**
 * 共享验证规则
 * 提取自 ALERTING_VALIDATION_RULES 和 ALERT_HISTORY_VALIDATION_RULES 的公共部分
 * 
 * 设计原则：
 * - 通用模式：适用于多个模块的验证规则
 * - 语义清晰：每个规则的业务含义明确
 * - 类型安全：提供完整的TypeScript类型支持
 * - 扩展性：支持未来模块的验证需求
 */
export const SHARED_VALIDATION_RULES = Object.freeze({
  /**
   * 消息长度验证规则
   * 适用于：告警消息、通知消息、错误消息等
   */
  MESSAGE_LENGTH: {
    MIN: SHARED_STRING_LIMITS.MIN_MESSAGE_LENGTH,
    MAX: SHARED_STRING_LIMITS.MAX_MESSAGE_LENGTH,
  },

  /**
   * 通用ID长度验证规则
   * 适用于：实体ID的通用长度限制
   */
  ID_LENGTH: {
    MIN: 1,
    MAX: 100,
    TYPICAL_MIN: 15, // 大多数业务ID的最小长度
    TYPICAL_MAX: 50, // 大多数业务ID的最大长度
  },

  /**
   * 数值范围验证规则
   * 适用于：阈值、计数器、百分比等数值验证
   */
  NUMERIC_RANGE: {
    THRESHOLD_MIN: 0,
    THRESHOLD_MAX: Number.MAX_SAFE_INTEGER,
    PERCENTAGE_MIN: 0,
    PERCENTAGE_MAX: 100,
    COUNT_MIN: 0,
  },

  /**
   * 通用文本模式验证
   * 适用于：标签、标识符、名称等文本字段
   */
  TEXT_PATTERNS: {
    // 支持中文、英文、数字、常用符号的通用名称模式
    GENERAL_NAME: /^[\u4e00-\u9fff\u3400-\u4dbf\uff00-\uffef\u3000-\u303fa-zA-Z0-9\s\-_\.]+$/,
    // 纯英文数字标识符（用于API、配置项等）
    IDENTIFIER: /^[a-zA-Z0-9_\.]+$/,
    // 标签模式（不允许空格）
    TAG: /^[a-zA-Z0-9_-]+$/,
    // 基础ID模式（字母数字下划线）
    BASIC_ID: /^[a-zA-Z0-9_]+$/,
  },

  /**
   * 验证函数工具集
   * 提供可复用的验证逻辑
   */
  VALIDATORS: {
    /**
     * 验证字符串长度
     * @param value 待验证字符串
     * @param minLength 最小长度
     * @param maxLength 最大长度
     * @returns 是否有效
     */
    isValidStringLength: (value: string, minLength: number, maxLength: number): boolean => {
      return typeof value === 'string' && 
             value.length >= minLength && 
             value.length <= maxLength;
    },

    /**
     * 验证数值范围
     * @param value 待验证数值
     * @param min 最小值
     * @param max 最大值
     * @returns 是否有效
     */
    isValidNumberRange: (value: number, min: number, max: number): boolean => {
      return typeof value === 'number' && 
             Number.isFinite(value) && 
             value >= min && 
             value <= max;
    },

    /**
     * 验证文本模式匹配
     * @param value 待验证文本
     * @param pattern 正则表达式模式
     * @returns 是否有效
     */
    isValidTextPattern: (value: string, pattern: RegExp): boolean => {
      return typeof value === 'string' && 
             value.trim() !== '' && 
             pattern.test(value);
    },

    /**
     * 验证消息格式
     * @param message 待验证消息
     * @returns 是否有效
     */
    isValidMessage: (message: string): boolean => {
      return SHARED_VALIDATION_RULES.VALIDATORS.isValidStringLength(
        message,
        SHARED_VALIDATION_RULES.MESSAGE_LENGTH.MIN,
        SHARED_VALIDATION_RULES.MESSAGE_LENGTH.MAX
      );
    },
  },
});