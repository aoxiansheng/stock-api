import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { ApiKeyStrategy } from '@auth/strategies/apikey.strategy';
import { AuthFacadeService } from '@auth/services/facade/auth-facade.service';
import { HttpHeadersUtil } from '@common/utils/http-headers.util';
import { ApiKeyDocument } from '@auth/schemas/apikey.schema';
import { Permission } from '@auth/enums/user-role.enum';
import { OperationStatus } from '@common/types/enums/shared-base.enum';

describe('ApiKeyStrategy', () => {
  let strategy: ApiKeyStrategy;
  let authFacade: jest.Mocked<AuthFacadeService>;

  const mockApiKey: ApiKeyDocument = {
    appKey: 'app_testkey',
    accessToken: 'access_testtoken',
    name: 'Test API Key',
    userId: 'user123' as any,
    permissions: [Permission.DATA_READ],
    rateLimit: {
      requestLimit: 100,
      window: '1h'
    },
    status: OperationStatus.ACTIVE,
    totalRequestCount: 0,
  } as ApiKeyDocument;

  const mockAuthFacade = {
    validateApiKey: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyStrategy,
        {
          provide: AuthFacadeService,
          useValue: mockAuthFacade,
        },
      ],
    }).compile();

    strategy = module.get<ApiKeyStrategy>(ApiKeyStrategy);
    authFacade = module.get(AuthFacadeService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(strategy).toBeDefined();
    });
  });

  describe('validate', () => {
    it('should validate API credentials and return API key', async () => {
      const mockRequest = {
        headers: {
          'x-app-key': 'app_testkey',
          'x-access-token': 'access_testtoken',
        },
      } as unknown as Request;

      // Mock HttpHeadersUtil.validateApiCredentials
      jest.spyOn(HttpHeadersUtil, 'validateApiCredentials').mockReturnValue({
        appKey: 'app_testkey',
        accessToken: 'access_testtoken',
      });

      authFacade.validateApiKey.mockResolvedValue(mockApiKey);

      const result = await strategy.validate(mockRequest);

      expect(result).toEqual(mockApiKey);
      expect(HttpHeadersUtil.validateApiCredentials).toHaveBeenCalledWith(mockRequest);
      expect(authFacade.validateApiKey).toHaveBeenCalledWith('app_testkey', 'access_testtoken');
    });

    it('should throw exception when API credentials are missing', async () => {
      const mockRequest = {
        headers: {},
      } as unknown as Request;

      // Mock HttpHeadersUtil.validateApiCredentials to throw error
      jest.spyOn(HttpHeadersUtil, 'validateApiCredentials').mockImplementation(() => {
        throw new Error('缺少API凭证');
      });

      await expect(strategy.validate(mockRequest)).rejects.toThrow('Missing API credentials');
      expect(HttpHeadersUtil.validateApiCredentials).toHaveBeenCalledWith(mockRequest);
    });

    it('should throw exception when API credential format is invalid', async () => {
      const mockRequest = {
        headers: {
          'x-app-key': 'invalid-key',
          'x-access-token': 'invalid-token',
        },
      } as unknown as Request;

      // Mock HttpHeadersUtil.validateApiCredentials to throw format error
      jest.spyOn(HttpHeadersUtil, 'validateApiCredentials').mockImplementation(() => {
        throw new Error('API凭证格式无效');
      });

      await expect(strategy.validate(mockRequest)).rejects.toThrow('Invalid API credential format');
      expect(HttpHeadersUtil.validateApiCredentials).toHaveBeenCalledWith(mockRequest);
    });

    it('should throw exception when API credentials are invalid', async () => {
      const mockRequest = {
        headers: {
          'x-app-key': 'app_testkey',
          'x-access-token': 'access_testtoken',
        },
      } as unknown as Request;

      // Mock HttpHeadersUtil.validateApiCredentials
      jest.spyOn(HttpHeadersUtil, 'validateApiCredentials').mockReturnValue({
        appKey: 'app_testkey',
        accessToken: 'access_testtoken',
      });

      // Mock authFacade.validateApiKey to throw error
      authFacade.validateApiKey.mockRejectedValue(new Error('Invalid credentials'));

      await expect(strategy.validate(mockRequest)).rejects.toThrow('Invalid API credentials');
      expect(HttpHeadersUtil.validateApiCredentials).toHaveBeenCalledWith(mockRequest);
      expect(authFacade.validateApiKey).toHaveBeenCalledWith('app_testkey', 'access_testtoken');
    });

    it('should handle request with null headers', async () => {
      const mockRequest = {
        headers: null,
      } as unknown as Request;

      jest.spyOn(HttpHeadersUtil, 'validateApiCredentials').mockImplementation(() => {
        throw new Error('缺少API凭证');
      });

      await expect(strategy.validate(mockRequest)).rejects.toThrow('Missing API credentials');
    });

    it('should handle request with undefined headers', async () => {
      const mockRequest = {
        headers: undefined,
      } as unknown as Request;

      jest.spyOn(HttpHeadersUtil, 'validateApiCredentials').mockImplementation(() => {
        throw new Error('缺少API凭证');
      });

      await expect(strategy.validate(mockRequest)).rejects.toThrow('Missing API credentials');
    });

    it('should handle request with empty headers object', async () => {
      const mockRequest = {
        headers: {},
      } as unknown as Request;

      jest.spyOn(HttpHeadersUtil, 'validateApiCredentials').mockImplementation(() => {
        throw new Error('缺少API凭证');
      });

      await expect(strategy.validate(mockRequest)).rejects.toThrow('Missing API credentials');
    });

    it('should handle auth facade returning null', async () => {
      const mockRequest = {
        headers: {
          'x-app-key': 'app_testkey',
          'x-access-token': 'access_testtoken',
        },
      } as unknown as Request;

      jest.spyOn(HttpHeadersUtil, 'validateApiCredentials').mockReturnValue({
        appKey: 'app_testkey',
        accessToken: 'access_testtoken',
      });

      authFacade.validateApiKey.mockResolvedValue(null);

      const result = await strategy.validate(mockRequest);

      expect(result).toBeNull();
    });

    it('should handle auth facade returning undefined', async () => {
      const mockRequest = {
        headers: {
          'x-app-key': 'app_testkey',
          'x-access-token': 'access_testtoken',
        },
      } as unknown as Request;

      jest.spyOn(HttpHeadersUtil, 'validateApiCredentials').mockReturnValue({
        appKey: 'app_testkey',
        accessToken: 'access_testtoken',
      });

      authFacade.validateApiKey.mockResolvedValue(undefined);

      const result = await strategy.validate(mockRequest);

      expect(result).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should wrap HttpHeadersUtil errors in business exception', async () => {
      const mockRequest = {
        headers: {},
      } as unknown as Request;

      jest.spyOn(HttpHeadersUtil, 'validateApiCredentials').mockImplementation(() => {
        throw new Error('Custom error from HttpHeadersUtil');
      });

      await expect(strategy.validate(mockRequest)).rejects.toThrow('Invalid API credentials');
    });

    it('should wrap auth facade errors in business exception', async () => {
      const mockRequest = {
        headers: {
          'x-app-key': 'app_testkey',
          'x-access-token': 'access_testtoken',
        },
      } as unknown as Request;

      jest.spyOn(HttpHeadersUtil, 'validateApiCredentials').mockReturnValue({
        appKey: 'app_testkey',
        accessToken: 'access_testtoken',
      });

      authFacade.validateApiKey.mockRejectedValue(new Error('Database error'));

      await expect(strategy.validate(mockRequest)).rejects.toThrow('Invalid API credentials');
    });

    it('should handle auth facade throwing non-error objects', async () => {
      const mockRequest = {
        headers: {
          'x-app-key': 'app_testkey',
          'x-access-token': 'access_testtoken',
        },
      } as unknown as Request;

      jest.spyOn(HttpHeadersUtil, 'validateApiCredentials').mockReturnValue({
        appKey: 'app_testkey',
        accessToken: 'access_testtoken',
      });

      authFacade.validateApiKey.mockRejectedValue('String error');

      await expect(strategy.validate(mockRequest)).rejects.toThrow('Invalid API credentials');
    });
  });

  describe('integration scenarios', () => {
    it('should work with different header combinations', async () => {
      const testHeaders = [
        { 'x-app-key': 'app_key1', 'x-access-token': 'access_token1' },
        { 'x-app-key': 'app_key2', 'x-access-token': 'access_token2' },
        { 'x-app-key': 'app_key3', 'x-access-token': 'access_token3' },
      ];

      for (const headers of testHeaders) {
        const mockRequest = { headers } as unknown as Request;
        
        jest.spyOn(HttpHeadersUtil, 'validateApiCredentials').mockReturnValue({
          appKey: headers['x-app-key'],
          accessToken: headers['x-access-token'],
        });

        const mockResponseApiKey = { ...mockApiKey, appKey: headers['x-app-key'] } as ApiKeyDocument;
        authFacade.validateApiKey.mockResolvedValueOnce(mockResponseApiKey);

        const result = await strategy.validate(mockRequest);

        expect(result).toBeDefined();
        expect(result.appKey).toBe(headers['x-app-key']);
      }
    });

    it('should maintain performance with concurrent requests', async () => {
      const mockRequest = {
        headers: {
          'x-app-key': 'app_testkey',
          'x-access-token': 'access_testtoken',
        },
      } as unknown as Request;

      jest.spyOn(HttpHeadersUtil, 'validateApiCredentials').mockReturnValue({
        appKey: 'app_testkey',
        accessToken: 'access_testtoken',
      });

      authFacade.validateApiKey.mockResolvedValue(mockApiKey);

      // Simulate concurrent requests
      const promises = Array(10)
        .fill(null)
        .map(() => strategy.validate(mockRequest));

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result).toEqual(mockApiKey);
      });
    });
  });
});