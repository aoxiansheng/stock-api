jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { StreamReconnectCoordinatorService } from "@core/01-entry/stream-receiver/services/stream-reconnect-coordinator.service";
import { StreamClientStateManager } from "@core/03-fetching/stream-data-fetcher/services/stream-client-state-manager.service";
import { StreamDataFetcherService } from "@core/03-fetching/stream-data-fetcher/services/stream-data-fetcher.service";
import { StreamConnectionManagerService } from "@core/01-entry/stream-receiver/services/stream-connection-manager.service";
import { StreamSubscriptionContextService } from "@core/01-entry/stream-receiver/services/stream-subscription-context.service";
import { StreamProviderResolutionService } from "@core/01-entry/stream-receiver/services/stream-provider-resolution.service";
import { StreamIngressBindingService } from "@core/01-entry/stream-receiver/services/stream-ingress-binding.service";
import { MarketInferenceService } from "@common/modules/market-inference/services/market-inference.service";
import { StreamRecoveryWorkerService } from "@core/03-fetching/stream-data-fetcher/services/stream-recovery-worker.service";
import { ClientReconnectRequest } from "@core/03-fetching/stream-data-fetcher/interfaces";

function createMocks() {
  const clientStateManager = {
    getClientSubscription: jest.fn(),
    getClientStateStats: jest.fn(() => ({
      totalClients: 0,
      providerBreakdown: {},
    })),
    addClientSubscription: jest.fn(),
    getClientsWithHeartbeatTimeout: jest.fn(() => []),
    getClientsByProvider: jest.fn(() => []),
  };

  const streamDataFetcher = {
    getConnectionStatsByProvider: jest.fn(() => ({
      total: 1,
      active: 1,
      connections: [{ id: "conn-1" }],
    } as any)),
    subscribeToSymbols: jest.fn().mockResolvedValue(undefined),
  };

  const connectionManager = {
    isConnectionActive: jest.fn(() => true),
    getOrCreateConnection: jest.fn().mockResolvedValue({ id: "conn-reconnect" }),
  };

  const subscriptionContext = {
    resolveSymbolMappings: jest.fn(async (symbols: string[]) => ({
      standardSymbols: symbols,
      providerSymbols: symbols,
    })),
    assertSubscriptionContextCompatibility: jest.fn(),
  };

  const providerResolution = {
    resolveProviderForStreamRequest: jest.fn(() => "longport"),
  };

  const ingressBinding = {
    setupDataReceiving: jest.fn(),
  };

  const marketInferenceService = {
    inferMarkets: jest.fn(() => ["US"]),
    inferDominantMarket: jest.fn(() => "US"),
  };

  const recoveryWorker = {
    submitRecoveryJob: jest.fn(async () => "job-123"),
  };

  return {
    clientStateManager,
    streamDataFetcher,
    connectionManager,
    subscriptionContext,
    providerResolution,
    ingressBinding,
    marketInferenceService,
    recoveryWorker,
  };
}

function createService(
  mocks: ReturnType<typeof createMocks>,
  options?: { withRecoveryWorker?: boolean },
) {
  const withRecovery = options?.withRecoveryWorker ?? true;
  return new StreamReconnectCoordinatorService(
    mocks.clientStateManager as unknown as StreamClientStateManager,
    mocks.streamDataFetcher as unknown as StreamDataFetcherService,
    mocks.connectionManager as unknown as StreamConnectionManagerService,
    mocks.subscriptionContext as unknown as StreamSubscriptionContextService,
    mocks.providerResolution as unknown as StreamProviderResolutionService,
    mocks.ingressBinding as unknown as StreamIngressBindingService,
    mocks.marketInferenceService as unknown as MarketInferenceService,
    withRecovery ? (mocks.recoveryWorker as unknown as StreamRecoveryWorkerService) : undefined,
  );
}

describe("StreamReconnectCoordinatorService", () => {
  let mocks: ReturnType<typeof createMocks>;

  beforeEach(() => {
    mocks = createMocks();
  });

  // ── detectReconnection ──────────────────────────────────────────────

  describe("detectReconnection", () => {
    it("should iterate providerBreakdown and call checkProviderConnections for each provider", () => {
      mocks.clientStateManager.getClientStateStats.mockReturnValue({
        totalClients: 2,
        providerBreakdown: {
          longport: { count: 1 },
          polygon: { count: 1 },
        },
      });

      const service = createService(mocks);
      service.detectReconnection();

      expect(mocks.streamDataFetcher.getConnectionStatsByProvider).toHaveBeenCalledWith("longport");
      expect(mocks.streamDataFetcher.getConnectionStatsByProvider).toHaveBeenCalledWith("polygon");
      expect(mocks.streamDataFetcher.getConnectionStatsByProvider).toHaveBeenCalledTimes(2);
    });

    it("should not throw when providerBreakdown is undefined", () => {
      mocks.clientStateManager.getClientStateStats.mockReturnValue({
        totalClients: 0,
        providerBreakdown: undefined,
      });

      const service = createService(mocks);
      expect(() => service.detectReconnection()).not.toThrow();
    });

    it("should trigger handleReconnection when provider connections dropped", async () => {
      mocks.clientStateManager.getClientStateStats.mockReturnValue({
        totalClients: 1,
        providerBreakdown: { longport: { count: 1 } },
      });
      mocks.streamDataFetcher.getConnectionStatsByProvider.mockReturnValue({
        total: 0,
        active: 0,
        connections: [],
      });
      mocks.clientStateManager.getClientsByProvider.mockReturnValue(["client-prod-drop"]);
      
      const service = createService(mocks);
      service.handleReconnection = jest.fn().mockResolvedValue(undefined);
      
      service.detectReconnection();
      
      expect(service.handleReconnection).toHaveBeenCalledWith("client-prod-drop", "provider_disconnected");
    });
    
    it("should trigger handleReconnection when heartbeat times out", async () => {
      mocks.clientStateManager.getClientStateStats.mockReturnValue({
        totalClients: 1,
        providerBreakdown: {},
      });
      mocks.clientStateManager.getClientsWithHeartbeatTimeout.mockReturnValue(["client-timeout"]);
      
      const service = createService(mocks);
      service.handleReconnection = jest.fn().mockResolvedValue(undefined);
      
      service.detectReconnection();
      
      expect(service.handleReconnection).toHaveBeenCalledWith("client-timeout", "heartbeat_timeout");
    });

    it("should dedupe heartbeat timeout clients before dispatching reconnection", () => {
      mocks.clientStateManager.getClientStateStats.mockReturnValue({
        totalClients: 2,
        providerBreakdown: {},
      });
      mocks.clientStateManager.getClientsWithHeartbeatTimeout.mockReturnValue([
        "client-timeout",
        "client-timeout",
      ]);

      const service = createService(mocks);
      service.handleReconnection = jest.fn().mockResolvedValue(undefined);

      service.detectReconnection();

      expect(service.handleReconnection).toHaveBeenCalledTimes(1);
      expect(service.handleReconnection).toHaveBeenCalledWith(
        "client-timeout",
        "heartbeat_timeout",
      );
    });

    it("should dedupe provider reconnect clients before dispatching reconnection", () => {
      mocks.clientStateManager.getClientStateStats.mockReturnValue({
        totalClients: 2,
        providerBreakdown: { longport: { count: 2 } },
      });
      mocks.streamDataFetcher.getConnectionStatsByProvider.mockReturnValue({
        total: 0,
        active: 0,
        connections: [],
      });
      mocks.clientStateManager.getClientsByProvider.mockReturnValue([
        "client-prod-drop",
        "client-prod-drop",
      ]);

      const service = createService(mocks);
      service.handleReconnection = jest.fn().mockResolvedValue(undefined);

      service.detectReconnection();

      expect(service.handleReconnection).toHaveBeenCalledTimes(1);
      expect(service.handleReconnection).toHaveBeenCalledWith(
        "client-prod-drop",
        "provider_disconnected",
      );
    });
  });

  // ── handleReconnection ──────────────────────────────────────────────

  describe("handleReconnection", () => {
    const clientInfo = {
      clientId: "client-1",
      symbols: new Set(["AAPL.US"]),
      providerName: "longport",
      wsCapabilityType: "quote",
      lastActiveTime: Date.now() - 10000,
    };

    it("should skip when client does not exist", async () => {
      mocks.clientStateManager.getClientSubscription.mockReturnValue(undefined);

      const service = createService(mocks);
      await service.handleReconnection("client-1");

      expect(mocks.connectionManager.isConnectionActive).not.toHaveBeenCalled();
      expect(mocks.recoveryWorker.submitRecoveryJob).not.toHaveBeenCalled();
    });

    it("should not dispatch recovery when connection is active", async () => {
      mocks.clientStateManager.getClientSubscription.mockReturnValue(clientInfo);
      mocks.connectionManager.isConnectionActive.mockReturnValue(true);

      const service = createService(mocks);
      await service.handleReconnection("client-1");

      expect(mocks.connectionManager.isConnectionActive).toHaveBeenCalledWith("longport:quote");
      expect(mocks.recoveryWorker.submitRecoveryJob).not.toHaveBeenCalled();
    });

    it("should dispatch recovery when connection is inactive and recoveryWorker exists", async () => {
      mocks.clientStateManager.getClientSubscription.mockReturnValue(clientInfo);
      mocks.connectionManager.isConnectionActive.mockReturnValue(false);

      const service = createService(mocks);
      await service.handleReconnection("client-1", "network_error");

      expect(mocks.recoveryWorker.submitRecoveryJob).toHaveBeenCalledTimes(1);
      const submittedJob = (mocks.recoveryWorker.submitRecoveryJob.mock.calls[0] as any[])[0];
      expect(submittedJob).toMatchObject({
        clientId: "client-1",
        symbols: ["AAPL.US"],
        provider: "longport",
        capability: "quote",
        priority: "high",
      });
    });

    it("should log error but not throw when connection is inactive and recoveryWorker is absent", async () => {
      mocks.clientStateManager.getClientSubscription.mockReturnValue(clientInfo);
      mocks.connectionManager.isConnectionActive.mockReturnValue(false);

      const service = createService(mocks, { withRecoveryWorker: false });

      await expect(
        service.handleReconnection("client-1"),
      ).resolves.toBeUndefined();

      expect(mocks.recoveryWorker.submitRecoveryJob).not.toHaveBeenCalled();
    });
  });

  // ── scheduleRecoveryForClient (indirect) ────────────────────────────

  describe("scheduleRecoveryForClient (via handleReconnection)", () => {
    const clientInfo = {
      clientId: "client-2",
      symbols: ["BTC.USD"],
      providerName: "polygon",
      wsCapabilityType: "trade",
      lastActiveTime: Date.now() - 5000,
    };

    beforeEach(() => {
      mocks.clientStateManager.getClientSubscription.mockReturnValue(clientInfo);
      mocks.connectionManager.isConnectionActive.mockReturnValue(false);
    });

    it("should complete normally when submitRecoveryJob succeeds", async () => {
      mocks.recoveryWorker.submitRecoveryJob.mockResolvedValue("job-456");

      const service = createService(mocks);
      await expect(
        service.handleReconnection("client-2", "manual_check"),
      ).resolves.toBeUndefined();

      const submittedJob = (mocks.recoveryWorker.submitRecoveryJob.mock.calls[0] as any[])[0];
      expect(submittedJob?.priority).toBe("normal");
    });

    it("should fall back to notifyClientResubscribe when submitRecoveryJob fails, without throwing", async () => {
      mocks.recoveryWorker.submitRecoveryJob.mockRejectedValue(
        new Error("worker queue full"),
      );
      // notifyClientResubscribe calls getClientSubscription again
      mocks.clientStateManager.getClientSubscription.mockReturnValue(clientInfo);

      const service = createService(mocks);
      await expect(
        service.handleReconnection("client-2", "network_error"),
      ).resolves.toBeUndefined();

      // getClientSubscription called once in handleReconnection, once in notifyClientResubscribe
      expect(mocks.clientStateManager.getClientSubscription).toHaveBeenCalledTimes(2);
    });
  });

  // ── executeClientReconnect ──────────────────────────────────────────

  describe("executeClientReconnect", () => {
    it("should return success response with confirmed symbols", async () => {
      const service = createService(mocks);

      const result = await service.executeClientReconnect({
        clientId: "client-reconnect",
        lastReceiveTimestamp: Date.now() - 1000,
        symbols: ["AAPL.US"],
        wsCapabilityType: "stream-stock-quote",
        preferredProvider: "longport",
        reason: "network_error",
      } as unknown as ClientReconnectRequest);

      expect(result.success).toBe(true);
      expect(result.confirmedSymbols).toEqual(["AAPL.US"]);
      expect(mocks.providerResolution.resolveProviderForStreamRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          symbols: ["AAPL.US"],
          capability: "stream-stock-quote",
          operation: "handleClientReconnect",
        }),
      );
      expect(mocks.subscriptionContext.resolveSymbolMappings).toHaveBeenCalledWith(
        ["AAPL.US"],
        "longport",
        expect.any(String),
      );
      expect(mocks.connectionManager.getOrCreateConnection).toHaveBeenCalled();
      expect(mocks.streamDataFetcher.subscribeToSymbols).toHaveBeenCalled();
      expect(mocks.ingressBinding.setupDataReceiving).toHaveBeenCalledWith(
        expect.objectContaining({ id: "conn-reconnect" }),
        "longport",
        "stream-stock-quote"
      );
      expect(mocks.subscriptionContext.assertSubscriptionContextCompatibility).toHaveBeenCalledWith(
        "client-reconnect",
        "longport",
        "stream-stock-quote"
      );
      expect(mocks.streamDataFetcher.subscribeToSymbols).toHaveBeenCalled();
      expect(mocks.clientStateManager.addClientSubscription).toHaveBeenCalledWith(
        "client-reconnect",
        ["AAPL.US"],
        "stream-stock-quote",
        "longport",
      );
    });

    it("should return failure response when lastReceiveTimestamp is invalid (future)", async () => {
      const service = createService(mocks);

      const result = await service.executeClientReconnect({
        clientId: "client-bad-ts",
        lastReceiveTimestamp: Date.now() + 10000,
        symbols: ["AAPL.US"],
        wsCapabilityType: "quote",
        preferredProvider: "longport",
        reason: "test",
      } as unknown as ClientReconnectRequest);

      expect(result.success).toBe(false);
      expect(result.instructions?.action).toBe("resubscribe");
      expect(result.connectionInfo?.provider).toBe("longport");
      expect(mocks.connectionManager.getOrCreateConnection).not.toHaveBeenCalled();
    });

    it("should return failure response when provider resolution throws", async () => {
      mocks.providerResolution.resolveProviderForStreamRequest.mockImplementation(() => {
        throw new Error("No provider found");
      });

      const service = createService(mocks);
      const result = await service.executeClientReconnect({
        clientId: "client-no-provider",
        lastReceiveTimestamp: Date.now() - 1000,
        symbols: ["AAPL.US"],
        wsCapabilityType: "quote",
        preferredProvider: "longport",
        reason: "test",
      } as unknown as ClientReconnectRequest);

      expect(result.success).toBe(false);
      expect(result.instructions?.message).toContain("No provider found");
      expect(result.connectionInfo?.provider).toBe("longport");
    });

    it("should submit recovery job when within recovery window", async () => {
      const service = createService(mocks);

      const result = await service.executeClientReconnect({
        clientId: "client-recovery",
        lastReceiveTimestamp: Date.now() - 1000,
        symbols: ["AAPL.US"],
        wsCapabilityType: "quote",
        reason: "network_error",
      } as unknown as ClientReconnectRequest);

      expect(result.success).toBe(true);
      expect(result.recoveryStrategy?.willRecover).toBe(true);
      expect(mocks.recoveryWorker.submitRecoveryJob).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: "client-recovery",
          symbols: ["AAPL.US"],
          priority: "high",
        }),
      );
    });

    it("should not submit recovery job when recoveryWorker is absent", async () => {
      const service = createService(mocks, { withRecoveryWorker: false });

      const result = await service.executeClientReconnect({
        clientId: "client-no-worker",
        lastReceiveTimestamp: Date.now() - 1000,
        symbols: ["AAPL.US"],
        wsCapabilityType: "quote",
        reason: "test",
      } as unknown as ClientReconnectRequest);

      expect(result.success).toBe(true);
      // willRecover is based on time window, but no job submitted without worker
      expect(result.recoveryStrategy?.recoveryJobId).toBeUndefined();
      expect(mocks.recoveryWorker.submitRecoveryJob).not.toHaveBeenCalled();
    });

    it("should filter rejected symbols when mapping returns empty", async () => {
      mocks.subscriptionContext.resolveSymbolMappings.mockResolvedValue({
        standardSymbols: ["AAPL.US", ""],
        providerSymbols: ["AAPL.US", ""],
      });

      const service = createService(mocks);
      const result = await service.executeClientReconnect({
        clientId: "client-partial",
        lastReceiveTimestamp: Date.now() - 1000,
        symbols: ["AAPL.US", "INVALID"],
        wsCapabilityType: "quote",
        reason: "test",
      } as unknown as ClientReconnectRequest);

      expect(result.success).toBe(true);
      expect(result.confirmedSymbols).toEqual(["AAPL.US"]);
      expect(result.rejectedSymbols).toEqual([
        { symbol: "INVALID", reason: "符号映射失败" },
      ]);
    });
  });
});
