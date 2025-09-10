/**
 * 增强版Alert模块配置
 * 🎯 同时支持新旧服务架构，实现平滑过渡
 * 
 * @description 渐进式迁移方案，新旧服务并存
 * @author Claude Code Assistant
 * @date 2025-09-10
 */

import { HttpModule } from "@nestjs/axios";
import { Module, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";

import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../../auth/module/auth.module";
import { CacheModule } from "../../cache/module/cache.module";
import { PaginationModule } from "@common/modules/pagination/modules/pagination.module";
import { alertConfig } from "@alert/config/alert.config";
import { AlertConstantsValidator } from "../utils/constants-validator.util";
import { OPERATION_LIMITS } from '@common/constants/domain';

// Controllers
import { AlertController } from "../controller/alert.controller";

// Schemas
import { AlertRule, AlertRuleSchema } from "../schemas/alert-rule.schema";
import { AlertHistory, AlertHistorySchema } from "../schemas/alert-history.schema";

// Repositories
import { AlertHistoryRepository } from "../repositories/alert-history.repository";
import { AlertRuleRepository } from "../repositories/alert-rule.repository";

// 🆕 新服务层架构
import { AlertRuleService } from "../services/alert-rule.service";
import { AlertEvaluationService } from "../services/alert-evaluation.service";
import { AlertLifecycleService } from "../services/alert-lifecycle.service";
import { AlertQueryService } from "../services/alert-query.service";
import { AlertCacheService } from "../services/alert-cache.service";
import { AlertEventPublisher } from "../services/alert-event-publisher.service";
import { AlertOrchestratorService } from "../services/alert-orchestrator.service";

// 🆕 支持组件
import { AlertRuleValidator } from "../validators/alert-rule.validator";
import { RuleEvaluator } from "../evaluators/rule.evaluator";

// ⚠️ 旧服务（保持向后兼容）
import {
  AlertHistoryService,
  AlertingService,
  RuleEngineService,
} from "../services/";
import { AlertEventAdapterService } from "../services/alert-event-adapter.service";

@Module({
  imports: [
    // 数据库模块
    DatabaseModule,
    
    // MongoDB Schemas - 同时支持新旧服务
    MongooseModule.forFeature([
      { name: AlertRule.name, schema: AlertRuleSchema },
      { name: AlertHistory.name, schema: AlertHistorySchema },
    ]),

    // 基础模块
    AuthModule,
    CacheModule,
    PaginationModule, // 🆕 新增分页支持

    // 配置
    ConfigModule.forFeature(alertConfig),

    // HTTP 客户端
    HttpModule.register({
      timeout: OPERATION_LIMITS.TIMEOUTS_MS.API_REQUEST,
      maxRedirects: 3,
    }),

    // 定时任务
    ScheduleModule.forRoot(),
  ],

  controllers: [
    AlertController,
  ],

  providers: [
    // ========== 🆕 新服务架构 ==========
    AlertRuleService,
    AlertEvaluationService,
    AlertLifecycleService,
    AlertQueryService,
    AlertCacheService,
    AlertEventPublisher,
    AlertOrchestratorService,
    
    // 支持组件
    AlertRuleValidator,
    RuleEvaluator,
    
    // ========== ⚠️ 旧服务（向后兼容） ==========
    AlertingService,
    RuleEngineService,
    AlertHistoryService,
    AlertEventAdapterService,
    
    // ========== 仓储层 ==========
    AlertRuleRepository,
    AlertHistoryRepository,
  ],

  exports: [
    // ========== 🆕 优先导出新服务 ==========
    AlertOrchestratorService, // 推荐使用
    AlertRuleService,
    AlertEvaluationService,
    AlertLifecycleService,
    AlertQueryService,
    AlertCacheService,
    AlertEventPublisher,
    
    // ========== ⚠️ 兼容性导出 ==========
    AlertingService,
    RuleEngineService,
    AlertHistoryService,
    
    // ========== 仓储层导出 ==========
    AlertRuleRepository,
    AlertHistoryRepository,
  ],
})
export class AlertEnhancedModule implements OnModuleInit {
  private readonly logger = new Logger('AlertEnhancedModule');
  private migrationPhase = 'Phase 1';

  async onModuleInit(): Promise<void> {
    this.logger.log('🚀 Alert模块（增强版）初始化中...');
    this.logger.log(`📊 迁移阶段: ${this.migrationPhase} - 新旧服务并存`);
    
    try {
      // 执行常量验证
      const validationResult = AlertConstantsValidator.validateAll();
      
      if (!validationResult.isValid) {
        this.logger.error('❌ Alert模块常量验证失败');
        throw new Error('Alert module constants validation failed');
      }

      // 记录服务架构状态
      this.logServiceArchitectureStatus();
      
      this.logger.log('✅ Alert模块（增强版）初始化完成');
      
    } catch (error) {
      this.logger.error(`❌ Alert模块初始化失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 记录服务架构状态
   */
  private logServiceArchitectureStatus(): void {
    const stats = {
      newServices: [
        'AlertRuleService',
        'AlertEvaluationService',
        'AlertLifecycleService',
        'AlertQueryService',
        'AlertCacheService',
        'AlertEventPublisher',
        'AlertOrchestratorService',
      ],
      legacyServices: [
        'AlertingService',
        'RuleEngineService',
        'AlertHistoryService',
        'AlertEventAdapterService',
      ],
      supportComponents: [
        'AlertRuleValidator',
        'RuleEvaluator',
      ],
    };

    this.logger.log('📈 服务架构状态:');
    this.logger.log(`  ✅ 新服务: ${stats.newServices.length} 个已激活`);
    this.logger.log(`  ⚠️  旧服务: ${stats.legacyServices.length} 个保持兼容`);
    this.logger.log(`  🔧 支持组件: ${stats.supportComponents.length} 个`);
    this.logger.log('');
    this.logger.log('💡 建议: 新功能请使用 AlertOrchestratorService');
    this.logger.log('📝 迁移指南: 参见 new-index.ts 中的详细说明');
  }
}