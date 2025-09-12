/**
 * 通知模板初始化服务
 * 🎯 负责初始化系统默认模板
 * 
 * @description 创建系统预设的通知模板，替代常量文件中的静态模板
 * @author Claude Code Assistant
 * @date 2025-09-12
 */

import { Injectable } from '@nestjs/common';

import { createLogger } from '@appcore/config/logger.config';

import { NotificationTemplateService } from './notification-template.service';
import type { CreateTemplateDto } from './notification-template.service';

import { NOTIFICATION_OPERATIONS } from '../constants/notification.constants';

@Injectable()
export class NotificationTemplateInitializerService {
  private readonly logger = createLogger('NotificationTemplateInitializerService');

  constructor(
    private readonly templateService: NotificationTemplateService,
  ) {}

  /**
   * 初始化所有默认模板
   */
  async initializeDefaultTemplates(): Promise<void> {
    this.logger.log('开始初始化默认通知模板', {
      operation: NOTIFICATION_OPERATIONS.INITIALIZE_DEFAULT_TEMPLATES,
    });

    try {
      await Promise.all([
        this.initializeAlertFiredTemplates(),
        this.initializeAlertResolvedTemplates(),
        this.initializeAlertAcknowledgedTemplates(),
        this.initializeAlertSuppressedTemplates(),
        this.initializeAlertEscalatedTemplates(),
      ]);

      this.logger.log('默认通知模板初始化完成', {
        operation: NOTIFICATION_OPERATIONS.INITIALIZE_DEFAULT_TEMPLATES,
      });
    } catch (error) {
      this.logger.error('默认通知模板初始化失败', {
        operation: NOTIFICATION_OPERATIONS.INITIALIZE_DEFAULT_TEMPLATES,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 初始化警告触发模板
   */
  private async initializeAlertFiredTemplates(): Promise<void> {
    const template: CreateTemplateDto = {
      templateId: 'system-alert-fired-default',
      name: '警告触发通知模板（系统默认）',
      description: '当警告被触发时发送的通知模板',
      eventType: 'alert_fired',
      templateType: 'system',
      defaultContent: {
        subject: '[{{severity}}] {{ruleName}} - 警告触发',
        body: `🚨 **警告触发通知**

**警告详情:**
- 规则名称: {{ruleName}}
- 监控指标: {{metric}}
- 当前值: {{value}}
- 阈值: {{threshold}}
- 严重级别: {{severity}}
- 触发时间: {{startTime}}

**警告消息:**
{{message}}

{{#if tags}}
**标签信息:**
{{tags}}
{{/if}}

请及时处理此警告以避免系统影响。`,
        format: 'text',
      },
      channelTemplates: [
        {
          channelType: 'email',
          template: {
            subject: '[{{severity}}] {{ruleName}} - 警告触发',
            body: `<h2 style="color: #d73027;">🚨 警告触发通知</h2>

<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">规则名称</td>
    <td style="padding: 10px; border: 1px solid #ddd;">{{ruleName}}</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">监控指标</td>
    <td style="padding: 10px; border: 1px solid #ddd;">{{metric}}</td>
  </tr>
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">当前值</td>
    <td style="padding: 10px; border: 1px solid #ddd; color: #d73027; font-weight: bold;">{{value}}</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">阈值</td>
    <td style="padding: 10px; border: 1px solid #ddd;">{{threshold}}</td>
  </tr>
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">严重级别</td>
    <td style="padding: 10px; border: 1px solid #ddd;">
      <span style="padding: 4px 8px; background-color: #ff6b6b; color: white; border-radius: 4px;">{{severity}}</span>
    </td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">触发时间</td>
    <td style="padding: 10px; border: 1px solid #ddd;">{{startTime}}</td>
  </tr>
</table>

<div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0;">
  <h4 style="margin: 0 0 10px 0; color: #856404;">警告消息:</h4>
  <p style="margin: 0; color: #856404;">{{message}}</p>
</div>

{{#if tags}}
<div style="margin: 20px 0;">
  <h4>标签信息:</h4>
  <p style="font-family: monospace; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">{{tags}}</p>
</div>
{{/if}}

<div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 4px; margin: 20px 0;">
  <p style="margin: 0; color: #0c5460;">⚠️ <strong>请及时处理此警告以避免系统影响。</strong></p>
</div>`,
            format: 'html',
          },
        },
        {
          channelType: 'slack',
          template: {
            body: `🚨 *警告触发通知*

*规则名称:* \`{{ruleName}}\`
*监控指标:* \`{{metric}}\`
*当前值:* \`{{value}}\` (阈值: \`{{threshold}}\`)
*严重级别:* {{#eq severity "critical"}}:red_circle:{{/eq}}{{#eq severity "warning"}}:warning:{{/eq}}{{#eq severity "info"}}:information_source:{{/eq}} \`{{severity}}\`
*触发时间:* {{startTime}}

*警告消息:*
> {{message}}

{{#if tags}}
*标签:* \`{{tags}}\`
{{/if}}

:point_right: 请及时处理此警告`,
            format: 'text',
          },
        },
        {
          channelType: 'webhook',
          template: {
            body: `{
  "type": "alert_fired",
  "alert": {
    "id": "{{alertId}}",
    "ruleName": "{{ruleName}}",
    "metric": "{{metric}}",
    "currentValue": "{{value}}",
    "threshold": "{{threshold}}",
    "severity": "{{severity}}",
    "status": "{{status}}",
    "firedAt": "{{startTime}}",
    "message": "{{message}}"{{#if tags}},
    "tags": "{{tags}}"{{/if}}
  },
  "rule": {
    "id": "{{ruleId}}",
    "name": "{{ruleName}}"{{#if ruleDescription}},
    "description": "{{ruleDescription}}"{{/if}}
  },
  "timestamp": "{{startTime}}",
  "action": "fired"
}`,
            format: 'json',
          },
        },
      ],
      variables: [
        { name: 'alertId', type: 'string', description: '警告ID', required: true },
        { name: 'ruleName', type: 'string', description: '规则名称', required: true },
        { name: 'ruleId', type: 'string', description: '规则ID', required: true },
        { name: 'ruleDescription', type: 'string', description: '规则描述', required: false },
        { name: 'metric', type: 'string', description: '监控指标', required: true },
        { name: 'value', type: 'number', description: '当前值', required: true },
        { name: 'threshold', type: 'number', description: '阈值', required: true },
        { name: 'severity', type: 'string', description: '严重级别', required: true },
        { name: 'status', type: 'string', description: '状态', required: true },
        { name: 'message', type: 'string', description: '警告消息', required: true },
        { name: 'startTime', type: 'string', description: '开始时间', required: true },
        { name: 'tags', type: 'string', description: '标签信息', required: false },
      ],
      enabled: true,
      priority: 100,
      templateEngine: 'handlebars',
      tags: ['系统默认', '警告触发', '通知'],
      category: '系统警告',
      createdBy: 'system',
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        description: '系统默认的警告触发通知模板',
      },
    };

    await this.createTemplateIfNotExists(template);
  }

  /**
   * 初始化警告解决模板
   */
  private async initializeAlertResolvedTemplates(): Promise<void> {
    const template: CreateTemplateDto = {
      templateId: 'system-alert-resolved-default',
      name: '警告解决通知模板（系统默认）',
      description: '当警告被解决时发送的通知模板',
      eventType: 'alert_resolved',
      templateType: 'system',
      defaultContent: {
        subject: '[已解决] {{ruleName}} - 警告恢复',
        body: `✅ **警告解决通知**

**警告详情:**
- 规则名称: {{ruleName}}
- 监控指标: {{metric}}
- 解决时间: {{resolvedAt}}
{{#if resolvedBy}}- 解决人: {{resolvedBy}}{{/if}}
{{#if duration}}- 持续时间: {{duration}}秒{{/if}}

**原始警告信息:**
- 触发时间: {{startTime}}
- 严重级别: {{severity}}
- 触发值: {{value}} (阈值: {{threshold}})

此警告已恢复正常，系统运行状态良好。`,
        format: 'text',
      },
      channelTemplates: [
        {
          channelType: 'email',
          template: {
            subject: '[已解决] {{ruleName}} - 警告恢复',
            body: `<h2 style="color: #28a745;">✅ 警告解决通知</h2>

<div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 4px; margin: 20px 0;">
  <p style="margin: 0; color: #155724;"><strong>好消息！警告已解决，系统恢复正常。</strong></p>
</div>

<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">规则名称</td>
    <td style="padding: 10px; border: 1px solid #ddd;">{{ruleName}}</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">监控指标</td>
    <td style="padding: 10px; border: 1px solid #ddd;">{{metric}}</td>
  </tr>
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">解决时间</td>
    <td style="padding: 10px; border: 1px solid #ddd; color: #28a745; font-weight: bold;">{{resolvedAt}}</td>
  </tr>
  {{#if resolvedBy}}
  <tr>
    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">解决人</td>
    <td style="padding: 10px; border: 1px solid #ddd;">{{resolvedBy}}</td>
  </tr>
  {{/if}}
  {{#if duration}}
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">持续时间</td>
    <td style="padding: 10px; border: 1px solid #ddd;">{{duration}}秒</td>
  </tr>
  {{/if}}
</table>

<h4>原始警告信息:</h4>
<ul>
  <li><strong>触发时间:</strong> {{startTime}}</li>
  <li><strong>严重级别:</strong> {{severity}}</li>
  <li><strong>触发值:</strong> {{value}} (阈值: {{threshold}})</li>
</ul>`,
            format: 'html',
          },
        },
      ],
      variables: [
        { name: 'alertId', type: 'string', description: '警告ID', required: true },
        { name: 'ruleName', type: 'string', description: '规则名称', required: true },
        { name: 'metric', type: 'string', description: '监控指标', required: true },
        { name: 'resolvedAt', type: 'string', description: '解决时间', required: true },
        { name: 'resolvedBy', type: 'string', description: '解决人', required: false },
        { name: 'duration', type: 'number', description: '持续时间（秒）', required: false },
        { name: 'startTime', type: 'string', description: '触发时间', required: true },
        { name: 'severity', type: 'string', description: '严重级别', required: true },
        { name: 'value', type: 'number', description: '触发值', required: true },
        { name: 'threshold', type: 'number', description: '阈值', required: true },
      ],
      enabled: true,
      priority: 90,
      templateEngine: 'handlebars',
      tags: ['系统默认', '警告解决', '通知'],
      category: '系统警告',
      createdBy: 'system',
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        description: '系统默认的警告解决通知模板',
      },
    };

    await this.createTemplateIfNotExists(template);
  }

  /**
   * 初始化警告确认模板
   */
  private async initializeAlertAcknowledgedTemplates(): Promise<void> {
    const template: CreateTemplateDto = {
      templateId: 'system-alert-acknowledged-default',
      name: '警告确认通知模板（系统默认）',
      description: '当警告被确认时发送的通知模板',
      eventType: 'alert_acknowledged',
      templateType: 'system',
      defaultContent: {
        subject: '[已确认] {{ruleName}} - 警告已确认',
        body: `📋 **警告确认通知**

**确认详情:**
- 规则名称: {{ruleName}}
- 监控指标: {{metric}}
- 确认人: {{acknowledgedBy}}
- 确认时间: {{acknowledgedAt}}

**原始警告信息:**
- 触发时间: {{startTime}}
- 严重级别: {{severity}}
- 当前值: {{value}} (阈值: {{threshold}})

此警告已被确认，正在处理中。`,
        format: 'text',
      },
      enabled: true,
      priority: 80,
      templateEngine: 'handlebars',
      tags: ['系统默认', '警告确认', '通知'],
      category: '系统警告',
      createdBy: 'system',
    };

    await this.createTemplateIfNotExists(template);
  }

  /**
   * 初始化警告抑制模板
   */
  private async initializeAlertSuppressedTemplates(): Promise<void> {
    const template: CreateTemplateDto = {
      templateId: 'system-alert-suppressed-default',
      name: '警告抑制通知模板（系统默认）',
      description: '当警告被抑制时发送的通知模板',
      eventType: 'alert_suppressed',
      templateType: 'system',
      defaultContent: {
        subject: '[已抑制] {{ruleName}} - 警告已抑制',
        body: `🔇 **警告抑制通知**

**抑制详情:**
- 规则名称: {{ruleName}}
- 监控指标: {{metric}}
- 抑制操作人: {{suppressedBy}}
- 抑制时间: {{suppressedAt}}
{{#if suppressionDuration}}- 抑制持续时间: {{suppressionDuration}}分钟{{/if}}
{{#if reason}}- 抑制原因: {{reason}}{{/if}}

**原始警告信息:**
- 触发时间: {{startTime}}
- 严重级别: {{severity}}
- 当前值: {{value}} (阈值: {{threshold}})

此警告已被临时抑制，在抑制期间将不会发送通知。`,
        format: 'text',
      },
      enabled: true,
      priority: 70,
      templateEngine: 'handlebars',
      tags: ['系统默认', '警告抑制', '通知'],
      category: '系统警告',
      createdBy: 'system',
    };

    await this.createTemplateIfNotExists(template);
  }

  /**
   * 初始化警告升级模板
   */
  private async initializeAlertEscalatedTemplates(): Promise<void> {
    const template: CreateTemplateDto = {
      templateId: 'system-alert-escalated-default',
      name: '警告升级通知模板（系统默认）',
      description: '当警告被升级时发送的通知模板',
      eventType: 'alert_escalated',
      templateType: 'system',
      defaultContent: {
        subject: '[严重程度升级] {{ruleName}} - {{previousSeverity}} → {{newSeverity}}',
        body: `🚨 **警告严重程度升级**

**升级详情:**
- 规则名称: {{ruleName}}
- 监控指标: {{metric}}
- 严重程度变化: {{previousSeverity}} → {{newSeverity}}
- 升级时间: {{escalatedAt}}
{{#if escalationReason}}- 升级原因: {{escalationReason}}{{/if}}

**当前警告状态:**
- 当前值: {{value}} (阈值: {{threshold}})
- 触发时间: {{startTime}}

{{#eq newSeverity "critical"}}
🔴 **紧急警告**: 此警告已升级为严重级别
⚡ 需要立即处理以防止系统影响扩大
📞 建议通知相关责任人员
{{else}}
📈 警告严重程度已升级，请及时处理
🔍 建议检查相关系统状态
{{/eq}}`,
        format: 'text',
      },
      enabled: true,
      priority: 95,
      templateEngine: 'handlebars',
      tags: ['系统默认', '警告升级', '通知'],
      category: '系统警告',
      createdBy: 'system',
    };

    await this.createTemplateIfNotExists(template);
  }

  /**
   * 创建模板（如果不存在）
   */
  private async createTemplateIfNotExists(template: CreateTemplateDto): Promise<void> {
    try {
      await this.templateService.findTemplateById(template.templateId);
      this.logger.debug('模板已存在，跳过创建', {
        templateId: template.templateId,
        name: template.name,
      });
    } catch (error) {
      // 模板不存在，创建新模板
      try {
        await this.templateService.createTemplate(template);
        this.logger.log('系统默认模板创建成功', {
          templateId: template.templateId,
          name: template.name,
          eventType: template.eventType,
        });
      } catch (createError) {
        this.logger.error('系统默认模板创建失败', {
          templateId: template.templateId,
          name: template.name,
          error: createError.message,
        });
        throw createError;
      }
    }
  }
}