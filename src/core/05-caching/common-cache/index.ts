/**
 * CommonCache模块统一导出
 */

// 核心服务
export { CommonCacheService } from './services/common-cache.service';
export { CacheCompressionService } from './services/cache-compression.service';

// 模块
export { CommonCacheModule, CommonCacheAsyncModule } from './module/common-cache.module';

// 接口
export type {
  ICacheOperation,
  ICacheFallback,
  ICacheMetadata,
} from './interfaces/cache-operation.interface';
export type {
  CacheMetadata,
  RedisEnvelope,
  CacheResult,
} from './interfaces/cache-metadata.interface';

// DTO
export { CacheRequestDto, BatchCacheRequestDto, CacheFallbackRequestDto } from './dto/cache-request.dto';
export { CacheResultDto, BatchCacheResultDto, RedisCacheRuntimeStatsDto } from './dto/cache-result.dto';
export { CacheComputeOptionsDto, TtlComputeParamsDto } from './dto/cache-compute-options.dto';
export { TtlComputeResultDto } from './dto/ttl-compute-params.dto';
export { SmartCacheResultDto, BatchSmartCacheResultDto } from './dto/smart-cache-result.dto';

// 工具类
export { CacheKeyUtils } from './utils/cache-key.utils';
export { RedisValueUtils } from './utils/redis-value.utils';

// 常量
export {
  CACHE_KEY_PREFIXES,
  CACHE_OPERATIONS,
  CACHE_RESULT_STATUS,
  CACHE_PRIORITY,
  DATA_SOURCE,
  COMPRESSION_ALGORITHMS,
  CACHE_DEFAULTS,
  REDIS_SPECIAL_VALUES,
} from './constants/cache.constants';
export {
  CACHE_CONFIG,
  CACHE_STRATEGIES,
} from './constants/cache-config.constants';
export type {
  CacheStrategy,
  CacheOperation,
  CompressionAlgorithm,
} from './constants/cache-config.constants';

