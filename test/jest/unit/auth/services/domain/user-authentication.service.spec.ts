
import { Test, TestingModule } from '@nestjs/testing';
import { UserAuthenticationService } from '@auth/services/domain/user-authentication.service';
import { UserRepository } from '@auth/repositories/user.repository';
import { PasswordService } from '@auth/services/infrastructure/password.service';
import { CreateUserDto, LoginDto } from '@auth/dto/auth.dto';
import { User, UserDocument } from '@auth/schemas/user.schema';
import { UserRole } from '@auth/enums/user-role.enum';
import { OperationStatus } from '@common/types/enums/shared-base.enum';

describe('UserAuthenticationService', () => {
  let service: UserAuthenticationService;
  let userRepository: jest.Mocked<UserRepository>;
  let passwordService: jest.Mocked<PasswordService>;

  const mockUser: UserDocument = {
    id: '60f7e2c3e4b2b8001f9b3b3a',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: '$2b$12$hashedpassword',
    role: UserRole.DEVELOPER,
    status: OperationStatus.ACTIVE,
    toJSON: jest.fn().mockReturnValue({ id: '60f7e2c3e4b2b8001f9b3b3a', username: 'testuser', email: 'test@example.com', role: UserRole.DEVELOPER, status: OperationStatus.ACTIVE }),
  } as unknown as UserDocument;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserAuthenticationService,
        {
          provide: UserRepository,
          useValue: {
            findByUsernameOrEmail: jest.fn(),
            create: jest.fn(),
            findByUsername: jest.fn(),
            findById: jest.fn(),
            findAllPaginated: jest.fn(),
            getUserStats: jest.fn(),
            updateLastLoginTime: jest.fn(),
          },
        },
        {
          provide: PasswordService,
          useValue: {
            hashPassword: jest.fn().mockResolvedValue('$2b$12$hashedpassword'),
            comparePassword: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserAuthenticationService>(UserAuthenticationService);
    userRepository = module.get(UserRepository);
    passwordService = module.get(PasswordService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    const createUserDto: CreateUserDto = { username: 'testuser', email: 'test@example.com', password: 'password123' };

    it('should register a user successfully', async () => {
      userRepository.findByUsernameOrEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(mockUser);
      const result = await service.registerUser(createUserDto);
      expect(result).toEqual(mockUser.toJSON());
    });

    it('should throw if user already exists', async () => {
      userRepository.findByUsernameOrEmail.mockResolvedValue(mockUser);
      await expect(service.registerUser(createUserDto)).rejects.toThrow('用户名或邮箱已被使用');
    });
  });

  describe('authenticateUser', () => {
    const loginDto: LoginDto = { username: 'testuser', password: 'password123' };

    it('should authenticate a user successfully', async () => {
      userRepository.findByUsername.mockResolvedValue(mockUser);
      passwordService.comparePassword.mockResolvedValue(true);
      const result = await service.authenticateUser(loginDto);
      expect(result).toEqual(mockUser.toJSON());
    });

    it('should throw if user not found', async () => {
      userRepository.findByUsername.mockResolvedValue(null);
      await expect(service.authenticateUser(loginDto)).rejects.toThrow('用户名或密码错误');
    });

    it('should throw if password does not match', async () => {
        userRepository.findByUsername.mockResolvedValue(mockUser);
        passwordService.comparePassword.mockResolvedValue(false);
        await expect(service.authenticateUser(loginDto)).rejects.toThrow('用户名或密码错误');
    });

    it('should throw if user is not active', async () => {
        const inactiveUser = { ...mockUser, status: OperationStatus.INACTIVE } as UserDocument;
        userRepository.findByUsername.mockResolvedValue(inactiveUser);
        await expect(service.authenticateUser(loginDto)).rejects.toThrow('用户账户已被禁用');
    });
  });

  describe('getUserById', () => {
    it('should return a user by ID', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      const result = await service.getUserById('60f7e2c3e4b2b8001f9b3b3a');
      expect(result).toEqual(mockUser.toJSON());
    });

    it('should throw if user not found', async () => {
        userRepository.findById.mockResolvedValue(null);
        await expect(service.getUserById('60f7e2c3e4b2b8001f9b3b3a')).rejects.toThrow('用户不存在或已被删除');
    });
  });

  describe('validateUserStatus', () => {
    it('should return true for an active user', async () => {
        userRepository.findById.mockResolvedValue(mockUser);
        const result = await service.validateUserStatus('60f7e2c3e4b2b8001f9b3b3a');
        expect(result).toBe(true);
    });

    it('should return false for an inactive user', async () => {
        const inactiveUser = { ...mockUser, status: OperationStatus.INACTIVE } as UserDocument;
        userRepository.findById.mockResolvedValue(inactiveUser);
        const result = await service.validateUserStatus('60f7e2c3e4b2b8001f9b3b3a');
        expect(result).toBe(false);
    });
  });

  describe('getAllUsers', () => {
    it('should return paginated users with stats', async () => {
        const paginatedResult = { users: [mockUser] as any[], page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false };
        const stats = { totalUsers: 1, activeUsers: 1, roleDistribution: { [UserRole.DEVELOPER]: 1 } };
        userRepository.findAllPaginated.mockResolvedValue(paginatedResult as any);
        userRepository.getUserStats.mockResolvedValue(stats);

        const result = await service.getAllUsers(1, 10, false, true);

        expect(result.users).toEqual([mockUser]);
        expect(result.stats).toEqual(stats);
    });
  });

  describe('checkUserAvailability', () => {
    it('should return true for both if username and email are available', async () => {
        userRepository.findByUsernameOrEmail.mockResolvedValue(null);
        const result = await service.checkUserAvailability('newuser', 'new@test.com');
        expect(result).toEqual({ usernameAvailable: true, emailAvailable: true });
    });

    it('should return false for username if it is taken', async () => {
        userRepository.findByUsernameOrEmail.mockResolvedValue(mockUser);
        const result = await service.checkUserAvailability('testuser', 'new@test.com');
        expect(result).toEqual({ usernameAvailable: false, emailAvailable: true });
    });
  });

  describe('updateLastLoginTime', () => {
    it('should call the repository to update last login time', async () => {
        await service.updateLastLoginTime('60f7e2c3e4b2b8001f9b3b3a');
        expect(userRepository.updateLastLoginTime).toHaveBeenCalledWith('60f7e2c3e4b2b8001f9b3b3a');
    });

    it('should not throw an error if repository fails', async () => {
        userRepository.updateLastLoginTime.mockRejectedValue(new Error('fail'));
        const loggerSpy = jest.spyOn((service as any).logger, 'error');
        await service.updateLastLoginTime('60f7e2c3e4b2b8001f9b3b3a');
        expect(loggerSpy).toHaveBeenCalledWith('更新最后登录时间失败', expect.any(Object));
    });
  });
});
