import { Module } from '@nestjs/common';
import { RedisModule as NestRedisModule } from '@liaoliaots/nestjs-redis';
import { DataMapperCacheService } from '../services/data-mapper-cache.service';

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
    NestRedisModule, // 直接导入 Redis 模块，获得 RedisService
  ],
  providers: [
    DataMapperCacheService,
  ],
  exports: [
    DataMapperCacheService, // 导出专用缓存服务供其他模块使用
  ],
})
export class DataMapperCacheModule {}