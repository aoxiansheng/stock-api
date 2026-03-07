import { ProviderRegistryService } from "@providersv2/provider-registry.service";
import { ProviderPriorityPolicyService } from "@providersv2/provider-priority-policy.service";
import {
  ACTIVE_PROVIDER_MANIFEST,
  PROVIDER_IDS,
  buildProviderNameAliases,
} from "@providersv2/provider-id.constants";
import { ICapability } from "@providersv2/providers/interfaces/capability.interface";
import { IDataProvider } from "@providersv2/providers/interfaces/provider.interface";
import type { ModuleRef } from "@nestjs/core";

const ENV_KEYS = [
  "PROVIDER_PRIORITY_DEFAULT",
  "PROVIDER_PRIORITY_GET_STOCK_QUOTE",
  "PROVIDER_PRIORITY_STREAM_STOCK_QUOTE",
];

function clearPriorityEnv(): void {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
}

function createRegistryService(moduleRef: ModuleRef): ProviderRegistryService {
  return new ProviderRegistryService(
    moduleRef,
    new ProviderPriorityPolicyService(),
  );
}

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
  const capability = createCapability(capabilityName, supportedMarkets);
  return {
    name,
    description: `${name} provider`,
    capabilities: [capability],
    initialize: jest.fn().mockResolvedValue(undefined),
    testConnection: jest.fn().mockResolvedValue(true),
    getCapability: (targetName: string) =>
      targetName === capabilityName ? capability : null,
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

function createUnknownElementError(token: unknown): Error {
  const error = new Error(`Nest could not find ${String(token)} element`);
  error.name = "UnknownElementException";
  return error;
}

describe("ProviderRegistryService", () => {
  beforeEach(() => {
    clearPriorityEnv();
  });

  afterAll(() => {
    clearPriorityEnv();
  });

  it("moduleRef 缺失时应在初始化阶段 fail-fast", async () => {
    const service = createRegistryService(undefined as unknown as ModuleRef);

    await expect(service.onModuleInit()).rejects.toThrow(
      "ModuleRef 未注入",
    );
  });

  it("同一能力候选应按 capability 优先级环境变量排序", async () => {
    process.env.PROVIDER_PRIORITY_GET_STOCK_QUOTE = "infoway,longport,jvquant";

    const service = createRegistryService(
      createModuleRefMock({
        [PROVIDER_IDS.LONGPORT]: createProvider(
          PROVIDER_IDS.LONGPORT,
          "get-stock-quote",
          ["US"],
        ),
        [PROVIDER_IDS.JVQUANT]: createProvider(
          PROVIDER_IDS.JVQUANT,
          "get-stock-quote",
          ["US"],
        ),
        [PROVIDER_IDS.INFOWAY]: createProvider(
          PROVIDER_IDS.INFOWAY,
          "get-stock-quote",
          ["US"],
        ),
      }),
    );

    await service.onModuleInit();

    expect(service.getBestProvider("get-stock-quote", "US")).toBe(
      PROVIDER_IDS.INFOWAY,
    );
    expect(service.rankProvidersForCapability("get-stock-quote", [
      PROVIDER_IDS.JVQUANT,
      PROVIDER_IDS.LONGPORT,
      PROVIDER_IDS.INFOWAY,
    ])).toEqual([
      PROVIDER_IDS.INFOWAY,
      PROVIDER_IDS.LONGPORT,
      PROVIDER_IDS.JVQUANT,
    ]);
  });

  it("能力级配置缺失时应回退 default 排序", async () => {
    process.env.PROVIDER_PRIORITY_DEFAULT = "jvquant,longport,infoway";

    const service = createRegistryService(
      createModuleRefMock({
        [PROVIDER_IDS.LONGPORT]: createProvider(
          PROVIDER_IDS.LONGPORT,
          "stream-stock-quote",
          ["SG"],
        ),
        [PROVIDER_IDS.JVQUANT]: createProvider(
          PROVIDER_IDS.JVQUANT,
          "stream-stock-quote",
          ["SG"],
        ),
      }),
    );

    await service.onModuleInit();

    expect(service.getBestProvider("stream-stock-quote", "SG")).toBe(
      PROVIDER_IDS.JVQUANT,
    );
  });

  it("应支持 provider 名称标准化解析", async () => {
    const canonicalProvider = createProvider(
      PROVIDER_IDS.LONGPORT,
      "stream-stock-quote",
      ["SG"],
    );
    const service = createRegistryService(
      createModuleRefMock({
        [PROVIDER_IDS.LONGPORT]: canonicalProvider,
      }),
    );

    await service.onModuleInit();

    expect(service.getProvider(" LONGPORT ")).toBe(canonicalProvider);
    expect(service.getCapability(" LongPort ", "stream-stock-quote")).toBe(
      canonicalProvider.capabilities[0],
    );
  });

  it("UnknownElementException 应 warn 并继续装配其余 provider", async () => {
    const longportProvider = createProvider(
      PROVIDER_IDS.LONGPORT,
      "get-stock-quote",
      ["US"],
    );
    const moduleRefMock = {
      get: jest.fn((token: unknown) => {
        const entry = ACTIVE_PROVIDER_MANIFEST.find(
          (manifest) => manifest.providerToken === token,
        );
        if (!entry) return undefined;
        if (entry.id === PROVIDER_IDS.LONGPORT) {
          return longportProvider;
        }
        throw createUnknownElementError(entry.providerToken.name);
      }),
    } as unknown as ModuleRef;
    const service = createRegistryService(moduleRefMock);
    const warnSpy = jest
      .spyOn((service as any).logger, "warn")
      .mockImplementation(() => undefined);
    const errorSpy = jest
      .spyOn((service as any).logger, "error")
      .mockImplementation(() => undefined);

    await expect(service.onModuleInit()).resolves.toBeUndefined();

    expect(service.getProvider(PROVIDER_IDS.LONGPORT)).toBe(longportProvider);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "Provider 未注册或找不到，跳过注册",
      expect.objectContaining({
        id: PROVIDER_IDS.JVQUANT,
        key: "JVQUANT",
        providerToken: "JvQuantProvider",
        errorName: "UnknownElementException",
      }),
    );
  });

  it("非预期异常应 error 并 fail-fast", async () => {
    const expectedError = new Error("unexpected boom");
    const moduleRefMock = {
      get: jest.fn((token: unknown) => {
        const entry = ACTIVE_PROVIDER_MANIFEST.find(
          (manifest) => manifest.providerToken === token,
        );
        if (!entry) return undefined;
        if (entry.id === PROVIDER_IDS.LONGPORT) {
          throw expectedError;
        }
        return undefined;
      }),
    } as unknown as ModuleRef;
    const service = createRegistryService(moduleRefMock);
    const errorSpy = jest
      .spyOn((service as any).logger, "error")
      .mockImplementation(() => undefined);

    await expect(service.onModuleInit()).rejects.toThrow("unexpected boom");
    expect(errorSpy).toHaveBeenCalledWith(
      "Provider 注入出现非预期异常，终止初始化",
      expect.objectContaining({
        id: PROVIDER_IDS.LONGPORT,
        key: "LONGPORT",
        providerToken: "LongportProvider",
        errorName: "Error",
        errorMessage: "unexpected boom",
      }),
    );
  });

  it("moduleRef.get 返回 undefined 时应记录结构化 warn", async () => {
    const longportProvider = createProvider(
      PROVIDER_IDS.LONGPORT,
      "get-stock-quote",
      ["US"],
    );
    const service = createRegistryService(
      createModuleRefMock({
        [PROVIDER_IDS.LONGPORT]: longportProvider,
      }),
    );
    const warnSpy = jest
      .spyOn((service as any).logger, "warn")
      .mockImplementation(() => undefined);

    await expect(service.onModuleInit()).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      "Provider 解析为空，跳过注册",
      expect.objectContaining({
        id: PROVIDER_IDS.JVQUANT,
        key: "JVQUANT",
        providerToken: "JvQuantProvider",
      }),
    );
  });

  it("alias 归一化后冲突应立即抛错", () => {
    expect(() =>
      buildProviderNameAliases([
        {
          id: PROVIDER_IDS.LONGPORT,
          aliases: [" shared-alias "],
        },
        {
          id: PROVIDER_IDS.INFOWAY,
          aliases: ["SHARED-ALIAS"],
        },
      ]),
    ).toThrow(
      "Provider alias 冲突: alias=shared-alias, providers=[infoway, longport]",
    );
  });

  it("应按 market 过滤候选 provider", async () => {
    const longportProvider = createProvider(
      PROVIDER_IDS.LONGPORT,
      "get-stock-quote",
      ["HK", "SG"],
    );
    const infowayProvider = createProvider(
      PROVIDER_IDS.INFOWAY,
      "get-stock-quote",
      ["US"],
    );
    const service = createRegistryService(
      createModuleRefMock({
        [PROVIDER_IDS.LONGPORT]: longportProvider,
        [PROVIDER_IDS.INFOWAY]: infowayProvider,
      }),
    );

    await service.onModuleInit();

    expect(service.getCandidateProviders("get-stock-quote", "HK")).toEqual([
      PROVIDER_IDS.LONGPORT,
    ]);
    expect(service.getBestProvider("get-stock-quote", "US")).toBe(
      PROVIDER_IDS.INFOWAY,
    );
    expect(service.getBestProvider("get-stock-quote", "SG")).toBe(
      PROVIDER_IDS.LONGPORT,
    );
    expect(service.getBestProvider("get-stock-quote", "CN")).toBeNull();
  });

  it("SG 场景应支持 REST 与 STREAM capability 选源", async () => {
    const restCapability = createCapability("get-stock-quote", ["SG"]);
    const streamCapability = createCapability("stream-stock-quote", ["SG"]);
    const longportProvider: IDataProvider = {
      name: PROVIDER_IDS.LONGPORT,
      description: "longport provider",
      capabilities: [restCapability, streamCapability],
      initialize: jest.fn().mockResolvedValue(undefined),
      testConnection: jest.fn().mockResolvedValue(true),
      getCapability: (targetName: string) =>
        targetName === restCapability.name
          ? restCapability
          : targetName === streamCapability.name
            ? streamCapability
            : null,
    };
    const service = createRegistryService(
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
  });
});
