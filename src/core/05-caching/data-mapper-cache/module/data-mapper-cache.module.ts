import { Module } from '@nestjs/common';
import { DataMapperCacheService } from '../services/data-mapper-cache.service';
import { MonitoringModule } from '../../../../monitoring/monitoring.module';

/**
 * DataMapper 缓存模块
 * 专用于映射规则缓存的独立模块
 * 
 * 设计原则：
 * 1. 单一职责：仅处理 DataMapper 相关缓存
 * 2. 依赖最小化：直接依赖 RedisService
 * 3. 模块化：可独立导入和使用
 */
@Module({
  imports: [
    // ❌ 删除 NestRedisModule - 使用全局注入的 RedisService
    MonitoringModule, // ✅ 导入监控模块，提供CollectorService
  ],
  providers: [
    DataMapperCacheService,
    // ✅ 提供CollectorService
    {
      provide: 'CollectorService',
      useFactory: () => ({
        recordCacheOperation: () => {}, // fallback mock
      }),
    },
  ],
  exports: [
    DataMapperCacheService, // 导出专用缓存服务供其他模块使用
  ],
})
export class DataMapperCacheModule {}