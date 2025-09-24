/**
 * CommonCache模块统一导出
 */

// 核心服务
export { BasicCacheService } from "./services/basic-cache.service";
export { CacheCompressionService } from "./services/cache-compression.service";

// 模块
export {
  BasicCacheModule,
} from "./module/basic-cache.module";

// 接口
export type {
  CacheMetadata,
  RedisEnvelope,
  CacheResult,
} from "./interfaces/cache-metadata.interface";

// DTO
export {
  CacheRequestDto,
  BatchCacheRequestDto,
} from "./dto/cache-request.dto";
export {
  CacheResultDto,
  BatchCacheResultDto,
  RedisCacheRuntimeStatsDto,
} from "./dto/cache-result.dto";
export {
  CacheComputeOptionsDto,
} from "./dto/cache-compute-options.dto";
export {
  TtlComputeParamsDto,
  TtlComputeResultDto
} from "./dto/ttl-compute-params.dto";

// 工具类
export { CacheKeyUtils } from "./utils/cache-key.utils";
export { RedisValueUtils } from "./utils/redis-value.utils";

// 常量
export {
  CACHE_KEY_PREFIXES,
  // CACHE_OPERATIONS 已迁移到系统级，使用 import { CACHE_CORE_OPERATIONS } from '../../../cache/constants/cache.constants'
  CACHE_RESULT_STATUS,
  CACHE_PRIORITY,
  DATA_SOURCE,
  COMPRESSION_ALGORITHMS,
  CACHE_DEFAULTS,
  REDIS_SPECIAL_VALUES,
} from "./constants/cache.constants";
export {
  CACHE_CONFIG,
  CACHE_STRATEGIES,
} from "./constants/cache-config.constants";

// 注意: 共享常量已迁移到foundation层
// 请直接从 '../../../foundation/constants/core-values.constants' 导入

export type {
  CacheStrategy,
  CacheOperation,
  CompressionAlgorithm,
} from "./constants/cache-config.constants";
