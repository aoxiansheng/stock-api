import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";

import { createLogger, sanitizeLogData } from '@common/config/logger.config';
import { PaginatedDataDto } from '@common/dto/common-response.dto';


import {
  SYMBOL_MAPPER_ERROR_MESSAGES,
  SYMBOL_MAPPER_WARNING_MESSAGES,
  SYMBOL_MAPPER_SUCCESS_MESSAGES,
  SYMBOL_MAPPER_PERFORMANCE_CONFIG,
  SYMBOL_MAPPER_OPERATIONS,
} from './constants/symbol-mapper.constants';
import { CreateSymbolMappingDto } from "./dto/create-symbol-mapping.dto";
import {
  MappingConfigResultDto,
  MappingRuleContextDto,
} from "./dto/symbol-mapper-internal.dto";
import { SymbolMappingQueryDto } from "./dto/symbol-mapping-query.dto";
import {
  SymbolMappingResponseDto,
} from "./dto/symbol-mapping-response.dto";
import {
  UpdateSymbolMappingDto,
  TransformSymbolsResponseDto,
  AddMappingRuleDto,
  UpdateMappingRuleDto,
} from "./dto/update-symbol-mapping.dto";
import { ISymbolMapper, IMappingRule } from "./interfaces/symbol-mapping.interface";
import { SymbolMappingRepository } from "./repositories/symbol-mapping.repository";

// 🎯 复用 common 模块的日志配置
// 🎯 复用 common 模块的股票代码映射常量

import { MappingRule } from "./schemas/symbol-mapping-rule.schema";


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
export class SymbolMapperService implements ISymbolMapper {
  // 🎯 使用 common 模块的日志配置
  private readonly logger = createLogger(SymbolMapperService.name);

  // 🎯 使用 common 模块的常量，无需重复定义

  constructor(private readonly repository: SymbolMappingRepository) {}

  /**
   * 映射单个股票代码从标准格式转换为数据源特定格式
   * 
   * @param originalSymbol 原始股票代码
   * @param fromProvider 来源提供商
   * @param toProvider 目标提供商
   * @returns 转换后的股票代码
   */
  async mapSymbol(
    originalSymbol: string,
    fromProvider: string,
    toProvider: string,
  ): Promise<string> {
    const startTime = Date.now();

    this.logger.debug(`开始映射股票代码`, sanitizeLogData({
      originalSymbol,
      fromProvider,
      toProvider,
      operation: SYMBOL_MAPPER_OPERATIONS.MAP_SYMBOL,
    }));

    try {
      // 获取目标数据源的映射配置
      const mappingResult = await this.getMappingConfigForProvider(toProvider);
      
      if (!mappingResult.found) {
        this.logger.warn(SYMBOL_MAPPER_WARNING_MESSAGES.MAPPING_CONFIG_NOT_FOUND, sanitizeLogData({
          originalSymbol,
          toProvider,
          operation: SYMBOL_MAPPER_OPERATIONS.MAP_SYMBOL,
        }));
        return originalSymbol;
      }

      // 查找匹配的映射规则
      const mappedSymbol = this.findMatchingMappingRule(
        originalSymbol,
        mappingResult.mappingRules,
      );

      const processingTime = Date.now() - startTime;
      
      this.logger.debug(`股票代码映射完成`, sanitizeLogData({
        originalSymbol,
        mappedSymbol,
        fromProvider,
        toProvider,
        processingTime,
        operation: SYMBOL_MAPPER_OPERATIONS.MAP_SYMBOL,
      }));

      return mappedSymbol;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`股票代码映射失败`, sanitizeLogData({
        originalSymbol,
        fromProvider,
        toProvider,
        error: error.message,
        processingTime,
        operation: 'mapSymbol',
      }));
      throw error;
    }
  }

  /**
   * 创建数据源映射配置
   * 
   * @param createDto 创建映射配置DTO
   * @returns 创建的映射配置响应DTO
   */
  async createDataSourceMapping(
    createDto: CreateSymbolMappingDto,
  ): Promise<SymbolMappingResponseDto> {
    this.logger.log(`开始创建数据源映射配置`, sanitizeLogData({
      dataSourceName: createDto.dataSourceName,
      rulesCount: createDto.mappingRules?.length || 0,
      operation: 'createDataSourceMapping',
    }));

    try {
      // 检查数据源是否已存在
      const exists = await this.repository.exists(createDto.dataSourceName);
      if (exists) {
        throw new ConflictException(
          SYMBOL_MAPPER_ERROR_MESSAGES.MAPPING_CONFIG_EXISTS.replace('{dataSourceName}', createDto.dataSourceName),
        );
      }

      const created = await this.repository.create(createDto);
      
      this.logger.log(SYMBOL_MAPPER_SUCCESS_MESSAGES.MAPPING_CONFIG_CREATED, sanitizeLogData({
        dataSourceName: created.dataSourceName,
        id: created._id || created.id,
        rulesCount: created.mappingRules.length,
        operation: 'createDataSourceMapping',
      }));

      return SymbolMappingResponseDto.fromDocument(created);
    } catch (error) {
      this.logger.error(`数据源映射配置创建失败`, sanitizeLogData({
        dataSourceName: createDto.dataSourceName,
        error: error.message,
        operation: 'createDataSourceMapping',
      }));
      throw error;
    }
  }

  /**
   * 实现接口方法 - 保存映射规则（创建新的数据源映射）
   * 
   * @param rule 映射规则对象
   */
  async saveMapping(rule: CreateSymbolMappingDto): Promise<void> {
    this.logger.debug(`保存映射规则`, sanitizeLogData({
      dataSourceName: rule.dataSourceName,
      operation: 'saveMapping',
    }));

    try {
      await this.createDataSourceMapping(rule);
    } catch (error) {
      this.logger.error(`保存映射规则失败`, sanitizeLogData({
        error: error.message,
        operation: 'saveMapping',
      }));
      throw error;
    }
  }

  /**
   * 实现接口方法 - 获取指定提供商的映射规则
   * 
   * @param provider 数据提供商名称
   * @returns 映射规则数组
   */
  async getMappingRules(provider: string): Promise<IMappingRule[]> {
    this.logger.debug(`获取提供商映射规则`, sanitizeLogData({
      provider,
      operation: 'getMappingRules',
    }));

    try {
      const mapping = await this.repository.findByDataSource(provider);
      
      if (!mapping) {
        this.logger.debug(`未找到提供商映射规则`, sanitizeLogData({
          provider,
          operation: 'getMappingRules',
        }));
        return [];
      }
      
      this.logger.debug(`映射规则获取完成`, sanitizeLogData({
        provider,
        rulesCount: mapping.mappingRules?.length || 0,
        operation: 'getMappingRules',
      }));

      // 直接返回映射规则数组，符合方法名期望
      return mapping.mappingRules || [];
    } catch (error) {
      this.logger.error(`获取映射规则失败`, sanitizeLogData({
        provider,
        error: error.message,
        operation: 'getMappingRules',
      }));
      throw error;
    }
  }

  /**
   * 根据ID获取映射配置
   * 
   * @param id 映射配置ID
   * @returns 映射配置响应DTO
   */
  async getMappingById(id: string): Promise<SymbolMappingResponseDto> {
    this.logger.debug(`根据ID获取映射配置`, sanitizeLogData({
      id,
      operation: 'getMappingById',
    }));

    try {
      const mapping = await this.repository.findById(id);
      if (!mapping) {
        throw new NotFoundException(SYMBOL_MAPPER_ERROR_MESSAGES.MAPPING_CONFIG_NOT_FOUND.replace('{id}', id));
      }

      this.logger.debug(`映射配置获取成功`, sanitizeLogData({
        id,
        dataSourceName: mapping.dataSourceName,
        rulesCount: mapping.mappingRules.length,
        operation: 'getMappingById',
      }));

      return SymbolMappingResponseDto.fromDocument(mapping);
    } catch (error) {
      this.logger.error(`获取映射配置失败`, sanitizeLogData({
        id,
        error: error.message,
        operation: 'getMappingById',
      }));
      throw error;
    }
  }

  /**
   * 根据数据源名称获取映射配置
   * 
   * @param dataSourceName 数据源名称
   * @returns 映射配置响应DTO
   */
  async getMappingByDataSource(
    dataSourceName: string,
  ): Promise<SymbolMappingResponseDto> {
    this.logger.debug(`根据数据源名称获取映射配置`, sanitizeLogData({
      dataSourceName,
      operation: 'getMappingByDataSource',
    }));

    try {
      const mapping = await this.repository.findByDataSource(dataSourceName);
      if (!mapping) {
        throw new NotFoundException(
          SYMBOL_MAPPER_ERROR_MESSAGES.DATA_SOURCE_MAPPING_NOT_FOUND.replace('{dataSourceName}', dataSourceName),
        );
      }

      this.logger.debug(`数据源映射配置获取成功`, sanitizeLogData({
        dataSourceName,
        id: mapping._id || mapping.id,
        rulesCount: mapping.mappingRules.length,
        operation: 'getMappingByDataSource',
      }));

      return SymbolMappingResponseDto.fromDocument(mapping);
    } catch (error) {
      this.logger.error(`获取数据源映射配置失败`, sanitizeLogData({
        dataSourceName,
        error: error.message,
        operation: 'getMappingByDataSource',
      }));
      throw error;
    }
  }

  /**
   * 分页查询映射配置 - 使用统一的分页响应格式
   * 
   * @param query 查询参数DTO
   * @returns 统一分页响应DTO
   */
  async getMappingsPaginated(
    query: SymbolMappingQueryDto,
  ): Promise<PaginatedDataDto<SymbolMappingResponseDto>> {
    this.logger.debug(`分页查询数据源映射配置`, sanitizeLogData({
      page: query.page,
      limit: query.limit,
      dataSourceName: query.dataSourceName,
      operation: 'getMappingsPaginated',
    }));

    try {
      const { items, total } = await this.repository.findPaginated(query);
      const page = query.page || 1;
      const limit = query.limit || 10;
      const responseItems = items.map((item) =>
        SymbolMappingResponseDto.fromLeanObject(item),
      );

      return new PaginatedDataDto(
        responseItems,
        {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      );
    } catch (error) {
      this.logger.error(`分页查询映射配置失败`, sanitizeLogData({
        query: query,
        error: error.message,
        operation: 'getMappingsPaginated',
      }));
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
  async updateMapping(
    id: string,
    updateDto: UpdateSymbolMappingDto,
  ): Promise<SymbolMappingResponseDto> {
    this.logger.log(`开始更新数据源映射配置`, sanitizeLogData({
      id,
      operation: 'updateMapping',
    }));

    try {
      const updated = await this.repository.updateById(id, updateDto);
      if (!updated) {
        throw new NotFoundException(SYMBOL_MAPPER_ERROR_MESSAGES.MAPPING_CONFIG_NOT_FOUND.replace('{id}', id));
      }

      this.logger.log(SYMBOL_MAPPER_SUCCESS_MESSAGES.MAPPING_CONFIG_UPDATED, sanitizeLogData({
        id,
        dataSourceName: updated.dataSourceName,
        rulesCount: updated.mappingRules.length,
        operation: 'updateMapping',
      }));

      return SymbolMappingResponseDto.fromDocument(updated);
    } catch (error) {
      this.logger.error(`映射配置更新失败`, sanitizeLogData({
        id,
        error: error.message,
        operation: 'updateMapping',
      }));
      throw error;
    }
  }

  /**
   * 删除映射配置
   * 
   * @param id 映射配置ID
   * @returns 删除的映射配置响应DTO
   */
  async deleteMapping(id: string): Promise<SymbolMappingResponseDto> {
    this.logger.log(`开始删除数据源映射配置`, {
      id,
      operation: 'deleteMapping',
    });

    try {
      const deleted = await this.repository.deleteById(id);
      if (!deleted) {
        throw new NotFoundException(SYMBOL_MAPPER_ERROR_MESSAGES.MAPPING_CONFIG_NOT_FOUND.replace('{id}', id));
      }

      this.logger.log(SYMBOL_MAPPER_SUCCESS_MESSAGES.MAPPING_CONFIG_DELETED, {
        id,
        dataSourceName: deleted.dataSourceName,
        operation: 'deleteMapping',
      });

      return SymbolMappingResponseDto.fromDocument(deleted);
    } catch (error) {
      this.logger.error(`映射配置删除失败`, {
        id,
        error: error.message,
        operation: 'deleteMapping',
      });
      throw error;
    }
  }

  /**
   * 批量转换股票代码
   * 
   * @param dataSourceName 数据源名称
   * @param inputSymbols 输入股票代码列表
   * @returns 转换响应DTO
   */
  async transformSymbols(
    dataSourceName: string,
    inputSymbols: string[],
  ): Promise<TransformSymbolsResponseDto> {
    const operation = SYMBOL_MAPPER_OPERATIONS.TRANSFORM_BY_NAME;
    const ruleFetcher = () => this.repository.findAllMappingsForSymbols(dataSourceName, inputSymbols);

    return this._executeTransformation(
      inputSymbols,
      { dataSourceName, operation },
      ruleFetcher,
    );
  }

  /**
   * 通过映射配置ID批量转换股票代码
   * 
   * @param mappingInSymbolId 映射配置ID
   * @param inputSymbols 输入股票代码列表
   * @returns 转换响应DTO
   */
  async transformSymbolsById(
    mappingInSymbolId: string,
    inputSymbols: string[],
  ): Promise<TransformSymbolsResponseDto> {
    const operation = SYMBOL_MAPPER_OPERATIONS.TRANSFORM_BY_ID;

    // 🎯 规则获取逻辑现在移交给 _executeTransformation 处理
    const ruleFetcher = async () => {
      const mappingDoc = await this.repository.findById(mappingInSymbolId);
      if (!mappingDoc || !mappingDoc.isActive) {
        throw new NotFoundException(
          SYMBOL_MAPPER_ERROR_MESSAGES.MAPPING_CONFIG_INACTIVE.replace('{mappingId}', mappingInSymbolId),
        );
      }
      return {
        rules: mappingDoc.mappingRules.filter(rule => inputSymbols.includes(rule.inputSymbol) && rule.isActive !== false),
        dataSourceName: mappingDoc.dataSourceName,
      };
    };

    return this._executeTransformation(
      inputSymbols,
      { mappingInSymbolId, operation },
      ruleFetcher,
    );
  }

  /**
   * 获取转换后的代码列表（用于数据提供商调用）
   * 
   * @param dataSourceName 数据源名称
   * @param inputSymbols 输入股票代码列表
   * @returns 转换后的股票代码列表
   */
  async getTransformedSymbolList(
    dataSourceName: string,
    inputSymbols: string[],
  ): Promise<string[]> {
    this.logger.debug(`获取转换后的代码列表`, {
      dataSourceName,
      symbolsCount: inputSymbols.length,
      operation: 'getTransformedSymbolList',
    });

    try {
      const result = await this.transformSymbols(dataSourceName, inputSymbols);
      return inputSymbols.map((symbol) => result.transformedSymbols[symbol]);
    } catch (error) {
      this.logger.error(`获取转换后代码列表失败`, {
        dataSourceName,
        error: error.message,
        operation: 'getTransformedSymbolList',
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
      operation: 'getDataSources',
    });

    try {
      const dataSources = await this.repository.getDataSources();
      
      this.logger.debug(`数据源列表获取完成`, {
        count: dataSources.length,
        operation: 'getDataSources',
      });

      return dataSources;
    } catch (error) {
      this.logger.error(`获取数据源列表失败`, {
        error: error.message,
        operation: 'getDataSources',
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
      operation: 'getMarkets',
    });

    try {
      const markets = await this.repository.getMarkets();
      
      this.logger.debug(`市场列表获取完成`, {
        count: markets.length,
        operation: 'getMarkets',
      });

      return markets;
    } catch (error) {
      this.logger.error(`获取市场列表失败`, {
        error: error.message,
        operation: 'getMarkets',
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
      operation: 'getSymbolTypes',
    });

    try {
      const symbolTypes = await this.repository.getSymbolTypes();
      
      this.logger.debug(`股票类型列表获取完成`, {
        count: symbolTypes.length,
        operation: 'getSymbolTypes',
      });

      return symbolTypes;
    } catch (error) {
      this.logger.error(`获取股票类型列表失败`, {
        error: error.message,
        operation: 'getSymbolTypes',
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
  async deleteMappingsByDataSource(
    dataSourceName: string,
  ): Promise<{ deletedCount: number }> {
    this.logger.log(`开始按数据源删除映射`, {
      dataSourceName,
      operation: 'deleteMappingsByDataSource',
    });

    try {
      const result = await this.repository.deleteByDataSource(dataSourceName);

      this.logger.log(`按数据源删除映射完成`, sanitizeLogData({
        dataSourceName,
        deletedCount: result.deletedCount,
        operation: 'deleteMappingsByDataSource',
      }));

      return result;
    } catch (error) {
      this.logger.error(`按数据源删除映射失败`, sanitizeLogData({
        dataSourceName,
        error: error.message,
        operation: 'deleteMappingsByDataSource',
      }));
      throw error;
    }
  }

  /**
   * 添加映射规则到现有数据源
   * 
   * @param addDto 添加映射规则DTO
   * @returns 更新后的映射配置响应DTO
   */
  async addMappingRule(
    addDto: AddMappingRuleDto,
  ): Promise<SymbolMappingResponseDto> {
    this.logger.log(`开始添加映射规则`, sanitizeLogData({
      dataSourceName: addDto.dataSourceName,
      inputSymbol: addDto.mappingRule.inputSymbol,
      outputSymbol: addDto.mappingRule.outputSymbol,
      operation: 'addMappingRule',
    }));

    try {
      const updated = await this.repository.addMappingRule(
        addDto.dataSourceName,
        addDto.mappingRule,
      );
      
      if (!updated) {
        throw new NotFoundException(
          SYMBOL_MAPPER_ERROR_MESSAGES.DATA_SOURCE_NOT_FOUND.replace('{dataSourceName}', addDto.dataSourceName),
        );
      }

      this.logger.log(`映射规则添加成功`, sanitizeLogData({
        dataSourceName: addDto.dataSourceName,
        totalRules: updated.mappingRules.length,
        operation: 'addMappingRule',
      }));

      return SymbolMappingResponseDto.fromDocument(updated);
    } catch (error) {
      this.logger.error(`添加映射规则失败`, sanitizeLogData({
        dataSourceName: addDto.dataSourceName,
        error: error.message,
        operation: 'addMappingRule',
      }));
      throw error;
    }
  }

  /**
   * 更新特定的映射规则
   * 
   * @param updateDto 更新映射规则DTO
   * @returns 更新后的映射配置响应DTO
   */
  async updateMappingRule(
    updateDto: UpdateMappingRuleDto,
  ): Promise<SymbolMappingResponseDto> {
    this.logger.log(`开始更新映射规则`, sanitizeLogData({
      dataSourceName: updateDto.dataSourceName,
      inputSymbol: updateDto.inputSymbol,
      operation: 'updateMappingRule',
    }));

    try {
      const updated = await this.repository.updateMappingRule(
        updateDto.dataSourceName,
        updateDto.inputSymbol,
        updateDto.mappingRule,
      );

      if (!updated) {
        throw new NotFoundException(
          SYMBOL_MAPPER_ERROR_MESSAGES.MAPPING_RULE_NOT_FOUND
            .replace('{dataSourceName}', updateDto.dataSourceName)
            .replace('{inputSymbol}', updateDto.inputSymbol),
        );
      }

      this.logger.log(`映射规则更新成功`, sanitizeLogData({
        dataSourceName: updateDto.dataSourceName,
        inputSymbol: updateDto.inputSymbol,
        operation: 'updateMappingRule',
      }));

      return SymbolMappingResponseDto.fromDocument(updated);
    } catch (error) {
      this.logger.error(`更新映射规则失败`, sanitizeLogData({
        dataSourceName: updateDto.dataSourceName,
        inputSymbol: updateDto.inputSymbol,
        error: error.message,
        operation: 'updateMappingRule',
      }));
      throw error;
    }
  }

  /**
   * 删除特定的映射规则
   * 
   * @param dataSourceName 数据源名称
   * @param inputSymbol 输入股票代码
   * @returns 更新后的映射配置响应DTO
   */
  async removeMappingRule(
    dataSourceName: string,
    inputSymbol: string,
  ): Promise<SymbolMappingResponseDto> {
    this.logger.log(`开始删除映射规则`, sanitizeLogData({
      dataSourceName,
      inputSymbol,
      operation: 'removeMappingRule',
    }));

    try {
      const updated = await this.repository.removeMappingRule(
        dataSourceName,
        inputSymbol,
      );
      
      if (!updated) {
        throw new NotFoundException(
          SYMBOL_MAPPER_ERROR_MESSAGES.DATA_SOURCE_NOT_FOUND.replace('{dataSourceName}', dataSourceName),
        );
      }

      this.logger.log(`映射规则删除成功`, sanitizeLogData({
        dataSourceName,
        inputSymbol,
        remainingRules: updated.mappingRules.length,
        operation: 'removeMappingRule',
      }));

      return SymbolMappingResponseDto.fromDocument(updated);
    } catch (error) {
      this.logger.error(`删除映射规则失败`, sanitizeLogData({
        dataSourceName,
        inputSymbol,
        error: error.message,
        operation: 'removeMappingRule',
      }));
      throw error;
    }
  }

  /**
   * 批量替换映射规则
   * 
   * @param dataSourceName 数据源名称
   * @param mappingRules 新的映射规则列表
   * @returns 更新后的映射配置响应DTO
   */
  async replaceMappingRules(
    dataSourceName: string,
    mappingRules: MappingRule[],
  ): Promise<SymbolMappingResponseDto> {
    this.logger.log(`开始批量替换映射规则`, sanitizeLogData({
      dataSourceName,
      newRulesCount: mappingRules.length,
      operation: 'replaceMappingRules',
    }));

    try {
      const updated = await this.repository.replaceMappingRules(
        dataSourceName,
        mappingRules,
      );
      
      if (!updated) {
        throw new NotFoundException(
          SYMBOL_MAPPER_ERROR_MESSAGES.DATA_SOURCE_NOT_FOUND.replace('{dataSourceName}', dataSourceName),
        );
      }

      this.logger.log(`映射规则批量替换成功`, sanitizeLogData({
        dataSourceName,
        oldRulesCount: 'unknown', // 原有规则数量在替换前已丢失
        newRulesCount: updated.mappingRules.length,
        operation: 'replaceMappingRules',
      }));

      return SymbolMappingResponseDto.fromDocument(updated);
    } catch (error) {
      this.logger.error(`批量替换映射规则失败`, sanitizeLogData({
        dataSourceName,
        newRulesCount: mappingRules.length,
        error: error.message,
        operation: 'replaceMappingRules',
      }));
      throw error;
    }
  }

  // ===== 私有辅助方法 =====

  /**
   * 🎯 新增: 封装核心转换流程以消除重复
   */
  private async _executeTransformation(
    inputSymbols: string[],
    context: {
      dataSourceName?: string;
      mappingInSymbolId?: string;
      operation: string;
    },
    ruleFetcher: () => Promise<MappingRule[] | { rules: MappingRule[], dataSourceName: string }>,
  ): Promise<TransformSymbolsResponseDto> {
    const startTime = process.hrtime.bigint();
    this.logger.log(`开始批量转换: ${context.operation}`, sanitizeLogData({ ...context, symbolsCount: inputSymbols.length }));

    try {
      const fetchResult = await ruleFetcher();
      
      let mappingRules: MappingRule[];
      let dataSourceName: string;

      if (Array.isArray(fetchResult)) {
        mappingRules = fetchResult;
        dataSourceName = context.dataSourceName;
      } else {
        mappingRules = fetchResult.rules;
        dataSourceName = fetchResult.dataSourceName;
      }

      const result = this.applyMappingRules(inputSymbols, mappingRules, {
        source: dataSourceName,
        mappingInSymbolId: context.mappingInSymbolId,
      });

      const processingTime = Number(process.hrtime.bigint() - startTime) / 1e6; // 纳秒转毫秒
      this.recordTransformationPerformance(processingTime, inputSymbols.length);

      this.logger.log(`批量转换完成: ${context.operation}`, sanitizeLogData({
        ...context,
        totalInput: inputSymbols.length,
        mappedCount: inputSymbols.length - result.failedSymbols.length,
        unmappedCount: result.failedSymbols.length,
        processingTime,
      }));

      return { ...result, processingTimeMs: processingTime };
    } catch (error) {
      const processingTime = Number(process.hrtime.bigint() - startTime) / 1e6;
      this.logger.error(`批量转换失败: ${context.operation}`, sanitizeLogData({
        ...context,
        symbolsCount: inputSymbols.length,
        error: error.message,
        processingTime,
      }));
      throw error;
    }
  }

  /**
   * 应用映射规则进行股票代码转换
   */
  private applyMappingRules(
    inputSymbols: string[],
    mappingRules: MappingRule[],
    context: MappingRuleContextDto,
  ): Omit<TransformSymbolsResponseDto, 'processingTimeMs'> { // 🎯 移除处理时间
    // 创建映射字典以提高查找性能
    const mappingDict = new Map<string, string>();
    mappingRules.forEach((rule) => {
      mappingDict.set(rule.inputSymbol, rule.outputSymbol);
    });

    const transformedSymbols: Record<string, string> = {};
    const failedSymbols: string[] = []; // 🎯 新增: 用于收集转换失败的代码

    inputSymbols.forEach((inputSymbol) => {
      if (mappingDict.has(inputSymbol)) {
        // 🎯 修正: 只在成功时进行映射
        transformedSymbols[inputSymbol] = mappingDict.get(inputSymbol);
      } else {
        // 🎯 修正: 记录失败的股票代码
        failedSymbols.push(inputSymbol);
        // 保留原始映射行为，以便调用方能找到key
        transformedSymbols[inputSymbol] = inputSymbol;
      }
    });

    // 🎯 移除 "忙等待" 循环
    // 确保最小处理时间（测试兼容性）
    // const now = Date.now();
    // while (Date.now() - now < SYMBOL_MAPPER_PERFORMANCE_CONFIG.MIN_PROCESSING_TIME_MS) {
    //   // 忙等待以确保处理时间 > 0
    // }

    this.logger.debug(`映射规则应用完成`, sanitizeLogData({
      source: context.source,
      mappingInSymbolId: context.mappingInSymbolId,
      totalInput: inputSymbols.length,
      mappedCount: inputSymbols.length - failedSymbols.length,
      unmappedCount: failedSymbols.length,
      operation: 'applyMappingRules',
    }));

    // 🎯 修正: 返回不含 processingTimeMs 的对象
    return {
      dataSourceName: context.source,
      transformedSymbols,
      failedSymbols,
    };
  }

  /**
   * 获取指定提供商的映射配置
   */
  private async getMappingConfigForProvider(provider: string): Promise<MappingConfigResultDto> {
    try {
      const mapping = await this.repository.findByDataSource(provider);
      
      if (!mapping) {
        return { found: false, mappingRules: [] } as MappingConfigResultDto;
      }

      return {
        found: true,
        mappingRules: mapping.mappingRules,
        dataSourceName: mapping.dataSourceName,
      } as MappingConfigResultDto;
    } catch (error) {
      this.logger.warn(`获取映射配置失败`, sanitizeLogData({
        provider,
        error: error.message,
        operation: 'getMappingConfigForProvider',
      }));
      return { found: false, mappingRules: [] } as MappingConfigResultDto;
    }
  }

  /**
   * 查找匹配的映射规则
   */
  private findMatchingMappingRule(
    originalSymbol: string,
    mappingRules: MappingRule[],
  ): string {
    const rule = mappingRules.find(
      (rule) => rule.inputSymbol === originalSymbol && rule.isActive !== false,
    );

    if (rule) {
      this.logger.debug(`找到匹配的映射规则`, sanitizeLogData({
        originalSymbol,
        mappedSymbol: rule.outputSymbol,
        operation: 'findMatchingMappingRule',
      }));
      return rule.outputSymbol;
    }

    this.logger.debug(`未找到匹配的映射规则，返回原始代码`, sanitizeLogData({
      originalSymbol,
      operation: 'findMatchingMappingRule',
    }));
    return originalSymbol;
  }

  /**
   * 记录转换性能指标
   */
  private recordTransformationPerformance(
    processingTime: number,
    symbolsCount: number,
  ): void {
    if (processingTime > SYMBOL_MAPPER_PERFORMANCE_CONFIG.SLOW_MAPPING_THRESHOLD_MS) {
      this.logger.warn(SYMBOL_MAPPER_WARNING_MESSAGES.SLOW_MAPPING_DETECTED, sanitizeLogData({
        processingTime,
        symbolsCount,
        threshold: SYMBOL_MAPPER_PERFORMANCE_CONFIG.SLOW_MAPPING_THRESHOLD_MS,
        avgTimePerSymbol: symbolsCount > 0 ? Math.round((processingTime / symbolsCount) * 100) / 100 : 0,
        operation: SYMBOL_MAPPER_OPERATIONS.PERFORMANCE_METRICS,
      }));
    }
  }
}
