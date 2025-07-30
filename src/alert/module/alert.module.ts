import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";

import { AuthModule } from "../../auth/module/auth.module";
import { CacheModule } from "../../cache/module/cache.module";
import { alertConfig } from "../../common/config/alert.config";

import { AlertController } from "../controller/alert.controller";
import { AlertHistoryRepository } from "../repositories/alert-history.repository";
import { AlertRuleRepository } from "../repositories/alert-rule.repository";
import {
  NotificationLog,
  NotificationLogSchema,
} from "../schemas/notification-log.schema";
import { 
  AlertRule, 
  AlertRuleSchema,
 } from "../schemas/alert-rule.schema";
import { 
  AlertHistory, 
  AlertHistorySchema
 } from "../schemas/alert-history.schema";
import {
  AlertHistoryService,
  AlertingService,
  NotificationService,
  RuleEngineService,
} from "../services/";
import {
  DingTalkSender,
  EmailSender,
  LogSender,
  SlackSender,
  WebhookSender,
} from "../services/notification-senders";

@Module({
  imports: [
    // 基础模块
    AuthModule,
    CacheModule,

    // MongoDB Schemas
    MongooseModule.forFeature([
      { name: AlertRule.name, schema: AlertRuleSchema },
      { name: AlertHistory.name, schema: AlertHistorySchema },
      { name: NotificationLog.name, schema: NotificationLogSchema },
    ]),
    ConfigModule.forFeature(alertConfig),

    // HTTP 客户端用于 Webhook 通知
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),

    // 事件发射器用于监听系统事件
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: ".",
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),

    // 定时任务用于定期评估规则
    ScheduleModule.forRoot(),
  ],

  controllers: [AlertController],

  providers: [
    AlertingService,
    RuleEngineService,
    NotificationService,
    AlertHistoryService,
    AlertRuleRepository,
    AlertHistoryRepository,
    // Senders
    EmailSender,
    WebhookSender,
    SlackSender,
    LogSender,
    DingTalkSender,
  ],

  exports: [
    AlertingService,
    RuleEngineService,
    NotificationService,
    AlertHistoryService,
    AlertRuleRepository,
    AlertHistoryRepository,
  ],
})
export class AlertModule {}
