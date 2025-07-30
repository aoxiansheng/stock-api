import { Module } from "@nestjs/common";

import { LongportSgContextService } from "../services/longport-sg-context.service";
import { LongportSgProvider } from "../longport-sg.provider";

@Module({
  providers: [LongportSgProvider, LongportSgContextService],
  exports: [LongportSgProvider, LongportSgContextService],
})
export class LongportSgModule {}
