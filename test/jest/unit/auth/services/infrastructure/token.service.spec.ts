import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from '@auth/services/infrastructure/token.service';
import { User } from '@auth/schemas/user.schema';
import { UserRole } from '@auth/enums/user-role.enum';
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from '@common/core/exceptions';

// 创建一个模拟的统一配置对象
const mockAuthConfig = {
  cache: {
    jwtDefaultExpiry: '15m',
    refreshTokenDefaultExpiry: '7d',
  },
};

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser: User = {
    id: 'user123',
    username: 'testuser',
    email: 'test@example.com',
    role: UserRole.DEVELOPER,
  } as User;

  beforeEach(async () => {
    const mockJwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
      decode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: 'authUnified',
          useValue: mockAuthConfig,
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTokens', () => {
    it('应该成功生成访问令牌和刷新令牌', async () => {
      // Arrange
      const accessToken = 'access-token';
      const refreshToken = 'refresh-token';
      jwtService.signAsync.mockResolvedValueOnce(accessToken);
      jwtService.signAsync.mockResolvedValueOnce(refreshToken);

      // Act
      const result = await service.generateTokens(mockUser);

      // Assert
      expect(result).toEqual({ accessToken, refreshToken });
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'user123',
        username: 'testuser',
        role: UserRole.DEVELOPER,
      });
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        {
          sub: 'user123',
          username: 'testuser',
          role: UserRole.DEVELOPER,
        },
        {
          expiresIn: '7d',
        },
      );
    });

    it('应该在JWT服务失败时抛出异常', async () => {
      // Arrange
      jwtService.signAsync.mockRejectedValue(new Error('JWT service error'));

      // Act & Assert
      await expect(service.generateTokens(mockUser)).rejects.toThrow(
        'JWT service error',
      );
    });
  });

  describe('verifyAccessToken', () => {
    it('应该成功验证访问令牌', async () => {
      // Arrange
      const payload = {
        sub: 'user123',
        username: 'testuser',
        role: UserRole.DEVELOPER,
      };
      jwtService.verifyAsync.mockResolvedValue(payload);

      // Act
      const result = await service.verifyAccessToken('valid-token');

      // Assert
      expect(result).toEqual(payload);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token');
    });

    it('应该在令牌无效时抛出业务异常', async () => {
      // Arrange
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      // Act & Assert
      await expect(service.verifyAccessToken('invalid-token')).rejects.toThrow(
        UniversalExceptionFactory.createBusinessException({
          message: '访问令牌无效或已过期',
          errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
          operation: 'verifyAccessToken',
          component: ComponentIdentifier.AUTH,
          context: { reason: 'invalid_access_token' },
        }),
      );
    });
  });

  describe('verifyRefreshToken', () => {
    it('应该成功验证刷新令牌', async () => {
      // Arrange
      const payload = {
        sub: 'user123',
        username: 'testuser',
        role: UserRole.DEVELOPER,
      };
      jwtService.verifyAsync.mockResolvedValue(payload);

      // Act
      const result = await service.verifyRefreshToken('valid-refresh-token');

      // Assert
      expect(result).toEqual(payload);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('应该在刷新令牌无效时抛出业务异常', async () => {
      // Arrange
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      // Act & Assert
      await expect(
        service.verifyRefreshToken('invalid-refresh-token'),
      ).rejects.toThrow(
        UniversalExceptionFactory.createBusinessException({
          message: '刷新令牌无效或已过期',
          errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
          operation: 'verifyRefreshToken',
          component: ComponentIdentifier.AUTH,
          context: { reason: 'invalid_refresh_token' },
        }),
      );
    });
  });

  describe('decodeToken', () => {
    it('应该成功解码令牌', () => {
      // Arrange
      const payload = {
        sub: 'user123',
        username: 'testuser',
        role: UserRole.DEVELOPER,
      };
      jwtService.decode.mockReturnValue(payload);

      // Act
      const result = service.decodeToken('valid-token');

      // Assert
      expect(result).toEqual(payload);
      expect(jwtService.decode).toHaveBeenCalledWith('valid-token');
    });

    it('应该在解码失败时返回null', () => {
      // Arrange
      jwtService.decode.mockImplementation(() => {
        throw new Error('Decode error');
      });

      // Act
      const result = service.decodeToken('invalid-token');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('isTokenNearExpiry', () => {
    it('应该正确识别即将过期的令牌', () => {
      // Arrange
      const payload = {
        exp: Math.floor(Date.now() / 1000) + 120, // 2分钟后过期
      };
      jwtService.decode.mockReturnValue(payload);

      // Act
      const result = service.isTokenNearExpiry('token', 5); // 5分钟阈值

      // Assert
      expect(result).toBe(true);
    });

    it('应该正确识别未接近过期的令牌', () => {
      // Arrange
      const payload = {
        exp: Math.floor(Date.now() / 1000) + 600, // 10分钟后过期
      };
      jwtService.decode.mockReturnValue(payload);

      // Act
      const result = service.isTokenNearExpiry('token', 5); // 5分钟阈值

      // Assert
      expect(result).toBe(false);
    });

    it('应该在无法获取过期时间时返回true', () => {
      // Arrange
      const payload = {};
      jwtService.decode.mockReturnValue(payload);

      // Act
      const result = service.isTokenNearExpiry('token');

      // Assert
      expect(result).toBe(true);
    });

    it('应该在解码失败时返回true', () => {
      // Arrange
      jwtService.decode.mockImplementation(() => {
        throw new Error('Decode error');
      });

      // Act
      const result = service.isTokenNearExpiry('invalid-token');

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('getTokenRemainingTime', () => {
    it('应该正确计算令牌剩余时间', () => {
      // Arrange
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        exp: now + 300, // 5分钟后过期
      };
      jwtService.decode.mockReturnValue(payload);

      // Act
      const result = service.getTokenRemainingTime('token');

      // Assert
      expect(result).toBeGreaterThanOrEqual(299);
      expect(result).toBeLessThanOrEqual(300);
    });

    it('应该在令牌已过期时返回0', () => {
      // Arrange
      const payload = {
        exp: Math.floor(Date.now() / 1000) - 100, // 100秒前过期
      };
      jwtService.decode.mockReturnValue(payload);

      // Act
      const result = service.getTokenRemainingTime('expired-token');

      // Assert
      expect(result).toBe(0);
    });

    it('应该在无法获取过期时间时返回0', () => {
      // Arrange
      const payload = {};
      jwtService.decode.mockReturnValue(payload);

      // Act
      const result = service.getTokenRemainingTime('token');

      // Assert
      expect(result).toBe(0);
    });

    it('应该在解码失败时返回0', () => {
      // Arrange
      jwtService.decode.mockImplementation(() => {
        throw new Error('Decode error');
      });

      // Act
      const result = service.getTokenRemainingTime('invalid-token');

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('signCustomPayload', () => {
    it('应该成功生成自定义载荷令牌', async () => {
      // Arrange
      const customPayload = { custom: 'data' };
      const token = 'custom-token';
      jwtService.signAsync.mockResolvedValue(token);

      // Act
      const result = await service.signCustomPayload(customPayload);

      // Assert
      expect(result).toBe(token);
      expect(jwtService.signAsync).toHaveBeenCalledWith(customPayload, undefined);
    });

    it('应该使用提供的选项生成自定义载荷令牌', async () => {
      // Arrange
      const customPayload = { custom: 'data' };
      const options = { expiresIn: '1h' };
      const token = 'custom-token';
      jwtService.signAsync.mockResolvedValue(token);

      // Act
      const result = await service.signCustomPayload(customPayload, options);

      // Assert
      expect(result).toBe(token);
      expect(jwtService.signAsync).toHaveBeenCalledWith(customPayload, options);
    });

    it('应该在JWT服务失败时抛出异常', async () => {
      // Arrange
      const customPayload = { custom: 'data' };
      jwtService.signAsync.mockRejectedValue(new Error('JWT service error'));

      // Act & Assert
      await expect(
        service.signCustomPayload(customPayload),
      ).rejects.toThrow('JWT service error');
    });
  });

  describe('verifyCustomPayload', () => {
    it('应该成功验证自定义载荷令牌', async () => {
      // Arrange
      const payload = { custom: 'data' };
      jwtService.verifyAsync.mockResolvedValue(payload);

      // Act
      const result = await service.verifyCustomPayload('valid-custom-token');

      // Assert
      expect(result).toEqual(payload);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-custom-token');
    });

    it('应该在自定义载荷令牌无效时抛出业务异常', async () => {
      // Arrange
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      // Act & Assert
      await expect(
        service.verifyCustomPayload('invalid-custom-token'),
      ).rejects.toThrow(
        UniversalExceptionFactory.createBusinessException({
          message: '自定义令牌无效或已过期',
          errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
          operation: 'verifyCustomPayload',
          component: ComponentIdentifier.AUTH,
          context: { reason: 'invalid_custom_token' },
        }),
      );
    });
  });

  describe('getTokenConfig', () => {
    it('应该返回正确的令牌配置', () => {
      // Act
      const result = service.getTokenConfig();

      // Assert
      expect(result).toEqual({
        algorithm: 'HS256',
        defaultExpiresIn: '15m',
        refreshTokenExpiresIn: '7d',
      });
    });
  });
});