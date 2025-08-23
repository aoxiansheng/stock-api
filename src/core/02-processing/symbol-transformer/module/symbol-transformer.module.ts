import { Module } from '@nestjs/common';
import { SymbolMapperCacheModule } from '../../../05-caching/symbol-mapper-cache/module/symbol-mapper-cache.module';
import { PresenterModule } from '../../../../monitoring/presenter/presenter.module';
import { SymbolTransformerService } from '../services/symbol-transformer.service';

@Module({
  imports: [
    SymbolMapperCacheModule, // 缓存服务
    PresenterModule,        // 监控服务（可选）
  ],
  providers: [SymbolTransformerService],
  exports: [SymbolTransformerService],
})
export class SymbolTransformerModule {}