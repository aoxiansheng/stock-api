/**
 * basic-cache 极简导出
 */

// 极简服务与模块
export { BasicCacheService } from "./services/basic-cache.service";
export { BasicCacheModule } from "./module/basic-cache.module";

// 工具类（保留键工具）
export { CacheKeyUtils } from "./utils/cache-key.utils";

// 常量（保留通用前缀与特殊值）
export {
  CACHE_KEY_PREFIXES,
  CACHE_RESULT_STATUS,
  CACHE_PRIORITY,
  DATA_SOURCE,
  COMPRESSION_ALGORITHMS,
  CACHE_DEFAULTS,
  REDIS_SPECIAL_VALUES,
  CACHE_REDIS_CLIENT_TOKEN,
} from "./constants/cache.constants";
