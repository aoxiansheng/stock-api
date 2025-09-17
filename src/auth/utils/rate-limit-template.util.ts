import { RATE_LIMIT_VALIDATION } from "../constants/rate-limiting.constants";

/**
 * 频率限制模板工具类
 * 提供错误消息模板处理、验证和重试延迟计算功能
 */
export class RateLimitTemplateUtil {
  /**
   * 替换错误消息模板中的占位符
   */
  static replaceErrorTemplate(
    template: string,
    params: Record<string, any>,
  ): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      const value = params[key];
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * 验证时间窗口格式
   */
  static isValidWindowFormat(window: string): boolean {
    return RATE_LIMIT_VALIDATION.WINDOW_PATTERN.test(window);
  }

  /**
   * 验证应用键格式
   */
  static isValidAppKey(appKey: string): boolean {
    return (
      RATE_LIMIT_VALIDATION.APP_KEY_PATTERN.test(appKey) &&
      appKey.length >= RATE_LIMIT_VALIDATION.MIN_APP_KEY_LENGTH &&
      appKey.length <= RATE_LIMIT_VALIDATION.MAX_APP_KEY_LENGTH
    );
  }

  /**
   * 计算重试延迟
   */
  static calculateRetryDelay(attempt: number): number {
    const INITIAL_DELAY_MS = 100;
    const BACKOFF_MULTIPLIER = 2;
    const MAX_DELAY_MS = 5000;
    const JITTER_FACTOR = 0.1;

    const baseDelay = Math.min(
      INITIAL_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, attempt),
      MAX_DELAY_MS,
    );

    // 添加抖动
    const jitter = baseDelay * JITTER_FACTOR * Math.random();
    return Math.floor(baseDelay + jitter);
  }

  /**
   * 生成错误消息（简化版本，支持基本占位符替换）
   */
  static generateErrorMessage(
    templateKey: string,
    params: Record<string, any>,
  ): string {
    // 简化的错误消息模板
    const templates: Record<string, string> = {
      UNSUPPORTED_STRATEGY: "不支持的频率限制策略: {strategy}",
      INVALID_WINDOW_FORMAT:
        "无效的时间窗口格式: {window}，期望格式如: 1s, 5m, 1h, 1d",
      RATE_LIMIT_EXCEEDED:
        "API Key {appKey} 超过频率限制: {current}/{limit} 请求",
      INVALID_LIMIT_VALUE: "无效的限制值: {limit}，必须是正整数",
    };

    const template = templates[templateKey] || templateKey;
    return this.replaceErrorTemplate(template, params);
  }
}
