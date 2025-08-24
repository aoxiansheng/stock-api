/**
 * 🎯 数据收集模块
 * 
 * 负责收集原始监控数据：
 * - HTTP 请求监控
 * - 数据库操作监控
 * - 系统指标收集
 */

import { Module } from '@nestjs/common';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { CollectorService } from './collector.service';
import { CollectorRepository } from './collector.repository';
import { CollectorInterceptor } from './collector.interceptor';

@Module({
  imports: [InfrastructureModule],
  providers: [
    CollectorService,
    CollectorRepository,
    CollectorInterceptor,
  ],
  exports: [
    CollectorService,
    CollectorRepository,
    CollectorInterceptor,
  ],
})
export class CollectorModule {}