/**
 * Notification统一配置管理
 * 🎯 现代化配置系统，无兼容层代码
 *
 * @description 统一配置管理，完整类型验证，零遗留代码
 */

import { registerAs } from "@nestjs/config";
import {
  IsNumber,
  IsBoolean,
  IsString,
  IsObject,
  ValidateNested,
  Min,
  Max,
  MinLength,
  MaxLength,
  validateSync,
} from "class-validator";
import { Type, plainToClass } from "class-transformer";

// 批处理配置组
export class NotificationBatchConfig {
  @IsNumber()
  @Min(1)
  @Max(1000)
  defaultBatchSize: number = 10;

  @IsNumber()
  @Min(1)
  @Max(10000)
  maxBatchSize: number = 100;

  @IsNumber()
  @Min(1)
  @Max(100)
  maxConcurrency: number = 5;

  @IsNumber()
  @Min(1000)
  @Max(300000)
  batchTimeout: number = 60000;
}

// 超时配置组
export class NotificationTimeoutConfig {
  @IsNumber()
  @Min(1000)
  @Max(180000)
  defaultTimeout: number = 15000;

  @IsNumber()
  @Min(1000)
  @Max(180000)
  emailTimeout: number = 30000;

  @IsNumber()
  @Min(1000)
  @Max(30000)
  smsTimeout: number = 5000;

  @IsNumber()
  @Min(1000)
  @Max(60000)
  webhookTimeout: number = 10000;
}

// 重试配置组
export class NotificationRetryConfig {
  @IsNumber()
  @Min(1)
  @Max(10)
  maxRetryAttempts: number = 3;

  @IsNumber()
  @Min(100)
  @Max(10000)
  initialRetryDelay: number = 1000;

  @IsNumber()
  @Min(1.1)
  @Max(5.0)
  retryBackoffMultiplier: number = 2;

  @IsNumber()
  @Min(1000)
  @Max(300000)
  maxRetryDelay: number = 30000;

  @IsNumber()
  @Min(0.0)
  @Max(1.0)
  jitterFactor: number = 0.1;
}

// 验证限制配置组
export class NotificationValidationConfig {
  @IsNumber()
  @Min(1)
  @Max(100)
  variableNameMinLength: number = 1;

  @IsNumber()
  @Min(1)
  @Max(500)
  variableNameMaxLength: number = 50;

  @IsNumber()
  @Min(1)
  @Max(1000)
  minTemplateLength: number = 1;

  @IsNumber()
  @Min(100)
  @Max(50000)
  maxTemplateLength: number = 10000;

  @IsNumber()
  @Min(1)
  @Max(500)
  titleMaxLength: number = 200;

  @IsNumber()
  @Min(10)
  @Max(10000)
  contentMaxLength: number = 2000;
}

// 功能开关配置组
export class NotificationFeatureConfig {
  @IsBoolean()
  enableBatchProcessing: boolean = true;

  @IsBoolean()
  enableRetryMechanism: boolean = true;

  @IsBoolean()
  enablePriorityQueue: boolean = true;

  @IsBoolean()
  enableMetricsCollection: boolean = true;
}

// 模板配置组
export class NotificationTemplateConfig {
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  defaultTextTemplate: string = `告警详情:
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
{{/if}}`;

  @IsString()
  @MinLength(5)
  @MaxLength(200)
  defaultEmailSubjectTemplate: string =
    `[{{severity}}] {{ruleName}} - {{status}}`;
}

// 主配置类
export class NotificationUnifiedConfigValidation {
  @ValidateNested()
  @Type(() => NotificationBatchConfig)
  batch: NotificationBatchConfig = new NotificationBatchConfig();

  @ValidateNested()
  @Type(() => NotificationTimeoutConfig)
  timeouts: NotificationTimeoutConfig = new NotificationTimeoutConfig();

  @ValidateNested()
  @Type(() => NotificationRetryConfig)
  retry: NotificationRetryConfig = new NotificationRetryConfig();

  @ValidateNested()
  @Type(() => NotificationValidationConfig)
  validation: NotificationValidationConfig = new NotificationValidationConfig();

  @ValidateNested()
  @Type(() => NotificationFeatureConfig)
  features: NotificationFeatureConfig = new NotificationFeatureConfig();

  @ValidateNested()
  @Type(() => NotificationTemplateConfig)
  templates: NotificationTemplateConfig = new NotificationTemplateConfig();

  // 渠道配置使用简化配置模式
  @IsObject()
  channelTemplates: Record<string, any> = {};

  @IsObject()
  channelDefaults: Record<string, any> = {};
}

export default registerAs(
  "notification",
  (): NotificationUnifiedConfigValidation => {
    const rawConfig = {
      batch: {
        defaultBatchSize:
          parseInt(process.env.NOTIFICATION_DEFAULT_BATCH_SIZE, 10) || 10,
        maxBatchSize:
          parseInt(process.env.NOTIFICATION_MAX_BATCH_SIZE, 10) || 100,
        maxConcurrency:
          parseInt(process.env.NOTIFICATION_MAX_CONCURRENCY, 10) || 5,
        batchTimeout:
          parseInt(process.env.NOTIFICATION_BATCH_TIMEOUT, 10) || 60000,
      },
      timeouts: {
        defaultTimeout:
          parseInt(process.env.NOTIFICATION_DEFAULT_TIMEOUT, 10) || 15000,
        emailTimeout:
          parseInt(process.env.NOTIFICATION_EMAIL_TIMEOUT, 10) || 30000,
        smsTimeout: parseInt(process.env.NOTIFICATION_SMS_TIMEOUT, 10) || 5000,
        webhookTimeout:
          parseInt(process.env.NOTIFICATION_WEBHOOK_TIMEOUT, 10) || 10000,
      },
      retry: {
        maxRetryAttempts:
          parseInt(process.env.NOTIFICATION_MAX_RETRY_ATTEMPTS, 10) || 3,
        initialRetryDelay:
          parseInt(process.env.NOTIFICATION_INITIAL_RETRY_DELAY, 10) || 1000,
        retryBackoffMultiplier:
          parseFloat(process.env.NOTIFICATION_RETRY_BACKOFF_MULTIPLIER) || 2,
        maxRetryDelay:
          parseInt(process.env.NOTIFICATION_MAX_RETRY_DELAY, 10) || 30000,
        jitterFactor: parseFloat(process.env.NOTIFICATION_JITTER_FACTOR) || 0.1,
      },
      validation: {
        variableNameMinLength: 1,
        variableNameMaxLength: 50,
        minTemplateLength: 1,
        maxTemplateLength: 10000,
        titleMaxLength: 200,
        contentMaxLength: 2000,
      },
      features: {
        enableBatchProcessing:
          process.env.NOTIFICATION_ENABLE_BATCH_PROCESSING !== "false",
        enableRetryMechanism:
          process.env.NOTIFICATION_ENABLE_RETRY_MECHANISM !== "false",
        enablePriorityQueue:
          process.env.NOTIFICATION_ENABLE_PRIORITY_QUEUE !== "false",
        enableMetricsCollection:
          process.env.NOTIFICATION_ENABLE_METRICS_COLLECTION !== "false",
      },
      templates: {
        defaultTextTemplate:
          process.env.NOTIFICATION_DEFAULT_TEXT_TEMPLATE ||
          "告警详情:\\n- 规则名称: {{ruleName}}\\n- 监控指标: {{metric}}\\n- 当前值: {{value}}\\n- 阈值: {{threshold}}\\n- 严重级别: {{severity}}\\n- 状态: {{status}}\\n- 开始时间: {{startTime}}\\n- 持续时间: {{duration}}秒\\n- 告警消息: {{message}}\\n\\n{{#if tags}}\\n标签: {{{tags}}}\\n{{/if}}",
        defaultEmailSubjectTemplate:
          process.env.NOTIFICATION_EMAIL_SUBJECT_TEMPLATE ||
          "[{{severity}}] {{ruleName}} - {{status}}",
      },
      channelTemplates: {},
      channelDefaults: {},
    };

    const config = plainToClass(
      NotificationUnifiedConfigValidation,
      rawConfig,
      {
        enableImplicitConversion: true,
      },
    );

    const errors = validateSync(config, {
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: false,
    });

    if (errors.length > 0) {
      const errorMessages = errors
        .map(
          (error) =>
            `${error.property}: ${Object.values(error.constraints || {}).join(", ")}`,
        )
        .join("; ");
      throw new Error(
        `Notification configuration validation failed: ${errorMessages}`,
      );
    }

    return config;
  },
);

export type NotificationUnifiedConfig = NotificationUnifiedConfigValidation;
