/**
 * 通知渠道模板配置
 * 🎯 从常量迁移而来的可配置模板定义
 *
 * @description 支持环境差异化和运行时调整的模板配置
 */

import { IsObject, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class AlertTemplateConfig {
  email: {
    title: string;
    content: string;
  } = {
    title: "[{severity}] {ruleName} 警告触发",
    content: `警告规则: {ruleName}
严重程度: {severity}
触发时间: {startTime}
当前值: {value}
阈值: {threshold}
监控指标: {metric}
描述: {message}

请及时处理此警告。`,
  };

  sms: {
    content: string;
  } = {
    content: "{ruleName} 警告触发，当前值: {value}，阈值: {threshold}",
  };

  webhook: {
    payload: Record<string, any>;
  } = {
    payload: {
      alert: {
        id: "{alertId}",
        ruleName: "{ruleName}",
        severity: "{severity}",
        status: "{status}",
        value: "{value}",
        threshold: "{threshold}",
        metric: "{metric}",
        startTime: "{startTime}",
        message: "{message}",
      },
    },
  };
}

export class NotificationChannelTemplatesConfig {
  @Type(() => AlertTemplateConfig)
  alertFired: AlertTemplateConfig = new AlertTemplateConfig();

  @Type(() => AlertTemplateConfig)
  alertResolved: AlertTemplateConfig = new AlertTemplateConfig();

  @Type(() => AlertTemplateConfig)
  alertAcknowledged: AlertTemplateConfig = new AlertTemplateConfig();
}
