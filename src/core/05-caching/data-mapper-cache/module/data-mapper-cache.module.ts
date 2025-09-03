import { Module } from "@nestjs/common";
import { DataMapperCacheService } from "../services/data-mapper-cache.service";
import { EventEmitterModule } from "@nestjs/event-emitter";

/**
 * DataMapper 缓存模块
 * 专用于映射规则缓存的独立模块
 *
 * 设计原则：
 * 1. 单一职责：仅处理 DataMapper 相关缓存
 * 2. 事件驱动监控：使用 EventEmitter2 实现完全解耦
 * 3. 模块化：可独立导入和使用
 */
@Module({
  imports: [
    EventEmitterModule, // ✅ 事件驱动监控依赖
  ],
  providers: [DataMapperCacheService],
  exports: [
    DataMapperCacheService, // 导出专用缓存服务供其他模块使用
  ],
})
export class DataMapperCacheModule {}
