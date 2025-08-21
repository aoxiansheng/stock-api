/**
 * 股票代码映射服务常量
 * 🎯 统一定义股票代码映射相关的常量，确保系统一致性
 */

/**
 * 股票代码映射错误消息常量
 */
export const SYMBOL_MAPPER_ERROR_MESSAGES = Object.freeze({
  MAPPING_CONFIG_EXISTS: "数据源 '{dataSourceName}' 的映射配置已存在",
  MAPPING_CONFIG_NOT_FOUND: "映射配置不存在: {id}",
  DATA_SOURCE_MAPPING_NOT_FOUND: "数据源映射配置不存在: {dataSourceName}",
  DATA_SOURCE_NOT_FOUND: "数据源不存在: {dataSourceName}",
  MAPPING_RULE_NOT_FOUND:
    "数据源或映射规则不存在: {dataSourceName} -> {standardSymbol}",
  MAPPING_CONFIG_INACTIVE: "映射配置不存在或已停用: {mappingId}",
  SYMBOL_MAPPING_FAILED: "股票代码映射失败",
  SAVE_MAPPING_FAILED: "保存映射规则失败",
  GET_MAPPING_RULES_FAILED: "获取映射规则失败",
  GET_MAPPING_BY_ID_FAILED: "获取映射配置失败",
  GET_DATA_SOURCE_MAPPING_FAILED: "获取数据源映射配置失败",
  PAGINATED_QUERY_FAILED: "分页查询映射配置失败",
  UPDATE_MAPPING_FAILED: "映射配置更新失败",
  DELETE_MAPPING_FAILED: "映射配置删除失败",
  TRANSFORM_SYMBOLS_FAILED: "批量代码转换失败",
  GET_TRANSFORMED_LIST_FAILED: "获取转换后代码列表失败",
  GET_DATA_SOURCES_FAILED: "获取数据源列表失败",
  GET_MARKETS_FAILED: "获取市场列表失败",
  GET_SYMBOL_TYPES_FAILED: "获取股票类型列表失败",
  DELETE_BY_DATA_SOURCE_FAILED: "按数据源删除映射失败",
  ADD_MAPPING_RULE_FAILED: "添加映射规则失败",
  UPDATE_MAPPING_RULE_FAILED: "更新映射规则失败",
  REMOVE_MAPPING_RULE_FAILED: "删除映射规则失败",
  REPLACE_MAPPING_RULES_FAILED: "批量替换映射规则失败",
  GET_MAPPING_CONFIG_FAILED: "获取映射配置失败",
} as const);

/**
 * 股票代码映射警告消息常量
 */
export const SYMBOL_MAPPER_WARNING_MESSAGES = Object.freeze({
  MAPPING_CONFIG_NOT_FOUND: "未找到数据源映射配置，返回原始代码",
  MATCHING_RULE_NOT_FOUND: "未找到匹配的映射规则，返回原始代码",
  SLOW_MAPPING_DETECTED: "检测到慢映射操作",
  LARGE_BATCH_WARNING: "批量处理数据量较大，可能影响性能",
  MAPPING_CONFIG_RETRIEVAL_FAILED: "获取映射配置失败",
  PARTIAL_MAPPING_SUCCESS: "部分股票代码映射成功",
  INACTIVE_MAPPING_RULE: "映射规则已停用",
  EMPTY_MAPPING_RULES: "映射规则列表为空",
} as const);

/**
 * 股票代码映射成功消息常量
 */
export const SYMBOL_MAPPER_SUCCESS_MESSAGES = Object.freeze({
  SYMBOL_MAPPED: "股票代码映射完成",
  MAPPING_CONFIG_CREATED: "数据源映射配置创建成功",
  MAPPING_CONFIG_UPDATED: "映射配置更新成功",
  MAPPING_CONFIG_DELETED: "映射配置删除成功",
  MAPPING_RULES_RETRIEVED: "映射规则获取完成",
  MAPPING_CONFIG_RETRIEVED: "映射配置获取成功",
  DATA_SOURCE_MAPPING_RETRIEVED: "数据源映射配置获取成功",
  PAGINATED_QUERY_COMPLETED: "分页查询完成",
  SYMBOLS_TRANSFORMED: "批量代码转换完成",
  DATA_SOURCES_RETRIEVED: "数据源列表获取完成",
  MARKETS_RETRIEVED: "市场列表获取完成",
  SYMBOL_TYPES_RETRIEVED: "股票类型列表获取完成",
  MAPPINGS_DELETED_BY_DATA_SOURCE: "按数据源删除映射完成",
  MAPPING_RULE_ADDED: "映射规则添加成功",
  MAPPING_RULE_UPDATED: "映射规则更新成功",
  MAPPING_RULE_DELETED: "映射规则删除成功",
  MAPPING_RULES_REPLACED: "映射规则批量替换成功",
  MATCHING_RULE_FOUND: "找到匹配的映射规则",
  MAPPING_RULES_APPLIED: "映射规则应用完成",
} as const);

/**
 * 股票代码映射性能配置常量
 */
export const SYMBOL_MAPPER_PERFORMANCE_CONFIG = Object.freeze({
  SLOW_MAPPING_THRESHOLD_MS: 100, // 慢映射阈值（毫秒）
  MAX_SYMBOLS_PER_BATCH: 1000, // 单批次最大股票数量
  LOG_SYMBOLS_LIMIT: 5, // 日志中显示的股票数量限制
  MIN_PROCESSING_TIME_MS: 1, // 最小处理时间（测试兼容性）
  LARGE_BATCH_THRESHOLD: 500, // 大批量处理阈值
  PERFORMANCE_SAMPLE_SIZE: 100, // 性能样本大小
  MAX_CONCURRENT_MAPPINGS: 10, // 最大并发映射数
} as const);

/**
 * 股票代码映射配置常量
 */
export const SYMBOL_MAPPER_CONFIG = Object.freeze({
  DEFAULT_PAGE_SIZE: 10, // 默认分页大小
  MAX_PAGE_SIZE: 100, // 最大分页大小
  DEFAULT_TIMEOUT_MS: 30000, // 默认超时时间（30秒）
  MAX_RETRY_ATTEMPTS: 3, // 最大重试次数
  RETRY_DELAY_MS: 1000, // 重试延迟（1秒）
  MAX_DATA_SOURCE_NAME_LENGTH: 100, // 最大数据源名称长度
  MAX_SYMBOL_LENGTH: 50, // 最大股票代码长度
  MAX_MAPPING_RULES_PER_SOURCE: 10000, // 每个数据源最大映射规则数
} as const);

/**
 * 股票代码映射指标常量
 */
export const SYMBOL_MAPPER_METRICS = Object.freeze({
  MAPPINGS_TOTAL: "symbol_mappings_total",
  MAPPING_DURATION: "symbol_mapping_duration",
  TRANSFORM_DURATION: "symbol_transform_duration",
  BATCH_SIZE: "symbol_batch_size",
  SUCCESS_RATE: "symbol_mapping_success_rate",
  ERROR_RATE: "symbol_mapping_error_rate",
  CACHE_HIT_RATE: "symbol_mapping_cache_hit_rate",
  RULES_PROCESSED: "symbol_mapping_rules_processed",
  DATA_SOURCES_COUNT: "symbol_mapping_data_sources_count",
  ACTIVE_RULES_COUNT: "symbol_mapping_active_rules_count",
} as const);

/**
 * 股票代码映射状态常量
 */
export const SYMBOL_MAPPER_STATUS = Object.freeze({
  ACTIVE: "active",
  INACTIVE: "inactive",
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
  DEPRECATED: "deprecated",
} as const);

/**
 * 股票代码映射操作常量
 */
export const SYMBOL_MAPPER_OPERATIONS = Object.freeze({
  MAP_SYMBOL: "mapSymbol",
  CREATE_DATA_SOURCE_MAPPING: "createDataSourceMapping",
  SAVE_MAPPING: "saveMapping",
  GET_MAPPING_RULES: "getSymbolMappingRule",
  GET_MAPPING_BY_ID: "getSymbolMappingById",
  GET_MAPPING_BY_DATA_SOURCE: "getSymbolMappingByDataSource",
  GET_MAPPINGS_PAGINATED: "getSymbolMappingsPaginated",
  UPDATE_MAPPING: "updateSymbolMapping",
  DELETE_MAPPING: "deleteSymbolMapping",
  GET_DATA_SOURCES: "getDataSources",
  GET_MARKETS: "getMarkets",
  GET_SYMBOL_TYPES: "getSymbolTypes",
  DELETE_MAPPINGS_BY_DATA_SOURCE: "deleteSymbolMappingsByDataSource",
  ADD_MAPPING_RULE: "addSymbolMappingRule",
  UPDATE_MAPPING_RULE: "updateSymbolMappingRule",
  REMOVE_MAPPING_RULE: "removeSymbolMappingRule",
  REPLACE_MAPPING_RULES: "replaceSymbolMappingRule",
  APPLY_MAPPING_RULES: "applySymbolMappingRule",
  GET_MAPPING_CONFIG_FOR_PROVIDER: "getMappingConfigForProvider",
  FIND_MATCHING_MAPPING_RULE: "findMatchingMappingRule",
} as const);

/**
 * 股票代码映射默认值常量
 */
export const SYMBOL_MAPPER_DEFAULTS = Object.freeze({
  PAGE_NUMBER: 1,
  PAGE_SIZE: 10,
  TIMEOUT_MS: 30000,
  RETRY_ATTEMPTS: 3,
  LOG_LEVEL: "info",
  ENABLE_PERFORMANCE_MONITORING: true,
  ENABLE_CACHING: true,
  BATCH_SIZE: 100,
  PROCESSING_TIME: 0,
  SUCCESS_RATE: 1.0,
  ERROR_RATE: 0.0,
} as const);

/**
 * 股票代码映射事件常量
 */
export const SYMBOL_MAPPER_EVENTS = Object.freeze({
  MAPPING_CREATED: "symbol_mapper.mapping_created",
  MAPPING_UPDATED: "symbol_mapper.mapping_updated",
  MAPPING_DELETED: "symbol_mapper.mapping_deleted",
  RULE_ADDED: "symbol_mapper.rule_added",
  RULE_UPDATED: "symbol_mapper.rule_updated",
  RULE_REMOVED: "symbol_mapper.rule_removed",
  SYMBOLS_TRANSFORMED: "symbol_mapper.symbols_transformed",
  SLOW_MAPPING_DETECTED: "symbol_mapper.slow_mapping_detected",
  BATCH_PROCESSED: "symbol_mapper.batch_processed",
  PERFORMANCE_WARNING: "symbol_mapper.performance_warning",
} as const);

/**
 * 股票代码映射缓存配置常量
 */
export const SYMBOL_MAPPER_CACHE_CONFIG = Object.freeze({
  MAPPING_CONFIG_TTL: 1800, // 映射配置缓存TTL（30分钟）
  SYMBOL_MAPPING_TTL: 3600, // 股票代码映射缓存TTL（1小时）
  DATA_SOURCE_LIST_TTL: 600, // 数据源列表缓存TTL（10分钟）
  MARKET_LIST_TTL: 3600, // 市场列表缓存TTL（1小时）
  SYMBOL_TYPE_LIST_TTL: 3600, // 股票类型列表缓存TTL（1小时）
  MAX_CACHE_SIZE: 10000, // 最大缓存条目数
  CACHE_KEY_PREFIX: "symbol_mapper:", // 缓存键前缀
} as const);

/**
 * 股票代码映射验证规则常量
 */
export const SYMBOL_MAPPER_VALIDATION_RULES = Object.freeze({
  MIN_SYMBOL_LENGTH: 1, // 最小股票代码长度
  MAX_SYMBOL_LENGTH: 50, // 最大股票代码长度
  MIN_DATA_SOURCE_NAME_LENGTH: 1, // 最小数据源名称长度
  MAX_DATA_SOURCE_NAME_LENGTH: 100, // 最大数据源名称长度
  SYMBOL_PATTERN: /^[A-Za-z0-9._-]+$/, // 股票代码格式模式
  DATA_SOURCE_PATTERN: /^[A-Za-z0-9_-]+$/, // 数据源名称格式模式
  MAX_BATCH_SIZE: 1000, // 最大批量大小
  MIN_BATCH_SIZE: 1, // 最小批量大小
} as const);

/**
 * 股票代码映射健康检查配置常量
 */
export const SYMBOL_MAPPER_HEALTH_CONFIG = Object.freeze({
  CHECK_INTERVAL_MS: 60000, // 健康检查间隔（1分钟）
  TIMEOUT_MS: 5000, // 健康检查超时（5秒）
  MAX_FAILURES: 3, // 最大失败次数
  RECOVERY_THRESHOLD: 5, // 恢复阈值
  METRICS_WINDOW_SIZE: 100, // 指标窗口大小
} as const);
