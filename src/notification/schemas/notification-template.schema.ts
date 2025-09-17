/**
 * 通知模板数据库Schema
 * 🎯 实现通知模板的持久化存储
 *
 * @description 替代常量文件中的模板定义，实现动态模板管理
 * @author Claude Code Assistant
 * @date 2025-09-12
 */

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

/**
 * 模板引擎类型
 */
export type TemplateEngine = "handlebars" | "mustache" | "plain";

/**
 * 模板变量定义
 */
export interface TemplateVariable {
  name: string;
  type: "string" | "number" | "date" | "boolean" | "object";
  description: string;
  required: boolean;
  defaultValue?: any;
}

/**
 * 模板内容定义
 */
export interface TemplateContent {
  subject?: string; // 邮件主题或通知标题
  body: string; // 通知内容主体
  format: "text" | "html" | "markdown" | "json";
}

/**
 * 渠道特定配置
 */
export interface ChannelSpecificTemplate {
  channelType: string;
  template: TemplateContent;
  variables?: TemplateVariable[];
}

/**
 * 通知模板Document
 */
@Schema({
  collection: "notification_templates",
  timestamps: true,
  versionKey: false,
})
export class NotificationTemplate {
  _id?: any;

  /**
   * 模板基本信息
   */
  @Prop({ required: true, unique: true, index: true })
  templateId: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  /**
   * 模板分类和类型
   */
  @Prop({
    required: true,
    enum: [
      "alert_fired",
      "alert_resolved",
      "alert_acknowledged",
      "alert_suppressed",
      "alert_escalated",
      "custom",
    ],
    index: true,
  })
  eventType: string;

  @Prop({
    required: true,
    enum: ["system", "user_defined"],
    default: "user_defined",
    index: true,
  })
  templateType: string;

  /**
   * 默认模板内容
   */
  @Prop({
    type: {
      subject: { type: String },
      body: { type: String, required: true },
      format: {
        type: String,
        enum: ["text", "html", "markdown", "json"],
        default: "text",
      },
    },
    required: true,
  })
  defaultContent: TemplateContent;

  /**
   * 渠道特定模板
   */
  @Prop({
    type: [
      {
        channelType: {
          type: String,
          required: true,
          enum: ["email", "sms", "webhook", "slack", "dingtalk", "log"],
        },
        template: {
          subject: { type: String },
          body: { type: String, required: true },
          format: {
            type: String,
            enum: ["text", "html", "markdown", "json"],
            default: "text",
          },
        },
        variables: [
          {
            name: { type: String, required: true },
            type: {
              type: String,
              enum: ["string", "number", "date", "boolean", "object"],
              default: "string",
            },
            description: { type: String, required: true },
            required: { type: Boolean, default: false },
            defaultValue: { type: Object },
          },
        ],
      },
    ],
    default: [],
  })
  channelTemplates: ChannelSpecificTemplate[];

  /**
   * 模板变量定义
   */
  @Prop({
    type: [
      {
        name: { type: String, required: true },
        type: {
          type: String,
          enum: ["string", "number", "date", "boolean", "object"],
          default: "string",
        },
        description: { type: String, required: true },
        required: { type: Boolean, default: false },
        defaultValue: { type: Object },
      },
    ],
    default: [],
  })
  variables: TemplateVariable[];

  /**
   * 模板配置
   */
  @Prop({ default: true })
  enabled: boolean;

  @Prop({ default: 0, min: 0, max: 100 })
  priority: number;

  @Prop({
    type: String,
    enum: ["handlebars", "mustache", "plain"],
    default: "handlebars",
  })
  templateEngine: TemplateEngine;

  /**
   * 使用统计
   */
  @Prop({ default: 0 })
  usageCount: number;

  @Prop()
  lastUsedAt?: Date;

  /**
   * 版本控制
   */
  @Prop({ default: "1.0.0" })
  version: string;

  @Prop()
  parentTemplateId?: string; // 用于模板继承

  /**
   * 标签和分类
   */
  @Prop({ type: [String], default: [], index: true })
  tags: string[];

  @Prop()
  category?: string;

  /**
   * 审计信息
   */
  @Prop()
  createdBy?: string;

  @Prop()
  updatedBy?: string;

  @Prop()
  approvedBy?: string;

  @Prop()
  approvedAt?: Date;

  /**
   * 元数据
   */
  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  /**
   * 时间戳
   */
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTemplateDocument
  extends NotificationTemplate,
    Document {
  incrementUsage(): Promise<NotificationTemplateDocument>;
  getChannelTemplate(channelType: string): TemplateContent;
  validateVariables(variables: Record<string, any>): {
    valid: boolean;
    errors: string[];
  };
}

export const NotificationTemplateSchema =
  SchemaFactory.createForClass(NotificationTemplate);

/**
 * 创建复合索引
 */
NotificationTemplateSchema.index(
  { templateId: 1, version: 1 },
  { unique: true },
);
NotificationTemplateSchema.index({ eventType: 1, enabled: 1 });
NotificationTemplateSchema.index({ templateType: 1, enabled: 1 });
NotificationTemplateSchema.index({ tags: 1 });
NotificationTemplateSchema.index({ createdAt: -1 });
NotificationTemplateSchema.index({ usageCount: -1 });

/**
 * Schema中间件
 */
NotificationTemplateSchema.pre("save", function (next) {
  if (this.isNew) {
    this.createdAt = new Date();
  }
  this.updatedAt = new Date();
  next();
});

/**
 * 实例方法
 */
NotificationTemplateSchema.methods.incrementUsage = function () {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  return this.save();
};

NotificationTemplateSchema.methods.getChannelTemplate = function (
  channelType: string,
) {
  const channelTemplate = this.channelTemplates.find(
    (template: ChannelSpecificTemplate) => template.channelType === channelType,
  );
  return channelTemplate ? channelTemplate.template : this.defaultContent;
};

NotificationTemplateSchema.methods.validateVariables = function (
  variables: Record<string, any>,
) {
  const errors: string[] = [];

  for (const templateVar of this.variables) {
    if (templateVar.required && !(templateVar.name in variables)) {
      errors.push(`缺少必需变量: ${templateVar.name}`);
    }

    if (templateVar.name in variables) {
      const value = variables[templateVar.name];
      const expectedType = templateVar.type;

      if (expectedType === "number" && typeof value !== "number") {
        errors.push(`变量 ${templateVar.name} 应为数字类型`);
      } else if (expectedType === "string" && typeof value !== "string") {
        errors.push(`变量 ${templateVar.name} 应为字符串类型`);
      } else if (expectedType === "boolean" && typeof value !== "boolean") {
        errors.push(`变量 ${templateVar.name} 应为布尔类型`);
      } else if (expectedType === "date" && !(value instanceof Date)) {
        errors.push(`变量 ${templateVar.name} 应为日期类型`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * 静态方法
 */
NotificationTemplateSchema.statics.findByEventType = function (
  eventType: string,
) {
  return this.find({ eventType, enabled: true }).sort({
    priority: -1,
    createdAt: -1,
  });
};

NotificationTemplateSchema.statics.findByTags = function (tags: string[]) {
  return this.find({ tags: { $in: tags }, enabled: true });
};

NotificationTemplateSchema.statics.searchTemplates = function (query: string) {
  return this.find({
    $or: [
      { name: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
      { tags: { $in: [new RegExp(query, "i")] } },
    ],
    enabled: true,
  });
};
