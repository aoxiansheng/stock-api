import { Module } from "@nestjs/common";

import { ACTIVE_PROVIDER_MANIFEST } from "./provider-id.constants";

import { ProviderRegistryService } from "./provider-registry.service";

export const PROVIDER_ASSEMBLY_MODULE_IMPORTS = Object.freeze(
  ACTIVE_PROVIDER_MANIFEST.map((entry) => entry.module),
);

@Module({
  imports: [...PROVIDER_ASSEMBLY_MODULE_IMPORTS],
  providers: [ProviderRegistryService],
  exports: [ProviderRegistryService],
})
export class ProvidersV2Module {}
