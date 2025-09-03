import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { LongportContextService } from "../services/longport-context.service";
import { LongportStreamContextService } from "../services/longport-stream-context.service";
import { LongportProvider } from "../longport.provider";

@Module({
  providers: [
    LongportProvider,
    LongportContextService,
    // 使用工厂提供者确保真正的单例模式
    {
      provide: LongportStreamContextService,
      useFactory: async (configService: ConfigService) => {
        return await LongportStreamContextService.getInstance(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [
    LongportProvider,
    LongportContextService,
    LongportStreamContextService,
  ],
})
export class LongportModule {}
