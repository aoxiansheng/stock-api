import { BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import {
  BusinessErrorCode,
  BusinessException,
  ComponentIdentifier,
} from "@common/core/exceptions";
import { SupportListReadService } from "@core/03-fetching/support-list/services/support-list-read.service";
import {
  SupportListStoreService,
  SupportListCurrentRecord,
  SupportListMetaRecord,
} from "@core/03-fetching/support-list/services/support-list-store.service";
import { SupportListSyncService } from "@core/03-fetching/support-list/services/support-list-sync.service";
import { SupportListFetchGatewayService } from "@core/03-fetching/support-list/services/support-list-fetch-gateway.service";
import { SupportListDiffService } from "@core/03-fetching/support-list/services/support-list-diff.service";
import { StorageService } from "@core/04-storage/storage/services/storage.service";
import { StorageRepository } from "@core/04-storage/storage/repositories/storage.repository";
import { StorageType } from "@core/04-storage/storage/enums/storage-type.enum";

const DEFAULT_SUPPORT_LIST_TYPE = "STOCK_US";
const BASE_META_RECORD: SupportListMetaRecord = {
  type: DEFAULT_SUPPORT_LIST_TYPE,
  currentVersion: "20260309020000",
  lastUpdated: "2026-03-09T02:00:00.000Z",
  retentionDays: 7,
  history: [
    { version: "20260307020000", updatedAt: "2026-03-07T02:00:00.000Z" },
    { version: "20260308020000", updatedAt: "2026-03-08T02:00:00.000Z" },
    { version: "20260309020000", updatedAt: "2026-03-09T02:00:00.000Z" },
  ],
};

function createMetaRecord(
  overrides: Partial<SupportListMetaRecord> = {},
): SupportListMetaRecord {
  return {
    ...BASE_META_RECORD,
    ...overrides,
    history: overrides.history ?? [...BASE_META_RECORD.history],
  };
}

function createCurrentRecord(
  overrides: Partial<SupportListCurrentRecord> = {},
): SupportListCurrentRecord {
  return {
    type: DEFAULT_SUPPORT_LIST_TYPE,
    provider: "infoway",
    version: "20260309020000",
    updatedAt: "2026-03-09T02:00:00.000Z",
    items: [{ symbol: "AAPL.US" }, { symbol: "MSFT.US" }],
    ...overrides,
  };
}

function createPreviousSnapshot(version = "20260308020000"): {
  previousMeta: SupportListMetaRecord;
  previousCurrent: SupportListCurrentRecord;
} {
  const updatedAt = "2026-03-08T02:00:00.000Z";
  return {
    previousMeta: createMetaRecord({
      currentVersion: version,
      lastUpdated: updatedAt,
      history: [{ version, updatedAt }],
    }),
    previousCurrent: createCurrentRecord({
      version,
      updatedAt,
      items: [{ symbol: "AAPL.US" }],
    }),
  };
}

function createSupportListStoreServiceMock(): jest.Mocked<SupportListStoreService> {
  return {
    readCurrent: jest.fn(),
    readMeta: jest.fn(),
    readDelta: jest.fn(),
    writeCurrent: jest.fn(),
    writeMeta: jest.fn(),
    writeDelta: jest.fn(),
    deleteCurrent: jest.fn(),
    deleteMeta: jest.fn(),
    tryAcquireRefreshLock: jest.fn(),
    releaseRefreshLock: jest.fn(),
    extendRefreshLock: jest.fn(),
    isRefreshLockOwnedBy: jest.fn(),
  } as unknown as jest.Mocked<SupportListStoreService>;
}

function createSupportListSyncServiceMock(): jest.Mocked<SupportListSyncService> {
  return {
    ensureTypeInitialized: jest.fn(),
    refreshAllTypes: jest.fn(),
    refreshType: jest.fn(),
  } as unknown as jest.Mocked<SupportListSyncService>;
}

async function expectResyncRequired(
  action: Promise<unknown>,
  reason?: string,
): Promise<void> {
  let caught: unknown = null;
  try {
    await action;
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(BusinessException);
  const error = caught as BusinessException;
  expect(error.errorCode).toBe("SUPPORT_LIST_RESYNC_REQUIRED");
  expect(error.getStatus()).toBe(409);
  if (reason) {
    expect(error.context.reason).toBe(reason);
  }
}

async function expectBadRequestAndNoDeltaRead(
  action: Promise<unknown>,
  storeServiceMock: jest.Mocked<SupportListStoreService>,
): Promise<void> {
  await expect(action).rejects.toBeInstanceOf(BadRequestException);
  expect(storeServiceMock.readDelta).not.toHaveBeenCalled();
}

describe("SupportListReadService", () => {
  let storeServiceMock: jest.Mocked<SupportListStoreService>;
  let syncServiceMock: jest.Mocked<SupportListSyncService>;
  let service: SupportListReadService;

  beforeEach(() => {
    storeServiceMock = createSupportListStoreServiceMock();
    syncServiceMock = createSupportListSyncServiceMock();

    service = new SupportListReadService(storeServiceMock, syncServiceMock);

    storeServiceMock.readMeta.mockResolvedValue(createMetaRecord());
    storeServiceMock.readCurrent.mockResolvedValue(createCurrentRecord());
  });

  // 基础读路径：全量/增量返回
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

  it("CRYPTO 全量读取应保持裸 pair 标准 symbol，并按裸 pair 过滤", async () => {
    storeServiceMock.readMeta.mockResolvedValueOnce(
      createMetaRecord({
        type: "CRYPTO",
      }),
    );
    storeServiceMock.readCurrent.mockResolvedValueOnce(
      createCurrentRecord({
        type: "CRYPTO",
        items: [
          { symbol: "BTCUSDT", name: "BTC/USDT" },
          { symbol: "ETHUSDT", name: "ETH/USDT" },
          { symbol: "CRYPTO:BTCUSDT.PERPETUAL-SWAP.2026", name: "Wide" },
        ],
      }),
    );

    const result = await service.getSupportList({
      type: "CRYPTO",
      symbols: ["btcusdt", "ETHUSDT"],
    });

    expect(result).toEqual({
      full: true,
      version: "20260309020000",
      items: [
        { symbol: "BTCUSDT", name: "BTC/USDT" },
        { symbol: "ETHUSDT", name: "ETH/USDT" },
      ],
    });
  });

  it("current items 存在重复 symbol 时，full 返回去重且遵循 last-win", async () => {
    storeServiceMock.readCurrent.mockResolvedValueOnce({
      type: "STOCK_US",
      provider: "infoway",
      version: "20260309020000",
      updatedAt: "2026-03-09T02:00:00.000Z",
      items: [
        { symbol: "AAPL.US", name: "Apple V1" },
        { symbol: "MSFT.US", name: "MSFT V1" },
        { symbol: "AAPL.US", name: "Apple V2" },
        { symbol: "MSFT.US", name: "MSFT V2" },
      ],
    });

    const result = await service.getSupportList({
      type: "STOCK_US",
    });

    expect(result).toEqual({
      full: true,
      version: "20260309020000",
      items: [
        { symbol: "AAPL.US", name: "Apple V2" },
        { symbol: "MSFT.US", name: "MSFT V2" },
      ],
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

  it("since 等于未来 currentVersion 时应直接返回空增量，不应被 future 校验拒绝", async () => {
    storeServiceMock.readMeta.mockResolvedValue({
      ...createMetaRecord(),
      currentVersion: "20991231235959",
      history: [{ version: "20991231235959", updatedAt: "2099-12-31T23:59:59.000Z" }],
    });
    storeServiceMock.readCurrent.mockResolvedValue({
      type: "STOCK_US",
      provider: "infoway",
      version: "20991231235959",
      updatedAt: "2099-12-31T23:59:59.000Z",
      items: [{ symbol: "AAPL.US" }],
    });

    const result = await service.getSupportList({
      type: "STOCK_US",
      since: "20991231235959",
    });

    expect(result).toEqual({
      full: false,
      from: "20991231235959",
      to: "20991231235959",
      added: [],
      updated: [],
      removed: [],
    });
  });

  it("currentVersion 位于未来时，历史 since 版本链应允许返回增量", async () => {
    storeServiceMock.readMeta.mockResolvedValue({
      ...createMetaRecord(),
      currentVersion: "20991231235959",
      history: [
        { version: "20800101000000", updatedAt: "2080-01-01T00:00:00.000Z" },
        { version: "20900101000000", updatedAt: "2090-01-01T00:00:00.000Z" },
        { version: "20991231235959", updatedAt: "2099-12-31T23:59:59.000Z" },
      ],
    });
    storeServiceMock.readCurrent.mockResolvedValue({
      type: "STOCK_US",
      provider: "infoway",
      version: "20991231235959",
      updatedAt: "2099-12-31T23:59:59.000Z",
      items: [{ symbol: "AAPL.US" }, { symbol: "MSFT.US" }, { symbol: "TSLA.US" }],
    });
    storeServiceMock.readDelta.mockImplementation(async (_type, toVersion) => {
      if (toVersion === "20900101000000") {
        return {
          type: "STOCK_US",
          provider: "infoway",
          from: "20800101000000",
          to: "20900101000000",
          updatedAt: "2090-01-01T00:00:00.000Z",
          added: [{ symbol: "MSFT.US", name: "Microsoft" }],
          updated: [],
          removed: [],
        };
      }
      if (toVersion === "20991231235959") {
        return {
          type: "STOCK_US",
          provider: "infoway",
          from: "20900101000000",
          to: "20991231235959",
          updatedAt: "2099-12-31T23:59:59.000Z",
          added: [{ symbol: "TSLA.US", name: "Tesla" }],
          updated: [],
          removed: [],
        };
      }
      return null;
    });

    const result = await service.getSupportList({
      type: "STOCK_US",
      since: "20800101000000",
    });

    expect(result).toEqual({
      full: false,
      from: "20800101000000",
      to: "20991231235959",
      added: [
        { symbol: "MSFT.US", name: "Microsoft" },
        { symbol: "TSLA.US", name: "Tesla" },
      ],
      updated: [],
      removed: [],
    });
  });

  // 版本对齐与重同步判定
  it("meta/current 版本失配且不带 since 时返回全量", async () => {
    storeServiceMock.readCurrent.mockResolvedValueOnce({
      type: "STOCK_US",
      provider: "infoway",
      version: "20260309020001",
      updatedAt: "2026-03-09T02:00:01.000Z",
      items: [{ symbol: "TSLA.US" }],
    });

    const result = await service.getSupportList({
      type: "STOCK_US",
    });

    expect(result).toEqual({
      full: true,
      version: "20260309020001",
      items: [{ symbol: "TSLA.US" }],
    });
    expect(storeServiceMock.readDelta).not.toHaveBeenCalled();
  });

  it("meta/current 版本失配且带 since 时应返回 409(SUPPORT_LIST_RESYNC_REQUIRED)", async () => {
    storeServiceMock.readCurrent.mockResolvedValueOnce({
      type: "STOCK_US",
      provider: "infoway",
      version: "20260309020001",
      updatedAt: "2026-03-09T02:00:01.000Z",
      items: [{ symbol: "TSLA.US" }],
    });

    await expectResyncRequired(
      service.getSupportList({
        type: "STOCK_US",
        since: "20260309020000",
      }),
      "META_CURRENT_VERSION_MISMATCH",
    );
    expect(storeServiceMock.readDelta).not.toHaveBeenCalled();
  });

  // since 合法性需先于版本链判断（M-01）
  it("meta/current 失配时仍应先校验 since 合法性", async () => {
    storeServiceMock.readCurrent.mockResolvedValueOnce({
      type: "STOCK_US",
      provider: "infoway",
      version: "20260309020001",
      updatedAt: "2026-03-09T02:00:01.000Z",
      items: [{ symbol: "TSLA.US" }],
    });

    await expectBadRequestAndNoDeltaRead(
      service.getSupportList({
        type: "STOCK_US",
        since: "20260230020000",
      }),
      storeServiceMock,
    );
  });

  it("history 尾版本异常时仍应先校验非法 since 并返回 400", async () => {
    storeServiceMock.readMeta.mockResolvedValueOnce(
      createMetaRecord({
        history: [
          { version: "20260307020000", updatedAt: "2026-03-07T02:00:00.000Z" },
          { version: "20260308020000", updatedAt: "2026-03-08T02:00:00.000Z" },
        ],
      }),
    );

    await expectBadRequestAndNoDeltaRead(
      service.getSupportList({
        type: "STOCK_US",
        since: "20260230020000",
      }),
      storeServiceMock,
    );
  });

  it("meta/current 失配时，getMeta 使用 current 视角且 getSupportList(since) 返回 409", async () => {
    storeServiceMock.readMeta.mockResolvedValue({
      ...createMetaRecord(),
      currentVersion: "20260308020000",
      lastUpdated: "2026-03-08T02:00:00.000Z",
    });
    storeServiceMock.readCurrent.mockResolvedValue(createCurrentRecord());

    const metaResult = await service.getMeta({ type: "STOCK_US" });
    expect(metaResult.currentVersion).toBe("20260309020000");
    await expectResyncRequired(
      service.getSupportList({
        type: "STOCK_US",
        since: metaResult.currentVersion,
      }),
      "META_CURRENT_VERSION_MISMATCH",
    );
  });

  it("since 不在历史中时应返回 409(SUPPORT_LIST_RESYNC_REQUIRED)", async () => {
    await expectResyncRequired(
      service.getSupportList({
        type: "STOCK_US",
        since: "20260101020000",
      }),
      "SINCE_NOT_FOUND_IN_HISTORY",
    );
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

  it("symbols 过滤下 delta 结果仍应唯一且遵循 last-win", async () => {
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
          added: [],
          updated: [
            { symbol: "AAPL.US", name: "Apple V2" },
            { symbol: "AAPL.US", name: "Apple V3" },
            { symbol: "MSFT.US", name: "MSFT V2" },
            { symbol: "TSLA.US", name: "Tesla V1" },
          ],
          removed: [],
        };
      }
      return null;
    });

    const result = await service.getSupportList({
      type: "STOCK_US",
      since: "20260307020000",
      symbols: ["msft.us", "AAPL.US"],
    });

    expect(result).toEqual({
      full: false,
      from: "20260307020000",
      to: "20260309020000",
      added: [{ symbol: "AAPL.US", name: "Apple V3" }],
      updated: [{ symbol: "MSFT.US", name: "MSFT V2" }],
      removed: [],
    });
  });

  it("delta 缺失时应返回 409(SUPPORT_LIST_RESYNC_REQUIRED)", async () => {
    storeServiceMock.readDelta.mockResolvedValueOnce(null);

    await expectResyncRequired(
      service.getSupportList({
        type: "STOCK_US",
        since: "20260307020000",
      }),
      "DELTA_CHAIN_BROKEN",
    );
  });

  // since 参数格式与时间合法性
  it("since 为未来时间时抛 BadRequestException", async () => {
    await expectBadRequestAndNoDeltaRead(
      service.getSupportList({
        type: "STOCK_US",
        since: "29990101000000",
      }),
      storeServiceMock,
    );
  });

  it("since 不是 14 位版本号时抛 BadRequestException", async () => {
    await expectBadRequestAndNoDeltaRead(
      service.getSupportList({
        type: "STOCK_US",
        since: "2026030902000",
      }),
      storeServiceMock,
    );
  });

  it("since 是非法日历版本(2月30日)时抛 BadRequestException", async () => {
    await expectBadRequestAndNoDeltaRead(
      service.getSupportList({
        type: "STOCK_US",
        since: "20260230020000",
      }),
      storeServiceMock,
    );
  });
});

describe("SupportListSyncService", () => {
  let storeServiceMock: jest.Mocked<SupportListStoreService>;
  let fetchGatewayMock: jest.Mocked<SupportListFetchGatewayService>;
  let diffServiceMock: jest.Mocked<SupportListDiffService>;
  let service: SupportListSyncService;
  const originalWaitTimeout =
    process.env.SUPPORT_LIST_REFRESH_LOCK_WAIT_TIMEOUT_MS;
  const originalPollInterval =
    process.env.SUPPORT_LIST_REFRESH_LOCK_POLL_INTERVAL_MS;

  beforeEach(() => {
    process.env.SUPPORT_LIST_REFRESH_LOCK_WAIT_TIMEOUT_MS = "100";
    process.env.SUPPORT_LIST_REFRESH_LOCK_POLL_INTERVAL_MS = "10";

    storeServiceMock = createSupportListStoreServiceMock();
    storeServiceMock.tryAcquireRefreshLock.mockResolvedValue(true);
    storeServiceMock.releaseRefreshLock.mockResolvedValue(undefined);
    storeServiceMock.extendRefreshLock.mockResolvedValue(true);
    storeServiceMock.isRefreshLockOwnedBy.mockResolvedValue(true);

    fetchGatewayMock = {
      fetchFullList: jest.fn(),
    } as unknown as jest.Mocked<SupportListFetchGatewayService>;

    diffServiceMock = {
      diff: jest.fn(),
    } as unknown as jest.Mocked<SupportListDiffService>;

    service = new SupportListSyncService(
      fetchGatewayMock,
      storeServiceMock,
      diffServiceMock,
    );
  });

  afterAll(() => {
    if (originalWaitTimeout === undefined) {
      delete process.env.SUPPORT_LIST_REFRESH_LOCK_WAIT_TIMEOUT_MS;
    } else {
      process.env.SUPPORT_LIST_REFRESH_LOCK_WAIT_TIMEOUT_MS = originalWaitTimeout;
    }
    if (originalPollInterval === undefined) {
      delete process.env.SUPPORT_LIST_REFRESH_LOCK_POLL_INTERVAL_MS;
    } else {
      process.env.SUPPORT_LIST_REFRESH_LOCK_POLL_INTERVAL_MS = originalPollInterval;
    }
  });

  it("并发 ensureTypeInitialized 应对同 type 互斥，仅触发一次全量拉取", async () => {
    let metaState: SupportListMetaRecord | null = null;
    let currentState: {
      type: string;
      provider: string;
      version: string;
      updatedAt: string;
      items: Array<Record<string, unknown>>;
    } | null = null;

    storeServiceMock.readMeta.mockImplementation(async () => metaState);
    storeServiceMock.readCurrent.mockImplementation(async () => currentState);
    storeServiceMock.writeCurrent.mockImplementation(async (record) => {
      currentState = record;
    });
    storeServiceMock.writeMeta.mockImplementation(async (record) => {
      metaState = record;
    });
    storeServiceMock.writeDelta.mockResolvedValue();

    fetchGatewayMock.fetchFullList.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return {
        provider: "infoway",
        items: [{ symbol: "AAPL.US" }],
      };
    });
    diffServiceMock.diff.mockReturnValue({
      added: [],
      updated: [],
      removed: [],
    });

    await Promise.all([
      service.ensureTypeInitialized("STOCK_US"),
      service.ensureTypeInitialized("STOCK_US"),
    ]);

    expect(fetchGatewayMock.fetchFullList).toHaveBeenCalledTimes(1);
    expect(storeServiceMock.tryAcquireRefreshLock).toHaveBeenCalledWith(
      "STOCK_US",
      expect.any(String),
    );
    expect(storeServiceMock.releaseRefreshLock).toHaveBeenCalledTimes(1);
  });

  it("跨实例锁被占用时应复用已有 meta，不重复刷新", async () => {
    storeServiceMock.tryAcquireRefreshLock.mockResolvedValueOnce(false);
    storeServiceMock.readMeta.mockResolvedValueOnce({
      type: "STOCK_US",
      currentVersion: "20260309020000",
      lastUpdated: "2026-03-09T02:00:00.000Z",
      retentionDays: 7,
      history: [],
    });
    storeServiceMock.readCurrent.mockResolvedValueOnce({
      type: "STOCK_US",
      provider: "infoway",
      version: "20260309020000",
      updatedAt: "2026-03-09T02:00:00.000Z",
      items: [],
    });

    const result = await service.refreshType("STOCK_US");

    expect(result.currentVersion).toBe("20260309020000");
    expect(fetchGatewayMock.fetchFullList).not.toHaveBeenCalled();
    expect(storeServiceMock.releaseRefreshLock).not.toHaveBeenCalled();
  });

  it("锁被占用且等待超时时应抛 ServiceUnavailableException", async () => {
    storeServiceMock.tryAcquireRefreshLock.mockResolvedValueOnce(false);
    storeServiceMock.readMeta.mockResolvedValue(null);
    storeServiceMock.readCurrent.mockResolvedValue(null);

    await expect(service.refreshType("STOCK_US")).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it("refreshType 生成 delta 时应将标准化 type 透传给 diff service", async () => {
    storeServiceMock.readMeta.mockResolvedValue({
      type: "CRYPTO",
      currentVersion: "20260308020000",
      lastUpdated: "2026-03-08T02:00:00.000Z",
      retentionDays: 7,
      history: [{ version: "20260308020000", updatedAt: "2026-03-08T02:00:00.000Z" }],
    });
    storeServiceMock.readCurrent.mockResolvedValue({
      type: "CRYPTO",
      provider: "infoway",
      version: "20260308020000",
      updatedAt: "2026-03-08T02:00:00.000Z",
      items: [{ symbol: "BTCUSDT" }],
    });
    fetchGatewayMock.fetchFullList.mockResolvedValue({
      provider: "infoway",
      items: [{ symbol: "BTCUSDT" }],
    });
    diffServiceMock.diff.mockReturnValue({
      added: [],
      updated: [],
      removed: [],
    });
    storeServiceMock.writeDelta.mockResolvedValue();
    storeServiceMock.writeCurrent.mockResolvedValue();
    storeServiceMock.writeMeta.mockResolvedValue();

    await service.refreshType("crypto");

    expect(diffServiceMock.diff).toHaveBeenCalledWith(
      [{ symbol: "BTCUSDT" }],
      [{ symbol: "BTCUSDT" }],
      "CRYPTO",
    );
  });

  it("写入前锁检查点续租失败时应 fail-fast，禁止继续写 current/meta", async () => {
    storeServiceMock.readMeta.mockResolvedValue({
      type: "STOCK_US",
      currentVersion: "20260308020000",
      lastUpdated: "2026-03-08T02:00:00.000Z",
      retentionDays: 7,
      history: [{ version: "20260308020000", updatedAt: "2026-03-08T02:00:00.000Z" }],
    });
    storeServiceMock.readCurrent.mockResolvedValue({
      type: "STOCK_US",
      provider: "infoway",
      version: "20260308020000",
      updatedAt: "2026-03-08T02:00:00.000Z",
      items: [{ symbol: "AAPL.US" }],
    });
    fetchGatewayMock.fetchFullList.mockResolvedValue({
      provider: "infoway",
      items: [{ symbol: "AAPL.US" }, { symbol: "MSFT.US" }],
    });
    storeServiceMock.extendRefreshLock.mockResolvedValueOnce(false);

    await expect(service.refreshType("STOCK_US")).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(storeServiceMock.writeDelta).not.toHaveBeenCalled();
    expect(storeServiceMock.writeCurrent).not.toHaveBeenCalled();
    expect(storeServiceMock.writeMeta).not.toHaveBeenCalled();
  });

  it("meta/current 失配时 ensureTypeInitialized 应触发刷新", async () => {
    storeServiceMock.readMeta.mockResolvedValue({
      type: "STOCK_US",
      currentVersion: "20260308020000",
      lastUpdated: "2026-03-08T02:00:00.000Z",
      retentionDays: 7,
      history: [],
    });
    storeServiceMock.readCurrent.mockResolvedValue({
      type: "STOCK_US",
      provider: "infoway",
      version: "20260309020000",
      updatedAt: "2026-03-09T02:00:00.000Z",
      items: [{ symbol: "AAPL.US" }],
    });
    const refreshSpy = jest
      .spyOn(service, "refreshType")
      .mockResolvedValue({} as SupportListMetaRecord);

    await service.ensureTypeInitialized("STOCK_US");

    expect(refreshSpy).toHaveBeenCalledWith("STOCK_US");
  });

  it("writeMeta 失败时应回滚 current，避免长期版本失配", async () => {
    const { previousMeta, previousCurrent } = createPreviousSnapshot();
    storeServiceMock.readMeta.mockResolvedValue(previousMeta);
    storeServiceMock.readCurrent.mockResolvedValue(previousCurrent);
    fetchGatewayMock.fetchFullList.mockResolvedValue({
      provider: "infoway",
      items: [{ symbol: "AAPL.US" }, { symbol: "MSFT.US" }],
    });
    diffServiceMock.diff.mockReturnValue({
      added: [{ symbol: "MSFT.US" }],
      updated: [],
      removed: [],
    });
    storeServiceMock.writeDelta.mockResolvedValue();
    storeServiceMock.writeCurrent.mockResolvedValue();
    storeServiceMock.writeMeta.mockRejectedValueOnce(new Error("meta write failed"));

    await expect(service.refreshType("STOCK_US")).rejects.toThrow(
      "meta write failed",
    );
    expect(storeServiceMock.writeCurrent).toHaveBeenCalledTimes(2);
    expect(storeServiceMock.writeCurrent).toHaveBeenLastCalledWith(previousCurrent);
  });

  it("首轮初始化 writeMeta 失败时应清理 current，避免遗留单边状态", async () => {
    storeServiceMock.readMeta.mockResolvedValue(null);
    storeServiceMock.readCurrent.mockResolvedValue(null);
    fetchGatewayMock.fetchFullList.mockResolvedValue({
      provider: "infoway",
      items: [{ symbol: "AAPL.US" }],
    });
    diffServiceMock.diff.mockReturnValue({
      added: [],
      updated: [],
      removed: [],
    });
    storeServiceMock.writeCurrent.mockResolvedValue();
    storeServiceMock.writeMeta.mockRejectedValueOnce(new Error("meta write failed"));
    storeServiceMock.deleteCurrent.mockResolvedValue();

    await expect(service.refreshType("STOCK_US")).rejects.toThrow(
      "meta write failed",
    );
    expect(storeServiceMock.deleteCurrent).toHaveBeenCalledWith("STOCK_US");
  });

  it("补偿阶段若失锁应跳过回滚写入，避免覆盖新 owner 结果", async () => {
    const { previousMeta, previousCurrent } = createPreviousSnapshot();
    storeServiceMock.readMeta.mockResolvedValue(previousMeta);
    storeServiceMock.readCurrent.mockResolvedValue(previousCurrent);
    fetchGatewayMock.fetchFullList.mockResolvedValue({
      provider: "infoway",
      items: [{ symbol: "AAPL.US" }, { symbol: "MSFT.US" }],
    });
    diffServiceMock.diff.mockReturnValue({
      added: [{ symbol: "MSFT.US" }],
      updated: [],
      removed: [],
    });
    storeServiceMock.writeDelta.mockResolvedValue();
    storeServiceMock.writeCurrent.mockResolvedValue();
    storeServiceMock.writeMeta.mockRejectedValueOnce(new Error("meta write failed"));
    let ownershipCheckCount = 0;
    storeServiceMock.isRefreshLockOwnedBy.mockImplementation(async () => {
      ownershipCheckCount += 1;
      return ownershipCheckCount <= 5;
    });

    await expect(service.refreshType("STOCK_US")).rejects.toThrow(
      "meta write failed",
    );
    expect(storeServiceMock.writeCurrent).toHaveBeenCalledTimes(1);
    expect(storeServiceMock.deleteCurrent).not.toHaveBeenCalled();
    expect(storeServiceMock.writeMeta).toHaveBeenCalledTimes(1);
    expect(storeServiceMock.deleteMeta).not.toHaveBeenCalled();
  });

  it("当 previousVersion 晚于当前时间时应生成 +1 秒且日历合法的新版本", async () => {
    const previousMeta: SupportListMetaRecord = {
      type: "STOCK_US",
      currentVersion: "20991231235959",
      lastUpdated: "2099-12-31T23:59:59.000Z",
      retentionDays: 7,
      history: [{ version: "20991231235959", updatedAt: "2099-12-31T23:59:59.000Z" }],
    };
    const previousCurrent = {
      type: "STOCK_US",
      provider: "infoway",
      version: "20991231235959",
      updatedAt: "2099-12-31T23:59:59.000Z",
      items: [{ symbol: "AAPL.US" }],
    };
    storeServiceMock.readMeta.mockResolvedValue(previousMeta);
    storeServiceMock.readCurrent.mockResolvedValue(previousCurrent);
    fetchGatewayMock.fetchFullList.mockResolvedValue({
      provider: "infoway",
      items: [{ symbol: "AAPL.US" }],
    });
    diffServiceMock.diff.mockReturnValue({
      added: [],
      updated: [],
      removed: [],
    });
    storeServiceMock.writeDelta.mockResolvedValue();
    storeServiceMock.writeCurrent.mockResolvedValue();
    storeServiceMock.writeMeta.mockResolvedValue();

    await service.refreshType("STOCK_US");

    expect(storeServiceMock.writeCurrent).toHaveBeenCalledWith(
      expect.objectContaining({
        version: "21000101000000",
      }),
    );
  });

  it("meta.currentVersion 晚于 current.version 时应以较大版本作为 next 基线", async () => {
    const previousMeta: SupportListMetaRecord = {
      type: "STOCK_US",
      currentVersion: "20991231235959",
      lastUpdated: "2099-12-31T23:59:59.000Z",
      retentionDays: 7,
      history: [{ version: "20991231235959", updatedAt: "2099-12-31T23:59:59.000Z" }],
    };
    const previousCurrent = {
      type: "STOCK_US",
      provider: "infoway",
      version: "20990101000000",
      updatedAt: "2099-01-01T00:00:00.000Z",
      items: [{ symbol: "AAPL.US" }],
    };
    storeServiceMock.readMeta.mockResolvedValue(previousMeta);
    storeServiceMock.readCurrent.mockResolvedValue(previousCurrent);
    fetchGatewayMock.fetchFullList.mockResolvedValue({
      provider: "infoway",
      items: [{ symbol: "AAPL.US" }],
    });
    diffServiceMock.diff.mockReturnValue({
      added: [],
      updated: [],
      removed: [],
    });
    storeServiceMock.writeDelta.mockResolvedValue();
    storeServiceMock.writeCurrent.mockResolvedValue();
    storeServiceMock.writeMeta.mockResolvedValue();

    await service.refreshType("STOCK_US");

    expect(storeServiceMock.writeCurrent).toHaveBeenCalledWith(
      expect.objectContaining({
        version: "21000101000000",
      }),
    );
  });

  it("meta.currentVersion 晚于 current.version 时应跳过增量写入避免链路漂移", async () => {
    const previousMeta: SupportListMetaRecord = {
      type: "STOCK_US",
      currentVersion: "20991231235959",
      lastUpdated: "2099-12-31T23:59:59.000Z",
      retentionDays: 7,
      history: [{ version: "20991231235959", updatedAt: "2099-12-31T23:59:59.000Z" }],
    };
    const previousCurrent = {
      type: "STOCK_US",
      provider: "infoway",
      version: "20990101000000",
      updatedAt: "2099-01-01T00:00:00.000Z",
      items: [{ symbol: "AAPL.US" }],
    };
    storeServiceMock.readMeta.mockResolvedValue(previousMeta);
    storeServiceMock.readCurrent.mockResolvedValue(previousCurrent);
    fetchGatewayMock.fetchFullList.mockResolvedValue({
      provider: "infoway",
      items: [{ symbol: "AAPL.US" }, { symbol: "MSFT.US" }],
    });
    diffServiceMock.diff.mockReturnValue({
      added: [{ symbol: "MSFT.US" }],
      updated: [],
      removed: [],
    });
    storeServiceMock.writeDelta.mockResolvedValue();
    storeServiceMock.writeCurrent.mockResolvedValue();
    storeServiceMock.writeMeta.mockResolvedValue();

    await service.refreshType("STOCK_US");

    expect(storeServiceMock.writeDelta).not.toHaveBeenCalled();
    expect(storeServiceMock.writeCurrent).toHaveBeenCalledWith(
      expect.objectContaining({
        version: "21000101000000",
      }),
    );
  });
});

describe("SupportListStoreService", () => {
  let storageServiceMock: jest.Mocked<StorageService>;
  let service: SupportListStoreService;

  beforeEach(() => {
    storageServiceMock = {
      retrieveData: jest.fn(),
      storeData: jest.fn(),
      deleteData: jest.fn(),
      tryAcquirePersistentLease: jest.fn(),
      renewPersistentLease: jest.fn(),
      releasePersistentLease: jest.fn(),
    } as unknown as jest.Mocked<StorageService>;

    service = new SupportListStoreService(storageServiceMock);
  });

  it("非 DATA_NOT_FOUND 异常不得被静默吞掉", async () => {
    const boom = new BusinessException({
      message: "storage unavailable",
      errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
      operation: "retrieveData",
      component: ComponentIdentifier.STORAGE,
    });
    storageServiceMock.retrieveData.mockRejectedValueOnce(boom);

    await expect(service.readCurrent("STOCK_US")).rejects.toBe(boom);
  });

  it("DATA_NOT_FOUND 异常应返回 null", async () => {
    const notFound = new BusinessException({
      message: "not found",
      errorCode: BusinessErrorCode.DATA_NOT_FOUND,
      operation: "retrieveData",
      component: ComponentIdentifier.STORAGE,
    });
    storageServiceMock.retrieveData.mockRejectedValueOnce(notFound);

    await expect(service.readCurrent("STOCK_US")).resolves.toBeNull();
  });

  it("tryAcquireRefreshLock 应调用持久化租约接口", async () => {
    storageServiceMock.tryAcquirePersistentLease.mockResolvedValueOnce(true);

    const acquired = await service.tryAcquireRefreshLock("STOCK_US", "owner-1");

    expect(acquired).toBe(true);
    expect(storageServiceMock.tryAcquirePersistentLease).toHaveBeenCalledWith(
      "support_list_refresh_lock_STOCK_US",
      "owner-1",
      120,
      expect.objectContaining({
        provider: "system-support-list",
        market: "STOCK_US",
      }),
    );
  });

  it("extendRefreshLock 应走 renewPersistentLease 且不触发 upsert 语义", async () => {
    storageServiceMock.renewPersistentLease.mockResolvedValueOnce(true);

    const renewed = await service.extendRefreshLock("STOCK_US", "owner-2");

    expect(renewed).toBe(true);
    expect(storageServiceMock.renewPersistentLease).toHaveBeenCalledWith(
      "support_list_refresh_lock_STOCK_US",
      "owner-2",
      120,
    );
  });

  it("releaseRefreshLock 应按 owner 精确释放租约", async () => {
    storageServiceMock.releasePersistentLease.mockResolvedValueOnce(undefined);

    await service.releaseRefreshLock("STOCK_US", "owner-3");

    expect(storageServiceMock.releasePersistentLease).toHaveBeenCalledWith(
      "support_list_refresh_lock_STOCK_US",
      "owner-3",
    );
  });
});

describe("StorageService 租约 TTL 校验", () => {
  let repositoryMock: {
    tryAcquireLease: jest.Mock;
    renewLease: jest.Mock;
    findByKey: jest.Mock;
  };
  let service: StorageService;

  beforeEach(() => {
    repositoryMock = {
      tryAcquireLease: jest.fn(),
      renewLease: jest.fn(),
      findByKey: jest.fn(),
    };
    service = new StorageService(repositoryMock as unknown as StorageRepository, {} as any);
  });

  it.each([0, -1, 1.5, NaN])(
    "tryAcquirePersistentLease 在 ttl=%s 非法时应 fail-fast 且不调用 repository",
    async (ttl) => {
      const leasePromise = service.tryAcquirePersistentLease("lock-key", "owner-a", ttl, {
        storageClassification: "lock",
        provider: "system-support-list",
        market: "STOCK_US",
      });
      await expect(leasePromise).rejects.toBeInstanceOf(BusinessException);
      await expect(leasePromise).rejects.toMatchObject({
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        component: ComponentIdentifier.STORAGE,
        operation: "tryAcquirePersistentLease",
      });
      expect(repositoryMock.tryAcquireLease).not.toHaveBeenCalled();
    },
  );

  it.each([0, -1, 1.5, NaN])(
    "renewPersistentLease 在 ttl=%s 非法时应 fail-fast 且不调用 repository",
    async (ttl) => {
      const renewPromise = service.renewPersistentLease("lock-key", "owner-a", ttl);
      await expect(renewPromise).rejects.toBeInstanceOf(BusinessException);
      await expect(renewPromise).rejects.toMatchObject({
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        component: ComponentIdentifier.STORAGE,
        operation: "renewPersistentLease",
      });
      expect(repositoryMock.renewLease).not.toHaveBeenCalled();
    },
  );

  it("retrieveData 命中 DATA_NOT_FOUND 时不应记录 error 日志", async () => {
    repositoryMock.findByKey.mockResolvedValueOnce(null);
    const loggerErrorSpy = jest.spyOn((service as any).logger, "error");

    await expect(
      service.retrieveData({
        key: "missing-lock-data",
        preferredType: StorageType.PERSISTENT,
      }),
    ).rejects.toMatchObject({
      errorCode: BusinessErrorCode.DATA_NOT_FOUND,
      component: ComponentIdentifier.STORAGE,
      operation: "retrieveData",
    });

    expect(loggerErrorSpy).not.toHaveBeenCalled();
  });
});

describe("StorageRepository 租约语义", () => {
  let modelMock: {
    findOneAndUpdate: jest.Mock;
    deleteOne: jest.Mock;
  };
  let repository: StorageRepository;

  beforeEach(() => {
    modelMock = {
      findOneAndUpdate: jest.fn(),
      deleteOne: jest.fn(),
    };
    repository = new StorageRepository(modelMock as any);
  });

  it("tryAcquireLease 遇到重复键冲突时应返回 false", async () => {
    const duplicateKeyError = Object.assign(new Error("E11000 duplicate key"), {
      code: 11000,
    });
    modelMock.findOneAndUpdate.mockRejectedValueOnce(duplicateKeyError);

    await expect(
      repository.tryAcquireLease("lock-key", "owner-a", new Date(), {
        storageClassification: "lock",
        provider: "system",
        market: "STOCK_US",
      }),
    ).resolves.toBe(false);

    const [acquireQuery] = modelMock.findOneAndUpdate.mock.calls[0] || [];
    expect(acquireQuery).toEqual(
      expect.objectContaining({
        key: "lock-key",
      }),
    );
    expect(acquireQuery["tags.__lease"]).toEqual(
      expect.objectContaining({
        $in: expect.arrayContaining([1, "1"]),
      }),
    );
  });

  it("renewLease 在 owner 不匹配时应返回 false", async () => {
    modelMock.findOneAndUpdate.mockResolvedValueOnce(null);

    await expect(
      repository.renewLease("lock-key", "owner-a", new Date()),
    ).resolves.toBe(false);

    const [renewQuery] = modelMock.findOneAndUpdate.mock.calls[0] || [];
    expect(renewQuery).toEqual(
      expect.objectContaining({
        key: "lock-key",
        "data.owner": "owner-a",
      }),
    );
    expect(renewQuery["tags.__lease"]).toEqual(
      expect.objectContaining({
        $in: expect.arrayContaining([1, "1"]),
      }),
    );
  });

  it("releaseLease 应按 key + owner 条件删除", async () => {
    modelMock.deleteOne.mockResolvedValueOnce({ deletedCount: 1 });

    await repository.releaseLease("lock-key", "owner-a");

    const [releaseQuery] = modelMock.deleteOne.mock.calls[0] || [];
    expect(releaseQuery).toEqual(
      expect.objectContaining({
        key: "lock-key",
        "data.owner": "owner-a",
      }),
    );
    expect(releaseQuery["tags.__lease"]).toEqual(
      expect.objectContaining({
        $in: expect.arrayContaining([1, "1"]),
      }),
    );
  });

  it("upsert 查询应排除 lease 文档，避免命中 __lease=1", async () => {
    modelMock.findOneAndUpdate.mockResolvedValueOnce({
      _id: "doc-1",
      key: "support_list_current_STOCK_US",
    });

    await repository.upsert({
      key: "support_list_current_STOCK_US",
      data: { items: [{ symbol: "AAPL.US" }] },
      storageClassification: "lock",
      provider: "system-support-list",
      market: "STOCK_US",
    } as any);

    const [upsertQuery] = modelMock.findOneAndUpdate.mock.calls[0] || [];
    expect(upsertQuery).toEqual(
      expect.objectContaining({
        key: "support_list_current_STOCK_US",
      }),
    );
    expect(upsertQuery["tags.__lease"]).toEqual(
      expect.objectContaining({
        $nin: expect.arrayContaining([1, "1"]),
      }),
    );
  });
});
