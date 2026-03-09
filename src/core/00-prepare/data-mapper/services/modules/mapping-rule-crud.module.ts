/**
 * 映射规则 CRUD 模块
 *
 * 负责处理 FlexibleMappingRule 的创建、读取、更新、删除操作
 * 作为 FlexibleMappingRuleService 的内部模块化组件
 *
 * Phase 2 模块化重构：解决 FlexibleMappingRuleService 职责过重问题
 */

import { Injectable, Logger } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import {
  FlexibleMappingRuleDocument,
  FlexibleMappingRule
} from '@core/00-prepare/data-mapper/schemas/flexible-mapping-rule.schema';
import {
  DataSourceTemplateDocument,
  DataSourceTemplate
} from '@core/00-prepare/data-mapper/schemas/data-source-template.schema';
import {
  CreateFlexibleMappingRuleDto,
  FlexibleMappingRuleResponseDto,
  CreateMappingRuleFromSuggestionsDto
} from '@core/00-prepare/data-mapper/dto/flexible-mapping-rule.dto';
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from '@common/core/exceptions';
import { DATA_MAPPER_ERROR_CODES } from '@core/00-prepare/data-mapper/constants/data-mapper-error-codes.constants';
import {
  RULE_LIST_TYPES,
  RuleListType,
} from '@core/00-prepare/data-mapper/constants/data-mapper.constants';
import type { RuleLookupOptions } from '@core/00-prepare/data-mapper/types/rule-lookup-options.type';
import { DataSourceTemplateService } from '@core/00-prepare/data-mapper/services/data-source-template.service';

/**
 * 映射规则 CRUD 操作模块
 *
 * 职责范围：
 * - 映射规则的创建（含模板建议方式）
 * - 映射规则的读取和查询
 * - 映射规则的更新
 * - 映射规则的删除
 * - 映射规则状态切换
 * - 数据验证和业务逻辑检查
 */
@Injectable()
export class MappingRuleCrudModule {
  private readonly logger = new Logger(MappingRuleCrudModule.name);

  constructor(
    private readonly ruleModel: Model<FlexibleMappingRuleDocument>,
    private readonly templateModel: Model<DataSourceTemplateDocument>,
    private readonly templateService: DataSourceTemplateService,
  ) {}

  /**
   * 🎯 创建灵活映射规则
   */
  async createRule(
    dto: CreateFlexibleMappingRuleDto,
  ): Promise<FlexibleMappingRuleDocument> {
    this.logger.log(`创建灵活映射规则: ${dto.name}`);

    try {
      // 1. 验证数据源模板是否存在（如果提供了sourceTemplateId）
      if (dto.sourceTemplateId) {
        const template = await this.templateModel.findById(dto.sourceTemplateId);
        if (!template) {
          throw UniversalExceptionFactory.createBusinessException({
            message: `Data source template not found: ${dto.sourceTemplateId}`,
            errorCode: BusinessErrorCode.DATA_NOT_FOUND,
            operation: 'createRule',
            component: ComponentIdentifier.DATA_MAPPER,
            context: {
              sourceTemplateId: dto.sourceTemplateId,
              dataMapperErrorCode: DATA_MAPPER_ERROR_CODES.TEMPLATE_NOT_FOUND
            }
          });
        }
      }

      const normalizedMarketType = this.normalizeMarketType(dto.marketType);

      // 2. 检查是否已存在相同的规则
      const existing = await this.ruleModel.findOne({
        provider: dto.provider,
        apiType: dto.apiType,
        transDataRuleListType: dto.transDataRuleListType,
        name: dto.name,
      });

      if (existing) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.DATA_MAPPER,
          errorCode: BusinessErrorCode.RESOURCE_CONFLICT,
          operation: 'createRule',
          message: `Mapping rule already exists: ${dto.name}`,
          context: {
            ruleName: dto.name,
            provider: dto.provider,
            apiType: dto.apiType,
            errorType: DATA_MAPPER_ERROR_CODES.MAPPING_RULE_ALREADY_EXISTS
          },
          retryable: false
        });
      }

      // 3. 如果设置为默认规则，取消其他默认规则
      if (dto.isDefault) {
        await this.ruleModel.updateMany(
          {
            provider: dto.provider,
            apiType: dto.apiType,
            transDataRuleListType: dto.transDataRuleListType,
            isDefault: true,
          },
          { $set: { isDefault: false } },
        );
      }

      // 4. 计算整体置信度
      const overallConfidence = this.calculateOverallConfidence(dto.fieldMappings);

      // 5. 创建规则
      const rule = new this.ruleModel({
        ...dto,
        marketType: normalizedMarketType,
        overallConfidence,
        usageCount: 0,
        successfulTransformations: 0,
        failedTransformations: 0,
        isActive: true,
      });

      const saved = await rule.save();

      this.logger.log(`灵活映射规则创建成功`, {
        id: saved._id,
        name: dto.name,
        provider: dto.provider,
        apiType: dto.apiType,
        fieldMappings: dto.fieldMappings.length,
        overallConfidence,
      });

      return saved;
    } catch (error) {
      this.logger.error(`创建灵活映射规则失败`, {
        name: dto.name,
        provider: dto.provider,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 🎯 基于模板建议创建映射规则
   */
  async createRuleFromSuggestions(
    dto: CreateMappingRuleFromSuggestionsDto,
    suggestions: any[],
  ): Promise<FlexibleMappingRuleDocument> {
    this.logger.log(`基于模板建议创建映射规则: ${dto.name}`);

    // 1. 获取模板信息
    const template = await this.templateService.findTemplateById(dto.templateId);

    // 2. 根据选中的建议索引构建字段映射
    const selectedSuggestions = dto.selectedSuggestionIndexes.map((index) => {
      if (index < 0 || index >= suggestions.length) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.DATA_MAPPER,
          errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
          operation: 'createRuleFromSuggestions',
          message: `Invalid suggestion index: ${index}`,
          context: {
            index,
            maxIndex: suggestions.length - 1,
            errorType: DATA_MAPPER_ERROR_CODES.INVALID_SUGGESTION_INDEX
          },
          retryable: false
        });
      }
      return suggestions[index];
    });

    const fieldMappings = selectedSuggestions.map((suggestion) => ({
      sourceFieldPath: suggestion.sourceField.fieldPath,
      targetField: suggestion.targetField,
      confidence: suggestion.confidence,
      description: suggestion.reasoning,
      isActive: true,
    }));

    // 3. 构建创建规则的DTO
    const createDto: CreateFlexibleMappingRuleDto = {
      name: dto.name,
      provider: template.provider,
      apiType: template.apiType as "rest" | "stream",
      transDataRuleListType: RULE_LIST_TYPES.QUOTE_FIELDS, // 默认为报价字段，可根据需要调整
      description: dto.description,
      sourceTemplateId: dto.templateId,
      fieldMappings,
      isDefault: dto.isDefault,
      version: "1.0.0",
      marketType: "*",
    };

    return await this.createRule(createDto);
  }

  /**
   * 🔍 根据ID获取规则文档（受控的内部访问）
   */
  async getRuleDocumentById(id: string): Promise<FlexibleMappingRuleDocument> {
    // 参数验证
    if (!Types.ObjectId.isValid(id)) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'findRuleById',
        message: `Invalid rule ID format: ${id}`,
        context: {
          ruleId: id,
          errorType: DATA_MAPPER_ERROR_CODES.INVALID_RULE_ID_FORMAT
        },
        retryable: false
      });
    }

    try {
      // 直接查询数据库
      const rule = await this.ruleModel.findById(id);
      if (!rule) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.DATA_MAPPER,
          errorCode: BusinessErrorCode.DATA_NOT_FOUND,
          operation: 'mappingRuleNotFound',
          message: `Mapping rule not found: ${id}`,
          context: {
            ruleId: id,
            errorType: DATA_MAPPER_ERROR_CODES.MAPPING_RULE_NOT_FOUND
          },
          retryable: false
        });
      }

      this.logger.debug(`获取规则文档成功: ${id}`);
      return rule;
    } catch (error) {
      if (error.message?.includes('DATA_NOT_FOUND') || error.message?.includes('DATA_VALIDATION_FAILED')) {
        throw error;
      }
      this.logger.error("获取规则文档时发生错误", { id, error: error.message });
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER,
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        operation: 'getRuleDocumentById',
        message: `Failed to get rule document: ${error.message}`,
        context: {
          ruleId: id,
          originalError: error.message,
          errorType: DATA_MAPPER_ERROR_CODES.RULE_DOCUMENT_FETCH_ERROR
        },
        retryable: true,
        originalError: error
      });
    }
  }

  /**
   * 🎯 查找最匹配的映射规则
   */
  async findBestMatchingRuleDocument(
    provider: string,
    apiType: "rest" | "stream",
    transDataRuleListType: RuleListType,
    marketType?: string,
    options: RuleLookupOptions = {},
  ): Promise<FlexibleMappingRuleDocument | null> {
    this.logger.debug(`查找最匹配的映射规则`, {
      provider,
      apiType,
      transDataRuleListType,
      marketType,
    });

    try {
      const normalizedMarketType = this.normalizeMarketType(marketType);
      const normalizedProvider = this.normalizeLookupProvider(provider);
      const normalizedApiType = this.normalizeLookupApiType(apiType);
      const baseFilter = {
        provider: normalizedProvider,
        apiType: normalizedApiType,
        transDataRuleListType,
        isActive: true,
      };
      let rules = await this.ruleModel
        .find(baseFilter)
        .sort({
          overallConfidence: -1,
          successRate: -1,
          usageCount: -1,
          createdAt: -1,
        });

      if (rules.length === 0) {
        return null;
      }

      const defaultRules = rules.filter((rule) => rule.isDefault);
      const defaultMatch = this.selectRuleByMarketType(
        defaultRules,
        normalizedMarketType,
        options,
      );
      if (defaultMatch) {
        return defaultMatch;
      }

      return this.selectRuleByMarketType(rules, normalizedMarketType, options);
    } catch (error) {
      this.logger.error("查找最匹配映射规则失败", {
        provider,
        apiType,
        transDataRuleListType,
        marketType,
        error: error.message,
      });
      throw error;
    }
  }

  private selectRuleByMarketType(
    rules: FlexibleMappingRuleDocument[],
    requestedMarketType: string,
    options: RuleLookupOptions = {},
  ): FlexibleMappingRuleDocument | null {
    let bestRule: FlexibleMappingRuleDocument | null = null;
    let bestPriority = Number.POSITIVE_INFINITY;

    for (const rule of rules) {
      const priority = this.getMarketMatchPriority(
        rule.marketType,
        requestedMarketType,
        options,
      );
      if (priority < bestPriority) {
        bestPriority = priority;
        bestRule = rule;
        if (priority === 0) {
          break;
        }
      }
    }

    return Number.isFinite(bestPriority) ? bestRule : null;
  }

  private getMarketMatchPriority(
    ruleMarketType?: string,
    requestedMarketType?: string,
    options: RuleLookupOptions = {},
  ): number {
    const normalizedRule = this.normalizeMarketType(ruleMarketType);
    const normalizedRequest = this.normalizeMarketType(requestedMarketType);

    if (normalizedRule === normalizedRequest) {
      return 0;
    }

    if (
      options.strictWildcardOnly &&
      normalizedRequest === "*" &&
      normalizedRule !== "*"
    ) {
      return Number.POSITIVE_INFINITY;
    }

    if (normalizedRule === "*") {
      return 3;
    }
    if (normalizedRequest === "*") {
      return 1;
    }

    const ruleSet = new Set(normalizedRule.split("/"));
    const requestSet = new Set(normalizedRequest.split("/"));

    const requestSubsetOfRule = Array.from(requestSet).every((value) =>
      ruleSet.has(value),
    );
    if (requestSubsetOfRule) {
      return 1;
    }

    const intersection = Array.from(ruleSet).some((value) =>
      requestSet.has(value),
    );
    if (intersection) {
      return 2;
    }

    return Number.POSITIVE_INFINITY;
  }

  private normalizeMarketType(marketType?: string): string {
    if (!marketType || !marketType.trim()) {
      return "*";
    }
    return marketType.trim().toUpperCase();
  }

  private normalizeLookupProvider(provider: string): string {
    return this.normalizeLowercaseString(provider);
  }

  private normalizeLookupApiType(apiType: "rest" | "stream"): "rest" | "stream" {
    const normalizedApiType = this.normalizeLowercaseString(apiType);
    if (normalizedApiType === "rest" || normalizedApiType === "stream") {
      return normalizedApiType;
    }
    return apiType;
  }

  private normalizeLowercaseString(value: unknown): string {
    if (typeof value !== "string") {
      return "";
    }
    return value.trim().toLowerCase();
  }

  /**
   * ✏️ 更新映射规则
   */
  async updateRule(
    id: string,
    updateData: Partial<CreateFlexibleMappingRuleDto>,
  ): Promise<FlexibleMappingRuleDocument> {
    // 1. 获取原规则信息
    const oldRule = await this.getRuleDocumentById(id);

    // 🛡️ 清洗 fieldMappings，确保默认值完整
    if (Array.isArray(updateData.fieldMappings)) {
      updateData.fieldMappings = updateData.fieldMappings.map((m: any) => ({
        // 必要字段
        sourceFieldPath: m.sourceFieldPath,
        targetField: m.targetField,
        transform: m.transform,
        fallbackPaths: m.fallbackPaths,
        confidence: m.confidence,
        description: m.description,
        // 默认值处理
        isActive: m.isActive !== false,
        isRequired: m.isRequired ?? false,
      })) as any;
    }

    if (typeof updateData.marketType === 'string') {
      updateData.marketType = this.normalizeMarketType(updateData.marketType);
    }

    // 2. 更新规则
    const rule = await this.ruleModel.findByIdAndUpdate(
      id,
      {
        ...updateData,
        ...(updateData.fieldMappings && {
          overallConfidence: this.calculateOverallConfidence(
            updateData.fieldMappings,
          ),
        }),
      },
      { new: true },
    );

    this.logger.debug("updateRule: fieldMappings after update", {
      id,
      mappingCount: rule.fieldMappings?.length,
      samplePaths: rule.fieldMappings
        ?.slice(0, 5)
        .map((m: any) => m.sourceFieldPath),
    });

    this.logger.log(`映射规则更新成功`, { id, name: rule.name });
    return rule;
  }

  /**
   * 🔄 激活/禁用规则
   */
  async toggleRuleStatus(
    id: string,
    isActive: boolean,
  ): Promise<FlexibleMappingRuleDocument> {
    // 1. 验证规则存在
    await this.getRuleDocumentById(id);

    // 2. 更新规则状态
    const rule = await this.ruleModel.findByIdAndUpdate(
      id,
      { isActive },
      { new: true },
    );

    this.logger.log(`规则状态更新`, { id, isActive });
    return rule;
  }

  /**
   * 🗑️ 删除映射规则
   */
  async deleteRule(id: string): Promise<FlexibleMappingRuleDocument> {
    // 1. 获取规则信息用于返回
    const rule = await this.getRuleDocumentById(id);

    // 2. 删除规则
    await this.ruleModel.findByIdAndDelete(id);

    this.logger.log(`映射规则删除成功`, { id, name: rule.name });
    return rule;
  }

  /**
   * 📊 计算整体置信度
   */
  private calculateOverallConfidence(fieldMappings: any[]): number {
    // 当为人工创建/验证的规则时，字段级 confidence 往往未提供。
    // 设计取值：缺失则按 1.0 处理，表示“人工确认通过”。
    // 同时对越界值进行钳制，避免 NaN/Infinity 传播到持久层。
    if (!Array.isArray(fieldMappings) || fieldMappings.length === 0) {
      // 空映射规则不应出现；返回 0 以体现不可用，但避免 NaN
      return 0;
    }

    const safeValues = fieldMappings.map((m) => {
      const v = (m && typeof m.confidence === 'number') ? m.confidence : 1.0;
      if (!Number.isFinite(v)) return 1.0;
      // 钳制到 [0,1]
      return Math.max(0, Math.min(1, v));
    });

    const sum = safeValues.reduce((acc, v) => acc + v, 0);
    const avg = sum / safeValues.length;
    return Math.max(0, Math.min(1, avg));
  }
}
