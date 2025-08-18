import { Module } from '@nestjs/common';
import { SymbolMapperCacheModule } from '../../../05-caching/symbol-mapper-cache/module/symbol-mapper-cache.module';
import { MonitoringModule } from '../../../../monitoring/module/monitoring.module';
import { SymbolTransformerService } from '../services/symbol-transformer.service';

@Module({
  imports: [
    SymbolMapperCacheModule, // 缓存服务
    MonitoringModule,        // 监控服务（可选）
  ],
  providers: [SymbolTransformerService],
  exports: [SymbolTransformerService],
})
export class SymbolTransformerModule {}