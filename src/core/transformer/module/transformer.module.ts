import { Module } from "@nestjs/common";

import { AuthModule } from "../../../auth/auth.module";
import { DataMapperModule } from "../../data-mapper/module/data-mapper.module";

import { TransformerController } from "../controller/transformer.controller";
import { TransformerService } from "../service/transformer.service";

@Module({
  imports: [AuthModule, DataMapperModule],
  controllers: [TransformerController],
  providers: [TransformerService],
  exports: [TransformerService],
})
export class TransformerModule {}
