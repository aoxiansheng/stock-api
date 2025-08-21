# Symbol Mapper 统一重构与优化执行文档

- **文档状态**: 待执行版 (v1.5) - 已完成部分清理
- **更新日期**: 2025-08-20
- **目标**: 清理仍存在的技术债务，完成Symbol Mapper模块重构。

## 0. 代码现状审计结果（已完成项目已移除）

### ✅ 已完成的清理项目
- **StreamReceiver依赖优化已完成** - 已切换到`SymbolTransformerService`，移除了对`SymbolMapperService`的依赖
- **Controller /map接口切换完成** - `/map`接口已使用新的`symbolTransformerService.transformSingleSymbol`

### ❌ 仍需清理的问题

- **P0: 编译错误（紧急）**
  - `src/core/00-prepare/symbol-mapper/services/symbol-mapper.service.ts`
    - `unifiedCache`字段未定义但在多处被引用（151, 157, 172, 178, 1251, 1270, 1278, 1332行）
    - 导致编译失败，需立即修复

- **P0: 重复监听（资源浪费）**
  - `SymbolMapperService`和`SymbolMapperCacheService`都在监听MongoDB Change Stream
  - 需移除`SymbolMapperService`中的监听逻辑

- **P1: Controller /transform接口未切换**
  - `src/core/00-prepare/symbol-mapper/controller/symbol-mapper.controller.ts`
    - `/transform`分支仍调用`symbolMapperService.transformSymbols(...)`，需切换到新服务

- **P1: CacheService缺少统一清理入口**
  - `src/core/05-caching/symbol-mapper-cache/services/symbol-mapper-cache.service.ts`
    - 缺少`clearAllCaches()`方法实现

- **P2: 文档描述不一致**
  - 文档中存在Feature Flag相关的过时描述需清理

> 审计依据：基于当前代码库实际状态，已清理完成部分不再重复执行。

## 1. 核心问题与范围

### 1.1. 目标
清理 `SymbolMapperService` 中因职责迁移而残留的重复逻辑与无效代码，统一符号转换的调用路径，使整个模块职责清晰、性能可靠、易于维护。

### 1.2. 范围
- **涉及模块**: `SymbolMapperService`, `SymbolMapperCacheService`, `SymbolTransformerService`, `SymbolMapperController`。
- **约束（新增）**: 本项目为“全新项目”，不保留任何兼容层与功能开关，直接切换到新路径。

### 1.3. 问题清单与风险评级

#### P0 - 高危/立即修复
1. **重复的 Change Stream 监听**: `SymbolMapperService` 和 `SymbolMapperCacheService` 都在监听同一个数据库集合，导致资源浪费和潜在的竞态条件。
2. **无效的本地缓存**: `SymbolMapperService` 中的 `unifiedCache` 是一个只写不读的“死缓存”，占用内存且误导开发者。
3. **重复的转换逻辑**: `SymbolMapperService` 中保留了已被 `SymbolTransformerService` 替代的符号转换方法。

#### P1 - 中等风险/尽快修复
1. **控制器调用路径未统一**: `SymbolMapperController` 仍在使用旧的、未经过新三层缓存架构的 `SymbolMapperService` 接口，影响性能与数据一致性。
2. **测试代码耦合**: 部分端到端（E2E）测试仍依赖于 `SymbolMapperService` 中待废弃的方法。
3. **其他模块冗余**: `ReceiverService` 中存在对旧服务方法的冗余调用代码。

## 2. 修复前置检查（必做）

### 2.1 API 完整性验证（`SymbolMapperCacheService`）
- 需确保以下公共方法存在并稳定：
  - `clearAllCaches(): void`（提供统一全量清理入口）
  - `getCacheStats(): CacheStatsResponse | CacheStatsDto`（返回统计；若为 `CacheStatsDto`，在 Controller 层做兼容映射）
  - 可选增强：`invalidateCacheByProvider(provider: string): void`

- 一键验证脚本（建议放置：`scripts/validate-cache-service-api.ts`）：
```typescript
import { SymbolMapperCacheService } from '@core/public/symbol-mapper-cache';

async function validateCacheServiceAPI() {
  const cacheService = new SymbolMapperCacheService();
  const requiredMethods = ['clearAllCaches', 'getCacheStats'];
  const missing = requiredMethods.filter(m => typeof (cacheService as any)[m] !== 'function');
  if (missing.length) throw new Error('缺失方法: ' + missing.join(', '));
  console.log('✅ API 验证通过');
}

validateCacheServiceAPI().catch(err => { console.error(err); process.exit(1); });
```

- 执行命令：
```bash
cd backend/
npx ts-node scripts/validate-cache-service-api.ts
```

- 若缺失 `clearAllCaches`，必须先在 `src/core/05-caching/symbol-mapper-cache/services/symbol-mapper-cache.service.ts` 中补齐后再继续后续清理。

### 2.2 依赖关系与重复监听验证
```bash
# 确认即将移除的方法无外部直接调用
grep -r "setupChangeStreamMonitoring\|invalidateCacheForChangedRule\|clearCacheByDocumentKey" src/ \
  --exclude-dir=core/public/symbol-mapper | wc -l

# 检查监听仅保留一处（缓存服务）
grep -r "setupChangeStreamMonitoring" src/core/05-caching/symbol-mapper-cache/
```

### 2.3 性能基线记录
```bash
# 记录清理前的性能指标与命中率基线
bun run test:perf:cache > performance-baseline.log
```

### 2.4 验证通过标准（继续执行清理的前提）
- `SymbolMapperCacheService.clearAllCaches()` 存在且可用
- `getCacheStats()` 返回兼容的统计结构
- Change Stream 监听仅在缓存服务中生效
- 代码库无外部直接调用待移除方法
- 已记录性能基线

### 2.5 项目约束说明（无兼容层/无开关）
- 采用直接切换方案，不保留旧实现的兼容委派方法。
- 控制器与所有调用方直接使用 `SymbolTransformerService`，完全绕过 `SymbolMapperService` 的旧转换接口。

## 3. 总体修复策略：直接切换与清理

采用“直接切换 + 一次性清理”的方案：
- 先补齐缓存统一清理入口 `clearAllCaches()`。
- 控制器直接切换到 `SymbolTransformerService`，不保留兼容层与开关。
- 立即移除 `SymbolMapperService` 中冗余监听、缓存与旧方法。
- 补齐测试与基线验证。

## 4. 分阶段实施步骤

### 阶段 A: 直接切换与清理 (预计 1 天)

#### 步骤 A.1: 控制器直接对接 Transformer
**文件**: `src/core/00-prepare/symbol-mapper/controller/symbol-mapper.controller.ts`

1. 直接注入新服务（移除旧服务依赖）：
```typescript
constructor(
  private readonly symbolTransformerService: SymbolTransformerService,
) {}
```

2. 直接调用新路径（移除 `mappingInSymbolId` 分支）：
```typescript
async transformSymbols(@Body() transformDto: TransformSymbolsDto): Promise<any> {
  return this.symbolTransformerService.transformSymbols(
    transformDto.dataSourceName,
    transformDto.symbols,
    'to_standard'
  );
}
```

> 说明：新项目统一使用 Provider+Symbols 的请求格式，不保留ID分支。

#### 步骤 A.2: 缓存统一清理入口
**文件**: `src/core/05-caching/symbol-mapper-cache/services/symbol-mapper-cache.service.ts`

- 新增：
```typescript
public clearAllCaches(): void {
  this.providerRulesCache.clear();  // L1
  this.symbolMappingCache.clear();  // L2
  this.batchResultCache.clear();    // L3
  this.pendingQueries.clear();
  this.logger.log('All caches cleared');
}
```

#### 步骤 A.3: 移除 Mapper 冗余监听与本地缓存
**文件**: `src/core/00-prepare/symbol-mapper/services/symbol-mapper.service.ts`

- 删除：
  - `import { LRUCache } from 'lru-cache'` 与 `private unifiedCache` 字段及初始化
  - `onModuleInit()` 中监听与轮询相关代码
  - `setupChangeStreamMonitoring()` / `invalidateCacheForChangedRule()` / `clearCacheByDocumentKey()` / `clearCacheByDocument()` / `checkRuleVersions()`
- 若保留 `clearCache()`/`getCacheStats()`：改为直接委派缓存服务；新项目也可完全移除这两个方法。

## 5. 观测性与告警

- 本项目采用直接切换方案，不使用灰度发布。观测性与告警配置保持不变，用于接入后的运行保障。

### 6.1 指标与采集
- 建议指标：
  - `symbol_cache_hit_rate`（labels: service, layer）
  - `symbol_cache_response_time_ms`（Histogram）
  - `symbol_cache_errors_total`

### 6.2 Prometheus 告警规则（示例）
```yaml
groups:
  - name: symbol-mapper-cache
    rules:
      - alert: CacheHitRateDropped
        expr: symbol_cache_hit_rate < 0.85
        for: 2m
        labels: { severity: warning }
      - alert: CacheResponseTimeSlow
        expr: histogram_quantile(0.95, symbol_cache_response_time_ms) > 200
        for: 1m
        labels: { severity: critical }
      - alert: CacheErrorRateHigh
        expr: rate(symbol_cache_errors_total[5m]) > 0.01
        for: 30s
        labels: { severity: critical }
```

### 6.3 运维排障脚本（示例）
```bash
echo "=== SymbolMapperService 缓存诊断 ==="
curl -sf http://localhost:3000/api/v1/monitoring/health || echo FAIL
curl -s http://localhost:3000/api/v1/symbol-mapper/cache/stats | jq '.' || true
ps aux | grep "symbol-mapper" | awk '{print $4}' | sort -n | tail -1
mongo --eval "db.runCommand({serverStatus: 1}).connections" | tail -n +1
```

## 7. 测试与性能验证

### 7.1 基础检查
```bash
bun run build && npx tsc --noEmit && bun run lint
```

### 7.2 单测/集成/E2E
```bash
npx jest test/jest/unit/core/symbol-mapper --testTimeout=30000
npx jest test/jest/integration/core/symbol-mapper-cache --testTimeout=30000
npx jest test/jest/e2e/core/symbol-mapper --testTimeout=60000
```

### 7.3 新旧路径一致性对比（示意）
```typescript
const legacy = await symbolMapperService.transformSymbols('longport', ['700.HK']);
const modern = await symbolTransformerService.transformSymbols('longport', ['700.HK'], 'to_standard');
expect(modern.mappedSymbols).toEqual(legacy.mappedSymbols);
```

### 7.4 性能测试与门槛
```bash
k6 run test/k6/cache-performance.js || true
bun run test:perf:cache || true
```
- 通过标准：
  - 缓存命中率 ≥ 95%
  - P95 响应时间 < 200ms
  - 内存使用下降 ≥ 10%
  - Change Stream 监听仅 1 个
  - 错误率 < 0.1%

## 8. 接口与统计 DTO 标准

```typescript
interface CacheStatsResponse {
  cacheHits: number;
  cacheMisses: number;
  hitRate: string;      // 字符串百分比，向后兼容
  cacheSize: number;
  maxSize: number;
  pendingQueries: number;
  l1Stats?: LayerCacheStats;
  l2Stats?: LayerCacheStats;
  l3Stats?: LayerCacheStats;
  error?: string;
  lastUpdated?: string;
}

interface LayerCacheStats {
  size: number;
  maxSize: number;
  hitRate: number;      // 数字格式，便于计算
}

interface ClearCacheResult {
  success: boolean;
  clearedCaches: string[]; // ['L1','L2','L3']
  message: string;
  timestamp: string;
  affectedItems?: number;
}
```

- 若缓存服务返回 `CacheStatsDto`，Controller 层进行一次映射以保持对外兼容格式。

## 9. 关键改动文件索引

- `src/core/00-prepare/symbol-mapper/services/symbol-mapper.service.ts`
  - 删除：重复监听与轮询、无效 LRU 缓存
  - 重构：`clearCache()`、`getCacheStats()` 改为委派
  - 兼容层：阶段 A 暂存的委派方法，阶段 B 删除
- `src/core/00-prepare/symbol-mapper/controller/symbol-mapper.controller.ts`
  - 直接切换到 `SymbolTransformerService`
  - 移除 `mappingInSymbolId` 分支（新项目统一使用Provider+Symbols格式）
- `src/core/05-caching/symbol-mapper-cache/services/symbol-mapper-cache.service.ts`
  - 新增：`clearAllCaches()` 统一清理入口
  - 已有：`getCacheStats()`
  - 独占 Change Stream 监听
- `src/core/01-entry/stream-receiver/services/stream-receiver.service.ts`
  - 移除未用旧路径调用与注入

## 10. 测试与回滚策略（整合）

- 验证清单：
  - 单元/集成/E2E：同 7.2
  - 手动验证：仅缓存服务输出监听启动日志；命中率与响应时间稳定
- 回滚：
  - 直接使用 `git revert <commit>` 回滚相关提交
  - 采用代码级别回滚

## 11. 待执行任务清单（按优先级，已完成项目已移除）

- P0（紧急修复）
  - [ ] **修复编译错误**: 修复`SymbolMapperService`中`unifiedCache`未定义问题
  - [ ] **移除重复监听**: 删除`SymbolMapperService`中的Change Stream监听逻辑
  - [ ] **补齐清理入口**: 在`SymbolMapperCacheService`新增`clearAllCaches()`方法

- P1（重要修复）  
  - [ ] **Controller完全切换**: 修改`/transform`接口使用`SymbolTransformerService`
  - [ ] **清理委派方法**: 修改`SymbolMapperService.clearCache()`等方法为委派缓存服务

- P2（可选优化）
  - [ ] **文档清理**: 清理文档中过时描述和不一致内容
  - [ ] **DTO兼容映射**: Controller层DTO映射优化（如需要）
  - [ ] **测试补齐**: 新旧路径一致性、性能与回归测试

## 12. 预期收益

- **架构清晰**：职责单一，代码更易于理解和维护。
- **性能提升**：统一走三层缓存架构，响应时间更短。
- **资源优化**：消除重复数据库监听，减少不必要的内存和 CPU 消耗。
- **稳定性增强**：统一的缓存失效策略，减少数据不一致和竞态风险。
- **技术债清理**：彻底移除历史遗留代码，为未来迭代奠定基础。

## 13. 即刻落地步骤与命令速查

1) 在缓存服务新增统一清理入口（必须先做）
```typescript
// src/core/05-caching/symbol-mapper-cache/services/symbol-mapper-cache.service.ts
public clearAllCaches(): void {
  this.providerRulesCache.clear();  // L1
  this.symbolMappingCache.clear();  // L2
  this.batchResultCache.clear();    // L3
  this.pendingQueries.clear();
  this.logger.log('All caches cleared');
}
```

2) 控制器直接切换新路径（删除旧服务与 ID 分支）
```diff
// src/core/00-prepare/symbol-mapper/controller/symbol-mapper.controller.ts
- constructor(private readonly symbolMapperService: SymbolMapperService, private readonly symbolTransformerService: SymbolTransformerService, ...)
+ constructor(private readonly symbolTransformerService: SymbolTransformerService) {}

- const result = transformDto.mappingInSymbolId ? await this.symbolMapperService.transformSymbolsById(...) : await this.symbolMapperService.transformSymbols(...)
+ const result = await this.symbolTransformerService.transformSymbols(transformDto.dataSourceName, transformDto.symbols, 'to_standard')
```

3) Mapper 删除本地缓存与重复监听/轮询，并（可选）委派/移除清理与统计
```diff
// src/core/00-prepare/symbol-mapper/services/symbol-mapper.service.ts
- import { LRUCache } from 'lru-cache';
- private unifiedCache: LRUCache<string, any>;
- this.unifiedCache = new LRUCache({ ... });
- await this.setupChangeStreamMonitoring();
- setInterval(() => this.checkRuleVersions(), ...)
+ // 移除以上本地缓存与监听逻辑

- clearCache() { this.unifiedCache.clear(); }
+ // 可移除，或：clearCache() { this.symbolMapperCacheService?.clearAllCaches(); }

- getCacheStats() { /* 本地兜底 */ }
+ // 可移除，或：getCacheStats() { return this.symbolMapperCacheService?.getCacheStats(); }
```

4) StreamReceiverService 依赖优化（如仅用于转换，切换到 Transformer）
```diff
// src/core/01-entry/stream-receiver/services/stream-receiver.service.ts
- constructor(private readonly symbolMapperService: SymbolMapperService, ...) {}
+ constructor(private readonly symbolTransformerService: SymbolTransformerService, ...) {}

- const mapped = await this.symbolMapperService.transformSymbols(provider, symbols);
+ const mapped = await this.symbolTransformerService.transformSymbols(provider, symbols, 'to_standard');
```

5) 编译与测试
```bash
bun run build && npx tsc --noEmit && bun run lint
npx jest test/jest/unit/core/symbol-mapper --testTimeout=30000
npx jest test/jest/integration/core/symbol-mapper-cache --testTimeout=30000
npx jest test/jest/e2e/core/symbol-mapper --testTimeout=60000
```

6) 安全扫描与基线
```bash
# 应返回 0（表示无外部依赖待删方法）
grep -r "setupChangeStreamMonitoring\|invalidateCacheForChangedRule\|clearCacheByDocumentKey" src/ --exclude-dir=core/public/symbol-mapper | wc -l

# 记录性能基线
bun run test:perf:cache > performance-baseline.log
```

## 14. Controller 统计 DTO 兼容映射（示例）

> 若对外需要 `CacheStatsResponse`，可在 Controller 层做一次映射。

```typescript
// 示例：src/core/00-prepare/symbol-mapper/controller/symbol-mapper.controller.ts
@Get('cache/stats')
async getCacheStats(): Promise<CacheStatsResponse> {
  const dto = this.symbolMapperService.getCacheStats() as any; // 可能是 CacheStatsDto
  // 兼容映射（以 L2 为主要命中率来源）
  const l2 = dto.layerStats?.l2 || { hits: 0, misses: 0, total: 0 };
  const total = (l2.hits || 0) + (l2.misses || 0);
  return {
    cacheHits: l2.hits || 0,
    cacheMisses: l2.misses || 0,
    hitRate: total > 0 ? ((l2.hits / total) * 100).toFixed(2) + '%' : '0%',
    cacheSize: dto.cacheSize?.l2 ?? 0,
    maxSize: 0,            // 可由 FeatureFlags 注入或追加字段提供
    pendingQueries: 0,     // 暂不暴露并发控制计数
    l1Stats: dto.layerStats?.l1 && { size: dto.cacheSize?.l1 ?? 0, maxSize: 0, hitRate: percent(dto.layerStats.l1) },
    l2Stats: { size: dto.cacheSize?.l2 ?? 0, maxSize: 0, hitRate: percent(l2) },
    l3Stats: dto.layerStats?.l3 && { size: dto.cacheSize?.l3 ?? 0, maxSize: 0, hitRate: percent(dto.layerStats.l3) },
    lastUpdated: new Date().toISOString(),
  };

  function percent(layer: { hits: number; misses: number }) {
    const t = (layer?.hits || 0) + (layer?.misses || 0);
    return t > 0 ? (layer.hits / t) * 100 : 0;
  }
}
```

## 15. 完成判定清单（Definition of Done）- 更新版

- [ ] **编译错误修复**: `SymbolMapperService`中`unifiedCache`相关编译错误已修复
- [ ] **重复监听消除**: 仅`SymbolMapperCacheService`保留Change Stream监听，`SymbolMapperService`中已移除
- [ ] **统一清理入口**: `clearAllCaches()`已在缓存服务实现并通过单测
- [ ] **Controller完全切换**: `/transform`接口直接使用`SymbolTransformerService`
- [ ] **委派方法清理**: `clearCache()`、`getCacheStats()`已移除或仅委派缓存服务
- [ ] **编译检查通过**: 类型检查与Lint全绿，无编译错误
- [ ] **测试验证**: 单测/集成/E2E测试通过
- [ ] **性能验证**: 缓存命中率≥95%，响应时间P95<200ms，错误率<0.1%

### 已完成项目（无需再验证）
- ✅ StreamReceiver不再注入`SymbolMapperService`用于转换
- ✅ Controller `/map`接口已切换到新服务
