import { Module } from "@nestjs/common";

import { JvQuantProvider } from "../jvquant.provider";
import { JvQuantStreamContextService } from "../services/jvquant-stream-context.service";

@Module({
  providers: [JvQuantProvider, JvQuantStreamContextService],
  exports: [JvQuantProvider, JvQuantStreamContextService],
})
export class JvQuantModule {}
