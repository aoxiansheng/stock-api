import { Module } from "@nestjs/common";

import { ACTIVE_PROVIDER_MANIFEST } from "./provider-id.constants";

import { ProviderPriorityPolicyService } from "./provider-priority-policy.service";
import { ProviderRegistryService } from "./provider-registry.service";

export const PROVIDER_ASSEMBLY_MODULE_IMPORTS = Object.freeze(
  ACTIVE_PROVIDER_MANIFEST.map((entry) => entry.module),
);

@Module({
  imports: [...PROVIDER_ASSEMBLY_MODULE_IMPORTS],
  providers: [ProviderPriorityPolicyService, ProviderRegistryService],
  exports: [ProviderPriorityPolicyService, ProviderRegistryService],
})
export class ProvidersV2Module {}
