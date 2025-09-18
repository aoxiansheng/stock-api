/**
 * Domain层统一导出
 * 🏢 领域层 - 业务领域专用常量
 * 🎯 基于Semantic层构建，专注于具体业务领域逻辑
 */

export {
  OPERATION_LIMITS,
} from "./operation-limits.constants";
export type {
  OperationType,
  DataVolume as OperationDataVolume,
  CacheDataType,
} from "./operation-limits.constants";

export { REFERENCE_DATA } from "./reference-data.constants";
export { API_OPERATIONS } from "./api-operations.constants";

// 🎯 Phase 2.4: Redis特定常量导出
export {
  REDIS_KEY_CONSTRAINTS,
  REDIS_DATA_CONSTRAINTS,
  REDIS_CONNECTION_CONSTRAINTS,
  REDIS_COMMAND_CATEGORIES,
} from "./redis-specific.constants";
export type {
  ApiDataType,
  ApiMarketType,
  ApiFetchMode,
  ApiBusinessScenario,
  ApiCacheStrategy,
} from "./api-operations.constants";

import {
  OPERATION_LIMITS,
} from "./operation-limits.constants";

import { REFERENCE_DATA } from "./reference-data.constants";

import { API_OPERATIONS } from "./api-operations.constants";

import {
  REDIS_KEY_CONSTRAINTS,
  REDIS_DATA_CONSTRAINTS,
} from "./redis-specific.constants";

// Domain层统一常量对象
export const DOMAIN_CONSTANTS = Object.freeze({
  // 操作限制
  OPERATION: {
    BATCH_SIZES: OPERATION_LIMITS.BATCH_SIZES,
  },

  // 参考数据
  REFERENCE: {
    SAMPLE_SYMBOLS: REFERENCE_DATA.SAMPLE_SYMBOLS,
    PROVIDER_IDS: REFERENCE_DATA.PROVIDER_IDS,
  },

  // API操作
  API: {
    BUSINESS_SCENARIOS: API_OPERATIONS.BUSINESS_SCENARIOS,
  },

  // 🎯 Phase 2.4: Redis技术常量
  REDIS: {
    KEY_CONSTRAINTS: REDIS_KEY_CONSTRAINTS,
    DATA_CONSTRAINTS: REDIS_DATA_CONSTRAINTS,
  },
} as const);

/**
 * Domain层工具函数集合
 */
export class DomainUtils {}
