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

// 🗄️ 统一数据库模块 (提供NotificationLog Schema)
import { DatabaseModule } from '../database/database.module';

// Controllers
import { NotificationController } from './controllers/notification.controller';
import { TemplateController } from './controllers/template.controller';

// Services  
import { NotificationService } from './services/notification.service';
import { NotificationHistoryService } from './services/notification-history.service';
import { NotificationAdapterService } from './services/notification-adapter.service';
import { NotificationTemplateService } from './services/notification-template.service';
import { NotificationTemplateInitializerService } from './services/notification-template-initializer.service';

// Event Listeners
import { AlertEventListener } from './listeners/alert-event.listener';
import { GenericAlertEventListener } from './listeners/generic-alert-event.listener';

// Schemas
import { NotificationSchema } from './schemas/notification.schema';
import { NotificationChannelSchema } from './schemas/notification-channel.schema';
import { NotificationTemplate, NotificationTemplateSchema } from './schemas/notification-template.schema';

// Senders (已从alert模块迁移)
import { EmailSender } from './services/senders/email.sender';
import { WebhookSender } from './services/senders/webhook.sender';
import { SlackSender } from './services/senders/slack.sender';
import { DingTalkSender } from './services/senders/dingtalk.sender';
import { LogSender } from './services/senders/log.sender';

@Module({
  imports: [
    HttpModule,
    // 🗄️ 统一数据库模块 (包含NotificationLog Schema)
    DatabaseModule,
    MongooseModule.forFeature([
      { name: 'Notification', schema: NotificationSchema },
      { name: 'NotificationChannel', schema: NotificationChannelSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
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
    NotificationAdapterService,
    NotificationTemplateService,
    NotificationTemplateInitializerService,
    
    // Event Listeners
    AlertEventListener,                  // 向后兼容（依赖Alert模块）
    GenericAlertEventListener,           // 解耦架构（独立类型）
    
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
    NotificationAdapterService,          // 独立类型服务
    NotificationTemplateService,         // 模板服务
    NotificationTemplateInitializerService, // 模板初始化服务
  ],
})
export class NotificationModule {}