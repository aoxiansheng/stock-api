import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { LongportSgContextService } from "../services/longport-context.service";
import { LongportSgStreamContextService } from "../services/longport-stream-context.service";
import { LongportSgProvider } from "../longport-sg.provider";

@Module({
  providers: [
    LongportSgProvider,
    LongportSgContextService,
    // 使用工厂提供者确保真正的单例模式
    {
      provide: LongportSgStreamContextService,
      useFactory: async (configService: ConfigService) => {
        return await LongportSgStreamContextService.getInstance(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [
    LongportSgProvider,
    LongportSgContextService,
    LongportSgStreamContextService,
  ],
})
export class LongportSgModule {}
