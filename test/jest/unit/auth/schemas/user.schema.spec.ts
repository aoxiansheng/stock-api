import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { User, UserDocument, UserSchema } from '../../../../../src/auth/schemas/user.schema';
import { UserRole } from '../../../../../src/auth/enums/user-role.enum';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('User Schema', () => {
  let mongoServer: MongoMemoryServer;
  let userModel: Model<UserDocument>;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])
      ],
    }).compile();

    userModel = moduleRef.get<Model<UserDocument>>(getModelToken(User.name));
  });

  afterAll(async () => {
    await moduleRef.close();
    await mongoServer.stop();
  });

  it('应该成功创建用户', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'hashed_password_123456',
      role: UserRole.DEVELOPER,
    };

    const user = new userModel(userData);
    const savedUser = await user.save();

    expect(savedUser.id).toBeDefined();
    expect(savedUser.username).toBe(userData.username);
    expect(savedUser.email).toBe(userData.email);
    expect(savedUser.passwordHash).toBe(userData.passwordHash);
    expect(savedUser.role).toBe(userData.role);
    expect(savedUser.isActive).toBe(true); // 默认值
    expect(savedUser.lastLoginAt).toBeDefined(); // 默认日期
    expect(savedUser.createdAt).toBeDefined();
    expect(savedUser.updatedAt).toBeDefined();
  });

  it('应该正确应用默认值', async () => {
    const minimalUserData = {
      username: 'minimal_user',
      email: 'minimal@example.com',
      passwordHash: 'minimal_hash',
    };

    const user = new userModel(minimalUserData);
    const savedUser = await user.save();

    expect(savedUser.role).toBe(UserRole.DEVELOPER); // 默认角色
    expect(savedUser.isActive).toBe(true);
    expect(savedUser.lastLoginAt).toBeDefined();
    expect(savedUser.refreshToken).toBeUndefined();
  });

  it('应该正确序列化用户对象（toJSON方法）', async () => {
    const userData = {
      username: 'jsonuser',
      email: 'json@example.com',
      passwordHash: 'json_password_hash',
      refreshToken: 'some-refresh-token',
    };

    const user = new userModel(userData);
    const savedUser = await user.save();
    const jsonUser = savedUser.toJSON();

    expect(jsonUser.id).toBeDefined();
    expect(jsonUser._id).toBeUndefined(); // 被移除
    expect(jsonUser.__v).toBeUndefined(); // 被移除
    expect(jsonUser.passwordHash).toBeUndefined(); // 敏感字段被移除
    expect(jsonUser.refreshToken).toBeUndefined(); // 敏感字段被移除
    expect(jsonUser.username).toBe(userData.username);
    expect(jsonUser.email).toBe(userData.email);
  });

  it('应该验证必填字段', async () => {
    const incompleteUser = new userModel({});

    try {
      await incompleteUser.validate();
      fail('应该抛出验证错误');
    } catch (error) {
      expect(error.errors.username).toBeDefined();
      expect(error.errors.email).toBeDefined();
      expect(error.errors.passwordHash).toBeDefined();
    }
  });

  it('应该验证用户名长度限制', async () => {
    const tooShortUsername = new userModel({
      username: 'ab', // 少于最小长度3
      email: 'short@example.com',
      passwordHash: 'password_hash',
    });

    const tooLongUsername = new userModel({
      username: 'a'.repeat(51), // 超过最大长度50
      email: 'long@example.com',
      passwordHash: 'password_hash',
    });

    try {
      await tooShortUsername.validate();
      fail('应该对短用户名抛出验证错误');
    } catch (error) {
      expect(error.errors.username).toBeDefined();
    }

    try {
      await tooLongUsername.validate();
      fail('应该对长用户名抛出验证错误');
    } catch (error) {
      expect(error.errors.username).toBeDefined();
    }
  });

  it('应该验证电子邮件的唯一性', async () => {
    // 创建第一个用户
    const firstUser = new userModel({
      username: 'uniqueuser1',
      email: 'duplicate@example.com',
      passwordHash: 'password_hash',
    });
    await firstUser.save();

    // 尝试创建具有相同电子邮件的用户
    const duplicateUser = new userModel({
      username: 'uniqueuser2',
      email: 'duplicate@example.com', // 重复的电子邮件
      passwordHash: 'password_hash',
    });

    try {
      await duplicateUser.save();
      fail('应该抛出唯一性验证错误');
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.code).toBe(11000); // MongoDB 唯一性约束错误代码
    }
  });

  it('应该验证用户名的唯一性', async () => {
    // 创建第一个用户
    const firstUser = new userModel({
      username: 'duplicateusername',
      email: 'unique1@example.com',
      passwordHash: 'password_hash',
    });
    await firstUser.save();

    // 尝试创建具有相同用户名的用户
    const duplicateUser = new userModel({
      username: 'duplicateusername', // 重复的用户名
      email: 'unique2@example.com',
      passwordHash: 'password_hash',
    });

    try {
      await duplicateUser.save();
      fail('应该抛出唯一性验证错误');
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.code).toBe(11000); // MongoDB 唯一性约束错误代码
    }
  });

  it('应该支持所有用户角色枚举值', async () => {
    const userRoles = Object.values(UserRole);
    
    for (const role of userRoles) {
      const userData = {
        username: `role_user_${role}`,
        email: `role_${role}@example.com`,
        passwordHash: 'password_hash',
        role: role,
      };

      const user = new userModel(userData);
      const savedUser = await user.save();
      
      expect(savedUser.role).toBe(role);
    }
  });

  it('应该创建索引', async () => {
    const indexes = await userModel.collection.indexes();
    
    // 查找角色索引
    const roleIndex = indexes.find(index => 
      index.key && Object.keys(index.key).includes('role'));
    expect(roleIndex).toBeDefined();
    
    // 查找活跃状态索引
    const activeIndex = indexes.find(index => 
      index.key && Object.keys(index.key).includes('isActive'));
    expect(activeIndex).toBeDefined();
    
    // 查找唯一索引
    const usernameIndex = indexes.find(index => 
      index.key && Object.keys(index.key).includes('username') && index.unique);
    expect(usernameIndex).toBeDefined();
    
    const emailIndex = indexes.find(index => 
      index.key && Object.keys(index.key).includes('email') && index.unique);
    expect(emailIndex).toBeDefined();
  });
}); 