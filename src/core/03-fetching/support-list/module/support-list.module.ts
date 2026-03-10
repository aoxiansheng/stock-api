import { Module } from "@nestjs/common";
import { ProvidersV2Module } from "@providersv2";
import { DataFetcherModule } from "../../data-fetcher/module/data-fetcher.module";
import { StorageModule } from "../../../04-storage/storage/module/storage.module";
import { SupportListDiffService } from "../services/support-list-diff.service";
import { SupportListStoreService } from "../services/support-list-store.service";
import { SupportListFetchGatewayService } from "../services/support-list-fetch-gateway.service";
import { SupportListSyncService } from "../services/support-list-sync.service";
import { SupportListSyncScheduler } from "../services/support-list-sync.scheduler";
import { SupportListReadService } from "../services/support-list-read.service";

@Module({
  imports: [ProvidersV2Module, DataFetcherModule, StorageModule],
  providers: [
    SupportListDiffService,
    SupportListStoreService,
    SupportListFetchGatewayService,
    SupportListSyncService,
    SupportListSyncScheduler,
    SupportListReadService,
  ],
  exports: [SupportListReadService, SupportListSyncService],
})
export class SupportListModule {}

