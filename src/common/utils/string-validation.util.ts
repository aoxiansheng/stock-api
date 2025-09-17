/**
 * 通用字符串验证工具类
 * 提供可重用的字符串验证、生成和处理功能
 *
 * 设计原则：
 * - 提供通用的字符串验证方法
 * - 独立于具体业务逻辑
 * - 支持配置化的验证规则
 * - 保持类型安全和性能优化
 */

/**
 * 字符串验证配置接口
 */
export interface StringValidationConfig {
  /** 最小长度 */
  minLength?: number;
  /** 最大长度 */
  maxLength?: number;
  /** 验证正则表达式 */
  pattern?: RegExp;
  /** 是否允许空值 */
  allowEmpty?: boolean;
  /** 是否允许null/undefined */
  allowNullish?: boolean;
}

/**
 * 字符串生成配置接口
 */
export interface StringGenerationConfig {
  /** 生成长度 */
  length: number;
  /** 字符集 */
  charset?: string;
  /** 前缀 */
  prefix?: string;
  /** 后缀 */
  suffix?: string;
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 错误信息 */
  errors?: string[];
}

/**
 * 通用字符串验证工具类
 */
export class StringValidationUtil {
  /**
   * 默认字符集
   */
  static readonly DEFAULT_CHARSET =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  /**
   * 常用字符集
   */
  static readonly CHARSET_PRESETS = {
    ALPHANUMERIC:
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    ALPHA_ONLY: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
    NUMERIC_ONLY: "0123456789",
    LOWERCASE: "abcdefghijklmnopqrstuvwxyz",
    UPPERCASE: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    HEX: "0123456789abcdef",
    HEX_UPPER: "0123456789ABCDEF",
    BASE64_SAFE:
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_",
  } as const;

  /**
   * 验证字符串是否为空值或null/undefined
   * @param value 要验证的字符串
   * @returns 是否为空
   */
  static isNullish(value: unknown): value is null | undefined {
    return value === null || value === undefined;
  }

  /**
   * 验证字符串是否为空（包括空字符串、空白字符串）
   * @param value 要验证的字符串
   * @param trimFirst 是否先去除首尾空白
   * @returns 是否为空
   */
  static isEmpty(value: string, trimFirst: boolean = true): boolean {
    if (this.isNullish(value)) return true;
    const str = trimFirst ? value.trim() : value;
    return str.length === 0;
  }

  /**
   * 基础字符串验证
   * @param value 要验证的字符串
   * @param config 验证配置
   * @returns 验证结果
   */
  static validateString(
    value: unknown,
    config: StringValidationConfig = {},
  ): ValidationResult {
    const errors: string[] = [];
    const {
      minLength = 0,
      maxLength = Number.MAX_SAFE_INTEGER,
      pattern,
      allowEmpty = false,
      allowNullish = false,
    } = config;

    // 检查null/undefined
    if (this.isNullish(value)) {
      if (!allowNullish) {
        errors.push("Value cannot be null or undefined");
      }
      return {
        isValid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      };
    }

    // 类型检查
    if (typeof value !== "string") {
      errors.push("Value must be a string");
      return { isValid: false, errors };
    }

    const stringValue = value as string;

    // 检查空字符串
    if (this.isEmpty(stringValue, true)) {
      if (!allowEmpty) {
        errors.push("Value cannot be empty");
      }
      return {
        isValid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      };
    }

    // 长度验证
    if (stringValue.length < minLength) {
      errors.push(`Value must be at least ${minLength} characters long`);
    }

    if (stringValue.length > maxLength) {
      errors.push(`Value must be at most ${maxLength} characters long`);
    }

    // 正则验证
    if (pattern && !pattern.test(stringValue)) {
      errors.push("Value does not match required pattern");
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * 验证字符串名称（通用名称验证）
   * @param name 名称字符串
   * @param config 验证配置
   * @returns 是否有效
   */
  static isValidName(
    name: string,
    config: StringValidationConfig = {},
  ): boolean {
    const defaultConfig: StringValidationConfig = {
      minLength: 1,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9\s\-_\.]+$/,
      allowEmpty: false,
      allowNullish: false,
      ...config,
    };

    const result = this.validateString(name, defaultConfig);
    return result.isValid;
  }

  /**
   * 验证字符串格式（基于正则表达式）
   * @param value 要验证的字符串
   * @param pattern 正则表达式
   * @returns 是否匹配
   */
  static matchesPattern(value: string, pattern: RegExp): boolean {
    if (this.isNullish(value) || typeof value !== "string") {
      return false;
    }
    return pattern.test(value);
  }

  /**
   * 生成随机字符串
   * @param config 生成配置
   * @returns 生成的字符串
   */
  static generateRandomString(config: StringGenerationConfig): string {
    const {
      length,
      charset = this.DEFAULT_CHARSET,
      prefix = "",
      suffix = "",
    } = config;

    if (length < 0) {
      throw new Error("Length must be non-negative");
    }

    if (charset.length === 0) {
      throw new Error("Charset cannot be empty");
    }

    let result = "";
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return prefix + result + suffix;
  }

  /**
   * 字符串脱敏处理（用于日志记录等）
   * @param value 要脱敏的字符串
   * @param keepStart 保留开头字符数
   * @param keepEnd 保留结尾字符数
   * @param maskChar 掩码字符
   * @returns 脱敏后的字符串
   */
  static sanitizeString(
    value: string,
    keepStart: number = 4,
    keepEnd: number = 4,
    maskChar: string = "*",
  ): string {
    if (this.isNullish(value) || typeof value !== "string") {
      return "***";
    }

    const totalKeep = keepStart + keepEnd;

    // 如果字符串太短，直接返回掩码
    if (value.length <= totalKeep || value.length <= 8) {
      return maskChar.repeat(3);
    }

    const start = value.substring(0, keepStart);
    const end = value.substring(value.length - keepEnd);
    const maskLength = Math.max(3, value.length - totalKeep);

    return start + maskChar.repeat(maskLength) + end;
  }

  /**
   * 验证字符串长度范围
   * @param value 字符串
   * @param minLength 最小长度
   * @param maxLength 最大长度
   * @returns 是否在范围内
   */
  static isLengthInRange(
    value: string,
    minLength: number,
    maxLength: number,
  ): boolean {
    if (this.isNullish(value) || typeof value !== "string") {
      return false;
    }
    return value.length >= minLength && value.length <= maxLength;
  }

  /**
   * 验证字符串是否只包含指定字符集
   * @param value 字符串
   * @param charset 允许的字符集
   * @returns 是否只包含指定字符
   */
  static containsOnlyChars(value: string, charset: string): boolean {
    if (this.isNullish(value) || typeof value !== "string") {
      return false;
    }

    if (charset.length === 0) {
      return value.length === 0;
    }

    return value.split("").every((char) => charset.includes(char));
  }

  /**
   * 清理和标准化字符串
   * @param value 输入字符串
   * @param options 清理选项
   * @returns 清理后的字符串
   */
  static sanitizeInput(
    value: string,
    options: {
      trim?: boolean;
      toLowerCase?: boolean;
      toUpperCase?: boolean;
      removeExtraSpaces?: boolean;
    } = {},
  ): string {
    if (this.isNullish(value) || typeof value !== "string") {
      return "";
    }

    let result = value;

    if (options.trim !== false) {
      result = result.trim();
    }

    if (options.removeExtraSpaces) {
      result = result.replace(/\s+/g, " ");
    }

    if (options.toLowerCase) {
      result = result.toLowerCase();
    } else if (options.toUpperCase) {
      result = result.toUpperCase();
    }

    return result;
  }

  /**
   * 生成带前缀的唯一字符串
   * @param prefix 前缀
   * @param length 随机部分长度
   * @param charset 字符集
   * @returns 带前缀的字符串
   */
  static generatePrefixedString(
    prefix: string,
    length: number,
    charset: string = this.DEFAULT_CHARSET,
  ): string {
    return this.generateRandomString({
      length,
      charset,
      prefix,
    });
  }

  /**
   * 批量验证字符串数组
   * @param values 字符串数组
   * @param config 验证配置
   * @returns 验证结果数组
   */
  static validateStringArray(
    values: unknown[],
    config: StringValidationConfig = {},
  ): ValidationResult[] {
    return values.map((value) => this.validateString(value, config));
  }

  /**
   * 检查字符串是否包含禁用词
   * @param value 字符串
   * @param forbiddenWords 禁用词列表
   * @param caseSensitive 是否大小写敏感
   * @returns 是否包含禁用词
   */
  static containsForbiddenWords(
    value: string,
    forbiddenWords: string[],
    caseSensitive: boolean = false,
  ): boolean {
    if (this.isNullish(value) || typeof value !== "string") {
      return false;
    }

    const checkValue = caseSensitive ? value : value.toLowerCase();
    const forbidden = caseSensitive
      ? forbiddenWords
      : forbiddenWords.map((word) => word.toLowerCase());

    return forbidden.some((word) => checkValue.includes(word));
  }
}
