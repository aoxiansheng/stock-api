# 测试基础设施实用示例

## 📚 完整示例集合

本文档提供了各种测试场景的完整可运行示例，直接复制即可使用。

## 🏗️ 场景1: 模块完整性测试

### 适用场景
- 测试NestJS模块的依赖注入配置
- 验证所有提供者是否正确注册
- 检查模块导入/导出是否正确

### 完整示例：AuthModule测试

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthModule } from '@auth/module/auth.module';
import { UnitTestSetup } from '@test/testbasic/setup/unit-test-setup';

// Services to validate
import { AuthFacadeService } from '@auth/services/facade/auth-facade.service';
import { UserAuthenticationService } from '@auth/services/domain/user-authentication.service';
import { TokenService } from '@auth/services/infrastructure/token.service';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';

describe('AuthModule Integration Test', () => {
  let module: TestingModule;
  let testContext: any;

  beforeAll(async () => {
    // 创建包含完整依赖的测试上下文
    testContext = await UnitTestSetup.createTestContext(async () => {
      return await UnitTestSetup.createAuthTestModule({
        imports: [AuthModule],
      });
    });

    await testContext.setup();
    module = testContext.getModule();
  });

  afterAll(async () => {
    await testContext.cleanup();
  });

  describe('模块编译', () => {
    it('应该成功编译模块', () => {
      expect(module).toBeDefined();
      UnitTestSetup.validateModuleCompilation(module);
    });
  });

  describe('核心服务提供', () => {
    it('应该提供AuthFacadeService', () => {
      testContext.validateService(AuthFacadeService, AuthFacadeService);
    });

    it('应该提供UserAuthenticationService', () => {
      testContext.validateService(UserAuthenticationService, UserAuthenticationService);
    });

    it('应该提供TokenService', () => {
      testContext.validateService(TokenService, TokenService);
    });
  });

  describe('Guards和中间件', () => {
    it('应该提供JwtAuthGuard', () => {
      testContext.validateService(JwtAuthGuard, JwtAuthGuard);
    });
  });

  describe('配置验证', () => {
    it('应该有正确的JWT配置', () => {
      const configService = UnitTestSetup.getConfigService(module);
      expect(configService.get('JWT_SECRET')).toBe('test-jwt-secret-key-for-testing-only');
      expect(configService.get('JWT_EXPIRES_IN')).toBe('24h');
    });

    it('应该有正确的Auth统一配置', () => {
      const authConfig = testContext.getService('authUnified');
      expect(authConfig).toBeDefined();
      expect(authConfig.cache).toBeDefined();
      expect(authConfig.limits).toBeDefined();
    });
  });

  describe('服务间集成', () => {
    it('应该允许服务间正常交互', async () => {
      const authFacade = testContext.getService(AuthFacadeService);
      const userAuth = testContext.getService(UserAuthenticationService);

      expect(authFacade).toBeDefined();
      expect(userAuth).toBeDefined();
      // 这里可以测试实际的服务交互
    });
  });
});
```

## 🔧 场景2: 依赖Redis的服务测试

### 适用场景
- 服务使用`@InjectRedis()`注入Redis
- 需要测试缓存逻辑
- 需要验证Redis操作

### 完整示例：CacheService测试

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TestCacheModule } from '@test/testbasic/modules/test-cache.module';
import { CacheService } from '@cache/services/cache.service';
import { Redis } from 'ioredis';

describe('CacheService with Redis Dependencies', () => {
  let service: CacheService;
  let module: TestingModule;
  let redisMock: jest.Mocked<Redis>;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [TestCacheModule], // 提供Redis Mock
      providers: [CacheService],
    }).compile();

    service = module.get<CacheService>(CacheService);
    redisMock = module.get('default_IORedisModuleConnectionToken');
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  describe('基本缓存操作', () => {
    it('应该能设置和获取缓存值', async () => {
      const key = 'test:key';
      const value = 'test-value';

      // 设置缓存
      await service.set(key, value);

      // 验证Redis调用
      expect(redisMock.set).toHaveBeenCalledWith(key, value, 'EX', expect.any(Number));

      // 获取缓存
      redisMock.get.mockResolvedValue(value);
      const result = await service.get(key);

      expect(redisMock.get).toHaveBeenCalledWith(key);
      expect(result).toBe(value);
    });

    it('应该能删除缓存', async () => {
      const key = 'test:key';

      await service.delete(key);

      expect(redisMock.del).toHaveBeenCalledWith(key);
    });

    it('应该能处理批量操作', async () => {
      const keys = ['key1', 'key2', 'key3'];
      const values = ['value1', 'value2', 'value3'];

      await service.mset(keys, values);

      expect(redisMock.mset).toHaveBeenCalled();
    });
  });

  describe('容错处理', () => {
    it('应该处理Redis连接失败', async () => {
      redisMock.get.mockRejectedValue(new Error('Connection failed'));

      const result = await service.safeGet('test:key');

      expect(result).toBeNull();
      // 验证错误日志被记录
    });

    it('应该在故障时使用默认值', async () => {
      redisMock.get.mockRejectedValue(new Error('Redis error'));

      const result = await service.safeGetOrSet('test:key', async () => 'fallback', {});

      expect(result).toBe('fallback');
    });
  });

  describe('TTL和过期处理', () => {
    it('应该正确设置TTL', async () => {
      const key = 'test:key';
      const value = 'test-value';
      const ttl = 300;

      await service.set(key, value, { ttl });

      expect(redisMock.set).toHaveBeenCalledWith(key, value, 'EX', ttl);
    });

    it('应该能检查键是否存在', async () => {
      const key = 'test:key';
      redisMock.exists.mockResolvedValue(1);

      const exists = await service.exists(key);

      expect(redisMock.exists).toHaveBeenCalledWith(key);
      expect(exists).toBe(true);
    });
  });
});
```

## 🎭 场景3: EventEmitter依赖的服务测试

### 适用场景
- 服务使用EventEmitter2发布/订阅事件
- 需要测试事件流
- 需要验证事件处理逻辑

### 完整示例：事件驱动服务测试

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TestCacheModule } from '@test/testbasic/modules/test-cache.module';
import { AuthEventNotificationService } from '@auth/services/domain/notification.service';

describe('AuthEventNotificationService with EventEmitter', () => {
  let service: AuthEventNotificationService;
  let eventEmitter: any;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [TestCacheModule], // 包含EventEmitter Mock
      providers: [AuthEventNotificationService],
    }).compile();

    service = module.get<AuthEventNotificationService>(AuthEventNotificationService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    // 清理EventEmitter Mock状态
    eventEmitter._clearEvents();
  });

  describe('事件发布', () => {
    it('应该发布登录成功事件', async () => {
      const userId = 'user123';
      const loginData = { timestamp: new Date(), ip: '127.0.0.1' };

      await service.publishLoginSuccess(userId, loginData);

      // 验证事件被发布
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'auth.login.success',
        expect.objectContaining({
          userId,
          ...loginData,
        })
      );
    });

    it('应该发布登录失败事件', async () => {
      const loginAttempt = { username: 'testuser', ip: '127.0.0.1', reason: 'invalid_password' };

      await service.publishLoginFailure(loginAttempt);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'auth.login.failure',
        expect.objectContaining(loginAttempt)
      );
    });
  });

  describe('事件监听', () => {
    it('应该监听用户锁定事件', async () => {
      const userId = 'user123';
      const lockReason = 'too_many_attempts';

      // 设置监听器
      const handler = jest.fn();
      eventEmitter.on('auth.user.locked', handler);

      // 触发事件
      await service.handleUserLocked(userId, lockReason);

      // 验证处理器被调用
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          reason: lockReason,
        })
      );
    });

    it('应该处理批量事件', async () => {
      const events = [
        { type: 'login', userId: 'user1' },
        { type: 'logout', userId: 'user2' },
        { type: 'register', userId: 'user3' },
      ];

      await service.publishBatchEvents(events);

      // 验证所有事件都被发布
      expect(eventEmitter.emit).toHaveBeenCalledTimes(events.length);
      events.forEach((event, index) => {
        expect(eventEmitter.emit).toHaveBeenNthCalledWith(
          index + 1,
          `auth.${event.type}`,
          expect.objectContaining({ userId: event.userId })
        );
      });
    });
  });

  describe('异步事件处理', () => {
    it('应该等待异步事件处理完成', async () => {
      const handler = jest.fn().mockImplementation(async () => {
        return new Promise(resolve => setTimeout(resolve, 100));
      });

      eventEmitter.on('auth.async.event', handler);

      const startTime = Date.now();
      await service.publishAsyncEvent('test-data');
      const endTime = Date.now();

      expect(handler).toHaveBeenCalled();
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });

    it('应该处理事件处理器错误', async () => {
      const errorHandler = jest.fn().mockRejectedValue(new Error('Handler error'));
      eventEmitter.on('auth.error.event', errorHandler);

      // 应该不抛出异常
      await expect(service.publishErrorEvent('test')).resolves.not.toThrow();
      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe('事件流测试', () => {
    it('应该正确处理事件链', async () => {
      const events = [];

      // 设置事件链监听器
      eventEmitter.on('auth.step1', (data) => {
        events.push('step1');
        eventEmitter.emit('auth.step2', data);
      });

      eventEmitter.on('auth.step2', (data) => {
        events.push('step2');
        eventEmitter.emit('auth.step3', data);
      });

      eventEmitter.on('auth.step3', (data) => {
        events.push('step3');
      });

      // 启动事件链
      eventEmitter.emit('auth.step1', { data: 'test' });

      // 验证事件链完整执行
      expect(events).toEqual(['step1', 'step2', 'step3']);
    });
  });
});
```

## 🏛️ 场景4: 数据库模型相关测试

### 适用场景
- 服务使用`@InjectModel()`注入Mongoose模型
- 需要测试数据库操作逻辑
- 需要验证模型交互

### 完整示例：Repository模式测试

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserRepository } from '@auth/repositories/user.repository';
import { UserFactory } from '@test/testbasic/factories/user.factory';
import { TestDatabaseModule } from '@test/testbasic/modules/test-database.module';

describe('UserRepository with MongoDB Dependencies', () => {
  let repository: UserRepository;
  let userModel: jest.Mocked<Model<any>>;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [TestDatabaseModule], // 提供MongoDB Mock
      providers: [
        UserRepository,
        {
          provide: getModelToken('User'),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            findByIdAndDelete: jest.fn(),
            countDocuments: jest.fn(),
            aggregate: jest.fn(),
            exec: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    userModel = module.get(getModelToken('User'));
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  describe('用户查询操作', () => {
    it('应该根据ID查找用户', async () => {
      const userId = new Types.ObjectId();
      const mockUser = UserFactory.createMockUser({ _id: userId });

      userModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      const result = await repository.findById(userId.toString());

      expect(userModel.findById).toHaveBeenCalledWith(userId.toString());
      expect(result).toEqual(mockUser);
    });

    it('应该根据用户名查找用户', async () => {
      const username = 'testuser';
      const mockUser = UserFactory.createMockUser({ username });

      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      const result = await repository.findByUsername(username);

      expect(userModel.findOne).toHaveBeenCalledWith({ username });
      expect(result).toEqual(mockUser);
    });

    it('应该支持分页查询', async () => {
      const mockUsers = UserFactory.createMockUsers(5);
      const page = 1;
      const limit = 10;

      userModel.find.mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUsers),
      } as any);

      userModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(5),
      } as any);

      const result = await repository.findWithPagination(page, limit);

      expect(userModel.find).toHaveBeenCalled();
      expect(result.users).toEqual(mockUsers);
      expect(result.total).toBe(5);
      expect(result.page).toBe(page);
      expect(result.limit).toBe(limit);
    });
  });

  describe('用户创建操作', () => {
    it('应该创建新用户', async () => {
      const userData = UserFactory.createMockRegistrationData();
      const createdUser = UserFactory.createMockUser(userData);

      userModel.create.mockResolvedValue(createdUser as any);

      const result = await repository.create(userData);

      expect(userModel.create).toHaveBeenCalledWith(userData);
      expect(result).toEqual(createdUser);
    });

    it('应该处理创建时的唯一性约束', async () => {
      const userData = UserFactory.createMockRegistrationData();
      const duplicateError = new Error('Duplicate key error');
      (duplicateError as any).code = 11000;

      userModel.create.mockRejectedValue(duplicateError);

      await expect(repository.create(userData)).rejects.toThrow('User already exists');
    });
  });

  describe('用户更新操作', () => {
    it('应该更新用户信息', async () => {
      const userId = new Types.ObjectId();
      const updateData = UserFactory.createMockUpdateData();
      const updatedUser = UserFactory.createMockUser({ _id: userId, ...updateData });

      userModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedUser),
      } as any);

      const result = await repository.update(userId.toString(), updateData);

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        userId.toString(),
        updateData,
        { new: true }
      );
      expect(result).toEqual(updatedUser);
    });

    it('应该处理用户不存在的情况', async () => {
      const userId = new Types.ObjectId();
      const updateData = UserFactory.createMockUpdateData();

      userModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(repository.update(userId.toString(), updateData))
        .rejects.toThrow('User not found');
    });
  });

  describe('复杂查询操作', () => {
    it('应该支持聚合查询', async () => {
      const aggregationResult = [
        { _id: 'admin', count: 5 },
        { _id: 'developer', count: 15 },
      ];

      userModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(aggregationResult),
      } as any);

      const result = await repository.getUserRoleStatistics();

      expect(userModel.aggregate).toHaveBeenCalledWith([
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
      expect(result).toEqual(aggregationResult);
    });

    it('应该支持条件查询', async () => {
      const filters = { role: 'admin', status: 'active' };
      const mockUsers = UserFactory.createMockUsers(3, filters);

      userModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUsers),
      } as any);

      const result = await repository.findByFilters(filters);

      expect(userModel.find).toHaveBeenCalledWith(filters);
      expect(result).toEqual(mockUsers);
    });
  });
});
```

## 🧪 场景5: 纯函数和工具类测试

### 适用场景
- 测试不依赖外部服务的纯函数
- 工具类方法测试
- 格式化、验证函数测试

### 完整示例：工具函数测试

```typescript
// 无需基础设施的简单测试
import {
  formatCurrency,
  validateEmail,
  generateApiKey,
  parseUserRole,
  sanitizeInput
} from '@common/utils/format.utils';
import { UserRole } from '@auth/enums/user-role.enum';
import { TEST_CONSTANTS } from '@test/testbasic/setup/test-constants';

describe('格式化工具函数', () => {
  describe('formatCurrency', () => {
    it('应该正确格式化货币', () => {
      expect(formatCurrency(123.45)).toBe('$123.45');
      expect(formatCurrency(1000)).toBe('$1,000.00');
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('应该处理负数', () => {
      expect(formatCurrency(-123.45)).toBe('-$123.45');
    });

    it('应该处理大数字', () => {
      expect(formatCurrency(1234567.89)).toBe('$1,234,567.89');
    });
  });

  describe('validateEmail', () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.co.uk',
      'firstname+lastname@example.com',
    ];

    const invalidEmails = [
      'invalid-email',
      '@domain.com',
      'user@',
      'user@domain',
      '',
    ];

    it.each(validEmails)('应该验证有效邮箱: %s', (email) => {
      expect(validateEmail(email)).toBe(true);
    });

    it.each(invalidEmails)('应该拒绝无效邮箱: %s', (email) => {
      expect(validateEmail(email)).toBe(false);
    });

    it('应该使用正确的正则表达式', () => {
      const email = 'test@example.com';
      expect(TEST_CONSTANTS.PATTERNS.EMAIL.test(email)).toBe(true);
    });
  });

  describe('generateApiKey', () => {
    it('应该生成正确格式的API Key', () => {
      const apiKey = generateApiKey();

      expect(apiKey).toMatch(TEST_CONSTANTS.PATTERNS.API_KEY);
      expect(apiKey).toHaveLength(36 + 8); // ak_live_ + 32字符
    });

    it('应该生成唯一的API Key', () => {
      const keys = new Set();
      for (let i = 0; i < 100; i++) {
        keys.add(generateApiKey());
      }
      expect(keys.size).toBe(100); // 所有key都应该是唯一的
    });

    it('应该支持不同前缀', () => {
      const testKey = generateApiKey('test');
      expect(testKey).toMatch(/^ak_test_[a-zA-Z0-9]{32}$/);
    });
  });

  describe('parseUserRole', () => {
    it('应该正确解析有效角色', () => {
      expect(parseUserRole('admin')).toBe(UserRole.ADMIN);
      expect(parseUserRole('developer')).toBe(UserRole.DEVELOPER);
    });

    it('应该处理大小写', () => {
      expect(parseUserRole('ADMIN')).toBe(UserRole.ADMIN);
      expect(parseUserRole('Admin')).toBe(UserRole.ADMIN);
    });

    it('应该对无效角色返回默认值', () => {
      expect(parseUserRole('invalid')).toBe(UserRole.DEVELOPER);
      expect(parseUserRole('')).toBe(UserRole.DEVELOPER);
      expect(parseUserRole(null)).toBe(UserRole.DEVELOPER);
    });

    it('应该使用常量验证角色', () => {
      expect(Object.values(TEST_CONSTANTS.USER_ROLES)).toContain('admin');
      expect(Object.values(TEST_CONSTANTS.USER_ROLES)).toContain('developer');
    });
  });

  describe('sanitizeInput', () => {
    it('应该移除危险字符', () => {
      const dangerous = '<script>alert("xss")</script>';
      const sanitized = sanitizeInput(dangerous);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
    });

    it('应该保留安全内容', () => {
      const safe = 'Hello World 123';
      expect(sanitizeInput(safe)).toBe(safe);
    });

    it('应该处理特殊字符', () => {
      const input = 'user@domain.com & company';
      const output = sanitizeInput(input);
      expect(output).toContain('user@domain.com');
      expect(output).toContain('company');
    });

    it('应该限制长度', () => {
      const longInput = 'a'.repeat(20000);
      const output = sanitizeInput(longInput);
      expect(output.length).toBeLessThanOrEqual(TEST_CONSTANTS.DATA_SIZES.LARGE);
    });
  });
});

describe('DTO验证测试', () => {
  // DTO类测试示例
  class CreateUserDto {
    username: string;
    email: string;
    role: UserRole;
  }

  it('应该创建有效的DTO', () => {
    const dto = new CreateUserDto();
    dto.username = 'testuser';
    dto.email = 'test@example.com';
    dto.role = UserRole.DEVELOPER;

    expect(dto.username).toBe('testuser');
    expect(dto.email).toBe('test@example.com');
    expect(dto.role).toBe(UserRole.DEVELOPER);
  });

  it('应该使用工厂数据', () => {
    const userData = UserFactory.createMockRegistrationData();

    const dto = new CreateUserDto();
    dto.username = userData.username;
    dto.email = userData.email;
    dto.role = userData.role;

    expect(dto.username).toBe(userData.username);
    expect(dto.email).toBe(userData.email);
    expect(dto.role).toBe(userData.role);
  });
});
```

## 🎯 总结：选择正确的测试方法

### 快速参考表

| 测试目标 | 示例代码特征 | 推荐方法 | 关键要点 |
|---------|-------------|---------|---------|
| **模块测试** | `@Module({...})` | `UnitTestSetup.createXxxTestModule()` | 完整依赖图验证 |
| **Redis服务** | `@InjectRedis()` | `TestCacheModule` | Redis操作Mock |
| **事件服务** | `EventEmitter2` | `TestCacheModule` | 事件流验证 |
| **数据库服务** | `@InjectModel()` | 手动Mock + TestDatabaseModule | 模型操作验证 |
| **纯函数** | `export function` | 直接Jest | 无依赖，快速测试 |
| **DTO类** | `class XxxDto` | 直接实例化 | 结构验证 |

### 记住核心原则

1. **简单优先**：从最简单的测试方法开始
2. **按需升级**：遇到复杂依赖时才使用基础设施
3. **保持一致**：同一模块内使用相同的测试策略
4. **性能考虑**：频繁运行的测试保持轻量级

这些示例涵盖了大部分测试场景，可以直接复制使用并根据具体需求调整。