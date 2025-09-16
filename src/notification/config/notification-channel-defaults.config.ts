/**
 * 通知渠道默认配置
 * 🎯 从常量迁移而来的可配置渠道设置
 */

import { IsString, IsNumber, IsBoolean, IsObject, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class EmailChannelDefaultConfig {
  @IsString()
  defaultHost: string = "";

  @IsNumber() @Min(1) @Max(65535)
  defaultPort: number = 587;

  @IsBoolean()
  defaultSecure: boolean = false;

  @IsString()
  defaultFrom: string = "";
}

export class SmsChannelDefaultConfig {
  @IsString()
  defaultProvider: string = "aliyun";

  @IsString()
  defaultSignName: string = "";

  @IsString()
  defaultTemplateCode: string = "";
}

export class WebhookChannelDefaultConfig {
  @IsString()
  defaultMethod: string = "POST";

  defaultHeaders: Record<string, string> = {};

  @IsBoolean()
  defaultVerifySSL: boolean = true;
}

export class SlackChannelDefaultConfig {
  @IsString()
  defaultUsername: string = "AlertBot";

  @IsString()
  defaultIconEmoji: string = ":warning:";
}

export class NotificationChannelDefaultsConfig {
  @Type(() => EmailChannelDefaultConfig)
  email: EmailChannelDefaultConfig = new EmailChannelDefaultConfig();

  @Type(() => SmsChannelDefaultConfig)
  sms: SmsChannelDefaultConfig = new SmsChannelDefaultConfig();

  @Type(() => WebhookChannelDefaultConfig)
  webhook: WebhookChannelDefaultConfig = new WebhookChannelDefaultConfig();

  @Type(() => SlackChannelDefaultConfig)
  slack: SlackChannelDefaultConfig = new SlackChannelDefaultConfig();
}