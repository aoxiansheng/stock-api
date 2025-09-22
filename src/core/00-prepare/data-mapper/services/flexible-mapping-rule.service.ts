import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { createLogger } from "@common/logging/index";
import { PaginationService } from "@common/modules/pagination/services/pagination.service";
import { PaginatedDataDto } from "@common/modules/pagination/dto/paginated-data";
import {
  Injectable,
  OnModuleDestroy,
} from "@nestjs/common";
import {
  FlexibleMappingRule,
  FlexibleMappingRuleDocument,
} from "../schemas/flexible-mapping-rule.schema";
import {
  DataSourceTemplate,
  DataSourceTemplateDocument,
} from "../schemas/data-source-template.schema";
import {
  CreateFlexibleMappingRuleDto,
  FlexibleMappingRuleResponseDto,
  CreateMappingRuleFromSuggestionsDto,
} from "../dto/flexible-mapping-rule.dto";
import { DataSourceTemplateService } from "./data-source-template.service";
import { DataMapperCacheService } from "../../../05-caching/data-mapper-cache/services/data-mapper-cache.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CacheService } from "@cache/services/cache.service";

// 🆕 Phase 2 模块化重构：导入内部模块化组件
import { MappingRuleCrudModule } from './modules/mapping-rule-crud.module';
import { MappingRuleEngineModule } from './modules/mapping-rule-engine.module';
import { MappingRuleStatsModule } from './modules/mapping-rule-stats.module';

/**
 * 灵活映射规则服务
 *
 * Phase 2 模块化重构：采用内部模块化架构
 * - MappingRuleCrudModule: 处理 CRUD 操作
 * - MappingRuleEngineModule: 处理规则引擎和映射逻辑
 * - MappingRuleStatsModule: 处理统计和监控
 *
 * 保持向后兼容性：所有现有的公共API接口保持不变
 */
@Injectable()
export class FlexibleMappingRuleService implements OnModuleDestroy {
  private readonly logger = createLogger(FlexibleMappingRuleService.name);

  // 🆕 Phase 2 模块化组件：职责分离
  private readonly crudModule: MappingRuleCrudModule;
  private readonly engineModule: MappingRuleEngineModule;
  private readonly statsModule: MappingRuleStatsModule;

  constructor(
    @InjectModel(FlexibleMappingRule.name)
    private readonly ruleModel: Model<FlexibleMappingRuleDocument>,
    @InjectModel(DataSourceTemplate.name)
    private readonly templateModel: Model<DataSourceTemplateDocument>,
    private readonly paginationService: PaginationService,
    private readonly templateService: DataSourceTemplateService,
    private readonly mappingRuleCacheService: DataMapperCacheService,
    private readonly eventBus: EventEmitter2,
    private readonly cacheService: CacheService,
  ) {
    // 🆕 Phase 2 模块化重构：初始化内部模块
    this.crudModule = new MappingRuleCrudModule(
      this.ruleModel,
      this.templateModel,
      this.templateService,
    );

    this.engineModule = new MappingRuleEngineModule();

    this.statsModule = new MappingRuleStatsModule(
      this.ruleModel,
      this.eventBus,
      this.cacheService,
    );

    this.logger.log('FlexibleMappingRuleService 模块化重构完成', {
      crudModule: '✅ 已初始化',
      engineModule: '✅ 已初始化',
      statsModule: '✅ 已初始化'
    });
  }

  /**
   * 🎯 创建灵活映射规则
   * Phase 2 重构：委托给 CrudModule
   */
  async createRule(
    dto: CreateFlexibleMappingRuleDto,
  ): Promise<FlexibleMappingRuleResponseDto> {
    // 委托给 CRUD 模块处理核心逻辑
    const rule = await this.crudModule.createRule(dto);
    const ruleDto = FlexibleMappingRuleResponseDto.fromDocument(rule);

    // 🚀 缓存新创建的规则
    await this.mappingRuleCacheService.cacheRuleById(ruleDto);
    if (dto.isDefault) {
      await this.mappingRuleCacheService.cacheBestMatchingRule(
        dto.provider,
        dto.apiType,
        dto.transDataRuleListType,
        ruleDto,
      );
    }

    return ruleDto;
  }

  /**
   * 🎯 基于模板建议创建映射规则
   * Phase 2 重构：委托给 CrudModule
   */
  async createRuleFromSuggestions(
    dto: CreateMappingRuleFromSuggestionsDto,
    suggestions: any[],
  ): Promise<FlexibleMappingRuleResponseDto> {
    // 委托给 CRUD 模块处理核心逻辑
    const rule = await this.crudModule.createRuleFromSuggestions(dto, suggestions);
    const ruleDto = FlexibleMappingRuleResponseDto.fromDocument(rule);

    // 🚀 缓存新创建的规则
    await this.mappingRuleCacheService.cacheRuleById(ruleDto);
    if (dto.isDefault) {
      // 从 rule 文档中获取必要参数
      await this.mappingRuleCacheService.cacheBestMatchingRule(
        rule.provider,
        rule.apiType as "rest" | "stream",
        rule.transDataRuleListType,
        ruleDto,
      );
    }

    return ruleDto;
  }

  /**
   * 📋 分页查询映射规则
   */
  async findRules(
    page?: number,
    limit?: number,
    provider?: string,
    apiType?: string,
    transDataRuleListType?: string,
    isActive?: boolean,
  ): Promise<PaginatedDataDto<FlexibleMappingRuleResponseDto>> {
    // 使用PaginationService标准化分页参数
    const { page: normalizedPage, limit: normalizedLimit } =
      this.paginationService.normalizePaginationQuery({
        page,
        limit,
      });

    const filter: any = {};

    if (provider) filter.provider = provider;
    if (apiType) filter.apiType = apiType;
    if (transDataRuleListType)
      filter.transDataRuleListType = transDataRuleListType;
    if (isActive !== undefined) filter.isActive = isActive;

    const query = this.ruleModel
      .find(filter)
      .sort({ overallConfidence: -1, usageCount: -1, createdAt: -1 });

    const [rules, total] = await Promise.all([
      query.skip((normalizedPage - 1) * normalizedLimit).limit(normalizedLimit),
      this.ruleModel.countDocuments(filter),
    ]);

    const responseItems = rules.map((rule) =>
      FlexibleMappingRuleResponseDto.fromDocument(rule),
    );

    return this.paginationService.createPaginatedResponse(
      responseItems,
      normalizedPage,
      normalizedLimit,
      total,
    );
  }

  /**
   * 🔍 根据ID获取规则 (Redis缓存优化)
   * Phase 2 重构：保留缓存逻辑，监控委托给 StatsModule
   */
  async findRuleById(id: string): Promise<FlexibleMappingRuleResponseDto> {
    const startTime = Date.now();

    try {
      // 1. 尝试从缓存获取
      const cachedRule =
        await this.mappingRuleCacheService.getCachedRuleById(id);
      if (cachedRule) {
        // 监控事件委托给 StatsModule
        this.statsModule.emitMonitoringEvent("cache_hit", {
          type: "cache",
          operation: "get",
          duration: Date.now() - startTime,
          cacheType: "redis",
          key: `mapping_rule:${id}`,
          success: true,
        });
        return cachedRule;
      }

      // 2. 缓存未命中，从数据库查询
      const rule = await this.crudModule.getRuleDocumentById(id);
      const ruleDto = FlexibleMappingRuleResponseDto.fromDocument(rule);

      // 监控事件委托给 StatsModule
      this.statsModule.emitMonitoringEvent("database_query_success", {
        type: "database",
        operation: "findById",
        duration: Date.now() - startTime,
        collection: "flexibleMappingRules",
        success: true,
        resultCount: 1,
      });

      // 3. 缓存查询结果 - 异步监控避免阻塞
      setImmediate(() => {
        this.mappingRuleCacheService.cacheRuleById(ruleDto).catch((error) => {
          this.logger.warn("缓存规则失败", { id, error: error.message });
        });
      });

      return ruleDto;
    } catch (error) {
      // 监控事件委托给 StatsModule
      this.statsModule.emitMonitoringEvent("rule_query_error", {
        type: "business",
        operation: "findRuleById",
        duration: Date.now() - startTime,
        success: false,
        error: error.message,
        ruleId: id,
      });
      throw error;
    }
  }

  /**
   * 🎯 查找最匹配的映射规则 (Redis缓存优化)
   * Phase 2 重构：查询逻辑委托给 CrudModule，监控委托给 StatsModule
   */
  async findBestMatchingRule(
    provider: string,
    apiType: "rest" | "stream",
    transDataRuleListType: string,
  ): Promise<FlexibleMappingRuleResponseDto | null> {
    const startTime = Date.now();
    this.logger.debug(`查找最匹配的映射规则`, {
      provider,
      apiType,
      transDataRuleListType,
    });

    try {
      // 1. 尝试从缓存获取最佳匹配规则
      const cachedRule =
        await this.mappingRuleCacheService.getCachedBestMatchingRule(
          provider,
          apiType,
          transDataRuleListType,
        );
      if (cachedRule) {
        // 监控事件委托给 StatsModule
        this.statsModule.emitMonitoringEvent("cache_hit", {
          type: "cache",
          operation: "get_best_matching",
          duration: Date.now() - startTime,
          cacheType: "redis",
          success: true,
          provider,
          apiType,
        });
        return cachedRule;
      }

      // 2. 缓存未命中，委托给 CrudModule 查询
      const rule = await this.crudModule.findBestMatchingRuleDocument(
        provider,
        apiType,
        transDataRuleListType,
      );

      const ruleDto = rule
        ? FlexibleMappingRuleResponseDto.fromDocument(rule)
        : null;

      // 监控事件委托给 StatsModule
      this.statsModule.emitMonitoringEvent("best_matching_rule_query", {
        type: "database",
        operation: "findBestMatchingRule",
        duration: Date.now() - startTime,
        collection: "flexibleMappingRules",
        success: !!ruleDto,
        provider,
        apiType,
        resultCount: ruleDto ? 1 : 0,
      });

      // 3. 缓存查询结果（仅在找到规则时） - 异步避免阻塞
      if (ruleDto) {
        setImmediate(() => {
          this.mappingRuleCacheService
            .cacheBestMatchingRule(
              provider,
              apiType,
              transDataRuleListType,
              ruleDto,
            )
            .catch((error) => {
              this.logger.warn("缓存最佳匹配规则失败", {
                provider,
                apiType,
                transDataRuleListType,
                error: error.message,
              });
            });
        });
      }

      // 监控事件委托给 StatsModule
      this.statsModule.emitMonitoringEvent("critical_path_operation", {
        type: "business",
        operation: "findBestMatchingRule",
        duration: Date.now() - startTime,
        provider,
        apiType,
        success: !!ruleDto,
        cacheHit: false,
        ruleFound: !!ruleDto,
        category: "critical_path",
      });

      return ruleDto;
    } catch (error) {
      // 监控事件委托给 StatsModule
      this.statsModule.emitMonitoringEvent("best_matching_rule_error", {
        type: "business",
        operation: "findBestMatchingRule",
        duration: Date.now() - startTime,
        provider,
        apiType,
        success: false,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 🎯 应用灵活映射规则的核心逻辑
   * Phase 2 重构：委托给 EngineModule 处理映射，StatsModule 处理统计
   */
  public async applyFlexibleMappingRule(
    rule: FlexibleMappingRuleDocument,
    sourceData: any,
    includeDebugInfo: boolean = false,
  ): Promise<{
    transformedData: any;
    success: boolean;
    errorMessage?: string;
    mappingStats: {
      totalMappings: number;
      successfulMappings: number;
      failedMappings: number;
      successRate: number;
    };
    debugInfo?: any[];
  }> {
    const startTime = Date.now();

    // 委托给 EngineModule 处理核心映射逻辑
    const result = await this.engineModule.applyFlexibleMappingRule(
      rule,
      sourceData,
      includeDebugInfo,
    );

    try {
      // 委托给 StatsModule 处理监控事件
      this.statsModule.emitMonitoringEvent("rule_application", {
        type: "business",
        operation: "applyFlexibleMappingRule",
        duration: Date.now() - startTime,
        ruleId: rule._id?.toString(),
        provider: rule.provider,
        apiType: rule.apiType,
        totalMappings: result.mappingStats.totalMappings,
        successfulMappings: result.mappingStats.successfulMappings,
        failedMappings: result.mappingStats.failedMappings,
        successRate: Math.round(result.mappingStats.successRate * 100) / 100,
        success: result.success,
        category: "business_operation",
      });

      // 委托给 StatsModule 处理异步统计更新
      setImmediate(() => {
        if (rule._id) {
          this.statsModule.updateRuleStats(rule._id.toString(), result.success).catch(
            (error) => {
              this.logger.warn("更新规则统计失败", { error: error.message });
            },
          );
        }
      });
    } catch (monitoringError) {
      // 监控失败不应影响业务逻辑
      this.logger.warn("记录业务监控指标失败", {
        error: monitoringError.message,
      });
    }

    return result;
  }

  /**
   * ✏️ 更新映射规则 (Redis缓存失效)
   * Phase 2 重构：委托给 CrudModule
   */
  async updateRule(
    id: string,
    updateData: Partial<CreateFlexibleMappingRuleDto>,
  ): Promise<FlexibleMappingRuleResponseDto> {
    // 1. 获取原规则信息用于缓存失效
    const oldRule = await this.crudModule.getRuleDocumentById(id);
    const oldRuleDto = FlexibleMappingRuleResponseDto.fromDocument(oldRule);

    // 2. 委托给 CrudModule 更新规则
    const rule = await this.crudModule.updateRule(id, updateData);
    const ruleDto = FlexibleMappingRuleResponseDto.fromDocument(rule);

    // 3. 🚀 失效相关缓存
    await this.mappingRuleCacheService.invalidateRuleCache(id, oldRuleDto);

    // 4. 缓存新的规则数据
    await this.mappingRuleCacheService.cacheRuleById(ruleDto);

    return ruleDto;
  }

  /**
   * 🔄 激活/禁用规则 (Redis缓存失效)
   * Phase 2 重构：委托给 CrudModule
   */
  async toggleRuleStatus(
    id: string,
    isActive: boolean,
  ): Promise<FlexibleMappingRuleResponseDto> {
    // 1. 获取原规则信息用于缓存失效
    const oldRule = await this.crudModule.getRuleDocumentById(id);
    const oldRuleDto = FlexibleMappingRuleResponseDto.fromDocument(oldRule);

    // 2. 委托给 CrudModule 更新规则状态
    const rule = await this.crudModule.toggleRuleStatus(id, isActive);
    const ruleDto = FlexibleMappingRuleResponseDto.fromDocument(rule);

    // 3. 🚀 失效相关缓存（特别是最佳匹配规则缓存）
    await this.mappingRuleCacheService.invalidateRuleCache(id, oldRuleDto);

    // 4. 缓存新的规则数据
    await this.mappingRuleCacheService.cacheRuleById(ruleDto);

    return ruleDto;
  }

  /**
   * 🗑️ 删除映射规则 (Redis缓存失效)
   * Phase 2 重构：委托给 CrudModule
   */
  async deleteRule(id: string): Promise<void> {
    // 1. 委托给 CrudModule 删除规则（内部已包含验证逻辑）
    const rule = await this.crudModule.deleteRule(id);
    const ruleDto = FlexibleMappingRuleResponseDto.fromDocument(rule);

    // 2. 🚀 失效相关缓存
    await this.mappingRuleCacheService.invalidateRuleCache(id, ruleDto);
  }

  /**
   * 🎯 获取规则文档对象（用于内部处理，如 transformer）
   * Phase 2 重构：委托给 CrudModule
   */
  async getRuleDocumentById(id: string): Promise<FlexibleMappingRuleDocument> {
    return await this.crudModule.getRuleDocumentById(id);
  }

  /**
   * 🎯 安全获取规则信息（返回DTO对象，替代直接暴露文档对象）
   * Phase 2 重构：委托给 CrudModule
   */
  async getRuleSafeData(id: string): Promise<FlexibleMappingRuleResponseDto> {
    const ruleDocument = await this.crudModule.getRuleDocumentById(id);
    return FlexibleMappingRuleResponseDto.fromDocument(ruleDocument);
  }

  /**
   * 🔄 预热缓存 - 缓存常用规则
   */
  async warmupMappingRuleCache(): Promise<void> {
    this.logger.log("开始映射规则缓存预热");

    try {
      // 查找所有活跃规则，按使用量和成功率排序
      const activeRules = await this.ruleModel
        .find({ isActive: true })
        .sort({ usageCount: -1, successRate: -1 })
        .limit(50) // 限制预热数量
        .exec();

      const ruleDtos = activeRules.map((rule) =>
        FlexibleMappingRuleResponseDto.fromDocument(rule),
      );

      // 使用DataMapperCacheService的预热功能
      await this.mappingRuleCacheService.warmupCache(ruleDtos);

      this.logger.log("映射规则缓存预热完成", { cachedRules: ruleDtos.length });
    } catch (error) {
      this.logger.error("映射规则缓存预热失败", { error: error.message });
    }
  }

  /**
   * 🛡️ 验证缓存层JSON操作安全性
   * Phase 2 重构：委托给 StatsModule
   */
  async validateCacheJsonSecurity(): Promise<{
    jsonBombProtection: boolean;
    dataIntegrity: boolean;
    performanceWithinLimits: boolean;
    errors: string[];
  }> {
    return this.statsModule.validateCacheJsonSecurity();
  }

  /**
   * 🔄 清理资源（用于模块销毁时）
   * Phase 2 重构：委托给 StatsModule
   */
  onModuleDestroy(): void {
    // 委托给 StatsModule 处理清理工作
    this.statsModule.onDestroy();

    this.logger.log('FlexibleMappingRuleService 模块销毁完成');
  }
}