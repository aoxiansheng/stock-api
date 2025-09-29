# 测试基础设施概览

## 📁 目录结构

```
test/testbasic/                     # 测试基础设施根目录
├── docs/                          # 📚 文档目录
│   ├── test-infrastructure-guide.md      # 完整使用指南
│   ├── quick-decision-checklist.md       # 快速决策清单
│   ├── testing-examples.md               # 实用示例集合
│   └── infrastructure-overview.md        # 本概览文档
│
├── modules/                       # 🏗️ 测试模块 (Layer 2)
│   ├── test-infrastructure.module.ts     # 全局基础设施模块
│   ├── test-cache.module.ts             # Cache模块测试专用
│   ├── test-auth.module.ts              # Auth模块测试专用
│   └── test-database.module.ts          # Database模块测试专用
│
├── mocks/                         # 🎭 Mock工厂 (Layer 3)
│   ├── redis.mock.ts                    # Redis Mock (50+命令)
│   ├── event-emitter.mock.ts            # EventEmitter2 Mock
│   ├── mongodb.mock.ts                  # MongoDB/Mongoose Mock
│   └── index.ts                         # Mock导出汇总
│
├── factories/                     # 🏭 数据工厂 (Layer 4)
│   ├── user.factory.ts                  # 用户测试数据生成
│   ├── apikey.factory.ts                # API Key测试数据生成
│   ├── cache.factory.ts                 # 缓存测试数据生成
│   └── index.ts                         # 工厂导出汇总
│
├── setup/                         # ⚙️ 测试工具 (Layer 4)
│   ├── unit-test-setup.ts               # 主要测试设置工具类
│   ├── test-constants.ts                # 测试常量定义
│   └── index.ts                         # 设置工具导出汇总
│
└── config/                        # 🔧 配置文件
    └── jest.unit.config.js              # Jest单元测试配置
```

## 🚀 快速开始

### 1. 导入路径别名

所有测试基础设施都通过 `@test/testbasic/` 路径别名访问：

```typescript
// ✅ 正确的导入方式
import { UnitTestSetup } from '@test/testbasic/setup/unit-test-setup';
import { TestCacheModule } from '@test/testbasic/modules/test-cache.module';
import { UserFactory } from '@test/testbasic/factories/user.factory';
import { redisMockFactory } from '@test/testbasic/mocks/redis.mock';
import { TEST_CONSTANTS } from '@test/testbasic/setup/test-constants';

// ❌ 避免使用相对路径
import { UnitTestSetup } from '../../../setup/unit-test-setup';
```

### 2. 三种使用模式

#### 模式A: 完整基础设施（推荐用于模块测试）
```typescript
import { UnitTestSetup } from '@test/testbasic/setup/unit-test-setup';

const testContext = await UnitTestSetup.createTestContext(async () => {
  return await UnitTestSetup.createAuthTestModule({
    imports: [YourModule],
  });
});
```

#### 模式B: 专门模块（推荐用于特定依赖测试）
```typescript
import { TestCacheModule } from '@test/testbasic/modules/test-cache.module';

const module = await Test.createTestingModule({
  imports: [TestCacheModule],
  providers: [YourService],
}).compile();
```

#### 模式C: 直接Mock（推荐用于简单测试）
```typescript
import { redisMockFactory } from '@test/testbasic/mocks/redis.mock';

const redisMock = redisMockFactory();
```

## 🎯 选择指导

| 测试目标 | 推荐模式 | 导入示例 |
|---------|---------|---------|
| **模块测试** | 完整基础设施 | `@test/testbasic/setup/unit-test-setup` |
| **Cache服务** | TestCacheModule | `@test/testbasic/modules/test-cache.module` |
| **Auth服务** | TestAuthModule | `@test/testbasic/modules/test-auth.module` |
| **数据库服务** | TestDatabaseModule | `@test/testbasic/modules/test-database.module` |
| **纯函数** | 直接测试 | 无需导入基础设施 |

## 📚 文档指引

### 🔍 快速决策（30秒内）
阅读：`test/testbasic/docs/quick-decision-checklist.md`
- 30秒决策树
- 代码模式识别
- 快速开始模板

### 📖 详细指南（完整了解）
阅读：`test/testbasic/docs/test-infrastructure-guide.md`
- 架构原理
- 最佳实践
- 性能考虑
- 故障排查

### 💡 实用示例（复制使用）
阅读：`test/testbasic/docs/testing-examples.md`
- 5大完整场景
- 可运行代码
- 实战技巧

## 🔧 配置说明

### TypeScript路径别名

项目 `tsconfig.json` 中已配置：

```json
{
  "compilerOptions": {
    "paths": {
      "@test/*": ["test/*"],
      "@test-config/*": ["test/testbasic/config/*"]
    }
  }
}
```

### Jest配置

Jest单元测试配置位于：`test/testbasic/config/jest.unit.config.js`

特点：
- 使用现代ts-jest语法
- 支持TypeScript路径别名
- 优化的转换配置
- 30秒超时设置

## 🚨 迁移指南

如果你有使用旧路径的代码，请按以下方式更新：

### 路径映射表

| 旧路径 | 新路径 |
|-------|-------|
| `test/setup/` | `test/testbasic/setup/` |
| `test/modules/` | `test/testbasic/modules/` |
| `test/mocks/` | `test/testbasic/mocks/` |
| `test/factories/` | `test/testbasic/factories/` |
| `test/docs/` | `test/testbasic/docs/` |

### 自动替换命令

```bash
# 在你的测试文件中批量替换导入路径
find test/ -name "*.ts" -type f -exec sed -i '' 's|../../../setup/|@test/testbasic/setup/|g' {} \;
find test/ -name "*.ts" -type f -exec sed -i '' 's|../../../modules/|@test/testbasic/modules/|g' {} \;
find test/ -name "*.ts" -type f -exec sed -i '' 's|../../../mocks/|@test/testbasic/mocks/|g' {} \;
find test/ -name "*.ts" -type f -exec sed -i '' 's|../../../factories/|@test/testbasic/factories/|g' {} \;
```

## ⚡ 性能特点

| 组件 | 启动时间 | 内存占用 | 适用场景 |
|------|---------|---------|---------|
| **完整基础设施** | ~3s | ~50MB | 模块集成测试 |
| **专门模块** | ~1s | ~20MB | 特定依赖测试 |
| **直接Mock** | ~0.1s | ~5MB | 简单服务测试 |
| **纯函数测试** | ~0.01s | ~1MB | 工具函数测试 |

## 🔗 相关链接

- **快速决策**: `test/testbasic/docs/quick-decision-checklist.md`
- **完整指南**: `test/testbasic/docs/test-infrastructure-guide.md`
- **实用示例**: `test/testbasic/docs/testing-examples.md`
- **Jest配置**: `test/testbasic/config/jest.unit.config.js`

---

**记住核心原则：**
1. 使用 `@test/testbasic/` 路径别名
2. 从简单开始，按需升级
3. 参考文档选择合适的抽象层级