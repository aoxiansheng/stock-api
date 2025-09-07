/**
 * 通知模板工具函数
 * 提供通知相关的模板处理和格式化功能
 */
import {
  NOTIFICATION_ERROR_TEMPLATES,
  NOTIFICATION_CONSTANTS,
} from "../constants";

/**
 * 通知模板工具函数类
 * 处理通知模板的生成、验证和格式化
 */
export class NotificationTemplateUtil {
  /**
   * 替换错误消息模板中的占位符
   * @param template 模板字符串
   * @param params 参数对象
   * @returns 替换后的字符串
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
   * 生成错误消息
   * @param templateKey 模板键名
   * @param params 参数对象
   * @returns 错误消息字符串
   */
  static generateErrorMessage(
    templateKey: keyof typeof NOTIFICATION_ERROR_TEMPLATES,
    params: Record<string, any>,
  ): string {
    const template = NOTIFICATION_ERROR_TEMPLATES[templateKey];
    return this.replaceErrorTemplate(template, params);
  }

  /**
   * 格式化模板字符串（简化版）
   * 仅支持基础的变量替换
   * @param template 模板字符串
   * @param variables 变量对象
   * @returns 格式化后的字符串
   */
  static formatTemplate(
    template: string,
    variables: Record<string, any>,
  ): string {
    // 仅支持基础的变量替换
    return template.replace(NOTIFICATION_CONSTANTS.TEMPLATE.VARIABLE_PATTERN, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  /**
   * 验证模板变量名称
   * @param variableName 变量名称
   * @returns 是否有效
   */
  static isValidVariableName(variableName: string): boolean {
    const variableNamePattern = new RegExp(
      NOTIFICATION_CONSTANTS.VALIDATION.VARIABLE_NAME_PATTERN_SOURCE,
      NOTIFICATION_CONSTANTS.VALIDATION.VARIABLE_NAME_PATTERN_FLAGS,
    );
    return (
      variableNamePattern.test(variableName) &&
      variableName.length >=
        NOTIFICATION_CONSTANTS.VALIDATION.MIN_VARIABLE_NAME_LENGTH &&
      variableName.length <=
        NOTIFICATION_CONSTANTS.VALIDATION.MAX_VARIABLE_NAME_LENGTH
    );
  }

  /**
   * 验证模板长度
   * @param template 模板字符串
   * @returns 是否有效
   */
  static isValidTemplateLength(template: string): boolean {
    return (
      template.length >= NOTIFICATION_CONSTANTS.VALIDATION.MIN_TEMPLATE_LENGTH &&
      template.length <= NOTIFICATION_CONSTANTS.VALIDATION.MAX_TEMPLATE_LENGTH
    );
  }

  /**
   * 提取模板中的变量
   * @param template 模板字符串
   * @returns 变量名称数组
   */
  static extractVariables(template: string): string[] {
    const variables = new Set<string>();
    const matches = template.matchAll(NOTIFICATION_CONSTANTS.TEMPLATE.VARIABLE_PATTERN);

    for (const match of matches) {
      if (match[1]) {
        variables.add(match[1]);
      }
    }

    return Array.from(variables);
  }

  /**
   * 验证邮箱地址
   * @param email 邮箱地址
   * @returns 是否有效
   */
  static isValidEmail(email: string): boolean {
    const emailPattern = new RegExp(
      NOTIFICATION_CONSTANTS.VALIDATION.EMAIL_PATTERN_SOURCE,
      NOTIFICATION_CONSTANTS.VALIDATION.EMAIL_PATTERN_FLAGS,
    );
    return emailPattern.test(email);
  }

  /**
   * 验证URL
   * @param url URL地址
   * @returns 是否有效
   */
  static isValidUrl(url: string): boolean {
    const urlPattern = new RegExp(
      NOTIFICATION_CONSTANTS.VALIDATION.URL_PATTERN_SOURCE,
      NOTIFICATION_CONSTANTS.VALIDATION.URL_PATTERN_FLAGS,
    );
    return urlPattern.test(url);
  }

  /**
   * 计算重试延迟
   * @param attempt 重试次数
   * @returns 延迟毫秒数
   */
  static calculateRetryDelay(attempt: number): number {
    const {
      INITIAL_DELAY_MS,
      BACKOFF_MULTIPLIER,
      MAX_DELAY_MS,
      JITTER_FACTOR,
    } = NOTIFICATION_CONSTANTS.RETRY;

    const baseDelay = Math.min(
      INITIAL_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, attempt),
      MAX_DELAY_MS,
    );

    // 添加抖动
    const jitter = baseDelay * JITTER_FACTOR * Math.random();

    // 确保总延迟不超过最大值
    return Math.min(Math.floor(baseDelay + jitter), MAX_DELAY_MS);
  }

  /**
   * 生成通知模板变量
   * @param alert 告警对象
   * @param rule 规则对象
   * @returns 模板变量对象
   */
  static generateTemplateVariables(alert: any, rule: any): Record<string, any> {
    const contextVariables = alert.context || {};
    const baseVariables = {
      [NOTIFICATION_CONSTANTS.TEMPLATE.VARIABLES.ALERT_ID]: alert.id,
      [NOTIFICATION_CONSTANTS.TEMPLATE.VARIABLES.RULE_NAME]: rule.name,
      [NOTIFICATION_CONSTANTS.TEMPLATE.VARIABLES.METRIC]: alert.metric,
      [NOTIFICATION_CONSTANTS.TEMPLATE.VARIABLES.VALUE]: alert.value,
      [NOTIFICATION_CONSTANTS.TEMPLATE.VARIABLES.THRESHOLD]: alert.threshold,
      [NOTIFICATION_CONSTANTS.TEMPLATE.VARIABLES.SEVERITY]: alert.severity,
      [NOTIFICATION_CONSTANTS.TEMPLATE.VARIABLES.STATUS]: alert.status,
      [NOTIFICATION_CONSTANTS.TEMPLATE.VARIABLES.MESSAGE]: alert.message,
      [NOTIFICATION_CONSTANTS.TEMPLATE.VARIABLES.START_TIME]:
        alert.startTime?.toLocaleString(),
      [NOTIFICATION_CONSTANTS.TEMPLATE.VARIABLES.END_TIME]:
        alert.endTime?.toLocaleString(),
      [NOTIFICATION_CONSTANTS.TEMPLATE.VARIABLES.DURATION]: alert.endTime
        ? Math.round(
            (alert.endTime.getTime() - alert.startTime.getTime()) / 1000,
          )
        : Math.round((Date.now() - alert.startTime.getTime()) / 1000),
      [NOTIFICATION_CONSTANTS.TEMPLATE.VARIABLES.TAGS]: alert.tags
        ? JSON.stringify(alert.tags, null, 2)
        : undefined,
      [NOTIFICATION_CONSTANTS.TEMPLATE.VARIABLES.RULE_ID]: rule.id,
      [NOTIFICATION_CONSTANTS.TEMPLATE.VARIABLES.RULE_DESCRIPTION]: rule.description,
    };
    // 合并上下文变量，基础变量优先
    return { ...contextVariables, ...baseVariables };
  }
}
