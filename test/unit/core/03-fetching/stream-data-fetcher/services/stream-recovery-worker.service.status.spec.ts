jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { StreamRecoveryWorkerService } from "@core/03-fetching/stream-data-fetcher/services/stream-recovery-worker.service";
import { CAPABILITY_NAMES } from "@providersv2/providers/constants/capability-names.constants";

const ONE_MINUTE_MS = 60 * 1000;

describe("StreamRecoveryWorkerService client status", () => {
  function createService() {
    const streamCache = {
      getDataSince: jest.fn(),
    };
    const historyCapability = {
      execute: jest.fn(),
    };
    const providerRegistry = {
      getCapability: jest.fn(),
      getProvider: jest.fn(),
      resolveHistoryExecutionContext: jest.fn(),
    };
    const clientSocket = {
      connected: true,
      emit: jest.fn(),
    };
    const webSocketServer = {
      sockets: {
        sockets: new Map([["client-1", clientSocket]]),
      },
    };
    const configService = {
      getConfig: jest.fn(() => ({
        queue: {
          name: "test-recovery",
          redis: {},
        },
        worker: {
          concurrency: 1,
          maxRetries: 1,
          retryDelay: 10,
        },
        cleanup: {
          removeOnComplete: true,
          removeOnFail: true,
        },
        recovery: {
          batchSize: 100,
          maxRecoveryWindow: 300000,
          maxDataPoints: 10000,
          historyFallback: {
            enabled: true,
            gapThresholdMs: 90000,
            minCoverageRatio: 0.6,
            maxHistoryPoints: 240,
            preferredProvider: "infoway",
            klineType: 1,
            crossProviderFailoverEnabled: false,
            crossProviderAllowlist: [],
          },
        },
        rateLimit: {
          default: {
            maxQPS: 10,
            window: 1000,
            burstSize: 10,
          },
        },
      })),
      getPriorityWeight: jest.fn(() => 1),
      getRateLimitConfig: jest.fn(() => ({
        maxQPS: 10,
        window: 1000,
        burstSize: 10,
      })),
    };

    const service = new StreamRecoveryWorkerService(
      streamCache as any,
      {} as any,
      {} as any,
      configService as any,
      providerRegistry as any,
      { emit: jest.fn() } as any,
      {
        getServer: jest.fn(() => webSocketServer),
        isServerAvailable: jest.fn(() => true),
        getServerStats: jest.fn(() => ({})),
      } as any,
    );

    const queue = {
      add: jest.fn(),
      getJobs: jest.fn(),
      getJob: jest.fn(),
      getJobCounts: jest.fn(),
    };

    (service as any).recoveryQueue = queue;

    return {
      service,
      queue,
      streamCache,
      historyCapability,
      providerRegistry,
      configService,
      clientSocket,
    };
  }

  function createJob(
    overrides: Partial<{
      clientId: string;
      symbols: string[];
      lastReceiveTimestamp: number;
      provider: string;
      capability: string;
      priority: "high" | "normal" | "low";
      attemptsMade: number;
      id: string;
    }> = {},
  ) {
    return {
      id: overrides.id ?? "job-1",
      data: {
        clientId: overrides.clientId ?? "client-1",
        symbols: overrides.symbols ?? ["AAPL.US"],
        lastReceiveTimestamp: overrides.lastReceiveTimestamp ?? 1700000000000,
        provider: overrides.provider ?? "infoway",
        capability: overrides.capability ?? "stream-stock-quote",
        priority: overrides.priority ?? "normal",
      },
      attemptsMade: overrides.attemptsMade ?? 0,
    };
  }

  it("submitRecoveryJob 后应更新客户端状态并暴露 lastJobId", async () => {
    const { service, queue } = createService();

    queue.add.mockResolvedValue({ id: "job-100" });

    await service.submitRecoveryJob({
      clientId: "client-1",
      symbols: ["AAPL.US"],
      lastReceiveTimestamp: Date.now() - 1000,
      provider: "longport",
      capability: "stream-stock-quote",
      priority: "normal",
    });

    const status = await service.getClientRecoveryStatus("client-1");

    expect(status.recoveryActive).toBe(false);
    expect(status.pendingJobs).toBe(1);
    expect(status.lastJobId).toBe("job-100");
    expect(queue.getJobs).not.toHaveBeenCalled();
  });

  it("cancelRecoveryJob 后状态应立即一致并记录 lastRecoveryTime", async () => {
    const { service, queue } = createService();

    queue.add.mockResolvedValue({ id: "job-200" });
    queue.getJob.mockResolvedValue({
      id: "job-200",
      data: { clientId: "client-1" },
      remove: jest.fn().mockResolvedValue(undefined),
    });

    await service.submitRecoveryJob({
      clientId: "client-1",
      symbols: ["AAPL.US"],
      lastReceiveTimestamp: Date.now() - 1000,
      provider: "longport",
      capability: "stream-stock-quote",
      priority: "normal",
    });

    await service.cancelRecoveryJob("job-200");

    const status = await service.getClientRecoveryStatus("client-1");

    expect(status.recoveryActive).toBe(false);
    expect(status.pendingJobs).toBe(0);
    expect(status.lastJobId).toBe("job-200");
    expect(typeof status.lastRecoveryTime).toBe("number");
  });

  it("短周期重复查询不应触发队列全量扫描", async () => {
    const { service, queue } = createService();

    await service.getClientRecoveryStatus("client-1");
    await service.getClientRecoveryStatus("client-1");

    expect(queue.getJobs).not.toHaveBeenCalled();
  });

  it("缓存覆盖充分时不触发历史兜底", async () => {
    const { service, streamCache, providerRegistry, clientSocket } = createService();
    const lastReceiveTimestamp = 1700000000000;
    const now = lastReceiveTimestamp + 2 * ONE_MINUTE_MS;
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(now);

    streamCache.getDataSince.mockResolvedValue([
      { s: "AAPL.US", p: 100, v: 1, t: lastReceiveTimestamp },
      { s: "AAPL.US", p: 101, v: 1, t: lastReceiveTimestamp + ONE_MINUTE_MS },
      {
        s: "AAPL.US",
        p: 102,
        v: 1,
        t: lastReceiveTimestamp + 2 * ONE_MINUTE_MS,
      },
    ]);

    const result = await (service as any).processRecoveryJob(
      createJob({
        id: "job-cache-only",
        lastReceiveTimestamp,
      }),
    );

    nowSpy.mockRestore();

    expect(result.success).toBe(true);
    expect(result.recoveredDataPoints).toBe(3);
    expect(providerRegistry.resolveHistoryExecutionContext).not.toHaveBeenCalled();
    expect(providerRegistry.getCapability).not.toHaveBeenCalled();
    expect(clientSocket.emit).toHaveBeenCalledWith(
      "recovery-data",
      expect.objectContaining({
        metadata: expect.objectContaining({
          source: "cache",
          cachePoints: 3,
          historyPoints: 0,
        }),
      }),
    );
  });

  it("缓存为空时触发历史兜底并标记 source=history", async () => {
    const {
      service,
      streamCache,
      historyCapability,
      providerRegistry,
      clientSocket,
    } = createService();
    const lastReceiveTimestamp = 1700000000000;
    const now = lastReceiveTimestamp + 2 * ONE_MINUTE_MS;
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(now);

    streamCache.getDataSince.mockResolvedValue([]);
    providerRegistry.resolveHistoryExecutionContext.mockResolvedValue({
      capability: historyCapability,
      contextService: { context: "resolved" },
      reasonCode: "success",
    });
    historyCapability.execute.mockResolvedValue({
      quote_data: [
        {
          symbol: "AAPL.US",
          timestamp: new Date(lastReceiveTimestamp + ONE_MINUTE_MS).toISOString(),
          lastPrice: 101,
          volume: 100,
        },
        {
          symbol: "AAPL.US",
          timestamp: new Date(lastReceiveTimestamp + 2 * ONE_MINUTE_MS).toISOString(),
          lastPrice: 102,
          volume: 200,
        },
      ],
    });

    const result = await (service as any).processRecoveryJob(
      createJob({
        id: "job-history-only",
        lastReceiveTimestamp,
      }),
    );

    nowSpy.mockRestore();

    expect(result.success).toBe(true);
    expect(result.recoveredDataPoints).toBe(2);
    expect(providerRegistry.resolveHistoryExecutionContext).toHaveBeenCalledWith(
      "infoway",
      CAPABILITY_NAMES.GET_STOCK_HISTORY,
    );
    expect(providerRegistry.getCapability).not.toHaveBeenCalled();
    expect(historyCapability.execute).toHaveBeenCalledTimes(1);
    expect(clientSocket.emit).toHaveBeenCalledWith(
      "recovery-data",
      expect.objectContaining({
        metadata: expect.objectContaining({
          source: "history",
          cachePoints: 0,
          historyPoints: 2,
        }),
      }),
    );
  });

  it("窗口无效时不应触发历史兜底", async () => {
    const { service, streamCache, providerRegistry } = createService();
    const lastReceiveTimestamp = 1700000000000;
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(lastReceiveTimestamp);

    streamCache.getDataSince.mockResolvedValue([]);

    const result = await (service as any).processRecoveryJob(
      createJob({
        id: "job-invalid-window",
        lastReceiveTimestamp,
      }),
    );

    nowSpy.mockRestore();

    expect(result.success).toBe(true);
    expect(result.recoveredDataPoints).toBe(0);
    expect(providerRegistry.resolveHistoryExecutionContext).not.toHaveBeenCalled();
    expect(providerRegistry.getCapability).not.toHaveBeenCalled();
  });

  it("历史兜底返回超量数据时应在映射前按 maxHistoryPoints 本地硬截断", async () => {
    const {
      service,
      streamCache,
      historyCapability,
      providerRegistry,
      clientSocket,
    } = createService();
    const lastReceiveTimestamp = 1700000000000;
    const now = lastReceiveTimestamp + 10 * ONE_MINUTE_MS;
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(now);
    const mapHistoryRowsToStreamDataPointsSpy = jest.spyOn(
      service as any,
      "mapHistoryRowsToStreamDataPoints",
    );

    (service as any).config.recovery.historyFallback.maxHistoryPoints = 2;
    streamCache.getDataSince.mockResolvedValue([]);
    providerRegistry.resolveHistoryExecutionContext.mockResolvedValue({
      capability: historyCapability,
      contextService: { context: "resolved" },
      reasonCode: "success",
    });
    historyCapability.execute.mockResolvedValue({
      quote_data: [
        {
          symbol: "AAPL.US",
          timestamp: new Date(lastReceiveTimestamp + ONE_MINUTE_MS).toISOString(),
          lastPrice: 101,
          volume: 10,
        },
        {
          symbol: "AAPL.US",
          timestamp: new Date(lastReceiveTimestamp + 2 * ONE_MINUTE_MS).toISOString(),
          lastPrice: 102,
          volume: 20,
        },
        {
          symbol: "AAPL.US",
          timestamp: new Date(lastReceiveTimestamp + 3 * ONE_MINUTE_MS).toISOString(),
          lastPrice: 103,
          volume: 30,
        },
        {
          symbol: "AAPL.US",
          timestamp: new Date(lastReceiveTimestamp + 4 * ONE_MINUTE_MS).toISOString(),
          lastPrice: 104,
          volume: 40,
        },
        {
          symbol: "AAPL.US",
          timestamp: new Date(lastReceiveTimestamp + 5 * ONE_MINUTE_MS).toISOString(),
          lastPrice: 105,
          volume: 50,
        },
      ],
    });

    const result = await (service as any).processRecoveryJob(
      createJob({
        id: "job-history-hard-truncate",
        lastReceiveTimestamp,
      }),
    );

    nowSpy.mockRestore();

    expect(result.success).toBe(true);
    expect(result.recoveredDataPoints).toBe(2);
    expect(historyCapability.execute).toHaveBeenCalledTimes(1);
    expect(mapHistoryRowsToStreamDataPointsSpy).toHaveBeenCalledTimes(1);
    const mappedInputRows = mapHistoryRowsToStreamDataPointsSpy.mock.calls[0]?.[1] as
      | Array<{ timestamp: string }>
      | undefined;
    expect(mappedInputRows).toHaveLength(2);
    expect(mappedInputRows?.map((row) => row.timestamp)).toEqual([
      new Date(lastReceiveTimestamp + 4 * ONE_MINUTE_MS).toISOString(),
      new Date(lastReceiveTimestamp + 5 * ONE_MINUTE_MS).toISOString(),
    ]);
    const recoveryEmitPayload = clientSocket.emit.mock.calls.find(
      ([eventName]) => eventName === "recovery-data",
    )?.[1] as { data: Array<{ t: number }>; metadata: { historyPoints: number } } | undefined;
    expect(recoveryEmitPayload).toBeDefined();
    expect(recoveryEmitPayload?.metadata.historyPoints).toBe(2);
    expect(recoveryEmitPayload?.data.map((point) => point.t)).toEqual([
      lastReceiveTimestamp + 4 * ONE_MINUTE_MS,
      lastReceiveTimestamp + 5 * ONE_MINUTE_MS,
    ]);
    mapHistoryRowsToStreamDataPointsSpy.mockRestore();
  });

  it.each([
    {
      caseName: "symbol 完全匹配",
      rowSymbol: "AAPL.US",
      expectedPoints: 1,
      expectedSymbol: "AAPL.US",
    },
    {
      caseName: "symbol 大小写不同",
      rowSymbol: "aapl.us",
      expectedPoints: 1,
      expectedSymbol: "AAPL.US",
    },
    {
      caseName: "symbol 缺失时回退请求 symbol",
      rowSymbol: undefined,
      expectedPoints: 1,
      expectedSymbol: "AAPL.US",
    },
    {
      caseName: "symbol 不一致应丢弃",
      rowSymbol: "TSLA.US",
      expectedPoints: 0,
      expectedSymbol: null,
    },
  ])(
    "history symbol 一致性矩阵: $caseName",
    ({
      rowSymbol,
      expectedPoints,
      expectedSymbol,
    }: {
      rowSymbol?: string;
      expectedPoints: number;
      expectedSymbol: string | null;
    }) => {
      const { service } = createService();
      const lastReceiveTimestamp = 1700000000000;
      const row: Record<string, unknown> = {
        timestamp: new Date(lastReceiveTimestamp + ONE_MINUTE_MS).toISOString(),
        lastPrice: 101,
        volume: 100,
      };
      if (rowSymbol !== undefined) {
        row.symbol = rowSymbol;
      }

      const mappedPoints = (service as any).mapHistoryRowsToStreamDataPoints(
        "AAPL.US",
        [row],
        lastReceiveTimestamp,
        lastReceiveTimestamp + 2 * ONE_MINUTE_MS,
      );

      expect(mappedPoints).toHaveLength(expectedPoints);
      if (expectedSymbol) {
        expect(mappedPoints[0]?.s).toBe(expectedSymbol);
      }
    },
  );

  it("history 混合 symbol 输入时只应向客户端发送请求 symbol", async () => {
    const {
      service,
      streamCache,
      historyCapability,
      providerRegistry,
      clientSocket,
    } = createService();
    const lastReceiveTimestamp = 1700000000000;
    const now = lastReceiveTimestamp + 3 * ONE_MINUTE_MS;
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(now);

    streamCache.getDataSince.mockResolvedValue([]);
    providerRegistry.resolveHistoryExecutionContext.mockResolvedValue({
      capability: historyCapability,
      contextService: { context: "resolved" },
      reasonCode: "success",
    });
    historyCapability.execute.mockResolvedValue({
      quote_data: [
        {
          symbol: "AAPL.US",
          timestamp: new Date(lastReceiveTimestamp + ONE_MINUTE_MS).toISOString(),
          lastPrice: 101,
          volume: 100,
        },
        {
          symbol: "TSLA.US",
          timestamp: new Date(lastReceiveTimestamp + 2 * ONE_MINUTE_MS).toISOString(),
          lastPrice: 202,
          volume: 200,
        },
        {
          timestamp: new Date(lastReceiveTimestamp + 3 * ONE_MINUTE_MS).toISOString(),
          lastPrice: 103,
          volume: 300,
        },
      ],
    });

    const result = await (service as any).processRecoveryJob(
      createJob({
        id: "job-history-symbol-consistency",
        lastReceiveTimestamp,
      }),
    );

    nowSpy.mockRestore();

    expect(result.success).toBe(true);
    expect(result.recoveredDataPoints).toBe(2);
    const recoveryEmitPayload = clientSocket.emit.mock.calls.find(
      ([eventName]) => eventName === "recovery-data",
    )?.[1] as { data: Array<{ s: string }> } | undefined;
    expect(recoveryEmitPayload).toBeDefined();
    expect(recoveryEmitPayload?.data).toHaveLength(2);
    expect(recoveryEmitPayload?.data.every((point) => point.s === "AAPL.US")).toBe(
      true,
    );
  });

  it("开启跨 provider 且 preferredProvider 命中 allowlist 时应优先尝试 preferredProvider", async () => {
    const { service, streamCache, providerRegistry } = createService();
    const lastReceiveTimestamp = 1700000000000;
    const now = lastReceiveTimestamp + 2 * ONE_MINUTE_MS;
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(now);

    (service as any).config.recovery.historyFallback.crossProviderFailoverEnabled =
      true;
    (service as any).config.recovery.historyFallback.preferredProvider = "infoway";
    (service as any).config.recovery.historyFallback.crossProviderAllowlist = [
      "infoway",
    ];

    streamCache.getDataSince.mockResolvedValue([]);
    const infowayCapability = {
      execute: jest.fn().mockResolvedValue({
        quote_data: [
          {
            symbol: "AAPL.US",
            timestamp: new Date(lastReceiveTimestamp + ONE_MINUTE_MS).toISOString(),
            lastPrice: 101,
            volume: 100,
          },
        ],
      }),
    };
    providerRegistry.resolveHistoryExecutionContext.mockImplementation(
      async (providerName: string) => {
        if (providerName === "infoway") {
          return {
            capability: infowayCapability,
            contextService: { provider: "infoway" },
            reasonCode: "success",
          };
        }
        return {
          capability: null,
          contextService: null,
          reasonCode: "missing_capability",
        };
      },
    );

    const result = await (service as any).processRecoveryJob(
      createJob({
        id: "job-cross-provider-preferred-first",
        provider: "longport",
        lastReceiveTimestamp,
      }),
    );

    nowSpy.mockRestore();

    expect(result.success).toBe(true);
    expect(result.recoveredDataPoints).toBe(1);
    expect(providerRegistry.resolveHistoryExecutionContext).toHaveBeenCalledWith(
      "infoway",
      CAPABILITY_NAMES.GET_STOCK_HISTORY,
    );
    expect(infowayCapability.execute).toHaveBeenCalledTimes(1);
  });

  it("真实能力边界：longport 缺历史能力时应降级而非伪成功补发", async () => {
    const { service, streamCache, providerRegistry, clientSocket } = createService();
    const lastReceiveTimestamp = 1700000000000;
    const now = lastReceiveTimestamp + 2 * ONE_MINUTE_MS;
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(now);

    streamCache.getDataSince.mockResolvedValue([]);
    providerRegistry.resolveHistoryExecutionContext.mockResolvedValue({
      capability: null,
      contextService: { provider: "longport" },
      reasonCode: "missing_capability",
    });

    const result = await (service as any).processRecoveryJob(
      createJob({
        id: "job-longport-missing-capability",
        provider: "longport",
        lastReceiveTimestamp,
      }),
    );

    nowSpy.mockRestore();

    expect(result.success).toBe(true);
    expect(result.degraded).toBe(true);
    expect(result.recoveredDataPoints).toBe(0);
    expect(result.retryable).toBe(false);
    expect(result.reasonCode).toBe("missing_capability");
    expect(providerRegistry.resolveHistoryExecutionContext).toHaveBeenCalledTimes(1);
    expect(providerRegistry.resolveHistoryExecutionContext).toHaveBeenCalledWith(
      "longport",
      CAPABILITY_NAMES.GET_STOCK_HISTORY,
    );
    expect(providerRegistry.getCapability).not.toHaveBeenCalled();
    const emittedEvents = clientSocket.emit.mock.calls.map(([eventName]) => eventName);
    expect(emittedEvents).not.toContain("recovery-data");
  });

  it("non-retryable 兜底耗尽在 Bull 非最终轮应降级返回而非抛错", async () => {
    const { service, streamCache, providerRegistry } = createService();
    const lastReceiveTimestamp = 1700000000000;
    const now = lastReceiveTimestamp + 2 * ONE_MINUTE_MS;
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(now);

    (service as any).config.worker.maxRetries = 3;
    streamCache.getDataSince.mockResolvedValue([]);
    providerRegistry.resolveHistoryExecutionContext.mockResolvedValue({
      capability: null,
      contextService: { provider: "longport" },
      reasonCode: "missing_capability",
    });

    const job = {
      ...createJob({
        id: "job-non-retryable-bull-worker",
        provider: "longport",
        lastReceiveTimestamp,
        attemptsMade: 0,
      }),
      moveToFailed: jest.fn(),
    };

    const result = await (service as any).processRecoveryJob(job as any);

    nowSpy.mockRestore();

    expect(result.success).toBe(true);
    expect(result.degraded).toBe(true);
    expect(result.retryable).toBe(false);
    expect(result.reasonCode).toBe("missing_capability");
  });

  it("retryable 兜底耗尽在 Bull 非最终轮应抛错触发重试", async () => {
    const { service, streamCache, providerRegistry } = createService();
    const lastReceiveTimestamp = 1700000000000;
    const now = lastReceiveTimestamp + 2 * ONE_MINUTE_MS;
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(now);
    const checkRateLimitSpy = jest
      .spyOn(service as any, "checkRateLimit")
      .mockReturnValue(false);

    (service as any).config.worker.maxRetries = 3;
    streamCache.getDataSince.mockResolvedValue([]);
    providerRegistry.resolveHistoryExecutionContext.mockResolvedValue({
      capability: { execute: jest.fn() },
      contextService: { provider: "infoway" },
      reasonCode: "success",
    });

    const job = {
      ...createJob({
        id: "job-retryable-bull-worker",
        provider: "infoway",
        lastReceiveTimestamp,
        attemptsMade: 0,
      }),
      moveToFailed: jest.fn(),
    };

    await expect((service as any).processRecoveryJob(job as any)).rejects.toMatchObject({
      retryable: true,
      context: expect.objectContaining({
        reasonCode: "history_rate_limit_exceeded",
      }),
    });

    checkRateLimitSpy.mockRestore();
    nowSpy.mockRestore();
  });

  it.each([
    {
      caseName: "429 限流错误",
      errorFactory: () =>
        Object.assign(new Error("429 Too Many Requests"), { status: 429 }),
      expectedRetryable: true,
    },
    {
      caseName: "timeout 瞬时错误",
      errorFactory: () =>
        Object.assign(new Error("history request timeout"), {
          code: "ETIMEDOUT",
        }),
      expectedRetryable: true,
    },
    {
      caseName: "409 冲突错误",
      errorFactory: () =>
        Object.assign(new Error("history request conflict"), { status: 409 }),
      expectedRetryable: true,
    },
    {
      caseName: "425 too early 错误",
      errorFactory: () =>
        Object.assign(new Error("history request too early"), { status: 425 }),
      expectedRetryable: true,
    },
    {
      caseName: "参数错误",
      errorFactory: () =>
        Object.assign(new Error("invalid symbol parameter"), {
          status: 400,
          code: "INVALID_ARGUMENT",
        }),
      expectedRetryable: false,
    },
    {
      caseName: "资源不存在错误",
      errorFactory: () =>
        Object.assign(new Error("symbol not found"), {
          status: 404,
          code: "NOT_FOUND",
        }),
      expectedRetryable: false,
    },
    {
      caseName: "契约校验错误",
      errorFactory: () =>
        Object.assign(new Error("schema validation failed"), {
          status: 422,
          code: "VALIDATION_ERROR",
        }),
      expectedRetryable: false,
    },
  ])(
    "history fallback 错误分类矩阵: $caseName",
    async ({
      errorFactory,
      expectedRetryable,
    }: {
      errorFactory: () => Error;
      expectedRetryable: boolean;
    }) => {
      const { service, streamCache, providerRegistry } = createService();
      const lastReceiveTimestamp = 1700000000000;
      const now = lastReceiveTimestamp + 2 * ONE_MINUTE_MS;
      const nowSpy = jest.spyOn(Date, "now").mockReturnValue(now);

      (service as any).config.worker.maxRetries = 3;
      streamCache.getDataSince.mockResolvedValue([]);
      providerRegistry.resolveHistoryExecutionContext.mockResolvedValue({
        capability: {
          execute: jest.fn().mockRejectedValue(errorFactory()),
        },
        contextService: { provider: "infoway" },
        reasonCode: "success",
      });

      const job = {
        ...createJob({
          id: `job-history-error-classification-${expectedRetryable ? "retryable" : "non-retryable"}`,
          provider: "infoway",
          lastReceiveTimestamp,
          attemptsMade: 0,
        }),
        moveToFailed: jest.fn(),
      };

      if (expectedRetryable) {
        await expect(
          (service as any).processRecoveryJob(job as any),
        ).rejects.toMatchObject({
          retryable: true,
          context: expect.objectContaining({
            reasonCode: expect.any(String),
          }),
        });
      } else {
        const result = await (service as any).processRecoveryJob(job as any);
        expect(result.success).toBe(true);
        expect(result.degraded).toBe(true);
        expect(result.recoveredDataPoints).toBe(0);
        expect(result.retryable).toBe(false);
        expect(typeof result.reasonCode).toBe("string");
        expect((result.reasonCode || "").length).toBeGreaterThan(0);
      }

      nowSpy.mockRestore();
    },
  );

  it("reasonCode 应从 registry 透传到 worker 诊断日志", async () => {
    const { service, streamCache, providerRegistry } = createService();
    const lastReceiveTimestamp = 1700000000000;
    const now = lastReceiveTimestamp + 2 * ONE_MINUTE_MS;
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(now);

    streamCache.getDataSince.mockResolvedValue([]);
    providerRegistry.resolveHistoryExecutionContext.mockResolvedValue({
      capability: null,
      contextService: null,
      reasonCode: "missing_provider",
    });

    const result = await (service as any).processRecoveryJob(
      createJob({
        id: "job-reason-code-pass-through",
        provider: "longport",
        lastReceiveTimestamp,
      }),
    );

    nowSpy.mockRestore();

    expect(result.success).toBe(true);
    expect(result.degraded).toBe(true);
    expect(providerRegistry.getCapability).not.toHaveBeenCalled();

    const warnCalls = (service as any).logger.warn.mock.calls;
    const matchedWarn = warnCalls.find(
      ([, context]: [string, { reasonCode?: string }]) =>
        context?.reasonCode === "missing_provider",
    );
    expect(matchedWarn).toBeDefined();
  });

  it("coverage 应按 klineType 粒度聚合，而非固定 1 分钟", async () => {
    const { service, streamCache, providerRegistry } = createService();
    const lastReceiveTimestamp = 1700000000000;
    const now = lastReceiveTimestamp + 15 * ONE_MINUTE_MS;
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(now);

    (service as any).config.recovery.historyFallback.klineType = 5;
    (service as any).config.recovery.historyFallback.gapThresholdMs =
      10 * ONE_MINUTE_MS;

    streamCache.getDataSince.mockResolvedValue([
      {
        s: "AAPL.US",
        p: 101,
        v: 1,
        t: lastReceiveTimestamp + ONE_MINUTE_MS,
      },
      {
        s: "AAPL.US",
        p: 102,
        v: 1,
        t: lastReceiveTimestamp + 6 * ONE_MINUTE_MS,
      },
      {
        s: "AAPL.US",
        p: 103,
        v: 1,
        t: lastReceiveTimestamp + 11 * ONE_MINUTE_MS,
      },
    ]);

    const result = await (service as any).processRecoveryJob(
      createJob({
        id: "job-kline-bucket-coverage",
        lastReceiveTimestamp,
      }),
    );

    nowSpy.mockRestore();

    expect(result.success).toBe(true);
    expect(result.recoveredDataPoints).toBe(3);
    expect(providerRegistry.resolveHistoryExecutionContext).not.toHaveBeenCalled();
  });

  it.each([
    { klineType: 1, expectedKlineNum: 61 },
    { klineType: 5, expectedKlineNum: 13 },
    { klineType: 15, expectedKlineNum: 5 },
    { klineType: 30, expectedKlineNum: 3 },
    { klineType: 60, expectedKlineNum: 2 },
  ])(
    "klineType=$klineType 时应按对应粒度计算 klineNum",
    async ({ klineType, expectedKlineNum }) => {
      const { service, streamCache, providerRegistry } = createService();
      const lastReceiveTimestamp = 1700000000000;
      const now = lastReceiveTimestamp + 60 * ONE_MINUTE_MS;
      const nowSpy = jest.spyOn(Date, "now").mockReturnValue(now);

      const capability = {
        execute: jest.fn().mockResolvedValue({
          quote_data: [
            {
              symbol: "AAPL.US",
              timestamp: new Date(now).toISOString(),
              lastPrice: 120,
              volume: 10,
            },
          ],
        }),
      };

      (service as any).config.recovery.historyFallback.klineType = klineType;
      streamCache.getDataSince.mockResolvedValue([]);
      providerRegistry.resolveHistoryExecutionContext.mockResolvedValue({
        capability,
        contextService: { context: "ok" },
        reasonCode: "success",
      });

      const result = await (service as any).processRecoveryJob(
        createJob({
          id: `job-kline-${klineType}`,
          lastReceiveTimestamp,
        }),
      );

      nowSpy.mockRestore();

      expect(result.success).toBe(true);
      expect(capability.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          klineType,
          klineNum: expectedKlineNum,
        }),
      );
    },
  );

  it("非法 klineType 应回退默认值并按默认粒度计算", async () => {
    const { service, streamCache, providerRegistry } = createService();
    const lastReceiveTimestamp = 1700000000000;
    const now = lastReceiveTimestamp + 2 * ONE_MINUTE_MS;
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(now);

    const capability = {
      execute: jest.fn().mockResolvedValue({
        quote_data: [
          {
            symbol: "AAPL.US",
            timestamp: new Date(now).toISOString(),
            lastPrice: 120,
            volume: 10,
          },
        ],
      }),
    };

    (service as any).config.recovery.historyFallback.klineType = 999;
    streamCache.getDataSince.mockResolvedValue([]);
    providerRegistry.resolveHistoryExecutionContext.mockResolvedValue({
      capability,
      contextService: { context: "ok" },
      reasonCode: "success",
    });

    const result = await (service as any).processRecoveryJob(
      createJob({
        id: "job-invalid-kline-type",
        lastReceiveTimestamp,
      }),
    );

    nowSpy.mockRestore();

    expect(result.success).toBe(true);
    expect(capability.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        klineType: 1,
        klineNum: 3,
      }),
    );
  });

  it("checkRateLimit 应使用真实 normalizeProviderName 统一 provider 键", () => {
    const { service, configService } = createService();

    (service as any).checkRateLimit(" LongPort ");
    (service as any).checkRateLimit("longport");

    expect(configService.getRateLimitConfig).toHaveBeenCalledWith("longport");
    expect(Array.from((service as any).rateLimiter.keys())).toEqual([
      "longport",
    ]);
  });
});
