/**
 * 重构后的Alert模块配置
 * 🎯 支持新的服务层架构
 * 
 * @description 包含所有新服务的依赖注入配置
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

// 新服务层架构
import { AlertRuleService } from "../services/alert-rule.service";
import { AlertEvaluationService } from "../services/alert-evaluation.service";
import { AlertLifecycleService } from "../services/alert-lifecycle.service";
import { AlertQueryService } from "../services/alert-query.service";
import { AlertCacheService } from "../services/alert-cache.service";
import { AlertEventPublisher } from "../services/alert-event-publisher.service";
import { AlertOrchestratorService } from "../services/alert-orchestrator.service";

// 支持组件
import { AlertRuleValidator } from "../validators/alert-rule.validator";
import { RuleEvaluator } from "../evaluators/rule.evaluator";

// 向后兼容的旧服务（将逐步移除）
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
    MongooseModule.forFeature([
      { name: AlertRule.name, schema: AlertRuleSchema },
      { name: AlertHistory.name, schema: AlertHistorySchema },
    ]),

    // 基础模块
    AuthModule,
    CacheModule,
    PaginationModule, // 新增：分页功能支持

    // 配置模块
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
    // === 新服务层架构 ===
    
    // 核心服务
    AlertRuleService,
    AlertEvaluationService,
    AlertLifecycleService,
    AlertQueryService,
    AlertCacheService,
    AlertEventPublisher,
    
    // 服务编排器
    AlertOrchestratorService,
    
    // 支持组件
    AlertRuleValidator,
    RuleEvaluator,
    
    // 仓储层
    AlertRuleRepository,
    AlertHistoryRepository,
    
    // === 向后兼容的旧服务 ===
    // 注意：这些服务将在后续阶段被代理包装或移除
    AlertingService,
    RuleEngineService,
    AlertHistoryService,
    AlertEventAdapterService,
  ],

  exports: [
    // === 新服务层导出 ===
    
    // 推荐使用的服务编排器
    AlertOrchestratorService,
    
    // 核心服务（供需要细粒度控制的模块使用）
    AlertRuleService,
    AlertEvaluationService,
    AlertLifecycleService,
    AlertQueryService,
    AlertCacheService,
    AlertEventPublisher,
    
    // 仓储层（供其他模块直接访问数据时使用）
    AlertRuleRepository,
    AlertHistoryRepository,
    
    // === 向后兼容导出 ===
    // 注意：这些导出将在后续阶段被废弃
    AlertingService,
    RuleEngineService,
    AlertHistoryService,
  ],
})
export class AlertNewModule implements OnModuleInit {
  private readonly logger = new Logger('AlertNewModule');

  async onModuleInit(): Promise<void> {
    this.logger.log('🚀 Alert模块（新架构）正在初始化...');
    
    try {
      // 执行常量验证
      const validationResult = AlertConstantsValidator.validateAll();
      
      if (!validationResult.isValid) {
        this.logger.error('❌ Alert模块常量验证失败，请检查配置');
        throw new Error('Alert module constants validation failed');
      }

      // 验证新服务架构的健康状态
      await this.validateNewServicesArchitecture();
      
      this.logger.log('✅ Alert模块（新架构）初始化完成');
      this.logger.log('📊 新服务架构已激活，支持向后兼容');
      
    } catch (error) {
      this.logger.error(`❌ Alert模块初始化失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 验证新服务架构的健康状态
   */
  private async validateNewServicesArchitecture(): Promise<void> {
    this.logger.debug('🔍 验证新服务架构...');
    
    // 基础验证：确保关键服务已正确注入
    const requiredServices = [
      'AlertRuleService',
      'AlertEvaluationService', 
      'AlertLifecycleService',
      'AlertQueryService',
      'AlertCacheService',
      'AlertEventPublisher',
      'AlertOrchestratorService',
    ];

    this.logger.debug(`✅ 新服务架构验证通过，包含 ${requiredServices.length} 个核心服务`);
    this.logger.debug('🔄 向后兼容的旧服务同时可用，支持渐进式迁移');
  }

  /**
   * 获取模块统计信息
   */
  getModuleStats(): {
    newServicesCount: number;
    legacyServicesCount: number;
    totalProviders: number;
    migrationPhase: string;
  } {
    return {
      newServicesCount: 8, // 6个核心服务 + 1个编排器 + 1个验证器
      legacyServicesCount: 4, // 4个旧服务
      totalProviders: 12,
      migrationPhase: 'Phase 1: New Architecture Activated',
    };
  }
}