# E2E 黑盒测试文档

## 概述

本目录包含智能股票数据处理系统的端到端（E2E）黑盒测试，从真实用户视角验证完整业务流程。

## 测试文件结构

```
test/e2e/
├── E2E_TEST_SCENARIOS.md           # 完整测试场景清单
├── README.md                        # 本文档
├── helpers/                         # 测试辅助工具
│   ├── test-setup.helper.ts        # 测试环境设置
│   └── api-request.helper.ts       # API请求封装
├── 01-auth.e2e-spec.ts             # 认证授权测试
├── 02-core-business-flow.e2e-spec.ts # 核心业务流程测试
└── 03-data-pipeline.e2e-spec.ts    # 数据流管道测试
```

## 环境准备

### 1. 安装依赖

```bash
bun install
```

### 2. 启动必要服务

**MongoDB**:
```bash
# 方式1: 使用Docker
docker run -d -p 27017:27017 --name mongo mongo:latest

# 方式2: 本地MongoDB
mongod --dbpath /path/to/data
```

**Redis**:
```bash
# 方式1: 使用Docker
docker run -d -p 6379:6379 --name redis redis:latest

# 方式2: 本地Redis
redis-server
```

### 3. 配置环境变量

创建 `.env.test` 文件：

```env
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/smart-stock-test
REDIS_URL=redis://localhost:6379
JWT_SECRET=test_jwt_secret_key
LONGPORT_APP_KEY=your_test_key
LONGPORT_APP_SECRET=your_test_secret
LONGPORT_ACCESS_TOKEN=your_test_token
```

## 运行测试

### 运行所有E2E测试

```bash
# 使用npm
npm run test:e2e

# 或使用jest直接运行
npx jest --config test/jest.e2e.config.js
```

### 运行单个测试文件

```bash
# 认证测试
npx jest --config test/jest.e2e.config.js test/e2e/01-auth.e2e-spec.ts

# 核心业务流程测试
npx jest --config test/jest.e2e.config.js test/e2e/02-core-business-flow.e2e-spec.ts

# 数据流管道测试
npx jest --config test/jest.e2e.config.js test/e2e/03-data-pipeline.e2e-spec.ts


# p95 与并发测试
npx jest --config test/jest.e2e.config.js -- test/e2e/02-perf-p95.e2e-spec.ts
npx jest --config test/jest.e2e.config.js -- test/e2e/02-concurrency.e2e-spec.ts

```

### 运行特定测试套件

```bash
# 只运行认证相关测试
npx jest --config test/jest.e2e.config.js --testNamePattern="Authentication"

# 只运行性能测试
npx jest --config test/jest.e2e.config.js --testNamePattern="性能"
```

### 调试模式

```bash
# 显示详细日志
npx jest --config test/jest.e2e.config.js --verbose

# 单次运行（不重试）
npx jest --config test/jest.e2e.config.js --bail

# 增加超时时间
npx jest --config test/jest.e2e.config.js --testTimeout=60000
```

### 生成测试报告

```bash
# 生成覆盖率报告
npx jest --config test/jest.e2e.config.js --coverage

# 生成HTML报告
npx jest --config test/jest.e2e.config.js --coverage --coverageReporters=html
```

## 测试覆盖范围

### 1. 认证授权测试 (01-auth.e2e-spec.ts)

- ✅ 用户注册、登录、Token刷新
- ✅ JWT Token验证
- ✅ API Key创建和使用
- ✅ 权限控制（ADMIN、DEVELOPER、USER）
- ✅ 速率限制
- ✅ 请求体大小限制

**预期通过率**: > 95%

### 2. 核心业务流程测试 (02-core-business-flow.e2e-spec.ts)

- ✅ 强时效接口（1秒缓存）
- ✅ 弱时效接口（智能检测）
- ✅ 多市场支持（US、HK、CN）
- ✅ 批量查询
- ✅ 缓存策略验证
- ✅ 并发请求处理
- ✅ 性能基准测试

**预期通过率**: > 90%

### 3. 数据流管道测试 (03-data-pipeline.e2e-spec.ts)

- ✅ 符号映射（代码转换）
- ✅ 数据映射（字段映射）
- ✅ 数据转换（格式标准化）
- ✅ 数据存储（Redis + MongoDB）
- ✅ 完整管道流程
- ✅ 数据一致性验证

**预期通过率**: > 90%

## 性能基准

### 响应时间要求

| 接口类型 | P95 | P99 | 说明 |
|---------|-----|-----|------|
| 强时效接口 | < 100ms | < 200ms | 实时交易场景 |
| 弱时效接口 | < 500ms | < 1000ms | 分析决策场景 |
| WebSocket | < 50ms | < 100ms | 实时推送延迟 |

### 吞吐量要求

- **单机QPS** (缓存命中): > 1000
- **单机QPS** (缓存未命中): > 100
- **并发连接数**: > 10,000

## 常见问题

### 1. 测试超时

**问题**: Jest超时错误

**解决方案**:
```bash
# 增加全局超时时间
npx jest --config test/jest.e2e.config.js --testTimeout=60000

# 或在测试文件中设置
jest.setTimeout(60000);
```

### 2. 数据库连接失败

**问题**: MongoDB或Redis连接失败

**解决方案**:
1. 确认服务已启动: `mongod --version`, `redis-cli ping`
2. 检查端口占用: `lsof -i :27017`, `lsof -i :6379`
3. 验证环境变量配置

### 3. API Key创建失败

**问题**: 401 Unauthorized

**解决方案**:
1. 确认JWT Token有效
2. 检查用户权限
3. 验证Redis连接（API Key存储在Redis）

### 4. 测试数据冲突

**问题**: 409 Conflict（数据已存在）

**解决方案**:
1. 使用 `randomString()` 生成唯一标识
2. 测试前清理数据库
3. 使用独立的测试数据库

### 5. 速率限制触发

**问题**: 429 Too Many Requests

**解决方案**:
1. 降低并发测试数量
2. 增加请求间隔: `await wait(100)`
3. 临时调整限流配置

## 测试最佳实践

### 1. 使用辅助工具

```typescript
// ✅ 好的实践
import { createTestApp, registerUser, loginUser } from './helpers/test-setup.helper';
import { APIFactory } from './helpers/api-request.helper';

// ❌ 避免直接使用request
const response = await request(httpServer).post('/api/v1/auth/login');
```

### 2. 清理测试数据

```typescript
afterEach(async () => {
  await cleanupTestData(context);
});

afterAll(async () => {
  await cleanupTestApp(context);
});
```

### 3. 断言标准响应

```typescript
// ✅ 使用标准断言
assertStandardResponse(response);
assertErrorResponse(response);

// ❌ 避免重复断言
expect(response.body).toHaveProperty('success');
expect(response.body).toHaveProperty('data');
// ...
```

### 4. 处理异步操作

```typescript
// ✅ 正确处理异步
await wait(1000); // 等待缓存过期

// ❌ 避免硬编码等待
setTimeout(() => {}, 1000);
```

### 5. 使用描述性测试名称

```typescript
// ✅ 清晰的测试描述
it('应该在交易时间内使用1秒缓存策略', async () => {});

// ❌ 模糊的测试描述
it('test cache', async () => {});
```

## CI/CD集成

### GitHub Actions示例

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:latest
        ports:
          - 27017:27017

      redis:
        image: redis:latest
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          NODE_ENV: test
          MONGODB_URI: mongodb://localhost:27017/test
          REDIS_URL: redis://localhost:6379
```

## 贡献指南

### 添加新测试

1. 在 `E2E_TEST_SCENARIOS.md` 中定义测试场景
2. 创建新的测试文件或扩展现有文件
3. 使用辅助工具简化测试代码
4. 添加适当的断言和错误处理
5. 确保测试可重复运行

### 测试命名规范

- 测试文件: `XX-feature-name.e2e-spec.ts`
- 测试套件: `describe('E2E: Feature Name', ...)`
- 测试用例: `it('应该[期望行为]', ...)`

## 参考资料

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [项目测试场景清单](./E2E_TEST_SCENARIOS.md)
