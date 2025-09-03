import { RedisCacheRuntimeStatsDto } from "../redis-cache-runtime-stats.dto";

/**
 * @deprecated 使用 RedisCacheRuntimeStatsDto 替代
 * 
 * 🎯 废弃原因：
 * 1. 命名冲突：与 StorageCacheStatsDto 存在语义混淆
 * 2. 职责不清：CacheStatsDto 名称过于泛化，不明确具体统计对象
 * 3. 架构优化：新的 RedisCacheRuntimeStatsDto 提供更明确的类型定义和运行时统计信息
 * 
 * 🔄 迁移路径：
 * ```typescript
 * // ❌ 旧方式（已废弃）
 * import { CacheStatsDto } from './deprecated/cache-stats.dto'
 * const stats: CacheStatsDto = await cacheService.getStats();
 * 
 * // ✅ 新方式（推荐）
 * import { RedisCacheRuntimeStatsDto } from '../redis-cache-runtime-stats.dto'
 * const stats: RedisCacheRuntimeStatsDto = await cacheService.getStats();
 * ```
 * 
 * ⚠️  兼容性说明：
 * - 此类型别名将在 v2.0 版本中移除
 * - 所有功能均已迁移到 RedisCacheRuntimeStatsDto
 * - 数据结构完全兼容，无需修改业务逻辑
 * 
 * 📚 相关文档：
 * - 详细迁移指南：docs/migrations/cache-dto-migration.md
 * - Redis 缓存统计：src/cache/dto/redis-cache-runtime-stats.dto.ts
 * - 存储缓存统计：src/storage/dto/storage-cache-stats.dto.ts（如果存在）
 * 
 * @since v1.2.0 废弃
 * @removed v2.0.0 计划移除
 */
export type CacheStatsDto = RedisCacheRuntimeStatsDto;

// 重新导出新的DTO类，便于导入
export { RedisCacheRuntimeStatsDto } from "../redis-cache-runtime-stats.dto";