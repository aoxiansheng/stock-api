import { Module } from '@nestjs/common';
import { FeatureFlagsService } from './services/feature-flags.service';

/**
 * FeatureFlagsModule - 功能开关模块
 * 
 * 职责：
 * - 管理功能开关
 * - 动态启用/禁用功能
 * - A/B测试支持
 */
@Module({
  providers: [
    {
      provide: 'FEATURE_FLAGS',
      useFactory: () => ({
        enableNewCache: process.env.ENABLE_NEW_CACHE === 'true',
        enableAdvancedMonitoring: process.env.ENABLE_ADVANCED_MONITORING === 'true',
        enableExperimentalFeatures: process.env.ENABLE_EXPERIMENTAL === 'true',
      }),
    },
    FeatureFlagsService,
  ],
  exports: [
    'FEATURE_FLAGS',
    FeatureFlagsService,
  ],
})
export class FeatureFlagsModule {}