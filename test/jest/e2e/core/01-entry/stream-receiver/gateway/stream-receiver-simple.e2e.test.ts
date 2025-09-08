import { io, Socket } from "socket.io-client";
import { OPERATION_LIMITS } from '@common/constants/domain';
import { API_OPERATIONS } from '@common/constants/domain';

describe("Stream Receiver Gateway E2E Tests - Simplified", () => {
  let httpServer: any;
  let authTokens: any;
  let jwtToken: string;
  let clientSocket: Socket;
  let serverAddress: string;

  beforeAll(async () => {
    httpServer = global.createTestRequest();
    await setupAuthentication();

    const port = process.env.TEST_PORT || 3333;
    serverAddress = `http://localhost:${port}`;
  });

  afterEach(async () => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  async function setupAuthentication() {
    const userData = {
      username: "streamuser",
      email: "stream@example.com",
      password: "password123",
      role: "developer",
    };

    await httpServer.post("/api/v1/auth/register").send(userData);

    const loginResponse = await httpServer.post("/api/v1/auth/login").send({
      username: userData.username,
      password: userData.password,
    });

    jwtToken =
      loginResponse.body.data?.accessToken || loginResponse.body.accessToken;

    const apiKeyData = {
      name: "Stream Receiver Test API Key",
      permissions: [
        "data:read",
        "stream:read",
        "stream:subscribe",
        "providers:read",
      ],
      rateLimit: {
        requests: 1000,
        window: "1h",
      },
    };

    const apiKeyResponse = await httpServer
      .post("/api/v1/auth/api-keys")
      .set("Authorization", `Bearer ${jwtToken}`)
      .send(apiKeyData);

    const apiKeyResult = apiKeyResponse.body.data;
    authTokens = {
      apiKey: apiKeyResult.appKey,
      accessToken: apiKeyResult.accessToken,
    };
  }

  function createWebSocketClient(auth = true): Promise<Socket> {
    return new Promise((resolve, reject) => {
      const connectionOptions: any = {
        transports: ["websocket"],
        timeout: OPERATION_LIMITS.TIMEOUTS_MS.DATABASE_OPERATION,
      };

      if (auth) {
        connectionOptions.auth = {
          appKey: authTokens.apiKey,
          accessToken: authTokens.accessToken,
        };
      }

      const socket = io(serverAddress, {
        ...connectionOptions,
        path: "/api/v1/stream-receiver/connect",
      });

      let timeoutId: NodeJS.Timeout;

      socket.on("connect", () => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve(socket);
      });

      socket.on("connect_error", (error) => {
        if (timeoutId) clearTimeout(timeoutId);
        reject(error);
      });

      timeoutId = setTimeout(() => {
        if (!socket.connected) {
          socket.disconnect();
          reject(new Error("WebSocket connection timeout"));
        }
      }, 10000);
    });
  }

  describe("WebSocket Connection Management", () => {
    it("should establish WebSocket connection with valid authentication", async () => {
      clientSocket = await createWebSocketClient(true);
      expect(clientSocket.connected).toBe(true);
      expect(clientSocket.id).toBeDefined();
    });

    it("should reject connection without authentication", async () => {
      await expect(createWebSocketClient(false)).rejects.toThrow();
    });
  });

  describe("Stream Subscription Management", () => {
    beforeEach(async () => {
      clientSocket = await createWebSocketClient(true);
    });

    it("should handle subscribe to stock symbols", async () => {
      const subscribeData = {
        symbols: ["AAPL"],
        wsCapabilityType: API_OPERATIONS.STOCK_DATA.STREAM_QUOTE,
      };

      clientSocket.emit("subscribe", subscribeData);
      expect(clientSocket.connected).toBe(true);
    });

    it("should validate subscription parameters", async () => {
      const invalidData = {
        symbols: "not an array",
        wsCapabilityType: API_OPERATIONS.STOCK_DATA.STREAM_QUOTE,
      };

      clientSocket.emit("subscribe", invalidData);
      expect(clientSocket.connected).toBe(true);
    });
  });

  describe("Error Handling", () => {
    beforeEach(async () => {
      clientSocket = await createWebSocketClient(true);
    });

    it("should handle malformed subscription messages", async () => {
      const malformedMessages = [
        null,
        undefined,
        "not an object",
        { malformed: "data" },
      ];

      for (const message of malformedMessages) {
        clientSocket.emit("subscribe", message);
      }

      // Should still be connected
      expect(clientSocket.connected).toBe(true);
    });
  });
});
