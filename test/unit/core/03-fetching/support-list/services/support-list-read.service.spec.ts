import { BadRequestException } from "@nestjs/common";
import { SupportListReadService } from "@core/03-fetching/support-list/services/support-list-read.service";
import {
  SupportListStoreService,
  SupportListMetaRecord,
} from "@core/03-fetching/support-list/services/support-list-store.service";
import { SupportListSyncService } from "@core/03-fetching/support-list/services/support-list-sync.service";

describe("SupportListReadService", () => {
  let storeServiceMock: jest.Mocked<SupportListStoreService>;
  let syncServiceMock: jest.Mocked<SupportListSyncService>;
  let service: SupportListReadService;

  const meta: SupportListMetaRecord = {
    type: "STOCK_US",
    currentVersion: "20260309020000",
    lastUpdated: "2026-03-09T02:00:00.000Z",
    retentionDays: 7,
    history: [
      { version: "20260307020000", updatedAt: "2026-03-07T02:00:00.000Z" },
      { version: "20260308020000", updatedAt: "2026-03-08T02:00:00.000Z" },
      { version: "20260309020000", updatedAt: "2026-03-09T02:00:00.000Z" },
    ],
  };

  beforeEach(() => {
    storeServiceMock = {
      readCurrent: jest.fn(),
      readMeta: jest.fn(),
      readDelta: jest.fn(),
      writeCurrent: jest.fn(),
      writeMeta: jest.fn(),
      writeDelta: jest.fn(),
    } as unknown as jest.Mocked<SupportListStoreService>;

    syncServiceMock = {
      ensureTypeInitialized: jest.fn(),
      refreshAllTypes: jest.fn(),
      refreshType: jest.fn(),
    } as unknown as jest.Mocked<SupportListSyncService>;

    service = new SupportListReadService(storeServiceMock, syncServiceMock);

    storeServiceMock.readMeta.mockResolvedValue(meta);
    storeServiceMock.readCurrent.mockResolvedValue({
      type: "STOCK_US",
      provider: "infoway",
      version: "20260309020000",
      updatedAt: "2026-03-09T02:00:00.000Z",
      items: [{ symbol: "AAPL.US" }, { symbol: "MSFT.US" }],
    });
  });

  it("不带 since 时返回全量", async () => {
    const result = await service.getSupportList({
      type: "STOCK_US",
    });

    expect(result).toEqual({
      full: true,
      version: "20260309020000",
      items: [{ symbol: "AAPL.US" }, { symbol: "MSFT.US" }],
    });
  });

  it("since 等于 currentVersion 时返回空增量", async () => {
    const result = await service.getSupportList({
      type: "STOCK_US",
      since: "20260309020000",
    });

    expect(result).toEqual({
      full: false,
      from: "20260309020000",
      to: "20260309020000",
      added: [],
      updated: [],
      removed: [],
    });
  });

  it("since 不在历史中时回退全量", async () => {
    const result = await service.getSupportList({
      type: "STOCK_US",
      since: "20260101020000",
    });

    expect(result).toEqual({
      full: true,
      version: "20260309020000",
      items: [{ symbol: "AAPL.US" }, { symbol: "MSFT.US" }],
    });
  });

  it("多段 delta 应正确聚合", async () => {
    storeServiceMock.readDelta.mockImplementation(async (_type, toVersion) => {
      if (toVersion === "20260308020000") {
        return {
          type: "STOCK_US",
          provider: "infoway",
          from: "20260307020000",
          to: "20260308020000",
          updatedAt: "2026-03-08T02:00:00.000Z",
          added: [{ symbol: "AAPL.US", name: "Apple V1" }],
          updated: [{ symbol: "MSFT.US", name: "MSFT V1" }],
          removed: [],
        };
      }
      if (toVersion === "20260309020000") {
        return {
          type: "STOCK_US",
          provider: "infoway",
          from: "20260308020000",
          to: "20260309020000",
          updatedAt: "2026-03-09T02:00:00.000Z",
          added: [{ symbol: "TSLA.US", name: "Tesla V1" }],
          updated: [{ symbol: "MSFT.US", name: "MSFT V2" }],
          removed: ["AAPL.US"],
        };
      }
      return null;
    });

    const result = await service.getSupportList({
      type: "STOCK_US",
      since: "20260307020000",
    });

    expect(result).toEqual({
      full: false,
      from: "20260307020000",
      to: "20260309020000",
      added: [{ symbol: "TSLA.US", name: "Tesla V1" }],
      updated: [{ symbol: "MSFT.US", name: "MSFT V2" }],
      removed: [],
    });
  });

  it("delta 缺失时回退全量", async () => {
    storeServiceMock.readDelta.mockResolvedValueOnce(null);

    const result = await service.getSupportList({
      type: "STOCK_US",
      since: "20260307020000",
    });

    expect(result).toEqual({
      full: true,
      version: "20260309020000",
      items: [{ symbol: "AAPL.US" }, { symbol: "MSFT.US" }],
    });
  });

  it("since 为未来时间时抛 BadRequestException", async () => {
    await expect(
      service.getSupportList({
        type: "STOCK_US",
        since: "29990101000000",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
