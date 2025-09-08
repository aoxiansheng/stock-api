import { Test, TestingModule } from "@nestjs/testing";
import { StreamReceiverGateway } from "@core/01-entry/stream-receiver/gateway/stream-receiver.gateway";
import { StreamReceiverService } from "@core/01-entry/stream-receiver/services/stream-receiver.service";
import { ApiKeyService } from "../../../../../../../src/auth/services/apikey.service";
import { Logger } from "@nestjs/common";
import { Socket, Server } from "socket.io";
import { Permission } from "../../../../../../../src/auth/enums/user-role.enum";
import { REFERENCE_DATA } from '@common/constants/domain';

// Mock Socket.IO types - simplified to avoid strict type checking
interface MockSocket {
  id: string;
  emit: jest.Mock;
  join: jest.Mock;
  leave: jest.Mock;
  disconnect: jest.Mock;
  handshake: {
    query: Record<string, string>;
    headers: Record<string, string>;
    auth: Record<string, any>;
    address?: string;
    time?: string;
    xdomain?: boolean;
    secure?: boolean;
    issued?: number;
    url?: string;
  };
  data: Record<string, any>;
}

interface MockServer {
  emit: jest.Mock;
  to: jest.Mock;
  sockets: {
    emit: jest.Mock;
  };
}

describe("StreamReceiverGateway", () => {
  let gateway: StreamReceiverGateway;
  let streamReceiverService: jest.Mocked<StreamReceiverService>;
  let apiKeyService: jest.Mocked<ApiKeyService>;
  let mockSocket: MockSocket;
  let mockServer: MockServer;

  // Test constants
  const mockClientId = "test-client-123";
  const mockSymbols = [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, "AAPL.US", "000001.SZ"];
  const mockApiKey = "test-api-key";
  const mockAccessToken = "test-access-token";

  beforeEach(async () => {
    // Create comprehensive mocks
    const mockStreamReceiverService = {
      subscribeStream: jest.fn(),
      unsubscribeStream: jest.fn(),
      getClientStats: jest.fn(),
      healthCheck: jest.fn(),
    };

    const mockApiKeyService = {
      validateApiKey: jest.fn(),
    };

    // Create mock socket
    mockSocket = {
      id: mockClientId,
      emit: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
      disconnect: jest.fn(),
      handshake: {
        query: {
          "x-app-key": mockApiKey,
          "x-access-token": mockAccessToken,
        },
        headers: {
          "x-app-key": mockApiKey,
          "x-access-token": mockAccessToken,
        },
        auth: {},
      },
      data: {},
    } as MockSocket;

    // Create mock server
    mockServer = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      sockets: {
        emit: jest.fn(),
      },
    } as MockServer;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamReceiverGateway,
        {
          provide: StreamReceiverService,
          useValue: mockStreamReceiverService,
        },
        {
          provide: ApiKeyService,
          useValue: mockApiKeyService,
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<StreamReceiverGateway>(StreamReceiverGateway);
    streamReceiverService = module.get(StreamReceiverService);
    apiKeyService = module.get(ApiKeyService);

    // Set up the mock server in gateway
    (gateway as any).server = mockServer;

    // Setup default mock behaviors - Complete ApiKey mock
    const { ObjectId } = require("mongoose").Types;
    apiKeyService.validateApiKey.mockResolvedValue({
      _id: new ObjectId(),
      appKey: mockApiKey,
      accessToken: mockAccessToken,
      name: "test-key",
      permissions: [Permission.DATA_READ, Permission.STREAM_SUBSCRIBE],
      rateLimit: { requests: 1000, window: "1h" },
      isActive: true,
      usageCount: 0,
      userId: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUsedAt: new Date(),
    } as any);
    streamReceiverService.subscribeStream.mockResolvedValue(undefined);
    streamReceiverService.unsubscribeStream.mockResolvedValue(undefined);
    streamReceiverService.getClientStats.mockReturnValue({
      clients: {
        totalClients: 1,
        activeClients: 1,
        totalSubscriptions: 5,
        providerBreakdown: { longport: 1 },
        capabilityBreakdown: { quote: 1 },
      },
      cache: {
        hotCacheHits: 10,
        hotCacheMisses: 2,
        warmCacheHits: 5,
        warmCacheMisses: 1,
        totalSize: 1024,
        compressionRatio: 0.8,
      },
      connections: {
        total: 1,
        active: 1,
        connections: [
          {
            key: "longport:ws-stock-quote",
            id: "conn123",
            capability: "ws-stock-quote",
            isConnected: true,
            lastActiveAt: new Date(),
          },
        ],
      },
      batchProcessing: {
        totalBatches: 5,
        totalQuotes: 100,
        batchProcessingTime: 50,
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Gateway Initialization", () => {
    it("should be defined", () => {
      expect(gateway).toBeDefined();
    });

    it("should initialize server after init", () => {
      gateway.afterInit(mockServer as unknown as Server);
      expect((gateway as any).server).toBe(mockServer);
    });
  });

  describe("Connection Management", () => {
    it("should handle successful connection with valid credentials", async () => {
      await gateway.handleConnection(mockSocket as unknown as Socket);

      expect(apiKeyService.validateApiKey).toHaveBeenCalledWith(
        mockApiKey,
        mockAccessToken,
      );
      expect(mockSocket.data.authenticated).toBe(true);
      expect(mockSocket.data.clientId).toBe(mockClientId);
      expect(mockSocket.emit).toHaveBeenCalledWith("connection_established", {
        clientId: mockClientId,
        timestamp: expect.any(Number),
      });
    });

    it("should reject connection with invalid API key", async () => {
      apiKeyService.validateApiKey.mockResolvedValue(null);

      await gateway.handleConnection(mockSocket as unknown as Socket);

      expect(mockSocket.emit).toHaveBeenCalledWith("connection_error", {
        error: "Authentication failed",
        code: "AUTH_FAILED",
      });
      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
    });

    it("should reject connection without required permissions", async () => {
      // Mock ApiKey without stream permissions
      apiKeyService.validateApiKey.mockResolvedValue({
        _id: new (require("mongoose").Types.ObjectId)(),
        appKey: mockApiKey,
        accessToken: mockAccessToken,
        name: "test-key",
        permissions: [Permission.DATA_READ], // Missing stream permissions
        rateLimit: { requests: 1000, window: "1h" },
        isActive: true,
        usageCount: 0,
        userId: new (require("mongoose").Types.ObjectId)(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: new Date(),
      } as any);

      await gateway.handleConnection(mockSocket as unknown as Socket);

      expect(mockSocket.emit).toHaveBeenCalledWith("connection_error", {
        error: "Authentication failed",
        code: "AUTH_FAILED",
      });
      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
    });

    it("should handle disconnection properly", async () => {
      // First establish connection
      mockSocket.data.authenticated = true;
      mockSocket.data.clientId = mockClientId;

      await gateway.handleDisconnect(mockSocket as unknown as Socket);

      expect(streamReceiverService.unsubscribeStream).toHaveBeenCalledWith({
        clientId: mockClientId,
        symbols: undefined, // All symbols
      });
    });

    it("should handle disconnection of unauthenticated client", async () => {
      mockSocket.data.authenticated = false;

      await gateway.handleDisconnect(mockSocket as unknown as Socket);

      expect(streamReceiverService.unsubscribeStream).not.toHaveBeenCalled();
    });
  });

  describe("Authentication and Authorization", () => {
    it("should extract auth from query parameters", () => {
      const auth = (gateway as any).extractAuthFromConnection(mockSocket);

      expect(auth).toEqual({
        appKey: mockApiKey,
        accessToken: mockAccessToken,
      });
    });

    it("should extract auth from headers when query is empty", () => {
      mockSocket.handshake.query = {};
      const auth = (gateway as any).extractAuthFromConnection(mockSocket);

      expect(auth).toEqual({
        appKey: mockApiKey,
        accessToken: mockAccessToken,
      });
    });

    it("should return null when no auth credentials found", () => {
      mockSocket.handshake.query = {};
      mockSocket.handshake.headers = {};

      const auth = (gateway as any).extractAuthFromConnection(mockSocket);
      expect(auth).toBeNull();
    });

    it("should authenticate connection successfully", async () => {
      const result = await (gateway as any).authenticateConnection(mockSocket);

      expect(result).toBe(true);
      expect(mockSocket.data.authenticated).toBe(true);
      expect(mockSocket.data.apiKey).toBeDefined();
    });

    it("should fail authentication with invalid credentials", async () => {
      apiKeyService.validateApiKey.mockResolvedValue(null);

      const result = await (gateway as any).authenticateConnection(mockSocket);

      expect(result).toBe(false);
      expect(mockSocket.data.authenticated).toBe(false);
    });

    it("should check stream permissions correctly", () => {
      const mockApiKeyPermissions = [
        Permission.DATA_READ,
        Permission.STREAM_SUBSCRIBE,
      ];

      const hasPermission = (gateway as any).checkStreamPermissions(
        mockApiKeyPermissions,
      );
      expect(hasPermission).toBe(true);
    });

    it("should reject insufficient permissions", () => {
      const mockApiKeyPermissions = [Permission.DATA_READ]; // Missing STREAM_SUBSCRIBE

      const hasPermission = (gateway as any).checkStreamPermissions(
        mockApiKeyPermissions,
      );
      expect(hasPermission).toBe(false);
    });
  });

  describe("Stream Subscription Handling", () => {
    beforeEach(() => {
      mockSocket.data.authenticated = true;
      mockSocket.data.clientId = mockClientId;
    });

    it("should handle successful subscription", async () => {
      const subscriptionData = {
        symbols: mockSymbols,
        wsCapabilityType: "quote",
        preferredProvider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      };

      await gateway.handleSubscribe(
        mockSocket as unknown as Socket,
        subscriptionData,
      );

      expect(streamReceiverService.subscribeStream).toHaveBeenCalledWith(
        subscriptionData,
        expect.any(Function),
        mockClientId,
      );

      expect(mockSocket.emit).toHaveBeenCalledWith("subscription_success", {
        symbols: mockSymbols,
        subscriptionType: "quote",
        timestamp: expect.any(Number),
      });
    });

    it("should reject subscription from unauthenticated client", async () => {
      mockSocket.data.authenticated = false;

      const subscriptionData = {
        symbols: mockSymbols,
        wsCapabilityType: "quote",
      };

      await gateway.handleSubscribe(
        mockSocket as unknown as Socket,
        subscriptionData,
      );

      expect(streamReceiverService.subscribeStream).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith("subscription_error", {
        error: "Client not authenticated",
        code: "AUTH_REQUIRED",
      });
    });

    it("should handle subscription with validation errors", async () => {
      const subscriptionData = {
        symbols: [], // Empty symbols array
        wsCapabilityType: "quote",
      };

      streamReceiverService.subscribeStream.mockRejectedValue(
        new Error("符号列表不能为空"),
      );

      await gateway.handleSubscribe(
        mockSocket as unknown as Socket,
        subscriptionData,
      );

      expect(mockSocket.emit).toHaveBeenCalledWith("subscription_error", {
        error: "符号列表不能为空",
        code: "VALIDATION_ERROR",
      });
    });

    it("should handle successful unsubscription", async () => {
      const unsubscriptionData = {
        symbols: mockSymbols,
        wsCapabilityType: "quote",
      };

      await gateway.handleUnsubscribe(
        mockSocket as unknown as Socket,
        unsubscriptionData,
      );

      expect(streamReceiverService.unsubscribeStream).toHaveBeenCalledWith({
        symbols: mockSymbols,
        clientId: mockClientId,
      });

      expect(mockSocket.emit).toHaveBeenCalledWith("unsubscription_success", {
        symbols: mockSymbols,
        timestamp: expect.any(Number),
      });
    });

    it("should get subscription status successfully", async () => {
      await gateway.handleGetSubscription(mockSocket as unknown as Socket);

      expect(streamReceiverService.getClientStats).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith("subscription_status", {
        clientStats: expect.any(Object),
        timestamp: expect.any(Number),
      });
    });
  });

  describe("Information and Status Endpoints", () => {
    beforeEach(() => {
      mockSocket.data.authenticated = true;
      mockSocket.data.clientId = mockClientId;
    });

    it("should handle ping request", async () => {
      await gateway.handlePing(mockSocket as unknown as Socket);

      expect(mockSocket.emit).toHaveBeenCalledWith("pong", {
        timestamp: expect.any(Number),
        clientId: mockClientId,
      });
    });

    it("should handle get info request", async () => {
      streamReceiverService.healthCheck.mockResolvedValue({
        status: "healthy",
        connections: 5,
        clients: 3,
        cacheHitRate: 0.85,
      });

      await gateway.handleGetInfo(mockSocket as unknown as Socket);

      expect(streamReceiverService.healthCheck).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith("info", {
        status: "healthy",
        connections: 5,
        clients: 3,
        cacheHitRate: 0.85,
        timestamp: expect.any(Number),
      });
    });

    it("should handle get info request when service is degraded", async () => {
      streamReceiverService.healthCheck.mockResolvedValue({
        status: "degraded",
        connections: 2,
        clients: 1,
        cacheHitRate: 0.3,
      });

      await gateway.handleGetInfo(mockSocket as unknown as Socket);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        "info",
        expect.objectContaining({
          status: "degraded",
        }),
      );
    });
  });

  describe("Error Handling and Edge Cases", () => {
    beforeEach(() => {
      mockSocket.data.authenticated = true;
      mockSocket.data.clientId = mockClientId;
    });

    it("should handle service unavailable errors gracefully", async () => {
      streamReceiverService.subscribeStream.mockRejectedValue(
        new Error("Service temporarily unavailable"),
      );

      const subscriptionData = {
        symbols: mockSymbols,
        wsCapabilityType: "quote",
      };

      await gateway.handleSubscribe(
        mockSocket as unknown as Socket,
        subscriptionData,
      );

      expect(mockSocket.emit).toHaveBeenCalledWith("subscription_error", {
        error: "Service temporarily unavailable",
        code: "SERVICE_UNAVAILABLE",
      });
    });

    it("should handle malformed subscription data", async () => {
      const malformedData = {
        symbols: "not-an-array",
        wsCapabilityType: null,
      };

      await gateway.handleSubscribe(
        mockSocket as unknown as Socket,
        malformedData as any,
      );

      expect(mockSocket.emit).toHaveBeenCalledWith("subscription_error", {
        error: expect.stringContaining("Invalid subscription data"),
        code: "VALIDATION_ERROR",
      });
    });

    it("should handle authentication timeout", async () => {
      jest.setTimeout(10000);

      // Simulate slow authentication
      apiKeyService.validateApiKey.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(null), 5000)),
      );

      const startTime = Date.now();
      await gateway.handleConnection(mockSocket as unknown as Socket);
      const endTime = Date.now();

      // Should not take more than reasonable time
      expect(endTime - startTime).toBeLessThan(2000);
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it("should handle large symbol lists", async () => {
      const largeSymbolList = Array.from(
        { length: 1000 },
        (_, i) => `TEST${i}.HK`,
      );

      const subscriptionData = {
        symbols: largeSymbolList,
        wsCapabilityType: "quote",
      };

      await gateway.handleSubscribe(
        mockSocket as unknown as Socket,
        subscriptionData,
      );

      expect(streamReceiverService.subscribeStream).toHaveBeenCalledWith(
        subscriptionData,
        expect.any(Function),
        mockClientId,
      );
    });

    it("should handle socket disconnection during operation", async () => {
      // Simulate socket disconnection during subscription
      mockSocket.disconnect.mockImplementation(() => {
        mockSocket.data.authenticated = false;
      });

      const subscriptionData = {
        symbols: mockSymbols,
        wsCapabilityType: "quote",
      };

      // Should not throw error even if socket is disconnected
      await expect(
        gateway.handleSubscribe(
          mockSocket as unknown as Socket,
          subscriptionData,
        ),
      ).resolves.not.toThrow();
    });
  });

  describe("WebSocket Event Handling", () => {
    it("should handle connection without credentials gracefully", async () => {
      mockSocket.handshake.query = {};
      mockSocket.handshake.headers = {};

      await gateway.handleConnection(mockSocket as unknown as Socket);

      expect(mockSocket.emit).toHaveBeenCalledWith("connection_error", {
        error: "Authentication failed",
        code: "AUTH_FAILED",
      });
    });

    it("should handle concurrent subscription requests", async () => {
      const subscriptionData = {
        symbols: mockSymbols,
        wsCapabilityType: "quote",
      };

      // Simulate concurrent requests
      const promises = [
        gateway.handleSubscribe(
          mockSocket as unknown as Socket,
          subscriptionData,
        ),
        gateway.handleSubscribe(
          mockSocket as unknown as Socket,
          subscriptionData,
        ),
        gateway.handleSubscribe(
          mockSocket as unknown as Socket,
          subscriptionData,
        ),
      ];

      await Promise.all(promises);

      // Should handle gracefully without duplicate subscriptions
      expect(streamReceiverService.subscribeStream).toHaveBeenCalledTimes(3);
    });

    it("should handle unsubscription from unauthenticated client", async () => {
      mockSocket.data.authenticated = false;

      const unsubscriptionData = {
        symbols: mockSymbols,
        wsCapabilityType: "quote",
      };

      await gateway.handleUnsubscribe(
        mockSocket as unknown as Socket,
        unsubscriptionData,
      );

      expect(streamReceiverService.unsubscribeStream).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith("unsubscription_error", {
        error: "Client not authenticated",
        code: "AUTH_REQUIRED",
      });
    });
  });
});
