import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../../../../auth/module/auth.module";
import { PaginationModule } from "@common/modules/pagination/modules/pagination.module";
import { MonitoringModule } from "../../../../monitoring/monitoring.module";

import { StorageRepository } from "../repositories/storage.repository";
import { StoredData, StoredDataSchema } from "../schemas/storage.schema";
import { StorageController } from "../controller/storage.controller";
import { StorageService } from "../services/storage.service";

@Module({
  imports: [
    AuthModule,
    PaginationModule, // 🔥 导入PaginationModule以支持分页功能
    MonitoringModule, // ✅ 新增监控模块
    MongooseModule.forFeature([
      { name: StoredData.name, schema: StoredDataSchema },
    ]),
  ],
  controllers: [StorageController],
  providers: [StorageService, StorageRepository],
  exports: [StorageService],
})
export class StorageModule {}
