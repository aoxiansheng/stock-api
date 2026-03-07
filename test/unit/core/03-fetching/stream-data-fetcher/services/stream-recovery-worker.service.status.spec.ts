jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { StreamRecoveryWorkerService } from "@core/03-fetching/stream-data-fetcher/services/stream-recovery-worker.service";

describe("StreamRecoveryWorkerService client status", () => {
  function createService() {
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
      { getDataSince: jest.fn() } as any,
      {} as any,
      {} as any,
      configService as any,
      { emit: jest.fn() } as any,
      {
        getServer: jest.fn(() => null),
        isServerAvailable: jest.fn(() => false),
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
});
