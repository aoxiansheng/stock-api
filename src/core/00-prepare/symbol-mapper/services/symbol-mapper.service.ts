import {
  Injectable,
  ConflictException,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";

import { createLogger, sanitizeLogData } from "@appcore/config/logger.config";
import { PaginatedDataDto } from "@common/modules/pagination/dto/paginated-data";
import { PaginationService } from "@common/modules/pagination/services/pagination.service";
import { FeatureFlags } from "@config/feature-flags.config";
import { SymbolMapperCacheService } from "../../../05-caching/symbol-mapper-cache/services/symbol-mapper-cache.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { SYSTEM_STATUS_EVENTS } from "../../../../monitoring/contracts/events/system-status.events";

import {
  SYMBOL_MAPPER_ERROR_MESSAGES,
  SYMBOL_MAPPER_SUCCESS_MESSAGES,
} from "../constants/symbol-mapper.constants";
import { CreateSymbolMappingDto } from "../dto/create-symbol-mapping.dto";
import { SymbolMappingQueryDto } from "../dto/symbol-mapping-query.dto";
import { SymbolMappingResponseDto } from "../dto/symbol-mapping-response.dto";
import {
  UpdateSymbolMappingDto,
  AddSymbolMappingRuleDto,
  UpdateSymbolMappingRuleDto,
} from "../dto/update-symbol-mapping.dto";
import {
  ISymbolMapper,
  ISymbolMappingRule,
  ISymbolMappingRuleList,
} from "../interfaces/symbol-mapping.interface";
import { SymbolMappingRepository } from "../repositories/symbol-mapping.repository";

// 🎯 复用 common 模块的日志配置
// 🎯 复用 common 模块的股票代码映射常量

import {
  SymbolMappingRule,
  SymbolMappingRuleDocumentType,
} from "../schemas/symbol-mapping-rule.schema";

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

  constructor(
    private readonly repository: SymbolMappingRepository,
    private readonly paginationService: PaginationService,
    private readonly featureFlags: FeatureFlags,
    private readonly eventBus: EventEmitter2, // ✅ 事件驱动监控
    private readonly symbolMapperCacheService: SymbolMapperCacheService,
  ) {}

  /**
   * ✅ 事件化监控包装器 - 异步发送监控事件，完全解耦
   */
  private emitMonitoringEvent(metricName: string, data: any) {
    setImmediate(() => {
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(),
        source: "symbol_mapper",
        metricType: data.metricType || "business",
        metricName,
        metricValue: data.duration || data.amount || 1,
        tags: {
          operation: data.operation,
          status: data.success ? "success" : "error",
          service: "SymbolMapperService",
          ...data.tags,
        },
      });
    });
  }

  /**
   * 🎯 模块初始化：事件化监控架构初始化完成
   */
  async onModuleInit() {
    this.logger.log("SymbolMapperService 初始化完成，采用事件化监控架构");

    // 发送服务初始化事件
    this.emitMonitoringEvent("service_initialized", {
      operation: "onModuleInit",
      success: true,
      metricType: "system",
      tags: {
        service: "SymbolMapperService",
        architecture: "event-driven",
      },
    });
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
    const startTime = Date.now();
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
        // 事件化监控 - 配置已存在
        this.emitMonitoringEvent("mapping_conflict", {
          operation: "createDataSourceMapping",
          dataSourceName: createDto.dataSourceName,
          duration: Date.now() - startTime,
          success: false,
          metricType: "business",
          tags: {
            conflict: "mapping_already_exists",
            rulesCount: createDto.SymbolMappingRule?.length || 0,
          },
        });

        throw new ConflictException(
          SYMBOL_MAPPER_ERROR_MESSAGES.MAPPING_CONFIG_EXISTS.replace(
            "{dataSourceName}",
            createDto.dataSourceName,
          ),
        );
      }

      const created = await this.repository.create(createDto);

      // 事件化监控 - 创建成功
      this.emitMonitoringEvent("mapping_created", {
        operation: "createDataSourceMapping",
        dataSourceName: created.dataSourceName,
        duration: Date.now() - startTime,
        success: true,
        metricType: "business",
        tags: {
          rulesCount: created.SymbolMappingRule.length,
          id: created._id || created.id,
        },
      });

      this.logger.log(
        SYMBOL_MAPPER_SUCCESS_MESSAGES.MAPPING_CONFIG_CREATED,
        sanitizeLogData({
          dataSourceName: created.dataSourceName,
          id: created._id || created.id,
          rulesCount: created.SymbolMappingRule.length,
          operation: "createDataSourceMapping",
        }),
      );

      return SymbolMappingResponseDto.fromDocument(
        created as SymbolMappingRuleDocumentType,
      );
    } catch (error) {
      // 事件化监控 - 创建失败
      this.emitMonitoringEvent("mapping_creation_failed", {
        operation: "createDataSourceMapping",
        dataSourceName: createDto.dataSourceName,
        duration: Date.now() - startTime,
        success: false,
        metricType: "business",
        tags: {
          error: error.message,
          errorType: error.constructor.name,
          rulesCount: createDto.SymbolMappingRule?.length || 0,
        },
      });

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
      return mapping.SymbolMappingRule || ([] as ISymbolMappingRule[]);
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

      return SymbolMappingResponseDto.fromDocument(
        mapping as SymbolMappingRuleDocumentType,
      );
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
    const startTime = Date.now();
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
        // ✅ 事件化监控 - 数据未找到
        this.emitMonitoringEvent("mapping_not_found", {
          operation: "getSymbolMappingByDataSource",
          dataSourceName,
          duration: Date.now() - startTime,
          success: false,
          metricType: "database",
          tags: {
            collection: "symbolMappings",
            error: "Document not found",
          },
        });

        throw new NotFoundException(
          SYMBOL_MAPPER_ERROR_MESSAGES.DATA_SOURCE_MAPPING_NOT_FOUND.replace(
            "{dataSourceName}",
            dataSourceName,
          ),
        );
      }

      // ✅ 事件化监控 - 数据获取成功
      this.emitMonitoringEvent("mapping_retrieved", {
        operation: "getSymbolMappingByDataSource",
        dataSourceName,
        duration: Date.now() - startTime,
        success: true,
        metricType: "database",
        tags: {
          collection: "symbolMappings",
          resultCount: 1,
        },
      });

      this.logger.debug(
        `数据源映射配置获取成功`,
        sanitizeLogData({
          dataSourceName,
          id: mapping._id || mapping.id,
          rulesCount: mapping.SymbolMappingRule.length,
          operation: "getSymbolMappingByDataSource",
        }),
      );

      return SymbolMappingResponseDto.fromDocument(
        mapping as SymbolMappingRuleDocumentType,
      );
    } catch (error) {
      // ✅ 事件化监控 - 错误情况
      this.emitMonitoringEvent("mapping_error", {
        operation: "getSymbolMappingByDataSource",
        dataSourceName,
        duration: Date.now() - startTime,
        success: false,
        metricType: "database",
        tags: {
          error: error.message,
          errorType: error.constructor.name,
          statusCode: error instanceof NotFoundException ? 404 : 500,
        },
      });

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

      return SymbolMappingResponseDto.fromDocument(
        updated as SymbolMappingRuleDocumentType,
      );
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
    const startTime = Date.now();
    this.logger.log(`开始删除数据源映射配置`, {
      id,
      operation: "deleteSymbolMapping",
    });

    try {
      const deleted = await this.repository.deleteById(id);
      if (!deleted) {
        // 事件化监控 - 映射未找到
        this.emitMonitoringEvent("mapping_delete_not_found", {
          operation: "deleteSymbolMapping",
          duration: Date.now() - startTime,
          success: false,
          metricType: "business",
          tags: {
            id,
            error: "mapping_not_found",
          },
        });

        throw new NotFoundException(
          SYMBOL_MAPPER_ERROR_MESSAGES.MAPPING_CONFIG_NOT_FOUND.replace(
            "{id}",
            id,
          ),
        );
      }

      // 事件化监控 - 删除成功
      this.emitMonitoringEvent("mapping_deleted", {
        operation: "deleteSymbolMapping",
        duration: Date.now() - startTime,
        success: true,
        metricType: "business",
        tags: {
          id,
          dataSourceName: deleted.dataSourceName,
          rulesCount: deleted.SymbolMappingRule.length,
        },
      });

      this.logger.log(SYMBOL_MAPPER_SUCCESS_MESSAGES.MAPPING_CONFIG_DELETED, {
        id,
        dataSourceName: deleted.dataSourceName,
        operation: "deleteSymbolMapping",
      });

      return SymbolMappingResponseDto.fromDocument(
        deleted as SymbolMappingRuleDocumentType,
      );
    } catch (error) {
      // 事件化监控 - 删除失败
      this.emitMonitoringEvent("mapping_delete_failed", {
        operation: "deleteSymbolMapping",
        duration: Date.now() - startTime,
        success: false,
        metricType: "business",
        tags: {
          id,
          error: error.message,
          errorType: error.constructor.name,
        },
      });

      this.logger.error(`映射配置删除失败`, {
        id,
        error: error.message,
        operation: "deleteSymbolMapping",
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
    const startTime = Date.now();
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
        // 事件化监控 - 数据源未找到
        this.emitMonitoringEvent("rule_add_datasource_not_found", {
          operation: "addSymbolMappingRule",
          dataSourceName: addDto.dataSourceName,
          duration: Date.now() - startTime,
          success: false,
          metricType: "business",
          tags: {
            standardSymbol: addDto.symbolMappingRule.standardSymbol,
            sdkSymbol: addDto.symbolMappingRule.sdkSymbol,
            error: "data_source_not_found",
          },
        });

        throw new NotFoundException(
          SYMBOL_MAPPER_ERROR_MESSAGES.DATA_SOURCE_NOT_FOUND.replace(
            "{dataSourceName}",
            addDto.dataSourceName,
          ),
        );
      }

      // 事件化监控 - 规则添加成功
      this.emitMonitoringEvent("rule_added", {
        operation: "addSymbolMappingRule",
        dataSourceName: addDto.dataSourceName,
        duration: Date.now() - startTime,
        success: true,
        metricType: "business",
        tags: {
          standardSymbol: addDto.symbolMappingRule.standardSymbol,
          sdkSymbol: addDto.symbolMappingRule.sdkSymbol,
          totalRules: updated.SymbolMappingRule.length,
        },
      });

      this.logger.log(
        `映射规则添加成功`,
        sanitizeLogData({
          dataSourceName: addDto.dataSourceName,
          totalRules: updated.SymbolMappingRule.length,
          operation: "addSymbolMappingRule",
        }),
      );

      return SymbolMappingResponseDto.fromDocument(
        updated as SymbolMappingRuleDocumentType,
      );
    } catch (error) {
      // 事件化监控 - 添加规则失败
      this.emitMonitoringEvent("rule_add_failed", {
        operation: "addSymbolMappingRule",
        dataSourceName: addDto.dataSourceName,
        duration: Date.now() - startTime,
        success: false,
        metricType: "business",
        tags: {
          standardSymbol: addDto.symbolMappingRule.standardSymbol,
          sdkSymbol: addDto.symbolMappingRule.sdkSymbol,
          error: error.message,
          errorType: error.constructor.name,
        },
      });

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

      return SymbolMappingResponseDto.fromDocument(
        updated as SymbolMappingRuleDocumentType,
      );
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

      return SymbolMappingResponseDto.fromDocument(
        updated as SymbolMappingRuleDocumentType,
      );
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

      return SymbolMappingResponseDto.fromDocument(
        updated as SymbolMappingRuleDocumentType,
      );
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
            description:
              mapping.description || `${provider} symbol mapping rules`,
            totalRules: 0,
            SymbolMappingRule: [],
            createdAt: (mapping as any).createdAt,
            updatedAt: (mapping as any).updatedAt,
          };
        }

        rulesByProvider[provider].SymbolMappingRule.push(
          ...mapping.SymbolMappingRule,
        );
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
          averageRulesPerProvider:
            totalRules / Math.max(Object.keys(rulesByProvider).length, 1),
        },
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
   * 手动清理所有缓存（委派给缓存服务）
   */
  clearCache(): void {
    // 🗑️ 移除兼容性检查，直接调用
    this.symbolMapperCacheService.clearAllCaches();
    this.logger.log("符号映射规则缓存已清理");
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
    // 🗑️ 移除可用性检查，直接使用缓存服务
    const newStats = this.symbolMapperCacheService.getCacheStats();

    // 转换为兼容格式
    const totalL2Hits = newStats.layerStats.l2.hits;
    const totalL2Misses = newStats.layerStats.l2.misses;
    const totalL2Accesses = totalL2Hits + totalL2Misses;

    return {
      cacheHits: totalL2Hits,
      cacheMisses: totalL2Misses,
      hitRate:
        totalL2Accesses > 0
          ? ((totalL2Hits / totalL2Accesses) * 100).toFixed(2) + "%"
          : "0%",
      cacheSize: newStats.cacheSize.l2, // L2 符号缓存大小
      maxSize: this.featureFlags.symbolCacheMaxSize,
      pendingQueries: 0, // 新缓存服务中的并发控制不暴露计数
    };
  }
}
