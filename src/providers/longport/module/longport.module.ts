import { Module } from "@nestjs/common";

import { LongportContextService } from "../services/longport-context.service";
import { LongportStreamContextService } from "../services/longport-stream-context.service";
import { LongportProvider } from "../longport.provider";

@Module({
  providers: [LongportProvider, LongportContextService, LongportStreamContextService],
  exports: [LongportProvider, LongportContextService, LongportStreamContextService],
})
export class LongportModule {}
