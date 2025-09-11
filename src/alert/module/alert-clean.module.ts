/**
 * 清洁版Alert模块配置
 * 🎯 仅包含新服务架构，不保留历史包袱
 * 
 * @description 基于单一职责原则的专业化服务架构
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

// 🆕 专业化服务层架构
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

@Module({
  imports: [
    // 数据库模块
    DatabaseModule,
    
    // MongoDB Schemas
    MongooseModule.forFeature([
      { name: AlertRule.name, schema: AlertRuleSchema },
      { name: AlertHistory.name, schema: AlertHistorySchema },
    ]),

    // 基础模块
    AuthModule,
    CacheModule,
    PaginationModule,

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
    // ========== 🎯 专业化服务架构 ==========
    AlertOrchestratorService,   // 🎭 编排服务 - 主入口
    AlertRuleService,           // 📋 规则管理
    AlertEvaluationService,     // ⚖️  规则评估  
    AlertLifecycleService,      // 🔄 生命周期管理
    AlertQueryService,          // 🔍 查询统计
    AlertCacheService,          // 💾 缓存管理
    AlertEventPublisher,        // 📢 事件发布
    
    // 支持组件
    AlertRuleValidator,         // ✅ 规则验证器
    RuleEvaluator,             // 📊 评估引擎
    
    // ========== 数据访问层 ==========
    AlertRuleRepository,
    AlertHistoryRepository,
  ],

  exports: [
    // ========== 🚀 主要服务接口 ==========
    AlertOrchestratorService,   // 推荐使用的主入口
    
    // ========== 🔧 专业化服务 ==========
    AlertRuleService,
    AlertEvaluationService,
    AlertLifecycleService,
    AlertQueryService,
    AlertCacheService,
    AlertEventPublisher,
    
    // ========== 📊 数据访问 ==========
    AlertRuleRepository,
    AlertHistoryRepository,
  ],
})
export class AlertCleanModule implements OnModuleInit {
  private readonly logger = new Logger('AlertCleanModule');

  async onModuleInit(): Promise<void> {
    this.logger.log('🚀 Alert模块（清洁版）初始化中...');
    
    try {
      // 执行常量验证
      const validationResult = AlertConstantsValidator.validateAll();
      
      if (!validationResult.isValid) {
        this.logger.error('❌ Alert模块常量验证失败');
        throw new Error('Alert module constants validation failed');
      }

      // 记录服务架构状态
      this.logCleanArchitectureStatus();
      
      this.logger.log('✅ Alert模块（清洁版）初始化完成');
      
    } catch (error) {
      this.logger.error(`❌ Alert模块初始化失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 记录清洁架构状态
   */
  private logCleanArchitectureStatus(): void {
    const stats = {
      coreServices: [
        'AlertOrchestratorService 🎭',
        'AlertRuleService 📋', 
        'AlertEvaluationService ⚖️',
        'AlertLifecycleService 🔄',
        'AlertQueryService 🔍',
        'AlertCacheService 💾',
        'AlertEventPublisher 📢',
      ],
      supportComponents: [
        'AlertRuleValidator ✅',
        'RuleEvaluator 📊',
      ],
      repositories: [
        'AlertRuleRepository',
        'AlertHistoryRepository',
      ]
    };

    this.logger.log('📈 清洁架构状态:');
    this.logger.log(`  🎯 核心服务: ${stats.coreServices.length} 个`);
    this.logger.log(`  🔧 支持组件: ${stats.supportComponents.length} 个`);
    this.logger.log(`  📊 数据仓储: ${stats.repositories.length} 个`);
    this.logger.log('');
    this.logger.log('🎭 主入口: AlertOrchestratorService');
    this.logger.log('📋 单一职责: 每个服务专注于特定领域');
    this.logger.log('🚀 无历史包袱: 全新架构，性能优化');
    this.logger.log('');
    this.logger.log('📚 文档: 参见 ARCHITECTURE.md');
  }
}