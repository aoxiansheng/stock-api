import { Module } from "@nestjs/common";

import { AuthModule } from "../../../../auth/module/auth.module";
import { DataMapperModule } from "../../data-mapper/module/data-mapper.module";

import { TransformerController } from "../controller/transformer.controller";
import { TransformerService } from "../services/transformer.service";

@Module({
  imports: [AuthModule, DataMapperModule],
  controllers: [TransformerController],
  providers: [TransformerService],
  exports: [TransformerService],
})
export class TransformerModule {}
