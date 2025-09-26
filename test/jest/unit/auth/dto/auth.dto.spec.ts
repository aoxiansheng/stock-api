import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  CreateUserDto,
  LoginDto,
  RefreshTokenDto,
  UserResponseDto,
  UserStatsDto,
  PaginatedUsersDto,
  LoginResponseDto,
} from '@auth/dto/auth.dto';
import { UserRole } from '@auth/enums/user-role.enum';
import { OperationStatus } from '@common/types/enums/shared-base.enum';

describe('Auth DTOs', () => {
  describe('CreateUserDto', () => {
    it('应该成功验证有效的用户创建数据', async () => {
      // Arrange
      const dto = plainToClass(CreateUserDto, {
        username: 'testuser',
        password: 'Test123!@#',
        email: 'test@example.com',
        role: UserRole.DEVELOPER,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('应该在缺少必填字段时验证失败', async () => {
      // Arrange
      const dto = plainToClass(CreateUserDto, {
        username: 'testuser',
        // 缺少密码和邮箱
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'password')).toBe(true);
      expect(errors.some(e => e.property === 'email')).toBe(true);
    });

    it('应该成功验证可选的角色字段', async () => {
      // Arrange
      const dto = plainToClass(CreateUserDto, {
        username: 'testuser',
        password: 'Test123!@#',
        email: 'test@example.com',
        // role是可选的
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });
  });

  describe('LoginDto', () => {
    it('应该成功验证有效的登录数据', async () => {
      // Arrange
      const dto = plainToClass(LoginDto, {
        username: 'testuser',
        password: 'Test123!@#',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('应该在缺少必填字段时验证失败', async () => {
      // Arrange
      const dto = plainToClass(LoginDto, {
        username: 'testuser',
        // 缺少密码
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'password')).toBe(true);
    });
  });

  describe('RefreshTokenDto', () => {
    it('应该成功验证有效的刷新令牌数据', async () => {
      // Arrange
      const dto = plainToClass(RefreshTokenDto, {
        refreshToken: 'valid-refresh-token',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('应该在缺少刷新令牌时验证失败', async () => {
      // Arrange
      const dto = plainToClass(RefreshTokenDto, {
        // 缺少refreshToken
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'refreshToken')).toBe(true);
    });

    it('应该在刷新令牌为空时验证失败', async () => {
      // Arrange
      const dto = plainToClass(RefreshTokenDto, {
        refreshToken: '', // 空字符串
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'refreshToken')).toBe(true);
    });
  });

  describe('UserResponseDto', () => {
    it('应该成功创建有效的用户响应DTO', () => {
      // Arrange & Act
      const dto = new UserResponseDto();
      dto.id = 'user123';
      dto.username = 'testuser';
      dto.email = 'test@example.com';
      dto.role = UserRole.DEVELOPER;
      dto.status = OperationStatus.ACTIVE;
      dto.createdAt = new Date();
      dto.lastAccessedAt = new Date();

      // Assert
      expect(dto).toBeDefined();
      expect(dto.id).toBe('user123');
      expect(dto.username).toBe('testuser');
      expect(dto.email).toBe('test@example.com');
      expect(dto.role).toBe(UserRole.DEVELOPER);
      expect(dto.status).toBe(OperationStatus.ACTIVE);
    });
  });

  describe('UserStatsDto', () => {
    it('应该成功创建有效的用户统计DTO', () => {
      // Arrange & Act
      const dto = new UserStatsDto();
      dto.totalUsers = 100;
      dto.activeUsers = 80;
      dto.roleDistribution = {
        admin: 2,
        developer: 50,
        user: 48,
      };

      // Assert
      expect(dto).toBeDefined();
      expect(dto.totalUsers).toBe(100);
      expect(dto.activeUsers).toBe(80);
      expect(dto.roleDistribution).toEqual({
        admin: 2,
        developer: 50,
        user: 48,
      });
    });
  });

  describe('PaginatedUsersDto', () => {
    it('应该成功创建有效的分页用户DTO', () => {
      // Arrange
      const userResponse = new UserResponseDto();
      userResponse.id = 'user123';
      userResponse.username = 'testuser';
      userResponse.email = 'test@example.com';
      userResponse.role = UserRole.DEVELOPER;
      userResponse.status = OperationStatus.ACTIVE;
      userResponse.createdAt = new Date();

      // Act
      const dto = new PaginatedUsersDto();
      dto.users = [userResponse];
      dto.total = 1;
      dto.page = 1;
      dto.limit = 10;
      dto.totalPages = 1;
      dto.hasNext = false;
      dto.hasPrev = false;

      // Assert
      expect(dto).toBeDefined();
      expect(dto.users).toHaveLength(1);
      expect(dto.users[0].id).toBe('user123');
      expect(dto.total).toBe(1);
      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(10);
      expect(dto.totalPages).toBe(1);
      expect(dto.hasNext).toBe(false);
      expect(dto.hasPrev).toBe(false);
    });
  });

  describe('LoginResponseDto', () => {
    it('应该成功创建有效的登录响应DTO', () => {
      // Arrange
      const user = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        role: UserRole.DEVELOPER,
        status: OperationStatus.ACTIVE,
        createdAt: new Date(),
      };

      // Act
      const dto = new LoginResponseDto();
      dto.user = user;
      dto.accessToken = 'access-token';
      dto.refreshToken = 'refresh-token';

      // Assert
      expect(dto).toBeDefined();
      expect(dto.user).toEqual(user);
      expect(dto.accessToken).toBe('access-token');
      expect(dto.refreshToken).toBe('refresh-token');
    });
  });
});