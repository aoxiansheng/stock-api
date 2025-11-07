import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";

import { createLogger, sanitizeLogData } from "@common/logging/index";
import { UniversalExceptionFactory, ComponentIdentifier, BusinessErrorCode } from '@common/core/exceptions';
import { TRANSFORMER_ERROR_CODES } from '../constants/transformer-error-codes.constants';

import { FlexibleMappingRuleService } from "../../../00-prepare/data-mapper/services/flexible-mapping-rule.service";
import { FlexibleMappingRuleResponseDto } from "../../../00-prepare/data-mapper/dto/flexible-mapping-rule.dto";
import { ObjectUtils } from "../../../shared/utils/object.util";


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

@Injectable()
export class DataTransformerService {
  // 🎯 使用 common 模块的日志配置
  private readonly logger = createLogger(DataTransformerService.name);

  constructor(
    private readonly flexibleMappingRuleService: FlexibleMappingRuleService,
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
      const dataToProcess = Array.isArray(request.rawData)
        ? request.rawData
        : [request.rawData].filter(Boolean);

      if (
        dataToProcess.length === 0 &&
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

      const sample = dataToProcess.length > 0 ? dataToProcess[0] : {};

      const transformMappingRule = await this.findMappingRule(
        request.provider,
        request.transDataRuleListType,
        request.mappingOutRuleId,
        apiTypeCtx,
        sample,
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

      const finalData = Array.isArray(request.rawData)
        ? transformedResults
        : transformedResults[0];

      const stats = this.calculateTransformationStats(
        finalData,
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

      return new DataTransformResponseDto(finalData, metadata);
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
        `${request.provider}::${request.transDataRuleListType}`;
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

      const result =
        await this.flexibleMappingRuleService.applyFlexibleMappingRule(
          ruleDoc,
          request.rawData,
          request.options?.includeDebugInfo || false,
        );

      if (!result.success) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.TRANSFORMER,
          errorCode: BusinessErrorCode.DATA_PROCESSING_FAILED,
          operation: '_executeSingleTransform',
          message: result.errorMessage || 'Single transformation failed',
          context: {
            ruleId: transformMappingRule.id,
            ruleName: transformMappingRule.name,
            provider: request.provider,
            transDataRuleListType: request.transDataRuleListType,
            errorType: TRANSFORMER_ERROR_CODES.RULE_APPLICATION_FAILED
          },
          retryable: true
        });
      }

      const transformedData = result.transformedData;

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
  ): Promise<FlexibleMappingRuleResponseDto | null> {
    if (ruleId) {
      // Use specific rule if provided - 可能抛出 NotFoundException，让它传播
      return await this.flexibleMappingRuleService.findRuleById(ruleId);
    } else {
      // 获取最佳匹配规则
      const bestRule =
        await this.flexibleMappingRuleService.findBestMatchingRule(
          provider,
          apiType,
          transDataRuleListType,
        );

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
}
