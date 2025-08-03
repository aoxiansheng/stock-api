import { Module } from '@nestjs/common';
import { StreamReceiverGateway } from './stream-receiver.gateway';
import { StreamReceiverService } from './stream-receiver.service';
import { WsAuthGuard } from './guards/ws-auth.guard';

// 导入依赖模块
import { AuthModule } from '../../auth/module/auth.module';
import { ProvidersModule } from '../../providers/module/providers.module';
import { SymbolMapperModule } from '../symbol-mapper/module/symbol-mapper.module';
import { TransformerModule } from '../transformer/module/transformer.module';

@Module({
  imports: [
    AuthModule,        // 认证服务
    ProvidersModule,   // 提供商能力注册
    SymbolMapperModule, // 符号映射服务
    TransformerModule,  // 数据转换服务
  ],
  providers: [
    StreamReceiverGateway,
    StreamReceiverService,
    WsAuthGuard,
  ],
  exports: [
    StreamReceiverGateway,
    StreamReceiverService,
  ],
})
export class StreamReceiverModule {}