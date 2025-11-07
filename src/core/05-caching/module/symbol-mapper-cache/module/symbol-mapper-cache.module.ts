import { Module } from "@nestjs/common";
// 导入缓存服务
import { SymbolMapperCacheStandardizedService } from "../services/symbol-mapper-cache-standardized.service";

/**
 * Symbol Mapper Cache 独立模块 (简化版本)
 *
 * 功能:
 * - 提供三层缓存架构 (L1规则缓存 + L2符号映射 + L3批量结果)
 * - LRU内存缓存管理
 * - 内存水位监控和自动清理
 * - 标准化缓存模块接口实现
 * - 简化架构，专注核心功能，移除复杂监控
 *
 * 服务架构:
 * - SymbolMapperCacheStandardizedService: 标准化服务 (唯一服务)
 */
@Module({
  imports: [],
  providers: [
    // 标准化服务 (唯一服务)
    SymbolMapperCacheStandardizedService,
  ],
  exports: [
    // 导出标准化服务 (唯一导出)
    SymbolMapperCacheStandardizedService,
  ],
})
export class SymbolMapperCacheModule {}
