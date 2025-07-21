import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../../auth/auth.module";

import { StorageRepository } from "./repositories/storage.repository";
import { StoredData, StoredDataSchema } from "./schemas/storage.schema";
import { StorageController } from "./storage.controller";
import { StorageService } from "./storage.service";

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: StoredData.name, schema: StoredDataSchema },
    ]),
  ],
  controllers: [StorageController],
  providers: [StorageService, StorageRepository],
  exports: [StorageService],
})
export class StorageModule {}
