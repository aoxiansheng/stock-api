/**
 * 核心模式常量
 * 🎯 基础层 - 正则表达式和字符串模式的统一定义
 * 🔍 避免在多个文件中重复定义相同的验证模式
 */

/**
 * 核心正则表达式模式
 */
export const CORE_PATTERNS = Object.freeze({
  /**
   * 通用文本模式
   */
  TEXT: {
    // 支持中文、英文、数字、常用符号的通用名称
    GENERAL_NAME: /^[\u4e00-\u9fff\u3400-\u4dbf\uff00-\uffef\u3000-\u303fa-zA-Z0-9\s\-_\.]+$/,
    // 纯英文数字标识符（API、配置等）
    IDENTIFIER: /^[a-zA-Z0-9_\.]+$/,
    // 标签模式（不允许空格）
    TAG: /^[a-zA-Z0-9_-]+$/,
    // 基础ID模式
    BASIC_ID: /^[a-zA-Z0-9_]+$/,
    // 变量名模式
    VARIABLE_NAME: /^[a-zA-Z][a-zA-Z0-9_]*$/,
  },

  /**
   * ID格式模式
   */
  ID_FORMATS: {
    // 告警规则ID: rule_{timestamp}_{random}
    ALERT_RULE: /^rule_[a-z0-9]+_[a-z0-9]{6}$/,
    // 告警历史ID: alrt_{timestamp}_{random}
    ALERT_HISTORY: /^alrt_[a-z0-9]+_[a-z0-9]{6}$/,
  },

  /**
   * 网络和通信模式
   */
  NETWORK: {
    // 邮箱验证
    EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i,
    // URL验证
    URL: /^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/i,
  },

  /**
   * 模板变量模式
   */
  TEMPLATE: {
    // 变量替换模式: {{variableName}}
    VARIABLE_SUBSTITUTION: /\{\{(\w+)\}\}/g,
  },
});

/**
 * 字符串格式化模式
 */
export const STRING_FORMATS = Object.freeze({
  /**
   * ID生成格式
   */
  ID_TEMPLATES: {
    ALERT_RULE: "rule_{timestamp}_{random}",
    ALERT_HISTORY: "alrt_{timestamp}_{random}",
  },

  /**
   * 缓存键模式
   */
  CACHE_KEY_PATTERNS: {
    RULE_COOLDOWN: "alert:cooldown:{ruleId}",
    ACTIVE_ALERTS: "alert:active:{ruleId}",
    RULE_STATS: "alert:stats:{ruleId}",
  },
});

/**
 * 验证工具函数
 */
export class PatternValidator {
  /**
   * 验证文本是否匹配指定模式
   */
  static isValidPattern(text: string, pattern: RegExp): boolean {
    return typeof text === 'string' && text.trim() !== '' && pattern.test(text);
  }

  /**
   * 验证通用名称格式
   */
  static isValidGeneralName(name: string): boolean {
    return this.isValidPattern(name, CORE_PATTERNS.TEXT.GENERAL_NAME);
  }

  /**
   * 验证标识符格式
   */
  static isValidIdentifier(identifier: string): boolean {
    return this.isValidPattern(identifier, CORE_PATTERNS.TEXT.IDENTIFIER);
  }

  /**
   * 验证标签格式
   */
  static isValidTag(tag: string): boolean {
    return this.isValidPattern(tag, CORE_PATTERNS.TEXT.TAG);
  }

  /**
   * 验证邮箱格式
   */
  static isValidEmail(email: string): boolean {
    return this.isValidPattern(email, CORE_PATTERNS.NETWORK.EMAIL);
  }

  /**
   * 验证URL格式
   */
  static isValidUrl(url: string): boolean {
    return this.isValidPattern(url, CORE_PATTERNS.NETWORK.URL);
  }

  /**
   * 验证告警规则ID格式
   */
  static isValidAlertRuleId(id: string): boolean {
    return this.isValidPattern(id, CORE_PATTERNS.ID_FORMATS.ALERT_RULE);
  }

  /**
   * 验证告警历史ID格式
   */
  static isValidAlertHistoryId(id: string): boolean {
    return this.isValidPattern(id, CORE_PATTERNS.ID_FORMATS.ALERT_HISTORY);
  }
}

/**
 * 类型定义
 */
export type CorePatterns = typeof CORE_PATTERNS;
export type StringFormats = typeof STRING_FORMATS;