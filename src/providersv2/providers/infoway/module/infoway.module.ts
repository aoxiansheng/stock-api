import { Module } from "@nestjs/common";

import { InfowayProvider } from "../infoway.provider";
import { InfowayContextService } from "../services/infoway-context.service";
import { InfowayStreamContextService } from "../services/infoway-stream-context.service";

@Module({
  providers: [InfowayProvider, InfowayContextService, InfowayStreamContextService],
  exports: [InfowayProvider, InfowayContextService, InfowayStreamContextService],
})
export class InfowayModule {}
