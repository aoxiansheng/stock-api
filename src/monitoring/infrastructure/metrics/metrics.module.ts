/**
 * 🎯 基础设施指标模块
 * 
 * 专门管理 Prometheus 指标相关功能
 */

import { Module } from '@nestjs/common';
import { MetricsRegistryService } from './metrics-registry.service';
import { FeatureFlags } from '../../../common/config/feature-flags.config';

@Module({
  providers: [
    MetricsRegistryService,
    FeatureFlags  // 添加FeatureFlags作为provider
  ],
  exports: [MetricsRegistryService],
})
export class MetricsModule {}