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
import {
  RULE_LIST_TYPE_VALUES,
  type RuleListType,
} from "../constants/data-mapper.constants";
import type { RuleLookupOptions } from "../types/rule-lookup-options.type";
import { DataSourceTemplateService } from "./data-source-template.service";
import { DataMapperCacheStandardizedService } from "../../../05-caching/module/data-mapper-cache/services/data-mapper-cache-standardized.service";
import { parseRuleListType } from "../utils/rule-list-type.util";
import {
  normalizeLowercaseString,
  normalizeOptionalLowercaseString,
  normalizeUppercaseString,
} from "../utils/string-normalize.util";

// 🆕 Phase 2 模块化重构：导入内部模块化组件
import { MappingRuleCrudModule } from './modules/mapping-rule-crud.module';
import { MappingRuleEngineModule } from './modules/mapping-rule-engine.module';

/**
 * 灵活映射规则服务
 *
 * Phase 2 模块化重构：采用内部模块化架构
 * - MappingRuleCrudModule: 处理 CRUD 操作
 * - MappingRuleEngineModule: 处理规则引擎和映射逻辑
 * （已移除统计与监控模块）
 *
 * 保持向后兼容性：所有现有的公共API接口保持不变
 */
@Injectable()
export class FlexibleMappingRuleService implements OnModuleDestroy {
  private readonly logger = createLogger(FlexibleMappingRuleService.name);
  private readonly deleteRuleCacheInvalidationMaxAttempts = 2;

  // 🆕 Phase 2 模块化组件：职责分离
  private readonly crudModule: MappingRuleCrudModule;
  private readonly engineModule: MappingRuleEngineModule;
  // 已移除统计模块，避免非核心依赖与复杂度

  constructor(
    @InjectModel(FlexibleMappingRule.name)
    private readonly ruleModel: Model<FlexibleMappingRuleDocument>,
    @InjectModel(DataSourceTemplate.name)
    private readonly templateModel: Model<DataSourceTemplateDocument>,
    private readonly paginationService: PaginationService,
    private readonly templateService: DataSourceTemplateService,
    private readonly mappingRuleCacheService: DataMapperCacheStandardizedService,
  ) {
    // 🆕 Phase 2 模块化重构：初始化内部模块
    this.crudModule = new MappingRuleCrudModule(
      this.ruleModel,
      this.templateModel,
      this.templateService,
    );

    this.engineModule = new MappingRuleEngineModule();

    this.logger.log('FlexibleMappingRuleService 初始化完成', {
      crudModule: '✅',
      engineModule: '✅'
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

    // 缓存新创建的规则
    await this.mappingRuleCacheService.cacheRuleById(ruleDto);
    if (dto.isDefault) {
      await this.mappingRuleCacheService.cacheBestMatchingRule(
        dto.provider,
        dto.apiType,
        dto.transDataRuleListType,
        ruleDto.marketType,
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

    // 缓存新创建的规则
    await this.mappingRuleCacheService.cacheRuleById(ruleDto);
    const normalizedRuleListType = this.normalizeRuleListType(
      ruleDto.transDataRuleListType,
    );
    if (dto.isDefault && normalizedRuleListType) {
      // 从 rule 文档中获取必要参数
      await this.mappingRuleCacheService.cacheBestMatchingRule(
        rule.provider,
        rule.apiType as "rest" | "stream",
        normalizedRuleListType,
        ruleDto.marketType,
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
    apiType?: "rest" | "stream",
    transDataRuleListType?: RuleListType,
    isActive?: boolean,
  ): Promise<PaginatedDataDto<FlexibleMappingRuleResponseDto>> {
    // 使用PaginationService标准化分页参数
    const { page: normalizedPage, limit: normalizedLimit } =
      this.paginationService.normalizePaginationQuery({
        page,
        limit,
      });

    const filter: any = {};
    const normalizedProvider = this.normalizeProviderQueryParam(provider);

    if (normalizedProvider !== undefined) {
      filter.provider = normalizedProvider;
    }
    if (apiType) filter.apiType = apiType;
    if (transDataRuleListType) {
      filter.transDataRuleListType = transDataRuleListType;
    } else {
      filter.transDataRuleListType = { $in: RULE_LIST_TYPE_VALUES };
    }
    if (isActive !== undefined) filter.isActive = isActive;

    const query = this.ruleModel
      .find(filter)
      .sort({ overallConfidence: -1, usageCount: -1, createdAt: -1 });

    const [rules, total] = await Promise.all([
      query.skip((normalizedPage - 1) * normalizedLimit).limit(normalizedLimit),
      this.ruleModel.countDocuments(filter),
    ]);

    const responseItems: FlexibleMappingRuleResponseDto[] = [];
    for (const rule of rules) {
      try {
        responseItems.push(FlexibleMappingRuleResponseDto.fromDocument(rule));
      } catch (error) {
        const ruleId = rule?._id?.toString?.() || rule?.id || "unknown";
        this.logger.warn("findRules 跳过脏数据映射规则", {
          ruleId,
          provider: rule?.provider,
          apiType: rule?.apiType,
          transDataRuleListType: rule?.transDataRuleListType,
          page: normalizedPage,
          limit: normalizedLimit,
          error:
            error instanceof Error ? error.message : String(error),
        });
      }
    }

    return this.paginationService.createPaginatedResponse(
      responseItems,
      normalizedPage,
      normalizedLimit,
      total,
    );
  }

  /**
   * 🔍 根据ID获取规则（使用专用缓存模块）
   */
  async findRuleById(id: string): Promise<FlexibleMappingRuleResponseDto> {
    const startTime = Date.now();

    try {
      // 1. 尝试从缓存获取
      const cachedRule =
        await this.mappingRuleCacheService.getCachedRuleById(id);
      if (cachedRule) {
        return cachedRule;
      }

      // 2. 缓存未命中，从数据库查询
      const rule = await this.crudModule.getRuleDocumentById(id);
      const ruleDto = FlexibleMappingRuleResponseDto.fromDocument(rule);

      // 3. 缓存查询结果 - 异步监控避免阻塞
      setImmediate(() => {
        this.mappingRuleCacheService.cacheRuleById(ruleDto).catch((error) => {
          this.logger.warn("缓存规则失败", { id, error: error.message });
        });
      });

      return ruleDto;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 🎯 查找最匹配的映射规则（使用专用缓存模块）
   */
  async findBestMatchingRule(
    provider: string,
    apiType: "rest" | "stream",
    transDataRuleListType: string,
    marketType?: string,
  ): Promise<FlexibleMappingRuleResponseDto | null> {
    const lookupDimensions = this.normalizeBestRuleLookupDimensions(
      provider,
      apiType,
    );
    this.logger.debug(`查找最匹配的映射规则`, {
      provider: lookupDimensions.provider,
      apiType: lookupDimensions.apiType,
      transDataRuleListType,
    });

    const normalizedRuleListType = this.normalizeRuleListType(
      transDataRuleListType,
    );
    if (!normalizedRuleListType) {
      return null;
    }

    return await this.findBestMatchingRuleInternal(
      lookupDimensions.provider,
      lookupDimensions.apiType,
      normalizedRuleListType,
      marketType,
    );
  }

  /**
   * 仅匹配 marketType === "*" 的通配规则（用于市场降级兜底）
   */
  async findBestWildcardMarketRule(
    provider: string,
    apiType: "rest" | "stream",
    transDataRuleListType: string,
  ): Promise<FlexibleMappingRuleResponseDto | null> {
    const lookupDimensions = this.normalizeBestRuleLookupDimensions(
      provider,
      apiType,
    );
    const normalizedRuleListType = this.normalizeRuleListType(
      transDataRuleListType,
    );
    if (!normalizedRuleListType) {
      return null;
    }

    return await this.findBestMatchingRuleInternal(
      lookupDimensions.provider,
      lookupDimensions.apiType,
      normalizedRuleListType,
      "*",
      { strictWildcardOnly: true },
    );
  }

  private async findBestMatchingRuleInternal(
    provider: string,
    apiType: "rest" | "stream",
    transDataRuleListType: RuleListType,
    marketType?: string,
    options: RuleLookupOptions = {},
  ): Promise<FlexibleMappingRuleResponseDto | null> {
    const normalizedMarketType = this.normalizeMarketType(marketType);
    this.logger.debug(`映射规则 marketType`, {
      requestedMarketType: normalizedMarketType,
      strictWildcardOnly: Boolean(options.strictWildcardOnly),
    });

    const cachedRule =
      await this.mappingRuleCacheService.getCachedBestMatchingRule(
        provider,
        apiType,
        transDataRuleListType,
        normalizedMarketType,
        options,
      );
    if (cachedRule) {
      return cachedRule;
    }

    const rule = await this.crudModule.findBestMatchingRuleDocument(
      provider,
      apiType,
      transDataRuleListType,
      normalizedMarketType,
      options,
    );

    if (!rule) {
      return null;
    }

    const ruleDto = FlexibleMappingRuleResponseDto.fromDocument(rule);
    setImmediate(() => {
      this.mappingRuleCacheService
        .cacheBestMatchingRule(
          provider,
          apiType,
          transDataRuleListType,
          normalizedMarketType,
          ruleDto,
          options,
        )
        .catch((error) => {
          this.logger.warn("缓存最佳匹配规则失败", {
            provider,
            apiType,
            transDataRuleListType,
            marketType: normalizedMarketType,
            strictWildcardOnly: Boolean(options.strictWildcardOnly),
            error: error.message,
          });
        });
    });

    return ruleDto;
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
      optionalSkipped?: number;
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

    // 已移除内部统计与监控逻辑

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
    const oldDimensionSignature =
      this.buildRuleInvalidationSignature(oldRuleDto);

    // 2. 委托给 CrudModule 更新规则
    const rule = await this.crudModule.updateRule(id, updateData);
    const ruleDto = FlexibleMappingRuleResponseDto.fromDocument(rule);
    const newDimensionSignature =
      this.buildRuleInvalidationSignature(ruleDto);
    const secondInvalidationExecuted =
      oldDimensionSignature !== newDimensionSignature;

    // 3. 🚀 失效相关缓存
    const firstInvalidationSucceeded =
      await this.invalidateRuleCacheBestEffort(id, oldRuleDto, "updateRule");
    let secondInvalidationSucceeded: boolean | undefined;
    if (secondInvalidationExecuted) {
      secondInvalidationSucceeded = await this.invalidateRuleCacheBestEffort(
        id,
        ruleDto,
        "updateRule",
      );
    }

    this.logger.log("updateRule 缓存失效完成", {
      id,
      oldDimensionSignature,
      newDimensionSignature,
      secondInvalidationExecuted,
      firstInvalidationSucceeded,
      secondInvalidationSucceeded,
    });

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
    const invalidationSucceeded =
      await this.invalidateRuleCacheBestEffort(
        id,
        oldRuleDto,
        "toggleRuleStatus",
      );
    this.logger.log("toggleRuleStatus 缓存失效完成", {
      id,
      isActive,
      invalidationSucceeded,
    });

    // 4. 缓存新的规则数据
    await this.mappingRuleCacheService.cacheRuleById(ruleDto);

    return ruleDto;
  }

  /**
   * 🗑️ 删除映射规则 (Redis缓存失效)
   * Phase 2 重构：委托给 CrudModule
   */
  async deleteRule(id: string): Promise<void> {
    // 1. 读取规则，转换失败也允许继续删除（容错删除）
    const rule = await this.crudModule.getRuleDocumentById(id);
    let ruleDto: FlexibleMappingRuleResponseDto | undefined;
    let degradedInvalidation = false;

    try {
      ruleDto = FlexibleMappingRuleResponseDto.fromDocument(rule);
    } catch (error) {
      degradedInvalidation = true;
      this.logger.warn("deleteRule 规则文档转换失败，降级执行删除与缓存清理", {
        id,
        error: error instanceof Error ? error.message : String(error),
        provider: rule?.provider,
        apiType: rule?.apiType,
        transDataRuleListType: rule?.transDataRuleListType,
      });
    }

    // 2. 删除规则（始终优先保证删除语义）
    await this.crudModule.deleteRule(id);

    // 3. 缓存失效：显式重试并记录补偿状态，不影响删除成功语义
    await this.invalidateDeleteRuleCacheWithRetry(
      id,
      ruleDto,
      degradedInvalidation,
    );
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

  private normalizeMarketType(marketType?: string): string {
    const normalizedMarketType = normalizeUppercaseString(marketType);
    if (!normalizedMarketType) {
      return "*";
    }
    return normalizedMarketType;
  }

  private normalizeProviderQueryParam(provider?: string): string | undefined {
    return normalizeOptionalLowercaseString(provider);
  }

  private normalizeRuleListType(ruleListType: string): RuleListType | null {
    return parseRuleListType(ruleListType);
  }

  private normalizeLookupProvider(provider: string): string {
    return this.normalizeDimensionPart(provider);
  }

  private normalizeLookupApiType(apiType: "rest" | "stream"): "rest" | "stream" {
    const normalizedApiType = this.normalizeDimensionPart(apiType);
    if (normalizedApiType === "rest" || normalizedApiType === "stream") {
      return normalizedApiType;
    }
    // 保持既有白名单语义：非白名单值交由下游现有校验链路处理
    return apiType;
  }

  private normalizeBestRuleLookupDimensions(
    provider: string,
    apiType: "rest" | "stream",
  ): { provider: string; apiType: "rest" | "stream" } {
    return {
      provider: this.normalizeLookupProvider(provider),
      apiType: this.normalizeLookupApiType(apiType),
    };
  }

  private normalizeDimensionPart(value: unknown): string {
    return normalizeLowercaseString(value);
  }

  private normalizeOptionalDimensionPart(value: unknown): string | undefined {
    const normalizedValue = this.normalizeDimensionPart(value);
    return normalizedValue || undefined;
  }

  private async invalidateRuleCacheBestEffort(
    ruleId: string,
    ruleDto: FlexibleMappingRuleResponseDto | undefined,
    operation: "updateRule" | "toggleRuleStatus",
  ): Promise<boolean> {
    try {
      await this.mappingRuleCacheService.invalidateRuleCache(ruleId, ruleDto);
      return true;
    } catch (error) {
      this.logger.warn(`${operation} 缓存失效失败（已忽略，不影响DB写入）`, {
        ruleId,
        provider: this.normalizeOptionalDimensionPart(ruleDto?.provider),
        apiType: this.normalizeOptionalDimensionPart(ruleDto?.apiType),
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  private async invalidateDeleteRuleCacheWithRetry(
    id: string,
    ruleDto: FlexibleMappingRuleResponseDto | undefined,
    degradedInvalidation: boolean,
  ): Promise<void> {
    let lastError: unknown;

    for (
      let attempt = 1;
      attempt <= this.deleteRuleCacheInvalidationMaxAttempts;
      attempt++
    ) {
      try {
        await this.mappingRuleCacheService.invalidateRuleCache(id, ruleDto);
        this.logger.log("deleteRule 缓存失效完成", {
          id,
          attempt,
          degradedInvalidation,
        });
        return;
      } catch (error) {
        lastError = error;
        this.logger.warn("deleteRule 缓存失效失败，准备重试/补偿", {
          id,
          attempt,
          maxAttempts: this.deleteRuleCacheInvalidationMaxAttempts,
          degradedInvalidation,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.logger.warn("deleteRule 缓存失效补偿仍失败（已忽略，不影响删除成功）", {
      id,
      maxAttempts: this.deleteRuleCacheInvalidationMaxAttempts,
      degradedInvalidation,
      error: lastError instanceof Error ? lastError.message : String(lastError),
    });
  }

  private buildRuleInvalidationSignature(
    rule: FlexibleMappingRuleResponseDto,
  ): string {
    const provider = this.normalizeDimensionPart(rule.provider);
    const apiType = this.normalizeDimensionPart(rule.apiType);
    const normalizedRuleListType =
      this.normalizeRuleListType(String(rule.transDataRuleListType)) ?? "";
    return [provider, apiType, normalizedRuleListType].join("|");
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

      // 使用DataMapperCacheStandardizedService的预热功能
      await this.mappingRuleCacheService.warmupCache(ruleDtos);

      this.logger.log("映射规则缓存预热完成", { cachedRules: ruleDtos.length });
    } catch (error) {
      this.logger.error("映射规则缓存预热失败", { error: error.message });
    }
  }

  // 已移除：缓存层 JSON 安全性校验（非核心能力）

  /**
   * 🔄 清理资源（用于模块销毁时）
   * Phase 2 重构：委托给 StatsModule
   */
  onModuleDestroy(): void {
    this.logger.log('FlexibleMappingRuleService 模块销毁完成');
  }
}
