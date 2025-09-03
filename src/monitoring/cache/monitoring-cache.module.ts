/**
 * 🎯 监控缓存模块
 *
 * 独立的缓存服务模块，消除循环依赖：
 * - 提供MonitoringCacheService给其他模块使用
 * - 避免MonitoringModule和AnalyzerModule之间的循环引用
 * - 支持事件驱动的缓存操作
 */

import { Module } from "@nestjs/common";
import { CacheModule } from "@cache/module/cache.module";
import { MonitoringCacheService } from "./monitoring-cache.service";

@Module({
  imports: [
    CacheModule, // 依赖基础缓存模块
  ],
  providers: [MonitoringCacheService],
  exports: [
    MonitoringCacheService, // 导出供其他模块使用
  ],
})
export class MonitoringCacheModule {}
