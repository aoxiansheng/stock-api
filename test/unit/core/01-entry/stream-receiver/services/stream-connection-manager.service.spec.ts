jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { StreamConnectionManagerService } from "@core/01-entry/stream-receiver/services/stream-connection-manager.service";

type MockStreamConnection = {
  id: string;
  provider: string;
  capability: string;
  isConnected: boolean;
  createdAt: Date;
  lastActiveAt: Date;
};

function createConnection(
  id: string,
  options?: {
    provider?: string;
    capability?: string;
    isConnected?: boolean;
    lastActiveAt?: Date;
  },
): MockStreamConnection {
  return {
    id,
    provider: options?.provider ?? "infoway",
    capability: options?.capability ?? "stream_quote",
    isConnected: options?.isConnected ?? true,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    lastActiveAt: options?.lastActiveAt ?? new Date("2024-01-01T00:00:00.000Z"),
  };
}

describe("StreamConnectionManagerService forceConnectionCleanup", () => {
  let service: StreamConnectionManagerService;
  let streamDataFetcher: {
    closeConnection: jest.Mock;
    isConnectionActive: jest.Mock;
  };

  beforeEach(() => {
    const configService = {
      get: jest.fn((_: string, defaultValue: unknown) => defaultValue),
    };
    streamDataFetcher = {
      closeConnection: jest.fn(),
      isConnectionActive: jest.fn((connection: MockStreamConnection) =>
        connection.isConnected,
      ),
    };

    service = new StreamConnectionManagerService(
      configService as any,
      { emit: jest.fn() } as any,
      streamDataFetcher as any,
    );
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    jest.restoreAllMocks();
  });

  it("provider cleanup 失败但连接实际已断开时，仍清理本地 map 且计入统计", async () => {
    const connectionKey = "infoway:stream_quote";
    const connection = createConnection("conn-1");
    (service as any).activeConnections.set(connectionKey, connection);
    (service as any).connectionHealth.set(connection.id, {
      isHealthy: false,
      lastActivity: Date.now(),
      connectionQuality: "poor",
    });

    streamDataFetcher.closeConnection.mockImplementation(
      async (target: MockStreamConnection) => {
        target.isConnected = false;
        throw new Error("provider cleanup failed");
      },
    );

    const result = await service.forceConnectionCleanup();

    expect(streamDataFetcher.closeConnection).toHaveBeenCalledTimes(1);
    expect(result.totalCleaned).toBe(1);
    expect(result.unhealthyConnectionsCleaned).toBe(1);
    expect(result.remainingConnections).toBe(0);
    expect((service as any).activeConnections.has(connectionKey)).toBe(false);
    expect((service as any).connectionHealth.has(connection.id)).toBe(false);
  });

  it("provider cleanup 失败且连接仍活跃时，不清理本地 map 且不计入统计", async () => {
    const connectionKey = "infoway:stream_quote";
    const connection = createConnection("conn-2");
    (service as any).activeConnections.set(connectionKey, connection);
    (service as any).connectionHealth.set(connection.id, {
      isHealthy: false,
      lastActivity: Date.now(),
      connectionQuality: "poor",
    });

    streamDataFetcher.closeConnection.mockRejectedValue(
      new Error("provider cleanup failed"),
    );
    streamDataFetcher.isConnectionActive.mockReturnValue(true);

    const result = await service.forceConnectionCleanup();

    expect(streamDataFetcher.closeConnection).toHaveBeenCalledTimes(1);
    expect(result.totalCleaned).toBe(0);
    expect(result.unhealthyConnectionsCleaned).toBe(0);
    expect(result.remainingConnections).toBe(1);
    expect((service as any).activeConnections.has(connectionKey)).toBe(true);
    expect((service as any).connectionHealth.has(connection.id)).toBe(true);
  });
});
