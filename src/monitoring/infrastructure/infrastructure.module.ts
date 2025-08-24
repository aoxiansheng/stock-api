/**
 * 🎯 基础设施模块
 * 
 * 提供监控基础能力：
 * - Prometheus 指标注册表
 * - 性能监控装饰器
 * - 监控拦截器
 */

import { Module } from '@nestjs/common';
import { MetricsModule } from './metrics/metrics.module';
import { MetricsRegistryService } from './metrics/metrics-registry.service';

@Module({
  imports: [MetricsModule],
  providers: [MetricsRegistryService],
  exports: [MetricsRegistryService, MetricsModule],
})
export class InfrastructureModule {}