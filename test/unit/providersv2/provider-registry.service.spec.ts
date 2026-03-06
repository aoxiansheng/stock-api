import { ProviderRegistryService } from "@providersv2/provider-registry.service";
import {
  ACTIVE_PROVIDER_MANIFEST,
  PROVIDER_IDS,
  buildProviderNameAliases,
} from "@providersv2/provider-id.constants";
import { ICapability } from "@providersv2/providers/interfaces/capability.interface";
import { IDataProvider } from "@providersv2/providers/interfaces/provider.interface";
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
  it("moduleRef 缺失时应在初始化阶段 fail-fast", async () => {
    const service = new ProviderRegistryService(undefined as unknown as ModuleRef);

    await expect(service.onModuleInit()).rejects.toThrow(
      "ModuleRef 未注入",
    );
  });

  it("优先级漏配时应 fail-fast 并列出缺失 provider", async () => {
    const providerA = createProvider("unknown-a", "get-stock-quote", ["US"]);
    const providerB = createProvider("unknown-b", "get-stock-quote", ["US"]);
    const service = new ProviderRegistryService(
      createModuleRefMock({
        [PROVIDER_IDS.LONGPORT]: providerA,
        [PROVIDER_IDS.LONGPORT_SG]: providerB,
      }),
    );

    await expect(service.onModuleInit()).rejects.toThrow(
      "Provider 优先级缺失",
    );
    await expect(service.onModuleInit()).rejects.toThrow(
      "providers=[unknown-a, unknown-b]",
    );
  });

  it("同优先级候选应按 provider 名称稳定排序", () => {
    const service = new ProviderRegistryService(createModuleRefMock({}));
    const internalService = service as any;

    internalService.registerProvider(
      createProvider("zeta", "get-stock-quote", ["US"]),
      10,
    );
    internalService.registerProvider(
      createProvider("alpha", "get-stock-quote", ["US"]),
      10,
    );

    expect(service.getBestProvider("get-stock-quote", "US")).toBe("alpha");
    expect(service.getBestProvider("get-stock-quote", "US")).toBe("alpha");
  });

  it("应支持 alias 解析到标准 provider 名称", async () => {
    const canonicalProvider = createProvider(
      PROVIDER_IDS.LONGPORT_SG,
      "stream-stock-quote",
      ["SG"],
    );
    const service = new ProviderRegistryService(
      createModuleRefMock({
        [PROVIDER_IDS.LONGPORT_SG]: canonicalProvider,
      }),
    );

    await service.onModuleInit();

    expect(service.getProvider(" LONGPORTSG ")).toBe(canonicalProvider);
    expect(service.getCapability("longportsg", "stream-stock-quote")).toBe(
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
    const service = new ProviderRegistryService(moduleRefMock);
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
        id: PROVIDER_IDS.LONGPORT_SG,
        key: "LONGPORT_SG",
        providerToken: "LongportSgProvider",
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
    const service = new ProviderRegistryService(moduleRefMock);
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
    const service = new ProviderRegistryService(
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
        id: PROVIDER_IDS.LONGPORT_SG,
        key: "LONGPORT_SG",
        providerToken: "LongportSgProvider",
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
      ["HK"],
    );
    const infowayProvider = createProvider(
      PROVIDER_IDS.INFOWAY,
      "get-stock-quote",
      ["US"],
    );
    const service = new ProviderRegistryService(
      createModuleRefMock({
        [PROVIDER_IDS.LONGPORT]: longportProvider,
        [PROVIDER_IDS.INFOWAY]: infowayProvider,
      }),
    );

    await service.onModuleInit();

    expect(service.getBestProvider("get-stock-quote", "HK")).toBe(
      PROVIDER_IDS.LONGPORT,
    );
    expect(service.getBestProvider("get-stock-quote", "US")).toBe(
      PROVIDER_IDS.INFOWAY,
    );
    expect(service.getBestProvider("get-stock-quote", "CN")).toBeNull();
  });
});
