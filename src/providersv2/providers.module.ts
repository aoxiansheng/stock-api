import { Module } from "@nestjs/common";

import { LongportModule } from "./providers/longport/module/longport.module";
import { LongportSgModule } from "./providers/longport-sg/module/longport-sg.module";

import { ProviderRegistryService } from "./provider-registry.service";

@Module({
  imports: [LongportModule, LongportSgModule],
  providers: [ProviderRegistryService],
  exports: [ProviderRegistryService],
})
export class ProvidersV2Module {}

