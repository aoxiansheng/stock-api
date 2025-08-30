/**
 * 共享业务服务模块
 * 🎯 提供核心业务逻辑服务，仍需全局可用以解决循环依赖
 */

import { Module, Global } from "@nestjs/common";

import { CacheModule } from "../../../cache/module/cache.module";
import { MonitoringModule } from '../../../monitoring/monitoring.module';

import { DataChangeDetectorService } from "../services/data-change-detector.service";
import { MarketStatusService } from "../services/market-status.service";
import { FieldMappingService } from "../services/field-mapping.service";

/**
 * 核心业务服务模块，提供跨组件共享的业务逻辑
 *
 * @remarks
 * 这些服务包含核心业务逻辑，需要在多个组件间共享：
 * - DataChangeDetectorService: 数据变化检测逻辑
 * - MarketStatusService: 市场状态和交易时间计算
 * - FieldMappingService: 组件间字段映射转换
 * 
 * 保留 @Global() 是因为这些服务包含业务逻辑，需要在core组件间共享。
 * 纯工具类已迁移到 SharedUtilsModule
 * 基础设施服务已迁移到 src/app/services/infrastructure/
 */
@Global()
@Module({
  imports: [
    CacheModule,
    MonitoringModule,
  ],
  providers: [
    DataChangeDetectorService,
    MarketStatusService,
    FieldMappingService,
  ],
  exports: [
    DataChangeDetectorService,
    MarketStatusService,
    FieldMappingService,
  ],
})
export class SharedServicesModule {}
