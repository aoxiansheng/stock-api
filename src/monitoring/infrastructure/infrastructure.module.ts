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
// import { MetricsRegistryService } from './metrics/metrics-registry.service'; // 🔧 Phase 1: 移除未使用的 import
import { FeatureFlags } from '../../common/config/feature-flags.config';

@Module({
  imports: [MetricsModule],
  providers: [
    FeatureFlags, // 🔧 Phase 2.4: 集中提供 FeatureFlags（满足 MetricsRegistryService 依赖）
  ],
  exports: [
    MetricsModule, // 🔧 导出 MetricsModule
    FeatureFlags,  // 🔧 Phase 2.4: 导出 FeatureFlags 供其他模块使用
  ],
})
export class InfrastructureModule {}