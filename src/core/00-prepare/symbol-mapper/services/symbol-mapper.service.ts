import {
  Injectable,
  ConflictException,
  NotFoundException,
  OnModuleInit,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";

import { LRUCache } from 'lru-cache';
import { createLogger, sanitizeLogData } from "@common/config/logger.config";
import { PaginatedDataDto } from "@common/modules/pagination/dto/paginated-data";
import { PaginationService } from "@common/modules/pagination/services/pagination.service";
import { FeatureFlags } from "@common/config/feature-flags.config";
import { MetricsRegistryService } from "../../../../monitoring/metrics/services/metrics-registry.service";
import { Metrics } from "../../../../monitoring/metrics/metrics-helper";
import { SymbolMapperCacheService } from "../../../05-caching/symbol-mapper-cache/services/symbol-mapper-cache.service";

import {
  SYMBOL_MAPPER_ERROR_MESSAGES,
  SYMBOL_MAPPER_WARNING_MESSAGES,
  SYMBOL_MAPPER_SUCCESS_MESSAGES,
  SYMBOL_MAPPER_PERFORMANCE_CONFIG,
  SYMBOL_MAPPER_OPERATIONS,
} from "../constants/symbol-mapper.constants";
import { CreateSymbolMappingDto } from '../dto/create-symbol-mapping.dto';
import {
  SymbolMappingRuleContextDto,
} from "../dto/symbol-mapper-internal.dto";
import { SymbolMappingQueryDto } from '../dto/symbol-mapping-query.dto';
import { SymbolMappingResponseDto } from '../dto/symbol-mapping-response.dto';
import {
  UpdateSymbolMappingDto,
  TransformSymbolsResponseDto,
  AddSymbolMappingRuleDto,
  UpdateSymbolMappingRuleDto,
} from '../dto/update-symbol-mapping.dto';
import { ISymbolMapper, ISymbolMappingRule, ISymbolMappingRuleList } from '../interfaces/symbol-mapping.interface';
import { SymbolMappingRepository } from '../repositories/symbol-mapping.repository';

// 🎯 复用 common 模块的日志配置
// 🎯 复用 common 模块的股票代码映射常量

import { SymbolMappingRule, SymbolMappingRuleDocumentType } from '../schemas/symbol-mapping-rule.schema';

/**
 * 股票代码映射服务
 *
 * 负责处理股票代码在不同数据源之间的映射转换，包括：
 * 1. 股票代码格式转换和映射
 * 2. 数据源映射配置管理
 * 3. 映射规则的增删改查
 * 4. 批量代码转换和处理
 * 5. 映射性能监控和统计
 */
@Injectable()
export class SymbolMapperService implements ISymbolMapper, OnModuleInit {
  // 🎯 使用 common 模块的日志配置
  private readonly logger = createLogger(SymbolMapperService.name);

  // 🎯 统一缓存实例（规则管理缓存）
  private unifiedCache: LRUCache<string, any>;
  
  // 旧本地缓存命中统计字段已废弃，全部交由 Prometheus 指标处理

  constructor(
    private readonly repository: SymbolMappingRepository,
    private readonly paginationService: PaginationService,
    private readonly featureFlags: FeatureFlags,
    private readonly metricsRegistry: MetricsRegistryService,
    private readonly cacheService?: SymbolMapperCacheService, // 可选注入，向后兼容
  ) {
    // 🎯 初始化统一缓存（向后兼容）
    this.unifiedCache = new LRUCache<string, any>({ 
      max: this.featureFlags.symbolCacheMaxSize,
      ttl: this.featureFlags.symbolCacheTtl,
    });
  }

  /**
   * 🎯 模块初始化：设置 Change Stream 监听
   */
  async onModuleInit() {
    if (!this.featureFlags.symbolMappingCacheEnabled) {
      this.logger.log('符号映射缓存已禁用，跳过初始化');
      return;
    }

    try {
      // 🎯 MongoDB Change Stream 监听实现
      await this.setupChangeStreamMonitoring();
      this.logger.log('MongoDB Change Stream 监听已启用');
    } catch (error) {
      this.logger.warn('ChangeStream 不可用，启用轮询模式', { error: error.message });
      
      // 🎯 降级策略：定时轮询检查规则版本
      setInterval(() => this.checkRuleVersions(), 5 * 60 * 1000);
    }
  }

  /**
   * 🎯 设置 MongoDB Change Stream 监听
   */
  private async setupChangeStreamMonitoring(): Promise<void> {
    try {
      // 监听符号映射规则的变化
      const changeStream = this.repository.watchChanges();
      
      changeStream.on('change', (change) => {
        this.logger.debug('检测到符号映射规则变化', { 
          operationType: change.operationType,
          documentKey: change.documentKey 
        });
        
        // 清除相关缓存
        this.invalidateCacheForChangedRule(change);
      });

      changeStream.on('error', (error) => {
        this.logger.error('Change Stream 错误', { error: error.message });
        
        // 启用降级策略
        setTimeout(() => this.checkRuleVersions(), 1000);
      });

      this.logger.log('Change Stream 监听器已启动');
    } catch (error) {
      this.logger.warn('无法启动 Change Stream，使用轮询模式', { error: error.message });
      throw error;
    }
  }

  /**
   * 🎯 根据变化的规则清除缓存
   */
  private invalidateCacheForChangedRule(change: any): void {
    try {
      const { operationType, documentKey, fullDocument } = change;
      
      if (operationType === 'delete') {
        // 删除操作：清除相关缓存键
        this.clearCacheByDocumentKey(documentKey);
      } else if (operationType === 'update' || operationType === 'insert') {
        // 更新或插入操作：清除相关缓存并记录新版本
        this.clearCacheByDocument(fullDocument || documentKey);
      }
      
      this.logger.debug('缓存失效处理完成', { operationType, documentKey });
    } catch (error) {
      this.logger.error('缓存失效处理失败', { error: error.message });
    }
  }

  /**
   * 🎯 根据文档键清除缓存
   */
  private clearCacheByDocumentKey(documentKey: any): void {
    // 查找所有包含该文档的缓存键
    const cacheKeys = Array.from(this.unifiedCache.keys());
    const relatedKeys = cacheKeys.filter(key => 
      key.includes(documentKey._id?.toString() || '')
    );
    
    for (const key of relatedKeys) {
      this.unifiedCache.delete(key);
    }
    
    this.logger.debug(`清除了 ${relatedKeys.length} 个相关缓存键`);
  }

  /**
   * 🎯 根据文档内容清除缓存
   */
  private clearCacheByDocument(document: any): void {
    if (!document || !document.dataSourceName) {
      return;
    }
    
    // 根据数据源名称清除相关缓存
    const cacheKeys = Array.from(this.unifiedCache.keys());
    const relatedKeys = cacheKeys.filter(key => 
      key.includes(`:${document.dataSourceName}:`)
    );
    
    for (const key of relatedKeys) {
      this.unifiedCache.delete(key);
    }
    
    this.logger.debug(`清除了数据源 ${document.dataSourceName} 的 ${relatedKeys.length} 个缓存键`);
  }

  // ===== 🎯 核心规则管理功能 =====

  /**
   * 创建数据源映射配置
   *
   * @param createDto 创建映射配置DTO
   * @returns 创建的映射配置响应DTO
   */
  async createDataSourceMapping(
    createDto: CreateSymbolMappingDto,
  ): Promise<SymbolMappingResponseDto> {
    this.logger.log(
      `开始创建数据源映射配置`,
      sanitizeLogData({
        dataSourceName: createDto.dataSourceName,
        rulesCount: createDto.SymbolMappingRule?.length || 0,
        operation: "createDataSourceMapping",
      }),
    );

    try {
      // 检查数据源是否已存在
      const exists = await this.repository.exists(createDto.dataSourceName);
      if (exists) {
        throw new ConflictException(
          SYMBOL_MAPPER_ERROR_MESSAGES.MAPPING_CONFIG_EXISTS.replace(
            "{dataSourceName}",
            createDto.dataSourceName,
          ),
        );
      }

      const created = await this.repository.create(createDto);

      this.logger.log(
        SYMBOL_MAPPER_SUCCESS_MESSAGES.MAPPING_CONFIG_CREATED,
        sanitizeLogData({
          dataSourceName: created.dataSourceName,
          id: created._id || created.id,
          rulesCount: created.SymbolMappingRule.length,
          operation: "createDataSourceMapping",
        }),
      );

      return SymbolMappingResponseDto.fromDocument(created as SymbolMappingRuleDocumentType);
    } catch (error) {
      this.logger.error(
        `数据源映射配置创建失败`,
        sanitizeLogData({
          dataSourceName: createDto.dataSourceName,
          error: error.message,
          operation: "createDataSourceMapping",
        }),
      );
      throw error;
    }
  }

  /**
   * 实现接口方法 - 保存映射规则（创建新的数据源映射）
   *
   * @param rule 映射规则对象
   */
  async saveMapping(rule: ISymbolMappingRuleList): Promise<void> {
    this.logger.debug(
      `保存映射规则`,
      sanitizeLogData({
        dataSourceName: rule.dataSourceName,
        operation: "saveMapping",
      }),
    );

    try {
      await this.createDataSourceMapping(rule as CreateSymbolMappingDto);
    } catch (error) {
      this.logger.error(
        `保存映射规则失败`,
        sanitizeLogData({
          error: error.message,
          operation: "saveMapping",
        }),
      );
      throw error;
    }
  }

  /**
   * 实现接口方法 - 获取指定提供商的映射规则
   *
   * @param provider 数据提供商名称
   * @returns 映射规则数组
   */
  async getSymbolMappingRule(provider: string): Promise<ISymbolMappingRule[]> {
    this.logger.debug(
      `获取提供商映射规则`,
      sanitizeLogData({
        provider,
        operation: "getSymbolMappingRule",
      }),
    );

    try {
      const mapping = await this.repository.findByDataSource(provider);

      if (!mapping) {
        this.logger.debug(
          `未找到提供商映射规则`,
          sanitizeLogData({
            provider,
            operation: "getSymbolMappingRule",
          }),
        );
        return [];
      }

      this.logger.debug(
        `映射规则获取完成`,
        sanitizeLogData({
          provider,
          rulesCount: mapping.SymbolMappingRule?.length || 0,
          operation: "getSymbolMappingRule",
        }),
      );

      // 直接返回映射规则数组，符合方法名期望
      return mapping.SymbolMappingRule || [] as ISymbolMappingRule[];
    } catch (error) {
      this.logger.error(
        `获取映射规则失败`,
        sanitizeLogData({
          provider,
          error: error.message,
          operation: "getSymbolMappingRule",
        }),
      );
      throw error;
    }
  }

  /**
   * 根据ID获取映射配置
   *
   * @param id 映射配置ID
   * @returns 映射配置响应DTO
   */
  async getSymbolMappingById(id: string): Promise<SymbolMappingResponseDto> {
    this.logger.debug(
      `根据ID获取映射配置`,
      sanitizeLogData({
        id,
        operation: "getSymbolMappingById",
      }),
    );

    try {
      const mapping = await this.repository.findById(id);
      if (!mapping) {
        throw new NotFoundException(
          SYMBOL_MAPPER_ERROR_MESSAGES.MAPPING_CONFIG_NOT_FOUND.replace(
            "{id}",
            id,
          ),
        );
      }

      this.logger.debug(
        `映射配置获取成功`,
        sanitizeLogData({
          id,
          dataSourceName: mapping.dataSourceName,
          rulesCount: mapping.SymbolMappingRule.length,
          operation: "getSymbolMappingById",
        }),
      );

      return SymbolMappingResponseDto.fromDocument(mapping as SymbolMappingRuleDocumentType);
    } catch (error) {
      this.logger.error(
        `获取映射配置失败`,
        sanitizeLogData({
          id,
          error: error.message,
          operation: "getSymbolMappingById",
        }),
      );
      throw error;
    }
  }

  /**
   * 根据数据源名称获取映射配置
   *
   * @param dataSourceName 数据源名称
   * @returns 映射配置响应DTO
   */
  async getSymbolMappingByDataSource(
    dataSourceName: string,
  ): Promise<SymbolMappingResponseDto> {
    this.logger.debug(
      `根据数据源名称获取映射配置`,
      sanitizeLogData({
        dataSourceName,
        operation: "getSymbolMappingByDataSource",
      }),
    );

    try {
      const mapping = await this.repository.findByDataSource(dataSourceName);
      if (!mapping) {
        throw new NotFoundException(
          SYMBOL_MAPPER_ERROR_MESSAGES.DATA_SOURCE_MAPPING_NOT_FOUND.replace(
            "{dataSourceName}",
            dataSourceName,
          ),
        );
      }

      this.logger.debug(
        `数据源映射配置获取成功`,
        sanitizeLogData({
          dataSourceName,
          id: mapping._id || mapping.id,
          rulesCount: mapping.SymbolMappingRule.length,
          operation: "getSymbolMappingByDataSource",
        }),
      );

      return SymbolMappingResponseDto.fromDocument(mapping as SymbolMappingRuleDocumentType);
    } catch (error) {
      this.logger.error(
        `获取数据源映射配置失败`,
        sanitizeLogData({
          dataSourceName,
          error: error.message,
          operation: "getSymbolMappingByDataSource",
        }),
      );
      throw error;
    }
  }

  /**
   * 分页查询映射配置 - 使用统一的分页响应格式
   *
   * @param query 查询参数DTO
   * @returns 统一分页响应DTO
   */
  async getSymbolMappingsPaginated(
    query: SymbolMappingQueryDto,
  ): Promise<PaginatedDataDto<SymbolMappingResponseDto>> {
    this.logger.debug(
      `分页查询数据源映射配置`,
      sanitizeLogData({
        page: query.page,
        limit: query.limit,
        dataSourceName: query.dataSourceName,
        operation: "getSymbolMappingsPaginated",
      }),
    );

    try {
      const { items, total } = await this.repository.findPaginated(query);
      const responseItems = items.map((item) =>
        SymbolMappingResponseDto.fromLeanObject(item),
      );

      return this.paginationService.createPaginatedResponseFromQuery(
        responseItems,
        query,
        total,
      );
    } catch (error) {
      this.logger.error(
        `分页查询映射配置失败`,
        sanitizeLogData({
          query: query,
          error: error.message,
          operation: "getSymbolMappingsPaginated",
        }),
      );
      throw error;
    }
  }

  /**
   * 更新映射配置
   *
   * @param id 映射配置ID
   * @param updateDto 更新配置DTO
   * @returns 更新后的映射配置响应DTO
   */
  async updateSymbolMapping(
    id: string,
    updateDto: UpdateSymbolMappingDto,
  ): Promise<SymbolMappingResponseDto> {
    this.logger.log(
      `开始更新数据源映射配置`,
      sanitizeLogData({
        id,
        operation: "updateSymbolMapping",
      }),
    );

    try {
      const updated = await this.repository.updateById(id, updateDto);
      if (!updated) {
        throw new NotFoundException(
          SYMBOL_MAPPER_ERROR_MESSAGES.MAPPING_CONFIG_NOT_FOUND.replace(
            "{id}",
            id,
          ),
        );
      }

      this.logger.log(
        SYMBOL_MAPPER_SUCCESS_MESSAGES.MAPPING_CONFIG_UPDATED,
        sanitizeLogData({
          id,
          dataSourceName: updated.dataSourceName,
          rulesCount: updated.SymbolMappingRule.length,
          operation: "updateSymbolMapping",
        }),
      );

      return SymbolMappingResponseDto.fromDocument(updated as SymbolMappingRuleDocumentType);
    } catch (error) {
      this.logger.error(
        `映射配置更新失败`,
        sanitizeLogData({
          id,
          error: error.message,
          operation: "updateSymbolMapping",
        }),
      );
      throw error;
    }
  }

  /**
   * 删除映射配置
   *
   * @param id 映射配置ID
   * @returns 删除的映射配置响应DTO
   */
  async deleteSymbolMapping(id: string): Promise<SymbolMappingResponseDto> {
    this.logger.log(`开始删除数据源映射配置`, {
      id,
      operation: "deleteSymbolMapping",
    });

    try {
      const deleted = await this.repository.deleteById(id);
      if (!deleted) {
        throw new NotFoundException(
          SYMBOL_MAPPER_ERROR_MESSAGES.MAPPING_CONFIG_NOT_FOUND.replace(
            "{id}",
            id,
          ),
        );
      }

      this.logger.log(SYMBOL_MAPPER_SUCCESS_MESSAGES.MAPPING_CONFIG_DELETED, {
        id,
        dataSourceName: deleted.dataSourceName,
        operation: "deleteSymbolMapping",
      });

      return SymbolMappingResponseDto.fromDocument(deleted as SymbolMappingRuleDocumentType);
    } catch (error) {
      this.logger.error(`映射配置删除失败`, {
        id,
        error: error.message,
        operation: "deleteSymbolMapping",
      });
      throw error;
    }
  }

  /**
   * 批量转换股票代码
   *
   * @param dataSourceName 数据源名称
   * @param standardSymbols 输入股票代码列表
   * @returns 转换响应DTO
   */
  async transformSymbols(
    dataSourceName: string,
    standardSymbols: string[],
  ): Promise<TransformSymbolsResponseDto> {
    const operation = SYMBOL_MAPPER_OPERATIONS.TRANSFORM_BY_NAME;
    const ruleFetcher = () =>
      this.repository.findAllMappingsForSymbols(dataSourceName, standardSymbols);

    return this._executeSymbolTransformation(
      standardSymbols,
      { dataSourceName, operation },
      ruleFetcher,
    );
  }

  /**
   * 通过映射配置ID批量转换股票代码
   *
   * @param mappingInSymbolId 映射配置ID
   * @param standardSymbols 输入股票代码列表
   * @returns 转换响应DTO
   */
  async transformSymbolsById(
    mappingInSymbolId: string,
    standardSymbols: string[],
  ): Promise<TransformSymbolsResponseDto> {
    const operation = SYMBOL_MAPPER_OPERATIONS.TRANSFORM_BY_ID;

    // 🎯 规则获取逻辑现在移交给 _executeSymbolTransformation 处理
    const ruleFetcher = async () => {
      const mappingDoc = await this.repository.findById(mappingInSymbolId);
      if (!mappingDoc || !mappingDoc.isActive) {
        throw new NotFoundException(
          SYMBOL_MAPPER_ERROR_MESSAGES.MAPPING_CONFIG_INACTIVE.replace(
            "{mappingId}",
            mappingInSymbolId,
          ),
        );
      }
      return {
        rules: mappingDoc.SymbolMappingRule.filter(
          (rule) =>
            standardSymbols.includes(rule.standardSymbol) && rule.isActive !== false,
        ),
        dataSourceName: mappingDoc.dataSourceName,
      };
    };

    return this._executeSymbolTransformation(
      standardSymbols,
      { mappingInSymbolId, operation },
      ruleFetcher,
    );
  }

  /**
   * 获取转换后的代码列表（用于数据提供商调用）
   *
   * @param dataSourceName 数据源名称
   * @param standardSymbols 输入股票代码列表
   * @returns 转换后的股票代码列表
   */
  async getTransformedSymbolList(
    dataSourceName: string,
    standardSymbols: string[],
  ): Promise<string[]> {
    this.logger.debug(`获取转换后的代码列表`, {
      dataSourceName,
      symbolsCount: standardSymbols.length,
      operation: "getTransformedSymbolList",
    });

    try {
      const result = await this.transformSymbols(dataSourceName, standardSymbols);
      return standardSymbols.map((symbol) => result.transformedSymbols[symbol]);
    } catch (error) {
      this.logger.error(`获取转换后代码列表失败`, {
        dataSourceName,
        error: error.message,
        operation: "getTransformedSymbolList",
      });
      throw error;
    }
  }

  /**
   * 获取所有数据源列表
   *
   * @returns 数据源名称列表
   */
  async getDataSources(): Promise<string[]> {
    this.logger.debug(`获取所有数据源列表`, {
      operation: "getDataSources",
    });

    try {
      const dataSources = await this.repository.getDataSources();

      this.logger.debug(`数据源列表获取完成`, {
        count: dataSources.length,
        operation: "getDataSources",
      });

      return dataSources;
    } catch (error) {
      this.logger.error(`获取数据源列表失败`, {
        error: error.message,
        operation: "getDataSources",
      });
      throw error;
    }
  }

  /**
   * 获取所有市场列表
   *
   * @returns 市场代码列表
   */
  async getMarkets(): Promise<string[]> {
    this.logger.debug(`获取所有市场列表`, {
      operation: "getMarkets",
    });

    try {
      const markets = await this.repository.getMarkets();

      this.logger.debug(`市场列表获取完成`, {
        count: markets.length,
        operation: "getMarkets",
      });

      return markets;
    } catch (error) {
      this.logger.error(`获取市场列表失败`, {
        error: error.message,
        operation: "getMarkets",
      });
      throw error;
    }
  }

  /**
   * 获取所有股票类型列表
   *
   * @returns 股票类型列表
   */
  async getSymbolTypes(): Promise<string[]> {
    this.logger.debug(`获取所有股票类型列表`, {
      operation: "getSymbolTypes",
    });

    try {
      const symbolTypes = await this.repository.getSymbolTypes();

      this.logger.debug(`股票类型列表获取完成`, {
        count: symbolTypes.length,
        operation: "getSymbolTypes",
      });

      return symbolTypes;
    } catch (error) {
      this.logger.error(`获取股票类型列表失败`, {
        error: error.message,
        operation: "getSymbolTypes",
      });
      throw error;
    }
  }

  /**
   * 按数据源删除所有映射
   *
   * @param dataSourceName 数据源名称
   * @returns 删除结果统计
   */
  async deleteSymbolMappingsByDataSource(
    dataSourceName: string,
  ): Promise<{ deletedCount: number }> {
    this.logger.log(`开始按数据源删除映射`, {
      dataSourceName,
      operation: "deleteSymbolMappingsByDataSource",
    });

    try {
      const result = await this.repository.deleteByDataSource(dataSourceName);

      this.logger.log(
        `按数据源删除映射完成`,
        sanitizeLogData({
          dataSourceName,
          deletedCount: result.deletedCount,
          operation: "deleteSymbolMappingsByDataSource",
        }),
      );

      return result;
    } catch (error) {
      this.logger.error(
        `按数据源删除映射失败`,
        sanitizeLogData({
          dataSourceName,
          error: error.message,
          operation: "deleteSymbolMappingsByDataSource",
        }),
      );
      throw error;
    }
  }

  /**
   * 添加映射规则到现有数据源
   *
   * @param addDto 添加映射规则DTO
   * @returns 更新后的映射配置响应DTO
   */
  async addSymbolMappingRule(
    addDto: AddSymbolMappingRuleDto,
  ): Promise<SymbolMappingResponseDto> {
    this.logger.log(
      `开始添加映射规则`,
      sanitizeLogData({
        dataSourceName: addDto.dataSourceName,
        standardSymbol: addDto.symbolMappingRule.standardSymbol,
        sdkSymbol: addDto.symbolMappingRule.sdkSymbol,
        operation: "addSymbolMappingRule",
      }),
    );

    try {
      const updated = await this.repository.addSymbolMappingRule(
        addDto.dataSourceName,
        addDto.symbolMappingRule,
      );

      if (!updated) {
        throw new NotFoundException(
          SYMBOL_MAPPER_ERROR_MESSAGES.DATA_SOURCE_NOT_FOUND.replace(
            "{dataSourceName}",
            addDto.dataSourceName,
          ),
        );
      }

      this.logger.log(
        `映射规则添加成功`,
        sanitizeLogData({
          dataSourceName: addDto.dataSourceName,
          totalRules: updated.SymbolMappingRule.length,
          operation: "addSymbolMappingRule",
        }),
      );

      return SymbolMappingResponseDto.fromDocument(updated as SymbolMappingRuleDocumentType);
    } catch (error) {
      this.logger.error(
        `添加映射规则失败`,
        sanitizeLogData({
          dataSourceName: addDto.dataSourceName,
          error: error.message,
          operation: "addSymbolMappingRule",
        }),
      );
      throw error;
    }
  }

  /**
   * 更新特定的映射规则
   *
   * @param updateDto 更新映射规则DTO
   * @returns 更新后的映射配置响应DTO
   */
  async updateSymbolMappingRule(
    updateDto: UpdateSymbolMappingRuleDto,
  ): Promise<SymbolMappingResponseDto> {
    this.logger.log(
      `开始更新映射规则`,
      sanitizeLogData({
        dataSourceName: updateDto.dataSourceName,
        standardSymbol: updateDto.standardSymbol,
        operation: "updateSymbolMappingRule",
      }),
    );

    try {
      const updated = await this.repository.updateSymbolMappingRule(
        updateDto.dataSourceName,
        updateDto.standardSymbol,
        updateDto.symbolMappingRule,
      );

      if (!updated) {
        throw new NotFoundException(
          SYMBOL_MAPPER_ERROR_MESSAGES.MAPPING_RULE_NOT_FOUND.replace(
            "{dataSourceName}",
            updateDto.dataSourceName,
          ).replace("{standardSymbol}", updateDto.standardSymbol),
        );
      }

      this.logger.log(
        `映射规则更新成功`,
        sanitizeLogData({
          dataSourceName: updateDto.dataSourceName,
          standardSymbol: updateDto.standardSymbol,
          operation: "updateSymbolMappingRule",
        }),
      );

      return SymbolMappingResponseDto.fromDocument(updated as SymbolMappingRuleDocumentType);
    } catch (error) {
      this.logger.error(
        `更新映射规则失败`,
        sanitizeLogData({
          dataSourceName: updateDto.dataSourceName,
          standardSymbol: updateDto.standardSymbol,
          error: error.message,
          operation: "updateSymbolMappingRule",
        }),
      );
      throw error;
    }
  }

  /**
   * 删除特定的映射规则
   *
   * @param dataSourceName 数据源名称
   * @param standardSymbol 标准股票代码
   * @returns 更新后的映射配置响应DTO
   */
  async removeSymbolMappingRule(
    dataSourceName: string,
    standardSymbol: string,
  ): Promise<SymbolMappingResponseDto> {
    this.logger.log(
      `开始删除映射规则`,
      sanitizeLogData({
        dataSourceName,
        standardSymbol,
        operation: "removeSymbolMappingRule",
      }),
    );

    try {
      const updated = await this.repository.removeSymbolMappingRule(
        dataSourceName,
        standardSymbol,
      );

      if (!updated) {
        throw new NotFoundException(
          SYMBOL_MAPPER_ERROR_MESSAGES.DATA_SOURCE_NOT_FOUND.replace(
            "{dataSourceName}",
            dataSourceName,
          ),
        );
      }

      this.logger.log(
        `映射规则删除成功`,
        sanitizeLogData({
          dataSourceName,
          standardSymbol,
          remainingRules: updated.SymbolMappingRule.length,
          operation: "removeSymbolMappingRule",
        }),
      );

      return SymbolMappingResponseDto.fromDocument(updated as SymbolMappingRuleDocumentType);
    } catch (error) {
      this.logger.error(
        `删除映射规则失败`,
        sanitizeLogData({
          dataSourceName,
          standardSymbol,
          error: error.message,
          operation: "removeSymbolMappingRule",
        }),
      );
      throw error;
    }
  }

  /**
   * 批量替换映射规则
   *
   * @param dataSourceName 数据源名称
   * @param SymbolMappingRule 新的映射规则列表
   * @returns 更新后的映射配置响应DTO
   */
  async replaceSymbolMappingRule(
    dataSourceName: string,
    SymbolMappingRule: SymbolMappingRule[],
  ): Promise<SymbolMappingResponseDto> {
    this.logger.log(
      `开始批量替换映射规则`,
      sanitizeLogData({
        dataSourceName,
        newRulesCount: SymbolMappingRule.length,
        operation: "replaceSymbolMappingRule",
      }),
    );

    try {
      const updated = await this.repository.replaceSymbolMappingRule(
        dataSourceName,
        SymbolMappingRule,
      );

      if (!updated) {
        throw new NotFoundException(
          SYMBOL_MAPPER_ERROR_MESSAGES.DATA_SOURCE_NOT_FOUND.replace(
            "{dataSourceName}",
            dataSourceName,
          ),
        );
      }

      this.logger.log(
        `映射规则批量替换成功`,
        sanitizeLogData({
          dataSourceName,
          oldRulesCount: "unknown", // 原有规则数量在替换前已丢失
          newRulesCount: updated.SymbolMappingRule.length,
          operation: "replaceSymbolMappingRule",
        }),
      );

      return SymbolMappingResponseDto.fromDocument(updated as SymbolMappingRuleDocumentType);
    } catch (error) {
      this.logger.error(
        `批量替换映射规则失败`,
        sanitizeLogData({
          dataSourceName,
          newRulesCount: SymbolMappingRule.length,
          error: error.message,
          operation: "replaceSymbolMappingRule",
        }),
      );
      throw error;
    }
  }

  // ===== 私有辅助方法 =====

  /**
   * 🎯 新增: 封装核心转换流程以消除重复
   */
  private async _executeSymbolTransformation(
    standardSymbols: string[],
    context: {
      dataSourceName?: string;
      mappingInSymbolId?: string;
      operation: string;
    },
    ruleFetcher: () => Promise<
      SymbolMappingRule[] | { rules: SymbolMappingRule[]; dataSourceName: string }
    >,
  ): Promise<TransformSymbolsResponseDto> {
    const startTime = process.hrtime.bigint();
    this.logger.log(
      `开始批量转换: ${context.operation}`,
      sanitizeLogData({ ...context, symbolsCount: standardSymbols.length }),
    );

    try {
      const fetchResult = await ruleFetcher();

      let SymbolMappingRule: SymbolMappingRule[];
      let dataSourceName: string;

      if (Array.isArray(fetchResult)) {
        SymbolMappingRule = fetchResult;
        dataSourceName = context.dataSourceName;
      } else {
        SymbolMappingRule = fetchResult.rules;
        dataSourceName = fetchResult.dataSourceName;
      }

      const result = this.applySymbolMappingRule(standardSymbols, SymbolMappingRule, {
        source: dataSourceName,
        mappingInSymbolId: context.mappingInSymbolId,
      });

      const processingTime = Number(process.hrtime.bigint() - startTime) / 1e6; // 纳秒转毫秒
      this.recordTransformationPerformance(processingTime, standardSymbols.length);

      this.logger.log(
        `批量转换完成: ${context.operation}`,
        sanitizeLogData({
          ...context,
          totalInput: standardSymbols.length,
          mappedCount: standardSymbols.length - result.failedSymbols.length,
          unmappedCount: result.failedSymbols.length,
          processingTime,
        }),
      );

      return { ...result, processingTimeMs: processingTime };
    } catch (error) {
      const processingTime = Number(process.hrtime.bigint() - startTime) / 1e6;
      this.logger.error(
        `批量转换失败: ${context.operation}`,
        sanitizeLogData({
          ...context,
          symbolsCount: standardSymbols.length,
          error: error.message,
          processingTime,
        }),
      );
      throw error;
    }
  }

  /**
   * 应用映射规则进行股票代码转换
   */
  private applySymbolMappingRule(
    standardSymbols: string[],
    SymbolMappingRule: SymbolMappingRule[],
    context: SymbolMappingRuleContextDto,
  ): Omit<TransformSymbolsResponseDto, "processingTimeMs"> {
    // 🎯 移除处理时间
    // 创建映射字典以提高查找性能
    const mappingDict = new Map<string, string>();
    SymbolMappingRule.forEach((rule) => {
      mappingDict.set(rule.standardSymbol, rule.sdkSymbol);
    });

    const transformedSymbols: Record<string, string> = {};
    const failedSymbols: string[] = []; // 🎯 新增: 用于收集转换失败的代码

    standardSymbols.forEach((standardSymbol) => {
      if (mappingDict.has(standardSymbol)) {
        // 🎯 修正: 只在成功时进行映射
        transformedSymbols[standardSymbol] = mappingDict.get(standardSymbol);
      } else {
        // 🎯 修正: 记录失败的股票代码
        failedSymbols.push(standardSymbol);
        // 保留原始映射行为，以便调用方能找到key
        transformedSymbols[standardSymbol] = standardSymbol;
      }
    });

    // 🎯 移除 "忙等待" 循环
    // 确保最小处理时间（测试兼容性）
    // const now = Date.now();
    // while (Date.now() - now < SYMBOL_MAPPER_PERFORMANCE_CONFIG.MIN_PROCESSING_TIME_MS) {
    //   // 忙等待以确保处理时间 > 0
    // }

    this.logger.debug(
      `映射规则应用完成`,
      sanitizeLogData({
        source: context.source,
        mappingInSymbolId: context.mappingInSymbolId,
        totalInput: standardSymbols.length,
        mappedCount: standardSymbols.length - failedSymbols.length,
        unmappedCount: failedSymbols.length,
        operation: "applySymbolMappingRule",
      }),
    );

    // 🎯 修正: 返回不含 processingTimeMs 的对象
    return {
      dataSourceName: context.source,
      transformedSymbols,
      failedSymbols,
    };
  }



  /**
   * 记录转换性能指标
   */
  private recordTransformationPerformance(
    processingTime: number,
    symbolsCount: number,
  ): void {
    if (
      processingTime >
      SYMBOL_MAPPER_PERFORMANCE_CONFIG.SLOW_MAPPING_THRESHOLD_MS
    ) {
      this.logger.warn(
        SYMBOL_MAPPER_WARNING_MESSAGES.SLOW_MAPPING_DETECTED,
        sanitizeLogData({
          processingTime,
          symbolsCount,
          threshold: SYMBOL_MAPPER_PERFORMANCE_CONFIG.SLOW_MAPPING_THRESHOLD_MS,
          avgTimePerSymbol:
            symbolsCount > 0
              ? Math.round((processingTime / symbolsCount) * 100) / 100
              : 0,
          operation: SYMBOL_MAPPER_OPERATIONS.PERFORMANCE_METRICS,
        }),
      );
    }
  }

  /**
   * 获取所有映射规则
   *
   * @returns 所有映射规则的汇总数据
   */
  async getAllSymbolMappingRule(): Promise<any> {
    this.logger.debug("获取所有映射规则", {
      operation: "getAllSymbolMappingRule",
    });

    try {
      const allMappings = await this.repository.findAll();
      
      // 按数据源分组规则
      const rulesByProvider: Record<string, any> = {};
      let totalRules = 0;
      
      for (const mapping of allMappings) {
        const provider = mapping.dataSourceName;
        if (!rulesByProvider[provider]) {
          rulesByProvider[provider] = {
            dataSourceName: provider,
            description: mapping.description || `${provider} symbol mapping rules`,
            totalRules: 0,
            SymbolMappingRule: [],
            createdAt: (mapping as any).createdAt,
            updatedAt: (mapping as any).updatedAt,
          };
        }
        
        rulesByProvider[provider].SymbolMappingRule.push(...mapping.SymbolMappingRule);
        rulesByProvider[provider].totalRules = mapping.SymbolMappingRule.length;
        totalRules += mapping.SymbolMappingRule.length;
      }

      const result = {
        providers: Object.keys(rulesByProvider),
        totalProviders: Object.keys(rulesByProvider).length,
        totalRules,
        rulesByProvider,
        summary: {
          mostRulesProvider: null as string | null,
          averageRulesPerProvider: totalRules / Math.max(Object.keys(rulesByProvider).length, 1),
        }
      };

      // 找出规则最多的提供商
      let maxRules = 0;
      for (const [provider, data] of Object.entries(rulesByProvider)) {
        if ((data as any).totalRules > maxRules) {
          maxRules = (data as any).totalRules;
          result.summary.mostRulesProvider = provider;
        }
      }

      this.logger.log("成功获取所有映射规则", {
        totalProviders: result.totalProviders,
        totalRules: result.totalRules,
        mostRulesProvider: result.summary.mostRulesProvider,
        operation: "getAllSymbolMappingRule",
      });

      return result;
    } catch (error: any) {
      this.logger.error("获取所有映射规则失败", {
        error: error.message,
        errorType: error.constructor.name,
        operation: "getAllSymbolMappingRule",
      });
      throw error;
    }
  }

  // ===== 🎯 缓存优化相关的辅助方法 =====



  /**
   * 手动清理所有缓存（用于配置更新时）
   */
  clearCache(): void {
    this.unifiedCache.clear();
    this.logger.log('符号映射规则缓存已清理');
  }

  /**
   * 定时轮询检查规则版本（Change Stream 不可用时的降级策略）
   */
  private async checkRuleVersions(): Promise<void> {
    if (!this.featureFlags.symbolMappingCacheEnabled) {
      return;
    }

    try {
      // 获取数据源版本信息
      const currentVersions = await this.repository.getDataSourceVersions();
      let cacheInvalidated = false;

      for (const dataSourceName of currentVersions.keys()) {
        // 检查缓存中是否有该数据源的相关键
        const cacheKeys = Array.from(this.unifiedCache.keys());
        const sourceRelatedKeys = cacheKeys.filter(key => 
          key.includes(`:${dataSourceName}:`)
        );

        if (sourceRelatedKeys.length > 0) {
          // 简化实现：如果发现相关缓存，则清除该数据源的所有缓存
          for (const key of sourceRelatedKeys) {
            this.unifiedCache.delete(key);
          }
          cacheInvalidated = true;
        }
      }

      if (cacheInvalidated) {
        this.logger.debug('定时轮询：检测到规则版本变化，已清理相关缓存');
      }
    } catch (error) {
      this.logger.warn('规则版本检查失败，清理所有缓存', { error: error.message });
      this.clearCache();
    }
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    cacheHits: number;
    cacheMisses: number;
    hitRate: string;
    cacheSize: number;
    maxSize: number;
    pendingQueries: number;
  } {
    // 🎯 优先使用新缓存服务的统计信息（如果可用）
    if (this.cacheService) {
      try {
        const newStats = this.cacheService.getCacheStats();
        
        // 转换为兼容格式
        const totalL2Hits = newStats.layerStats.l2.hits;
        const totalL2Misses = newStats.layerStats.l2.misses;
        const totalL2Accesses = totalL2Hits + totalL2Misses;
        
        return {
          cacheHits: totalL2Hits,
          cacheMisses: totalL2Misses,
          hitRate: totalL2Accesses > 0 ? (totalL2Hits / totalL2Accesses * 100).toFixed(2) + '%' : '0%',
          cacheSize: newStats.cacheSize.l2, // L2 符号缓存大小
          maxSize: this.featureFlags.symbolCacheMaxSize,
          pendingQueries: 0, // 新缓存服务中的并发控制不暴露计数
        };
      } catch (error) {
        this.logger.warn('获取新缓存统计失败，使用传统统计', { error: error.message });
      }
    }

    // 🎯 规则缓存统计（仅用于规则管理）
    return {
      cacheHits: 0,
      cacheMisses: 0,
      hitRate: 'N/A',
      cacheSize: this.unifiedCache.size,
      maxSize: this.featureFlags.symbolCacheMaxSize,
      pendingQueries: 0,
    };
  }
}
