# Symbol Mapper 缓存重构开发计划

## 📋 项目概览

### 重构目标
优化 Symbol Mapper 组件的缓存架构，通过三层缓存设计（L1规则+L2符号+L3批量）和智能差异化失效策略，实现 **80%+ 性能提升**。

### 核心指标
- **批量符号映射缓存命中率**: <5% → 85%+ (80%提升)
- **单符号查询延迟**: 20-50ms → 0.1-1ms (95%减少)
- **批量查询延迟**: 100-300ms → 10-30ms (80%减少)
- **数据库查询次数**: 每次都查 → 缓存期内0次 (90%减少)

### 技术关键点
- 三层LRU缓存架构统一管理
- MongoDB Change Stream 智能失效
- 符号对差分精准重置
- FeatureFlags 统一配置管理

---

## 🚀 里程碑计划

### 🏗️ Milestone 1: 基础架构搭建 (2天)
**交付目标**: 完成三层缓存架构和配置管理基础设施

#### 📅 Day 1: 配置与接口准备
**任务清单**:
- [ ] **配置扩展** (4小时)
  - 在 `FeatureFlags` 中新增 L3 配置字段
    - `batchResultCacheMaxSize: number` (默认: 1000)
    - `batchResultCacheTtl: number` (默认: 7200000ms)
  - 为新增字段增加 ENV 覆盖支持 (与现有 `symbolCacheTtl` 等一致)
    - **🚨 必补**: 明确 ENV 名称：`BATCH_RESULT_CACHE_MAX_SIZE`、`BATCH_RESULT_CACHE_TTL`
  - **🚨 必补**: 确保设计文档与实现统一使用相同 ENV 名称，避免不同文档键名不一致
  - 验证现有 L1/L2 配置字段正常工作
  - **🚨 必补**: 如要修改默认 TTL（如 L1=24h/L2=12h/L3=2h），同步修改 FeatureFlags 默认值与 ENV 说明
    - 不在 `initializeCaches()` 中硬编码，始终从 `featureFlags` 读取
  - **🚨 必补**: FeatureFlags 新字段单测覆盖

- [ ] **接口定义** (2小时)
  - 创建 `src/core/public/symbol-mapper/interfaces/symbol-mapper.interfaces.ts`
  - 定义 `SymbolMappingResult` 和 `BatchMappingResult` 接口
  - 确保 `failedSymbols` 字段命名统一
  - **🚨 必补**: 在 index.ts (如存在) 中导出新接口，确保 IDE/编译器路径解析正常

- [ ] **项目结构** (2小时)
  - 创建 `SymbolMapperCacheService` 类文件
  - 确认所有导入路径正确
  - 设置基础类结构和依赖注入

**验收标准**:
- ✅ FeatureFlags 新字段可通过代码和ENV配置
- ✅ 接口文件通过 TypeScript 编译
- ✅ 服务类可正常实例化

#### 📅 Day 2: 三层缓存实现
**任务清单**:
- [ ] **LRU缓存初始化** (3小时)
  - 实现 `initializeCaches()` 方法
  - **🚨 必补**: 显式从配置读取，不硬编码默认值
    - L1规则缓存: `featureFlags.ruleCacheMaxSize` / `featureFlags.ruleCacheTtl`
    - L2符号缓存: `featureFlags.symbolCacheMaxSize` / `featureFlags.symbolCacheTtl`
    - L3批量缓存: `featureFlags.batchResultCacheMaxSize` / `featureFlags.batchResultCacheTtl`
  - **🚨 必补**: 增加缓存容量与内存水位告警阈值配置
  - **🚨 必补**: 达到阈值触发分层清理/降级策略
  - **🚨 必补**: 资源与阈值告警精确化
    - 内存水位阈值明确默认值：70%（警告）/80%（触发清理）两档
    - 触发后的分层清理策略记录到日志，便于运维复盘
    - 清理策略：70% 警告但不清理，80% 触发 L3→L2→L1 逐层清理

- [ ] **生命周期管理** (2小时)
  - 实现 `OnModuleInit` 和 `OnModuleDestroy`
  - Change Stream 监听初始化
  - 资源清理机制

- [ ] **统计监控** (3小时)
  - 实现 `initializeStats()` 和 `getCacheStats()`
  - 三层命中率分别统计
  - 避免计算 overallHitRatio
  - **🚨 必补**: 增加内存水位监控面板项
  - **🚨 必补**: 统一在服务入口尊重 `featureFlags.symbolMappingCacheEnabled`
  - **🚨 必补**: 缓存关闭时直走原流程(不读写L1/L2/L3)，打点"缓存禁用"

**验收标准**:
- ✅ 三层缓存可正常创建和销毁
- ✅ 统计接口返回正确的层级数据
- ✅ 模块生命周期事件正常触发

**里程碑交付物**:
- `SymbolMapperCacheService` 基础架构
- 完整的配置管理机制
- 三层缓存统计监控

---

### ⚡ Milestone 2: 核心查询功能 (3天)
**交付目标**: 实现统一查询入口和双向缓存机制

#### 📅 Day 3: 统一查询入口
**任务清单**:
- [ ] **mapSymbols 核心方法** (4小时)
  - 实现批量和单符号统一处理逻辑
  - 方向控制: `to_standard` vs `from_standard`
  - 并发去重机制
  - 基础缓存查询流程

- [ ] **缓存键生成策略** (2小时)
  - 实现 `generateConsistentKey()` 方法
  - 支持 MD5 哈希和排序
  - 批量缓存键与并发控制键一致
  - **🚨 必补**: 键规范确定性单测 (显式化测试要求)
    - 同输入恒等: 相同输入多次调用生成相同 key
    - 乱序等价: 符号数组乱序后生成相同 key
    - 小写化一致: 大小写 provider 统一为小写后结果一致

- [ ] **基础数据库交互** (2小时)
  - 集成 `SymbolMappingRepository`
  - 实现 `getProviderRules()` 方法
  - 基础符号转换逻辑
  - **🚨 必补**: L1 命中/未命中计数在 `getProviderRules()` 内完成，避免在回源阶段误计

**验收标准**:
- ✅ 单符号和批量查询走统一入口
- ✅ 缓存键生成稳定且唯一
- ✅ 数据库查询功能正常

#### 📅 Day 4: 双向缓存机制
**任务清单**:
- [ ] **双向映射回填** (4小时)
  - 查询结果同时缓存正向和反向映射
  - L2层双向数据一致性
  - 避免重复的数据库查询
  - **🚨 必补**: 双向回填单测覆盖
    - 仅成功项回填：失败项不回填 L2 缓存
    - 双向写入正确性： to_standard 结果同步回填 from_standard 方向
    - 失败项不回填： failedSymbols 中的符号不应缓存

- [ ] **缓存层级策略** (3小时)
  - L1: 规则缓存命中检查
  - L2: 符号级精确匹配
  - L3: 批量结果复用
  - 层级间数据传递

- [ ] **性能优化** (1小时)
  - 批量操作的分片处理
  - 内存使用优化
  - 并发控制完善
  - **🚨 必补**: 输出一致性校验单测
    - `mergeResults` 方法确保 `mappingDetails` 始终以原始输入符号为键
    - 无论 `to_standard` 还是 `from_standard` 方向
    - 匹配兼容层 `mappingDetails[originalSymbol]` 取值约定
  - **🚨 必补**: 并发控制健壮性单测
    - `pendingQueries` Map 的超时清理机制
    - Promise 超时/拒绝后的键清理，避免内存泄漏
    - 并发请求的去重合并正确性验证

**验收标准**:
- ✅ 一次查询产生双向缓存数据
- ✅ 三层缓存按优先级命中
- ✅ 批量查询性能显著提升

#### 📅 Day 5: 错误处理和监控
**任务清单**:
- [ ] **异常处理机制** (3小时)
  - 数据库连接失败处理
  - 缓存操作异常恢复
  - 部分失败的批量处理

- [ ] **监控指标集成** (3小时)
  - 复用现有 `streamCacheHitRate` 指标
  - L1/L2/L3 分层命中率上报
  - 性能指标记录
  - **🚨 必补**: 统一复用 `Metrics.inc(..., 'streamCacheHitRate', { cache_type }, 100|0)` 打点
  - **🚨 必补**: 避免混用 `.set(...)`，与现网对齐
  - **🚨 必补**: 指标标签稳定性
    - `streamCacheHitRate` 仅使用 `cache_type` 标签（l1_rules/l2_symbols/l3_batch）
    - 禁止新增 `provider`、`symbols_count_range` 等高基数标签
    - 避免与现有注册不一致或引入高基数风险

- [ ] **日志和调试** (2小时)
  - 结构化日志输出
  - 缓存命中/失效日志
  - 性能分析数据
  - **🚨 可选**: 日志可观测性增强
    - 统一记录 `provider`、`direction` (to_standard/from_standard)、`symbolsCount`
    - 记录 `cacheHit` 分层情况：L1/L2/L3 命中状态和数量
    - 记录格式：`{ provider, direction, symbolsCount, l1Hit, l2Hit, l3Hit, totalHit, dbQuery }`
    - 便于问题定位和性能分析

**验收标准**:
- ✅ 异常情况下系统稳定运行
- ✅ 监控指标正确上报
- ✅ 日志信息完整清晰

**里程碑交付物**:
- 完整的 `mapSymbols` 统一查询接口
- 双向缓存自动回填机制
- 集成监控和错误处理

---

### 🔄 Milestone 3: 智能缓存失效 (2天)
**交付目标**: 实现基于 MongoDB Change Stream 的差异化智能失效

#### 📅 Day 6: Change Stream 监听
**任务清单**:
- [ ] **变更监听设置** (3小时)
  - 实现 `setupChangeStreamMonitoring()` 方法
  - 监听 `SymbolMappingRuleDocument` 变更事件
  - 错误处理和重连机制
  - **🚨 必补**: 错误/关闭自动重连实现 (指数退避算法)
    - 初始重连延迟: 1秒
    - 最大重连延迟: 30秒
    - 退避因子: 2倍递增
  - **🚨 必补**: Change Stream 稳定性单测
    - 模拟 error 事件触发重连
    - 模拟 close 事件触发重连
    - 验证指数退避时间间隔

- [ ] **事件解析** (3小时)
  - 从变更事件提取 provider 信息
  - 支持 insert/update/delete 操作类型
  - 变更数据格式标准化
  - **🚨 必补**: `extractProviderFromChangeEvent` 单测全覆盖
    - insert 事件：含 `fullDocument` 场景
    - update 事件：含/不含 `fullDocument` 场景，验证回查 `findById`
    - delete 事件：不含 `fullDocument`，必须回查 `findById`

- [ ] **生命周期集成** (2小时)
  - 在 `onModuleInit` 中启动监听
  - 在 `onModuleDestroy` 中优雅关闭
  - Change Stream 状态管理

**验收标准**:
- ✅ Change Stream 可检测到数据库变更
- ✅ 事件解析获取正确的 provider 信息
- ✅ 服务重启后监听自动恢复

#### 📅 Day 7: 差异化失效策略
**任务清单**:
- [ ] **符号对差分算法** (4小时)
  - 实现 `calculateRuleDifferences()` 方法
  - 基于 `(standardSymbol, sdkSymbol, isActive)` 元组比较
  - 识别新增、删除、修改的符号对

- [ ] **精准缓存失效** (3小时)
  - 实现 `invalidateAffectedCache()` 方法
  - L1: 规则缓存强制刷新
  - L2: 仅失效受影响的符号映射
  - L3: 检查批量结果相关性
  - **🚨 必补**: LRU 迭代回退双分支实现
    ```typescript
    // 优先使用 for...of 迭代 (新版本 LRU)
    if (typeof cache[Symbol.iterator] === 'function') {
      for (const [key] of cache) { /* ... */ }
    } else {
      // 回退到 .keys() 方法 (旧版本 LRU)
      for (const key of cache.keys()) { /* ... */ }
    }
    ```
  - **🚨 必补**: 单测分别覆盖两种失效路径
  - **🚨 必补**: L3 精准失效命中单测
    - 验证 `mappingDetails` 中的 key (原始输入符号) 能触发删除
    - 验证 `mappingDetails` 中的 value (映射结果符号) 能触发删除
    - 验证 `failedSymbols` 数组中的元素能触发删除

- [ ] **失效性能优化** (1小时)
  - 批量失效操作
  - 避免大规模缓存清空
  - 失效统计和监控

**验收标准**:
- ✅ 规则变更仅影响相关符号的缓存
- ✅ 未变更的缓存条目保持有效
- ✅ 失效操作性能符合预期

**里程碑交付物**:
- MongoDB Change Stream 监听机制
- 智能差异化缓存失效策略
- 符号对级别的精准失效算法

---

### 🔄 Milestone 4: 兼容性和集成 (2天)
**交付目标**: 确保向后兼容和无缝集成到现有系统

#### 📅 Day 8: 兼容层实现
**任务清单**:
- [ ] **API兼容层** (4小时)
  - 更新现有 `SymbolMapperService` 方法
  - `mapSymbol()` 单符号接口适配
  - `mapSymbols()` 批量接口适配
  - `transformSymbolsForProvider()` 方法适配

- [ ] **返回结构统一** (2小时)
  - 确保使用 `mappingDetails/failedSymbols` 结构
  - 单符号方法从 `mappingDetails` 提取值
  - 批量方法返回完整结构
  - **🚨 必补**: 兼容层返回结构验收
    - 单体从 `mappingDetails[originalSymbol]` 取值
    - 批量默认返回完整结构
    - 如调用方期望数组，提供适配路径

- [ ] **配置平滑迁移** (2小时)
  - 确保新配置字段平滑启用
  - 原有配置保持兼容
  - 配置验证和错误提示

- [ ] **运维接口** (建议 3小时)
  - 查询三层缓存统计的只读接口（或 CLI）
    - `GET /api/v1/symbol-mapper/cache/stats` - 返回 L1/L2/L3 命中率、容量、TTL 等
    - CLI: `bun run cli symbol-mapper:cache:stats`
  - 按 provider 精准失效的管理接口（与 Change Stream 失效逻辑复用）
    - `POST /api/v1/symbol-mapper/cache/invalidate` - 手动触发指定 provider 失效
    - CLI: `bun run cli symbol-mapper:cache:invalidate --provider=longport`
  - 访问权限：需要 Admin 或特定运维权限

**验收标准**:
- ✅ 现有调用方无需修改代码
- ✅ 返回数据结构保持一致
- ✅ 配置迁移无业务中断

#### 📅 Day 9: 模块集成测试
**任务清单**:
- [ ] **依赖注入验证** (3小时)
  - 在 Symbol Mapper 模块中注册新服务
  - 验证 DI 容器正确解析依赖
  - 检查与其他服务的交互

- [ ] **端到端功能测试** (3小时)
  - 测试完整的查询流程
  - 验证缓存命中和失效
  - 检查监控指标上报
  - **🚨 必补**: 现有调用方零改动回归验收

- [ ] **性能基准测试** (2小时)
  - 对比重构前后的性能数据
  - 验证缓存命中率提升
  - 确认延迟降低目标

**验收标准**:
- ✅ 模块可正常启动和运行
- ✅ 功能测试全部通过
- ✅ 性能指标达到预期目标

**里程碑交付物**:
- 完整的向后兼容接口
- 集成测试验证报告
- 性能对比基准数据

---

### ✅ Milestone 5: 测试和部署 (2天)
**交付目标**: 完整的测试覆盖和生产部署准备

#### 📅 Day 10: 全面测试覆盖
**任务清单**:
- [ ] **单元测试** (4小时)
  - `SymbolMapperCacheService` 核心方法测试
  - 缓存层级逻辑测试
  - 错误场景测试
  - 监控指标测试
  - **🚨 必补**: Change Stream 事件解析单测
    - `extractProviderFromChangeEvent` 针对 insert/update/delete 三类事件
    - 含/不含 `fullDocument` 场景，确保回查 `findById` 分支被覆盖
  - **🚨 必补**: L3 精准失效命中单测
    - 确认对 `mappingDetails` 的 key 与 value 均能触发命中删除
    - 确认对 `failedSymbols` 数组元素能触发命中删除
  - **🚨 必补**: 输出一致性校验单测
    - `mergeResults` 方法确保 `mappingDetails` 始终以"原始输入符号"为键
    - 无论 `to_standard` 或 `from_standard`，匹配兼容层 `mappingDetails[originalSymbol]` 取值约定
  - **🚨 必补**: 并发控制健壮性单测
    - `pendingQueries` 超时与异常清理测试
    - Promise 超时/拒绝后，键能被清理，避免悬挂

- [ ] **集成测试** (3小时)
  - MongoDB Change Stream 集成测试
  - FeatureFlags 配置测试
  - 与现有服务集成测试

- [ ] **性能测试** (1小时)
  - 高并发批量查询测试
  - 缓存失效性能测试
  - 内存使用测试
  - **🚨 必补**: 性能验收口径更精确
    - P95/P99 延迟对照（缓存前 vs 缓存后）
    - 每请求 DB 查询次数（平均/分位数）对照
    - 量化验证"数据库查询减少 90%""批量/单体延迟目标"
  - **🚨 必补**: 内存与容量回归测试
    - L1/L2/L3 容量与水位阈值触发的回退验证
    - 触发分层清理/降级后系统仍稳定运行
    - 测试场景：超过 maxSize 时的 LRU 清理、内存压力下的缓存降级

**验收标准**:
- ✅ 单元测试覆盖率 > 90%
- ✅ 集成测试全部通过
- ✅ 性能测试达到预期指标

#### 📅 Day 11: 部署准备和文档
**任务清单**:
- [ ] **生产环境配置** (2小时)
  - 环境变量配置文档
  - 监控告警设置
  - 回滚方案准备

- [ ] **部署文档** (3小时)
  - 分阶段部署计划
  - 配置迁移指南
  - 问题排查手册

- [ ] **最终验证** (3小时)
  - 预生产环境全流程测试
  - 性能指标最终确认
  - 监控数据验证

**验收标准**:
- ✅ 部署文档完整准确
- ✅ 预生产测试通过
- ✅ 监控和告警配置完成

**里程碑交付物**:
- 完整的测试套件
- 生产部署文档
- 监控和运维指南

---

## 📊 关键指标监控

### 缓存性能指标
- **L1（规则缓存）**: 目标命中率 > 95%
- **L2（符号缓存）**: 目标命中率 > 85%  
- **L3（批量缓存）**: 目标命中率 > 60%
- **查询延迟**: 单符号 < 2ms, 批量 < 30ms

### 系统健康指标
- **数据库查询减少**: 目标 > 90%
- **Change Stream 稳定性**: 重连次数 < 1次/天
- **缓存命中率提升**: 目标 > 80%
- **内存使用**: 增长 < 50MB

---

## 🚨 风险控制

### 主要风险识别
1. **MongoDB Change Stream 稳定性**: 网络中断导致监听失效
2. **内存使用增长**: 三层缓存内存占用
3. **配置兼容性**: 新字段部署兼容问题
4. **性能回归**: 重构引入新的性能瓶颈
5. **🚨 LRU 版本兼容**: 不同 LRU 版本 API 差异导致失效逻辑失败
6. **🚨 指标不一致**: 监控打点方式与现网不统一
7. **🚨 缓存开关失效**: `symbolMappingCacheEnabled` 开关未正确处理

### 缓解措施
- **监听稳定性**: 实现指数退避重连和错误恢复
- **内存控制**: 严格的 LRU 限制和水位告警
- **兼容部署**: 分阶段部署和配置验证
- **性能保障**: 每个里程碑都包含性能测试
- **🚨 LRU 兼容**: 双路径失效逻辑 + 版本适配单测
- **🚨 指标统一**: 严格使用 `Metrics.inc` 封装，禁用 `.set` 直调
- **🚨 开关保障**: 入口处统一检查缓存开关，提供降级路径

### 回滚策略
- 保持原有 API 接口不变
- 通过 FeatureFlags 快速禁用新功能
- 数据库结构无变更，回滚无数据风险

---

## 🎯 成功标准

### 技术指标
- ✅ 批量符号映射缓存命中率提升至 85%+
- ✅ 单符号查询延迟降低至 0.1-1ms
- ✅ 批量查询延迟降低至 10-30ms
- ✅ 数据库查询次数减少 90%

### 质量指标
- ✅ 单元测试覆盖率 > 90%
- ✅ 零业务中断部署
- ✅ 向后兼容 100% 保持
- ✅ 监控告警完整配置
- ✅ **🚨 必补验收**:
  - FeatureFlags 新字段单测覆盖 100%
  - 键生成一致性测试通过
  - LRU 双路径失效测试通过
  - Change Stream 稳定性测试通过
  - 现有调用方零改动验收通过
  - 缓存开关降级测试通过
  - Change Stream 事件解析单测覆盖全场景
  - L3 精准失效命中测试通过
  - 输出一致性校验单测通过
  - 并发控制健壮性单测通过
  - ENV 名称配置明确无歧义
  - 双向回填单测全覆盖通过
  - 运维接口正常可用（如实现）
  - 日志可观测性达到预期（如实现）
  - ENV 一致性设计文档与实现统一
  - 符号规范单测大小写与空白符处理通过
  - 监听幂等性单测通过（防多路监听）
  - 内存与容量回归测试通过（分层清理/降级稳定性）
  - 初始化 TTL/Max 来源一致（显式从 featureFlags 读取，非硬编码）
  - 指标标签稳定性（streamCacheHitRate 仅使用 cache_type 标签）
  - 性能验收口径精确（P95/P99 延迟 + DB 查询次数对照）
  - 资源与阈值告警（70%/80% 阈值 + 清理策略日志）

### 业务指标
- ✅ 系统响应时间整体提升 > 50%
- ✅ 数据库负载下降 > 80%
- ✅ 用户体验显著改善
- ✅ 运维成本有效降低

---

## 📅 总体时间线

| 阶段 | 持续时间 | 关键交付物 | 责任人 |
|------|----------|------------|--------|
| M1: 基础架构 | 2天 | 三层缓存架构 + 配置管理 | 开发 |
| M2: 核心功能 | 3天 | 统一查询 + 双向缓存 | 开发 |  
| M3: 智能失效 | 2天 | Change Stream + 差异失效 | 开发 |
| M4: 兼容集成 | 2天 | 兼容层 + 集成测试 | 开发 + 测试 |
| M5: 测试部署 | 2天 | 测试覆盖 + 部署准备 | 测试 + 运维 |

**总计**: 11天 (2.2周)

---

## 🚨 必补项清单 (容易遗漏的落地项)

### 配置与基础设施
- [ ] **FeatureFlags 新字段**: `batchResultCacheMaxSize`/`batchResultCacheTtl` + ENV 覆盖 + 单测
- [ ] **ENV 名称明确**: `BATCH_RESULT_CACHE_MAX_SIZE`、`BATCH_RESULT_CACHE_TTL` 避免实现歧义
- [ ] **初始化 TTL/Max 来源一致**: 显式从 `featureFlags` 读取，不在 `initializeCaches()` 硬编码
- [ ] **缓存开关兼容**: 统一尊重 `symbolMappingCacheEnabled`，关闭时直走原流程
- [ ] **类型导出**: interfaces 在 index.ts 中正确导出，确保编译器路径解析
- [ ] **内存保护**: 缓存容量与内存水位告警阈值 + 监控面板
- [ ] **资源与阈值告警**: 内存水位阈值明确默认值 70%/80% 两档 + 清理策略日志
- [ ] **运维接口**: 三层缓存统计查询 + 按 provider 精准失效管理接口
- [ ] **指标标签稳定性**: streamCacheHitRate 仅使用 cache_type 标签，禁止高基数标签
- [ ] **性能验收口径**: P95/P99 延迟 + 每请求 DB 查询次数对照，量化验证目标

### 核心逻辑
- [ ] **键规范测试**: `generateConsistentKey` 一致性、乱序、大小写兼容单测
- [ ] **符号规范单测**: 新增大小写与首尾空白符处理的用例
  - 确认 `generateConsistentKey` 仅小写 provider，不改动 symbol 本身
  - 防止因大小写处理不当导致的误命中
  - 测试场景：` Provider `、`  symbol  `、`SYMBOL`、`Symbol` 等
- [ ] **LRU 版本兼容**: `for (const [key] of cache)` + `.keys()` 双路径失效逻辑
- [ ] **L1 计数位置**: `getProviderRules()` 内完成命中/未命中计数
- [ ] **指标写法对齐**: 统一使用 `Metrics.inc` 封装，避免混用 `.set`
- [ ] **Change Stream 事件解析单测**: insert/update/delete 三类事件，含/不含 fullDocument 场景
- [ ] **监听幂等性单测**: `setupChangeStreamMonitoring()` 增加重复初始化不产生多路监听的单测
  - 防止多次注册导致内存泄漏和重复处理
  - 验证第二次调用时不创建新的 Change Stream 连接
- [ ] **L3 精准失效命中单测**: mappingDetails key/value + failedSymbols 均能触发删除
- [ ] **输出一致性校验单测**: mergeResults 确保 mappingDetails 以原始输入符号为键
- [ ] **并发控制健壮性单测**: pendingQueries 超时与异常清理测试
- [ ] **双向回填单测**: 仅成功项回填、双向写入正确性、失败项不回填
- [ ] **日志可观测性**: provider/direction/symbolsCount/cacheHit 分层记录
- [ ] **内存与容量回归测试**: L1/L2/L3 容量与水位阈值触发的回退验证

### 稳定性保障  
- [ ] **Change Stream 稳定性**: 断线重连/指数退避 + error/close 事件单测
- [ ] **兼容层验收**: 单体从 `mappingDetails[originalSymbol]` 取值，批量返回完整结构
- [ ] **零改动验收**: 现有调用方完全无需修改代码
- [ ] **降级测试**: 缓存关闭时的降级路径完整测试

这些必补项分散在各个里程碑中，建议在每个阶段验收时重点检查，避免实施期踩坑。



*本开发计划基于 Symbol Mapper 缓存重构设计方案制定，遵循阶段里程碑式交付模式，确保每个阶段都有明确的交付物和验收标准。*