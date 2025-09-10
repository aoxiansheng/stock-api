/**
 * Alert规则工具类
 * 🎯 提供规则相关的工具方法
 */

/**
 * 告警规则工具类
 */
export class AlertRuleUtil {
  /**
   * 格式化告警消息
   */
  static formatAlertMessage(template: string, variables: Record<string, any>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  /**
   * 生成错误消息
   */
  static generateErrorMessage(errorType: string, context: Record<string, any>): string {
    const errorTemplates = {
      RULE_VALIDATION_FAILED: "规则验证失败: {details}",
      THRESHOLD_INVALID: "阈值无效: {threshold}",
      METRIC_INVALID: "指标无效: {metric}",
      RULE_NAME_INVALID: "规则名称无效: {name}",
    };

    const template = errorTemplates[errorType as keyof typeof errorTemplates] || "未知错误: {details}";
    return this.formatAlertMessage(template, context);
  }

  /**
   * 验证规则名称是否有效
   */
  static isValidRuleName(name: string): boolean {
    if (!name || typeof name !== 'string') {
      return false;
    }
    
    // 规则名称长度检查：1-100字符
    if (name.length < 1 || name.length > 100) {
      return false;
    }
    
    // 不能只包含空白字符
    if (name.trim().length === 0) {
      return false;
    }
    
    return true;
  }

  /**
   * 验证指标名称是否有效
   */
  static isValidMetricName(metric: string): boolean {
    if (!metric || typeof metric !== 'string') {
      return false;
    }
    
    // 指标名称格式检查：字母、数字、下划线、点号
    const metricPattern = /^[a-zA-Z_][a-zA-Z0-9_.]*$/;
    
    if (!metricPattern.test(metric)) {
      return false;
    }
    
    // 长度检查：1-200字符
    if (metric.length < 1 || metric.length > 200) {
      return false;
    }
    
    return true;
  }

  /**
   * 验证阈值是否有效
   */
  static isValidThreshold(threshold: any): boolean {
    // 检查是否为数字
    if (typeof threshold !== 'number') {
      const parsed = parseFloat(threshold);
      if (isNaN(parsed)) {
        return false;
      }
    }
    
    // 检查是否为有限数字
    const numValue = typeof threshold === 'number' ? threshold : parseFloat(threshold);
    if (!isFinite(numValue)) {
      return false;
    }
    
    return true;
  }

  /**
   * 生成冷却缓存键
   */
  static generateCooldownCacheKey(ruleId: string): string {
    return `alert:cooldown:${ruleId}`;
  }

  /**
   * 验证操作符是否有效
   */
  static isValidOperator(operator: string): boolean {
    const validOperators = ['>', '>=', '<', '<=', '==', '!=', 'contains', 'not_contains', 'regex'];
    return validOperators.includes(operator);
  }

  /**
   * 验证严重程度是否有效
   */
  static isValidSeverity(severity: string): boolean {
    const validSeverities = ['critical', 'warning', 'info'];
    return validSeverities.includes(severity);
  }

  /**
   * 生成规则摘要
   */
  static generateRuleSummary(rule: any): string {
    return `规则 "${rule.name}": ${rule.metric} ${rule.operator} ${rule.threshold}`;
  }

  /**
   * 计算规则优先级
   */
  static calculateRulePriority(severity: string): number {
    const priorities = {
      critical: 100,
      warning: 50,
      info: 10,
    };
    
    return priorities[severity as keyof typeof priorities] || 0;
  }
}