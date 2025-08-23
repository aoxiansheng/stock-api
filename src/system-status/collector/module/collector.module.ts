import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

import { CollectorService } from '../services/collector.service';
import { CollectorRepository } from '../repositories/collector.repository';
import { CollectorInterceptor } from '../interceptors/collector.interceptor';

/**
 * 收集器模块
 * 提供纯数据收集功能，不包含任何计算逻辑
 */
@Module({
  imports: [
    ConfigModule,
    EventEmitterModule,
    ScheduleModule.forRoot(),
  ],
  providers: [
    CollectorService,
    CollectorRepository,
    CollectorInterceptor,
    {
      provide: 'ICollector',
      useClass: CollectorService
    }
  ],
  exports: [
    'ICollector',
    CollectorService,
    CollectorRepository,
    CollectorInterceptor
  ],
})
export class CollectorModule {}