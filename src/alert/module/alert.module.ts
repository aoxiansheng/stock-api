import { HttpModule } from "@nestjs/axios";
import { Module, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
// 🔧 移除未使用的 EventEmitterModule 导入
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";

import { DatabaseModule } from "../../database/database.module"; // 🆕 试点测试
import { AuthModule } from "../../auth/module/auth.module";
import { CacheModule } from "../../cache/module/cache.module";
import { PaginationModule } from "@common/modules/pagination/modules/pagination.module";
import { alertConfig } from "@alert/config/alert.config";
import { AlertConstantsValidator } from "../utils/constants-validator.util";
import { OPERATION_LIMITS } from '@common/constants/domain';

import { AlertController } from "../controller/alert.controller";
import { AlertHistoryRepository } from "../repositories/alert-history.repository";
import { AlertRuleRepository } from "../repositories/alert-rule.repository";
import { AlertEventAdapterService } from "../services/alert-event-adapter.service";

// 🆕 新服务层架构
import { AlertRuleService } from "../services/alert-rule.service";
import { AlertEvaluationService } from "../services/alert-evaluation.service";
import { AlertLifecycleService } from "../services/alert-lifecycle.service";
import { AlertQueryService } from "../services/alert-query.service";
import { AlertCacheService } from "../services/alert-cache.service";
import { AlertEventPublisher } from "../services/alert-event-publisher.service";
import { AlertOrchestratorService } from "../services/alert-orchestrator.service";
import { AlertRuleValidator } from "../validators/alert-rule.validator";
import { RuleEvaluator } from "../evaluators/rule.evaluator";
// NotificationLog schema has been moved to notification module
import { AlertRule, AlertRuleSchema } from "../schemas/alert-rule.schema";
import {
  AlertHistory,
  AlertHistorySchema,
} from "../schemas/alert-history.schema";
import {
  AlertHistoryService,
  AlertingService,
  RuleEngineService,
} from "../services/";
// Notification senders have been moved to the notification module

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
      timeout: OPERATION_LIMITS.TIMEOUTS_MS.API_REQUEST,
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
    AlertHistoryService,
    AlertRuleRepository,
    AlertHistoryRepository,
    AlertEventAdapterService,  // 事件适配器服务
    // Notification service and senders have been moved to notification module
  ],

  exports: [
    AlertingService,
    RuleEngineService,
    AlertHistoryService,
    AlertRuleRepository,
    AlertHistoryRepository,
    // NotificationService has been moved to notification module
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
