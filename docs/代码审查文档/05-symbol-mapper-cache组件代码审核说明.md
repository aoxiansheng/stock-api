# symbol-mapper-cache组件代码审核说明 - 需要改进的问题

## 🔴 依赖注入问题

### CollectorService fallback mock实现 (P0)
```typescript
// 位置: SymbolMapperCacheModule:42-46
{
  provide: 'CollectorService',
  useFactory: () => ({
    recordCacheOperation: () => {}, // 🔴 fallback mock实现
  }),
}
```
**问题**: 提供了fallback mock实现，可能掩盖真实的注入问题
**改进建议**: 移除fallback mock，确保正确的监控服务注入

## 🟡 性能优化问题

### 数据库查询超时调优 (P1)
**问题**: 数据库查询有超时保护，但超时值可能需要根据实际负载调优
**改进建议**: 根据实际负载情况优化超时配置

### Change Stream重连优化 (P2)
**问题**: Change Stream重连使用指数退避，但最大延迟固定为30秒
**改进建议**: 实现更灵活的重连策略，支持配置化调整

## 🟡 测试问题

### 跳过的性能测试 (P0)
**问题**: `symbol-mapper-cache-performance.test.ts.skip`被跳过，未执行性能测试
**改进建议**: 重新启用跳过的性能测试文件

### 压力测试缺失 (P1)
**问题**: 缺少高并发场景下的缓存压力测试
**改进建议**: 添加高并发场景的缓存压力测试

## 📋 改进优先级

### 🔴 高优先级 (P0) - 立即修复
1. 移除CollectorService的fallback mock实现
2. 重新启用跳过的性能测试文件

### 🟡 中优先级 (P1) - 近期处理
1. 根据实际负载优化数据库查询超时配置
2. 添加高并发场景的缓存压力测试

### 🟢 低优先级 (P2) - 持续改进
1. 实现更灵活的Change Stream重连策略
2. 添加更多缓存策略选项