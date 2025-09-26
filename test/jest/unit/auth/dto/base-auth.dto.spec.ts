import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { BaseAuthDto, BasePasswordDto, BaseUserDto } from '@auth/dto/base-auth.dto';
import { AUTH_VALIDATION_CONSTANTS } from '@auth/decorators/validation.decorator';

// 创建具体的测试类来实例化抽象类
class TestBaseAuthDto extends BaseAuthDto {}
class TestBasePasswordDto extends BasePasswordDto {}
class TestBaseUserDto extends BaseUserDto {}

describe('BaseAuthDto', () => {
  describe('BaseAuthDto', () => {
    it('应该成功验证有效的用户名', async () => {
      // Arrange
      const dto = plainToClass(TestBaseAuthDto, {
        username: 'testuser',
        page: 1,
        limit: 10,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('应该在用户名太短时验证失败', async () => {
      // Arrange
      const dto = plainToClass(TestBaseAuthDto, {
        username: 'ab', // 小于最小长度3
        page: 1,
        limit: 10,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('username');
    });

    it('应该在用户名太长时验证失败', async () => {
      // Arrange
      const dto = plainToClass(TestBaseAuthDto, {
        username: 'a'.repeat(AUTH_VALIDATION_CONSTANTS.USERNAME_MAX_LENGTH + 1), // 超过最大长度
        page: 1,
        limit: 10,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('username');
    });

    it('应该在用户名包含非法字符时验证失败', async () => {
      // Arrange
      const dto = plainToClass(TestBaseAuthDto, {
        username: 'test.user', // 包含点号，非法字符
        page: 1,
        limit: 10,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('username');
    });

    it('应该成功验证分页参数', async () => {
      // Arrange
      const dto = plainToClass(TestBaseAuthDto, {
        username: 'testuser',
        page: 2,
        limit: 20,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });
  });

  describe('BasePasswordDto', () => {
    it('应该成功验证有效的密码', async () => {
      // Arrange
      const dto = plainToClass(TestBasePasswordDto, {
        username: 'testuser',
        password: 'Test123!@#',
        page: 1,
        limit: 10,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('应该在密码太短时验证失败', async () => {
      // Arrange
      const dto = plainToClass(TestBasePasswordDto, {
        username: 'testuser',
        password: 'short', // 小于最小长度
        page: 1,
        limit: 10,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'password')).toBe(true);
    });

    it('应该在密码复杂度不够时验证失败', async () => {
      // Arrange
      const dto = plainToClass(TestBasePasswordDto, {
        username: 'testuser',
        password: 'password123', // 缺少大写字母和特殊字符
        page: 1,
        limit: 10,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'password')).toBe(true);
    });
  });

  describe('BaseUserDto', () => {
    it('应该成功验证有效的用户信息', async () => {
      // Arrange
      const dto = plainToClass(TestBaseUserDto, {
        username: 'testuser',
        password: 'Test123!@#',
        email: 'test@example.com',
        page: 1,
        limit: 10,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('应该在邮箱格式无效时验证失败', async () => {
      // Arrange
      const dto = plainToClass(TestBaseUserDto, {
        username: 'testuser',
        password: 'Test123!@#',
        email: 'invalid-email', // 无效邮箱格式
        page: 1,
        limit: 10,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'email')).toBe(true);
    });
  });
});