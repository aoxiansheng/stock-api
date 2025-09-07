/**
 * 模板配置常量
 * 🎯 应用层 - 统一管理所有模板相关的配置
 * 📋 整合模板变量、格式化规则和预定义模板
 */

import { NOTIFICATION_CONSTANTS } from '../domain/notifications.constants';
import { ALERT_RULE_CONSTANTS } from '../domain/alert-rules.constants';
import { ALERT_HISTORY_CONSTANTS } from '../domain/alert-history.constants';
import { CORE_PATTERNS } from '../core/patterns.constants';
import { CORE_LIMITS } from '../core/limits.constants';
import { deepFreeze } from "../../../common/utils/object-immutability.util";

/**
 * 模板系统配置
 */
export const TEMPLATE_CONFIG = deepFreeze({
  /**
   * 模板变量配置
   */
  VARIABLES: {
    // 基础告警变量 - 从通知系统继承
    ALERT: NOTIFICATION_CONSTANTS.TEMPLATE.VARIABLES,
    
    // 系统信息变量
    SYSTEM: {
      TIMESTAMP: "timestamp",
      SERVICE_NAME: "serviceName",
      ENVIRONMENT: "environment",
      VERSION: "version",
      HOSTNAME: "hostname",
      IP_ADDRESS: "ipAddress",
    },
    
    // 用户信息变量
    USER: {
      USER_ID: "userId",
      USERNAME: "username",
      USER_EMAIL: "userEmail",
      USER_ROLE: "userRole",
    },
    
    // 规则信息变量（扩展）
    RULE_EXTENDED: {
      RULE_CATEGORY: "ruleCategory",
      RULE_PRIORITY: "rulePriority",
      RULE_OWNER: "ruleOwner",
      RULE_CREATED_TIME: "ruleCreatedTime",
      RULE_LAST_MODIFIED: "ruleLastModified",
      EVALUATION_COUNT: "evaluationCount",
      SUCCESS_RATE: "successRate",
    },
    
    // 统计信息变量
    STATISTICS: {
      TOTAL_ALERTS_TODAY: "totalAlertsToday",
      RESOLVED_ALERTS_TODAY: "resolvedAlertsToday",
      AVERAGE_RESOLUTION_TIME: "averageResolutionTime",
      ALERT_TREND: "alertTrend",
      SYSTEM_LOAD: "systemLoad",
    },
  },

  /**
   * 模板格式配置
   */
  FORMATS: {
    // 变量替换模式
    VARIABLE_PATTERN: CORE_PATTERNS.TEMPLATE.VARIABLE_SUBSTITUTION,
    
    // 时间格式
    TIMESTAMP_FORMAT: "YYYY-MM-DD HH:mm:ss",
    DATE_FORMAT: "YYYY-MM-DD",
    TIME_FORMAT: "HH:mm:ss",
    
    // 数值格式
    DECIMAL_PLACES: 2,
    PERCENTAGE_FORMAT: "0.00%",
    CURRENCY_FORMAT: "¥0,0.00",
    
    // 持续时间格式
    DURATION_FORMATS: {
      SECONDS: "秒",
      MINUTES: "分钟", 
      HOURS: "小时",
      DAYS: "天",
    },
  },

  /**
   * 模板验证配置
   */
  VALIDATION: {
    MIN_TEMPLATE_LENGTH: CORE_LIMITS.STRING_LENGTH.MIN_LENGTH,     // 1
    MAX_TEMPLATE_LENGTH: CORE_LIMITS.STRING_LENGTH.TEMPLATE_MAX,   // 2000
    MAX_VARIABLES_PER_TEMPLATE: 50,
    VARIABLE_NAME_PATTERN: CORE_PATTERNS.TEXT.VARIABLE_NAME,
    MAX_NESTING_LEVEL: 3, // 嵌套模板的最大层数
  },
});

/**
 * 预定义模板常量
 */
export const PREDEFINED_TEMPLATES = deepFreeze({
  /**
   * 告警通知模板
   */
  ALERT_NOTIFICATIONS: {
    // 基础告警模板
    BASIC_ALERT: {
      title: "🚨 告警通知: {{ruleName}}",
      content: `告警详情:
- 规则名称: {{ruleName}}
- 指标名称: {{metric}}
- 当前值: {{value}}
- 阈值: {{threshold}}
- 严重级别: {{severity}}
- 触发时间: {{startTime}}
- 状态: {{status}}

描述: {{message}}

规则ID: {{ruleId}}
告警ID: {{alertId}}`,
    },

    // 严重告警模板
    CRITICAL_ALERT: {
      title: "🔴 严重告警: {{ruleName}}",
      content: `⚠️ 检测到严重告警！

📊 告警信息:
• 规则: {{ruleName}}
• 指标: {{metric}}
• 当前值: {{value}} (阈值: {{threshold}})
• 严重级别: {{severity}}
• 持续时间: {{duration}}

🕒 时间信息:
• 触发时间: {{startTime}}
• 当前时间: {{timestamp}}

📝 详细描述:
{{message}}

🏷️ 标签: {{tags}}

请立即检查相关服务状态！`,
    },

    // 告警解决模板
    ALERT_RESOLVED: {
      title: "✅ 告警已解决: {{ruleName}}",
      content: `告警已自动解决:

规则名称: {{ruleName}}
告警ID: {{alertId}}
解决时间: {{endTime}}
持续时长: {{duration}}

原因: 指标 {{metric}} 已恢复正常
当前值: {{value}}

感谢您的关注！`,
    },

    // 告警摘要模板
    ALERT_SUMMARY: {
      title: "📈 告警日报: {{timestamp}}",
      content: `今日告警统计 ({{timestamp}}):

📊 总体数据:
• 今日总告警数: {{totalAlertsToday}}
• 已解决告警数: {{resolvedAlertsToday}}
• 平均解决时间: {{averageResolutionTime}}分钟

🔢 按级别统计:
• 严重告警: {{criticalAlerts}}
• 警告告警: {{warningAlerts}}  
• 信息告警: {{infoAlerts}}

💡 系统状态:
• 活跃告警数: {{activeAlerts}}
• 系统负载: {{systemLoad}}

祝您工作愉快！`,
    },
  },

  /**
   * 系统通知模板
   */
  SYSTEM_NOTIFICATIONS: {
    // 服务启动通知
    SERVICE_STARTED: {
      title: "🚀 服务启动通知",
      content: `服务启动成功:

服务名称: {{serviceName}}
启动时间: {{timestamp}}
环境: {{environment}}
版本: {{version}}
主机: {{hostname}}
IP地址: {{ipAddress}}

服务已正常运行！`,
    },

    // 服务停止通知
    SERVICE_STOPPED: {
      title: "⏹️ 服务停止通知",
      content: `服务已停止:

服务名称: {{serviceName}}
停止时间: {{timestamp}}
运行时长: {{duration}}

如有问题请及时处理。`,
    },

    // 健康检查失败通知
    HEALTH_CHECK_FAILED: {
      title: "❌ 健康检查失败",
      content: `健康检查异常:

服务名称: {{serviceName}}
检查时间: {{timestamp}}
失败原因: {{message}}
环境: {{environment}}

请立即检查服务状态！`,
    },
  },

  /**
   * 报告模板
   */
  REPORTS: {
    // 周报模板
    WEEKLY_REPORT: {
      title: "📊 告警系统周报",
      content: `告警系统周报摘要:

📈 本周统计:
• 总告警数: {{totalAlerts}}
• 平均日告警数: {{averageDailyAlerts}}
• 告警解决率: {{resolutionRate}}%
• 平均解决时间: {{averageResolutionTime}}分钟

🏆 表现最佳规则:
• 规则名称: {{topRuleName}}
• 准确率: {{accuracy}}%

⚠️ 需要关注的问题:
{{issues}}

下周改进建议:
{{recommendations}}`,
    },

    // 月报模板
    MONTHLY_REPORT: {
      title: "📊 告警系统月报",
      content: `告警系统月度报告:

📊 月度概览:
• 总告警数: {{totalAlerts}}
• 总规则数: {{totalRules}}
• 活跃用户数: {{activeUsers}}
• 系统可用性: {{availability}}%

📈 趋势分析:
• 告警增长率: {{alertGrowthRate}}%
• 解决效率提升: {{efficiencyImprovement}}%

🎯 重要指标:
• 误报率: {{falsePositiveRate}}%
• 平均响应时间: {{averageResponseTime}}分钟

💡 优化建议:
{{optimizationSuggestions}}`,
    },
  },
});

/**
 * 模板格式化规则
 */
export const TEMPLATE_FORMATTING_RULES = deepFreeze({
  /**
   * 数值格式化规则
   */
  NUMERIC: {
    // 整数格式化
    INTEGER: (value: number): string => {
      return Number.isInteger(value) ? value.toString() : Math.round(value).toString();
    },
    
    // 小数格式化
    DECIMAL: (value: number, places: number = TEMPLATE_CONFIG.FORMATS.DECIMAL_PLACES): string => {
      return value.toFixed(places);
    },
    
    // 百分比格式化
    PERCENTAGE: (value: number): string => {
      return `${(value * 100).toFixed(TEMPLATE_CONFIG.FORMATS.DECIMAL_PLACES)}%`;
    },
    
    // 大数字格式化（添加千分位分隔符）
    LARGE_NUMBER: (value: number): string => {
      return value.toLocaleString('zh-CN');
    },
  },

  /**
   * 时间格式化规则
   */
  DATETIME: {
    // 标准时间戳格式化
    STANDARD: (timestamp: number | Date): string => {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    },
    
    // 日期格式化
    DATE_ONLY: (timestamp: number | Date): string => {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      return date.toLocaleDateString('zh-CN');
    },
    
    // 时间格式化  
    TIME_ONLY: (timestamp: number | Date): string => {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      return date.toLocaleTimeString('zh-CN');
    },
    
    // 相对时间格式化
    RELATIVE: (timestamp: number | Date): string => {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffMins < 1) return '刚刚';
      if (diffMins < 60) return `${diffMins}分钟前`;
      if (diffHours < 24) return `${diffHours}小时前`;
      if (diffDays < 7) return `${diffDays}天前`;
      return date.toLocaleDateString('zh-CN');
    },
  },

  /**
   * 持续时间格式化规则
   */
  DURATION: {
    // 秒级持续时间格式化
    SECONDS: (seconds: number): string => {
      if (seconds < 60) return `${seconds}秒`;
      if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
      if (seconds < 86400) {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${hours}小时${mins}分`;
      }
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      return `${days}天${hours}小时`;
    },
    
    // 毫秒级持续时间格式化
    MILLISECONDS: (ms: number): string => {
      return TEMPLATE_FORMATTING_RULES.DURATION.SECONDS(Math.floor(ms / 1000));
    },
  },

  /**
   * 文本格式化规则
   */
  TEXT: {
    // 截断长文本
    TRUNCATE: (text: string, maxLength: number = 100): string => {
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength - 3) + '...';
    },
    
    // 首字母大写
    CAPITALIZE: (text: string): string => {
      if (!text) return text;
      return text.charAt(0).toUpperCase() + text.slice(1);
    },
    
    // 转换为标题格式
    TITLE_CASE: (text: string): string => {
      return text.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
    },
  },
});

/**
 * 模板工具类
 */
export class TemplateUtil {
  /**
   * 替换模板中的变量
   */
  static replaceVariables(template: string, variables: Record<string, any>): string {
    return template.replace(TEMPLATE_CONFIG.FORMATS.VARIABLE_PATTERN, (match, variableName) => {
      const value = variables[variableName];
      if (value === undefined || value === null) {
        return match; // 保持原变量格式
      }
      return String(value);
    });
  }

  /**
   * 提取模板中的变量名
   */
  static extractVariableNames(template: string): string[] {
    const variables: string[] = [];
    const matches = Array.from(template.matchAll(TEMPLATE_CONFIG.FORMATS.VARIABLE_PATTERN));
    
    for (const match of matches) {
      if (match[1] && !variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    
    return variables;
  }

  /**
   * 验证模板格式
   */
  static validateTemplate(template: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查模板长度
    if (template.length < TEMPLATE_CONFIG.VALIDATION.MIN_TEMPLATE_LENGTH) {
      errors.push('模板长度过短');
    }
    
    if (template.length > TEMPLATE_CONFIG.VALIDATION.MAX_TEMPLATE_LENGTH) {
      errors.push('模板长度过长');
    }

    // 检查变量数量
    const variables = this.extractVariableNames(template);
    if (variables.length > TEMPLATE_CONFIG.VALIDATION.MAX_VARIABLES_PER_TEMPLATE) {
      errors.push('模板中变量数量过多');
    }

    // 检查变量名格式
    for (const variable of variables) {
      if (!TEMPLATE_CONFIG.VALIDATION.VARIABLE_NAME_PATTERN.test(variable)) {
        errors.push(`无效的变量名: ${variable}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 格式化变量值
   */
  static formatVariableValue(value: any, type: 'number' | 'datetime' | 'duration' | 'text' = 'text'): string {
    if (value === undefined || value === null) {
      return '';
    }

    switch (type) {
      case 'number':
        if (typeof value === 'number') {
          return TEMPLATE_FORMATTING_RULES.NUMERIC.LARGE_NUMBER(value);
        }
        break;
      case 'datetime':
        if (typeof value === 'number' || value instanceof Date) {
          return TEMPLATE_FORMATTING_RULES.DATETIME.STANDARD(value);
        }
        break;
      case 'duration':
        if (typeof value === 'number') {
          return TEMPLATE_FORMATTING_RULES.DURATION.SECONDS(value);
        }
        break;
      case 'text':
      default:
        return TEMPLATE_FORMATTING_RULES.TEXT.TRUNCATE(String(value));
    }

    return String(value);
  }

  /**
   * 构建完整的模板上下文
   */
  static buildTemplateContext(
    alertData: any,
    systemData: any = {},
    userData: any = {}
  ): Record<string, any> {
    const currentTime = new Date();
    
    return {
      // 告警相关变量
      ...alertData,
      
      // 系统信息变量
      timestamp: TEMPLATE_FORMATTING_RULES.DATETIME.STANDARD(currentTime),
      serviceName: systemData.serviceName || 'Alert Service',
      environment: systemData.environment || process.env.NODE_ENV || 'development',
      version: systemData.version || '1.0.0',
      hostname: systemData.hostname || 'localhost',
      ipAddress: systemData.ipAddress || '127.0.0.1',
      
      // 用户信息变量
      userId: userData.userId || 'unknown',
      username: userData.username || 'System',
      userEmail: userData.userEmail || 'system@example.com',
      userRole: userData.userRole || 'user',
    };
  }

  /**
   * 获取预定义模板
   */
  static getPredefinedTemplate(category: string, templateName: string): { title: string; content: string } | null {
    const templates = PREDEFINED_TEMPLATES[category as keyof typeof PREDEFINED_TEMPLATES];
    if (!templates) return null;
    
    const template = templates[templateName as keyof typeof templates];
    return template || null;
  }

  /**
   * 渲染完整模板（标题和内容）
   */
  static renderTemplate(
    template: { title: string; content: string },
    context: Record<string, any>
  ): { title: string; content: string } {
    return {
      title: this.replaceVariables(template.title, context),
      content: this.replaceVariables(template.content, context),
    };
  }

  /**
   * 创建自定义模板
   */
  static createCustomTemplate(
    title: string,
    content: string,
    variables: Record<string, any> = {}
  ): { title: string; content: string; variables: string[] } {
    const titleVariables = this.extractVariableNames(title);
    const contentVariables = this.extractVariableNames(content);
    const allVariables = Array.from(new Set([...titleVariables, ...contentVariables]));

    return {
      title,
      content,
      variables: allVariables,
    };
  }
}

/**
 * 类型定义
 */
export type TemplateConfig = typeof TEMPLATE_CONFIG;
export type PredefinedTemplates = typeof PREDEFINED_TEMPLATES;
export type TemplateFormattingRules = typeof TEMPLATE_FORMATTING_RULES;