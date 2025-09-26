import { Test, TestingModule } from '@nestjs/testing';
import { PasswordService } from '@auth/services/infrastructure/password.service';
import bcrypt from 'bcrypt';

// 创建一个模拟的统一配置对象
const mockAuthConfig = {
  limits: {
    bcryptSaltRounds: 12,
  },
};

// Mock bcrypt
jest.mock('bcrypt');

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordService,
        {
          provide: 'authUnified',
          useValue: mockAuthConfig,
        },
      ],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('应该成功对密码进行哈希处理', async () => {
      // Arrange
      const password = 'testpassword';
      const hashedPassword = '$2b$12$hashedpassword';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      // Act
      const result = await service.hashPassword(password);

      // Assert
      expect(result).toBe(hashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
    });

    it('应该在bcrypt失败时抛出异常', async () => {
      // Arrange
      const password = 'testpassword';
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Bcrypt error'));

      // Act & Assert
      await expect(service.hashPassword(password)).rejects.toThrow('Bcrypt error');
    });
  });

  describe('comparePassword', () => {
    it('应该成功比较明文密码和哈希密码', async () => {
      // Arrange
      const plainPassword = 'testpassword';
      const hashedPassword = '$2b$12$hashedpassword';
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await service.comparePassword(plainPassword, hashedPassword);

      // Assert
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
    });

    it('应该在密码不匹配时返回false', async () => {
      // Arrange
      const plainPassword = 'wrongpassword';
      const hashedPassword = '$2b$12$hashedpassword';
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await service.comparePassword(plainPassword, hashedPassword);

      // Assert
      expect(result).toBe(false);
    });

    it('应该在bcrypt失败时抛出异常', async () => {
      // Arrange
      const plainPassword = 'testpassword';
      const hashedPassword = '$2b$12$hashedpassword';
      (bcrypt.compare as jest.Mock).mockRejectedValue(new Error('Bcrypt error'));

      // Act & Assert
      await expect(
        service.comparePassword(plainPassword, hashedPassword),
      ).rejects.toThrow('Bcrypt error');
    });
  });
});