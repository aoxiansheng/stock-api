jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { API_OPERATIONS } from "@common/constants/domain";
import { StreamReceiverGateway } from "@core/01-entry/stream-receiver/gateway/stream-receiver.gateway";

describe("StreamReceiverGateway request-recovery capability", () => {
  let gateway: StreamReceiverGateway;
  let streamReceiverService: {
    handleClientReconnect: jest.Mock<Promise<void>, [unknown]>;
  };
  let client: {
    id: string;
    emit: jest.Mock<void, [string, unknown]>;
  };

  beforeEach(() => {
    streamReceiverService = {
      handleClientReconnect: jest.fn().mockResolvedValue(undefined),
    };
    gateway = new StreamReceiverGateway(
      streamReceiverService as any,
      {} as any,
      undefined,
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
});
