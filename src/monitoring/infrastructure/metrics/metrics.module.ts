/**
 * 🎯 基础设施指标模块
 * 
 * 专门管理 Prometheus 指标相关功能
 */

import { Module } from '@nestjs/common';
import { MetricsRegistryService } from './metrics-registry.service';

@Module({
  providers: [MetricsRegistryService],
  exports: [MetricsRegistryService],
})
export class MetricsModule {}