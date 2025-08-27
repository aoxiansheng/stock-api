import { Module } from '@nestjs/common';
import { SymbolMapperCacheModule } from '../../../05-caching/symbol-mapper-cache/module/symbol-mapper-cache.module';
import { MonitoringModule } from '../../../../monitoring/monitoring.module'; // ✅ 替换 PresenterModule
import { SymbolTransformerService } from '../services/symbol-transformer.service';

@Module({
  imports: [
    SymbolMapperCacheModule,
    MonitoringModule, // ✅ 标准监控模块导入（替换 PresenterModule）
  ],
  providers: [SymbolTransformerService],
  exports: [SymbolTransformerService],
})
export class SymbolTransformerModule {}