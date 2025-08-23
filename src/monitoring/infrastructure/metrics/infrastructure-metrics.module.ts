/**
 * 🎯 基础设施指标模块
 * 
 * 专门管理 Prometheus 指标相关功能
 */

import { Module } from '@nestjs/common';
import { InfrastructureMetricsRegistryService } from './infrastructure-metrics-registry.service';

@Module({
  providers: [InfrastructureMetricsRegistryService],
  exports: [InfrastructureMetricsRegistryService],
})
export class InfrastructureMetricsModule {}