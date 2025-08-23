import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";

import { createLogger, sanitizeLogData } from "@common/config/logger.config";

import { FlexibleMappingRuleService } from "../../../00-prepare/data-mapper/services/flexible-mapping-rule.service";
import { FlexibleMappingRuleResponseDto } from "../../../00-prepare/data-mapper/dto/flexible-mapping-rule.dto";
import { ObjectUtils } from "../../../shared/utils/object.util";
import { InfrastructureMetricsRegistryService } from '../../../../monitoring/infrastructure/metrics/infrastructure-metrics-registry.service';
import { MetricsHelper } from "../../../../monitoring/infrastructure/helper/metrics-helper";

import {
  DATATRANSFORM_ERROR_MESSAGES,
  DATATRANSFORM_CONFIG,
  DATATRANSFORM_PERFORMANCE_THRESHOLDS,
} from "../constants/data-transformer.constants";
import {
  DataTransformationStatsDto,
} from "../dto/data-transform-interfaces.dto";
import {
  DataBatchTransformOptionsDto,
} from "../dto/data-transform-preview.dto";
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
    private readonly metricsRegistry: InfrastructureMetricsRegistryService,
  ) {}

  /**
   * Transform raw data using mapping rules
   */
  async transform(request: DataTransformRequestDto): Promise<DataTransformResponseDto> {
    const startTime = Date.now();
    const apiTypeCtx = request.apiType;

    MetricsHelper.inc(this.metricsRegistry, "transformerOperationsTotal", {
      operation_type: "transform",
      provider: request.provider || "unknown",
    });

    this.logger.log(
      `开始数据转换`,
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

      if (dataToProcess.length === 0 && (request.rawData === null || request.rawData === undefined)) {
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
        throw new NotFoundException(
          `${DATATRANSFORM_ERROR_MESSAGES.NO_MAPPING_RULE}: provider '${request.provider}', transDataRuleListType '${request.transDataRuleListType}'`,
        );
      }
      
      const ruleDoc = await this.flexibleMappingRuleService.getRuleDocumentById(transformMappingRule.id);

      const transformedResults = [];
      let successfulTransformations = 0;

      for (const item of dataToProcess) {
        const result = await this.flexibleMappingRuleService.applyFlexibleMappingRule(
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
          throw new BadRequestException('Transformation failed for all items in the request.');
      }

      const finalData = Array.isArray(request.rawData) ? transformedResults : transformedResults[0];

      const stats = this.calculateTransformationStats(
        finalData,
        transformMappingRule,
      );

      const processingTime = Date.now() - startTime;

      const metadata = new DataTransformationMetadataDto(
        transformMappingRule.id,
        transformMappingRule.name,
        request.provider,
        request.transDataRuleListType,
        stats.recordsProcessed,
        stats.fieldsTransformed,
        processingTime,
        request.options?.includeMetadata
          ? stats.transformationsApplied
          : undefined,
      );

      const logLevel =
        processingTime > DATATRANSFORM_PERFORMANCE_THRESHOLDS.SLOW_TRANSFORMATION_MS
          ? "warn"
          : "log";
      this.logger[logLevel](
        `数据转换成功完成`,
        sanitizeLogData({
          dataMapperRuleId: transformMappingRule.id,
          recordsProcessed: stats.recordsProcessed,
          fieldsTransformed: stats.fieldsTransformed,
          processingTime,
        }),
      );

      MetricsHelper.observe(
        this.metricsRegistry,
        "transformerBatchSize",
        dataToProcess.length,
        { operation_type: "transform" },
      );
      
      const successRate = dataToProcess.length > 0 ? (successfulTransformations / dataToProcess.length) * 100 : 100;
      MetricsHelper.setGauge(
        this.metricsRegistry,
        "transformerSuccessRate",
        successRate,
        { operation_type: "transform" },
      );

      if (processingTime > DATATRANSFORM_PERFORMANCE_THRESHOLDS.SLOW_TRANSFORMATION_MS) {
        this.logger.warn(`数据转换性能警告: ${processingTime}ms`, {
          provider: request.provider,
          transDataRuleListType: request.transDataRuleListType,
          processingTime,
        });
      }

      return new DataTransformResponseDto(finalData, metadata);
    } catch (error: any) {
      const processingTime = Date.now() - startTime;

      MetricsHelper.setGauge(this.metricsRegistry, "transformerSuccessRate", 0, {
        operation_type: "transform",
      });

      this.logger.error(
        `数据转换失败`,
        sanitizeLogData({
          provider: request.provider,
          transDataRuleListType: request.transDataRuleListType,
          error: error.message,
          stack: error.stack,
          processingTime,
        }),
      );

      // 🎯 区分业务逻辑异常和系统异常
      // 业务逻辑异常应该直接传播，不重新包装
      if (error instanceof NotFoundException || 
          error instanceof BadRequestException || 
          error instanceof UnauthorizedException ||
          error instanceof ForbiddenException) {
        throw error; // 直接传播业务逻辑异常
      }

      throw new BadRequestException(
        `${DATATRANSFORM_ERROR_MESSAGES.TRANSFORMATION_FAILED}: ${error.message}`,
      );
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

    // 🎯 记录批量转换操作
    MetricsHelper.inc(
      this.metricsRegistry,
      'transformerOperationsTotal',
      { operation_type: 'batch_transform', provider: 'batch' }
    );

    // 🎯 记录批量大小
    MetricsHelper.observe(
      this.metricsRegistry,
      'transformerBatchSize',
      requests.length,
      { operation_type: 'batch_transform' }
    );

    // 🎯 使用 common 模块的配置常量进行批量大小检查
    if (requests.length === 0) {
      throw new BadRequestException(
        `${DATATRANSFORM_ERROR_MESSAGES.BATCH_TRANSFORMATION_FAILED}: 批量请求不能为空`,
      );
    }

    if (requests.length > DATATRANSFORM_CONFIG.MAX_BATCH_SIZE) {
      throw new BadRequestException(
        `${DATATRANSFORM_ERROR_MESSAGES.BATCH_TRANSFORMATION_FAILED}: 批量大小 ${requests.length} 超过最大限制 ${DATATRANSFORM_CONFIG.MAX_BATCH_SIZE}`,
      );
    }

    this.logger.log(
      {
        operation,
        batchSize: requests.length,
        options,
        maxAllowed: DATATRANSFORM_CONFIG.MAX_BATCH_SIZE,
      },
      "开始优化批量转换",
    );

    // Group requests by a unique rule identifier
    const requestsByRule = new Map<string, DataTransformRequestDto[]>();
    for (const request of requests) {
      const key =
        request.mappingOutRuleId || `${request.provider}::${request.transDataRuleListType}`;
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
            throw new NotFoundException(
              `${DATATRANSFORM_ERROR_MESSAGES.NO_MAPPING_RULE}: key '${ruleKey}'`,
            );
          }

          // Apply the single rule to all requests in the group, in parallel
          const groupPromises = groupedRequests.map((request) =>
            this._executeSingleTransform(request, transformMappingRule),
          );

          return await Promise.all(groupPromises);
        } catch (error) {
          if (!options.continueOnError) throw error;
          // For batch operations, we throw exceptions that will be caught by the batch handler
          throw new BadRequestException(
            `${DATATRANSFORM_ERROR_MESSAGES.BATCH_TRANSFORMATION_FAILED}: ${error.message}`,
          );
        }
      },
    );

    const resultsNested = await Promise.allSettled(allPromises);
    const finalResponses: DataTransformResponseDto[] = [];

    resultsNested.forEach((result) => {
      if (result.status === "fulfilled") {
        finalResponses.push(...result.value);
      } else {
        // This case should be rare if the inner try/catch is correct
        this.logger.error(
          { operation, error: result.reason.message },
          "transformBatch中的组Promise被拒绝",
        );
      }
    });

    this.logger.log(
      {
        operation,
        batchSize: requests.length,
        successful: finalResponses.length,
        failed: requests.length - finalResponses.length,
      },
      "优化批量转换完成",
    );

    return finalResponses;
  }

  private async _executeSingleTransform(
    request: DataTransformRequestDto,
    transformMappingRule: FlexibleMappingRuleResponseDto,
  ): Promise<DataTransformResponseDto> {
    const startTime = Date.now();
    try {
      const ruleDoc = await this.flexibleMappingRuleService.getRuleDocumentById(transformMappingRule.id);

      const result = await this.flexibleMappingRuleService.applyFlexibleMappingRule(
        ruleDoc,
        request.rawData,
        request.options?.includeDebugInfo || false,
      );

      if (!result.success) {
        throw new BadRequestException(
          result.errorMessage || 'Transformation failed'
        );
      }
      
      const transformedData = result.transformedData;

      const stats = this.calculateTransformationStats(
        transformedData,
        transformMappingRule,
      );
      const processingTime = Date.now() - startTime;

      const metadata = new DataTransformationMetadataDto(
        transformMappingRule.id,
        transformMappingRule.name,
        request.provider,
        request.transDataRuleListType,
        stats.recordsProcessed,
        stats.fieldsTransformed,
        processingTime,
        request.options?.includeMetadata
          ? stats.transformationsApplied
          : undefined,
      );

      const logLevel =
        processingTime > DATATRANSFORM_PERFORMANCE_THRESHOLDS.SLOW_TRANSFORMATION_MS
          ? "warn"
          : "log";
      this.logger[logLevel](
        `单次数据转换成功完成`,
        sanitizeLogData({
          dataMapperRuleId: transformMappingRule.id,
          recordsProcessed: stats.recordsProcessed,
          processingTime,
        }),
      );

      if (processingTime > DATATRANSFORM_PERFORMANCE_THRESHOLDS.SLOW_TRANSFORMATION_MS) {
        this.logger.warn(`单次数据转换性能警告: ${processingTime}ms`, {
          dataMapperRuleId: transformMappingRule.id,
          processingTime,
        });
      }

      return new DataTransformResponseDto(transformedData, metadata);
    } catch (error: any) {
      this.logger.error(
        `单次数据转换失败`,
        sanitizeLogData({
          dataMapperRuleId: transformMappingRule.id,
          error: error.message,
        }),
      );

      // 🎯 区分业务逻辑异常和系统异常
      // 业务逻辑异常应该直接传播，不重新包装
      if (error instanceof NotFoundException || 
          error instanceof BadRequestException || 
          error instanceof UnauthorizedException ||
          error instanceof ForbiddenException) {
        throw error; // 直接传播业务逻辑异常
      }

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
    apiType: 'rest' | 'stream' = 'rest',
    rawDataSample?: any,
  ): Promise<FlexibleMappingRuleResponseDto | null> {
    if (ruleId) {
      // Use specific rule if provided - 可能抛出 NotFoundException，让它传播
      return await this.flexibleMappingRuleService.findRuleById(ruleId);
    } else {
      // 获取最佳匹配规则
      const bestRule = await this.flexibleMappingRuleService.findBestMatchingRule(
        provider,
        apiType,
        transDataRuleListType,
      );

      
      if (bestRule && rawDataSample) {
        // 验证规则与原始数据的兼容性
        const mappings = bestRule.fieldMappings || [];
        const hits = mappings.reduce((cnt, m) => {
          const val = ObjectUtils.getValueFromPath(rawDataSample, m.sourceFieldPath);
          return cnt + (val !== undefined ? 1 : 0);
        }, 0);
        
        this.logger.debug('选择的映射规则命中统计', sanitizeLogData({
          provider,
          transDataRuleListType,
          apiType,
          selectedRule: { id: bestRule.id, name: bestRule.name },
          hits,
          totalMappings: mappings.length,
        }));
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

    const transformationsApplied = transformMappingRule.fieldMappings.map((mapping) => ({
      sourceField: mapping.sourceFieldPath,
      targetField: mapping.targetField,
      transformType: mapping.transform?.type,
      transformValue: mapping.transform?.value,
    }));

    const fieldsTransformed = transformMappingRule.fieldMappings.length;

    return {
      recordsProcessed,
      fieldsTransformed,
      transformationsApplied,
    };
  }


}