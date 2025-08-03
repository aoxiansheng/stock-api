import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { createLogger } from '@common/config/logger.config';
import { WsAuthGuard } from '../../../../../../src/core/stream-receiver/guards/ws-auth.guard';
import { ApiKeyService } from '../../../../../../src/auth/services/apikey.service';
import { TokenService } from '../../../../../../src/auth/services/token.service';
import { Permission } from '../../../../../../src/auth/enums/user-role.enum';

// Mock logger
jest.mock('@common/config/logger.config');
const mockLogger = {
  debug: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
(createLogger as jest.Mock).mockReturnValue(mockLogger);

// Mock services
const mockApiKeyService = {
  validateApiKey: jest.fn(),
};

const mockTokenService = {
  verifyRefreshToken: jest.fn(),
};

// Mock Socket
const createMockSocket = (id: string = 'test-client-123') => ({
  id,
  data: {} as Record<string, any>,
  handshake: {
    headers: {} as Record<string, string>,
    query: {} as Record<string, string>,
  },
});

// Mock ExecutionContext
const createMockExecutionContext = (client: any, data: any = {}) => ({
  switchToWs: () => ({
    getClient: () => client,
    getData: () => data,
  }),
}) as ExecutionContext;

describe('WsAuthGuard', () => {
  let guard: WsAuthGuard;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WsAuthGuard,
        {
          provide: ApiKeyService,
          useValue: mockApiKeyService,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
      ],
    }).compile();

    guard = module.get<WsAuthGuard>(WsAuthGuard);
  });

  describe('JWT Token Authentication', () => {
    it('should authenticate successfully with valid JWT token in message data', async () => {
      // Setup
      const client = createMockSocket();
      const token = 'valid-jwt-token';
      const data = { token };
      const context = createMockExecutionContext(client, data);

      const decoded = {
        sub: 'user123',
        username: 'testuser',
        role: 'admin',
      };
      mockTokenService.verifyRefreshToken.mockResolvedValue(decoded);

      // Execute
      const result = await guard.canActivate(context);

      // Verify
      expect(result).toBe(true);
      expect(mockTokenService.verifyRefreshToken).toHaveBeenCalledWith(token);
      expect(client.data['user']).toEqual({
        userId: 'user123',
        username: 'testuser',
        role: 'admin',
        authType: 'jwt',
      });
      expect(mockLogger.log).toHaveBeenCalledWith({
        message: 'WebSocket JWT 认证成功',
        userId: 'user123',
        username: 'testuser',
        clientId: client.id,
      });
    });

    it('should authenticate successfully with JWT token in Authorization header', async () => {
      // Setup
      const client = createMockSocket();
      client.handshake.headers['authorization'] = 'Bearer valid-jwt-token';
      const context = createMockExecutionContext(client);

      const decoded = {
        sub: 'user123',
        username: 'testuser',
        role: 'developer',
      };
      mockTokenService.verifyRefreshToken.mockResolvedValue(decoded);

      // Execute
      const result = await guard.canActivate(context);

      // Verify
      expect(result).toBe(true);
      expect(mockTokenService.verifyRefreshToken).toHaveBeenCalledWith('valid-jwt-token');
      expect(client.data['user'].authType).toBe('jwt');
    });

    it('should authenticate successfully with JWT token in query parameters', async () => {
      // Setup
      const client = createMockSocket();
      client.handshake.query['token'] = 'query-jwt-token';
      const context = createMockExecutionContext(client);

      const decoded = {
        sub: 'user123',
        username: 'testuser',
        role: 'admin',
      };
      mockTokenService.verifyRefreshToken.mockResolvedValue(decoded);

      // Execute
      const result = await guard.canActivate(context);

      // Verify
      expect(result).toBe(true);
      expect(mockTokenService.verifyRefreshToken).toHaveBeenCalledWith('query-jwt-token');
    });

    it('should fail authentication with invalid JWT token', async () => {
      // Setup
      const client = createMockSocket();
      const token = 'invalid-jwt-token';
      const data = { token };
      const context = createMockExecutionContext(client, data);

      mockTokenService.verifyRefreshToken.mockRejectedValue(new Error('Invalid token'));

      // Execute
      const result = await guard.canActivate(context);

      // Verify
      expect(result).toBe(false);
      expect(client.data['user']).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith({
        message: 'WebSocket JWT 认证失败',
        error: 'Invalid token',
        clientId: client.id,
      });
    });

    it('should fail authentication with malformed JWT token response', async () => {
      // Setup
      const client = createMockSocket();
      const token = 'malformed-jwt-token';
      const data = { token };
      const context = createMockExecutionContext(client, data);

      // Missing sub field
      mockTokenService.verifyRefreshToken.mockResolvedValue({ username: 'test' });

      // Execute
      const result = await guard.canActivate(context);

      // Verify
      expect(result).toBe(false);
    });

    it('should fail authentication with null JWT token response', async () => {
      // Setup
      const client = createMockSocket();
      const token = 'null-jwt-token';
      const data = { token };
      const context = createMockExecutionContext(client, data);

      mockTokenService.verifyRefreshToken.mockResolvedValue(null);

      // Execute
      const result = await guard.canActivate(context);

      // Verify
      expect(result).toBe(false);
    });
  });

  describe('API Key Authentication', () => {
    it('should authenticate successfully with valid API key in message data', async () => {
      // Setup
      const client = createMockSocket();
      const apiKey = 'test-api-key';
      const accessToken = 'test-access-token';
      const data = { apiKey, accessToken };
      const context = createMockExecutionContext(client, data);

      const apiKeyDoc = {
        _id: 'key123',
        name: 'Test App',
        permissions: ['data:read', 'query:execute'],
      };
      mockApiKeyService.validateApiKey.mockResolvedValue(apiKeyDoc);

      // Execute
      const result = await guard.canActivate(context);

      // Verify
      expect(result).toBe(true);
      expect(mockApiKeyService.validateApiKey).toHaveBeenCalledWith(apiKey, accessToken);
      expect(client.data['apiKey']).toEqual({
        id: 'key123',
        name: 'Test App',
        permissions: ['data:read', 'query:execute'],
        authType: 'apikey',
      });
      expect(mockLogger.log).toHaveBeenCalledWith({
        message: 'WebSocket API Key 认证成功',
        apiKeyName: 'Test App',
        clientId: client.id,
      });
    });

    it('should authenticate successfully with API key in headers', async () => {
      // Setup
      const client = createMockSocket();
      client.handshake.headers['x-app-key'] = 'header-api-key';
      client.handshake.headers['x-access-token'] = 'header-access-token';
      const context = createMockExecutionContext(client);

      const apiKeyDoc = {
        _id: 'key123',
        name: 'Header App',
        permissions: ['data:read'],
      };
      mockApiKeyService.validateApiKey.mockResolvedValue(apiKeyDoc);

      // Execute
      const result = await guard.canActivate(context);

      // Verify
      expect(result).toBe(true);
      expect(mockApiKeyService.validateApiKey).toHaveBeenCalledWith('header-api-key', 'header-access-token');
    });

    it('should authenticate successfully with API key in query parameters', async () => {
      // Setup
      const client = createMockSocket();
      client.handshake.query['apiKey'] = 'query-api-key';
      client.handshake.query['accessToken'] = 'query-access-token';
      const context = createMockExecutionContext(client);

      const apiKeyDoc = {
        _id: 'key123',
        name: 'Query App',
        permissions: ['stream:read'],
      };
      mockApiKeyService.validateApiKey.mockResolvedValue(apiKeyDoc);

      // Execute
      const result = await guard.canActivate(context);

      // Verify
      expect(result).toBe(true);
      expect(mockApiKeyService.validateApiKey).toHaveBeenCalledWith('query-api-key', 'query-access-token');
    });

    it('should fail authentication with invalid API key', async () => {
      // Setup
      const client = createMockSocket();
      const apiKey = 'invalid-api-key';
      const accessToken = 'invalid-access-token';
      const data = { apiKey, accessToken };
      const context = createMockExecutionContext(client, data);

      mockApiKeyService.validateApiKey.mockResolvedValue(null);

      // Execute
      const result = await guard.canActivate(context);

      // Verify
      expect(result).toBe(false);
      expect(client.data['apiKey']).toBeUndefined();
    });

    it('should fail authentication when API key lacks stream permissions', async () => {
      // Setup
      const client = createMockSocket();
      const apiKey = 'no-stream-key';
      const accessToken = 'no-stream-token';
      const data = { apiKey, accessToken };
      const context = createMockExecutionContext(client, data);

      const apiKeyDoc = {
        _id: 'key123',
        name: 'Limited App',
        permissions: ['monitoring:read'], // No data:read or stream: permissions
      };
      mockApiKeyService.validateApiKey.mockResolvedValue(apiKeyDoc);

      // Execute
      const result = await guard.canActivate(context);

      // Verify
      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith({
        message: 'API Key 缺少 WebSocket 流权限',
        apiKey,
        clientId: client.id,
      });
    });

    it('should handle API key service errors', async () => {
      // Setup
      const client = createMockSocket();
      const apiKey = 'error-api-key';
      const accessToken = 'error-access-token';
      const data = { apiKey, accessToken };
      const context = createMockExecutionContext(client, data);

      mockApiKeyService.validateApiKey.mockRejectedValue(new Error('Service error'));

      // Execute
      const result = await guard.canActivate(context);

      // Verify
      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith({
        message: 'WebSocket API Key 认证失败',
        error: 'Service error',
        clientId: client.id,
      });
    });
  });

  describe('Authentication Priority and Fallback', () => {
    it('should prioritize message data over handshake data', async () => {
      // Setup - both message data and handshake have auth info
      const client = createMockSocket();
      client.handshake.headers['authorization'] = 'Bearer handshake-token';
      client.handshake.headers['x-app-key'] = 'handshake-api-key';
      
      const messageToken = 'message-token';
      const data = { token: messageToken };
      const context = createMockExecutionContext(client, data);

      const decoded = {
        sub: 'user123',
        username: 'testuser',
        role: 'admin',
      };
      mockTokenService.verifyRefreshToken.mockResolvedValue(decoded);

      // Execute
      const result = await guard.canActivate(context);

      // Verify - should use message token, not handshake token
      expect(result).toBe(true);
      expect(mockTokenService.verifyRefreshToken).toHaveBeenCalledWith(messageToken);
      expect(mockApiKeyService.validateApiKey).not.toHaveBeenCalled();
    });

    it('should prioritize JWT token over API key when both are present', async () => {
      // Setup
      const client = createMockSocket();
      const token = 'jwt-token';
      const apiKey = 'api-key';
      const accessToken = 'access-token';
      const data = { token, apiKey, accessToken };
      const context = createMockExecutionContext(client, data);

      const decoded = {
        sub: 'user123',
        username: 'testuser',
        role: 'admin',
      };
      mockTokenService.verifyRefreshToken.mockResolvedValue(decoded);

      // Execute
      const result = await guard.canActivate(context);

      // Verify - should use JWT, not API key
      expect(result).toBe(true);
      expect(mockTokenService.verifyRefreshToken).toHaveBeenCalledWith(token);
      expect(mockApiKeyService.validateApiKey).not.toHaveBeenCalled();
    });

    it('should fallback to handshake data when message data is empty', async () => {
      // Setup
      const client = createMockSocket();
      client.handshake.headers['authorization'] = 'Bearer handshake-token';
      const context = createMockExecutionContext(client, {});

      const decoded = {
        sub: 'user123',
        username: 'testuser',
        role: 'admin',
      };
      mockTokenService.verifyRefreshToken.mockResolvedValue(decoded);

      // Execute
      const result = await guard.canActivate(context);

      // Verify
      expect(result).toBe(true);
      expect(mockTokenService.verifyRefreshToken).toHaveBeenCalledWith('handshake-token');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing authentication data', async () => {
      // Setup
      const client = createMockSocket();
      const context = createMockExecutionContext(client, {});

      // Execute
      const result = await guard.canActivate(context);

      // Verify
      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('WebSocket 连接认证信息格式不正确');
    });

    it('should handle incomplete API key data', async () => {
      // Setup - only API key, no access token
      const client = createMockSocket();
      const data = { apiKey: 'incomplete-key' }; // Missing accessToken
      const context = createMockExecutionContext(client, data);

      // Execute
      const result = await guard.canActivate(context);

      // Verify
      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('WebSocket 连接认证信息格式不正确');
    });

    it('should handle unexpected errors during authentication', async () => {

      // Mock context to throw error
      const errorContext = {
        switchToWs: () => {
          throw new Error('Context error');
        },
        getClass: jest.fn(),
        getHandler: jest.fn(),
        getArgs: jest.fn(),
        getArgByIndex: jest.fn(),
        switchToRpc: jest.fn(),
        switchToHttp: jest.fn(),
        getType: jest.fn(),
      } as ExecutionContext;

      // Execute
      const result = await guard.canActivate(errorContext);

      // Verify
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'WebSocket 认证失败',
        error: 'Context error',
      });
    });

    it('should handle malformed handshake data', async () => {
      // Setup
      const client = createMockSocket();
      (client as any).handshake = null; // Malformed handshake
      const context = createMockExecutionContext(client, {});

      // Execute
      const result = await guard.canActivate(context);

      // Verify
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'WebSocket 认证失败',
        error: expect.any(String),
      });
    });
  });

  describe('Permission Validation', () => {
    const testPermissionCases = [
      { permissions: ['data:read'], expected: true, description: 'data:read permission' },
      { permissions: ['stream:read'], expected: true, description: 'stream:read permission' },
      { permissions: ['data:read', 'query:execute'], expected: true, description: 'multiple permissions including data:read' },
      { permissions: ['monitoring:read'], expected: false, description: 'monitoring permission only' },
      { permissions: ['user:read'], expected: false, description: 'user permission only' },
      { permissions: [], expected: false, description: 'no permissions' },
    ];

    testPermissionCases.forEach(({ permissions, expected, description }) => {
      it(`should ${expected ? 'allow' : 'deny'} access with ${description}`, async () => {
        // Setup
        const client = createMockSocket();
        const apiKey = 'test-api-key';
        const accessToken = 'test-access-token';
        const data = { apiKey, accessToken };
        const context = createMockExecutionContext(client, data);

        const apiKeyDoc = {
          _id: 'key123',
          name: 'Test App',
          permissions,
        };
        mockApiKeyService.validateApiKey.mockResolvedValue(apiKeyDoc);

        // Execute
        const result = await guard.canActivate(context);

        // Verify
        expect(result).toBe(expected);
        if (!expected) {
          expect(mockLogger.warn).toHaveBeenCalledWith({
            message: 'API Key 缺少 WebSocket 流权限',
            apiKey,
            clientId: client.id,
          });
        }
      });
    });
  });

  describe('Client Data Attachment', () => {
    it('should attach JWT user data to client', async () => {
      // Setup
      const client = createMockSocket();
      const token = 'valid-jwt-token';
      const data = { token };
      const context = createMockExecutionContext(client, data);

      const decoded = {
        sub: 'user123',
        username: 'testuser',
        role: 'admin',
        email: 'test@example.com',
        extra: 'field',
      };
      mockTokenService.verifyRefreshToken.mockResolvedValue(decoded);

      // Execute
      await guard.canActivate(context);

      // Verify
      expect(client.data['user']).toEqual({
        userId: 'user123',
        username: 'testuser',
        role: 'admin',
        authType: 'jwt',
      });
    });

    it('should attach API key data to client', async () => {
      // Setup
      const client = createMockSocket();
      const apiKey = 'test-api-key';
      const accessToken = 'test-access-token';
      const data = { apiKey, accessToken };
      const context = createMockExecutionContext(client, data);

      const apiKeyDoc = {
        _id: 'key123',
        name: 'Test App',
        permissions: ['data:read'],
        extra: 'field',
      };
      mockApiKeyService.validateApiKey.mockResolvedValue(apiKeyDoc);

      // Execute
      await guard.canActivate(context);

      // Verify
      expect(client.data['apiKey']).toEqual({
        id: 'key123',
        name: 'Test App',
        permissions: ['data:read'],
        authType: 'apikey',
      });
    });

    it('should not pollute client data on failed authentication', async () => {
      // Setup
      const client = createMockSocket();
      const token = 'invalid-token';
      const data = { token };
      const context = createMockExecutionContext(client, data);

      mockTokenService.verifyRefreshToken.mockRejectedValue(new Error('Invalid token'));

      // Execute
      await guard.canActivate(context);

      // Verify
      expect(client.data['user']).toBeUndefined();
      expect(client.data['apiKey']).toBeUndefined();
    });
  });
});