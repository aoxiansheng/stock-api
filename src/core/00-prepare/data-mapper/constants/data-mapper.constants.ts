/**
 * 数据映射服务常量
 * 🎯 统一定义数据映射相关的常量，确保系统一致性
 *
 * @fileoverview
 * 本文件包含数据映射系统的所有常量定义，旨在：
 * - 消除硬编码枚举值，提高代码可维护性
 * - 确保类型安全和IDE智能提示
 * - 统一错误消息和配置参数
 * - 提供清晰的常量分组和使用指南
 *
 * @example 基本使用方式
 * ```typescript
 * // 导入所需常量
 * import {
 *   TRANSFORMATION_TYPES,
 *   API_TYPES,
 *   DATA_MAPPER_ERROR_MESSAGES,
 *   DATA_MAPPER_CONFIG
 * } from './constants/data-mapper.constants';
 *
 * // 在业务逻辑中使用
 * if (transformType === TRANSFORMATION_TYPES.MULTIPLY) {
 *   result = value * multiplier;
 * }
 *
 * // 在异常处理中使用
 * throw new NotFoundException(DATA_MAPPER_ERROR_MESSAGES.MAPPING_RULE_NOT_FOUND);
 *
 * // 在配置验证中使用
 * if (fieldMappings.length > DATA_MAPPER_CONFIG.MAX_FIELD_MAPPINGS) {
 *   throw new BadRequestException('字段映射数量超限');
 * }
 * ```
 *
 * @see {@link FlexibleMappingRuleService} - 数据映射核心服务
 * @see {@link DataSourceAnalyzerService} - 数据源分析服务
 * @see {@link BaseQueryDto} - 基础查询DTO（使用分页常量）
 *
 * @author Claude Code Assistant
 * @since 1.0.0
 * @lastModified 2025-09-04
 */

import { NUMERIC_CONSTANTS } from "@common/constants/core";
import {
  HTTP_TIMEOUTS,
  BATCH_SIZE_SEMANTICS,
} from "@common/constants/semantic";
import { CORE_LIMITS } from "../../../shared/constants/limits";

/**
 * 数据映射错误消息常量
 *
 * @description 定义数据映射系统中所有错误情况的标准化消息
 * @usage 在异常处理和错误响应中使用这些常量，确保错误消息的一致性
 *
 * @example
 * ```typescript
 * import { DATA_MAPPER_ERROR_MESSAGES } from './constants/data-mapper.constants';
 *
 * throw new NotFoundException(DATA_MAPPER_ERROR_MESSAGES.MAPPING_RULE_NOT_FOUND);
 * ```
 *
 * @see {@link FlexibleMappingRuleService} - 主要使用这些错误消息的服务
 * @see {@link DataSourceAnalyzerService} - 数据源分析相关错误消息使用
 */
export const DATA_MAPPER_ERROR_MESSAGES = Object.freeze({
  MAPPING_RULE_NOT_FOUND: "映射规则未找到",
  RULE_ID_NOT_FOUND: "指定ID的映射规则不存在",
  INVALID_JSON_FORMAT: "无效的JSON格式",
  JSON_DATA_REQUIRED: "需要提供jsonData或jsonString",
  TRANSFORMATION_FAILED: "数据转换失败",
  PATH_RESOLUTION_FAILED: "路径解析失败",
  MAPPING_TEST_FAILED: "映射规则测试失败",
  CUSTOM_TRANSFORMATION_NOT_SUPPORTED: "不支持自定义转换",
  FIELD_MAPPING_ERROR: "字段映射错误",
  RULE_CREATION_FAILED: "映射规则创建失败",
  RULE_UPDATE_FAILED: "映射规则更新失败",
  RULE_DELETION_FAILED: "映射规则删除失败",
} as const);

/**
 * 数据映射警告消息常量
 *
 * @description 定义数据映射系统中需要警告用户但不阻塞操作的情况
 * @usage 在日志记录和用户提醒中使用，帮助用户了解系统状态
 *
 * @example
 * ```typescript
 * import { DATA_MAPPER_WARNING_MESSAGES } from './constants/data-mapper.constants';
 *
 * this.logger.warn(DATA_MAPPER_WARNING_MESSAGES.TRANSFORMATION_FAILED_FALLBACK, { fieldPath });
 * ```
 */
export const DATA_MAPPER_WARNING_MESSAGES = Object.freeze({
  CUSTOM_TRANSFORMATIONS_NOT_SUPPORTED: "不支持自定义转换",
  TRANSFORMATION_FAILED_FALLBACK: "转换失败，返回原始值",
  PATH_NOT_FOUND: "路径未找到",
  FIELD_NOT_MAPPED: "字段未映射",
  EMPTY_MAPPING_RESULT: "映射结果为空",
  LOW_SIMILARITY_SCORE: "相似度评分较低",
  LARGE_DATASET_WARNING: "数据集较大，可能影响性能",
} as const);

/**
 * 数据映射成功消息常量
 *
 * @description 定义数据映射系统中操作成功时的标准化消息
 * @usage 在成功响应和操作确认中使用，提供一致的用户体验
 *
 * @example
 * ```typescript
 * import { DATA_MAPPER_SUCCESS_MESSAGES } from './constants/data-mapper.constants';
 *
 * return {
 *   message: DATA_MAPPER_SUCCESS_MESSAGES.RULE_CREATED,
 *   data: createdRule
 * };
 * ```
 */
export const DATA_MAPPER_SUCCESS_MESSAGES = Object.freeze({
  RULE_CREATED: "映射规则创建成功",
  RULE_UPDATED: "映射规则更新成功",
  RULE_DELETED: "映射规则删除成功",
  RULE_ACTIVATED: "映射规则激活成功",
  RULE_DEACTIVATED: "映射规则停用成功",
  MAPPING_TEST_SUCCESSFUL: "映射规则测试成功",
  TRANSFORMATION_SUCCESSFUL: "数据转换成功",
} as const);

/**
 * 字段建议配置常量
 *
 * @description 字段自动建议和匹配算法的配置参数
 * @usage 在 DataSourceAnalyzerService 和字段映射建议功能中使用
 *
 * @example
 * ```typescript
 * import { FIELD_SUGGESTION_CONFIG } from './constants/data-mapper.constants';
 *
 * // 检查相似度是否满足阈值
 * if (similarity >= FIELD_SUGGESTION_CONFIG.SIMILARITY_THRESHOLD) {
 *   suggestions.push(fieldMapping);
 * }
 * ```
 *
 * @see {@link DataSourceAnalyzerService.suggestFieldMappings} - 使用这些配置的主要方法
 */
export const FIELD_SUGGESTION_CONFIG = Object.freeze({
  SIMILARITY_THRESHOLD: 0.3, // 相似度阈值（30%）
  MAX_SUGGESTIONS: 3, // 最大建议数量
  MIN_FIELD_LENGTH: 1, // 最小字段长度
  MAX_FIELD_LENGTH: 100, // 最大字段长度
  EXACT_MATCH_SCORE: 1.0, // 完全匹配分数
  SUBSTRING_MATCH_SCORE: 0.8, // 子字符串匹配分数
  CASE_INSENSITIVE: true, // 忽略大小写
} as const);

/**
 * 数据映射配置常量
 *
 * @description 数据映射系统的核心配置参数，定义系统边界和限制
 * @usage 在整个数据映射模块中使用，确保系统稳定性和性能
 *
 * @example
 * ```typescript
 * import { DATA_MAPPER_CONFIG } from './constants/data-mapper.constants';
 *
 * // 验证规则名称长度
 * if (ruleName.length > DATA_MAPPER_CONFIG.MAX_RULE_NAME_LENGTH) {
 *   throw new BadRequestException('规则名称过长');
 * }
 *
 * // 设置分页参数
 * const pageSize = Math.min(requestedPageSize, DATA_MAPPER_CONFIG.MAX_PAGE_SIZE);
 * ```
 *
 * @see {@link FlexibleMappingRuleService} - 主要使用这些配置的服务
 * @see {@link BaseQueryDto} - 使用分页相关配置的基础DTO
 */
export const DATA_MAPPER_CONFIG = Object.freeze({
  MAX_FIELD_MAPPINGS: 100, // 单个规则最大字段映射数
  MAX_NESTED_DEPTH: 10, // 最大嵌套深度
  MAX_ARRAY_SIZE: 1000, // 最大数组大小
  DEFAULT_PAGE_SIZE: 10, // 默认分页大小
  MAX_PAGE_SIZE: 100, // 最大分页大小
  DEFAULT_TIMEOUT_MS: HTTP_TIMEOUTS.REQUEST.NORMAL_MS, // 默认超时时间 - 使用统一配置
  MAX_RULE_NAME_LENGTH: 100, // 最大规则名称长度
  MAX_DESCRIPTION_LENGTH: 500, // 最大描述长度
} as const);

/**
 * 转换操作类型常量
 *
 * @description 定义数据转换过程中支持的所有转换操作类型
 * @usage 在字段映射规则中指定转换类型，确保类型安全和一致性
 *
 * @example
 * ```typescript
 * import { TRANSFORMATION_TYPES } from './constants/data-mapper.constants';
 *
 * // 在 switch 语句中使用
 * switch (transformRule.type) {
 *   case TRANSFORMATION_TYPES.MULTIPLY:
 *     return sourceValue * transformRule.value;
 *   case TRANSFORMATION_TYPES.ADD:
 *     return sourceValue + transformRule.value;
 *   default:
 *     return sourceValue;
 * }
 *
 * // 在 DTO 验证中使用
 * @IsEnum(TRANSFORMATION_TYPE_VALUES)
 * transformType: TransformationType;
 * ```
 *
 * @see {@link FlexibleMappingRuleService.applyTransformation} - 主要使用场景
 * @see {@link TransformRuleDto} - 在DTO验证中使用
 * @see {@link FlexibleFieldMappingDto} - 字段映射中使用
 */
export const TRANSFORMATION_TYPES = Object.freeze({
  MULTIPLY: "multiply",
  DIVIDE: "divide",
  ADD: "add",
  SUBTRACT: "subtract",
  FORMAT: "format",
  CUSTOM: "custom",
  NONE: "none",
} as const);

/**
 * 转换类型联合类型（从常量对象推导）
 *
 * @description TypeScript类型定义，确保转换类型的类型安全
 */
export type TransformationType =
  (typeof TRANSFORMATION_TYPES)[keyof typeof TRANSFORMATION_TYPES];

/**
 * 转换类型数组（用于枚举验证）
 *
 * @description 从TRANSFORMATION_TYPES导出的数组，用于class-validator装饰器
 * @usage 在DTO验证中使用 @IsEnum(TRANSFORMATION_TYPE_VALUES)
 */
export const TRANSFORMATION_TYPE_VALUES = Object.values(TRANSFORMATION_TYPES);

/**
 * API类型常量
 *
 * @description 定义数据源API的通信类型
 * @usage 在数据源模板、映射规则和数据获取中使用，确保API类型的一致性
 *
 * @example
 * ```typescript
 * import { API_TYPES, ApiType } from './constants/data-mapper.constants';
 *
 * // 在服务中使用
 * const fetchMethod = apiType === API_TYPES.REST ? 'fetchRestData' : 'fetchStreamData';
 *
 * // 在DTO验证中使用
 * @IsEnum(API_TYPE_VALUES)
 * apiType: ApiType;
 * ```
 *
 * @see {@link DataSourceAnalyzerService} - 数据源分析中使用
 * @see {@link FlexibleMappingRuleService} - 映射规则处理中使用
 */
export const API_TYPES = Object.freeze({
  REST: "rest",
  STREAM: "stream",
} as const);

/**
 * API类型联合类型
 *
 * @description TypeScript类型定义，确保API类型的类型安全
 */
export type ApiType = (typeof API_TYPES)[keyof typeof API_TYPES];

/**
 * API类型数组（用于枚举验证）
 *
 * @description 从API_TYPES导出的数组，用于class-validator装饰器
 * @usage 在DTO验证中使用 @IsEnum(API_TYPE_VALUES)
 */
export const API_TYPE_VALUES = Object.values(API_TYPES);

/**
 * 规则列表类型常量
 *
 * @description 定义数据映射规则支持的字段集合类型
 * @usage 在创建和管理映射规则时指定目标字段集合类型
 *
 * @example
 * ```typescript
 * import { RULE_LIST_TYPES, RuleListType } from './constants/data-mapper.constants';
 *
 * // 在映射规则创建中使用
 * const mappingRule = {
 *   transDataRuleListType: RULE_LIST_TYPES.QUOTE_FIELDS,
 *   fieldMappings: [...],
 * };
 *
 * // 在DTO验证中使用
 * @IsEnum(RULE_LIST_TYPE_VALUES)
 * transDataRuleListType: RuleListType;
 * ```
 *
 * @see {@link CreateFlexibleMappingRuleDto} - 创建映射规则时使用
 * @see {@link FlexibleMappingRuleService} - 规则处理中使用
 *
 * @note INDEX_FIELDS已在生产环境中使用，支持get-index-quote端点
 */
export const RULE_LIST_TYPES = Object.freeze({
  QUOTE_FIELDS: "quote_fields",
  BASIC_INFO_FIELDS: "basic_info_fields",
  INDEX_FIELDS: "index_fields", // 生产就绪 - 支持指数行情查询 (get-index-quote)
} as const);

/**
 * 规则列表类型联合类型（从常量对象推导）
 *
 * @description TypeScript类型定义，确保规则类型的类型安全
 */
export type RuleListType =
  (typeof RULE_LIST_TYPES)[keyof typeof RULE_LIST_TYPES];

/**
 * 规则列表类型数组（用于枚举验证）
 *
 * @description 从RULE_LIST_TYPES导出的数组，用于class-validator装饰器
 * @usage 在DTO验证中使用 @IsEnum(RULE_LIST_TYPE_VALUES)
 */
export const RULE_LIST_TYPE_VALUES = Object.values(RULE_LIST_TYPES);

// Note: Rule type usage status moved to production-types.config.ts (PRODUCTION_TYPE_REGISTRY)
// for unified configuration management with enhanced features including performance profiles,
// fallback types, and comprehensive validation.


/**
 * 转换默认值常量
 *
 * @description 定义数据转换操作的默认参数值
 * @usage 在转换规则创建和执行时提供标准默认值
 */
export const TRANSFORMATION_DEFAULTS = Object.freeze({
  MULTIPLY_VALUE: 1,
  DIVIDE_VALUE: 1,
  ADD_VALUE: 0,
  SUBTRACT_VALUE: 0,
  FORMAT_TEMPLATE: "{value}",
  VALUE_PLACEHOLDER: "{value}",
} as const);





/**
 * 数据映射默认值常量
 */
export const DATA_MAPPER_DEFAULTS = Object.freeze({
  PAGE_NUMBER: 1,
  PAGE_SIZE: 10,
  SIMILARITY_THRESHOLD: FIELD_SUGGESTION_CONFIG.SIMILARITY_THRESHOLD,
  MAX_SUGGESTIONS: FIELD_SUGGESTION_CONFIG.MAX_SUGGESTIONS,
  TIMEOUT_MS: DATA_MAPPER_CONFIG.DEFAULT_TIMEOUT_MS,
  RETRY_ATTEMPTS: CORE_LIMITS.RATE_LIMITS.MAX_RETRIES,
  ENABLE_CACHING: true,
  LOG_LEVEL: "info",
} as const);



/**
 * 缓存配置常量
 * 已删除：DATA_MAPPER_CACHE_CONFIG 常量已迁移到专用的 DataMapperCache 模块配置中
 * 位置：src/core/05-caching/module/data-mapper-cache/constants/
 */



