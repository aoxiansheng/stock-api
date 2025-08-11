import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createLogger } from '@common/config/logger.config';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import { PaginatedDataDto } from '@common/modules/pagination/dto/paginated-data';

import { FlexibleMappingRule, FlexibleMappingRuleDocument } from '../schemas/flexible-mapping-rule.schema';
import { DataSourceTemplate, DataSourceTemplateDocument } from '../schemas/data-source-template.schema';
import { 
  CreateFlexibleMappingRuleDto,
  FlexibleMappingRuleResponseDto,
  TestFlexibleMappingRuleDto,
  FlexibleMappingTestResultDto,
  CreateMappingRuleFromSuggestionsDto
} from '../dto/flexible-mapping-rule.dto';
import { DataSourceTemplateService } from './data-source-template.service';
import { MappingRuleCacheService } from './mapping-rule-cache.service';
import { ObjectUtils } from '../../shared/utils/object.util';

@Injectable()
export class FlexibleMappingRuleService {
  private readonly logger = createLogger(FlexibleMappingRuleService.name);

  constructor(
    @InjectModel(FlexibleMappingRule.name)
    private readonly ruleModel: Model<FlexibleMappingRuleDocument>,
    @InjectModel(DataSourceTemplate.name)
    private readonly templateModel: Model<DataSourceTemplateDocument>,
    private readonly paginationService: PaginationService,
    private readonly templateService: DataSourceTemplateService,
    private readonly cacheService: MappingRuleCacheService,
  ) {}

  /**
   * 🎯 创建灵活映射规则
   */
  async createRule(dto: CreateFlexibleMappingRuleDto): Promise<FlexibleMappingRuleResponseDto> {
    this.logger.log(`创建灵活映射规则: ${dto.name}`);

    try {
      // 1. 验证数据源模板是否存在（如果提供了sourceTemplateId）
      if (dto.sourceTemplateId) {
        const template = await this.templateModel.findById(dto.sourceTemplateId);
        if (!template) {
          throw new BadRequestException(`数据源模板不存在: ${dto.sourceTemplateId}`);
        }
      }

      // 2. 检查是否已存在相同的规则
      const existing = await this.ruleModel.findOne({
        provider: dto.provider,
        apiType: dto.apiType,
        transDataRuleListType: dto.transDataRuleListType,
        name: dto.name,
      });

      if (existing) {
        throw new ConflictException(`映射规则已存在: ${dto.name}`);
      }

      // 3. 如果设置为默认规则，取消其他默认规则
      if (dto.isDefault) {
        await this.ruleModel.updateMany(
          { 
            provider: dto.provider, 
            apiType: dto.apiType, 
            transDataRuleListType: dto.transDataRuleListType,
            isDefault: true 
          },
          { $set: { isDefault: false } }
        );
      }

      // 4. 计算整体置信度
      const overallConfidence = this.calculateOverallConfidence(dto.fieldMappings);

      // 5. 创建规则
      const rule = new this.ruleModel({
        ...dto,
        overallConfidence,
        usageCount: 0,
        successfulTransformations: 0,
        failedTransformations: 0,
        isActive: true,
      });

      const saved = await rule.save();
      const ruleDto = FlexibleMappingRuleResponseDto.fromDocument(saved);
      
      // 🚀 缓存新创建的规则
      await this.cacheService.cacheRuleById(ruleDto);
      if (dto.isDefault) {
        await this.cacheService.cacheBestMatchingRule(
          dto.provider,
          dto.apiType,
          dto.transDataRuleListType,
          ruleDto
        );
      }
      
      this.logger.log(`灵活映射规则创建成功`, {
        id: saved._id,
        name: dto.name,
        provider: dto.provider,
        apiType: dto.apiType,
        fieldMappings: dto.fieldMappings.length,
        overallConfidence
      });

      return ruleDto;
    } catch (error) {
      this.logger.error(`创建灵活映射规则失败`, {
        name: dto.name,
        provider: dto.provider,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 🎯 基于模板建议创建映射规则
   */
  async createRuleFromSuggestions(
    dto: CreateMappingRuleFromSuggestionsDto,
    suggestions: any[]
  ): Promise<FlexibleMappingRuleResponseDto> {
    this.logger.log(`基于模板建议创建映射规则: ${dto.name}`);

    // 1. 获取模板信息
    const template = await this.templateService.findTemplateById(dto.templateId);

    // 2. 根据选中的建议索引构建字段映射
    const selectedSuggestions = dto.selectedSuggestionIndexes.map(index => {
      if (index < 0 || index >= suggestions.length) {
        throw new BadRequestException(`无效的建议索引: ${index}`);
      }
      return suggestions[index];
    });

    const fieldMappings = selectedSuggestions.map(suggestion => ({
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
      apiType: template.apiType as 'rest' | 'stream',
      transDataRuleListType: 'quote_fields', // 默认为报价字段，可根据需要调整
      description: dto.description,
      sourceTemplateId: dto.templateId,
      fieldMappings,
      isDefault: dto.isDefault,
      version: '1.0.0',
    };

    return await this.createRule(createDto);
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
    isActive?: boolean
  ): Promise<PaginatedDataDto<FlexibleMappingRuleResponseDto>> {
    // 使用PaginationService标准化分页参数
    const { page: normalizedPage, limit: normalizedLimit } = this.paginationService.normalizePaginationQuery({
      page,
      limit
    });

    const filter: any = {};
    
    if (provider) filter.provider = provider;
    if (apiType) filter.apiType = apiType;
    if (transDataRuleListType) filter.transDataRuleListType = transDataRuleListType;
    if (isActive !== undefined) filter.isActive = isActive;

    const query = this.ruleModel
      .find(filter)
      .sort({ overallConfidence: -1, usageCount: -1, createdAt: -1 });

    const [rules, total] = await Promise.all([
      query.skip((normalizedPage - 1) * normalizedLimit).limit(normalizedLimit),
      this.ruleModel.countDocuments(filter),
    ]);

    const responseItems = rules.map(rule => 
      FlexibleMappingRuleResponseDto.fromDocument(rule)
    );

    return this.paginationService.createPaginatedResponse(
      responseItems,
      normalizedPage,
      normalizedLimit,
      total
    );
  }

  /**
   * 🔍 根据ID获取规则 (Redis缓存优化)
   */
  async findRuleById(id: string): Promise<FlexibleMappingRuleResponseDto> {
    // 1. 尝试从缓存获取
    const cachedRule = await this.cacheService.getCachedRuleById(id);
    if (cachedRule) {
      return cachedRule;
    }

    // 2. 缓存未命中，从数据库查询
    const rule = await this.ruleModel.findById(id);
    
    if (!rule) {
      throw new NotFoundException(`映射规则未找到: ${id}`);
    }

    const ruleDto = FlexibleMappingRuleResponseDto.fromDocument(rule);
    
    // 3. 缓存查询结果
    await this.cacheService.cacheRuleById(ruleDto);

    return ruleDto;
  }

  /**
   * 🎯 查找最匹配的映射规则 (Redis缓存优化)
   */
  async findBestMatchingRule(
    provider: string,
    apiType: 'rest' | 'stream',
    transDataRuleListType: string
  ): Promise<FlexibleMappingRuleResponseDto | null> {
    this.logger.debug(`查找最匹配的映射规则`, { provider, apiType, transDataRuleListType });

    // 1. 尝试从缓存获取最佳匹配规则
    const cachedRule = await this.cacheService.getCachedBestMatchingRule(
      provider, 
      apiType, 
      transDataRuleListType
    );
    if (cachedRule) {
      return cachedRule;
    }

    // 2. 缓存未命中，从数据库查询
    // 首先查找默认规则
    let rule = await this.ruleModel
      .findOne({
        provider,
        apiType,
        transDataRuleListType,
        isActive: true,
        isDefault: true,
      })
      .sort({ overallConfidence: -1 });

    // 3. 如果没有默认规则，查找最佳匹配规则
    if (!rule) {
      rule = await this.ruleModel
        .findOne({
          provider,
          apiType,
          transDataRuleListType,
          isActive: true,
        })
        .sort({ 
          overallConfidence: -1, 
          successRate: -1,
          usageCount: -1 
        });
    }

    const ruleDto = rule ? FlexibleMappingRuleResponseDto.fromDocument(rule) : null;
    
    // 4. 缓存查询结果（仅在找到规则时）
    if (ruleDto) {
      await this.cacheService.cacheBestMatchingRule(
        provider, 
        apiType, 
        transDataRuleListType, 
        ruleDto
      );
    }

    return ruleDto;
  }

  

  /**
   * 🎯 应用灵活映射规则的核心逻辑
   */
  public async applyFlexibleMappingRule(
    rule: FlexibleMappingRuleDocument,
    sourceData: any,
    includeDebugInfo: boolean = false
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
    // 🐞 调试：应用映射前输出规则概览
    this.logger.debug("applyFlexibleMappingRule: begin", {
      ruleId: rule._id?.toString(),
      mappingCount: rule.fieldMappings?.length,
      samplePaths: rule.fieldMappings?.slice(0, 5).map((m: any) => m.sourceFieldPath),
    });
    const transformedData = {};
    const debugInfo = [];
    let successfulMappings = 0;
    let failedMappings = 0;

    for (const mapping of rule.fieldMappings) {
      // 若未显式设置 isActive，则默认视为启用
      if (mapping.isActive === false) continue;

      try {
        // 1. 尝试主要路径
        let sourceValue = this.getValueFromPath(sourceData, mapping.sourceFieldPath);
        let fallbackUsed = undefined;

        // 2. 如果主要路径失败，尝试回退路径
        if (sourceValue === undefined && mapping.fallbackPaths?.length > 0) {
          for (const fallbackPath of mapping.fallbackPaths) {
            sourceValue = this.getValueFromPath(sourceData, fallbackPath);
            if (sourceValue !== undefined) {
              fallbackUsed = fallbackPath;
              break;
            }
          }
        }

        if (sourceValue !== undefined) {
          // 3. 应用转换（如果有）
          let transformedValue = sourceValue;
          if (mapping.transform) {
            transformedValue = this.applyTransform(sourceValue, mapping.transform);
          }
          // 如果目标字段名包含 "percent" 且结果仍小于 1，则认为为比率制，需要再乘 100 输出百分数
          if (
            typeof transformedValue === 'number' &&
            Math.abs(transformedValue) < 1 &&
            mapping.targetField.toLowerCase().includes('percent')
          ) {
            transformedValue = transformedValue * 100;
          }

          transformedData[mapping.targetField] = transformedValue;
          successfulMappings++;

          if (includeDebugInfo) {
            debugInfo.push({
              sourceFieldPath: mapping.sourceFieldPath,
              targetField: mapping.targetField,
              sourceValue,
              transformedValue,
              success: true,
              fallbackUsed,
            });
          }
        } else {
          failedMappings++;
          
          if (includeDebugInfo) {
            debugInfo.push({
              sourceFieldPath: mapping.sourceFieldPath,
              targetField: mapping.targetField,
              sourceValue: undefined,
              transformedValue: undefined,
              success: false,
              error: '源字段值未找到',
            });
          }
        }
      } catch (error) {
        failedMappings++;
        
        if (includeDebugInfo) {
          debugInfo.push({
            sourceFieldPath: mapping.sourceFieldPath,
            targetField: mapping.targetField,
            sourceValue: undefined,
            transformedValue: undefined,
            success: false,
            error: error.message,
          });
        }
      }
    }

    const totalMappings = successfulMappings + failedMappings;
    const successRate = totalMappings > 0 ? successfulMappings / totalMappings : 0;

    return {
      transformedData,
      success: successRate > 0.5, // 超过50%映射成功则认为整体成功
      mappingStats: {
        totalMappings,
        successfulMappings,
        failedMappings,
        successRate,
      },
      debugInfo: includeDebugInfo ? debugInfo : undefined,
    };
  }

  /**
   * 🔧 从路径获取值的辅助方法
   */
  private getValueFromPath(obj: any, path: string): any {
    // 优先尝试直接访问
    if (obj?.[path] !== undefined) {
      return obj[path];
    }
    
    // 使用ObjectUtils作为回退
    return ObjectUtils.getValueFromPath(obj, path);
  }

  /**
   * 🔧 应用转换
   */
  private applyTransform(value: any, transform: any): any {
    const numericValue = Number(value);

    switch (transform.type) {
      case 'multiply':
        if (!isNaN(numericValue)) {
          return numericValue * (Number(transform.value) || 1);
        }
        break;
      case 'divide':
        if (!isNaN(numericValue) && transform.value !== 0) {
          return numericValue / (Number(transform.value) || 1);
        }
        break;
      case 'add':
        if (!isNaN(numericValue)) {
          return numericValue + (Number(transform.value) || 0);
        }
        break;
      case 'subtract':
        if (!isNaN(numericValue)) {
          return numericValue - (Number(transform.value) || 0);
        }
        break;
      case 'format':
        const template = String(transform.value || '{value}');
        return template.replace(/\{value\}/g, String(value));
      default:
        return value;
    }
    
    return value;
  }

  /**
   * 📊 更新规则使用统计 (Redis缓存失效)
   */
  private async updateRuleStats(dataMapperRuleId: string, success: boolean): Promise<void> {
    const updateFields: any = {
      $inc: { usageCount: 1 },
      $set: { lastUsedAt: new Date() }
    };

    if (success) {
      updateFields.$inc.successfulTransformations = 1;
    } else {
      updateFields.$inc.failedTransformations = 1;
    }

    await this.ruleModel.findByIdAndUpdate(dataMapperRuleId, updateFields);

    // 重新计算成功率
    const rule = await this.ruleModel.findById(dataMapperRuleId);
    if (rule) {
      const total = rule.successfulTransformations + rule.failedTransformations;
      const successRate = total > 0 ? rule.successfulTransformations / total : 0;
      
      await this.ruleModel.findByIdAndUpdate(dataMapperRuleId, { 
        $set: { successRate } 
      });

      // 🚀 统计更新后失效缓存，因为成功率和使用数量变化会影响最佳匹配
      const ruleDto = FlexibleMappingRuleResponseDto.fromDocument(rule);
      await this.cacheService.invalidateRuleCache(dataMapperRuleId, ruleDto);
    }
  }

  /**
   * 📊 计算整体置信度
   */
  private calculateOverallConfidence(fieldMappings: any[]): number {
    if (fieldMappings.length === 0) return 0;
    
    const avgConfidence = fieldMappings.reduce((sum, mapping) => sum + mapping.confidence, 0) / fieldMappings.length;
    return Math.min(avgConfidence, 1.0);
  }

  /**
   * ✏️ 更新映射规则 (Redis缓存失效)
   */
  async updateRule(
    id: string, 
    updateData: Partial<CreateFlexibleMappingRuleDto>
  ): Promise<FlexibleMappingRuleResponseDto> {
    // 1. 获取原规则信息用于缓存失效
    const oldRule = await this.ruleModel.findById(id);
    if (!oldRule) {
      throw new NotFoundException(`映射规则未找到: ${id}`);
    }
    const oldRuleDto = FlexibleMappingRuleResponseDto.fromDocument(oldRule);

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

    // 2. 更新规则
    const rule = await this.ruleModel.findByIdAndUpdate(
      id,
      { 
        ...updateData,
        ...(updateData.fieldMappings && { 
          overallConfidence: this.calculateOverallConfidence(updateData.fieldMappings) 
        })
      },
      { new: true }
    );
    // �� 调试：更新后输出映射数量及示例路径
    this.logger.debug("updateRule: fieldMappings after update", {
      id,
      mappingCount: rule.fieldMappings?.length,
      samplePaths: rule.fieldMappings?.slice(0, 5).map((m: any) => m.sourceFieldPath),
    });

    const ruleDto = FlexibleMappingRuleResponseDto.fromDocument(rule);

    // 3. 🚀 失效相关缓存
    await this.cacheService.invalidateRuleCache(id, oldRuleDto);
    
    // 4. 缓存新的规则数据
    await this.cacheService.cacheRuleById(ruleDto);

    this.logger.log(`映射规则更新成功`, { id, name: rule.name });
    return ruleDto;
  }

  /**
   * 🔄 激活/禁用规则 (Redis缓存失效)
   */
  async toggleRuleStatus(id: string, isActive: boolean): Promise<FlexibleMappingRuleResponseDto> {
    // 1. 获取原规则信息用于缓存失效
    const oldRule = await this.ruleModel.findById(id);
    if (!oldRule) {
      throw new NotFoundException(`映射规则未找到: ${id}`);
    }
    const oldRuleDto = FlexibleMappingRuleResponseDto.fromDocument(oldRule);

    // 2. 更新规则状态
    const rule = await this.ruleModel.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    );

    const ruleDto = FlexibleMappingRuleResponseDto.fromDocument(rule);

    // 3. 🚀 失效相关缓存（特别是最佳匹配规则缓存）
    await this.cacheService.invalidateRuleCache(id, oldRuleDto);
    
    // 4. 缓存新的规则数据
    await this.cacheService.cacheRuleById(ruleDto);

    this.logger.log(`规则状态更新`, { id, isActive });
    return ruleDto;
  }

  /**
   * 🗑️ 删除映射规则 (Redis缓存失效)
   */
  async deleteRule(id: string): Promise<void> {
    // 1. 获取规则信息用于缓存失效
    const rule = await this.ruleModel.findById(id);
    if (!rule) {
      throw new NotFoundException(`映射规则未找到: ${id}`);
    }
    const ruleDto = FlexibleMappingRuleResponseDto.fromDocument(rule);
    
    // 2. 删除规则
    await this.ruleModel.findByIdAndDelete(id);

    // 3. 🚀 失效相关缓存
    await this.cacheService.invalidateRuleCache(id, ruleDto);

    this.logger.log(`映射规则删除成功`, { id, name: rule.name });
  }

  /**
   * 🔄 预热缓存 - 缓存常用规则
   */
  async warmupMappingRuleCache(): Promise<void> {
    this.logger.log('开始映射规则缓存预热');
    
    try {
      // 查找所有活跃规则，按使用量和成功率排序
      const activeRules = await this.ruleModel
        .find({ isActive: true })
        .sort({ usageCount: -1, successRate: -1 })
        .limit(50) // 限制预热数量
        .exec();

      const ruleDtos = activeRules.map(rule => FlexibleMappingRuleResponseDto.fromDocument(rule));
      
      // 使用MappingRuleCacheService的预热功能
      await this.cacheService.warmupCache(ruleDtos);
      
      this.logger.log('映射规则缓存预热完成', { cachedRules: ruleDtos.length });
    } catch (error) {
      this.logger.error('映射规则缓存预热失败', { error: error.message });
    }
  }
}