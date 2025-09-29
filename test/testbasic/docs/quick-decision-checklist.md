# 测试基础设施快速决策检查清单

## 🚦 30秒决策指南

**回答以下问题，快速确定是否需要使用测试基础设施：**

### 第一步：测试类型判断

- [ ] **模块测试** (测试整个NestJS模块) → **使用基础设施**
- [ ] **服务测试** (测试单个服务类) → **继续第二步**
- [ ] **函数测试** (测试纯函数/工具) → **不使用基础设施**
- [ ] **DTO/常量测试** → **不使用基础设施**

### 第二步：依赖检查 (服务测试)

检查你的服务构造函数，如果包含以下任一项：

- [ ] `@InjectRedis()` → **使用 TestCacheModule**
- [ ] `@InjectModel()` (MongoDB) → **使用 TestDatabaseModule**
- [ ] `EventEmitter2` → **使用 TestCacheModule 或 TestAuthModule**
- [ ] `@Inject('authUnified')` → **使用 TestAuthModule**
- [ ] `@Inject('cacheUnified')` → **使用 TestCacheModule**
- [ ] 3个以上依赖注入 → **使用完整基础设施**

### 第三步：复杂度评估

- [ ] 需要测试多个服务交互 → **使用完整基础设施**
- [ ] 需要真实的配置环境 → **使用 TestInfrastructureModule**
- [ ] 只测试单个方法逻辑 → **手动Mock即可**

## 📋 具体场景对照表

| 测试场景 | 推荐方案 | 启动时间 | 复杂度 |
|---------|---------|---------|-------|
| **AuthModule完整测试** | `UnitTestSetup.createAuthTestModule()` | ~3s | 低 |
| **CacheService测试** | `TestCacheModule` | ~1s | 低 |
| **纯Redis操作测试** | `redisMockFactory()` | ~0.1s | 中 |
| **格式化函数测试** | 直接Jest | ~0.01s | 低 |
| **多模块集成测试** | 完整基础设施 | ~3s | 低 |
| **DTO验证测试** | 直接Jest | ~0.01s | 低 |

## 🎯 代码模式识别

### ✅ 需要基础设施的代码模式

```typescript
// 模式1: 复杂依赖注入
@Injectable()
export class ComplexService {
  constructor(
    @InjectRedis() private redis: Redis,
    @InjectModel('User') private userModel: Model<User>,
    private eventEmitter: EventEmitter2,
    @Inject('authUnified') private authConfig: AuthConfig,
  ) {}
}
// 👆 使用: UnitTestSetup.createAuthTestModule()
```

```typescript
// 模式2: 模块导入多个外部依赖
@Module({
  imports: [
    CacheModule,      // 需要Redis
    AuthModule,       // 需要完整Auth配置
    MongooseModule,   // 需要MongoDB
  ],
})
export class YourModule {}
// 👆 使用: 完整基础设施
```

```typescript
// 模式3: 配置驱动的服务
@Injectable()
export class ConfigDrivenService {
  constructor(
    @Inject('cacheUnified') private cacheConfig: CacheConfig,
    private configService: ConfigService,
  ) {
    const ttl = this.cacheConfig.defaultTtl; // 需要真实配置
  }
}
// 👆 使用: TestInfrastructureModule
```

### ❌ 不需要基础设施的代码模式

```typescript
// 模式1: 纯函数
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
// 👆 使用: 直接Jest测试

// 模式2: 简单类验证
export class CreateUserDto {
  @IsString()
  username: string;

  @IsEmail()
  email: string;
}
// 👆 使用: 直接实例化测试

// 模式3: 常量/枚举
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}
// 👆 使用: 直接测试值
```

```typescript
// 模式4: 简单依赖的服务
@Injectable()
export class SimpleService {
  constructor(private logger: Logger) {} // 只有Logger依赖

  process(data: string): string {
    this.logger.log('Processing');
    return data.toUpperCase();
  }
}
// 👆 使用: 手动Mock Logger
```

## 🏃‍♂️ 快速开始模板

### 模板A: 使用完整基础设施

```typescript
import { UnitTestSetup } from '@test/testbasic/setup/unit-test-setup';

describe('YourModule', () => {
  let testContext: any;

  beforeAll(async () => {
    testContext = await UnitTestSetup.createTestContext(async () => {
      return await UnitTestSetup.createAuthTestModule({
        imports: [YourModule],
      });
    });
    await testContext.setup();
  });

  afterAll(() => testContext.cleanup());

  it('works', () => {
    const service = testContext.getService(YourService);
    expect(service).toBeDefined();
  });
});
```

### 模板B: 使用专门模块

```typescript
import { Test } from '@nestjs/testing';
import { TestCacheModule } from '@test/testbasic/modules/test-cache.module';

describe('YourService', () => {
  let service: YourService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [TestCacheModule],
      providers: [YourService],
    }).compile();

    service = module.get(YourService);
  });

  it('works', () => {
    expect(service).toBeDefined();
  });
});
```

### 模板C: 直接测试

```typescript
describe('YourFunction', () => {
  it('formats correctly', () => {
    expect(formatCurrency(123.45)).toBe('$123.45');
  });
});
```

## 🚨 常见决策错误

### ❌ 过度工程化
```typescript
// 错误：为简单函数使用完整基础设施
describe('add function', () => {
  let testContext: any; // 😵 不需要

  beforeAll(async () => {
    testContext = await UnitTestSetup.createAuthTestModule(); // 😵 完全多余
  });

  it('adds numbers', () => {
    expect(add(1, 2)).toBe(3); // 😵 简单函数用复杂设施
  });
});
```

### ❌ 基础设施不足
```typescript
// 错误：复杂服务不使用基础设施
describe('ComplexAuthService', () => {
  it('should authenticate', async () => {
    const service = new ComplexAuthService(
      null, // 😵 Redis依赖未Mock
      null, // 😵 EventEmitter依赖未Mock
      null, // 😵 配置依赖未Mock
    );
    // 😵 会立即报错
  });
});
```

### ❌ 混合抽象层级
```typescript
// 错误：在同一测试中混合不同抽象层级
describe('Mixed Test', () => {
  beforeEach(async () => {
    // 😵 既用高层抽象
    testContext = await UnitTestSetup.createAuthTestModule();

    // 😵 又手动创建低层Mock
    const redisMock = jest.fn();

    // 😵 造成冲突和混乱
  });
});
```

## 🎯 最终决策公式

```
if (isModuleTest) {
  use UnitTestSetup.createXxxTestModule()
} else if (hasExternalDependencies) {
  use TestXxxModule
} else if (isPureFunction || isDTO) {
  use direct Jest
} else {
  use manual mocking
}
```

**记住：从简单开始，需要时再升级到更复杂的基础设施！**