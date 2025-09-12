import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../../../database/database.module"; // 🆕 统一数据库模块
import { AuthModule } from "../../../../auth/module/auth.module";
import { PaginationModule } from "@common/modules/pagination/modules/pagination.module";
import { MonitoringModule } from "../../../../monitoring/monitoring.module";

import { StorageRepository } from "../repositories/storage.repository";
import { StorageController } from "../controller/storage.controller";
import { StorageService } from "../services/storage.service";

@Module({
  imports: [
    DatabaseModule, // ✅ 使用统一数据库模块 (StoredData Schema 已在 CoreDatabaseModule 中注册)
    AuthModule,
    PaginationModule, // 🔥 导入PaginationModule以支持分页功能
    MonitoringModule, // ✅ 新增监控模块
    // ✅ 使用统一DatabaseModule (CoreDatabaseModule包含StoredData schema)
  ],
  controllers: [StorageController],
  providers: [StorageService, StorageRepository],
  exports: [StorageService],
})
export class StorageModule {}
