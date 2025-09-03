import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";

import { AuthModule } from "../../../../auth/module/auth.module";
import { DataMapperModule } from "../../../00-prepare/data-mapper/module/data-mapper.module";
import { MonitoringModule } from "../../../../monitoring/monitoring.module"; // ✅ 新增标准监控模块导入

import { DataTransformerController } from "../controller/data-transformer.controller";
import { DataTransformerService } from "../services/data-transformer.service";

@Module({
  imports: [
    AuthModule,
    DataMapperModule,
    EventEmitterModule, // ✅ 事件驱动监控必需
    MonitoringModule, // ✅ 标准监控模块导入
  ],
  controllers: [DataTransformerController],
  providers: [DataTransformerService],
  exports: [DataTransformerService],
})
export class TransformerModule {}
