import { Module } from '@nestjs/common';
import { FeatureFlags } from '@common/config/feature-flags.config';
import { SymbolTransformerModule } from '../../02-processing/symbol-transformer/module/symbol-transformer.module';
import { DataMapperModule } from '../../00-prepare/data-mapper/module/data-mapper.module';
import { BatchOptimizationService } from '../services/batch-optimization.service';

/**
 * 🎯 性能优化共享模块
 * 
 * 提供跨组件协同优化服务
 */
@Module({
  imports: [
    SymbolTransformerModule,
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