import { REFERENCE_DATA } from "@common/constants/domain";
import {
  ACTIVE_PROVIDER_MANIFEST,
  PROVIDER_IDS,
  PROVIDER_NAME_ALIASES,
  buildProviderNameAliases,
} from "@providersv2/provider-id.constants";
import { ProviderRegistryService } from "@providersv2/provider-registry.service";
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

function createModuleRefMock(
  providersById: Partial<Record<string, IDataProvider | null | undefined>>,
): ModuleRef {
  return {
    get: jest.fn((token: unknown) => {
      const entry = ACTIVE_PROVIDER_MANIFEST.find(
        (manifest) => manifest.providerToken === token,
      );
      return entry ? providersById[entry.id] : undefined;
    }),
  } as unknown as ModuleRef;
}

describe("provider-id.constants", () => {
  it("PROVIDER_IDS 应从 REFERENCE_DATA.PROVIDER_IDS 派生", () => {
    expect(PROVIDER_IDS).toEqual({
      LONGPORT: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      JVQUANT: REFERENCE_DATA.PROVIDER_IDS.JVQUANT,
      INFOWAY: REFERENCE_DATA.PROVIDER_IDS.INFOWAY,
    });
  });

  it("manifest provider 集合应与 PROVIDER_IDS 完全一致且唯一", () => {
    const manifestIds = ACTIVE_PROVIDER_MANIFEST.map((entry) => entry.id);
    const providerIds = Object.values(PROVIDER_IDS);

    expect([...manifestIds].sort((a, b) => a.localeCompare(b))).toEqual(
      [...providerIds].sort((a, b) => a.localeCompare(b)),
    );
    expect(new Set(manifestIds).size).toBe(manifestIds.length);
  });

  it("别名映射目标必须属于 active provider 集合", () => {
    const activeIds = new Set(Object.values(PROVIDER_IDS));
    for (const providerId of Object.values(PROVIDER_NAME_ALIASES)) {
      expect(activeIds.has(providerId)).toBe(true);
    }
  });

  it("不应内置 legacy longport-sg/longportsg 别名", () => {
    expect(PROVIDER_NAME_ALIASES["longport-sg"]).toBeUndefined();
    expect(PROVIDER_NAME_ALIASES.longportsg).toBeUndefined();
  });

  it("alias 构建应先 trim + lower 后写入", () => {
    const aliases = buildProviderNameAliases([
      {
        id: PROVIDER_IDS.JVQUANT,
        aliases: [" JvQuant-Alias "],
      },
    ]);

    expect(aliases).toEqual({
      "jvquant-alias": PROVIDER_IDS.JVQUANT,
    });
  });

  it("alias 归一化后冲突应抛错", () => {
    expect(() =>
      buildProviderNameAliases([
        {
          id: PROVIDER_IDS.LONGPORT,
          aliases: [" duplicate "],
        },
        {
          id: PROVIDER_IDS.INFOWAY,
          aliases: ["DUPLICATE"],
        },
      ]),
    ).toThrow(
      "Provider alias 冲突: alias=duplicate, providers=[infoway, longport]",
    );
  });

  it("registry 在 SG 场景应可解析 canonical provider", async () => {
    const restCapability = createCapability("get-stock-quote", ["SG"]);
    const streamCapability = createCapability("stream-stock-quote", ["SG"]);
    const longportProvider: IDataProvider = {
      name: PROVIDER_IDS.LONGPORT,
      description: "longport provider",
      capabilities: [restCapability, streamCapability],
      initialize: jest.fn().mockResolvedValue(undefined),
      testConnection: jest.fn().mockResolvedValue(true),
      getCapability: (targetName: string) => {
        if (targetName === restCapability.name) return restCapability;
        if (targetName === streamCapability.name) return streamCapability;
        return null;
      },
    };
    const service = new ProviderRegistryService(
      createModuleRefMock({
        [PROVIDER_IDS.LONGPORT]: longportProvider,
      }),
    );

    await service.onModuleInit();

    expect(service.getBestProvider("get-stock-quote", "SG")).toBe(
      PROVIDER_IDS.LONGPORT,
    );
    expect(service.getBestProvider("stream-stock-quote", "SG")).toBe(
      PROVIDER_IDS.LONGPORT,
    );
    expect(service.getProvider(" LONGPORT ")).toBe(longportProvider);
  });

  it("registry moduleRef 缺失应 fail-fast", async () => {
    const service = new ProviderRegistryService(undefined as unknown as ModuleRef);
    await expect(service.onModuleInit()).rejects.toThrow("ModuleRef 未注入");
  });
});
