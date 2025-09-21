# symbol-mapper 代码审核说明

## 概述

本文档记录 symbol-mapper 组件中实际存在的问题，所有问题均已通过代码验证确认。symbol-mapper 组件负责处理股票代码在不同数据源之间的映射转换。

**📅 更新时间**: 2025-01-22 | **🎯 状态**: 仅记录真实存在的问题

## 1. 配置硬编码问题 - 🔴 高风险

### 问题位置
- `src/core/00-prepare/symbol-mapper/constants/symbol-mapper.constants.ts` - 13个配置常量全部硬编码
- 整个组件零环境变量支持 (无 `process.env` 或 `ConfigService` 使用)

### 具体问题
```typescript
// 硬编码的性能配置
SYMBOL_MAPPER_PERFORMANCE_CONFIG = Object.freeze({
  SLOW_MAPPING_THRESHOLD_MS: 100,
  MAX_SYMBOLS_PER_BATCH: 1000,
  MAX_CONCURRENT_MAPPINGS: 10,
  // ... 其他硬编码值
});

// 硬编码的业务限制
MAX_MAPPING_RULES_PER_SOURCE: 10000
```

### 解决方案
创建配置服务支持环境变量:
```typescript
@Injectable()
export class SymbolMapperConfigService {
  constructor(private readonly configService: ConfigService) {}

  get maxMappingRules(): number {
    return this.configService.get<number>('SYMBOL_MAPPER_MAX_RULES', 10000);
  }
}
```

## 2. 监控事件性能问题 - 🔴 高风险

### 问题位置
- `src/core/00-prepare/symbol-mapper/services/symbol-mapper.service.ts:70`

### 具体问题
```typescript
// 每个操作都使用 setImmediate 发送监控事件
private emitMonitoringEvent(metricName: string, data: any) {
  setImmediate(() => {
    this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
      // 大量监控数据...
    });
  });
}
```

高并发时可能导致:
- 大量 setImmediate 事件积压
- 监控事件过多影响性能
- 无采样机制

### 解决方案
实施事件采样和批处理机制


## 总结

symbol-mapper 组件存在 3 个需要修复的实际问题:

1. **配置硬编码** (🔴 高风险) - 所有配置参数硬编码，无环境变量支持
2. **监控事件性能** (🔴 高风险) - setImmediate 事件积压，无采样机制


**建议优先级:**
- P0: 配置环境化改造 (2-3工作日)
- P1: 监控事件采样优化 (1-2工作日)