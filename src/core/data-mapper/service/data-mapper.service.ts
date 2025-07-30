import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";

// 🎯 复用 common 模块的日志配置
import { createLogger, sanitizeLogData } from "@common/config/logger.config";

// 🎯 复用 common 模块的通用类型和常量已集成到 data-mapper.constants 中
// 🎯 复用 common 模块的数据映射常量

import { ObjectUtils } from "../../shared/utils/object.util";
import { StringUtils } from "../../shared/utils/string.util";

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
export class DataMapperService implements IDataMapper {
  // �� 使用 common 模块的日志配置
  private readonly logger = createLogger(DataMapperService.name);

  constructor(
    private readonly repository: DataMappingRepository,
    private readonly paginationService: PaginationService,
  ) {}

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
  ): Promise<DataMappingResponseDto[]> {
    const rules = await this.repository.findByProviderAndType(
      provider,
      transDataRuleListType,
    );
    return rules.map((rule) => DataMappingResponseDto.fromDocument(rule));
  }

  // Create mapping rule
  async create(
    createDto: CreateDataMappingDto,
  ): Promise<DataMappingResponseDto> {
    this.logger.log(`创建映射规则: ${createDto.name}`);

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
    const standardizedObject: Record<string, any> = {};
    for (const mapping of rule.sharedDataFieldMappings) {
      // Check if source field contains array notation like secu_quote[0].s
      // If so, search in the full source data
      const dataToSearch = mapping.sourceField.includes("[")
        ? fullSourceData
        : objectToTransform;
      const sourceValue = ObjectUtils.getValueFromPath(
        dataToSearch,
        mapping.sourceField,
      );

      if (sourceValue !== undefined) {
        let transformedValue = sourceValue;

        // Apply transformation if specified
        if (mapping.transform) {
          transformedValue = this.applyTransform(
            sourceValue,
            mapping.transform,
          );
        }

        standardizedObject[mapping.targetField] = transformedValue;
      }
    }
    return standardizedObject;
  }

  /**
   * Apply mapping rule to transform source data
   */
  async applyMappingRule(
    ruleId: string,
    sourceData: Record<string, any>,
  ): Promise<Record<string, any>[]> {
    const startTime = Date.now();

    const ruleDoc = await this.repository.findById(ruleId);
    if (!ruleDoc) {
      throw new NotFoundException(
        `${DATA_MAPPER_ERROR_MESSAGES.RULE_ID_NOT_FOUND}: ${ruleId}`,
      );
    }

    const rule = DataMappingResponseDto.fromDocument(ruleDoc);

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

    // 🎯 性能监控
    const processingTime = Date.now() - startTime;
    const logLevel =
      processingTime > DATA_MAPPER_PERFORMANCE_THRESHOLDS.SLOW_MAPPING_MS
        ? "warn"
        : "debug";
    this.logger[logLevel](
      `映射规则应用完成`,
      sanitizeLogData({
        ruleId,
        ruleName: rule.name,
        processingTime,
        isSlowMapping:
          processingTime > DATA_MAPPER_PERFORMANCE_THRESHOLDS.SLOW_MAPPING_MS,
      }),
    );

    if (processingTime > DATA_MAPPER_PERFORMANCE_THRESHOLDS.SLOW_MAPPING_MS) {
      this.logger.warn(
        `${DATA_MAPPER_WARNING_MESSAGES.LARGE_DATASET_WARNING}: ${processingTime}ms`,
      );
    }

    return transformedResult;
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
  ): Promise<DataMappingResponseDto | null> {
    const rule = await this.repository.findBestMatchingRule(
      provider,
      transDataRuleListType,
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
}
