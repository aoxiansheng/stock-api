import { Model } from "mongoose";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import {
  User,
  UserDocument,
  UserSchema,
} from "../../../../../src/auth/schemas/user.schema";
import { UserRole } from "../../../../../src/auth/enums/user-role.enum";
import { MongooseModule } from "@nestjs/mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// 进度条工具函数
function createProgressBar(total: number, description: string = '') {
  let current = 0;
  const width = 30;
  const startTime = Date.now();
  
  return {
    update(value?: number) {
      if (value !== undefined) current = value;
      else current++;
      
      // 确保current不超过total
      current = Math.min(current, total);
      
      const percentage = Math.round((current / total) * 100);
      const filled = Math.max(0, Math.min(width, Math.round((current / total) * width)));
      const remaining = Math.max(0, width - filled);
      const bar = '█'.repeat(filled) + '░'.repeat(remaining);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      
      process.stdout.write(`\r${description} [${bar}] ${percentage}% (${current}/${total}) ${elapsed}s`);
      
      if (current >= total) {
        console.log(); // 换行
      }
    },
    
    complete() {
      current = total;
      this.update();
    },
    
    fail(error?: string) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n❌ ${description} 失败 (${elapsed}s)${error ? `: ${error}` : ''}`);
    }
  };
}

describe("User Schema", () => {
  let mongoServer: MongoMemoryServer;
  let moduleRef: TestingModule;
  let userModel: Model<UserDocument>;

  beforeAll(async () => {
    const setupProgress = createProgressBar(5, '🔧 设置测试环境');
    
    try {
      // 创建内存MongoDB实例以避免依赖外部数据库
      console.log('📦 正在创建MongoDB内存服务器...');
      setupProgress.update(1);
      
      mongoServer = await MongoMemoryServer.create({
        binary: {
          version: '5.0.0'
        },
        instance: {
          dbName: 'test-user-schema'
        }
      });
      setupProgress.update(2);
      
      const mongoUri = mongoServer.getUri();
      console.log(`🔗 MongoDB URI: ${mongoUri}`);
      setupProgress.update(3);

      console.log('🔌 正在连接数据库并创建测试模块...');
      moduleRef = await Test.createTestingModule({
        imports: [
          MongooseModule.forRoot(mongoUri),
          MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
        ],
      }).compile();
      setupProgress.update(4);

      userModel = moduleRef.get<Model<UserDocument>>(getModelToken(User.name));
      console.log('🧹 清空测试集合...');
      await userModel.deleteMany({});
      setupProgress.complete();
      console.log('✅ 测试环境设置完成\n');
    } catch (error) {
      setupProgress.fail(error instanceof Error ? error.message : '未知错误');
      throw error;
    }
  }, 30000); // 增加超时时间到30秒

  afterAll(async () => {
    console.log('🧹 正在清理测试环境...');
    const cleanupProgress = createProgressBar(2, '🧹 清理中');
    
    await moduleRef.close();
    cleanupProgress.update(1);
    
    await mongoServer.stop();
    cleanupProgress.complete();
    console.log('✅ 测试环境清理完成');
  }, 15000); // 增加超时时间

  afterEach(async () => {
    // 每次测试后清空集合
    await userModel.deleteMany({});
  });

  it("应该成功创建用户", async () => {
    const userData = {
      username: "testuser",
      email: "test@example.com",
      passwordHash: "hashedpassword123",
      role: UserRole.DEVELOPER,
    };

    const newUser = new userModel(userData);
    const savedUser = await newUser.save();

    expect(savedUser).toBeDefined();
    expect(savedUser.username).toBe(userData.username);
    expect(savedUser.email).toBe(userData.email);
    expect(savedUser.passwordHash).toBe(userData.passwordHash);
    expect(savedUser.role).toBe(userData.role);
  }, 10000);

  it("应该正确应用默认值", async () => {
    const minimalUserData = {
      username: "minimal_user",
      email: "minimal@example.com",
      passwordHash: "minimalpass123",
    };

    const newUser = new userModel(minimalUserData);
    const savedUser = await newUser.save();

    expect(savedUser).toBeDefined();
    expect(savedUser.username).toBe(minimalUserData.username);
    expect(savedUser.email).toBe(minimalUserData.email);
    expect(savedUser.role).toBe(UserRole.DEVELOPER); // 默认值
    expect(savedUser.isActive).toBe(true); // 默认值
    expect(savedUser.lastLoginAt).toBeInstanceOf(Date);
    expect(savedUser.createdAt).toBeInstanceOf(Date);
    expect(savedUser.updatedAt).toBeInstanceOf(Date);
  }, 10000);

  it("应该正确序列化用户对象（toJSON方法）", async () => {
    const userData = {
      username: "jsonuser",
      email: "json@example.com",
      passwordHash: "jsonpassword123",
      refreshToken: "some-refresh-token",
    };

    const newUser = new userModel(userData);
    const savedUser = await newUser.save();
    
    // 调用toJSON方法
    const serializedUser = savedUser.toJSON();
    
    // 验证敏感字段被移除
    expect(serializedUser.id).toBeDefined();
    expect(serializedUser._id).toBeUndefined();
    expect(serializedUser.__v).toBeUndefined();
    expect(serializedUser.passwordHash).toBeUndefined();
    expect(serializedUser.refreshToken).toBeUndefined();
    
    // 验证其他字段正确保留
    expect(serializedUser.username).toBe(userData.username);
    expect(serializedUser.email).toBe(userData.email);
  }, 10000);

  it("应该验证必填字段", async () => {
    console.log('🔍 开始验证必填字段...');
    const validationProgress = createProgressBar(4, '✅ 字段验证');
    
    const incompleteUser = new userModel({});
    // 使用验证函数替代直接保存
    await expect(incompleteUser.validate()).rejects.toThrow();
    validationProgress.update(1);
    
    // 单独验证每个必填字段
    const missingUsername = new userModel({
      email: "test@example.com",
      passwordHash: "password123",
    });
    await expect(missingUsername.validate()).rejects.toThrow();
    validationProgress.update(2);
    
    const missingEmail = new userModel({
      username: "testuser",
      passwordHash: "password123",
    });
    await expect(missingEmail.validate()).rejects.toThrow();
    validationProgress.update(3);
    
    const missingPassword = new userModel({
      username: "testuser",
      email: "test@example.com",
    });
    await expect(missingPassword.validate()).rejects.toThrow();
    validationProgress.complete();
  }, 10000);

  it("应该验证用户名长度限制", async () => {
    // 用户名太短
    const tooShortUsername = new userModel({
      username: "ab", // 少于最小长度3
      email: "short@example.com",
      passwordHash: "password123",
    });
    
    await expect(tooShortUsername.validate()).rejects.toThrow();
    
    // 用户名太长
    const tooLongUsername = new userModel({
      username: "a".repeat(51), // 超过最大长度50
      email: "long@example.com",
      passwordHash: "password123",
    });
    
    await expect(tooLongUsername.validate()).rejects.toThrow();
    
    // 正确长度
    const correctUsername = new userModel({
      username: "validuser",
      email: "valid@example.com",
      passwordHash: "password123",
    });
    
    await expect(correctUsername.validate()).resolves.not.toThrow();
  }, 10000);

  it("应该验证电子邮件的唯一性", async () => {
    // 创建第一个用户
    const firstUser = new userModel({
      username: "uniqueuser1",
      email: "duplicate@example.com",
      passwordHash: "password123",
    });
    
    await firstUser.save();
    
    // 尝试创建具有相同电子邮件的第二个用户
    const secondUser = new userModel({
      username: "uniqueuser2",
      email: "duplicate@example.com", // 相同的电子邮件
      passwordHash: "password123",
    });
    
    // 应该因为唯一性约束而失败
    await expect(secondUser.save()).rejects.toThrow();
  }, 10000);

  it("应该验证用户名的唯一性", async () => {
    // 创建第一个用户
    const firstUser = new userModel({
      username: "duplicateusername",
      email: "user1@example.com",
      passwordHash: "password123",
    });
    
    await firstUser.save();
    
    // 尝试创建具有相同用户名的第二个用户
    const secondUser = new userModel({
      username: "duplicateusername", // 相同的用户名
      email: "user2@example.com",
      passwordHash: "password123",
    });
    
    // 应该因为唯一性约束而失败
    await expect(secondUser.save()).rejects.toThrow();
  }, 10000);

  it("应该支持所有用户角色枚举值", async () => {
    const userRoles = Object.values(UserRole);
    console.log(`👥 测试 ${userRoles.length} 个用户角色...`);
    const roleProgress = createProgressBar(userRoles.length, '👥 角色测试');
    
    let index = 0;
    for (const role of userRoles) {
      const userData = {
        username: `user_${role}`,
        email: `${role}@example.com`,
        passwordHash: "password123",
        role,
      };
      
      const user = new userModel(userData);
      const savedUser = await user.save();
      
      expect(savedUser.role).toBe(role);
      roleProgress.update(++index);
    }
  }, 10000);

  it("应该创建索引", async () => {
    console.log('📊 检查数据库索引...');
    const indexProgress = createProgressBar(4, '📊 索引检查');
    
    const indexes = await userModel.collection.indexes();
    
    // 查找角色索引
    const roleIndex = indexes.find(
      (index) => index.key && index.key.role !== undefined
    );
    expect(roleIndex).toBeDefined();
    indexProgress.update(1);
    
    // 查找isActive索引
    const isActiveIndex = indexes.find(
      (index) => index.key && index.key.isActive !== undefined
    );
    expect(isActiveIndex).toBeDefined();
    indexProgress.update(2);
    
    // 查找email唯一索引
    const emailIndex = indexes.find(
      (index) => index.key && index.key.email !== undefined
    );
    expect(emailIndex).toBeDefined();
    expect(emailIndex.unique).toBe(true);
    indexProgress.update(3);
    
    // 查找username唯一索引
    const usernameIndex = indexes.find(
      (index) => index.key && index.key.username !== undefined
    );
    expect(usernameIndex).toBeDefined();
    expect(usernameIndex.unique).toBe(true);
    indexProgress.complete();
  }, 10000);

  it("应该验证密码最小长度", async () => {
    const shortPasswordUser = new userModel({
      username: "passworduser",
      email: "password@example.com",
      passwordHash: "12345", // 少于最小长度6
    });
    
    await expect(shortPasswordUser.validate()).rejects.toThrow();
    
    const validPasswordUser = new userModel({
      username: "validpassword",
      email: "validpwd@example.com",
      passwordHash: "123456", // 符合最小长度6
    });
    
    await expect(validPasswordUser.validate()).resolves.not.toThrow();
  }, 10000);
});

