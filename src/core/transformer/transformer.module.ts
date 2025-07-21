import { Module } from "@nestjs/common";

import { AuthModule } from "../../auth/auth.module";
import { DataMapperModule } from "../data-mapper/data-mapper.module";

import { TransformerController } from "./transformer.controller";
import { TransformerService } from "./transformer.service";

@Module({
  imports: [AuthModule, DataMapperModule],
  controllers: [TransformerController],
  providers: [TransformerService],
  exports: [TransformerService],
})
export class TransformerModule {}
