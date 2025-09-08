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

import { CORE_VALUES } from "@common/constants/foundation/core-values.constants";
import { PROCESSING_BATCH_SETTINGS } from "@common/constants/foundation/processing-base.constants";

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
  DEFAULT_TIMEOUT_MS: CORE_VALUES.TIMEOUT_MS.DEFAULT, // 默认超时时间 - 使用统一配置
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
export type TransformationType = typeof TRANSFORMATION_TYPES[keyof typeof TRANSFORMATION_TYPES];

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
export type ApiType = "rest" | "stream";

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
 * @note INDEX_FIELDS类型保留用于完整字段集合，使用前需确认系统支持情况
 */
export const RULE_LIST_TYPES = Object.freeze({
  QUOTE_FIELDS: "quote_fields",
  BASIC_INFO_FIELDS: "basic_info_fields", 
  INDEX_FIELDS: "index_fields", // 保留完整字段集合，但需要在使用时确认是否支持
} as const);

/**
 * 规则列表类型联合类型（从常量对象推导）
 * 
 * @description TypeScript类型定义，确保规则类型的类型安全
 */
export type RuleListType = typeof RULE_LIST_TYPES[keyof typeof RULE_LIST_TYPES];

/**
 * 规则列表类型数组（用于枚举验证）
 * 
 * @description 从RULE_LIST_TYPES导出的数组，用于class-validator装饰器
 * @usage 在DTO验证中使用 @IsEnum(RULE_LIST_TYPE_VALUES)
 */
export const RULE_LIST_TYPE_VALUES = Object.values(RULE_LIST_TYPES);

/**
 * 常用规则列表类型（不包含 index_fields，用于向后兼容）
 * 
 * @description 常用的规则列表类型子集，排除了可能不完全支持的index_fields类型
 * @usage 在需要确保兼容性的场景中使用，特别是在DTO验证和前端展示中
 * 
 * @example
 * ```typescript
 * import { COMMON_RULE_LIST_TYPES } from './constants/data-mapper.constants';
 * 
 * // 在需要向后兼容的DTO中使用
 * @IsEnum(COMMON_RULE_LIST_TYPE_VALUES)
 * dataType?: "quote_fields" | "basic_info_fields";
 * 
 * // 在前端选项列表中使用
 * const supportedTypes = Object.values(COMMON_RULE_LIST_TYPES);
 * ```
 * 
 * @see {@link AnalyzeDataSourceDto} - 在数据源分析中使用
 * @see {@link RULE_LIST_TYPES} - 完整的规则类型列表
 */
export const COMMON_RULE_LIST_TYPES = Object.freeze({
  QUOTE_FIELDS: "quote_fields",
  BASIC_INFO_FIELDS: "basic_info_fields",
} as const);

/**
 * 常用规则列表类型数组（用于需要排除 index_fields 的场景）
 * 
 * @description 从COMMON_RULE_LIST_TYPES导出的数组，用于向后兼容的验证场景
 * @usage 在DTO验证中使用 @IsEnum(COMMON_RULE_LIST_TYPE_VALUES)
 */
export const COMMON_RULE_LIST_TYPE_VALUES = Object.values(COMMON_RULE_LIST_TYPES);

/**
 * 转换默认值常量
 * 
 * @description 定义数据转换操作的默认参数值
 * @usage 当前未完全实施，建议用于：
 * - 转换规则创建时的默认值填充
 * - 转换操作执行时的缺省参数处理
 * - DTO 验证中的默认值设定
 * 
 * @todo 建议在以下地方实施：
 * - FlexibleMappingRuleService 中使用这些默认值进行转换计算
 * - TransformRuleDto 中使用默认值进行参数初始化
 * - 转换操作工具类中使用这些常量作为缺省值
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
 * 
 * @description 用于性能监控和告警的阈值配置
 * @usage 这些常量可以用于：
 * - 映射操作执行时间监控
 * - 数据集大小检查和警告
 * - 内存使用量监控
 * - 超时处理和告警
 * 
 * @todo 当前未完全实施，建议在以下场景中使用：
 * - FlexibleMappingRuleService 中的映射操作性能监控
 * - DataSourceAnalyzerService 中的数据分析性能跟踪
 * - 大数据集处理时的警告和降级策略
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
 * 
 * @description 定义数据映射系统的性能和统计指标键名
 * @usage 当前未完全实施，可用于以下场景：
 * - MetricsService 中的数据映射相关指标收集
 * - FlexibleMappingRuleService 中的规则处理统计
 * - 性能监控和报表生成
 * 
 * @todo 建议在以下地方实施：
 * - src/metrics/ 模块中集成数据映射指标
 * - src/monitoring/ 模块中添加映射性能监控
 * - 映射规则服务中添加指标埋点
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
 * 
 * @description 定义映射规则和模板的生命周期状态
 * @usage 当前未完全实施，建议用于：
 * - FlexibleMappingRule Schema 中的 status 字段枚举值
 * - DataSourceTemplate Schema 中的状态管理
 * - 规则状态切换和生命周期管理
 * 
 * @todo 在以下文件中实施：
 * - flexible-mapping-rule.schema.ts: status 字段使用这些常量
 * - data-source-template.schema.ts: 模板状态管理
 * - 相关服务层的状态验证和切换逻辑
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
 * 
 * @description 定义数据映射系统的事件类型，用于事件驱动架构
 * @usage 当前未完全实施，建议用于：
 * - 映射规则 CRUD 操作的事件发布
 * - 审计日志记录
 * - 实时通知和监控告警
 * 
 * @todo 集成到以下系统：
 * - src/alert/ 模块：映射规则变更通知
 * - 映射规则服务：操作完成后发布相应事件
 * - 审计服务：记录映射规则的操作历史
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
  TIMEOUT_MS: DATA_MAPPER_CONFIG.DEFAULT_TIMEOUT_MS,
  RETRY_ATTEMPTS: CORE_VALUES.RETRY.MAX_ATTEMPTS,
  ENABLE_CACHING: true,
  LOG_LEVEL: "info",
} as const);

/**
 * 数据类型处理常量
 * 
 * @description 定义数据映射过程中不同数据类型的处理规则和识别模式
 * @usage 当前未完全实施，建议用于：
 * - DataSourceAnalyzerService 中的字段类型自动识别
 * - 路径解析器中的嵌套结构处理
 * - 字段映射时的类型兼容性检查
 * 
 * @todo 建议在以下地方实施：
 * - data-source-analyzer.service.ts: 使用 ARRAY_FIELDS/OBJECT_FIELDS 进行类型识别
 * - 路径解析工具中使用 NESTED_SEPARATORS 和 PATH_DELIMITERS
 * - 字段映射验证时使用 PRIMITIVE_FIELDS 进行类型检查
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
 * 
 * @description 定义映射规则字段的验证模式和必填字段要求
 * @usage 当前未完全实施，建议用于：
 * - 映射规则创建时的字段验证
 * - DTO 层的自定义验证器
 * - 字段格式和命名约定检查
 * 
 * @todo 建议在以下地方实施：
 * - flexible-mapping-rule.dto.ts: 使用正则表达式进行字段格式验证
 * - 自定义验证装饰器中使用这些模式
 * - 映射规则服务中的数据完整性检查
 */
export const DATA_MAPPER_FIELD_VALIDATION_RULES = Object.freeze({
  REQUIRED_FIELDS: ["name", "provider", "transDataRuleListType"],
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
 * 
 * @description 定义数据映射系统的统计信息收集和维护配置
 * @usage 当前未完全实施，建议用于：
 * - 映射规则使用统计的定期刷新
 * - 性能指标的历史数据保留策略
 * - 错误率统计的时间窗口控制
 * 
 * @todo 建议在以下地方实施：
 * - src/monitoring/ 模块中集成数据映射统计
 * - FlexibleMappingRuleService 中添加统计信息收集
 * - 定期清理任务中使用这些配置
 */
export const DATA_MAPPER_STATS_CONFIG = Object.freeze({
  STATS_REFRESH_INTERVAL_MS: 60000, // 统计刷新间隔（1分钟）
  METRICS_RETENTION_DAYS: 30, // 指标保留天数
  PERFORMANCE_SAMPLE_SIZE: 100, // 性能样本大小
  ERROR_TRACKING_WINDOW_HOURS: 24, // 错误跟踪窗口（24小时）
} as const);

/**
 * 数据映射质量指标常量
 * 
 * @description 定义数据映射质量评估的各项指标维度
 * @usage 当前未完全实施，建议用于：
 * - 映射规则质量评估和评分
 * - 数据质量监控和告警
 * - 映射结果的质量分析报告
 * 
 * @todo 建议在以下地方实施：
 * - FlexibleMappingRuleService 中添加质量评估逻辑
 * - 质量监控服务中使用这些指标维度
 * - 映射结果的质量报告生成
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
 * 
 * @description 定义JSON路径解析和字段提取的配置参数
 * @usage 当前未完全实施，建议用于：
 * - DataSourceAnalyzerService 中的字段路径解析
 * - 嵌套对象和数组的路径处理
 * - 字段映射时的路径转换和验证
 * 
 * @todo 建议在以下地方实施：
 * - data-source-analyzer.service.ts: 使用这些配置进行路径解析
 * - 字段映射工具中使用路径深度限制和格式转换
 * - 路径解析异常处理中使用回退策略
 */
export const PATH_RESOLUTION_CONFIG = Object.freeze({
  MAX_PATH_DEPTH: 10, // 最大路径深度
  ARRAY_INDEX_PATTERN: /^\d+$/, // 数组索引模式
  CAMEL_CASE_CONVERSION: true, // 启用驼峰命名转换
  CASE_SENSITIVE: false, // 路径大小写敏感
  FALLBACK_TO_ORIGINAL: true, // 回退到原始值
} as const);