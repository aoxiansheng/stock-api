import {
  ACTIVE_PROVIDER_MANIFEST,
  PROVIDER_IDS,
} from "@providersv2/provider-id.constants";
import { ProviderRegistryService } from "@providersv2/provider-registry.service";
import { ProviderPriorityPolicyService } from "@providersv2/provider-priority-policy.service";
import {
  PROVIDER_ASSEMBLY_MODULE_IMPORTS,
  ProvidersV2Module,
} from "@providersv2/providers.module";
import { CAPABILITY_NAMES } from "@providersv2/providers/constants/capability-names.constants";
import {
  SUPPORTED_CAPABILITY_TYPES,
  assertReceiverCapabilityWhitelistSync,
} from "@core/01-entry/receiver/constants/operations.constants";
import type { ICapability } from "@providersv2/providers/interfaces/capability.interface";
import type { IDataProvider } from "@providersv2/providers/interfaces/provider.interface";
import type { ModuleRef } from "@nestjs/core";

function createCapability(name: string, supportedMarkets: string[]): ICapability {
  return {
    name,
    description: `${name} capability`,
    supportedMarkets,
    supportedSymbolFormats: ["symbol.market"],
    execute: jest.fn().mockResolvedValue(null),
  };
}

function createProvider(
  name: string,
  capabilityName: string,
  supportedMarkets: string[],
): IDataProvider {
  return createProviderWithCapabilities(name, [capabilityName], supportedMarkets);
}

function createProviderWithCapabilities(
  name: string,
  capabilityNames: string[],
  supportedMarkets: string[],
): IDataProvider {
  const capabilityMap = new Map(
    capabilityNames.map((capabilityName) => [
      capabilityName,
      createCapability(capabilityName, supportedMarkets),
    ]),
  );
  return {
    name,
    description: `${name} provider`,
    capabilities: Array.from(capabilityMap.values()),
    initialize: jest.fn().mockResolvedValue(undefined),
    testConnection: jest.fn().mockResolvedValue(true),
    getCapability: (targetName: string) =>
      capabilityMap.get(targetName) || null,
  };
}

function collectActiveCapabilityNames(service: ProviderRegistryService): string[] {
  const activeCapabilityNames: string[] = [];
  for (const providerCapabilities of service.getAllCapabilities().values()) {
    for (const [capabilityName, capabilityMeta] of providerCapabilities.entries()) {
      if (capabilityMeta?.isEnabled === false) {
        continue;
      }
      activeCapabilityNames.push(
        String(capabilityMeta?.capability?.name || capabilityName),
      );
    }
  }
  return activeCapabilityNames;
}

function createRegistryService(moduleRef: ModuleRef): ProviderRegistryService {
  return new ProviderRegistryService(
    moduleRef,
    new ProviderPriorityPolicyService(),
  );
}

describe("provider assembly sync", () => {
  it("active provider 集合在 manifest / PROVIDER_IDS 间保持一致", () => {
    const manifestIds = ACTIVE_PROVIDER_MANIFEST.map((entry) => entry.id).sort(
      (a, b) => a.localeCompare(b),
    );
    const providerIds = Object.values(PROVIDER_IDS).sort((a, b) =>
      a.localeCompare(b),
    );

    expect(manifestIds).toEqual(providerIds);
  });

  it("ProvidersV2Module imports 应与 manifest module 列表同步", () => {
    const manifestModules = ACTIVE_PROVIDER_MANIFEST.map((entry) => entry.module);
    const moduleMetadataImports =
      (Reflect.getMetadata("imports", ProvidersV2Module) as unknown[]) || [];

    expect(PROVIDER_ASSEMBLY_MODULE_IMPORTS).toEqual(manifestModules);
    expect(moduleMetadataImports).toEqual(manifestModules);
  });

  it("registry 应按 manifest providerToken 装配 provider", async () => {
    const providerById = Object.fromEntries(
      ACTIVE_PROVIDER_MANIFEST.map((entry) => [
        entry.id,
        createProvider(entry.id, "get-stock-quote", ["US"]),
      ]),
    ) as Record<string, IDataProvider>;

    const moduleRefMock = {
      get: jest.fn((token: unknown) => {
        const entry = ACTIVE_PROVIDER_MANIFEST.find(
          (manifest) => manifest.providerToken === token,
        );
        return entry ? providerById[entry.id] : undefined;
      }),
    } as unknown as ModuleRef;

    const service = createRegistryService(moduleRefMock);
    await service.onModuleInit();

    expect(service.getBestProvider("get-stock-quote", "US")).toBe(
      PROVIDER_IDS.LONGPORT,
    );
    expect(moduleRefMock.get).toHaveBeenCalledTimes(ACTIVE_PROVIDER_MANIFEST.length);
    expect((moduleRefMock.get as jest.Mock).mock.calls.map((call) => call[0])).toEqual(
      ACTIVE_PROVIDER_MANIFEST.map((entry) => entry.providerToken),
    );
    for (const call of (moduleRefMock.get as jest.Mock).mock.calls) {
      expect(call[1]).toEqual({ strict: false });
    }
  });

  it("receiver 能力白名单应与 active provider 非流能力集合一致", async () => {
    const providerById: Record<string, IDataProvider> = {
      [PROVIDER_IDS.LONGPORT]: createProviderWithCapabilities(
        PROVIDER_IDS.LONGPORT,
        [
          CAPABILITY_NAMES.GET_STOCK_QUOTE,
          CAPABILITY_NAMES.GET_STOCK_BASIC_INFO,
          CAPABILITY_NAMES.GET_INDEX_QUOTE,
        ],
        ["US", "HK"],
      ),
      [PROVIDER_IDS.JVQUANT]: createProviderWithCapabilities(
        PROVIDER_IDS.JVQUANT,
        [CAPABILITY_NAMES.STREAM_STOCK_QUOTE],
        ["CN"],
      ),
      [PROVIDER_IDS.INFOWAY]: createProviderWithCapabilities(
        PROVIDER_IDS.INFOWAY,
        [
          CAPABILITY_NAMES.GET_STOCK_QUOTE,
          CAPABILITY_NAMES.GET_STOCK_HISTORY,
          CAPABILITY_NAMES.GET_STOCK_BASIC_INFO,
          CAPABILITY_NAMES.GET_CRYPTO_QUOTE,
          CAPABILITY_NAMES.GET_CRYPTO_BASIC_INFO,
          CAPABILITY_NAMES.GET_MARKET_STATUS,
          CAPABILITY_NAMES.GET_TRADING_DAYS,
          CAPABILITY_NAMES.GET_SUPPORT_LIST,
          CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
        ],
        ["US", "HK", "CN"],
      ),
    };

    const moduleRefMock = {
      get: jest.fn((token: unknown) => {
        const entry = ACTIVE_PROVIDER_MANIFEST.find(
          (manifest) => manifest.providerToken === token,
        );
        return entry ? providerById[entry.id] : undefined;
      }),
    } as unknown as ModuleRef;
    const service = createRegistryService(moduleRefMock);
    await service.onModuleInit();

    expect(() =>
      assertReceiverCapabilityWhitelistSync(
        SUPPORTED_CAPABILITY_TYPES,
        collectActiveCapabilityNames(service),
      ),
    ).not.toThrow();
  });

  it("receiver 能力白名单漂移时应报错", () => {
    expect(() =>
      assertReceiverCapabilityWhitelistSync(
        [...SUPPORTED_CAPABILITY_TYPES, CAPABILITY_NAMES.GET_GLOBAL_STATE],
        [
          CAPABILITY_NAMES.GET_STOCK_QUOTE,
          CAPABILITY_NAMES.GET_STOCK_HISTORY,
          CAPABILITY_NAMES.GET_STOCK_BASIC_INFO,
          CAPABILITY_NAMES.GET_CRYPTO_QUOTE,
          CAPABILITY_NAMES.GET_CRYPTO_BASIC_INFO,
          CAPABILITY_NAMES.GET_INDEX_QUOTE,
          CAPABILITY_NAMES.GET_MARKET_STATUS,
          CAPABILITY_NAMES.GET_TRADING_DAYS,
          CAPABILITY_NAMES.GET_SUPPORT_LIST,
          CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
        ],
      ),
    ).toThrow(
      "Receiver capability whitelist drift detected: missingInWhitelist=[], staleInWhitelist=[get-global-state]",
    );
  });
});
