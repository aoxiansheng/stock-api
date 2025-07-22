/**
 * UserRepository 单元测试
 * 测试用户数据访问层的所有方法
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { UserRepository } from '../../../../../src/auth/repositories/user.repository';
import { User, UserDocument } from '../../../../../src/auth/schemas/user.schema';
import { UserRole } from '../../../../../src/auth/enums/user-role.enum';

describe('UserRepository', () => {
  let repository: UserRepository;
  let userModel: any;

  const mockUser = {
    id: '507f1f77bcf86cd799439011',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashedPassword123',
    role: UserRole.DEVELOPER,
    isActive: true,
  };

  const mockUserDocument = {
    ...mockUser,
    _id: '507f1f77bcf86cd799439011',
    save: jest.fn(),
    exec: jest.fn(),
  } as any;

  beforeEach(async () => {
    // 创建一个可调用的模拟函数，同时具有所需的方法
    type MockModel = {
      (): any;
      find: jest.Mock;
      findById: jest.Mock;
      findOne: jest.Mock;
      exec: jest.Mock;
    };

    const mockUserModel = jest.fn(() => mockUserDocument) as unknown as MockModel;
    // 添加模型所需的方法
    mockUserModel.find = jest.fn();
    mockUserModel.findById = jest.fn();
    mockUserModel.findOne = jest.fn();
    mockUserModel.exec = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    userModel = module.get(getModelToken(User.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('应该成功创建用户', async () => {
      // Arrange
      const userDto = {
        username: mockUser.username,
        email: mockUser.email,
        passwordHash: mockUser.passwordHash,
        role: mockUser.role,
        isActive: mockUser.isActive,
      };

      mockUserDocument.save.mockResolvedValue(mockUserDocument);
      // 直接使用模拟函数，无需 mockImplementation
      
      // Act
      const result = await repository.create(userDto);

      // Assert
      expect(result).toBe(mockUserDocument);
      expect(mockUserDocument.save).toHaveBeenCalledTimes(1);
      expect(userModel).toHaveBeenCalledWith(userDto);
    });

    it('应该使用提供的所有必需字段创建用户', async () => {
      // Arrange
      const userDto = {
        username: 'newuser',
        email: 'newuser@example.com',
        passwordHash: 'newHashedPassword',
        role: UserRole.ADMIN,
        isActive: false,
      };

      mockUserDocument.save.mockResolvedValue(mockUserDocument);
      // 无需 mockImplementation，直接验证调用参数
      
      // Act
      await repository.create(userDto);

      // Assert
      expect(userModel).toHaveBeenCalledWith(userDto);
    });
  });

  describe('findById', () => {
    it('应该根据ID查找用户', async () => {
      // Arrange
      const userId = '507f1f77bcf86cd799439011';
      const mockExec = jest.fn().mockResolvedValue(mockUserDocument);
      
      userModel.findById = jest.fn().mockReturnValue({ exec: mockExec });

      // Act
      const result = await repository.findById(userId);

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith(userId);
      expect(mockExec).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockUserDocument);
    });

    it('应该在用户不存在时返回null', async () => {
      // Arrange
      const userId = '507f1f77bcf86cd799439012';
      const mockExec = jest.fn().mockResolvedValue(null);
      
      userModel.findById = jest.fn().mockReturnValue({ exec: mockExec });

      // Act
      const result = await repository.findById(userId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('应该根据用户名查找用户', async () => {
      // Arrange
      const username = 'testuser';
      const mockExec = jest.fn().mockResolvedValue(mockUserDocument);
      
      userModel.findOne = jest.fn().mockReturnValue({ exec: mockExec });

      // Act
      const result = await repository.findByUsername(username);

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({ username });
      expect(mockExec).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockUserDocument);
    });

    it('应该在用户名不存在时返回null', async () => {
      // Arrange
      const username = 'nonexistent';
      const mockExec = jest.fn().mockResolvedValue(null);
      
      userModel.findOne = jest.fn().mockReturnValue({ exec: mockExec });

      // Act
      const result = await repository.findByUsername(username);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByUsernameOrEmail', () => {
    it('应该根据用户名或邮箱查找用户', async () => {
      // Arrange
      const username = 'testuser';
      const email = 'test@example.com';
      const mockExec = jest.fn().mockResolvedValue(mockUserDocument);
      
      userModel.findOne = jest.fn().mockReturnValue({ exec: mockExec });

      // Act
      const result = await repository.findByUsernameOrEmail(username, email);

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({
        $or: [{ username }, { email }],
      });
      expect(mockExec).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockUserDocument);
    });

    it('应该在用户名和邮箱都不存在时返回null', async () => {
      // Arrange
      const username = 'nonexistent';
      const email = 'nonexistent@example.com';
      const mockExec = jest.fn().mockResolvedValue(null);
      
      userModel.findOne = jest.fn().mockReturnValue({ exec: mockExec });

      // Act
      const result = await repository.findByUsernameOrEmail(username, email);

      // Assert
      expect(result).toBeNull();
    });

    it('应该使用正确的$or查询语法', async () => {
      // Arrange
      const username = 'user1';
      const email = 'user1@test.com';
      const mockExec = jest.fn().mockResolvedValue(mockUserDocument);
      
      userModel.findOne = jest.fn().mockReturnValue({ exec: mockExec });

      // Act
      await repository.findByUsernameOrEmail(username, email);

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({
        $or: [
          { username: 'user1' },
          { email: 'user1@test.com' },
        ],
      });
    });
  });

  describe('findByUsernames', () => {
    it('应该根据用户名列表查找多个用户', async () => {
      // Arrange
      const usernames = ['user1', 'user2', 'user3'];
      const mockUsers = [
        { ...mockUserDocument, username: 'user1' },
        { ...mockUserDocument, username: 'user2' },
        { ...mockUserDocument, username: 'user3' },
      ];
      const mockExec = jest.fn().mockResolvedValue(mockUsers);
      
      userModel.find = jest.fn().mockReturnValue({ exec: mockExec });

      // Act
      const result = await repository.findByUsernames(usernames);

      // Assert
      expect(userModel.find).toHaveBeenCalledWith({
        username: { $in: usernames },
      });
      expect(mockExec).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockUsers);
      expect(result).toHaveLength(3);
    });

    it('应该在没有匹配用户名时返回空数组', async () => {
      // Arrange
      const usernames = ['nonexistent1', 'nonexistent2'];
      const mockExec = jest.fn().mockResolvedValue([]);
      
      userModel.find = jest.fn().mockReturnValue({ exec: mockExec });

      // Act
      const result = await repository.findByUsernames(usernames);

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('应该使用正确的$in查询语法', async () => {
      // Arrange
      const usernames = ['admin', 'developer'];
      const mockExec = jest.fn().mockResolvedValue([]);
      
      userModel.find = jest.fn().mockReturnValue({ exec: mockExec });

      // Act
      await repository.findByUsernames(usernames);

      // Assert
      expect(userModel.find).toHaveBeenCalledWith({
        username: { $in: ['admin', 'developer'] },
      });
    });

    it('应该处理空用户名列表', async () => {
      // Arrange
      const usernames: string[] = [];
      const mockExec = jest.fn().mockResolvedValue([]);
      
      userModel.find = jest.fn().mockReturnValue({ exec: mockExec });

      // Act
      const result = await repository.findByUsernames(usernames);

      // Assert
      expect(userModel.find).toHaveBeenCalledWith({
        username: { $in: [] },
      });
      expect(result).toEqual([]);
    });
  });
});