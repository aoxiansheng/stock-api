/**
 * 集中化的通知配置
 */
export const notificationConfig = {
  // 默认的通知模板
  defaultTemplate: `
告警详情:
- 规则名称: {{ruleName}}
- 监控指标: {{metric}}
- 当前值: {{value}}
- 阈值: {{threshold}}
- 严重级别: {{severity}}
- 状态: {{status}}
- 开始时间: {{startTime}}
- 持续时间: {{duration}}秒
- 告警消息: {{message}}

{{#if tags}}
标签: {{{tags}}}
{{/if}}
  `.trim(),

  // 邮件主题模板
  emailSubjectTemplate: `[{{severity}}] {{ruleName}} - {{status}}`,
};
