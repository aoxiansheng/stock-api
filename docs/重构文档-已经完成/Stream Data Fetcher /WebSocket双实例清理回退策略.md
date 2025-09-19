# WebSocket双实例清理回退策略

## 📋 概述

本文档提供 WebSocket 双实例架构清理后的完整回退策略，确保在生产环境出现问题时能够快速、安全地回退到之前的工作状态。

## 🎯 回退策略目标

### 核心目标
- **快速恢复**：5分钟内完成紧急回退
- **零数据丢失**：确保WebSocket连接和数据完整性
- **最小影响**：减少对用户的服务中断
- **可验证性**：每个回退步骤都有验证机制

### 适用场景
1. **Gateway模式故障**：Gateway服务器无法正常工作
2. **性能下降**：新架构导致明显性能问题
3. **连接不稳定**：WebSocket连接频繁断开
4. **业务功能异常**：影响核心业务功能

## 🔄 三层回退机制

### 第一层：特性开关快速回退（推荐）
**回退时间**: 30秒内
**影响范围**: 最小
**适用场景**: 配置问题、功能开关错误

```bash
# 1. 紧急禁用Gateway-only模式
export WS_GATEWAY_ONLY_MODE=false
export WS_ALLOW_LEGACY_FALLBACK=true
export WS_STRICT_MODE=false

# 2. 重启应用服务
pm2 restart newstockapi-backend
# 或 Docker 重启
docker restart newstockapi-backend

# 3. 验证服务状态
curl http://localhost:3000/api/health/websocket
```

### 第二层：代码配置回退（中等影响）
**回退时间**: 2-5分钟
**影响范围**: 中等
**适用场景**: Gateway架构不兼容、深层逻辑问题

### 第三层：完整代码回退（最后手段）
**回退时间**: 5-15分钟
**影响范围**: 最大
**适用场景**: 架构性问题、无法通过配置解决的问题

## 🛠️ 详细回退步骤

### 第一层回退：特性开关控制

#### 步骤1：启用Legacy回退模式
```bash
# 设置环境变量（Docker环境）
docker exec -it newstockapi-backend sh -c '
export WS_GATEWAY_ONLY_MODE=false
export WS_ALLOW_LEGACY_FALLBACK=true
export WS_STRICT_MODE=false
export WS_VALIDATION_MODE=production
'

# 或修改 .env 文件
echo "WS_GATEWAY_ONLY_MODE=false" >> .env
echo "WS_ALLOW_LEGACY_FALLBACK=true" >> .env
echo "WS_STRICT_MODE=false" >> .env
```

#### 步骤2：验证特性开关状态
```bash
# 检查特性开关健康状态
curl -X GET http://localhost:3000/api/v1/monitoring/feature-flags/websocket

# 预期响应
{
  "status": "healthy",
  "flags": {
    "gatewayOnlyMode": false,
    "allowLegacyFallback": true,
    "strictMode": false
  }
}
```

#### 步骤3：重启服务并验证
```bash
# 平滑重启
pm2 reload newstockapi-backend

# 验证WebSocket服务
curl http://localhost:3000/api/health/websocket
curl http://localhost:3000/api/health/stream-data-fetcher
```

### 第二层回退：配置恢复

#### 步骤1：恢复WebSocket服务器提供者配置
```typescript
// 临时恢复双实例支持（紧急情况下）
// 文件：src/core/03-fetching/stream-data-fetcher/providers/websocket-server.provider.ts

export class WebSocketServerProvider {
  private gatewayServer: Server | null = null;
  // 🔄 临时恢复：重新添加server字段
  private server: Server | null = null;

  // 🔄 临时恢复：setServer方法
  setServer(server: Server): void {
    this.server = server;
    this.logger.log("Legacy服务器实例已临时恢复", {
      serverPath: server.path(),
      mode: "emergency_fallback"
    });
  }

  // 🔄 临时恢复：getServer方法支持fallback
  getServer(): Server | null {
    return this.gatewayServer || this.server;
  }
}
```

#### 步骤2：类型检查和编译验证
```bash
# 单文件类型检查
DISABLE_AUTO_INIT=true npm run typecheck:file -- src/core/03-fetching/stream-data-fetcher/providers/websocket-server.provider.ts

# 编译验证
DISABLE_AUTO_INIT=true bun run build
```

#### 步骤3：部署和验证
```bash
# 重新部署
bun run build && pm2 restart newstockapi-backend

# 验证双实例支持
curl http://localhost:3000/api/health/websocket-legacy-support
```

### 第三层回退：完整代码还原

#### 步骤1：Git版本回退
```bash
# 查看最近的提交历史
git log --oneline -10

# 回退到WebSocket清理前的版本
git checkout <pre-cleanup-commit-hash>

# 或创建回退分支
git checkout -b emergency-rollback-websocket <pre-cleanup-commit-hash>
```

#### 步骤2：配置文件恢复
```bash
# 恢复原始配置文件
git checkout <pre-cleanup-commit-hash> -- src/core/03-fetching/stream-data-fetcher/config/
git checkout <pre-cleanup-commit-hash> -- src/core/03-fetching/stream-data-fetcher/providers/
git checkout <pre-cleanup-commit-hash> -- src/core/03-fetching/stream-data-fetcher/services/
```

#### 步骤3：依赖和构建
```bash
# 清理构建缓存
rm -rf dist/ node_modules/.cache/

# 重新安装依赖（如有package.json变更）
bun install

# 完整构建
bun run build

# 验证构建成功
echo $?  # 应该返回 0
```

#### 步骤4：服务重启和验证
```bash
# 停止服务
pm2 stop newstockapi-backend

# 启动服务
pm2 start ecosystem.config.js

# 完整健康检查
curl http://localhost:3000/api/health
curl http://localhost:3000/api/health/websocket
curl http://localhost:3000/api/health/stream-data-fetcher
```

## 🔍 回退验证清单

### 服务健康验证
```bash
# 1. 基础服务检查
curl http://localhost:3000/api/health
# 期望: 200 OK, status: "healthy"

# 2. WebSocket服务检查
curl http://localhost:3000/api/health/websocket
# 期望: 200 OK, WebSocket服务正常

# 3. Stream Data Fetcher检查
curl http://localhost:3000/api/health/stream-data-fetcher
# 期望: 200 OK, 流数据获取器正常

# 4. 连接池状态检查
curl http://localhost:3000/api/v1/monitoring/connection-pool-stats
# 期望: 连接池指标正常

# 5. 实时数据流检查
curl http://localhost:3000/api/v1/stream/test-connection
# 期望: WebSocket连接建立成功
```

### 功能验证测试
```bash
# 1. 股票数据获取测试
curl "http://localhost:3000/api/v1/receiver/get-stock-quote?symbols=700.HK&provider=longport"

# 2. WebSocket连接测试
node test/manual/websocket-connection-test.js

# 3. 限流功能测试
curl -X POST http://localhost:3000/api/v1/test/rate-limit-validation

# 4. 配置系统测试
curl http://localhost:3000/api/v1/config/stream-config-validation
```

### 性能基准验证
```bash
# 1. 响应时间测试
curl -w "Time: %{time_total}s\n" http://localhost:3000/api/v1/receiver/get-stock-quote?symbols=AAPL

# 2. 连接数测试
ss -tuln | grep :3001  # WebSocket端口连接数

# 3. 内存使用检查
ps aux | grep "bun\|node" | grep newstockapi

# 4. CPU使用率检查
top -p $(pgrep -f newstockapi)
```

## 📊 回退监控指标

### 关键监控指标
```yaml
# 服务状态指标
- 服务可用性: >99.9%
- 响应时间: P95 < 200ms
- 错误率: < 0.1%

# WebSocket指标
- 连接成功率: >99%
- 连接稳定性: 断线率 < 1%
- 消息延迟: < 100ms

# 系统资源指标
- CPU使用率: < 70%
- 内存使用率: < 80%
- 连接池使用率: < 85%
```

### 告警触发条件
```bash
# 1. 服务不可用告警
curl http://localhost:3000/api/health | grep -q "healthy" || echo "ALERT: Service Down"

# 2. 错误率告警
ERROR_RATE=$(curl http://localhost:3000/api/v1/monitoring/error-rate | jq '.rate')
if (( $(echo "$ERROR_RATE > 0.001" | bc -l) )); then
  echo "ALERT: High Error Rate: $ERROR_RATE"
fi

# 3. 响应时间告警
RESPONSE_TIME=$(curl -w "%{time_total}" -s -o /dev/null http://localhost:3000/api/health)
if (( $(echo "$RESPONSE_TIME > 1.0" | bc -l) )); then
  echo "ALERT: High Response Time: ${RESPONSE_TIME}s"
fi
```

## 🎛️ 特性开关管理

### 环境变量配置
```bash
# 生产环境安全配置
export WS_GATEWAY_ONLY_MODE=true          # 正常情况下启用
export WS_ALLOW_LEGACY_FALLBACK=false     # 正常情况下禁用
export WS_STRICT_MODE=true                # 严格模式
export WS_VALIDATION_MODE=production      # 生产验证模式

# 紧急回退配置
export WS_GATEWAY_ONLY_MODE=false         # 紧急情况禁用
export WS_ALLOW_LEGACY_FALLBACK=true      # 紧急情况启用
export WS_STRICT_MODE=false               # 允许Legacy代码
export WS_VALIDATION_MODE=production      # 保持生产模式
```

### 动态开关控制（仅开发环境）
```typescript
// 开发环境动态调整
import { WebSocketFeatureFlagsService } from '@core/03-fetching/stream-data-fetcher/config/websocket-feature-flags.config';

// 紧急启用Legacy回退
await featureFlagsService.emergencyEnableLegacyFallback('Gateway服务器不可用');

// 检查健康状态
const health = featureFlagsService.getHealthStatus();
console.log('特性开关状态:', health.status);
```

## 📚 回退决策流程图

```
WebSocket服务异常
    ↓
检查错误类型
    ↓
┌─────────────┬─────────────┬─────────────┐
│  配置错误    │  性能问题    │  架构问题    │
│             │             │             │
│ 第一层回退   │ 第二层回退   │ 第三层回退   │
│ 特性开关    │ 配置恢复    │ 代码还原    │
│ (30秒)     │ (2-5分钟)   │ (5-15分钟)  │
└─────────────┴─────────────┴─────────────┘
    ↓           ↓           ↓
验证服务恢复  → 验证功能正常 → 验证完整系统
    ↓           ↓           ↓
    ✅ 恢复成功 ✅ 恢复成功 ✅ 恢复成功
```

## 🚨 紧急情况联系方式

### 技术支持流程
1. **立即响应**：发现问题后立即执行第一层回退
2. **状态通报**：通知相关技术人员和业务方
3. **问题分析**：详细记录错误信息和系统状态
4. **解决方案**：根据问题类型选择合适的回退层级
5. **验证确认**：确保回退后系统完全恢复正常

### 文档和日志
- **操作日志**：记录每个回退步骤和验证结果
- **错误日志**：保存原始错误信息用于后续分析
- **性能数据**：对比回退前后的性能指标
- **配置快照**：保存回退前的完整配置状态

## 📋 总结

本回退策略提供了三层渐进式回退机制，确保在任何情况下都能快速恢复WebSocket服务的正常运行：

### 🎯 关键优势
1. **分层设计**：根据问题严重程度选择合适的回退方式
2. **快速恢复**：特性开关回退可在30秒内完成
3. **安全可靠**：每个步骤都有验证机制确保恢复效果
4. **详细文档**：提供完整的操作步骤和验证清单

### 🔧 最佳实践
- **优先使用特性开关**：大多数问题都可以通过配置解决
- **逐层升级**：从最小影响的回退方式开始
- **完整验证**：每次回退后都要进行全面的功能验证
- **记录过程**：详细记录回退过程以便后续分析和改进

---

*本回退策略确保WebSocket双实例清理后的生产环境安全性和业务连续性。*