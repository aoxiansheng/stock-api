import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from '@auth/strategies/jwt.strategy';
import { SessionManagementService } from '@auth/services/domain/session-management.service';
import { User } from '@auth/schemas/user.schema';
import { JwtPayload } from '@auth/services/infrastructure/token.service';
import { UserRole } from '@auth/enums/user-role.enum';
import { OperationStatus } from '@common/types/enums/shared-base.enum';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let sessionService: jest.Mocked<SessionManagementService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser: User = {
    id: 'user123',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashedpassword',
    role: UserRole.DEVELOPER,
    status: OperationStatus.ACTIVE,
  } as User;

  const mockSessionService = {
    validateJwtPayload: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn().mockReturnValue('test-jwt-secret'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: SessionManagementService,
          useValue: mockSessionService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    sessionService = module.get(SessionManagementService);
    configService = module.get(ConfigService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(strategy).toBeDefined();
    });

    it('should configure passport strategy with correct options', () => {
      // This test verifies that the strategy is properly configured
      // We can't easily access the passport configuration directly
      // but we can verify that the config service is called correctly
      expect(configService.getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
    });
  });

  describe('validate', () => {
    it('should validate payload and return user', async () => {
      const payload: JwtPayload = { sub: 'user123', username: 'testuser', role: UserRole.DEVELOPER };
      sessionService.validateJwtPayload.mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(result).toEqual(mockUser);
      expect(sessionService.validateJwtPayload).toHaveBeenCalledWith(payload);
    });

    it('should throw exception when session service throws error', async () => {
      const payload: JwtPayload = { sub: 'user123', username: 'testuser', role: UserRole.DEVELOPER };
      sessionService.validateJwtPayload.mockRejectedValue(new Error('User not found'));

      await expect(strategy.validate(payload)).rejects.toThrow('Invalid JWT token or user does not exist');
      expect(sessionService.validateJwtPayload).toHaveBeenCalledWith(payload);
    });

    it('should handle null payload', async () => {
      sessionService.validateJwtPayload.mockRejectedValue(new Error('Invalid payload'));

      await expect(strategy.validate(null as any)).rejects.toThrow('Invalid JWT token or user does not exist');
    });

    it('should handle empty payload', async () => {
      sessionService.validateJwtPayload.mockRejectedValue(new Error('Invalid payload'));

      await expect(strategy.validate({} as any)).rejects.toThrow('Invalid JWT token or user does not exist');
    });

    it('should handle payload with missing sub field', async () => {
      const payload = { username: 'testuser' } as any;
      sessionService.validateJwtPayload.mockRejectedValue(new Error('Invalid payload'));

      await expect(strategy.validate(payload as any)).rejects.toThrow('Invalid JWT token or user does not exist');
    });

    it('should handle session service returning null', async () => {
      const payload: JwtPayload = { sub: 'user123', username: 'testuser', role: UserRole.DEVELOPER };
      sessionService.validateJwtPayload.mockResolvedValue(null);

      const result = await strategy.validate(payload);

      expect(result).toBeNull();
    });

    it('should handle session service returning undefined', async () => {
      const payload: JwtPayload = { sub: 'user123', username: 'testuser', role: UserRole.DEVELOPER };
      sessionService.validateJwtPayload.mockResolvedValue(undefined);

      const result = await strategy.validate(payload);

      expect(result).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should wrap session service errors in business exception', async () => {
      const payload: JwtPayload = { sub: 'user123', username: 'testuser', role: UserRole.DEVELOPER };
      const error = new Error('Database connection failed');
      sessionService.validateJwtPayload.mockRejectedValue(error);

      await expect(strategy.validate(payload)).rejects.toThrow('Invalid JWT token or user does not exist');
    });

    it('should handle session service throwing non-error objects', async () => {
      const payload: JwtPayload = { sub: 'user123', username: 'testuser', role: UserRole.DEVELOPER };
      sessionService.validateJwtPayload.mockRejectedValue('String error');

      await expect(strategy.validate(payload)).rejects.toThrow('Invalid JWT token or user does not exist');
    });
  });

  describe('integration scenarios', () => {
    it('should work with different payload structures', async () => {
      const testPayloads: JwtPayload[] = [
        { sub: 'user123', username: 'testuser', role: UserRole.DEVELOPER },
        { sub: 'user456', username: 'testuser2', role: UserRole.DEVELOPER },
        { sub: 'user789', username: 'testuser3', role: UserRole.ADMIN },
      ];

      for (const payload of testPayloads) {
        sessionService.validateJwtPayload.mockResolvedValueOnce({ ...mockUser, id: payload.sub });

        const result = await strategy.validate(payload);

        expect(result).toBeDefined();
        expect(result.id).toBe(payload.sub);
      }
    });

    it('should maintain performance with concurrent requests', async () => {
      const payload: JwtPayload = { sub: 'user123', username: 'testuser', role: UserRole.DEVELOPER };
      sessionService.validateJwtPayload.mockResolvedValue(mockUser);

      // Simulate concurrent requests
      const promises = Array(10)
        .fill(null)
        .map(() => strategy.validate(payload));

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result).toEqual(mockUser);
      });
    });
  });
});