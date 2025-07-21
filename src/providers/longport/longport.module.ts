import { Module } from "@nestjs/common";

import { LongportContextService } from "./longport-context.service";
import { LongportProvider } from "./longport.provider";

@Module({
  providers: [LongportProvider, LongportContextService],
  exports: [LongportProvider, LongportContextService],
})
export class LongportModule {}
