import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from "@nestjs/common";

import { LRUCache } from 'lru-cache';
// 🎯 复用 common 模块的日志配置
import { createLogger, sanitizeLogData } from "@common/config/logger.config";
import { FeatureFlags } from "@common/config/feature-flags.config";

// 🎯 复用 common 模块的通用类型和常量已集成到 data-mapper.constants 中
// 🎯 复用 common 模块的数据映射常量

import { ObjectUtils } from "../../shared/utils/object.util";
import { StringUtils } from "../../shared/utils/string.util";
import { MetricsRegistryService } from "../../../monitoring/metrics/metrics-registry.service";
import { Metrics } from "../../../monitoring/metrics/metrics-helper";

import {
  DATA_MAPPER_ERROR_MESSAGES,
  DATA_MAPPER_WARNING_MESSAGES,
  DATA_MAPPER_SUCCESS_MESSAGES,
  FIELD_SUGGESTION_CONFIG,
  TRANSFORMATION_TYPES,
  TRANSFORMATION_DEFAULTS,
  DATA_MAPPER_PERFORMANCE_THRESHOLDS,
} from "../constants/data-mapper.constants";
import { CreateDataMappingDto } from "../dto/create-data-mapping.dto";
import {
  DataMappingTestResultDto,
  DataMappingStatisticsDto,
  FieldExtractionResultDto,
  TransformationInputDto,
  FieldMatchDto,
} from "../dto/data-mapping-internal.dto";
import { DataMappingQueryDto } from "../dto/data-mapping-query.dto";
import {
  DataMappingResponseDto,
  ParsedFieldsResponseDto,
  FieldSuggestionResponseDto,
} from "../dto/data-mapping-response.dto";
import { PaginatedDataDto } from '@common/modules/pagination/dto/paginated-data';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import {
  UpdateDataMappingDto,
  ParseJsonDto,
  FieldSuggestionDto,
  TestMappingDto,
} from "../dto/update-data-mapping.dto";
import { IDataMapper } from "../interfaces/data-mapping.interface";
import { DataMappingRepository } from "../repositories/data-mapper.repository";

@Injectable()
export class DataMapperService implements IDataMapper, OnModuleInit {
  // �� 使用 common 模块的日志配置
  private readonly logger = createLogger(DataMapperService.name);

  // 🎯 规则编译缓存（版本感知）
  private ruleCache: LRUCache<string, any>;
  
  // 🎯 对象池（减少GC压力）
  private objectPool: any[] = [];
  private readonly maxPoolSize: number;
  
  // 🎯 Promise去重锁（防止并发编译同一规则）
  private pendingCompilations = new Map<string, Promise<any>>();
  
  // 缓存统计指标
  private ruleCompilationHits = 0;
  private ruleCompilationMisses = 0;

  constructor(
    private readonly repository: DataMappingRepository,
    private readonly paginationService: PaginationService,
    private readonly featureFlags: FeatureFlags,
    private readonly metricsRegistry: MetricsRegistryService,
  ) {
    // 🎯 初始化规则编译缓存
    this.ruleCache = new LRUCache<string, any>({ 
      max: this.featureFlags.ruleCacheMaxSize,
      ttl: this.featureFlags.ruleCacheTtl,
    });
    
    // 🎯 初始化对象池大小
    this.maxPoolSize = this.featureFlags.objectPoolSize;
  }

  /**
   * 🎯 模块初始化：设置 Change Stream 监听
   */
  async onModuleInit() {
    if (!this.featureFlags.dataTransformCacheEnabled) {
      this.logger.log('数据转换缓存已禁用，跳过初始化');
      return;
    }

    try {
      // 🎯 MongoDB Change Stream 监听规则变化
      await this.setupRuleChangeStreamMonitoring();
      this.logger.log('MongoDB Change Stream 监听已启用（规则变化）');
    } catch (error) {
      this.logger.warn('ChangeStream 不可用，启用轮询模式', { error: error.message });
      
      // 🎯 降级策略：定时轮询检查规则版本
      setInterval(() => this.checkRuleVersions(), 10 * 60 * 1000); // 10分钟
    }
  }

  /**
   * 🎯 设置规则变化 MongoDB Change Stream 监听
   */
  private async setupRuleChangeStreamMonitoring(): Promise<void> {
    try {
      // 监听数据映射规则的变化
      const changeStream = this.repository.watchChanges();
      
      changeStream.on('change', (change) => {
        this.logger.debug('检测到数据映射规则变化', { 
          operationType: change.operationType,
          documentKey: change.documentKey 
        });
        
        // 清除相关缓存
        this.invalidateRuleCacheForChangedRule(change);
      });

      changeStream.on('error', (error) => {
        this.logger.error('规则 Change Stream 错误', { error: error.message });
        
        // 启用降级策略
        setTimeout(() => this.checkRuleVersions(), 1000);
      });

      this.logger.log('规则变化 Change Stream 监听器已启动');
    } catch (error) {
      this.logger.warn('无法启动规则 Change Stream，使用轮询模式', { error: error.message });
      throw error;
    }
  }

  /**
   * 🎯 根据变化的规则清除缓存
   */
  private invalidateRuleCacheForChangedRule(change: any): void {
    try {
      const { operationType, documentKey, fullDocument } = change;
      
      if (operationType === 'delete') {
        // 删除操作：清除相关缓存键
        this.clearRuleCacheByDocumentKey(documentKey);
      } else if (operationType === 'update' || operationType === 'insert') {
        // 更新或插入操作：清除相关缓存
        this.clearRuleCacheByDocument(fullDocument || documentKey);
      }
      
      this.logger.debug('规则缓存失效处理完成', { operationType, documentKey });
    } catch (error) {
      // 🎯 记录验证错误
      Metrics.inc(
        this.metricsRegistry,
        'dataMapperValidationErrors',
        { 
          error_type: 'cache_invalidation',
          field: 'rule_cache'
        }
      );
      
      this.logger.error('规则缓存失效处理失败', { error: error.message });
    }
  }

  /**
   * 🎯 根据文档键清除规则缓存
   */
  private clearRuleCacheByDocumentKey(documentKey: any): void {
    const cacheKeys = Array.from(this.ruleCache.keys());
    const relatedKeys = cacheKeys.filter(key => 
      key.includes(documentKey._id?.toString() || '')
    );
    
    for (const key of relatedKeys) {
      this.ruleCache.delete(key);
    }
    
    this.logger.debug(`清除了 ${relatedKeys.length} 个相关规则缓存键`);
  }

  /**
   * 🎯 根据文档内容清除规则缓存
   */
  private clearRuleCacheByDocument(document: any): void {
    if (!document || !document.provider) {
      return;
    }
    
    // 根据提供商清除相关缓存
    const cacheKeys = Array.from(this.ruleCache.keys());
    const relatedKeys = cacheKeys.filter(key => 
      key.includes(`rule_${document.provider}_`)
    );
    
    for (const key of relatedKeys) {
      this.ruleCache.delete(key);
    }
    
    this.logger.debug(`清除了提供商 ${document.provider} 的 ${relatedKeys.length} 个规则缓存键`);
  }

  /**
   * 🎯 定时轮询检查规则版本（Change Stream 不可用时的降级策略）
   */
  private async checkRuleVersions(): Promise<void> {
    if (!this.featureFlags.dataTransformCacheEnabled) {
      return;
    }

    try {
      // 简化实现：清理所有规则缓存以确保一致性
      this.clearRuleCache();
      this.logger.debug('定时轮询：已清理所有规则缓存确保数据一致性');
    } catch (error) {
      this.logger.warn('规则版本检查失败，清理所有缓存', { error: error.message });
      this.clearRuleCache();
    }
  }

  /**
   * 🎯 清理规则编译缓存
   */
  private clearRuleCache(): void {
    this.ruleCache.clear();
    this.pendingCompilations.clear();
    this.ruleCompilationHits = 0;
    this.ruleCompilationMisses = 0;
    this.logger.log('规则编译缓存已清理');
  }

  // Interface implementation - apply mapping rule
  async mapData(
    rawData: Record<string, any>,
    mappingOutRuleId: string,
  ): Promise<Record<string, any>[]> {
    return this.applyMappingRule(mappingOutRuleId, rawData);
  }

  // Interface implementation - save mapping rule
  async saveMappingRule(rule: CreateDataMappingDto): Promise<void> {
    await this.create(rule);
  }

  // Interface implementation - get mapping rules
  async getMappingRule(
    provider: string,
    transDataRuleListType: string,
    apiType?: string,
  ): Promise<DataMappingResponseDto[]> {
    const rules = await this.repository.findByProviderAndType(
      provider,
      transDataRuleListType,
      apiType,
    );
    return rules.map((rule) => DataMappingResponseDto.fromDocument(rule));
  }

  // Create mapping rule
  async create(
    createDto: CreateDataMappingDto,
  ): Promise<DataMappingResponseDto> {
    this.logger.log(`创建映射规则: ${createDto.name}`);

    // 自动推断 apiType（仅当未显式提供时）
    if (!createDto.apiType) {
      try {
        const fields = createDto.sharedDataFieldMappings?.map((m) => m.sourceField) || [];
        const hasRestPattern = fields.some((f) => /secu_quote\[.*\]|basic_info\[.*\]/.test(f));
        createDto.apiType = hasRestPattern ? 'rest' : 'stream';
      } catch {}
    }

    const created = await this.repository.create(createDto);
    this.logger.log(
      `${DATA_MAPPER_SUCCESS_MESSAGES.RULE_CREATED}: ${created.name}`,
    );

    return DataMappingResponseDto.fromDocument(created);
  }

  // Get all active rules
  async findAll(): Promise<DataMappingResponseDto[]> {
    const rules = await this.repository.findAll();
    return rules.map((rule) => DataMappingResponseDto.fromDocument(rule));
  }

  // Get all rules including deactivated ones
  async findAllIncludingDeactivated(): Promise<DataMappingResponseDto[]> {
    const rules = await this.repository.findAllIncludingDeactivated();
    return rules.map((rule) => DataMappingResponseDto.fromDocument(rule));
  }

  // Find rules by provider
  async findByProvider(provider: string): Promise<DataMappingResponseDto[]> {
    const rules = await this.repository.findByProvider(provider);
    return rules.map((rule) => DataMappingResponseDto.fromDocument(rule));
  }

  // Find rules with pagination
  async findPaginated(
    query: DataMappingQueryDto,
  ): Promise<PaginatedDataDto<DataMappingResponseDto>> {
    this.logger.debug(`查找分页映射规则`, sanitizeLogData(query));

    const { items, total } = await this.repository.findPaginated(query);
    const responseItems = items.map((item) =>
      DataMappingResponseDto.fromLeanObject(item),
    );

    return this.paginationService.createPaginatedResponseFromQuery(
      responseItems,
      query,
      total,
    );
  }

  // Find rule by ID
  async findOne(id: string): Promise<DataMappingResponseDto> {
    const rule = await this.repository.findById(id);
    if (!rule) {
      throw new NotFoundException(
        `${DATA_MAPPER_ERROR_MESSAGES.RULE_ID_NOT_FOUND}: ${id}`,
      );
    }
    return DataMappingResponseDto.fromDocument(rule);
  }

  // Update mapping rule
  async update(
    id: string,
    updateDto: UpdateDataMappingDto,
  ): Promise<DataMappingResponseDto> {
    this.logger.log(`更新映射规则: ${id}`);

    const updated = await this.repository.updateById(id, updateDto);
    if (!updated) {
      throw new NotFoundException(
        `${DATA_MAPPER_ERROR_MESSAGES.RULE_ID_NOT_FOUND}: ${id}`,
      );
    }

    this.logger.log(
      `${DATA_MAPPER_SUCCESS_MESSAGES.RULE_UPDATED}: ${updated.name}`,
    );
    return DataMappingResponseDto.fromDocument(updated);
  }

  // Activate mapping rule
  async activate(id: string): Promise<DataMappingResponseDto> {
    const rule = await this.repository.activate(id);
    if (!rule) {
      throw new NotFoundException(
        `${DATA_MAPPER_ERROR_MESSAGES.RULE_ID_NOT_FOUND}: ${id}`,
      );
    }
    this.logger.log(
      `${DATA_MAPPER_SUCCESS_MESSAGES.RULE_ACTIVATED}: ${rule.name}`,
    );
    return DataMappingResponseDto.fromDocument(rule);
  }

  // Deactivate mapping rule
  async deactivate(id: string): Promise<DataMappingResponseDto> {
    const rule = await this.repository.deactivate(id);
    if (!rule) {
      throw new NotFoundException(
        `${DATA_MAPPER_ERROR_MESSAGES.RULE_ID_NOT_FOUND}: ${id}`,
      );
    }
    this.logger.log(
      `${DATA_MAPPER_SUCCESS_MESSAGES.RULE_DEACTIVATED}: ${rule.name}`,
    );
    return DataMappingResponseDto.fromDocument(rule);
  }

  // Delete mapping rule (soft delete)
  async remove(id: string): Promise<DataMappingResponseDto> {
    this.logger.log(`删除映射规则: ${id}`);

    const deleted = await this.repository.deleteById(id);
    if (!deleted) {
      throw new NotFoundException(
        `${DATA_MAPPER_ERROR_MESSAGES.RULE_ID_NOT_FOUND}: ${id}`,
      );
    }

    this.logger.log(
      `${DATA_MAPPER_SUCCESS_MESSAGES.RULE_DELETED}: ${deleted.name}`,
    );
    return DataMappingResponseDto.fromDocument(deleted);
  }

  // Parse JSON structure
  async parseJson(
    parseJsonDto: ParseJsonDto,
  ): Promise<ParsedFieldsResponseDto> {
    let jsonData: Record<string, any>;

    try {
      if (parseJsonDto.jsonData) {
        jsonData = parseJsonDto.jsonData;
      } else if (parseJsonDto.jsonString) {
        jsonData = JSON.parse(parseJsonDto.jsonString);
      } else {
        throw new BadRequestException(
          DATA_MAPPER_ERROR_MESSAGES.JSON_DATA_REQUIRED,
        );
      }
    } catch {
      throw new BadRequestException(
        DATA_MAPPER_ERROR_MESSAGES.INVALID_JSON_FORMAT,
      );
    }

    const fields = this.extractFields(jsonData);
    return {
      fields,
      structure: jsonData,
    } as FieldExtractionResultDto;
  }

  // Extract all fields from JSON object
  private extractFields(
    obj: Record<string, any> | any[],
    prefix = "",
  ): string[] {
    const fields: string[] = [];

    if (typeof obj === "object" && obj !== null) {
      if (Array.isArray(obj)) {
        // For arrays, parse the first item
        if (obj.length > 0) {
          fields.push(...this.extractFields(obj[0], prefix + "[0]"));
        }
      } else {
        // For objects
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const currentPath = prefix ? `${prefix}.${key}` : key;
            fields.push(currentPath);

            if (typeof obj[key] === "object" && obj[key] !== null) {
              fields.push(...this.extractFields(obj[key], currentPath));
            }
          }
        }
      }
    }

    return fields;
  }

  // Get field suggestions
  async getFieldSuggestions(
    fieldSuggestionDto: FieldSuggestionDto,
  ): Promise<FieldSuggestionResponseDto> {
    const suggestions = [];

    if (fieldSuggestionDto.sourceFields && fieldSuggestionDto.targetFields) {
      for (const sourceField of fieldSuggestionDto.sourceFields) {
        const bestMatches = this.findBestMatches(
          sourceField,
          fieldSuggestionDto.targetFields,
        );
        suggestions.push({
          sourceField,
          suggestions: bestMatches,
        });
      }
    }

    return { suggestions };
  }

  // Find best matching fields
  private findBestMatches(
    sourceField: string,
    targetFields: string[],
  ): FieldMatchDto[] {
    const matches = targetFields.map((targetField) => ({
      field: targetField,
      score: StringUtils.calculateSimilarity(sourceField, targetField),
    }));

    return matches
      .filter(
        (match) => match.score > FIELD_SUGGESTION_CONFIG.SIMILARITY_THRESHOLD,
      ) // Only include matches with >30% similarity
      .sort((a, b) => b.score - a.score)
      .slice(0, FIELD_SUGGESTION_CONFIG.MAX_SUGGESTIONS); // Return top 3 matches
  }

  /**
   * Helper to transform an array of items using a mapping rule
   */
  private _transformArray(
    items: Record<string, any>[],
    fullSourceData: Record<string, any>,
    rule: DataMappingResponseDto,
  ): Record<string, any>[] {
    // 🎯 调用新的_transformObject方法，消除重复
    return items.map((item: Record<string, any>) =>
      this._transformObject(item, fullSourceData, rule),
    );
  }

  /**
   * 🎯 新增: 封装单个对象的转换逻辑
   */
  private _transformObject(
    objectToTransform: Record<string, any>,
    fullSourceData: Record<string, any>,
    rule: DataMappingResponseDto,
  ): Record<string, any> {
    // 🎯 使用对象池减少GC压力
    const standardizedObject = this.getObjectFromPool();
    
    // 🔧 增强: 跟踪成功映射的字段数量
    let successfulMappingsCount = 0;
    const totalMappingsCount = rule.sharedDataFieldMappings?.length || 0;
    
    for (const mapping of rule.sharedDataFieldMappings) {
      // 🎯 使用编译优化的路径访问（如果可用）
      const isArrayAccess = (mapping as any)._isArrayAccess !== undefined 
        ? (mapping as any)._isArrayAccess 
        : mapping.sourceField.includes("[");
      
      // Check if source field contains array notation like secu_quote[0].s
      // If so, search in the full source data
      const dataToSearch = isArrayAccess
        ? fullSourceData
        : objectToTransform;
      
      const sourceValue = ObjectUtils.getValueFromPath(
        dataToSearch,
        mapping.sourceField,
      );

      // 🔧 增强调试：记录字段映射详情
      this.logger.debug({
        message: '字段映射详情',
        sourceField: mapping.sourceField,
        targetField: mapping.targetField,
        sourceValue,
        sourceValueType: typeof sourceValue,
        isUndefined: sourceValue === undefined,
        isNull: sourceValue === null,
        willMap: sourceValue !== undefined,
        dataToSearchKeys: Object.keys(dataToSearch || {}),
        dataToSearchSample: JSON.stringify(dataToSearch).substring(0, 200),
        isArrayAccess,
        objectToTransformKeys: Object.keys(objectToTransform || {}),
      });

      // 🔧 新增: 针对 LongPort 流事件的回退路径查找
      let finalSourceValue = sourceValue;
      let fallbackSource: string | undefined = undefined;
      
      if (finalSourceValue === undefined && fullSourceData && typeof fullSourceData === 'object') {
        // 1) 尝试从 _raw.parsedQuoteData 读取（由 LongportStreamContextService 解析生成）
        const parsedFromRaw = ObjectUtils.getValueFromPath(
          fullSourceData._raw?.parsedQuoteData || {},
          mapping.sourceField,
        );
        if (parsedFromRaw !== undefined) {
          finalSourceValue = parsedFromRaw;
          fallbackSource = '_raw.parsedQuoteData';
        }

        // 2) 若仍然 undefined，再尝试从 _raw.originalEvent 直读（少数情况下字段可能直接存在）
        if (finalSourceValue === undefined) {
          const fromOriginalEvent = ObjectUtils.getValueFromPath(
            fullSourceData._raw?.originalEvent || {},
            mapping.sourceField,
          );
          if (fromOriginalEvent !== undefined) {
            finalSourceValue = fromOriginalEvent;
            fallbackSource = '_raw.originalEvent';
          }
        }
      }

      if (finalSourceValue !== undefined) {
        let transformedValue = finalSourceValue;

        // Apply transformation if specified
        if (mapping.transform) {
          transformedValue = this.applyTransform(
            finalSourceValue,
            mapping.transform,
          );
        }

        standardizedObject[mapping.targetField] = transformedValue;
        successfulMappingsCount++;
        
        this.logger.debug({
          message: '✅ 字段映射成功',
          sourceField: mapping.sourceField,
          targetField: mapping.targetField,
          transformedValue,
          fallbackSource,
        });
      } else {
        this.logger.debug({
          message: '⚠️ 字段值为undefined，跳过映射',
          sourceField: mapping.sourceField,
          targetField: mapping.targetField,
        });
      }
    }

    // 🔧 增强: 在对象上附加映射统计信息，用于后续的成功判断
    (standardizedObject as any)._mappingStats = {
      successfulMappings: successfulMappingsCount,
      totalMappings: totalMappingsCount,
      mappingSuccessRate: totalMappingsCount > 0 ? successfulMappingsCount / totalMappingsCount : 0,
    };
    
    return standardizedObject;
  }

  /**
   * 🎯 获取或编译规则（缓存优化）
   */
  private async getOrCompileRule(ruleId: string, provider?: string): Promise<DataMappingResponseDto> {
    if (!this.featureFlags.dataTransformCacheEnabled) {
      // 缓存禁用，直接查询数据库
      const ruleDoc = await this.repository.findById(ruleId);
      if (!ruleDoc) {
        throw new NotFoundException(
          `${DATA_MAPPER_ERROR_MESSAGES.RULE_ID_NOT_FOUND}: ${ruleId}`,
        );
      }
      return DataMappingResponseDto.fromDocument(ruleDoc);
    }

    // 🎯 版本感知的缓存Key（包含provider避免冲突）
    const baseCacheKey = provider ? `rule_${provider}_${ruleId}` : `rule_${ruleId}`;
    
    // 先尝试获取规则文档来确定版本
    const ruleDoc = await this.repository.findById(ruleId);
    if (!ruleDoc) {
      throw new NotFoundException(
        `${DATA_MAPPER_ERROR_MESSAGES.RULE_ID_NOT_FOUND}: ${ruleId}`,
      );
    }

    // 创建版本感知的缓存Key
    const versionedCacheKey = `${baseCacheKey}_${ruleDoc.updatedAt.getTime()}`;
    
    // 检查缓存
    const cached = this.ruleCache.get(versionedCacheKey);
    if (cached) {
      this.ruleCompilationHits++;
      
      // 🎯 记录缓存命中率
      const total = this.ruleCompilationHits + this.ruleCompilationMisses;
      const hitRate = total > 0 ? (this.ruleCompilationHits / total) * 100 : 0;
      Metrics.setGauge(
        this.metricsRegistry,
        'dataMapperCacheHitRate',
        hitRate,
        { cache_type: 'rule_compilation' }
      );
      
      this.logger.debug('规则编译缓存命中', { 
        ruleId, 
        ruleName: ruleDoc.name,
        hitRate: this.getRuleCompilationHitRate()
      });
      return cached;
    }

    // 🎯 并发去重：检查是否已有相同编译在进行
    if (this.pendingCompilations.has(versionedCacheKey)) {
      this.logger.debug('等待并发规则编译完成', { versionedCacheKey });
      return await this.pendingCompilations.get(versionedCacheKey);
    }

    // 缓存未命中，创建编译Promise
    this.ruleCompilationMisses++;
    
    // 🎯 记录缓存未命中率
    const total = this.ruleCompilationHits + this.ruleCompilationMisses;
    const hitRate = total > 0 ? (this.ruleCompilationHits / total) * 100 : 0;
    Metrics.setGauge(
      this.metricsRegistry,
      'dataMapperCacheHitRate',
      hitRate,
      { cache_type: 'rule_compilation' }
    );
    const compilationPromise = this.performRuleCompilation(ruleDoc);
    this.pendingCompilations.set(versionedCacheKey, compilationPromise);
    
    try {
      const compiledRule = await compilationPromise;
      
      // 存入缓存
      this.ruleCache.set(versionedCacheKey, compiledRule);
      
      this.logger.debug('规则编译完成并缓存', {
        ruleId,
        ruleName: compiledRule.name,
        hitRate: this.getRuleCompilationHitRate()
      });
      
      return compiledRule;
    } finally {
      // 清理并发锁
      this.pendingCompilations.delete(versionedCacheKey);
    }
  }

  /**
   * 🎯 执行规则编译（可能包含预处理优化）
   */
  private async performRuleCompilation(ruleDoc: any): Promise<DataMappingResponseDto> {
    const rule = DataMappingResponseDto.fromDocument(ruleDoc);
    
    // 🎯 规则编译优化：预处理字段映射逻辑
    if (this.featureFlags.ruleCompilationEnabled && rule.sharedDataFieldMappings) {
      // 编译字段路径，提升运行时性能
      rule.sharedDataFieldMappings = rule.sharedDataFieldMappings.map(mapping => ({
        ...mapping,
        _compiledSourcePath: mapping.sourceField.split('.'), // 预分割路径
        _isArrayAccess: mapping.sourceField.includes('['), // 预判断数组访问
      }));
    }

    return rule;
  }

  /**
   * Apply mapping rule to transform source data
   */
  async applyMappingRule(
    ruleId: string,
    sourceData: Record<string, any>,
    provider?: string,
  ): Promise<Record<string, any>[]> {
    const startTime = Date.now();

    // 🎯 使用缓存优化的规则获取
    const rule = await this.getOrCompileRule(ruleId, provider);
    
    // 🎯 记录规则应用指标
    const providerLabel = provider || rule.provider || 'unknown';
    Metrics.inc(
      this.metricsRegistry,
      'dataMapperRulesAppliedTotal',
      { 
        rule_type: rule.transDataRuleListType || 'unknown',
        provider: providerLabel,
        success: 'true'
      }
    );

    this.logger.debug(
      `应用映射规则: ${rule.name}`,
      sanitizeLogData({
        ruleId,
        provider: rule.provider,
        transDataRuleListType: rule.transDataRuleListType,
      }),
    );

    let transformedResult: Record<string, any>[];

    // Handle secu_quote or basic_info arrays
    const arrayToProcess = sourceData.secu_quote || sourceData.basic_info;
    
    this.logger.debug({
      message: '🔍 数据映射规则应用开始',
      ruleId: rule.id,
      ruleName: rule.name,
      sourceDataKeys: Object.keys(sourceData || {}),
      sourceDataSample: Object.fromEntries(
        Object.entries(sourceData || {}).slice(0, 5).map(([key, value]) => [
          key,
          typeof value === 'object' ? `[${typeof value}]` : value
        ])
      ),
      hasSecuQuote: !!sourceData.secu_quote,
      hasBasicInfo: !!sourceData.basic_info,
      willUseArrayProcessing: Array.isArray(arrayToProcess),
      mappingsCount: rule.sharedDataFieldMappings?.length || 0,
      mappingFields: rule.sharedDataFieldMappings?.map(m => ({
        source: m.sourceField,
        target: m.targetField,
        sourceValue: sourceData[m.sourceField],
        sourceValueType: typeof sourceData[m.sourceField],
        isUndefined: sourceData[m.sourceField] === undefined,
      })) || [],
    });
    
    if (Array.isArray(arrayToProcess)) {
      transformedResult = this._transformArray(
        arrayToProcess,
        sourceData,
        rule,
      );
    } else {
      // Handle single object
      // 🎯 调用新的_transformObject方法，消除重复
      const standardizedObject = this._transformObject(
        sourceData,
        sourceData,
        rule,
      );
      transformedResult = [standardizedObject];
    }
    
    // 🔧 增强: 计算整体映射成功率和统计信息
    let overallSuccessfulMappings = 0;
    let overallTotalMappings = 0;
    let emptyResultsCount = 0;
    
    for (const result of transformedResult || []) {
      const stats = (result as any)._mappingStats;
      if (stats) {
        overallSuccessfulMappings += stats.successfulMappings || 0;
        overallTotalMappings += stats.totalMappings || 0;
        
        // 检查是否为空结果（除了统计信息外没有其他有效字段）
        const effectiveKeys = Object.keys(result).filter(key => key !== '_mappingStats' && result[key] !== undefined);
        if (effectiveKeys.length === 0) {
          emptyResultsCount++;
        }
      }
    }
    
    const overallMappingSuccessRate = overallTotalMappings > 0 ? overallSuccessfulMappings / overallTotalMappings : 0;
    const isSuccessfulMapping = overallMappingSuccessRate > 0.5 && emptyResultsCount < (transformedResult?.length || 0);
    const logLevel = isSuccessfulMapping ? 'debug' : 'warn';
    const logMessage = isSuccessfulMapping ? '✅ 数据映射规则应用完成' : '⚠️ 数据映射规则应用异常 - 大量字段映射失败';
    
    this.logger[logLevel]({
      message: logMessage,
      ruleId: rule.id,
      ruleName: rule.name,
      transformedResultLength: transformedResult?.length || 0,
      transformedResultSample: transformedResult?.length > 0 ? Object.keys(transformedResult[0] || {}).filter(key => key !== '_mappingStats') : [],
      firstObjectNonUndefinedKeys: transformedResult?.[0] ? Object.entries(transformedResult[0] || {})
        .filter(([key, value]) => key !== '_mappingStats' && value !== undefined)
        .map(([key, value]) => `${key}:${typeof value}`) : [],
      firstObjectValues: transformedResult?.[0] ? Object.fromEntries(
        Object.entries(transformedResult[0] || {}).filter(([key]) => key !== '_mappingStats').slice(0, 5)
      ) : {},
      mappingStats: {
        overallSuccessfulMappings,
        overallTotalMappings,
        overallMappingSuccessRate: (overallMappingSuccessRate * 100).toFixed(1) + '%',
        emptyResultsCount,
        isSuccessfulMapping,
      }
    });

    // 🎯 性能监控
    const processingTime = Date.now() - startTime;
    const performanceLogLevel =
      processingTime > DATA_MAPPER_PERFORMANCE_THRESHOLDS.SLOW_MAPPING_MS
        ? "warn"
        : "debug";
    this.logger[performanceLogLevel](
      `映射规则应用完成`,
      sanitizeLogData({
        ruleId,
        ruleName: rule.name,
        processingTime,
        isSlowMapping:
          processingTime > DATA_MAPPER_PERFORMANCE_THRESHOLDS.SLOW_MAPPING_MS,
      }),
    );

    // 🎯 记录处理时间指标
    const complexity = transformedResult.length > 100 ? 'high' : 
                      transformedResult.length > 10 ? 'medium' : 'low';
    
    Metrics.observe(
      this.metricsRegistry,
      'dataMapperTransformationDuration',
      processingTime,
      { 
        rule_type: rule.transDataRuleListType || 'unknown',
        complexity
      }
    );

    if (processingTime > DATA_MAPPER_PERFORMANCE_THRESHOLDS.SLOW_MAPPING_MS) {
      this.logger.warn(
        `${DATA_MAPPER_WARNING_MESSAGES.LARGE_DATASET_WARNING}: ${processingTime}ms`,
      );
    }

    // 🔧 增强: 清理内部统计信息，防止泄露到外部API
    const cleanedResult = transformedResult.map(result => {
      const cleanedObject = { ...result };
      delete (cleanedObject as any)._mappingStats;
      return cleanedObject;
    });

    return cleanedResult;
  }

  /**
   * Apply data transformation
   */
  private applyTransform(
    value: any,
    transform: TransformationInputDto["transform"],
  ): any {
    try {
      const numericValue = Number(value);

      switch (transform.type) {
        case TRANSFORMATION_TYPES.MULTIPLY:
          if (isNaN(numericValue)) {
            throw new Error("Invalid number for MULTIPLY");
          }
          return (
            numericValue *
            Number(transform.value || TRANSFORMATION_DEFAULTS.MULTIPLY_VALUE)
          );
        case TRANSFORMATION_TYPES.DIVIDE:
          if (isNaN(numericValue)) {
            throw new Error("Invalid number for DIVIDE");
          }
          return (
            numericValue /
            Number(transform.value || TRANSFORMATION_DEFAULTS.DIVIDE_VALUE)
          );
        case TRANSFORMATION_TYPES.ADD:
          if (isNaN(numericValue)) {
            throw new Error("Invalid number for ADD");
          }
          return (
            numericValue +
            Number(transform.value || TRANSFORMATION_DEFAULTS.ADD_VALUE)
          );
        case TRANSFORMATION_TYPES.SUBTRACT:
          if (isNaN(numericValue)) {
            throw new Error("Invalid number for SUBTRACT");
          }
          return (
            numericValue -
            Number(transform.value || TRANSFORMATION_DEFAULTS.SUBTRACT_VALUE)
          );
        case TRANSFORMATION_TYPES.FORMAT:
          const template = String(
            transform.value || TRANSFORMATION_DEFAULTS.FORMAT_TEMPLATE,
          );
          // 兼容 {value} 和 %v 两种占位符
          return template.replace(/\{value\}|%v/g, String(value));
        case TRANSFORMATION_TYPES.CUSTOM:
          // Custom transformations would require dynamic evaluation
          if (transform.customFunction) {
            // For security reasons, custom functions are not executed
            this.logger.warn(
              DATA_MAPPER_WARNING_MESSAGES.CUSTOM_TRANSFORMATIONS_NOT_SUPPORTED,
            );
          }
          return value;
        default:
          return value;
      }
    } catch (error) {
      // 🎯 修正: 捕获所有原生错误
      this.logger.error(
        DATA_MAPPER_ERROR_MESSAGES.TRANSFORMATION_FAILED,
        sanitizeLogData({
          transform,
          value,
          error: error.message,
        }),
      );
      // 🎯 修正: 抛出标准异常，而不是静默失败
      throw new BadRequestException(
        `${DATA_MAPPER_ERROR_MESSAGES.TRANSFORMATION_FAILED}: on value '${value}' with transform ${transform.type}`,
      );
    }
  }

  // Test mapping rule
  async testMappingRule(
    testDto: TestMappingDto,
  ): Promise<DataMappingTestResultDto> {
    const rule = await this.findOne(testDto.ruleId);

    try {
      const transformedData = await this.applyMappingRule(
        testDto.ruleId,
        testDto.testData,
      );

      return {
        ruleId: testDto.ruleId,
        ruleName: rule.name,
        provider: rule.provider,
        transDataRuleListType: rule.transDataRuleListType,
        originalData: testDto.testData,
        transformedData,
        success: true,
        message: DATA_MAPPER_SUCCESS_MESSAGES.MAPPING_TEST_SUCCESSFUL,
      } as DataMappingTestResultDto;
    } catch (error) {
      // 🎯 记录验证错误
      Metrics.inc(
        this.metricsRegistry,
        'dataMapperValidationErrors',
        { 
          error_type: 'mapping_test_failed',
          field: 'rule_application'
        }
      );
      
      // 🎯 记录失败的规则应用
      const providerLabel = rule.provider || 'unknown';
      Metrics.inc(
        this.metricsRegistry,
        'dataMapperRulesAppliedTotal',
        { 
          rule_type: rule.transDataRuleListType || 'unknown',
          provider: providerLabel,
          success: 'false'
        }
      );
      
      this.logger.error(
        DATA_MAPPER_ERROR_MESSAGES.MAPPING_TEST_FAILED,
        sanitizeLogData({
          ruleId: testDto.ruleId,
          error: error.message,
        }),
      );

      throw new BadRequestException(
        `${DATA_MAPPER_ERROR_MESSAGES.MAPPING_TEST_FAILED}: ${error.message}`,
      );
    }
  }

  // Get statistics
  async getStatistics(): Promise<DataMappingStatisticsDto> {
    const [totalRules, activeRules, providers, transDataRuleListTypesNum] =
      await Promise.all([
        this.repository
          .findAllIncludingDeactivated()
          .then((rules) => rules.length),
        this.repository.findAll().then((rules) => rules.length),
        this.repository.getProviders(),
        this.repository.getRuleListTypes(),
      ]);

    return {
      totalRules,
      activeRules,
      inactiveRules: totalRules - activeRules,
      providers: providers.length,
      transDataRuleListTypesNum: transDataRuleListTypesNum.length,
      providerList: providers,
      transDataRuleListTypeList: transDataRuleListTypesNum,
    } as DataMappingStatisticsDto;
  }

  // Find best matching rule by provider and rule type
  async findBestMatchingRule(
    provider: string,
    transDataRuleListType: string,
    apiType?: string,
  ): Promise<DataMappingResponseDto | null> {
    const rule = await this.repository.findBestMatchingRule(
      provider,
      transDataRuleListType,
      apiType,
    );
    return rule ? DataMappingResponseDto.fromDocument(rule) : null;
  }

  // Get preset field definitions
  async getPresets(): Promise<any> {
    const { PRESET_FIELD_DEFINITIONS } = await import('@common/config/auto-init.config');
    
    this.logger.log("Retrieving preset field definitions");
    
    return {
      stockQuote: PRESET_FIELD_DEFINITIONS.stockQuote,
      stockBasicInfo: PRESET_FIELD_DEFINITIONS.stockBasicInfo,
      availablePresets: Object.keys(PRESET_FIELD_DEFINITIONS),
      totalFields: {
        stockQuote: PRESET_FIELD_DEFINITIONS.stockQuote.fields.length,
        stockBasicInfo: PRESET_FIELD_DEFINITIONS.stockBasicInfo.fields.length,
      }
    };
  }

  // 🎯 对象池优化方法

  /**
   * 从对象池获取对象（减少GC压力）
   */
  private getObjectFromPool(): Record<string, any> {
    if (!this.featureFlags.objectPoolEnabled) {
      return {};
    }

    const obj = this.objectPool.pop();
    if (obj) {
      // 清理对象内容
      for (const key in obj) {
        delete obj[key];
      }
      return obj;
    }
    
    return {};
  }

  /**
   * 将对象回收到对象池
   */
  public returnObjectToPool(obj: Record<string, any>): void {
    if (!this.featureFlags.objectPoolEnabled) {
      return;
    }

    if (this.objectPool.length < this.maxPoolSize) {
      // 清理对象后放回池中
      for (const key in obj) {
        delete obj[key];
      }
      this.objectPool.push(obj);
    }
  }

  /**
   * 获取规则编译缓存命中率
   */
  private getRuleCompilationHitRate(): string {
    const total = this.ruleCompilationHits + this.ruleCompilationMisses;
    if (total === 0) return '0%';
    return `${((this.ruleCompilationHits / total) * 100).toFixed(1)}%`;
  }

  /**
   * 清理所有缓存
   */
  public clearCache(): void {
    this.ruleCache.clear();
    this.pendingCompilations.clear();
    this.ruleCompilationHits = 0;
    this.ruleCompilationMisses = 0;
    this.objectPool.length = 0; // 清理对象池
    
    this.logger.log('Data-Mapper 缓存已清理');
  }

  /**
   * 清理特定提供商的缓存
   */
  public clearProviderCache(provider: string): void {
    if (!this.featureFlags.dataTransformCacheEnabled) {
      return;
    }

    // 清理规则缓存
    const keysToDelete: string[] = [];
    for (const [key] of this.ruleCache.entries()) {
      if (key.includes(`_${provider}_`)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.ruleCache.delete(key);
    }

    this.logger.log(`已清理 ${provider} 提供商的规则缓存`, { deletedKeys: keysToDelete.length });
  }

}
