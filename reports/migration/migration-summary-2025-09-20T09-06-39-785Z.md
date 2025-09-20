# processingTime字段迁移状态报告

生成时间: 2025-09-20T09:06:39.789Z

## 📊 统计摘要

| 指标 | 数值 |
|------|------|
| 扫描文件总数 | 597 |
| 使用processingTime的文件 | 19 |
| 使用processingTimeMs的文件 | 39 |
| 同时使用两个字段的文件 | 17 |
| processingTime引用总数 | 135 |
| processingTimeMs引用总数 | 223 |
| **迁移进度** | **62%** |

## 🎯 迁移状态分析

### 迁移进度评估
- ✅ **已迁移**: 62% 的引用使用标准字段
- 🔄 **进行中**: 17 个文件处于双字段并存状态
- ❌ **待迁移**: 2 个文件仅使用废弃字段

### 问题文件列表

- **src/core/04-storage/storage/services/storage.service.ts**: 大量使用废弃的processingTime字段 (processingTime: 8, processingTimeMs: 2)

## 🚀 迁移建议

### 高优先级任务
- **src/core/03-fetching/stream-data-fetcher/services/stream-connection.impl.ts**: 文件只使用废弃的processingTime字段，需要迁移到processingTimeMs (1 个引用)
- **src/notification/handlers/notification-event.handler.ts**: 文件只使用废弃的processingTime字段，需要迁移到processingTimeMs (1 个引用)

### 中优先级任务
- **src/common/utils/time-fields-migration.util.ts**: 文件同时使用两个字段，建议清理processingTime字段
- **src/core/01-entry/query/services/query-execution-engine.service.ts**: 文件同时使用两个字段，建议清理processingTime字段
- **src/core/01-entry/receiver/dto/data-response.dto.ts**: 文件同时使用两个字段，建议清理processingTime字段
- **src/core/01-entry/receiver/dto/receiver-internal.dto.ts**: 文件同时使用两个字段，建议清理processingTime字段
- **src/core/01-entry/receiver/services/receiver.service.ts**: 文件同时使用两个字段，建议清理processingTime字段
- **src/core/01-entry/stream-receiver/services/stream-receiver.service.ts**: 文件同时使用两个字段，建议清理processingTime字段
- **src/core/02-processing/symbol-transformer/interfaces/symbol-transform-result.interface.ts**: 文件同时使用两个字段，建议清理processingTime字段
- **src/core/02-processing/symbol-transformer/services/symbol-transformer.service.ts**: 文件同时使用两个字段，建议清理processingTime字段
- **src/core/02-processing/transformer/services/data-transformer.service.ts**: 文件同时使用两个字段，建议清理processingTime字段
- **src/core/03-fetching/data-fetcher/services/data-fetcher.service.ts**: 文件同时使用两个字段，建议清理processingTime字段
- **src/core/03-fetching/stream-data-fetcher/services/stream-data-fetcher.service.ts**: 文件同时使用两个字段，建议清理processingTime字段
- **src/core/04-storage/storage/services/storage.service.ts**: 文件同时使用两个字段，建议清理processingTime字段
- **src/core/05-caching/common-cache/services/batch-memory-optimizer.service.ts**: 文件同时使用两个字段，建议清理processingTime字段
- **src/core/05-caching/symbol-mapper-cache/interfaces/cache-stats.interface.ts**: 文件同时使用两个字段，建议清理processingTime字段
- **src/core/shared/services/base-fetcher.service.ts**: 文件同时使用两个字段，建议清理processingTime字段
- **test/jest/unit/common/utils/time-fields-migration.util.spec.ts**: 文件同时使用两个字段，建议清理processingTime字段
- **test/jest/unit/receiver/receiver-time-fields-migration.spec.ts**: 文件同时使用两个字段，建议清理processingTime字段

## 📋 后续行动计划

1. **立即处理**: 迁移仅使用processingTime的文件到processingTimeMs
2. **逐步清理**: 在双字段并存的文件中移除processingTime字段
3. **最终验证**: 确保所有引用都使用标准的processingTimeMs字段

---
*报告由 check-processing-time-migration.js 自动生成*
