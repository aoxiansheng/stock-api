import {
  Injectable,
  Inject,
  Optional,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { createLogger, sanitizeLogData } from "@common/logging/index";
import { UniversalExceptionFactory, ComponentIdentifier, BusinessErrorCode, BusinessException } from '@common/core/exceptions';
import { TRANSFORMER_ERROR_CODES } from '../constants/transformer-error-codes.constants';

import { FlexibleMappingRuleService } from "../../../00-prepare/data-mapper/services/flexible-mapping-rule.service";
import { FlexibleMappingRuleResponseDto } from "../../../00-prepare/data-mapper/dto/flexible-mapping-rule.dto";
import { ObjectUtils } from "../../../shared/utils/object.util";
import { MappingDirection } from "@core/shared/constants";
import { SymbolTransformerService } from "@core/02-processing/symbol-transformer/services/symbol-transformer.service";
import { SymbolValidationUtils } from "@common/utils/symbol-validation.util";
import {
  isStandardSymbolIdentityProvider,
  isStandardIdentitySymbol,
  STANDARD_SYMBOL_IDENTITY_PROVIDERS_ENV_KEY,
} from "@core/shared/utils/provider-symbol-identity.util";


import {
  DATATRANSFORM_CONFIG,
  DATATRANSFORM_PERFORMANCE_THRESHOLDS,
} from "../constants/data-transformer.constants";
import { DataTransformationStatsDto } from "../dto/data-transform-interfaces.dto";
import { DataBatchTransformOptionsDto } from "../dto/data-transform-preview.dto";
import { DataTransformRequestDto } from "../dto/data-transform-request.dto";
import {
  DataTransformResponseDto,
  DataTransformationMetadataDto,
} from "../dto/data-transform-response.dto";

// 🎯 复用 common 模块的日志配置
// 🎯 复用 common 模块的转换常量

export interface DataTransformerRuntimeConfig {
  maxArraySize: number;
  maxRestoreConcurrency: number;
}

const DEFAULT_DATA_TRANSFORMER_RUNTIME_CONFIG: DataTransformerRuntimeConfig =
  Object.freeze({
    maxArraySize: DATATRANSFORM_CONFIG.MAX_ARRAY_LENGTH,
    maxRestoreConcurrency: 16,
  });

export const DATA_TRANSFORMER_RUNTIME_CONFIG = Symbol(
  "DATA_TRANSFORMER_RUNTIME_CONFIG",
);

@Injectable()
export class DataTransformerService {
  // 🎯 使用 common 模块的日志配置
  private readonly logger = createLogger(DataTransformerService.name);

  constructor(
    private readonly flexibleMappingRuleService: FlexibleMappingRuleService,
    private readonly symbolTransformerService: SymbolTransformerService,
    @Optional()
    @Inject(DATA_TRANSFORMER_RUNTIME_CONFIG)
    private readonly runtimeConfig: DataTransformerRuntimeConfig = DEFAULT_DATA_TRANSFORMER_RUNTIME_CONFIG,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Transform raw data using mapping rules
   */
  async transform(
    request: DataTransformRequestDto,
  ): Promise<DataTransformResponseDto> {
    const startTime = Date.now();
    const apiTypeCtx = request.apiType;

    this.logger.log(
      `Starting data transformation`,
      sanitizeLogData({
        provider: request.provider,
        transDataRuleListType: request.transDataRuleListType,
        mappingOutRuleId: request.mappingOutRuleId,
        hasRawData: !!request.rawData,
        apiType: apiTypeCtx,
      }),
    );

    try {
      const baseDataToProcess = Array.isArray(request.rawData)
        ? request.rawData
        : [request.rawData].filter(Boolean);

      if (
        baseDataToProcess.length === 0 &&
        (request.rawData === null || request.rawData === undefined)
      ) {
        const metadata = new DataTransformationMetadataDto(
          "",
          "",
          request.provider,
          request.transDataRuleListType,
          0,
          0,
          Date.now() - startTime,
        );
        return new DataTransformResponseDto([], metadata);
      }

      const sample = baseDataToProcess.length > 0 ? baseDataToProcess[0] : {};

      const transformMappingRule = await this.findMappingRule(
        request.provider,
        request.transDataRuleListType,
        request.mappingOutRuleId,
        apiTypeCtx,
        sample,
        request.marketType,
      );

      if (!transformMappingRule) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.TRANSFORMER,
          errorCode: BusinessErrorCode.DATA_NOT_FOUND,
          operation: 'transform',
          message: `No mapping rule found for provider '${request.provider}' and rule type '${request.transDataRuleListType}'`,
          context: {
            provider: request.provider,
            transDataRuleListType: request.transDataRuleListType,
            mappingOutRuleId: request.mappingOutRuleId,
            errorType: TRANSFORMER_ERROR_CODES.NO_MAPPING_RULE_FOUND
          },
          retryable: false
        });
      }

      const {
        records: dataToProcess,
        forceArrayResult,
      } = this.normalizeSourceRecordsForMapping(
        request,
        baseDataToProcess,
        transformMappingRule,
      );

      const ruleDoc = await this.flexibleMappingRuleService.getRuleDocumentById(
        transformMappingRule.id,
      );

      const transformedResults = [];
      let successfulTransformations = 0;

      for (const item of dataToProcess) {
        const result =
          await this.flexibleMappingRuleService.applyFlexibleMappingRule(
            ruleDoc,
            item,
            request.options?.includeDebugInfo || false,
          );

        if (result.success) {
          successfulTransformations++;
        }
        transformedResults.push(result.transformedData);
      }

      if (successfulTransformations === 0 && dataToProcess.length > 0) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.TRANSFORMER,
          errorCode: BusinessErrorCode.DATA_PROCESSING_FAILED,
          operation: 'transform',
          message: 'Transformation failed for all items in the request',
          context: {
            totalItems: dataToProcess.length,
            successfulTransformations,
            provider: request.provider,
            transDataRuleListType: request.transDataRuleListType,
            errorType: TRANSFORMER_ERROR_CODES.ALL_TRANSFORMATIONS_FAILED
          },
          retryable: true
        });
      }

      const finalData = forceArrayResult || Array.isArray(request.rawData)
        ? transformedResults
        : transformedResults[0];
      const restoredFinalData = await this.restoreStandardSymbols(
        request.provider,
        finalData,
        request.options,
      );

      const stats = this.calculateTransformationStats(
        restoredFinalData,
        transformMappingRule,
      );

      const processingTimeMs = Date.now() - startTime;

      const metadata = new DataTransformationMetadataDto(
        transformMappingRule.id,
        transformMappingRule.name,
        request.provider,
        request.transDataRuleListType,
        stats.recordsProcessed,
        stats.fieldsTransformed,
        processingTimeMs,
        request.options?.includeMetadata
          ? stats.transformationsApplied
          : undefined,
      );

      const logLevel =
        processingTimeMs >
        DATATRANSFORM_PERFORMANCE_THRESHOLDS.SLOW_TRANSFORMATION_MS
          ? "warn"
          : "log";
      this.logger[logLevel](
        `Data transformation completed successfully`,
        sanitizeLogData({
          dataMapperRuleId: transformMappingRule.id,
          recordsProcessed: stats.recordsProcessed,
          fieldsTransformed: stats.fieldsTransformed,
          processingTimeMs,
        }),
      );

      // 监控事件已移除；如需性能监控，请使用外部工具（如 Prometheus）

      if (
        processingTimeMs >
        DATATRANSFORM_PERFORMANCE_THRESHOLDS.SLOW_TRANSFORMATION_MS
      ) {
        this.logger.warn(`Data transformation performance warning: ${processingTimeMs}ms`, {
          provider: request.provider,
          transDataRuleListType: request.transDataRuleListType,
          processingTimeMs,
        });
      }

      return new DataTransformResponseDto(restoredFinalData, metadata);
    } catch (error: any) {
      const processingTimeMs = Date.now() - startTime;

      // 监控事件已移除；如需性能监控，请使用外部工具（如 Prometheus）

      this.logger.error(
        `Data transformation failed`,
        sanitizeLogData({
          provider: request.provider,
          transDataRuleListType: request.transDataRuleListType,
          error: error.message,
          stack: error.stack,
          processingTimeMs,
        }),
      );

      // 🎯 区分业务逻辑异常和系统异常
      // 业务逻辑异常应该直接传播，不重新包装
      if (BusinessException.isBusinessException(error)) {
        throw error;
      }

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error; // 直接传播业务逻辑异常
      }

      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.TRANSFORMER,
        errorCode: BusinessErrorCode.DATA_PROCESSING_FAILED,
        operation: 'transform',
        message: `Data transformation failed: ${error.message}`,
        context: {
          provider: request.provider,
          transDataRuleListType: request.transDataRuleListType,
          originalError: error.message,
          processingTimeMs: Date.now() - startTime,
          errorType: TRANSFORMER_ERROR_CODES.TRANSFORMATION_FAILED
        },
        retryable: true,
        originalError: error
      });
    }
  }

  /**
   * Batch transform multiple data sets
   */
  async transformBatch({
    requests,
    options = { continueOnError: false },
  }: {
    requests: DataTransformRequestDto[];
    options?: DataBatchTransformOptionsDto;
  }): Promise<DataTransformResponseDto[]> {
    const operation = "transformBatch_optimized";
    const startTime = Date.now();

    // 🎯 使用 common 模块的配置常量进行批量大小检查
    if (requests.length === 0) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.TRANSFORMER,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'transformBatch',
        message: 'Batch request cannot be empty',
        context: {
          batchSize: requests.length,
          errorType: TRANSFORMER_ERROR_CODES.EMPTY_BATCH_REQUEST
        },
        retryable: false
      });
    }

    if (requests.length > DATATRANSFORM_CONFIG.MAX_BATCH_SIZE) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.TRANSFORMER,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'transformBatch',
        message: `Batch size ${requests.length} exceeds maximum limit ${DATATRANSFORM_CONFIG.MAX_BATCH_SIZE}`,
        context: {
          batchSize: requests.length,
          maxAllowed: DATATRANSFORM_CONFIG.MAX_BATCH_SIZE,
          errorType: TRANSFORMER_ERROR_CODES.BATCH_SIZE_EXCEEDED
        },
        retryable: false
      });
    }

    this.logger.log(
      {
        operation,
        batchSize: requests.length,
        options,
        maxAllowed: DATATRANSFORM_CONFIG.MAX_BATCH_SIZE,
      },
      "Starting optimized batch transformation",
    );

    // Group requests by a unique rule identifier
    const requestsByRule = new Map<string, DataTransformRequestDto[]>();
    for (const request of requests) {
      const key =
        request.mappingOutRuleId ||
        `${request.provider}::${request.transDataRuleListType}::${(request.marketType || "*").toUpperCase()}`;
      if (!requestsByRule.has(key)) {
        requestsByRule.set(key, []);
      }
      requestsByRule.get(key).push(request);
    }

    const allPromises = Array.from(requestsByRule.entries()).map(
      async ([ruleKey, groupedRequests]) => {
        try {
          const firstReq = groupedRequests[0];
          const transformMappingRule = await this.findMappingRule(
            firstReq.provider,
            firstReq.transDataRuleListType,
            firstReq.mappingOutRuleId,
            firstReq.apiType,
            firstReq.rawData,
            firstReq.marketType,
          );

          if (!transformMappingRule) {
            // Handle case where no rule is found for the group
            // For batch operations, we throw exceptions that will be caught by the batch handler
            throw UniversalExceptionFactory.createBusinessException({
              component: ComponentIdentifier.TRANSFORMER,
              errorCode: BusinessErrorCode.DATA_NOT_FOUND,
              operation: 'transformBatch',
              message: `No mapping rule found for rule key: ${ruleKey}`,
              context: {
                ruleKey,
                provider: firstReq.provider,
                transDataRuleListType: firstReq.transDataRuleListType,
                errorType: TRANSFORMER_ERROR_CODES.NO_MAPPING_RULE_FOUND
              },
              retryable: false
            });
          }

          // Apply the single rule to all requests in the group, in parallel
          const groupPromises = groupedRequests.map((request) =>
            this._executeSingleTransform(request, transformMappingRule),
          );

          return await Promise.all(groupPromises);
        } catch (error) {
          if (!options.continueOnError) throw error;
          // For batch operations, we throw exceptions that will be caught by the batch handler
          throw UniversalExceptionFactory.createBusinessException({
            component: ComponentIdentifier.TRANSFORMER,
            errorCode: BusinessErrorCode.DATA_PROCESSING_FAILED,
            operation: 'transformBatch',
            message: `Batch transformation failed: ${error.message}`,
            context: {
              ruleKey,
              groupSize: groupedRequests.length,
              originalError: error.message,
              errorType: TRANSFORMER_ERROR_CODES.BATCH_TRANSFORMATION_FAILED
            },
            retryable: true,
            originalError: error
          });
        }
      },
    );

    const resultsNested = await Promise.allSettled(allPromises);
    const finalResponses: DataTransformResponseDto[] = [];
    let successCount = 0;
    let failedCount = 0;

    resultsNested.forEach((result) => {
      if (result.status === "fulfilled") {
        // 修复：过滤掉 undefined 的结果，只添加有效的结果
        const validResults = result.value.filter(r => r !== undefined);
        finalResponses.push(...validResults);
        successCount += validResults.length;
      } else {
        // This case should be rare if the inner try/catch is correct
        failedCount++;
        this.logger.error(
          { operation, error: result.reason.message },
          "Group Promise rejected in transformBatch",
        );
        
        // 如果设置了 continueOnError，我们不会重新抛出异常，但应该记录错误
        if (!options.continueOnError) {
          throw result.reason;
        }
      }
    });

    const processingTimeMs = Date.now() - startTime;

    // ✅ 事件化批量操作监控
    setImmediate(() => {
      // 性能指标事件已移除（监控模块已删除）
      // 如需性能监控，请使用外部工具（如 Prometheus）
    });

    this.logger.log(
      {
        operation,
        batchSize: requests.length,
        successful: finalResponses.length,
        failed: requests.length - finalResponses.length,
      },
      "Optimized batch transformation completed",
    );

    return finalResponses;
  }

  private async _executeSingleTransform(
    request: DataTransformRequestDto,
    transformMappingRule: FlexibleMappingRuleResponseDto,
  ): Promise<DataTransformResponseDto> {
    const startTime = Date.now();
    try {
      const ruleDoc = await this.flexibleMappingRuleService.getRuleDocumentById(
        transformMappingRule.id,
      );
      const baseDataToProcess = Array.isArray(request.rawData)
        ? request.rawData
        : [request.rawData].filter(Boolean);
      const {
        records: dataToProcess,
        forceArrayResult,
      } = this.normalizeSourceRecordsForMapping(
        request,
        baseDataToProcess,
        transformMappingRule,
      );

      const transformedResults: any[] = [];
      for (const item of dataToProcess) {
        const result =
          await this.flexibleMappingRuleService.applyFlexibleMappingRule(
            ruleDoc,
            item,
            request.options?.includeDebugInfo || false,
          );

        if (!result.success) {
          throw UniversalExceptionFactory.createBusinessException({
            component: ComponentIdentifier.TRANSFORMER,
            errorCode: BusinessErrorCode.DATA_PROCESSING_FAILED,
            operation: "_executeSingleTransform",
            message: result.errorMessage || "Single transformation failed",
            context: {
              ruleId: transformMappingRule.id,
              ruleName: transformMappingRule.name,
              provider: request.provider,
              transDataRuleListType: request.transDataRuleListType,
              errorType: TRANSFORMER_ERROR_CODES.RULE_APPLICATION_FAILED,
            },
            retryable: true,
          });
        }
        transformedResults.push(result.transformedData);
      }

      const finalData = forceArrayResult || Array.isArray(request.rawData)
        ? transformedResults
        : transformedResults[0];
      const transformedData = await this.restoreStandardSymbols(
        request.provider,
        finalData,
        request.options,
      );

      const stats = this.calculateTransformationStats(
        transformedData,
        transformMappingRule,
      );
      const processingTimeMs = Date.now() - startTime;

      const metadata = new DataTransformationMetadataDto(
        transformMappingRule.id,
        transformMappingRule.name,
        request.provider,
        request.transDataRuleListType,
        stats.recordsProcessed,
        stats.fieldsTransformed,
        processingTimeMs,
        request.options?.includeMetadata
          ? stats.transformationsApplied
          : undefined,
      );

      const logLevel =
        processingTimeMs >
        DATATRANSFORM_PERFORMANCE_THRESHOLDS.SLOW_TRANSFORMATION_MS
          ? "warn"
          : "log";
      this.logger[logLevel](
        `Single data transformation completed successfully`,
        sanitizeLogData({
          dataMapperRuleId: transformMappingRule.id,
          recordsProcessed: stats.recordsProcessed,
          processingTimeMs,
        }),
      );

      if (
        processingTimeMs >
        DATATRANSFORM_PERFORMANCE_THRESHOLDS.SLOW_TRANSFORMATION_MS
      ) {
        this.logger.warn(`Single data transformation performance warning: ${processingTimeMs}ms`, {
          dataMapperRuleId: transformMappingRule.id,
          processingTimeMs,
        });
      }

      return new DataTransformResponseDto(transformedData, metadata);
    } catch (error: any) {
      this.logger.error(
        `Single data transformation failed`,
        sanitizeLogData({
          dataMapperRuleId: transformMappingRule.id,
          error: error.message,
        }),
      );

      // 🎯 区分业务逻辑异常和系统异常
      // 业务逻辑异常应该直接传播，不重新包装
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error; // 直接传播业务逻辑异常
      }
      
      // 修复：确保所有其他类型的异常也被抛出，而不是静默处理
      throw error;
    }
  }

  private normalizeSourceRecordsForMapping(
    request: DataTransformRequestDto,
    records: unknown[],
    transformMappingRule: FlexibleMappingRuleResponseDto,
  ): {
    records: unknown[];
    forceArrayResult: boolean;
  } {
    const expansionPaths = this.collectArrayExpansionPaths(transformMappingRule);
    if (expansionPaths.length === 0) {
      return {
        records,
        forceArrayResult: false,
      };
    }

    let normalizedRecords = records;
    let forceArrayResult = false;

    for (const arrayPath of expansionPaths) {
      const { records: expandedRecords, applied } = this.expandRecordsByArrayPath(
        normalizedRecords,
        arrayPath,
      );
      if (!applied) {
        continue;
      }
      normalizedRecords = expandedRecords;
      forceArrayResult = true;
      this.logger.debug("Applied rule-driven array expansion before mapping", {
        provider: request.provider,
        transDataRuleListType: request.transDataRuleListType,
        arrayPath,
        expandedSize: expandedRecords.length,
      });
    }

    return {
      records: normalizedRecords,
      forceArrayResult,
    };
  }

  private collectArrayExpansionPaths(
    transformMappingRule: FlexibleMappingRuleResponseDto,
  ): string[] {
    const candidatePaths = new Set<string>();
    const mappings = transformMappingRule.fieldMappings || [];
    for (const mapping of mappings) {
      const sourceFieldPath = String(mapping?.sourceFieldPath || "").trim();
      if (!sourceFieldPath || !sourceFieldPath.includes(".")) {
        continue;
      }
      const segments = sourceFieldPath.split(".").filter(Boolean);
      for (let index = 1; index < segments.length; index += 1) {
        candidatePaths.add(segments.slice(0, index).join("."));
      }
    }

    return Array.from(candidatePaths).sort(
      (left, right) => left.split(".").length - right.split(".").length,
    );
  }

  private expandRecordsByArrayPath(
    records: unknown[],
    arrayPath: string,
  ): { records: unknown[]; applied: boolean } {
    let applied = false;
    const expandedRecords: unknown[] = [];

    for (const record of records) {
      if (!this.isPlainObjectRecord(record)) {
        expandedRecords.push(record);
        continue;
      }

      const arrayValue = ObjectUtils.getValueFromPath(record, arrayPath);
      if (!Array.isArray(arrayValue)) {
        expandedRecords.push(record);
        continue;
      }

      applied = true;
      for (const point of arrayValue) {
        if (!this.isPlainObjectRecord(point)) {
          continue;
        }
        expandedRecords.push(this.mergeRecordWithArrayPoint(record, arrayPath, point));
      }
    }

    return {
      records: applied ? expandedRecords : records,
      applied,
    };
  }

  private mergeRecordWithArrayPoint(
    record: Record<string, unknown>,
    arrayPath: string,
    point: Record<string, unknown>,
  ): Record<string, unknown> {
    const merged = {
      ...record,
      ...point,
    };
    return this.assignPathValue(merged, arrayPath, point);
  }

  private assignPathValue(
    target: Record<string, unknown>,
    path: string,
    value: unknown,
  ): Record<string, unknown> {
    const segments = path.split(".").filter(Boolean);
    if (segments.length === 0) {
      return target;
    }

    let cursor: Record<string, unknown> = target;
    for (let index = 0; index < segments.length - 1; index += 1) {
      const key = segments[index];
      const nextValue = cursor[key];
      if (!this.isPlainObjectRecord(nextValue)) {
        cursor[key] = {};
      } else {
        cursor[key] = { ...nextValue };
      }
      cursor = cursor[key] as Record<string, unknown>;
    }

    cursor[segments[segments.length - 1]] = value;
    return target;
  }

  private isPlainObjectRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  // createErrorResponse method removed - errors are now handled via exceptions

  /**
   * Find appropriate mapping rule
   */
  private async findMappingRule(
    provider: string,
    transDataRuleListType: string,
    ruleId?: string,
    apiType: "rest" | "stream" = "rest",
    rawDataSample?: any,
    marketType?: string,
  ): Promise<FlexibleMappingRuleResponseDto | null> {
    if (ruleId) {
      // Use specific rule if provided - 可能抛出 NotFoundException，让它传播
      return await this.flexibleMappingRuleService.findRuleById(ruleId);
    } else {
      // 获取最佳匹配规则
      let bestRule =
        await this.flexibleMappingRuleService.findBestMatchingRule(
          provider,
          apiType,
          transDataRuleListType,
          marketType,
        );

      // 市场精确匹配失败时，仅降级到“规则 marketType=*”候选，避免跨市场误匹配
      if (
        !bestRule &&
        typeof marketType === "string" &&
        marketType.trim() &&
        marketType.trim() !== "*"
      ) {
        this.logger.warn("未命中市场特定映射规则，尝试使用通配市场规则", {
          provider,
          apiType,
          transDataRuleListType,
          requestedMarketType: marketType,
        });

        bestRule =
          await this.flexibleMappingRuleService.findBestWildcardMarketRule(
          provider,
          apiType,
          transDataRuleListType,
        );
      }

      if (bestRule && rawDataSample) {
        // 验证规则与原始数据的兼容性
        const mappings = bestRule.fieldMappings || [];
        const hits = mappings.reduce((cnt, m) => {
          const val = ObjectUtils.getValueFromPath(
            rawDataSample,
            m.sourceFieldPath,
          );
          return cnt + (val !== undefined ? 1 : 0);
        }, 0);

        this.logger.debug(
          "Selected mapping rule hit statistics",
          sanitizeLogData({
            provider,
            transDataRuleListType,
            apiType,
            selectedRule: { id: bestRule.id, name: bestRule.name },
            hits,
            totalMappings: mappings.length,
          }),
        );
      }

      return bestRule;
    }
  }

  /**
   * Calculate transformation statistics
   */
  private calculateTransformationStats(
    transformedData: any,
    transformMappingRule: FlexibleMappingRuleResponseDto,
  ): DataTransformationStatsDto {
    const dataArray = Array.isArray(transformedData)
      ? transformedData
      : [transformedData];
    const recordsProcessed = dataArray.length;

    const transformationsApplied = transformMappingRule.fieldMappings.map(
      (mapping) => ({
        sourceField: mapping.sourceFieldPath,
        targetField: mapping.targetField,
        transformType: mapping.transform?.type,
        transformValue: mapping.transform?.value,
      }),
    );

    const fieldsTransformed = transformMappingRule.fieldMappings.length;

    return {
      recordsProcessed,
      fieldsTransformed,
      transformationsApplied,
    };
  }

  private async restoreStandardSymbols(
    provider: string,
    transformedData: any,
    options?: DataTransformRequestDto["options"],
  ): Promise<any> {
    const isIdentityProvider = this.isIdentityProviderEnabled(provider);

    const mapSymbol = async (item: any): Promise<any> => {
      if (!item || typeof item !== "object") {
        return item;
      }

      const symbol = item.symbol;

      if (isIdentityProvider) {
        if (!("symbol" in item) || symbol === undefined) {
          return item;
        }

        if (typeof symbol !== "string" || !symbol.trim()) {
          throw UniversalExceptionFactory.createBusinessException({
            component: ComponentIdentifier.TRANSFORMER,
            errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
            operation: "restoreStandardSymbols",
            message: `Identity provider '${provider}' requires symbol to be a non-empty string`,
            context: {
              provider,
              symbol,
              errorType: TRANSFORMER_ERROR_CODES.INVALID_REQUEST_DATA,
            },
            retryable: false,
          });
        }

        if (!isStandardIdentitySymbol(symbol)) {
          throw UniversalExceptionFactory.createBusinessException({
            component: ComponentIdentifier.TRANSFORMER,
            errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
            operation: "restoreStandardSymbols",
            message: `Identity provider '${provider}' produced non-standard symbol '${symbol}'`,
            context: {
              provider,
              symbol,
              restoredSymbol: symbol,
              errorType: TRANSFORMER_ERROR_CODES.INVALID_REQUEST_DATA,
            },
            retryable: false,
          });
        }

        const canonicalSymbol = SymbolValidationUtils.normalizeSymbol(symbol);
        return canonicalSymbol === symbol
          ? item
          : { ...item, symbol: canonicalSymbol };
      }

      if (typeof symbol !== "string" || !symbol.trim()) {
        return item;
      }

      const canonicalSymbol = SymbolValidationUtils.normalizeSymbol(symbol);
      if (!canonicalSymbol) {
        return item;
      }

      let restored: string;
      try {
        restored = await this.symbolTransformerService.transformSingleSymbol(
          provider,
          symbol,
          MappingDirection.TO_STANDARD,
        );
      } catch (error: any) {
        if (BusinessException.isBusinessException(error)) {
          throw error;
        }

        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.TRANSFORMER,
          errorCode: BusinessErrorCode.DATA_PROCESSING_FAILED,
          operation: "restoreStandardSymbols",
          message: `Failed to restore symbol '${symbol}' for provider '${provider}'`,
          context: {
            provider,
            symbol,
            errorType: TRANSFORMER_ERROR_CODES.TRANSFORMATION_FAILED,
            originalError: error?.message,
          },
          retryable: false,
          originalError: error,
        });
      }

      const canonicalRestoredSymbol =
        typeof restored === "string"
          ? SymbolValidationUtils.normalizeSymbol(restored)
          : "";

      if (!canonicalRestoredSymbol) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.TRANSFORMER,
          errorCode: BusinessErrorCode.DATA_PROCESSING_FAILED,
          operation: "restoreStandardSymbols",
          message: `Symbol restoration returned invalid symbol for provider '${provider}'`,
          context: {
            provider,
            symbol,
            restoredSymbol: restored,
            errorType: TRANSFORMER_ERROR_CODES.TRANSFORMATION_FAILED,
          },
          retryable: false,
        });
      }

      if (
        canonicalRestoredSymbol === canonicalSymbol &&
        !SymbolValidationUtils.isValidMarketFormat(canonicalRestoredSymbol)
      ) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.TRANSFORMER,
          errorCode: BusinessErrorCode.DATA_NOT_FOUND,
          operation: "restoreStandardSymbols",
          message: `No standard symbol mapping found for provider '${provider}' and symbol '${symbol}'`,
          context: {
            provider,
            symbol,
            restoredSymbol: canonicalRestoredSymbol,
            errorType: TRANSFORMER_ERROR_CODES.NO_MAPPING_RULE_FOUND,
          },
          retryable: false,
        });
      }

      if (canonicalRestoredSymbol === canonicalSymbol) {
        return canonicalSymbol === symbol
          ? item
          : { ...item, symbol: canonicalSymbol };
      }

      return { ...item, symbol: canonicalRestoredSymbol };
    };

    if (Array.isArray(transformedData)) {
      const {
        maxArraySize,
        maxRestoreConcurrency,
        requestMaxArraySize,
        runtimeMaxArraySize,
        requestMaxRestoreConcurrency,
        runtimeMaxRestoreConcurrency,
      } = this.resolveRestoreLimits(options);

      if (transformedData.length > maxArraySize) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.TRANSFORMER,
          errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
          operation: "restoreStandardSymbols",
          message: `Array size ${transformedData.length} exceeds maxArraySize ${maxArraySize} (request=${requestMaxArraySize ?? "unset"}, runtime=${runtimeMaxArraySize}, effective=${maxArraySize})`,
          context: {
            provider,
            arraySize: transformedData.length,
            maxArraySize,
            maxArraySizeLimit: {
              request: requestMaxArraySize,
              runtime: runtimeMaxArraySize,
              effective: maxArraySize,
            },
            maxRestoreConcurrencyLimit: {
              request: requestMaxRestoreConcurrency,
              runtime: runtimeMaxRestoreConcurrency,
              effective: maxRestoreConcurrency,
            },
            errorType: TRANSFORMER_ERROR_CODES.BATCH_SIZE_EXCEEDED,
          },
          retryable: false,
        });
      }

      return this.mapWithConcurrencyLimit(
        transformedData,
        maxRestoreConcurrency,
        mapSymbol,
      );
    }

    return mapSymbol(transformedData);
  }

  private isIdentityProviderEnabled(provider: string): boolean {
    const identityProviderRaw = this.configService.get<string>(
      STANDARD_SYMBOL_IDENTITY_PROVIDERS_ENV_KEY,
    );
    return isStandardSymbolIdentityProvider(provider, identityProviderRaw);
  }

  private resolveRestoreLimits(options?: DataTransformRequestDto["options"]): {
    maxArraySize: number;
    maxRestoreConcurrency: number;
    requestMaxArraySize: number | null;
    runtimeMaxArraySize: number;
    requestMaxRestoreConcurrency: number | null;
    runtimeMaxRestoreConcurrency: number;
  } {
    const requestMaxArraySize = options?.maxArraySize ?? null;
    const runtimeMaxArraySize = this.runtimeConfig.maxArraySize;
    const maxArraySize =
      requestMaxArraySize === null
        ? runtimeMaxArraySize
        : Math.min(requestMaxArraySize, runtimeMaxArraySize);

    const requestMaxRestoreConcurrency = options?.maxRestoreConcurrency ?? null;
    const runtimeMaxRestoreConcurrency = Math.max(
      1,
      this.runtimeConfig.maxRestoreConcurrency,
    );
    const maxRestoreConcurrency = Math.max(
      1,
      requestMaxRestoreConcurrency === null
        ? runtimeMaxRestoreConcurrency
        : Math.min(requestMaxRestoreConcurrency, runtimeMaxRestoreConcurrency),
    );

    return {
      maxArraySize,
      maxRestoreConcurrency,
      requestMaxArraySize,
      runtimeMaxArraySize,
      requestMaxRestoreConcurrency,
      runtimeMaxRestoreConcurrency,
    };
  }

  private async mapWithConcurrencyLimit<T, R>(
    items: T[],
    maxConcurrency: number,
    mapper: (item: T) => Promise<R>,
  ): Promise<R[]> {
    if (items.length === 0) {
      return [];
    }

    const results = new Array<R>(items.length);
    const workerCount = Math.max(1, Math.min(maxConcurrency, items.length));
    let cursor = 0;

    const workers = Array.from({ length: workerCount }, async () => {
      while (cursor < items.length) {
        const currentIndex = cursor++;
        results[currentIndex] = await mapper(items[currentIndex]);
      }
    });

    await Promise.all(workers);
    return results;
  }
}
