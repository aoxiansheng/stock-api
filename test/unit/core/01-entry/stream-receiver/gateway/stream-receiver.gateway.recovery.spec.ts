jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { API_OPERATIONS } from "@common/constants/domain";
import { STREAM_RECEIVER_TIMEOUTS } from "@core/01-entry/stream-receiver/constants/stream-receiver-timeouts.constants";
import { STREAM_RECEIVER_ERROR_CODES } from "@core/01-entry/stream-receiver/constants/stream-receiver-error-codes.constants";
import { StreamReceiverGateway } from "@core/01-entry/stream-receiver/gateway/stream-receiver.gateway";

describe("StreamReceiverGateway request-recovery capability", () => {
  let gateway: StreamReceiverGateway;
  let streamReceiverService: {
    handleClientReconnect: jest.Mock<Promise<any>, [unknown]>;
  };
  let streamRecoveryWorker: {
    getClientRecoveryStatus: jest.Mock<Promise<any>, [string]>;
  };
  let client: {
    id: string;
    emit: jest.Mock<void, [string, unknown]>;
  };

  beforeEach(() => {
    streamReceiverService = {
      handleClientReconnect: jest.fn().mockResolvedValue({
        success: true,
        recoveryStrategy: {
          willRecover: true,
        },
        instructions: {
          message: "ok",
        },
      }),
    };
    streamRecoveryWorker = {
      getClientRecoveryStatus: jest.fn().mockResolvedValue({
        recoveryActive: true,
        pendingJobs: 2,
        lastRecoveryTime: 1700000000123,
        lastJobId: "job-1",
      }),
    };
    gateway = new StreamReceiverGateway(
      streamReceiverService as any,
      {} as any,
      streamRecoveryWorker as any,
      undefined,
    );
    client = {
      id: "client-1",
      emit: jest.fn(),
    };
  });

  it("缺省 wsCapabilityType 时回填统一常量 STREAM_QUOTE", async () => {
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(1700000000000);
    try {
      await gateway.handleRecoveryRequest(client as any, {
        symbols: ["AAPL.US"],
        lastReceiveTimestamp: 1700000000000 - 1000,
      });
    } finally {
      nowSpy.mockRestore();
    }

    expect(streamReceiverService.handleClientReconnect).toHaveBeenCalledWith(
      expect.objectContaining({
        wsCapabilityType: API_OPERATIONS.STOCK_DATA.STREAM_QUOTE,
      }),
    );
  });

  it("传入 quote 别名时统一映射为 STREAM_QUOTE，避免能力混用", async () => {
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(1700000000000);
    try {
      await gateway.handleRecoveryRequest(client as any, {
        symbols: ["AAPL.US"],
        lastReceiveTimestamp: 1700000000000 - 1000,
        wsCapabilityType: "quote",
      });
    } finally {
      nowSpy.mockRestore();
    }

    expect(streamReceiverService.handleClientReconnect).toHaveBeenCalledWith(
      expect.objectContaining({
        wsCapabilityType: API_OPERATIONS.STOCK_DATA.STREAM_QUOTE,
      }),
    );
  });

  it("超出统一恢复窗口时应返回 recoveryWindowExceeded，且不触发重连", async () => {
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(1700000000000);
    try {
      await gateway.handleRecoveryRequest(client as any, {
        symbols: ["AAPL.US"],
        lastReceiveTimestamp:
          1700000000000 - STREAM_RECEIVER_TIMEOUTS.RECOVERY_WINDOW_MS - 1,
      });
    } finally {
      nowSpy.mockRestore();
    }

    expect(streamReceiverService.handleClientReconnect).not.toHaveBeenCalled();
    expect(client.emit).toHaveBeenCalledWith(
      "recovery-error",
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: STREAM_RECEIVER_ERROR_CODES.RECOVERY_WINDOW_EXCEEDED,
          details: expect.objectContaining({
            maxWindowMs: STREAM_RECEIVER_TIMEOUTS.RECOVERY_WINDOW_MS,
          }),
        }),
      }),
    );
  });

  it("重连失败时应返回 recovery-error，且不发送 recovery-started", async () => {
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(1700000000000);
    streamReceiverService.handleClientReconnect.mockResolvedValueOnce({
      success: false,
      instructions: {
        message: "reconnect failed",
      },
    });

    try {
      await gateway.handleRecoveryRequest(client as any, {
        symbols: ["AAPL.US"],
        lastReceiveTimestamp: 1700000000000 - 1000,
      });
    } finally {
      nowSpy.mockRestore();
    }

    expect(client.emit).toHaveBeenCalledWith(
      "recovery-error",
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          details: expect.objectContaining({
            type: "recovery_start_failed",
            context: expect.objectContaining({
              clientId: "client-1",
              symbolsCount: 1,
            }),
          }),
        }),
      }),
    );
    expect(client.emit).not.toHaveBeenCalledWith(
      "recovery-started",
      expect.anything(),
    );
  });

  it("get-recovery-status 应透传 worker 的真实状态", async () => {
    await gateway.handleGetRecoveryStatus(client as any);

    expect(streamRecoveryWorker.getClientRecoveryStatus).toHaveBeenCalledWith(
      "client-1",
    );
    expect(client.emit).toHaveBeenCalledWith(
      "recovery-status",
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          clientId: "client-1",
          recoveryActive: true,
          pendingJobs: 2,
          lastRecoveryTime: 1700000000123,
          lastJobId: "job-1",
        }),
      }),
    );
  });
});
