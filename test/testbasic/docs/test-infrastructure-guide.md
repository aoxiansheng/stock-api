# 测试基础设施使用指南

## 概述

本项目提供了一套完整的测试基础设施，用于隔离外部依赖、提供标准化Mock和简化测试模块创建。本指南将帮助你判断何时使用以及如何使用这套基础设施。

## 📋 决策树：何时使用测试基础设施

### ✅ 应该使用基础设施的场景

#### 1. 模块级测试 (Module Testing)
- **条件**：测试整个NestJS模块的依赖注入和提供者配置
- **示例**：`AuthModule`, `CacheModule`, `NotificationModule`
- **使用**：`UnitTestSetup.createAuthTestModule()` 或相应的模块测试方法

#### 2. 需要外部依赖的服务测试
- **条件**：服务依赖Redis、MongoDB、EventEmitter等外部服务
- **标识**：构造函数中有 `@InjectRedis()`, `@InjectModel()`, `EventEmitter2` 注入
- **使用**：相应的Test模块 (`TestCacheModule`, `TestAuthModule`)

#### 3. 复杂集成测试
- **条件**：测试多个服务间的交互，需要完整的依赖图
- **示例**：缓存与数据库的配合、认证与权限的联动
- **使用**：`TestInfrastructureModule` + 专门的测试模块

#### 4. 配置驱动的组件测试
- **条件**：组件依赖复杂的配置注入 (`authUnified`, `cacheUnified`)
- **使用**：`TestInfrastructureModule` 提供统一配置

### ❌ 不需要使用基础设施的场景

#### 1. 纯函数/工具类测试
- **条件**：无依赖注入，纯函数逻辑
- **示例**：格式化函数、验证函数、常量
- **推荐**：直接Jest测试，无需基础设施

#### 2. 简单服务单元测试
- **条件**：服务依赖简单，容易Mock
- **示例**：只依赖ConfigService或Logger的服务
- **推荐**：手动Mock依赖

#### 3. DTO/Entity测试
- **条件**：数据结构验证，类验证器测试
- **推荐**：直接实例化测试

#### 4. 快速原型测试
- **条件**：临时验证、快速调试
- **推荐**：简单Jest测试

## 🏗️ 基础设施架构图

```
测试基础设施 (4层架构)
├── Layer 1: TestInfrastructureModule
│   ├── 全局配置管理 (ConfigModule)
│   ├── 环境变量设置 (TEST_ENV_VARS)
│   └── EventEmitter基础服务
│   📁 test/testbasic/modules/test-infrastructure.module.ts
│
├── Layer 2: 专门测试模块
│   ├── TestCacheModule (Redis + EventEmitter Mock)
│   ├── TestAuthModule (完整Auth依赖链)
│   └── TestDatabaseModule (MongoDB Mock)
│   📁 test/testbasic/modules/
│
├── Layer 3: 标准化Mock
│   ├── redisMockFactory (50+ Redis命令)
│   ├── eventEmitterMockFactory (EventEmitter2)
│   └── mongooseMockFactory (MongoDB/Mongoose)
│   📁 test/testbasic/mocks/
│
└── Layer 4: 测试工具
    ├── UnitTestSetup (测试模块创建)
    ├── 数据工厂 (UserFactory, ApiKeyFactory)
    └── 测试常量 (TEST_CONSTANTS)
    📁 test/testbasic/setup/ & test/testbasic/factories/
```

## 🚀 使用方法

### 方法1: 使用预建测试模块 (推荐)

适用于常见的模块测试：

```typescript
import { UnitTestSetup } from '@test/testbasic/setup/unit-test-setup';
import { AuthModule } from '@auth/module/auth.module';

describe('YourModule', () => {
  let testContext: any;

  beforeAll(async () => {
    // 创建Auth相关的测试上下文
    testContext = await UnitTestSetup.createTestContext(async () => {
      return await UnitTestSetup.createAuthTestModule({
        imports: [YourModule],
      });
    });

    await testContext.setup();
  });

  afterAll(async () => {
    await testContext.cleanup();
  });

  it('should create module', () => {
    const module = testContext.getModule();
    expect(module).toBeDefined();
  });

  it('should provide your service', () => {
    const service = testContext.getService(YourService);
    expect(service).toBeDefined();
  });
});
```

### 方法2: 使用专门Mock模块

适用于特定依赖的服务测试：

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TestCacheModule } from '@test/testbasic/modules/test-cache.module';
import { YourService } from './your.service';

describe('YourService', () => {
  let service: YourService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [TestCacheModule],
      providers: [YourService],
    }).compile();

    service = module.get<YourService>(YourService);
  });

  afterEach(async () => {
    await module.close();
  });
});
```

### 方法3: 自定义测试模块

适用于特殊需求：

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TestInfrastructureModule } from '@test/testbasic/modules/test-infrastructure.module';
import { redisMockFactory } from '@test/testbasic/mocks/redis.mock';

describe('CustomTest', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [TestInfrastructureModule],
      providers: [
        {
          provide: 'CUSTOM_REDIS_TOKEN',
          useFactory: redisMockFactory,
        },
        YourCustomService,
      ],
    }).compile();
  });
});
```

## 🎯 最佳实践

### 1. 选择合适的抽象层级

```typescript
// ✅ 好 - 模块级测试使用高层抽象
testContext = await UnitTestSetup.createAuthTestModule();

// ✅ 好 - 服务级测试使用中层抽象
imports: [TestCacheModule]

// ✅ 好 - 特殊需求使用底层Mock
useFactory: redisMockFactory

// ❌ 避免 - 过度工程化简单测试
// 纯函数测试不需要基础设施
```

### 2. 复用测试上下文

```typescript
// ✅ 好 - 复用相同配置的测试上下文
describe('Related Tests', () => {
  let sharedContext: any;

  beforeAll(async () => {
    sharedContext = await UnitTestSetup.createTestContext(/*...*/);
    await sharedContext.setup();
  });

  afterAll(async () => {
    await sharedContext.cleanup();
  });

  describe('Service A', () => { /* 使用 sharedContext */ });
  describe('Service B', () => { /* 使用 sharedContext */ });
});
```

### 3. 使用数据工厂

```typescript
import { UserFactory, ApiKeyFactory } from '@test/testbasic/factories';

// ✅ 好 - 使用工厂生成测试数据
const mockUser = UserFactory.createMockUser();
const adminUser = UserFactory.createAdminUser();
const apiKey = ApiKeyFactory.createValidApiKey();

// ❌ 避免 - 硬编码测试数据
const mockUser = { _id: '123', username: 'test' }; // 不完整、不一致
```

### 4. 配置管理

```typescript
import { TEST_CONSTANTS } from '@test/testbasic/setup/test-constants';

// ✅ 好 - 使用统一常量
expect(response.status).toBe(TEST_CONSTANTS.HTTP_STATUS.OK);
expect(user.role).toBe(TEST_CONSTANTS.USER_ROLES.ADMIN);

// ❌ 避免 - 魔法数字
expect(response.status).toBe(200);
expect(user.role).toBe('admin');
```

## 🔧 可用的测试工具

### UnitTestSetup 方法

```typescript
// 认证模块测试
UnitTestSetup.createAuthTestModule(config)

// 缓存模块测试
UnitTestSetup.createCacheTestModule(config)

// 通用测试上下文
UnitTestSetup.createTestContext(createModuleFn)

// 配置服务获取
UnitTestSetup.getConfigService(module)

// 模块编译验证
UnitTestSetup.validateModuleCompilation(module)
```

### 数据工厂

```typescript
// 用户工厂
UserFactory.createMockUser(overrides?)
UserFactory.createAdminUser(overrides?)
UserFactory.createDeveloperUser(overrides?)
UserFactory.createMockUsers(count, baseOverrides?)

// API Key工厂
ApiKeyFactory.createValidApiKey(overrides?)
ApiKeyFactory.createExpiredApiKey(overrides?)
ApiKeyFactory.createReadOnlyApiKey(overrides?)
```

### Mock工厂

```typescript
// Redis Mock
const redisMock = redisMockFactory();
await redisMock.set('key', 'value');
const value = await redisMock.get('key');

// EventEmitter Mock
const emitterMock = eventEmitterMockFactory();
emitterMock.on('event', callback);
emitterMock.emit('event', data);

// MongoDB Mock
const mongoMock = mongooseMockFactory();
```

## 📊 性能考虑

### 测试启动时间对比

```typescript
// 方法1: 完整基础设施 (~2-3秒启动)
// 适用于: 复杂模块测试、集成测试
testContext = await UnitTestSetup.createAuthTestModule();

// 方法2: 专门模块 (~1-2秒启动)
// 适用于: 特定依赖的服务测试
imports: [TestCacheModule]

// 方法3: 直接Mock (~0.1-0.5秒启动)
// 适用于: 简单服务、单一依赖测试
providers: [{ provide: SomeService, useValue: mockService }]

// 方法4: 无Mock纯测试 (~0.01-0.1秒启动)
// 适用于: 纯函数、工具类测试
// 直接实例化和调用
```

### 选择指导

- **开发阶段**: 使用快速方法 (3、4) 进行快速反馈
- **CI/CD**: 使用完整方法 (1、2) 确保覆盖率
- **调试复杂问题**: 使用完整基础设施 (1) 模拟真实环境

## 🐛 常见问题排查

### 1. 依赖注入失败

**错误**: `Nest can't resolve dependencies of the Service (?,...)`

**解决**:
```typescript
// 检查是否使用了正确的测试模块
imports: [TestCacheModule] // 包含Redis Mock
// 而不是
imports: [CacheModule] // 需要真实Redis
```

### 2. Mock行为不符合预期

**检查**: Mock工厂是否正确配置
```typescript
// ✅ 检查Mock状态
const redisMock = testContext.getService('default_IORedisModuleConnectionToken');
expect(redisMock.set).toHaveBeenCalledWith('key', 'value');

// ✅ 重置Mock状态
jest.clearAllMocks();
```

### 3. 配置值未生效

**检查**: 是否导入了TestInfrastructureModule
```typescript
// ✅ 确保包含基础设施
imports: [TestInfrastructureModule, ...otherModules]
```

### 4. 测试间状态污染

**解决**: 正确的清理
```typescript
afterEach(async () => {
  jest.clearAllMocks();
  // 清理Mock状态
  redisMock._clearData();
  emitterMock._clearEvents();
});
```

## 📝 迁移现有测试

### 步骤1: 评估现有测试

```bash
# 查找需要迁移的测试
grep -r "createTestingModule" test/ --include="*.spec.ts"
grep -r "@InjectRedis\|@InjectModel" src/ --include="*.ts"
```

### 步骤2: 分类迁移

1. **简单服务测试** → 保持现状或使用专门模块
2. **模块测试** → 迁移到 `UnitTestSetup.createXxxTestModule()`
3. **复杂集成测试** → 迁移到完整基础设施

### 步骤3: 验证迁移

```bash
# 运行特定测试确保迁移成功
npm run test:unit:auth
npm run test:unit:cache
```

## 🔄 基础设施更新

当需要扩展基础设施时：

1. **新增Mock**: 在 `test/testbasic/mocks/` 下创建新Mock工厂
2. **新增模块**: 在 `test/testbasic/modules/` 下创建专门测试模块
3. **新增工厂**: 在 `test/testbasic/factories/` 下创建数据工厂
4. **更新指南**: 更新本文档的使用示例

## 🎓 总结

这套测试基础设施的设计原则是：
- **渐进式采用**: 可以逐步迁移，不强制全面使用
- **分层抽象**: 根据需求选择合适的抽象层级
- **标准化**: 提供一致的Mock和数据生成
- **可维护**: 集中管理配置和依赖

选择合适的抽象层级，既能获得测试的便利性，又能保持良好的性能和可维护性。