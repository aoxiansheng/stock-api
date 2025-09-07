import { HttpModule } from "@nestjs/axios";
import { Module, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
// 🔧 移除未使用的 EventEmitterModule 导入
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";

import { DatabaseModule } from "../../database/database.module"; // 🆕 试点测试
import { AuthModule } from "../../auth/module/auth.module";
import { CacheModule } from "../../cache/module/cache.module";
import { alertConfig } from "@alert/config/alert.config";
import { AlertConstantsValidator } from "../utils/constants-validator.util";

import { AlertController } from "../controller/alert.controller";
import { AlertHistoryRepository } from "../repositories/alert-history.repository";
import { AlertRuleRepository } from "../repositories/alert-rule.repository";
import {
  NotificationLog,
  NotificationLogSchema,
} from "../schemas/notification-log.schema";
import { AlertRule, AlertRuleSchema } from "../schemas/alert-rule.schema";
import {
  AlertHistory,
  AlertHistorySchema,
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
    // 🆕 试点：统一数据库模块
    DatabaseModule,

    // 基础模块
    AuthModule,
    CacheModule,

    // 🔄 试点：暂时注释MongoDB Schemas (改用DatabaseModule)
    // MongooseModule.forFeature([
    //   { name: AlertRule.name, schema: AlertRuleSchema },
    //   { name: AlertHistory.name, schema: AlertHistorySchema },
    //   { name: NotificationLog.name, schema: NotificationLogSchema },
    // ]),
    ConfigModule.forFeature(alertConfig),

    // HTTP 客户端用于 Webhook 通知
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),

    // 🔧 修正：移除重复的 EventEmitterModule.forRoot，
    // 使用 AppModule 中全局配置的 EventEmitter2 实例
    // EventEmitterModule.forRoot() 已在 AppModule 中配置

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
export class AlertModule implements OnModuleInit {
  private readonly logger = new Logger(AlertModule.name);

  /**
   * 模块初始化时执行常量验证
   * 确保Alert模块的所有常量配置合理性
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Alert模块正在初始化...');
    
    try {
      // 执行完整的常量验证
      const validationResult = AlertConstantsValidator.validateAll();
      
      if (!validationResult.isValid) {
        // 在生产环境中，常量验证失败会阻止应用启动
        // 这在 AlertConstantsValidator.validateAll() 中已处理
        this.logger.error('Alert模块常量验证失败，请检查配置');
      } else {
        this.logger.log('Alert模块常量验证通过，模块初始化完成 ✅');
      }
    } catch (error) {
      this.logger.error(`Alert模块初始化过程中发生异常: ${error.message}`);
      throw error;
    }
  }
}
