/**
 * Domain层统一导出
 * 🏢 领域层 - 业务领域专用常量
 * 🎯 基于Semantic层构建，专注于具体业务领域逻辑
 */



export {
  OPERATION_LIMITS,
  OperationLimitsUtil
} from './operation-limits.constants';
export type {
  OperationType,
  DataVolume as OperationDataVolume,
  CacheDataType
} from './operation-limits.constants';

export {
  REFERENCE_DATA,
  ReferenceDataUtil
} from './reference-data.constants';
export {
  API_OPERATIONS,
  ApiOperationsUtil
} from './api-operations.constants';
export type {
  ApiDataType,
  ApiMarketType,
  ApiFetchMode,
  ApiBusinessScenario,
  ApiCacheStrategy
} from './api-operations.constants';



import {
  OPERATION_LIMITS,
  OperationLimitsUtil
} from './operation-limits.constants';

import {
  REFERENCE_DATA,
  ReferenceDataUtil
} from './reference-data.constants';

import {
  API_OPERATIONS,
  ApiOperationsUtil
} from './api-operations.constants';

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
} as const);

/**
 * Domain层工具函数集合
 */
export class DomainUtils {
 
}
