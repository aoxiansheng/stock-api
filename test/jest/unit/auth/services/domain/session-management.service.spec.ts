
import { Test, TestingModule } from '@nestjs/testing';
import { SessionManagementService } from '@auth/services/domain/session-management.service';
import { TokenService, JwtPayload } from '@auth/services/infrastructure/token.service';
import { UserAuthenticationService } from '@auth/services/domain/user-authentication.service';
import { CacheService } from '@cache/services/cache.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User } from '@auth/schemas/user.schema';
import { UserRole } from '@auth/enums/user-role.enum';

describe('SessionManagementService', () => {
  let service: SessionManagementService;
  let tokenService: jest.Mocked<TokenService>;
  let userAuthService: jest.Mocked<UserAuthenticationService>;
  let cacheService: any;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockUser: User = { id: '60f7e2c3e4b2b8001f9b3b3a', username: 'testuser', role: UserRole.DEVELOPER } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionManagementService,
        { provide: TokenService, useValue: { generateTokens: jest.fn(), verifyRefreshToken: jest.fn(), verifyAccessToken: jest.fn() } },
        { provide: UserAuthenticationService, useValue: { getUserById: jest.fn(), updateLastLoginTime: jest.fn() } },
        { provide: CacheService, useValue: { set: jest.fn(), del: jest.fn(), redis: { keys: jest.fn(), del: jest.fn() } } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<SessionManagementService>(SessionManagementService);
    tokenService = module.get(TokenService);
    userAuthService = module.get(UserAuthenticationService);
    cacheService = module.get(CacheService);
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUserSession', () => {
    it('should create a session and update last login time', async () => {
      const tokens = { accessToken: 'a', refreshToken: 'r' };
      tokenService.generateTokens.mockResolvedValue(tokens);
      userAuthService.updateLastLoginTime.mockResolvedValue(undefined);

      const result = await service.createUserSession(mockUser);

      expect(result).toEqual(tokens);
      expect(tokenService.generateTokens).toHaveBeenCalledWith(mockUser);
      // Using setImmediate, so we need to wait for the next event loop tick
      await new Promise(resolve => setImmediate(resolve));
      expect(userAuthService.updateLastLoginTime).toHaveBeenCalledWith(mockUser.id);
    });

    it('should still create session even if updateLastLoginTime fails', async () => {
        const tokens = { accessToken: 'a', refreshToken: 'r' };
        tokenService.generateTokens.mockResolvedValue(tokens);
        userAuthService.updateLastLoginTime.mockRejectedValue(new Error('fail'));
        const loggerSpy = jest.spyOn((service as any).logger, 'error');

        const result = await service.createUserSession(mockUser);
        expect(result).toEqual(tokens);
        await new Promise(resolve => setImmediate(resolve));
        expect(loggerSpy).toHaveBeenCalledWith('更新最后登录时间失败', expect.any(Object));
    });
  });

  describe('refreshUserSession', () => {
    it('should refresh a session successfully', async () => {
      const payload = { sub: '60f7e2c3e4b2b8001f9b3b3a', username: 'testuser', role: UserRole.DEVELOPER } as JwtPayload;
      tokenService.verifyRefreshToken.mockResolvedValue(payload);
      userAuthService.getUserById.mockResolvedValue(mockUser);
      tokenService.generateTokens.mockResolvedValue({ accessToken: 'new_a', refreshToken: 'new_r' });

      const result = await service.refreshUserSession('refresh_token');

      expect(result.accessToken).toBe('new_a');
    });
  });

  describe('destroyUserSession', () => {
    it('should destroy a session and handle cache deletion errors', async () => {
        const payload = { sub: '60f7e2c3e4b2b8001f9b3b3a', username: 'testuser', exp: Date.now() / 1000 + 3600, role: UserRole.DEVELOPER } as JwtPayload;
        tokenService.verifyAccessToken.mockResolvedValue(payload);
        (cacheService.del as jest.Mock).mockRejectedValue(new Error('fail'));
        const loggerSpy = jest.spyOn((service as any).logger, 'warn');

        await service.destroyUserSession('access_token');

        expect(cacheService.set).toHaveBeenCalled();
        expect(loggerSpy).toHaveBeenCalledWith('清理缓存失败: auth:session:60f7e2c3e4b2b8001f9b3b3a', expect.any(Error));
    });
  });

  describe('destroyAllUserSessions', () => {
    it('should destroy all sessions and handle redis errors', async () => {
        cacheService.redis.keys.mockRejectedValue(new Error('fail'));
        const loggerSpy = jest.spyOn((service as any).logger, 'warn');

        await service.destroyAllUserSessions('60f7e2c3e4b2b8001f9b3b3a');

        expect(loggerSpy).toHaveBeenCalledWith('批量清理用户缓存失败: auth:session:60f7e2c3e4b2b8001f9b3b3a*', expect.any(Error));
    });
  });

  describe('isSessionNearExpiry', () => {
    it('should return false if session is not near expiry', async () => {
        const payload = { exp: Date.now() / 1000 + 3600, iat: Date.now() / 1000, sub:'s', username:'u', role: UserRole.DEVELOPER }; // Expires in 1 hour
        tokenService.verifyAccessToken.mockResolvedValue(payload);
        const result = await service.isSessionNearExpiry('access_token', 5);
        expect(result).toBe(false);
    });

    it('should return true if session is near expiry', async () => {
        const payload = { exp: Date.now() / 1000 + 180, iat: Date.now() / 1000, sub:'s', username:'u', role: UserRole.DEVELOPER }; // Expires in 3 minutes
        tokenService.verifyAccessToken.mockResolvedValue(payload);
        const result = await service.isSessionNearExpiry('access_token', 5);
        expect(result).toBe(true);
    });
  });
});
