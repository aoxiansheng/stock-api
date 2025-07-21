/**
 * 共享服务模块
 * 🎯 提供核心组件间共享的服务，解决循环依赖
 */

import { Module } from '@nestjs/common';

import { CacheModule } from '../../cache/cache.module';
import { ProvidersModule } from '../../providers/providers.module';

import { DataChangeDetectorService } from './services/data-change-detector.service';
import { DataFetchingService } from './services/data-fetching.service';
import { MarketStatusService } from './services/market-status.service';

@Module({
  imports: [
    CacheModule,
    ProvidersModule,
  ],
  providers: [
    DataFetchingService,
    DataChangeDetectorService,
    MarketStatusService,
  ],
  exports: [
    DataFetchingService,
    DataChangeDetectorService,
    MarketStatusService,
  ],
})
export class SharedServicesModule {}