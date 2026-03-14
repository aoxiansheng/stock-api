import {
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { SupportListFetchGatewayService } from "@core/03-fetching/support-list/services/support-list-fetch-gateway.service";
import { resolveSupportListGatewayErrorReasonMaxLength } from "@core/03-fetching/support-list/constants/support-list.constants";
import { ProviderRegistryService } from "@providersv2/provider-registry.service";
import { DataFetcherService } from "@core/03-fetching/data-fetcher/services/data-fetcher.service";

describe("SupportListFetchGatewayService", () => {
  let providerRegistryMock: jest.Mocked<ProviderRegistryService>;
  let dataFetcherMock: jest.Mocked<DataFetcherService>;
  let service: SupportListFetchGatewayService;
  const originalMaxItems = process.env.SUPPORT_LIST_MAX_ITEMS;
  const originalMaxPayloadBytes = process.env.SUPPORT_LIST_MAX_PAYLOAD_BYTES;
  const originalReasonMaxLength =
    process.env.SUPPORT_LIST_GATEWAY_ERROR_REASON_MAX_LENGTH;

  beforeEach(() => {
    providerRegistryMock = {
      getCandidateProviders: jest.fn(),
      rankProvidersForCapability: jest.fn(),
      resolveHistoryExecutionContext: jest.fn(),
    } as unknown as jest.Mocked<ProviderRegistryService>;

    dataFetcherMock = {
      fetchRawData: jest.fn(),
    } as unknown as jest.Mocked<DataFetcherService>;

    service = new SupportListFetchGatewayService(
      providerRegistryMock,
      dataFetcherMock,
    );
  });

  afterEach(() => {
    if (originalMaxItems === undefined) {
      delete process.env.SUPPORT_LIST_MAX_ITEMS;
    } else {
      process.env.SUPPORT_LIST_MAX_ITEMS = originalMaxItems;
    }

    if (originalMaxPayloadBytes === undefined) {
      delete process.env.SUPPORT_LIST_MAX_PAYLOAD_BYTES;
    } else {
      process.env.SUPPORT_LIST_MAX_PAYLOAD_BYTES = originalMaxPayloadBytes;
    }

    if (originalReasonMaxLength === undefined) {
      delete process.env.SUPPORT_LIST_GATEWAY_ERROR_REASON_MAX_LENGTH;
    } else {
      process.env.SUPPORT_LIST_GATEWAY_ERROR_REASON_MAX_LENGTH =
        originalReasonMaxLength;
    }
  });

  const setupRankedProviders = (...providers: string[]) => {
    providerRegistryMock.getCandidateProviders.mockReturnValue(providers);
    providerRegistryMock.rankProvidersForCapability.mockReturnValue(providers);
    providerRegistryMock.resolveHistoryExecutionContext.mockReturnValue({
      capability: null,
      contextService: null,
      reasonCode: "missing_context_service",
    });
  };

  it("应按优先级失败切换到下一个 provider", async () => {
    setupRankedProviders("infoway", "jvquant");

    dataFetcherMock.fetchRawData
      .mockRejectedValueOnce(new Error("infoway failed"))
      .mockResolvedValueOnce({
        data: [
          { symbol: "AAPL.US", name: "Apple" },
          { symbol: "MSFT.US", name: "Microsoft" },
        ],
        metadata: {
          provider: "jvquant",
          capability: "get-support-list",
          processingTimeMs: 10,
          symbolsProcessed: 0,
        },
      });

    const result = await service.fetchFullList("stock_us");

    expect(result).toEqual({
      provider: "jvquant",
      items: [
        { symbol: "AAPL.US", name: "Apple" },
        { symbol: "MSFT.US", name: "Microsoft" },
      ],
    });
    expect(dataFetcherMock.fetchRawData).toHaveBeenCalledTimes(2);
    expect(dataFetcherMock.fetchRawData).toHaveBeenLastCalledWith(
      expect.objectContaining({
        provider: "jvquant",
        options: { type: "STOCK_US" },
      }),
    );
  });

  it("type 非法时应抛 BadRequestException", async () => {
    await expect(service.fetchFullList("INVALID_TYPE")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("provider 返回非数组载荷时应视为失败并切换下一个 provider", async () => {
    setupRankedProviders("infoway", "jvquant");

    dataFetcherMock.fetchRawData
      .mockResolvedValueOnce({
        data: { invalid: true },
      } as any)
      .mockResolvedValueOnce({
        data: [{ symbol: "AAPL.US", name: "Apple" }],
      } as any);

    const result = await service.fetchFullList("STOCK_US");

    expect(result).toEqual({
      provider: "jvquant",
      items: [{ symbol: "AAPL.US", name: "Apple" }],
    });
    expect(dataFetcherMock.fetchRawData).toHaveBeenCalledTimes(2);
  });

  it("应仅保留 symbol 规范化后有效的对象行", async () => {
    setupRankedProviders("jvquant");

    dataFetcherMock.fetchRawData.mockResolvedValueOnce({
      data: [
        { symbol: " aapl.us ", name: "Apple" },
        { symbol: "   ", name: "Empty" },
        { symbol: "@@@", name: "Invalid" },
        { name: "MissingSymbol" },
        100,
        null,
        { symbol: "700.hk", name: "Tencent" },
      ],
    } as any);

    const result = await service.fetchFullList("STOCK_US");

    expect(result).toEqual({
      provider: "jvquant",
      items: [
        { symbol: "AAPL.US", name: "Apple" },
        { symbol: "700.HK", name: "Tencent" },
      ],
    });
  });

  it.each([
    ["FOREX", "FOREX:EURUSD.SPOT.2026.NDF"],
    ["CRYPTO", "CRYPTO:BTCUSDT.PERPETUAL-SWAP.2026"],
  ])(
    "非 STOCK 类型 %s 应接受包含冒号且较长的合法 symbol",
    async (type, expectedSymbol) => {
      providerRegistryMock.getCandidateProviders.mockReturnValue(["jvquant"]);
      providerRegistryMock.rankProvidersForCapability.mockReturnValue(["jvquant"]);
      providerRegistryMock.resolveHistoryExecutionContext.mockReturnValue({
        capability: null,
        contextService: null,
        reasonCode: "missing_context_service",
      });

      dataFetcherMock.fetchRawData.mockResolvedValueOnce({
        data: [{ symbol: ` ${expectedSymbol.toLowerCase()} `, name: "Wide" }],
      } as any);

      const result = await service.fetchFullList(type);

      expect(result).toEqual({
        provider: "jvquant",
        items: [{ symbol: expectedSymbol, name: "Wide" }],
      });
    },
  );

  it("CRYPTO 类型应将简单交易对标准化为裸 pair", async () => {
    setupRankedProviders("jvquant");

    dataFetcherMock.fetchRawData.mockResolvedValueOnce({
      data: [{ symbol: " btcusdt ", name: "BTC/USDT" }],
    } as any);

    const result = await service.fetchFullList("CRYPTO");

    expect(result).toEqual({
      provider: "jvquant",
      items: [{ symbol: "BTCUSDT", name: "BTC/USDT" }],
    });
  });

  it("STOCK_* 类型应继续严格校验并过滤非股票宽格式 symbol", async () => {
    setupRankedProviders("jvquant");

    dataFetcherMock.fetchRawData.mockResolvedValueOnce({
      data: [
        { symbol: "AAPL.US", name: "Apple" },
        { symbol: "FOREX:EURUSD.SPOT.2026.NDF", name: "ShouldFiltered1" },
        { symbol: "CRYPTO:BTCUSDT.PERPETUAL-SWAP.2026", name: "ShouldFiltered2" },
      ],
    } as any);

    const result = await service.fetchFullList("STOCK_US");

    expect(result).toEqual({
      provider: "jvquant",
      items: [{ symbol: "AAPL.US", name: "Apple" }],
    });
  });

  it("provider 返回重复 symbol 时应仅保留最后一条(last-win)", async () => {
    setupRankedProviders("jvquant");

    dataFetcherMock.fetchRawData.mockResolvedValueOnce({
      data: [
        { symbol: "AAPL.US", name: "Apple V1", lot: 100 },
        { symbol: "MSFT.US", name: "MSFT V1" },
        { symbol: "AAPL.US", name: "Apple V2", lot: 200 },
        { symbol: "MSFT.US", name: "MSFT V2" },
      ],
    } as any);

    const result = await service.fetchFullList("STOCK_US");

    expect(result).toEqual({
      provider: "jvquant",
      items: [
        { symbol: "AAPL.US", name: "Apple V2", lot: 200 },
        { symbol: "MSFT.US", name: "MSFT V2" },
      ],
    });
  });

  it("原始 rows 非空但全无效时应判定失败并切换下一个 provider", async () => {
    setupRankedProviders("infoway", "jvquant");

    dataFetcherMock.fetchRawData
      .mockResolvedValueOnce({
        data: [
          { symbol: "   ", name: "Empty" },
          { symbol: "@@@", name: "Invalid" },
          { name: "MissingSymbol" },
        ],
      } as any)
      .mockResolvedValueOnce({
        data: [{ symbol: "MSFT.US", name: "Microsoft" }],
      } as any);

    const result = await service.fetchFullList("STOCK_US");

    expect(result).toEqual({
      provider: "jvquant",
      items: [{ symbol: "MSFT.US", name: "Microsoft" }],
    });
    expect(dataFetcherMock.fetchRawData).toHaveBeenCalledTimes(2);
  });

  it("非 STOCK 类型 rows 非空但全无效时应判定失败并切换下一个 provider", async () => {
    setupRankedProviders("infoway", "jvquant");

    dataFetcherMock.fetchRawData
      .mockResolvedValueOnce({
        data: [
          { symbol: "###", name: "InvalidChars" },
          { symbol: "FOREX:EUR/USD.SPOT", name: "SlashInvalid" },
          { symbol: "X".repeat(80), name: "TooLong" },
        ],
      } as any)
      .mockResolvedValueOnce({
        data: [
          {
            symbol: "FOREX:GBPUSD.SPOT.2026.NDF",
            name: "GBPUSD",
          },
        ],
      } as any);

    const result = await service.fetchFullList("FOREX");

    expect(result).toEqual({
      provider: "jvquant",
      items: [{ symbol: "FOREX:GBPUSD.SPOT.2026.NDF", name: "GBPUSD" }],
    });
    expect(dataFetcherMock.fetchRawData).toHaveBeenCalledTimes(2);
    expect(dataFetcherMock.fetchRawData).toHaveBeenLastCalledWith(
      expect.objectContaining({
        provider: "jvquant",
        options: { type: "FOREX" },
      }),
    );
  });

  it("无 provider 候选时应抛 ServiceUnavailableException", async () => {
    providerRegistryMock.getCandidateProviders.mockReturnValue([]);
    providerRegistryMock.rankProvidersForCapability.mockReturnValue([]);

    await expect(service.fetchFullList("STOCK_US")).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it("raw rows 超过上限时应 fail-fast 并切换下一个 provider", async () => {
    process.env.SUPPORT_LIST_MAX_ITEMS = "2";
    service = new SupportListFetchGatewayService(providerRegistryMock, dataFetcherMock);
    setupRankedProviders("infoway", "jvquant");

    dataFetcherMock.fetchRawData
      .mockResolvedValueOnce({
        data: [
          { symbol: "AAPL.US", name: "Apple" },
          { symbol: "MSFT.US", name: "Microsoft" },
          { symbol: "TSLA.US", name: "Tesla" },
        ],
      } as any)
      .mockResolvedValueOnce({
        data: [{ symbol: "MSFT.US", name: "Microsoft" }],
      } as any);

    const result = await service.fetchFullList("STOCK_US");

    expect(result).toEqual({
      provider: "jvquant",
      items: [{ symbol: "MSFT.US", name: "Microsoft" }],
    });
    expect(dataFetcherMock.fetchRawData).toHaveBeenCalledTimes(2);
  });

  it("payload bytes 超过上限时应 fail-fast 并切换下一个 provider", async () => {
    process.env.SUPPORT_LIST_MAX_ITEMS = "100";
    process.env.SUPPORT_LIST_MAX_PAYLOAD_BYTES = "80";
    service = new SupportListFetchGatewayService(providerRegistryMock, dataFetcherMock);
    setupRankedProviders("infoway", "jvquant");

    dataFetcherMock.fetchRawData
      .mockResolvedValueOnce({
        data: [{ symbol: "AAPL.US", name: "X".repeat(200) }],
      } as any)
      .mockResolvedValueOnce({
        data: [{ symbol: "MSFT.US", name: "Microsoft" }],
      } as any);

    const result = await service.fetchFullList("STOCK_US");

    expect(result).toEqual({
      provider: "jvquant",
      items: [{ symbol: "MSFT.US", name: "Microsoft" }],
    });
    expect(dataFetcherMock.fetchRawData).toHaveBeenCalledTimes(2);
  });

  it("失败 reason 应脱敏并按上限截断", async () => {
    process.env.SUPPORT_LIST_GATEWAY_ERROR_REASON_MAX_LENGTH = "80";
    service = new SupportListFetchGatewayService(providerRegistryMock, dataFetcherMock);
    setupRankedProviders("infoway", "jvquant");
    const loggerWarnSpy = jest.spyOn((service as any).logger, "warn");

    dataFetcherMock.fetchRawData
      .mockRejectedValueOnce(
        new Error(
          "token=abc123 apiKey=xyz789 password=pass1 Authorization: Bearer headToken123 " +
            "authorization=Bearer queryToken456 " +
            '{"authorization":"Bearer jsonToken789"} authorization=Bearer123\n' +
            "tail=".repeat(50),
        ),
      )
      .mockResolvedValueOnce({
        data: [{ symbol: "AAPL.US", name: "Apple" }],
      } as any);

    await service.fetchFullList("STOCK_US");

    const warnCall = loggerWarnSpy.mock.calls.find(
      ([message]) => message === "support-list 拉取失败，尝试下一个 provider",
    );
    const reason = (warnCall?.[1] as { reason?: string } | undefined)?.reason || "";
    expect(reason).not.toContain("abc123");
    expect(reason).not.toContain("xyz789");
    expect(reason).not.toContain("pass1");
    expect(reason).not.toContain("Bearer123");
    expect(reason).not.toContain("headToken123");
    expect(reason).not.toContain("queryToken456");
    expect(reason).not.toContain("jsonToken789");
    expect(reason).toContain("token=[REDACTED]");
    expect(reason).toContain("apiKey=[REDACTED]");
    expect(reason).not.toContain("\n");
    expect(reason.length).toBeLessThanOrEqual(
      resolveSupportListGatewayErrorReasonMaxLength("80"),
    );
  });

  it("纯 JSON 失败 reason 应脱敏敏感字段", async () => {
    process.env.SUPPORT_LIST_GATEWAY_ERROR_REASON_MAX_LENGTH = "300";
    service = new SupportListFetchGatewayService(providerRegistryMock, dataFetcherMock);
    setupRankedProviders("infoway", "jvquant");
    const loggerWarnSpy = jest.spyOn((service as any).logger, "warn");

    dataFetcherMock.fetchRawData
      .mockRejectedValueOnce(
        new Error(
          JSON.stringify({
            token: "abc123",
            apiKey: "xyz789",
            password: "pass1",
            secret: "secret-777",
            authorization: "Bearer jsonToken789",
            traceId: "trace-001",
          }),
        ),
      )
      .mockResolvedValueOnce({
        data: [{ symbol: "AAPL.US", name: "Apple" }],
      } as any);

    await service.fetchFullList("STOCK_US");

    const warnCall = loggerWarnSpy.mock.calls.find(
      ([message]) => message === "support-list 拉取失败，尝试下一个 provider",
    );
    const reason = (warnCall?.[1] as { reason?: string } | undefined)?.reason || "";
    expect(reason).not.toContain("abc123");
    expect(reason).not.toContain("xyz789");
    expect(reason).not.toContain("pass1");
    expect(reason).not.toContain("secret-777");
    expect(reason).not.toContain("jsonToken789");
    expect(reason).toContain('"token":[REDACTED]');
    expect(reason).toContain('"apiKey":[REDACTED]');
    expect(reason).toContain('"password":[REDACTED]');
    expect(reason).toContain('"secret":[REDACTED]');
    expect(reason).toContain('"authorization":"Bearer [REDACTED]"');
    expect(reason).toContain('"traceId":"trace-001"');
    expect(reason.length).toBeLessThanOrEqual(
      resolveSupportListGatewayErrorReasonMaxLength("300"),
    );
  });
});
