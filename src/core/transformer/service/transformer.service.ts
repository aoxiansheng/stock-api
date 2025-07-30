import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";

import { createLogger, sanitizeLogData } from "@common/config/logger.config";

import { DataMapperService } from "../../data-mapper/service/data-mapper.service";
import { DataMappingResponseDto } from "../../data-mapper/dto/data-mapping-response.dto";
import { ObjectUtils } from "../../shared/utils/object.util";

import {
  TRANSFORM_ERROR_MESSAGES,
  TRANSFORM_WARNING_MESSAGES,
  TRANSFORM_CONFIG,
  TRANSFORM_PERFORMANCE_THRESHOLDS,
} from "../constants/transformer.constants";
import {
  DataTransformRuleDto,
  TransformValidationDto,
  TransformationStatsDto,
} from "../dto/transform-interfaces.dto";
import {
  TransformPreviewDto,
  TransformMappingRuleInfoDto,
  TransformFieldMappingPreviewDto,
  BatchTransformOptionsDto,
} from "../dto/transform-preview.dto";
import { TransformRequestDto } from "../dto/transform-request.dto";
import {
  TransformResponseDto,
  TransformationMetadataDto,
} from "../dto/transform-response.dto";

// 🎯 复用 common 模块的日志配置
// 🎯 复用 common 模块的转换常量

@Injectable()
export class TransformerService {
  // 🎯 使用 common 模块的日志配置
  private readonly logger = createLogger(TransformerService.name);

  constructor(private readonly dataMapperService: DataMapperService) {}

  /**
   * Transform raw data using mapping rules
   */
  async transform(request: TransformRequestDto): Promise<TransformResponseDto> {
    const startTime = Date.now();

    // 🎯 使用 common 模块的日志脱敏功能
    this.logger.log(
      `开始数据转换`,
      sanitizeLogData({
        provider: request.provider,
        transDataRuleListType: request.transDataRuleListType,
        mappingOutRuleId: request.mappingOutRuleId,
        hasRawData: !!request.rawData,
      }),
    );

    try {
      // 1. Find appropriate mapping rule
      const transformMappingRule = await this.findMappingRule(
        request.provider,
        request.transDataRuleListType,
        request.mappingOutRuleId,
      );

      if (!transformMappingRule) {
        // 抛出异常而不是返回错误响应，符合新的架构设计
        throw new NotFoundException(
          `${TRANSFORM_ERROR_MESSAGES.NO_MAPPING_RULE}: provider '${request.provider}', transDataRuleListType '${request.transDataRuleListType}'`,
        );
      }

      // 2. Apply transformation
      const transformedData = await this.dataMapperService.applyMappingRule(
        transformMappingRule.id,
        request.rawData,
      );

      // 3. Validate output if requested
      const validationErrors: string[] = [];
      const warnings: string[] = [];

      if (request.options?.validateOutput) {
        const validation = this.validateTransformedData(
          transformedData,
          transformMappingRule,
        );
        validationErrors.push(...validation.errors);
        warnings.push(...validation.warnings);
      }

      // 4. Calculate transformation statistics
      const stats = this.calculateTransformationStats(
        transformedData,
        transformMappingRule,
      );

      const processingTime = Date.now() - startTime;

      // 5. Build metadata
      const metadata = new TransformationMetadataDto(
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

      // 🎯 使用 common 模块的日志脱敏功能和性能阈值
      const logLevel =
        processingTime > TRANSFORM_PERFORMANCE_THRESHOLDS.SLOW_TRANSFORMATION_MS
          ? "warn"
          : "log";
      this.logger[logLevel](
        `数据转换成功完成`,
        sanitizeLogData({
          ruleId: transformMappingRule.id,
          recordsProcessed: stats.recordsProcessed,
          fieldsTransformed: stats.fieldsTransformed,
          processingTime,
          hasErrors: validationErrors.length > 0,
          hasWarnings: warnings.length > 0,
          isSlowTransformation:
            processingTime >
            TRANSFORM_PERFORMANCE_THRESHOLDS.SLOW_TRANSFORMATION_MS,
        }),
      );

      // 🎯 性能警告检查
      if (
        processingTime > TRANSFORM_PERFORMANCE_THRESHOLDS.SLOW_TRANSFORMATION_MS
      ) {
        warnings.push(
          `${TRANSFORM_WARNING_MESSAGES.PERFORMANCE_WARNING}: ${processingTime}ms`,
        );
      }
      if (
        stats.recordsProcessed >
        TRANSFORM_PERFORMANCE_THRESHOLDS.LARGE_DATASET_SIZE
      ) {
        warnings.push(
          `${TRANSFORM_WARNING_MESSAGES.LARGE_DATASET_WARNING}: ${stats.recordsProcessed} records`,
        );
      }

      if (validationErrors.length > 0) {
        // 抛出异常而不是返回错误响应，符合新的架构设计
        throw new BadRequestException(validationErrors.join("; "));
      }

      // 警告信息通过日志记录，不在响应中返回
      if (warnings.length > 0) {
        this.logger.warn(
          `数据转换警告`,
          sanitizeLogData({
            provider: request.provider,
            transDataRuleListType: request.transDataRuleListType,
            warnings,
            operation: "transformData",
          }),
        );
      }

      return new TransformResponseDto(transformedData, metadata);
    } catch (error: any) {
      const processingTime = Date.now() - startTime;

      // 🎯 使用 common 模块的日志脱敏功能
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

      // 抛出异常而不是返回错误响应，符合新的架构设计
      throw new InternalServerErrorException(
        `${TRANSFORM_ERROR_MESSAGES.TRANSFORMATION_FAILED}: ${error.message}`,
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
    requests: TransformRequestDto[];
    options?: BatchTransformOptionsDto;
  }): Promise<TransformResponseDto[]> {
    const operation = "transformBatch_optimized";

    // 🎯 使用 common 模块的配置常量进行批量大小检查
    if (requests.length > TRANSFORM_CONFIG.MAX_BATCH_SIZE) {
      throw new BadRequestException(
        `${TRANSFORM_ERROR_MESSAGES.BATCH_TRANSFORMATION_FAILED}: 批量大小 ${requests.length} 超过最大限制 ${TRANSFORM_CONFIG.MAX_BATCH_SIZE}`,
      );
    }

    this.logger.log(
      {
        operation,
        batchSize: requests.length,
        options,
        maxAllowed: TRANSFORM_CONFIG.MAX_BATCH_SIZE,
      },
      "开始优化批量转换",
    );

    // Group requests by a unique rule identifier
    const requestsByRule = new Map<string, TransformRequestDto[]>();
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
          );

          if (!transformMappingRule) {
            // Handle case where no rule is found for the group
            // For batch operations, we throw exceptions that will be caught by the batch handler
            throw new NotFoundException(
              `${TRANSFORM_ERROR_MESSAGES.NO_MAPPING_RULE}: key '${ruleKey}'`,
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
          throw new InternalServerErrorException(
            `${TRANSFORM_ERROR_MESSAGES.BATCH_TRANSFORMATION_FAILED}: ${error.message}`,
          );
        }
      },
    );

    const resultsNested = await Promise.allSettled(allPromises);
    const finalResponses: TransformResponseDto[] = [];

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
    request: TransformRequestDto,
    transformMappingRule: DataMappingResponseDto,
  ): Promise<TransformResponseDto> {
    const startTime = Date.now();
    try {
      const transformedData = await this.dataMapperService.applyMappingRule(
        transformMappingRule.id,
        request.rawData,
      );

      const validationErrors: string[] = [];
      const warnings: string[] = [];
      if (request.options?.validateOutput) {
        const validation = this.validateTransformedData(
          transformedData,
          transformMappingRule,
        );
        validationErrors.push(...validation.errors);
        warnings.push(...validation.warnings);
      }

      const stats = this.calculateTransformationStats(
        transformedData,
        transformMappingRule,
      );
      const processingTime = Date.now() - startTime;

      const metadata = new TransformationMetadataDto(
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
        processingTime > TRANSFORM_PERFORMANCE_THRESHOLDS.SLOW_TRANSFORMATION_MS
          ? "warn"
          : "log";
      this.logger[logLevel](
        `单次数据转换成功完成`,
        sanitizeLogData({
          ruleId: transformMappingRule.id,
          recordsProcessed: stats.recordsProcessed,
          processingTime,
        }),
      );

      if (
        processingTime > TRANSFORM_PERFORMANCE_THRESHOLDS.SLOW_TRANSFORMATION_MS
      ) {
        warnings.push(
          `${TRANSFORM_WARNING_MESSAGES.PERFORMANCE_WARNING}: ${processingTime}ms`,
        );
      }
      if (
        stats.recordsProcessed >
        TRANSFORM_PERFORMANCE_THRESHOLDS.LARGE_DATASET_SIZE
      ) {
        warnings.push(
          `${TRANSFORM_WARNING_MESSAGES.LARGE_DATASET_WARNING}: ${stats.recordsProcessed} records`,
        );
      }

      if (validationErrors.length > 0) {
        throw new BadRequestException(validationErrors.join("; "));
      }

      // 警告信息通过日志记录
      if (warnings.length > 0) {
        this.logger.warn(
          `数据转换警告`,
          sanitizeLogData({
            ruleId: transformMappingRule.id,
            warnings,
            operation: "_executeSingleTransform",
          }),
        );
      }

      return new TransformResponseDto(transformedData, metadata);
    } catch (error) {
      this.logger.error(
        `单次数据转换失败`,
        sanitizeLogData({
          ruleId: transformMappingRule.id,
          error: error.message,
        }),
      );
      throw new InternalServerErrorException(error.message);
    }
  }

  // createErrorResponse method removed - errors are now handled via exceptions

  /**
   * Preview transformation without applying it
   */
  async previewTransformation(
    request: TransformRequestDto,
  ): Promise<TransformPreviewDto> {
    // 🎯 使用 common 模块的日志脱敏功能
    this.logger.log(
      `预览转换`,
      sanitizeLogData({
        provider: request.provider,
        transDataRuleListType: request.transDataRuleListType,
      }),
    );

    // Find mapping rule
    const transformMappingRule = await this.findMappingRule(
      request.provider,
      request.transDataRuleListType,
      request.mappingOutRuleId,
    );

    if (!transformMappingRule) {
      throw new NotFoundException(
        `${TRANSFORM_ERROR_MESSAGES.NO_MAPPING_RULE}: provider '${request.provider}', transDataRuleListType '${request.transDataRuleListType}'`,
      );
    }

    // Extract sample data for preview
    const sampleInput = this.extractSampleData(request.rawData);

    // Apply transformation to sample
    const sampleOutput = await this.dataMapperService.applyMappingRule(
      transformMappingRule.id,
      sampleInput,
    );

    // Build field mapping preview
    const sharedDataFieldMappings: TransformFieldMappingPreviewDto[] =
      transformMappingRule.sharedDataFieldMappings.map((mapping) => {
        const sourceValue = ObjectUtils.getValueFromPath(
          sampleInput,
          mapping.sourceField,
        );
        const targetValue = ObjectUtils.getValueFromPath(
          sampleOutput[0] || {},
          mapping.targetField,
        );

        return {
          sourceField: mapping.sourceField,
          targetField: mapping.targetField,
          sampleSourceValue: sourceValue,
          expectedTargetValue: targetValue,
          transformType: mapping.transform?.type,
        };
      });

    const mappingRuleInfo: TransformMappingRuleInfoDto = {
      id: transformMappingRule.id,
      name: transformMappingRule.name,
      provider: transformMappingRule.provider,
      transDataRuleListType: transformMappingRule.transDataRuleListType,
      dataFieldMappingsCount: transformMappingRule.sharedDataFieldMappings.length,
    };

    return {
      transformMappingRule: mappingRuleInfo,
      sampleInput,
      expectedOutput: sampleOutput[0] || {},
      sharedDataFieldMappings,
    };
  }

  /**
   * Find appropriate mapping rule
   */
  private async findMappingRule(
    provider: string,
    transDataRuleListType: string,
    ruleId?: string,
  ): Promise<DataMappingResponseDto | null> {
    if (ruleId) {
      // Use specific rule if provided - 可能抛出 NotFoundException，让它传播
      return await this.dataMapperService.findOne(ruleId);
    } else {
      // Find best matching rule - 可能抛出数据库异常，让它传播
      // 返回 null 是正常的业务逻辑（没找到匹配规则）
      return await this.dataMapperService.findBestMatchingRule(
        provider,
        transDataRuleListType,
      );
    }
  }

  /**
   * Validate transformed data
   */
  private validateTransformedData(
    transformedData: any,
    transformMappingRule: DataTransformRuleDto,
  ): TransformValidationDto {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!transformedData) {
      errors.push(TRANSFORM_ERROR_MESSAGES.INVALID_RAW_DATA);
      return { errors, warnings };
    }

    // Validate if we have the expected structure
    const dataArray = Array.isArray(transformedData)
      ? transformedData
      : [transformedData];

    if (dataArray.length === 0) {
      warnings.push(TRANSFORM_WARNING_MESSAGES.EMPTY_TRANSFORMED_DATA);
      return { errors, warnings };
    }

    // Check if all target fields from mapping rule are present
    const requiredFields = transformMappingRule.sharedDataFieldMappings.map((m) => m.targetField);
    const sampleRecord = dataArray[0];

    const missingFields = requiredFields.filter(
      (field: string) =>
        ObjectUtils.getValueFromPath(sampleRecord, field) === undefined,
    );

    if (missingFields.length > 0) {
      warnings.push(
        `${TRANSFORM_WARNING_MESSAGES.MISSING_EXPECTED_FIELDS}: ${missingFields.join(", ")}`,
      );
    }

    // Check for null/undefined values in important fields
    const nullFields = requiredFields.filter((field: string) => {
      const value = ObjectUtils.getValueFromPath(sampleRecord, field);
      return value === null || value === undefined;
    });

    if (nullFields.length > 0) {
      warnings.push(
        `${TRANSFORM_WARNING_MESSAGES.NULL_FIELD_VALUES}: ${nullFields.join(", ")}`,
      );
    }

    return { errors, warnings };
  }

  /**
   * Calculate transformation statistics
   */
  private calculateTransformationStats(
    transformedData: any,
    transformMappingRule: DataTransformRuleDto,
  ): TransformationStatsDto {
    const dataArray = Array.isArray(transformedData)
      ? transformedData
      : [transformedData];
    const recordsProcessed = dataArray.length;

    const transformationsApplied = transformMappingRule.sharedDataFieldMappings.map((mapping) => ({
      sourceField: mapping.sourceField,
      targetField: mapping.targetField,
      transformType: mapping.transform?.type,
      transformValue: mapping.transform?.value,
    }));

    const fieldsTransformed = transformMappingRule.sharedDataFieldMappings.length;

    return {
      recordsProcessed,
      fieldsTransformed,
      transformationsApplied,
    };
  }

  /**
   * Extract sample data for preview
   */
  private extractSampleData(rawData: any): any {
    if (!rawData) return {};

    // 🎯 使用 common 模块的配置常量限制样本大小
    if (Array.isArray(rawData)) {
      const sampleSize = Math.min(
        rawData.length,
        TRANSFORM_CONFIG.MAX_SAMPLE_SIZE,
      );
      return sampleSize > 0 ? rawData[0] : {};
    }

    // 🎯 使用配置常量处理嵌套数组属性
    const sample: any = {};
    for (const [key, value] of Object.entries(rawData)) {
      if (Array.isArray(value) && value.length > 0) {
        const sampleSize = Math.min(
          value.length,
          TRANSFORM_CONFIG.MAX_SAMPLE_SIZE,
        );
        sample[key] = value.slice(0, sampleSize);
      } else {
        sample[key] = value;
      }
    }

    return sample;
  }
}
