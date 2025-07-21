/**
 * 数据映射服务常量
 * 🎯 统一定义数据映射相关的常量，确保系统一致性
 */

/**
 * 数据映射错误消息常量
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
 */
export const DATA_MAPPER_CONFIG = Object.freeze({
  MAX_FIELD_MAPPINGS: 100, // 单个规则最大字段映射数
  MAX_NESTED_DEPTH: 10, // 最大嵌套深度
  MAX_ARRAY_SIZE: 1000, // 最大数组大小
  DEFAULT_PAGE_SIZE: 10, // 默认分页大小
  MAX_PAGE_SIZE: 100, // 最大分页大小
  DEFAULT_TIMEOUT_MS: 30000, // 默认超时时间（30秒）
  MAX_RULE_NAME_LENGTH: 100, // 最大规则名称长度
  MAX_DESCRIPTION_LENGTH: 500, // 最大描述长度
} as const);

/**
 * 转换操作类型常量
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
 * 转换默认值常量
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
 * 数据映射性能阈值常量
 */
export const DATA_MAPPER_PERFORMANCE_THRESHOLDS = Object.freeze({
  SLOW_MAPPING_MS: 1000, // 慢映射操作阈值（1秒）
  LARGE_DATASET_SIZE: 1000, // 大数据集阈值
  HIGH_MEMORY_USAGE_MB: 100, // 高内存使用阈值（100MB）
  MAX_PROCESSING_TIME_MS: 60000, // 最大处理时间（60秒）
  SIMILARITY_CALCULATION_TIMEOUT_MS: 5000, // 相似度计算超时（5秒）
} as const);

/**
 * 数据映射指标常量
 */
export const DATA_MAPPER_METRICS = Object.freeze({
  RULES_PROCESSED: "rules_processed",
  FIELDS_MAPPED: "fields_mapped",
  TRANSFORMATIONS_APPLIED: "transformations_applied",
  PROCESSING_TIME_MS: "processing_time_ms",
  SUCCESS_RATE: "success_rate",
  ERROR_RATE: "error_rate",
  SIMILARITY_SCORE: "similarity_score",
  CACHE_HIT_RATE: "cache_hit_rate",
} as const);

/**
 * 数据映射状态常量
 */
export const DATA_MAPPER_STATUS = Object.freeze({
  ACTIVE: "active",
  INACTIVE: "inactive",
  DRAFT: "draft",
  TESTING: "testing",
  DEPRECATED: "deprecated",
  ERROR: "error",
} as const);

/**
 * 数据映射事件常量
 */
export const DATA_MAPPER_EVENTS = Object.freeze({
  RULE_CREATED: "data_mapper.rule_created",
  RULE_UPDATED: "data_mapper.rule_updated",
  RULE_DELETED: "data_mapper.rule_deleted",
  RULE_ACTIVATED: "data_mapper.rule_activated",
  RULE_DEACTIVATED: "data_mapper.rule_deactivated",
  MAPPING_APPLIED: "data_mapper.mapping_applied",
  TRANSFORMATION_APPLIED: "data_mapper.transformation_applied",
  FIELD_SUGGESTION_GENERATED: "data_mapper.field_suggestion_generated",
  PERFORMANCE_WARNING: "data_mapper.performance_warning",
} as const);

/**
 * 数据映射默认值常量
 */
export const DATA_MAPPER_DEFAULTS = Object.freeze({
  PAGE_NUMBER: 1,
  PAGE_SIZE: 10,
  RULE_STATUS: DATA_MAPPER_STATUS.ACTIVE,
  SIMILARITY_THRESHOLD: FIELD_SUGGESTION_CONFIG.SIMILARITY_THRESHOLD,
  MAX_SUGGESTIONS: FIELD_SUGGESTION_CONFIG.MAX_SUGGESTIONS,
  TIMEOUT_MS: 10000,
  RETRY_ATTEMPTS: 3,
  ENABLE_CACHING: true,
  LOG_LEVEL: "info",
} as const);

/**
 * 数据类型处理常量
 */
export const DATA_TYPE_HANDLERS = Object.freeze({
  ARRAY_FIELDS: ["secu_quote", "basic_info", "data", "items"],
  OBJECT_FIELDS: ["metadata", "config", "settings"],
  PRIMITIVE_FIELDS: ["string", "number", "boolean", "date"],
  NESTED_SEPARATORS: [".", "[", "]"],
  PATH_DELIMITERS: /[.\[\]]/,
} as const);

/**
 * 数据映射字段验证规则常量
 */
export const DATA_MAPPER_FIELD_VALIDATION_RULES = Object.freeze({
  REQUIRED_FIELDS: ["name", "provider", "ruleListType"],
  OPTIONAL_FIELDS: ["description", "tags", "metadata"],
  FIELD_NAME_PATTERN: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
  PATH_PATTERN: /^[a-zA-Z_][a-zA-Z0-9_.\[\]]*$/,
  PROVIDER_PATTERN: /^[a-zA-Z][a-zA-Z0-9_-]*$/,
  RULE_LIST_TYPE_PATTERN: /^[a-zA-Z][a-zA-Z0-9_-]*$/,
} as const);

/**
 * 缓存配置常量
 */
export const DATA_MAPPER_CACHE_CONFIG = Object.freeze({
  RULE_CACHE_TTL: 1800, // 规则缓存TTL（30分钟）
  SUGGESTION_CACHE_TTL: 300, // 建议缓存TTL（5分钟）
  TRANSFORMATION_CACHE_TTL: 600, // 转换缓存TTL（10分钟）
  MAX_CACHE_SIZE: 1000, // 最大缓存条目数
  CACHE_KEY_PREFIX: "data_mapper:", // 缓存键前缀
} as const);

/**
 * 统计信息配置常量
 */
export const DATA_MAPPER_STATS_CONFIG = Object.freeze({
  STATS_REFRESH_INTERVAL_MS: 60000, // 统计刷新间隔（1分钟）
  METRICS_RETENTION_DAYS: 30, // 指标保留天数
  PERFORMANCE_SAMPLE_SIZE: 100, // 性能样本大小
  ERROR_TRACKING_WINDOW_HOURS: 24, // 错误跟踪窗口（24小时）
} as const);

/**
 * 数据映射质量指标常量
 */
export const DATA_MAPPER_QUALITY_METRICS = Object.freeze({
  COMPLETENESS: "completeness", // 完整性
  ACCURACY: "accuracy", // 准确性
  CONSISTENCY: "consistency", // 一致性
  VALIDITY: "validity", // 有效性
  TIMELINESS: "timeliness", // 及时性
  COVERAGE: "coverage", // 覆盖率
} as const);

/**
 * 路径解析配置常量
 */
export const PATH_RESOLUTION_CONFIG = Object.freeze({
  MAX_PATH_DEPTH: 10, // 最大路径深度
  ARRAY_INDEX_PATTERN: /^\d+$/, // 数组索引模式
  CAMEL_CASE_CONVERSION: true, // 启用驼峰命名转换
  CASE_SENSITIVE: false, // 路径大小写敏感
  FALLBACK_TO_ORIGINAL: true, // 回退到原始值
} as const);
