import type { Type } from "@nestjs/common";

import { REFERENCE_DATA } from "@common/constants/domain";

import { LongportProvider } from "./providers/longport/longport.provider";
import { JvQuantProvider } from "./providers/jvquant/jvquant.provider";
import { InfowayProvider } from "./providers/infoway/infoway.provider";
import { LongportModule } from "./providers/longport/module/longport.module";
import { JvQuantModule } from "./providers/jvquant/module/jvquant.module";
import { InfowayModule } from "./providers/infoway/module/infoway.module";
import type { IDataProvider } from "./providers/interfaces/provider.interface";

interface ProviderManifestDefinition {
  readonly key: keyof typeof REFERENCE_DATA.PROVIDER_IDS;
  readonly priority: number;
  readonly module: Type<unknown>;
  readonly providerToken: Type<IDataProvider>;
  readonly aliases: readonly string[];
}

const ACTIVE_PROVIDER_MANIFEST_DEFINITIONS = Object.freeze([
  {
    key: "LONGPORT",
    priority: 1,
    module: LongportModule,
    providerToken: LongportProvider,
    aliases: [],
  },
  {
    key: "JVQUANT",
    priority: 2,
    module: JvQuantModule,
    providerToken: JvQuantProvider,
    aliases: [],
  },
  {
    key: "INFOWAY",
    priority: 3,
    module: InfowayModule,
    providerToken: InfowayProvider,
    aliases: [],
  },
] as const satisfies readonly ProviderManifestDefinition[]);

type ActiveProviderKey = (typeof ACTIVE_PROVIDER_MANIFEST_DEFINITIONS)[number]["key"];
type ActiveProviderIdMap = {
  [K in ActiveProviderKey]: (typeof REFERENCE_DATA.PROVIDER_IDS)[K];
};

export type ProviderId = ActiveProviderIdMap[ActiveProviderKey];

export interface ProviderManifestEntry {
  readonly key: ActiveProviderKey;
  readonly id: ProviderId;
  readonly priority: number;
  readonly module: Type<unknown>;
  readonly providerToken: Type<IDataProvider>;
  readonly aliases: readonly string[];
}

export const ACTIVE_PROVIDER_MANIFEST: readonly ProviderManifestEntry[] =
  Object.freeze([
    ...ACTIVE_PROVIDER_MANIFEST_DEFINITIONS.map((entry) => ({
      ...entry,
      id: REFERENCE_DATA.PROVIDER_IDS[entry.key],
    })),
  ]);

export const PROVIDER_IDS: Readonly<ActiveProviderIdMap> = Object.freeze(
  Object.fromEntries(
    ACTIVE_PROVIDER_MANIFEST.map((entry) => [entry.key, entry.id]),
  ) as ActiveProviderIdMap,
);

function normalizeAlias(alias: string): string {
  return String(alias || "").trim().toLowerCase();
}

export function buildProviderNameAliases(
  manifest: readonly Pick<ProviderManifestEntry, "id" | "aliases">[],
): Readonly<Record<string, ProviderId>> {
  const aliases: Record<string, ProviderId> = {};

  for (const entry of manifest) {
    for (const rawAlias of entry.aliases) {
      const normalizedAlias = normalizeAlias(rawAlias);
      if (!normalizedAlias) {
        continue;
      }

      const existingProviderId = aliases[normalizedAlias];
      if (existingProviderId && existingProviderId !== entry.id) {
        const conflictProviderIds = [existingProviderId, entry.id].sort((a, b) =>
          a.localeCompare(b),
        );
        throw new Error(
          `Provider alias 冲突: alias=${normalizedAlias}, providers=[${conflictProviderIds.join(", ")}]`,
        );
      }

      aliases[normalizedAlias] = entry.id;
    }
  }

  return Object.freeze(aliases);
}

export const PROVIDER_NAME_ALIASES: Readonly<Record<string, ProviderId>> =
  buildProviderNameAliases(ACTIVE_PROVIDER_MANIFEST);
