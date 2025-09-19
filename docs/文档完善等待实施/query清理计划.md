# Query组件废弃代码和兼容层移除计划

## 1. 已废弃标记的代码

### 1.1 废弃的常量定义
**文件**: `src/core/01-entry/query/constants/query.constants.ts`
- **行号**: 207
- **内容**: `// HYBRID 已移动到 DataSourceType 枚举中，此常量将被废弃`
- **状态**: `QUERY_DATA_SOURCE_TYPES` 常量已为空对象，可以完全移除
- **移除范围**: 行206-209

### 1.2 废弃的统计方法
**文件**: `src/core/01-entry/query/services/query-statistics.service.ts`
- **行号**: 26
- **内容**: `// 旧版内存统计已废弃，所有数据直接从 Prometheus 获取`
- **行号**: 175
- **内容**: `// 已弃用 calculateQueriesPerSecond - 由 Prometheus 直取`
- **状态**: 注释标记废弃，但方法可能已被移除

## 2. 兼容层和向后兼容代码

### 2.1 向后兼容方法
**文件**: `src/core/01-entry/query/services/query.service.ts`
- **行号**: 207-217
- **方法**: `executeSymbolBasedQuery()`
- **兼容性质**: 向后兼容方法，直接委托给执行引擎
- **移除建议**: 可以移除，调用方直接使用执行引擎

```typescript
/**
 * executeSymbolBasedQuery - 向后兼容方法
 *
 * 保留此方法以确保向后兼容性
 * 实际执行已委托给QueryExecutionEngine
 */
public async executeSymbolBasedQuery(
  request: QueryRequestDto,
): Promise<QueryExecutionResultDto> {
  // 直接委托给执行引擎
  return await this.executionEngine.executeSymbolBasedQuery(request);
}
```

### 2.2 配置迁移注释
**文件**: `src/core/01-entry/query/constants/query.constants.ts`
- **行号**: 237-238
- **内容**: 配置已迁移的注释标记
```typescript
// 缓存TTL配置已移动到 QUERY_CACHE_TTL_CONFIG
// TIMEOUT_MS 已移动到 QUERY_TIMEOUT_CONFIG.QUERY_MS
```

- **行号**: 271、283
- **内容**: 更多配置迁移注释
```typescript
// TTL配置已移动到 QUERY_CACHE_TTL_CONFIG
// TIMEOUT_MS 已移动到 QUERY_TIMEOUT_CONFIG.HEALTH_CHECK_MS
```

## 3. TODO标记的未完成功能

### 3.1 查询执行引擎中的TODO
**文件**: `src/core/01-entry/query/services/query-execution-engine.service.ts`
- **行号**: 110、114、118、122、126
- **内容**: 多个未实现的查询逻辑
```typescript
// TODO: 实现市场查询逻辑
// TODO: 实现提供商查询逻辑
// TODO: 实现标签查询逻辑
// TODO: 实现时间范围查询逻辑
// TODO: 实现高级查询逻辑
```

### 3.2 内存监控中的TODO
**文件**: `src/core/01-entry/query/services/query-memory-monitor.service.ts`
- **行号**: 60
- **内容**: `// TODO: 实现从事件驱动监控系统获取系统指标的方法`

## 4. 清理建议

### 4.1 立即可移除的项目
1. **空的常量对象** (`query.constants.ts:206-209`)
2. **向后兼容委托方法** (`query.service.ts:207-217`)
3. **迁移完成的注释** (`query.constants.ts` 多处)

### 4.2 需要评估的项目
1. **TODO标记的功能** - 需确认是否为规划中功能还是废弃需求
2. **废弃的统计方法** - 需确认是否已完全替换为Prometheus

### 4.3 清理优先级
**高优先级** (立即清理):
- 空常量定义
- 迁移注释
- 委托方法

**中优先级** (评估后清理):
- TODO标记的未实现功能

**低优先级** (保留观察):
- 事件驱动相关的过渡代码

## 5. 清理后的效果
清理完成后将实现：
- 代码纯净度提升
- 移除历史包袱
- 消除向后兼容层
- 简化代码结构
- 提高可维护性