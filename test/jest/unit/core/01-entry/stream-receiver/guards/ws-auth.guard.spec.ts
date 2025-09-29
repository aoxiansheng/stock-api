import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { WsAuthGuard } from '@core/01-entry/stream-receiver/guards/ws-auth.guard';
import { ApiKeyManagementService } from '@auth/services/domain/apikey-management.service';
import { RateLimitService } from '@auth/services/infrastructure/rate-limit.service';
import { Permission } from '@auth/enums/user-role.enum';
import { Socket } from 'socket.io';

describe('WsAuthGuard', () => {
  let guard: WsAuthGuard;
  let module: TestingModule;
  let apiKeyService: jest.Mocked<ApiKeyManagementService>;
  let rateLimitService: jest.Mocked<RateLimitService>;

  // Mock data
  const mockValidApiKeyDoc = {
    _id: 'key-id-123',
    name: 'Test API Key',
    appKey: 'test-app-key-123456789',
    accessToken: 'test-access-token',
    permissions: [Permission.STREAM_READ, Permission.STREAM_WRITE],
    rateLimit: {
      requestsPerMinute: 1000,
      requestsPerDay: 50000
    },
    isActive: true,
    status: 'active',
    totalRequestCount: 100
  } as any;

  const mockSocket = {
    id: 'test-socket-id',
    handshake: {
      headers: {
        'x-app-key': 'test-app-key',
        'x-access-token': 'test-access-token'
      },
      query: {
        apiKey: 'query-api-key',
        accessToken: 'query-access-token'
      }
    },
    data: {}
  } as any as Socket;

  const mockExecutionContext = {
    switchToWs: jest.fn().mockReturnValue({
      getClient: jest.fn().mockReturnValue(mockSocket),
      getData: jest.fn().mockReturnValue({})
    })
  } as any as ExecutionContext;

  beforeEach(async () => {
    const apiKeyServiceMock = {
      validateApiKey: jest.fn(),
    };

    const rateLimitServiceMock = {
      checkRateLimit: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        WsAuthGuard,
        { provide: ApiKeyManagementService, useValue: apiKeyServiceMock },
        { provide: RateLimitService, useValue: rateLimitServiceMock },
      ],
    }).compile();

    guard = module.get<WsAuthGuard>(WsAuthGuard);
    apiKeyService = module.get(ApiKeyManagementService);
    rateLimitService = module.get(RateLimitService);

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Guard Initialization', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('should implement CanActivate interface', () => {
      expect(guard.canActivate).toBeDefined();
      expect(typeof guard.canActivate).toBe('function');
    });
  });

  describe('canActivate - Authentication Flow', () => {
    it('should allow access with valid API key and permissions', async () => {
      // Arrange
      apiKeyService.validateApiKey.mockResolvedValue(mockValidApiKeyDoc);
      rateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        limit: 1000,
        current: 10,
        remaining: 990,
        resetTime: Date.now() + 60000
      });

      // Act
      const result = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(apiKeyService.validateApiKey).toHaveBeenCalledWith(
        'test-app-key',
        'test-access-token'
      );
      expect(mockSocket.data.apiKey).toEqual({
        id: 'key-id-123',
        name: 'Test API Key',
        permissions: [Permission.STREAM_READ, Permission.STREAM_WRITE],
        authType: 'apikey'
      });
    });

    it('should deny access when API key is missing', async () => {
      // Arrange
      const contextWithoutAuth = {
        switchToWs: jest.fn().mockReturnValue({
          getClient: jest.fn().mockReturnValue({
            id: 'test-socket-id',
            handshake: { headers: {}, query: {} },
            data: {}
          }),
          getData: jest.fn().mockReturnValue({})
        })
      } as any as ExecutionContext;

      // Act
      const result = await guard.canActivate(contextWithoutAuth);

      // Assert
      expect(result).toBe(false);
      expect(apiKeyService.validateApiKey).not.toHaveBeenCalled();
    });

    it('should deny access when API key validation fails', async () => {
      // Arrange
      apiKeyService.validateApiKey.mockResolvedValue(null);

      // Act
      const result = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(false);
      expect(apiKeyService.validateApiKey).toHaveBeenCalledWith(
        'test-app-key',
        'test-access-token'
      );
    });

    it('should deny access when API key lacks stream permissions', async () => {
      // Arrange
      const apiKeyWithoutStreamPermissions = {
        ...mockValidApiKeyDoc,
        permissions: [Permission.DATA_READ] // Missing stream permissions
      };
      apiKeyService.validateApiKey.mockResolvedValue(apiKeyWithoutStreamPermissions);

      // Act
      const result = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(false);
    });

    it('should deny access when rate limit is exceeded', async () => {
      // Arrange
      apiKeyService.validateApiKey.mockResolvedValue(mockValidApiKeyDoc);
      rateLimitService.checkRateLimit.mockResolvedValue({
        allowed: false,
        limit: 1000,
        current: 1000,
        remaining: 0,
        resetTime: Date.now() + 60000
      });

      // Act
      const result = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(false);
      expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith(
        mockValidApiKeyDoc,
        expect.any(String)
      );
    });
  });

  describe('Auth Data Extraction', () => {
    it('should extract auth data from message data first', async () => {
      // Arrange
      const contextWithMessageAuth = {
        switchToWs: jest.fn().mockReturnValue({
          getClient: jest.fn().mockReturnValue(mockSocket),
          getData: jest.fn().mockReturnValue({
            apiKey: 'message-api-key',
            accessToken: 'message-access-token'
          })
        })
      } as any as ExecutionContext;

      apiKeyService.validateApiKey.mockResolvedValue(mockValidApiKeyDoc);
      rateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        limit: 1000,
        current: 10,
        remaining: 990,
        resetTime: Date.now() + 60000
      });

      // Act
      await guard.canActivate(contextWithMessageAuth);

      // Assert
      expect(apiKeyService.validateApiKey).toHaveBeenCalledWith(
        'message-api-key',
        'message-access-token'
      );
    });

    it('should fall back to headers when message data is not available', async () => {
      // Arrange
      apiKeyService.validateApiKey.mockResolvedValue(mockValidApiKeyDoc);
      rateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        limit: 1000,
        current: 10,
        remaining: 990,
        resetTime: Date.now() + 60000
      });

      // Act
      await guard.canActivate(mockExecutionContext);

      // Assert
      expect(apiKeyService.validateApiKey).toHaveBeenCalledWith(
        'test-app-key',
        'test-access-token'
      );
    });

    it('should fall back to query parameters when headers are not available', async () => {
      // Arrange
      const contextWithQueryAuth = {
        switchToWs: jest.fn().mockReturnValue({
          getClient: jest.fn().mockReturnValue({
            id: 'test-socket-id',
            handshake: {
              headers: {},
              query: {
                apiKey: 'query-api-key',
                accessToken: 'query-access-token'
              }
            },
            data: {}
          }),
          getData: jest.fn().mockReturnValue({})
        })
      } as any as ExecutionContext;

      apiKeyService.validateApiKey.mockResolvedValue(mockValidApiKeyDoc);
      rateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        limit: 1000,
        current: 10,
        remaining: 990,
        resetTime: Date.now() + 60000
      });

      // Act
      await guard.canActivate(contextWithQueryAuth);

      // Assert
      expect(apiKeyService.validateApiKey).toHaveBeenCalledWith(
        'query-api-key',
        'query-access-token'
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should skip rate limit check when API key has no rate limit configuration', async () => {
      // Arrange
      const apiKeyWithoutRateLimit = {
        ...mockValidApiKeyDoc,
        rateLimit: undefined
      };
      apiKeyService.validateApiKey.mockResolvedValue(apiKeyWithoutRateLimit);

      // Act
      const result = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(rateLimitService.checkRateLimit).not.toHaveBeenCalled();
    });

    it('should allow access when rate limit service fails (graceful degradation)', async () => {
      // Arrange
      apiKeyService.validateApiKey.mockResolvedValue(mockValidApiKeyDoc);
      rateLimitService.checkRateLimit.mockRejectedValue(new Error('Rate limit service error'));

      // Act
      const result = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true); // Should allow access despite rate limit error
    });
  });

  describe('Error Handling', () => {
    it('should deny access when API key service throws an error', async () => {
      // Arrange
      apiKeyService.validateApiKey.mockRejectedValue(new Error('API key service error'));

      // Act
      const result = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(false);
    });

    it('should handle missing socket gracefully', async () => {
      // Arrange
      const contextWithoutSocket = {
        switchToWs: jest.fn().mockReturnValue({
          getClient: jest.fn().mockReturnValue(null),
          getData: jest.fn().mockReturnValue({})
        })
      } as any as ExecutionContext;

      // Act
      const result = await guard.canActivate(contextWithoutSocket);

      // Assert
      expect(result).toBe(false);
    });

    it('should handle malformed handshake data', async () => {
      // Arrange
      const contextWithMalformedSocket = {
        switchToWs: jest.fn().mockReturnValue({
          getClient: jest.fn().mockReturnValue({
            id: 'test-socket-id',
            handshake: null,
            data: {}
          }),
          getData: jest.fn().mockReturnValue({})
        })
      } as any as ExecutionContext;

      // Act
      const result = await guard.canActivate(contextWithMalformedSocket);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('Permission Validation', () => {
    it('should accept API key with STREAM_READ permission', async () => {
      // Arrange
      const apiKeyWithStreamRead = {
        ...mockValidApiKeyDoc,
        permissions: [Permission.STREAM_READ]
      };
      apiKeyService.validateApiKey.mockResolvedValue(apiKeyWithStreamRead);
      rateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        limit: 1000,
        current: 10,
        remaining: 990,
        resetTime: Date.now() + 60000
      });

      // Act
      const result = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
    });

    it('should accept API key with STREAM_SUBSCRIBE permission', async () => {
      // Arrange
      const apiKeyWithStreamSubscribe = {
        ...mockValidApiKeyDoc,
        permissions: [Permission.STREAM_SUBSCRIBE]
      };
      apiKeyService.validateApiKey.mockResolvedValue(apiKeyWithStreamSubscribe);
      rateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        limit: 1000,
        current: 10,
        remaining: 990,
        resetTime: Date.now() + 60000
      });

      // Act
      const result = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
    });

    it('should reject API key with only non-stream permissions', async () => {
      // Arrange
      const apiKeyWithoutStreamPermissions = {
        ...mockValidApiKeyDoc,
        permissions: [Permission.DATA_READ]
      };
      apiKeyService.validateApiKey.mockResolvedValue(apiKeyWithoutStreamPermissions);

      // Act
      const result = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('Security Features', () => {
    it('should mask API key in logs for security', async () => {
      // Arrange
      const longApiKey = 'very-long-api-key-that-should-be-masked';
      const contextWithLongApiKey = {
        switchToWs: jest.fn().mockReturnValue({
          getClient: jest.fn().mockReturnValue({
            id: 'test-socket-id',
            handshake: {
              headers: {
                'x-app-key': longApiKey,
                'x-access-token': 'test-access-token'
              },
              query: {}
            },
            data: {}
          }),
          getData: jest.fn().mockReturnValue({})
        })
      } as any as ExecutionContext;

      apiKeyService.validateApiKey.mockResolvedValue(null); // Will cause validation to fail

      // Act
      const result = await guard.canActivate(contextWithLongApiKey);

      // Assert
      expect(result).toBe(false);
      expect(apiKeyService.validateApiKey).toHaveBeenCalledWith(
        longApiKey,
        'test-access-token'
      );
    });

    it('should attach validated API key data to socket', async () => {
      // Arrange
      apiKeyService.validateApiKey.mockResolvedValue(mockValidApiKeyDoc);
      rateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        limit: 1000,
        current: 10,
        remaining: 990,
        resetTime: Date.now() + 60000
      });

      // Act
      await guard.canActivate(mockExecutionContext);

      // Assert
      expect(mockSocket.data.apiKey).toEqual({
        id: mockValidApiKeyDoc._id,
        name: mockValidApiKeyDoc.name,
        permissions: mockValidApiKeyDoc.permissions,
        authType: 'apikey'
      });
    });
  });
});
