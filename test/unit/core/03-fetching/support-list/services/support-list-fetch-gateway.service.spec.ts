import {
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { SupportListFetchGatewayService } from "@core/03-fetching/support-list/services/support-list-fetch-gateway.service";
import { ProviderRegistryService } from "@providersv2/provider-registry.service";
import { DataFetcherService } from "@core/03-fetching/data-fetcher/services/data-fetcher.service";

describe("SupportListFetchGatewayService", () => {
  let providerRegistryMock: jest.Mocked<ProviderRegistryService>;
  let dataFetcherMock: jest.Mocked<DataFetcherService>;
  let service: SupportListFetchGatewayService;

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

  it("应按优先级失败切换到下一个 provider", async () => {
    providerRegistryMock.getCandidateProviders.mockReturnValue([
      "infoway",
      "jvquant",
    ]);
    providerRegistryMock.rankProvidersForCapability.mockReturnValue([
      "infoway",
      "jvquant",
    ]);
    providerRegistryMock.resolveHistoryExecutionContext.mockReturnValue({
      capability: null,
      contextService: null,
      reasonCode: "missing_context_service",
    });

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

  it("无 provider 候选时应抛 ServiceUnavailableException", async () => {
    providerRegistryMock.getCandidateProviders.mockReturnValue([]);
    providerRegistryMock.rankProvidersForCapability.mockReturnValue([]);

    await expect(service.fetchFullList("STOCK_US")).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
