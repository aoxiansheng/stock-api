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

// 保持最小依赖，避免引入全局复杂常量
import { REFERENCE_DATA } from "@common/constants/domain";
import {
  RULE_LIST_TYPES,
  RULE_LIST_TYPE_VALUES,
} from "@common/constants/domain/reference-data.constants";
import type {
  NonIndexRuleListType,
  RuleListType,
} from "@common/constants/domain/reference-data.constants";

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
// 已移除：消息类常量（不属于核心功能，避免冗余）

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
// 已移除：警告消息常量（不属于核心功能，避免冗余）

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
// 已移除：成功消息常量（不属于核心功能，避免冗余）

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
// 已移除：字段建议配置（属辅助能力，非核心路径）

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
  // 仅保留被 DTO 直接使用的校验长度，避免引入全局复杂参数
  MAX_RULE_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
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
 *
 * 兼容说明：
 * - RuleListType 族常量与类型已上移到 common/domain。
 * - 这里保留桥接导出，避免 prepare 层调用方改动 import 路径。
 */
export { RULE_LIST_TYPES, RULE_LIST_TYPE_VALUES };
export type { RuleListType, NonIndexRuleListType };

/**
 * 通用模板关键词（用于市场类型推断）
 *
 * @description 注意：该关键词集合用于“模板名称”匹配，匹配前需统一转换大写
 */
export const MULTI_MARKET_TEMPLATE_KEYWORDS = Object.freeze([
  "通用",
  "全市场",
  "所有市场",
  "MULTI-MARKET",
  "MULTI MARKET",
] as const);

/**
 * 多市场报价 Provider 列表
 *
 * @description 仅用于 quote_fields 自动推断 marketType 时识别“全市场”Provider
 */
export const MULTI_MARKET_QUOTE_PROVIDER_IDS = Object.freeze([
  REFERENCE_DATA.PROVIDER_IDS.INFOWAY,
]);

// 说明：已删除 production-types 配置与运行时验证工具，保持常量最小集合


/**
 * 转换默认值常量
 *
 * @description 定义数据转换操作的默认参数值
 * @usage 在转换规则创建和执行时提供标准默认值
 */
// 已移除：转换默认值（非必要）





/**
 * 数据映射默认值常量
 */
// 已移除：默认值集合（非必要）



/**
 * 缓存配置常量
 * 已删除：DATA_MAPPER_CACHE_CONFIG 常量已迁移到专用的 DataMapperCache 模块配置中
 * 位置：src/core/05-caching/module/data-mapper-cache/constants/
 */
