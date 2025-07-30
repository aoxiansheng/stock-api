import { Module } from "@nestjs/common";

import { LongportContextService } from "../services/longport-context.service";
import { LongportProvider } from "../longport.provider";

@Module({
  providers: [LongportProvider, LongportContextService],
  exports: [LongportProvider, LongportContextService],
})
export class LongportModule {}
