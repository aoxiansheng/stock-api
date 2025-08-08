import { Module } from '@nestjs/common';
import { FeatureFlags } from '@common/config/feature-flags.config';
import { SymbolMapperModule } from '../../symbol-mapper/module/symbol-mapper.module';
import { DataMapperModule } from '../../data-mapper/module/data-mapper.module';
import { BatchOptimizationService } from '../services/batch-optimization.service';

/**
 * 🎯 性能优化共享模块
 * 
 * 提供跨组件协同优化服务
 */
@Module({
  imports: [
    SymbolMapperModule,
    DataMapperModule,
  ],
  providers: [
    FeatureFlags,
    BatchOptimizationService,
  ],
  exports: [
    BatchOptimizationService,
    FeatureFlags,
  ],
})
export class PerformanceOptimizationModule {}