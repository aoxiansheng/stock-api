import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UnauthorizedException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ApiKeyService } from '../../../../src/auth/services/apikey.service';
import { ApiKey } from '../../../../src/auth/schemas/apikey.schema';
import {
  APIKEY_OPERATIONS,
  APIKEY_MESSAGES,
  APIKEY_DEFAULTS,
  ApiKeyUtil,
} from '../../../../src/auth/constants/apikey.constants';
import { Permission } from '../../../../src/auth/enums/user-role.enum';

describe('ApiKeyService Optimization Features', () => {
  let service: ApiKeyService;
  let mockApiKeyModel: any;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Create a constructor function that can be mocked
    mockApiKeyModel = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: 'mock-id',
      save: jest.fn().mockResolvedValue(true),
      toObject: jest.fn().mockReturnValue(data),
      toJSON: jest.fn().mockReturnValue({
        id: 'mock-id',
        ...data,
      }),
    }));

    // Add static methods
    mockApiKeyModel.findOne = jest.fn().mockReturnValue({
      exec: jest.fn(),
    });
    mockApiKeyModel.findByIdAndUpdate = jest.fn();
    mockApiKeyModel.find = jest.fn().mockReturnValue({
      exec: jest.fn(),
    });
    mockApiKeyModel.updateOne = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyService,
        {
          provide: getModelToken(ApiKey.name),
          useValue: mockApiKeyModel,
        },
      ],
    }).compile();

    service = module.get<ApiKeyService>(ApiKeyService);

    // Spy on logger
    loggerSpy = jest.spyOn((service as any).logger, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constants Usage', () => {
    it('should use operation constants for all methods', () => {
      expect(APIKEY_OPERATIONS.VALIDATE_API_KEY).toBe('validateApiKey');
      expect(APIKEY_OPERATIONS.CREATE_API_KEY).toBe('createApiKey');
      expect(APIKEY_OPERATIONS.GET_USER_API_KEYS).toBe('getUserApiKeys');
      expect(APIKEY_OPERATIONS.REVOKE_API_KEY).toBe('revokeApiKey');
    });

    it('should use message constants for logging', () => {
      expect(APIKEY_MESSAGES.API_KEY_CREATED).toBe('API Key创建成功');
      expect(APIKEY_MESSAGES.API_KEY_REVOKED).toBe('API Key已撤销');
      expect(APIKEY_MESSAGES.INVALID_API_CREDENTIALS).toBe('API凭证无效');
      expect(APIKEY_MESSAGES.API_CREDENTIALS_EXPIRED).toBe('API凭证已过期');
    });

    it('should use default constants for API key creation', () => {
      expect(APIKEY_DEFAULTS.APP_KEY_PREFIX).toBe('sk-');
      expect(APIKEY_DEFAULTS.DEFAULT_RATE_LIMIT).toEqual({
        requests: 200,
        window: '1m',
      });
      expect(APIKEY_DEFAULTS.DEFAULT_ACTIVE_STATUS).toBe(true);
    });
  });

  describe('Enhanced API Key Validation', () => {
    it('should use constants for validation start logging', async () => {
      const mockApiKey = {
        _id: 'apikey123',
        appKey: 'sk-test-key',
        accessToken: 'test-token',
        isActive: true,
        expiresAt: null,
      };

      mockApiKeyModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockApiKey),
      });

      await service.validateApiKey('sk-test-key', 'test-token');

      expect(loggerSpy).toHaveBeenCalledWith(
        APIKEY_MESSAGES.API_KEY_VALIDATION_STARTED,
        expect.objectContaining({
          operation: APIKEY_OPERATIONS.VALIDATE_API_KEY,
          appKey: 'sk-test-key',
          accessToken: expect.any(String), // sanitized token
        })
      );
    });

    it('should use constants for invalid credentials error', async () => {
      const warnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation();
      
      mockApiKeyModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.validateApiKey('invalid-key', 'invalid-token')
      ).rejects.toThrow(new UnauthorizedException(APIKEY_MESSAGES.INVALID_API_CREDENTIALS));

      expect(warnSpy).toHaveBeenCalledWith(
        APIKEY_MESSAGES.INVALID_API_CREDENTIALS,
        expect.objectContaining({
          operation: APIKEY_OPERATIONS.VALIDATE_API_KEY,
          appKey: 'invalid-key',
        })
      );
    });

    it('should use constants for expired credentials error', async () => {
      const warnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation();
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1); // yesterday

      const mockApiKey = {
        _id: 'apikey123',
        appKey: 'sk-test-key',
        accessToken: 'test-token',
        isActive: true,
        expiresAt: expiredDate,
      };

      mockApiKeyModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockApiKey),
      });

      await expect(
        service.validateApiKey('sk-test-key', 'test-token')
      ).rejects.toThrow(new UnauthorizedException(APIKEY_MESSAGES.API_CREDENTIALS_EXPIRED));

      expect(warnSpy).toHaveBeenCalledWith(
        APIKEY_MESSAGES.API_CREDENTIALS_EXPIRED,
        expect.objectContaining({
          operation: APIKEY_OPERATIONS.VALIDATE_API_KEY,
          appKey: 'sk-test-key',
        })
      );
    });

    it('should use constants for successful validation logging', async () => {
      const mockApiKey = {
        _id: 'apikey123',
        appKey: 'sk-test-key',
        accessToken: 'test-token',
        isActive: true,
        expiresAt: null,
      };

      mockApiKeyModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockApiKey),
      });

      await service.validateApiKey('sk-test-key', 'test-token');

      expect(loggerSpy).toHaveBeenCalledWith(
        APIKEY_MESSAGES.API_KEY_VALIDATED,
        expect.objectContaining({
          operation: APIKEY_OPERATIONS.VALIDATE_API_KEY,
          apiKeyId: 'apikey123',
          appKey: 'sk-test-key',
        })
      );
    });
  });

  describe('Enhanced API Key Creation', () => {
    it('should use constants and utility for API key creation', async () => {
      const logSpy = jest.spyOn((service as any).logger, 'log').mockImplementation();

      // Mock the constructor to return a specific object
      mockApiKeyModel.mockImplementation((data) => ({
        ...data,
        _id: 'newkey123',
        appKey: 'sk-generated-key',
        accessToken: 'generated-token',
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({
          _id: 'newkey123',
          appKey: 'sk-generated-key',
          name: 'Test API Key',
        }),
        toJSON: jest.fn().mockReturnValue({
          id: 'newkey123',
          appKey: 'sk-generated-key',
          name: 'Test API Key',
        }),
      }));

      const createApiKeyDto = {
        name: 'Test API Key',
        permissions: [Permission.DATA_READ],
      };

      await service.createApiKey('user123', createApiKeyDto);

      expect(loggerSpy).toHaveBeenCalledWith(
        APIKEY_MESSAGES.API_KEY_CREATION_STARTED,
        expect.objectContaining({
          operation: APIKEY_OPERATIONS.CREATE_API_KEY,
          userId: 'user123',
          name: 'Test API Key',
        })
      );

      expect(logSpy).toHaveBeenCalledWith(
        APIKEY_MESSAGES.API_KEY_CREATED,
        expect.objectContaining({
          operation: APIKEY_OPERATIONS.CREATE_API_KEY,
          apiKeyName: 'Test API Key',
          userId: 'user123',
        })
      );
    });

    it('should use default constants for rate limit', async () => {
      mockApiKeyModel.mockImplementation((data) => {
        expect(data.rateLimit).toEqual(APIKEY_DEFAULTS.DEFAULT_RATE_LIMIT);
        expect(data.isActive).toBe(APIKEY_DEFAULTS.DEFAULT_ACTIVE_STATUS);
        return {
          ...data,
          _id: 'newkey123',
          save: jest.fn().mockResolvedValue(true),
          toObject: jest.fn().mockReturnValue({}),
          toJSON: jest.fn().mockReturnValue({
            id: 'newkey123',
            ...data,
          }),
        };
      });

      const createApiKeyDto = {
        name: 'Test API Key',
        permissions: [Permission.DATA_READ],
      };

      await service.createApiKey('user123', createApiKeyDto);
    });

    it('should use constants for creation failure error', async () => {
      const errorSpy = jest.spyOn((service as any).logger, 'error').mockImplementation();

      mockApiKeyModel.mockImplementation((data) => ({
        ...data,
        _id: 'newkey123',
        save: jest.fn().mockRejectedValue(new Error('Database error')),
        toObject: jest.fn().mockReturnValue({}),
        toJSON: jest.fn().mockReturnValue({
          id: 'newkey123',
          ...data,
        }),
      }));

      const createApiKeyDto = {
        name: 'Test API Key',
        permissions: [Permission.DATA_READ],
      };

      await expect(
        service.createApiKey('user123', createApiKeyDto)
      ).rejects.toThrow(new InternalServerErrorException(APIKEY_MESSAGES.CREATE_API_KEY_FAILED));

      expect(errorSpy).toHaveBeenCalledWith(
        APIKEY_MESSAGES.CREATE_API_KEY_FAILED,
        expect.objectContaining({
          operation: APIKEY_OPERATIONS.CREATE_API_KEY,
          apiKeyName: 'Test API Key',
          userId: 'user123',
        })
      );
    });
  });

  describe('Enhanced Get User API Keys', () => {
    it('should use constants for successful retrieval', async () => {
      const mockApiKeys = [
        { _id: 'key1', name: 'Key 1' },
        { _id: 'key2', name: 'Key 2' },
      ];

      mockApiKeyModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockApiKeys.map(apiKey => ({
          ...apiKey,
          toJSON: jest.fn().mockReturnValue({
            id: apiKey._id,
            ...apiKey,
          }),
        }))),
      });

      await service.getUserApiKeys('user123');

      expect(loggerSpy).toHaveBeenCalledWith(
        APIKEY_MESSAGES.USER_API_KEYS_LOOKUP_STARTED,
        expect.objectContaining({
          operation: APIKEY_OPERATIONS.GET_USER_API_KEYS,
          userId: 'user123',
        })
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        APIKEY_MESSAGES.USER_API_KEYS_RETRIEVED,
        expect.objectContaining({
          operation: APIKEY_OPERATIONS.GET_USER_API_KEYS,
          userId: 'user123',
          count: 2,
        })
      );
    });

    it('should use constants for retrieval failure error', async () => {
      const errorSpy = jest.spyOn((service as any).logger, 'error').mockImplementation();
      
      mockApiKeyModel.find.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      await expect(
        service.getUserApiKeys('user123')
      ).rejects.toThrow(new InternalServerErrorException(APIKEY_MESSAGES.GET_USER_API_KEYS_FAILED));

      expect(errorSpy).toHaveBeenCalledWith(
        APIKEY_MESSAGES.GET_USER_API_KEYS_FAILED,
        expect.objectContaining({
          operation: APIKEY_OPERATIONS.GET_USER_API_KEYS,
          userId: 'user123',
        })
      );
    });
  });

  describe('Enhanced API Key Revocation', () => {
    it('should use constants for successful revocation', async () => {
      const logSpy = jest.spyOn((service as any).logger, 'log').mockImplementation();
      
      mockApiKeyModel.updateOne.mockResolvedValue({ matchedCount: 1 });

      await service.revokeApiKey('apikey123', 'user123');

      expect(loggerSpy).toHaveBeenCalledWith(
        APIKEY_MESSAGES.API_KEY_REVOCATION_STARTED,
        expect.objectContaining({
          operation: APIKEY_OPERATIONS.REVOKE_API_KEY,
          apiKeyId: 'apikey123',
          userId: 'user123',
        })
      );

      expect(logSpy).toHaveBeenCalledWith(
        APIKEY_MESSAGES.API_KEY_REVOKED,
        expect.objectContaining({
          operation: APIKEY_OPERATIONS.REVOKE_API_KEY,
          apiKeyId: 'apikey123',
          userId: 'user123',
        })
      );
    });

    it('should use constants for not found error', async () => {
      mockApiKeyModel.updateOne.mockResolvedValue({ matchedCount: 0 });

      await expect(
        service.revokeApiKey('nonexistent', 'user123')
      ).rejects.toThrow(new NotFoundException(APIKEY_MESSAGES.API_KEY_NOT_FOUND_OR_NO_PERMISSION));
    });

    it('should use constants for revocation failure error', async () => {
      const errorSpy = jest.spyOn((service as any).logger, 'error').mockImplementation();
      
      mockApiKeyModel.updateOne.mockRejectedValue(new Error('Database error'));

      await expect(
        service.revokeApiKey('apikey123', 'user123')
      ).rejects.toThrow(new InternalServerErrorException(APIKEY_MESSAGES.REVOKE_API_KEY_FAILED));

      expect(errorSpy).toHaveBeenCalledWith(
        APIKEY_MESSAGES.REVOKE_API_KEY_FAILED,
        expect.objectContaining({
          operation: APIKEY_OPERATIONS.REVOKE_API_KEY,
          apiKeyId: 'apikey123',
          userId: 'user123',
        })
      );
    });
  });

  describe('Utility Functions', () => {
    it('should generate valid app keys', () => {
      const appKey = ApiKeyUtil.generateAppKey();
      expect(appKey).toMatch(/^sk-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
    });

    it('should generate valid access tokens', () => {
      const accessToken = ApiKeyUtil.generateAccessToken();
      expect(accessToken).toMatch(/^[a-zA-Z0-9]{32}$/);
      expect(accessToken.length).toBe(32);
    });

    it('should validate app key format', () => {
      expect(ApiKeyUtil.isValidAppKey('sk-12345678-1234-1234-1234-123456789012')).toBe(true);
      expect(ApiKeyUtil.isValidAppKey('invalid-key')).toBe(false);
      expect(ApiKeyUtil.isValidAppKey('sk-invalid')).toBe(false);
    });

    it('should validate access token format', () => {
      expect(ApiKeyUtil.isValidAccessToken('abcdefghijklmnopqrstuvwxyz123456')).toBe(true);
      expect(ApiKeyUtil.isValidAccessToken('short')).toBe(false);
      expect(ApiKeyUtil.isValidAccessToken('toolongaccesstokenstring123456789')).toBe(false);
    });

    it('should sanitize access tokens for logging', () => {
      const token = 'abcdefghijklmnopqrstuvwxyz123456';
      const sanitized = ApiKeyUtil.sanitizeAccessToken(token);
      expect(sanitized).toBe('abcd***3456');
      
      const shortToken = 'short';
      expect(ApiKeyUtil.sanitizeAccessToken(shortToken)).toBe('***');
    });

    it('should check expiry correctly', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      expect(ApiKeyUtil.isExpired(futureDate)).toBe(false);
      
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      expect(ApiKeyUtil.isExpired(pastDate)).toBe(true);
      
      expect(ApiKeyUtil.isExpired(null)).toBe(false);
    });
  });
});
