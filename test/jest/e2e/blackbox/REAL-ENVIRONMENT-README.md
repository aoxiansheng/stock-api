# 真实环境黑盒E2E测试指南

## ⚠️ 重要说明

**现有的blackbox测试文件（除了`real-environment-test.e2e.test.ts`）仍然使用内存服务器，不是真正的黑盒测试。**

如果您需要真正连接到运行中项目的黑盒测试，请使用：
- `real-environment-test.e2e.test.ts` - 真正的黑盒测试
- `jest.blackbox.config.js` - 专用配置

## 🎯 真实环境黑盒测试

### 什么是真实环境黑盒测试？

真实环境黑盒测试是指：
- ✅ 连接到**实际运行**的项目 (http://localhost:3000)
- ✅ 使用**真实的**MongoDB和Redis数据库
- ✅ 使用**真实的**LongPort数据源
- ✅ 通过**HTTP客户端**（axios）发送请求
- ✅ **完全黑盒**：不了解内部实现，只测试API行为

### 与现有E2E测试的区别

| 特性 | 现有E2E测试 | 真实环境黑盒测试 |
|------|-------------|------------------|
| 服务器 | 内存服务器 (TestingModule) | 真实运行的项目 |
| 数据库 | MongoDB内存服务器 | 真实MongoDB (localhost:27017) |
| 缓存 | 测试Redis实例 | 真实Redis (localhost:6379) |
| 数据源 | 模拟或测试数据 | 真实LongPort API |
| 网络 | 内部调用 | 真实HTTP请求 |
| 启动 | 自动启动测试应用 | 需要项目预先运行 |

## 🚀 使用方法

### 步骤1：启动真实项目

```bash
# 确保数据库服务运行
# MongoDB: localhost:27017
# Redis: localhost:6379

# 配置LongPort API凭证
export LONGPORT_APP_KEY=your_app_key
export LONGPORT_APP_SECRET=your_app_secret
export LONGPORT_ACCESS_TOKEN=your_access_token

# 启动项目
bun run dev
```

### 步骤2：验证项目运行

```bash
# 检查项目健康状态
curl http://localhost:3000/api/v1/monitoring/health
```

应该返回类似：
```json
{
  "statusCode": 200,
  "message": "系统健康检查完成",
  "data": {
    "overallHealth": {
      "score": 85,
      "status": "healthy"
    }
  }
}
```

### 步骤3：运行真实环境黑盒测试

```bash
# 运行真实环境黑盒测试

test:blackbox

npx jest --config test/config/jest.blackbox.config.js  authentication-security.e2e.test.ts
npx jest --config test/config/jest.blackbox.config.js  dual-interface-system.e2e.test.ts
npx jest --config test/config/jest.blackbox.config.js  market-awareness-caching.e2e.test.ts //未测试
npx jest --config test/config/jest.blackbox.config.js  monitoring-performance.e2e.test.ts ok
npx jest --config test/config/jest.blackbox.config.js  provider-integration.e2e.test.ts
npx jest --config test/config/jest.blackbox.config.js  real-environment-test.e2e.test.ts ok
npx jest --config test/config/jest.blackbox.config.js  six-component-pipeline.e2e.test.tsok


## 📋 测试内容

### 🔗 项目连接验证
- 验证能够连接到运行中的项目
- 验证连接到真实的MongoDB和Redis
- 验证不是测试环境或内存服务器

### 🎯 真实数据源测试
- 从真实LongPort API获取股票数据
- 验证获得真实的市场数据而非模拟数据
- 测试多个市场的数据获取

### 🔐 真实认证系统测试
- 完整的用户注册→登录→API Key创建流程
- 真实的权限验证和限流控制
- 测试认证在真实环境中的表现

### ⚡ 真实性能基准测试
- 测试真实环境下的响应时间
- 验证系统在实际负载下的性能
- 对比理论性能与实际性能

### 🏥 真实系统监控验证
- 验证监控系统在真实环境中的数据
- 检查健康评分和性能指标的准确性

## ⚠️ 注意事项

### 测试前确认
1. **项目必须运行**：确保 `bun run dev` 已启动项目
2. **数据库可用**：MongoDB和Redis必须运行并可连接
3. **API凭证配置**：LongPort凭证必须有效
4. **端口可用**：确保3000端口被项目占用而非其他服务

### 测试数据管理
- 测试会创建真实的用户和API Key
- 测试结束后会自动清理创建的资源
- 如果测试中断，可能需要手动清理测试数据

### 性能考虑
- 真实环境测试比内存测试慢得多
- 网络延迟和数据库I/O会影响性能
- 建议在独立环境运行，避免影响开发

## 🐛 故障排除

### 连接失败
```
❌ 无法连接到项目，请确保项目正在运行
```
**解决方案**：
1. 检查项目是否运行：`curl http://localhost:3000/api/v1/monitoring/health`
2. 检查项目启动日志是否有错误
3. 确认端口3000没有被其他服务占用

### 认证失败
```
❌ 认证设置失败: 登录失败: 401
```
**解决方案**：
1. 检查数据库连接是否正常
2. 确认用户注册功能正常工作
3. 检查项目的认证中间件配置

### 数据源错误
```
❌ LongPort API调用失败
```
**解决方案**：
1. 验证LongPort API凭证是否正确配置
2. 检查网络连接是否正常
3. 确认LongPort API配额未超限

## 📊 测试报告

测试完成后会生成详细报告：
- 控制台输出：实时测试结果和性能数据
- HTML报告：`test-results/blackbox-test-report.html`

## 🔄 与现有测试的关系

```
测试层次结构：
├── 单元测试 (test:unit) - 测试单个函数/类
├── 集成测试 (test:integration) - 测试模块间集成
├── E2E测试 (test:e2e) - 内存服务器端到端测试
└── 真实环境黑盒测试 - 真实项目黑盒测试 ← 新增
```

真实环境黑盒测试是最接近生产环境的测试方式，补充了现有测试体系的不足。

---

*真实环境黑盒E2E测试 - 连接真实运行项目的完全黑盒验证*