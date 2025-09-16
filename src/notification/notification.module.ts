/**
 * Notification模块
 * 🎯 专门负责通知发送和管理
 * 
 * @description 从Alert模块拆分出来的独立通知模块
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

// 🗄️ 统一数据库模块 (提供NotificationLog Schema)
import { DatabaseModule } from '../database/database.module';

// 📄 通用分页器模块
import { PaginationModule } from '../common/modules/pagination/modules/pagination.module';

// Controllers
import { NotificationController } from './controllers/notification.controller';
import { TemplateController } from './controllers/template.controller';

// Services  
import { NotificationService } from './services/notification.service';
import { NotificationHistoryService } from './services/notification-history.service';
import { NotificationTemplateService } from './services/notification-template.service';
import { NotificationTemplateInitializerService } from './services/notification-template-initializer.service';
import { NotificationConfigService } from './services/notification-config.service';

// Event Listeners and Handlers
import { NotificationEventHandler } from './handlers/notification-event.handler';

// Adapters
import { AlertToNotificationAdapter } from './adapters/alert-to-notification.adapter';

// Schemas
import { NotificationInstance, NotificationSchema } from './schemas/notification.schema';
import { NotificationChannel, NotificationChannelSchema } from './schemas/notification-channel.schema';
import { NotificationTemplate, NotificationTemplateSchema } from './schemas/notification-template.schema';
import { NotificationLog, NotificationLogSchema } from './schemas/notification-log.schema';

// Senders (已从alert模块迁移)
import { EmailSender } from './services/senders/email.sender';
import { WebhookSender } from './services/senders/webhook.sender';
import { SlackSender } from './services/senders/slack.sender';
import { DingTalkSender } from './services/senders/dingtalk.sender';
import { LogSender } from './services/senders/log.sender';

// Configuration
import { notificationUnifiedConfig } from './config';

@Module({
  imports: [
    HttpModule,
    // 🗄️ 统一数据库模块 (包含NotificationLog Schema)
    DatabaseModule,
    // 📄 通用分页器模块
    PaginationModule,
    // ⚙️ 配置模块 (使用新的统一配置)
    ConfigModule.forFeature(notificationUnifiedConfig),
    MongooseModule.forFeature([
      { name: NotificationInstance.name, schema: NotificationSchema },
      { name: NotificationChannel.name, schema: NotificationChannelSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: NotificationLog.name, schema: NotificationLogSchema },
    ]),
  ],
  controllers: [
    NotificationController,
    TemplateController,
  ],
  providers: [
    // Core Services
    NotificationService,
    NotificationHistoryService,
    NotificationTemplateService,
    NotificationTemplateInitializerService,
    NotificationConfigService,
    
    // Adapters
    AlertToNotificationAdapter,
    
    // Event Listeners and Handlers
    NotificationEventHandler,
    
    // Notification Senders (已迁移)
    EmailSender,
    WebhookSender, 
    SlackSender,
    DingTalkSender,
    LogSender,
  ],
  exports: [
    NotificationService,
    NotificationHistoryService,
    NotificationTemplateService,         // 模板服务
    NotificationTemplateInitializerService, // 模板初始化服务
    NotificationConfigService,           // 配置服务
  ],
})
export class NotificationModule {}