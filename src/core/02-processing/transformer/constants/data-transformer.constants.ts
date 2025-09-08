/**
 * 数据转换服务常量
 * 🎯 统一定义数据转换相关的常量，确保系统一致性
 */

// 导入统一常量系统，避免重复定义

import { CORE_VALUES } from "@common/constants/foundation/core-values.constants";
import { PROCESSING_BATCH_SETTINGS } from "@common/constants/foundation/processing-base.constants";
import { OperationStatus } from "@monitoring/contracts/enums/operation-status.enum";
// 复用 data-mapper 的转换类型常量，避免重复定义
import { 
  TRANSFORMATION_TYPES, 
  TRANSFORMATION_TYPE_VALUES 
} from "../../../00-prepare/data-mapper/constants/data-mapper.constants";
import type { TransformationType } from "../../../00-prepare/data-mapper/constants/data-mapper.constants";

/**
 * @deprecated 使用 TRANSFORMATION_TYPES 替代，保持向后兼容
 * 转换操作类型常量（重新导出 data-mapper 的常量）
 */
export const TRANSFORM_TYPES = TRANSFORMATION_TYPES;

/**
 * 转换错误消息常量
 */
export const DATATRANSFORM_ERROR_MESSAGES = Object.freeze({
  NO_MAPPING_RULE: "未找到匹配的映射规则",
  TRANSFORMATION_FAILED: "数据转换失败",
  VALIDATION_FAILED: "转换后数据验证失败",
  INVALID_RAW_DATA: "原始数据格式无效",
  MISSING_REQUIRED_FIELDS: "缺少必需字段",
  RULE_NOT_FOUND: "指定的映射规则不存在",
  BATCH_TRANSFORMATION_FAILED: "批量转换失败",
  PREVIEW_GENERATION_FAILED: "预览生成失败",
  SAMPLE_DATA_EXTRACTION_FAILED: "样本数据提取失败",
  FIELD_MAPPING_ERROR: "字段映射错误",
} as const);

/**
 * 转换警告消息常量
 */
export const TRANSFORM_WARNING_MESSAGES = Object.freeze({
  EMPTY_TRANSFORMED_DATA: "转换后数据为空",
  MISSING_EXPECTED_FIELDS: "转换后数据缺少预期字段",
  NULL_FIELD_VALUES: "字段值为空或未定义",
  PARTIAL_TRANSFORMATION: "部分数据转换成功",
  PERFORMANCE_WARNING: "转换性能较慢",
  LARGE_DATASET_WARNING: "数据集较大，可能影响性能",
} as const);

/**
 * 转换配置常量
 */
export const DATATRANSFORM_CONFIG = Object.freeze({
  MAX_BATCH_SIZE: PROCESSING_BATCH_SETTINGS.MAX_BATCH_SIZE, // 批量转换最大数量
  MAX_FIELD_MAPPINGS: 100, // 单个规则最大字段映射数
  MAX_SAMPLE_SIZE: 10, // 预览样本最大数量
  DEFAULT_TIMEOUT_MS: CORE_VALUES.TIMEOUT_MS.DEFAULT, // 默认转换超时时间
  MAX_NESTED_DEPTH: 10, // 最大嵌套深度
  MAX_STRING_LENGTH: 10000, // 最大字符串长度
  MAX_ARRAY_LENGTH: 10000, // 最大数组长度
} as const);

/**
 * 转换性能阈值常量
 */
export const DATATRANSFORM_PERFORMANCE_THRESHOLDS = Object.freeze({
  SLOW_TRANSFORMATION_MS:
    CORE_VALUES.PERFORMANCE_MS.SLOW_TRANSFORMATION, // 慢转换阈值
  LARGE_DATASET_SIZE: PROCESSING_BATCH_SETTINGS.MAX_BATCH_SIZE, // 大数据集阈值
  HIGH_MEMORY_USAGE_MB:
    CORE_VALUES.MEMORY_MB.HIGH_USAGE, // 高内存使用阈值
  MAX_PROCESSING_TIME_MS: CORE_VALUES.TIMEOUT_MS.LONG, // 最大处理时间
} as const);

/**
 * 转换统计指标常量
 */
export const TRANSFORM_METRICS = Object.freeze({
  RECORDS_PROCESSED: "records_processed",
  FIELDS_TRANSFORMED: "fields_transformed",
  PROCESSING_TIME_MS: "processing_time_ms",
  SUCCESS_RATE: "success_rate",
  ERROR_RATE: "error_rate",
  MEMORY_USAGE_MB: "memory_usage_mb",
  THROUGHPUT_PER_SECOND: "throughput_per_second",
} as const);

/**
 * 转换状态常量
 */
export const TRANSFORM_STATUS = Object.freeze({
  PENDING: OperationStatus.PENDING,
  PROCESSING: "processing",
  SUCCESS: "success",
  FAILED: "failed",
  PARTIAL_SUCCESS: "partial_success",
  CANCELLED: "cancelled",
  TIMEOUT: "timeout",
} as const);

/**
 * 字段验证规则常量
 */
export const FIELD_VALIDATION_RULES = Object.freeze({
  REQUIRED: "required",
  OPTIONAL: "optional",
  NUMERIC: "numeric",
  STRING: "string",
  BOOLEAN: "boolean",
  DATE: "date",
  ARRAY: "array",
  OBJECT: "object",
  EMAIL: "email",
  URL: "url",
} as const);

/**
 * 数据类型转换映射常量
 */
export const DATA_TYPE_CONVERSIONS = Object.freeze({
  STRING_TO_NUMBER: "string_to_number",
  NUMBER_TO_STRING: "number_to_string",
  STRING_TO_DATE: "string_to_date",
  DATE_TO_STRING: "date_to_string",
  BOOLEAN_TO_STRING: "boolean_to_string",
  STRING_TO_BOOLEAN: "string_to_boolean",
  ARRAY_TO_STRING: "array_to_string",
  STRING_TO_ARRAY: "string_to_array",
} as const);

/**
 * 转换优先级常量
 */
export const TRANSFORM_PRIORITIES = Object.freeze({
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  BACKGROUND: 4,
} as const);

/**
 * 批量转换选项常量
 */
export const BATCH_TRANSFORM_OPTIONS = Object.freeze({
  CONTINUE_ON_ERROR: "continueOnError",
  PARALLEL_PROCESSING: "parallelProcessing",
  VALIDATE_OUTPUT: "validateOutput",
  INCLUDE_METADATA: "includeMetadata",
  ENABLE_CACHING: "enableCaching",
} as const);

/**
 * 转换缓存配置常量
 */
export const TRANSFORM_CACHE_CONFIG = Object.freeze({
  RULE_CACHE_TTL: 1800, // 规则缓存TTL（30分钟）
  RESULT_CACHE_TTL: 300, // 结果缓存TTL（5分钟）
  MAX_CACHE_SIZE: 1000, // 最大缓存条目数
  CACHE_KEY_PREFIX: "transform:", // 缓存键前缀
} as const);

/**
 * 转换日志级别常量
 */
export const TRANSFORM_LOG_LEVELS = Object.freeze({
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
  FATAL: "fatal",
} as const);

/**
 * 转换事件类型常量
 */
export const TRANSFORM_EVENTS = Object.freeze({
  TRANSFORMATION_STARTED: "transformation.started",
  TRANSFORMATION_COMPLETED: "transformation.completed",
  TRANSFORMATION_FAILED: "transformation.failed",
  BATCH_TRANSFORMATION_STARTED: "batch.transformation.started",
  BATCH_TRANSFORMATION_COMPLETED: "batch.transformation.completed",
  RULE_APPLIED: "rule.applied",
  VALIDATION_COMPLETED: "validation.completed",
  PERFORMANCE_WARNING: "performance.warning",
} as const);

/**
 * 默认转换配置常量
 */
export const TRANSFORM_DEFAULTS = Object.freeze({
  BATCH_SIZE: PROCESSING_BATCH_SETTINGS.DEFAULT_BATCH_SIZE, // 默认批量大小
  TIMEOUT_MS: 10000, // 默认超时时间（10秒）
  RETRY_ATTEMPTS: CORE_VALUES.RETRY.MAX_ATTEMPTS, // 默认重试次数（使用统一配置）
  VALIDATE_OUTPUT: true, // 默认启用输出验证
  INCLUDE_METADATA: false, // 默认不包含元数据
  CONTINUE_ON_ERROR: false, // 默认遇错停止
  ENABLE_CACHING: true, // 默认启用缓存
  LOG_LEVEL: TRANSFORM_LOG_LEVELS.INFO, // 默认日志级别
} as const);

/**
 * 转换规则类型常量
 */
export const TRANSFORM_RULE_TYPES = Object.freeze({
  FIELD_MAPPING: "field_mapping",
  DATA_AGGREGATION: "data_aggregation",
  FORMAT_CONVERSION: "format_conversion",
  VALIDATION_RULE: "validation_rule",
  CUSTOM_TRANSFORMATION: "custom_transformation",
} as const);

/**
 * 转换结果格式常量
 */
export const TRANSFORM_RESULT_FORMATS = Object.freeze({
  JSON: "json",
  XML: "xml",
  CSV: "csv",
  YAML: "yaml",
  PLAIN_TEXT: "plain_text",
} as const);

/**
 * 转换质量指标常量
 */
export const TRANSFORM_QUALITY_METRICS = Object.freeze({
  COMPLETENESS: "completeness", // 完整性
  ACCURACY: "accuracy", // 准确性
  CONSISTENCY: "consistency", // 一致性
  VALIDITY: "validity", // 有效性
  TIMELINESS: "timeliness", // 及时性
} as const);
