import { SupportListQueryService } from "@core/01-entry/query/services/support-list-query.service";
import { SupportListReadService } from "@core/03-fetching/support-list/services/support-list-read.service";

describe("SupportListQueryService", () => {
  let readServiceMock: jest.Mocked<SupportListReadService>;
  let service: SupportListQueryService;

  beforeEach(() => {
    readServiceMock = {
      getMeta: jest.fn(),
      getSupportList: jest.fn(),
    } as unknown as jest.Mocked<SupportListReadService>;

    service = new SupportListQueryService(readServiceMock);
  });

  it("getMeta 应透传到 SupportListReadService", async () => {
    readServiceMock.getMeta.mockResolvedValue({
      type: "STOCK_US",
      currentVersion: "20260309020000",
      lastUpdated: "2026-03-09T02:00:00.000Z",
      retentionDays: 7,
    });

    const result = await service.getMeta({ type: "STOCK_US" });

    expect(result.currentVersion).toBe("20260309020000");
    expect(readServiceMock.getMeta).toHaveBeenCalledWith({
      type: "STOCK_US",
    });
  });

  it("getSupportList 应透传参数", async () => {
    readServiceMock.getSupportList.mockResolvedValue({
      full: true,
      version: "20260309020000",
      items: [{ symbol: "AAPL.US" }],
    });

    const result = await service.getSupportList({
      type: "STOCK_US",
      since: "20260308020000",
      symbols: ["AAPL.US"],
    });

    expect(result).toEqual({
      full: true,
      version: "20260309020000",
      items: [{ symbol: "AAPL.US" }],
    });
    expect(readServiceMock.getSupportList).toHaveBeenCalledWith({
      type: "STOCK_US",
      since: "20260308020000",
      symbols: ["AAPL.US"],
    });
  });
});

