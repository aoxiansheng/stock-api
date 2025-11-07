import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { DatabaseModule } from "../../../../database/database.module"; // 仅提供连接
import { AuthModule as AuthV2Module } from "@authv2/auth.module";
import { PaginationModule } from "@common/modules/pagination/modules/pagination.module";

import { StorageRepository } from "../repositories/storage.repository";
import { StorageController } from "../controller/storage.controller";
import { StorageService } from "../services/storage.service";
import { StoredData, StoredDataSchema } from "../schemas/storage.schema";

@Module({
  imports: [
    DatabaseModule, // 连接
    // 本模块自有Schema注册
    MongooseModule.forFeature([
      { name: StoredData.name, schema: StoredDataSchema },
    ]),
    AuthV2Module,
    PaginationModule, // 🔥 导入PaginationModule以支持分页功能
    // ✅ Schema 就近注册，DatabaseModule 仅提供连接
  ],
  controllers: [StorageController],
  providers: [StorageService, StorageRepository],
  exports: [StorageService],
})
export class StorageModule {}
