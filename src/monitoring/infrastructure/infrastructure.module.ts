/**
 * 🎯 基础设施模块
 * 
 * 提供监控基础能力：
 * - Prometheus 指标注册表
 * - 性能监控装饰器
 * - 监控拦截器
 */

import { Module } from '@nestjs/common';
import { InfrastructureMetricsModule } from './metrics/infrastructure-metrics.module';
import { InfrastructureMetricsRegistryService } from './metrics/infrastructure-metrics-registry.service';

@Module({
  imports: [InfrastructureMetricsModule],
  providers: [InfrastructureMetricsRegistryService],
  exports: [InfrastructureMetricsRegistryService, InfrastructureMetricsModule],
})
export class InfrastructureModule {}