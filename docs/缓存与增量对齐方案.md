# 缓存与增量对齐方案

写入时间：2026-03-10 00:57:00
版本号：v1.4.0-20260310

本文档说明对外提供“全量 + 增量”清单服务的最小成本实现方案。核心原则：每日全量拉取、本地差量计算、持久化增量与版本号，确保下游可准确对齐新增与删除。

———

## 目标行为（对下游）

1. 首次拉取全量
2. 后续只拉增量
3. 每天自动刷新并产生增量

———

## 核心实现思路（自监控变化）

### 1. 每日全量拉取（定时任务）

- 每天固定时间（例如 02:00）拉取全量 support-list
- 拉取成功后与上次全量做 diff

### 2. 差量计算（added / updated / removed）

- 唯一键：symbol（标准化后）
- 比较方式：对每条记录做稳定哈希（字段排序后 JSON → hash）
- 输出三类：
  - added（新出现）
  - updated（hash 变化）
  - removed（旧有新无）

### 3. 版本号 & 变更序列

- 版本号：单调递增（推荐 YYYYMMDDHHmmss 或自增整数）
- 持久化：
  - 当前全量 current
  - 当前版本 currentVersion
  - 变更记录 delta(version, added, updated, removed)

### 4. 对外 API 设计（下游）

- GET /support-list?type=...
  - 返回全量 + version
- GET /support-list?type=...&since=VERSION
  - 返回增量（如果可用）

### 5. 增量可用性策略

- 如果 since 太老或超过保留窗口（本方案为 7 天）：
  - 返回全量并标记 full: true

———

## 存储建议（考虑 5MB 数据）

- 不要将 5MB 全量放 Redis（BasicCacheService 1MB 限制）
- 推荐使用 Mongo 持久化 + gzip 压缩

建议三类存储：

1. 全量快照（current）
2. 增量记录（delta）
3. 元数据（meta：当前版本 / 更新时间）

———

## 下游对齐机制（必须包含删除）

### 1. 版本策略

- currentVersion：当前全量版本
- deltaVersion：每次全量对比后产出的增量版本

### 2. 对外接口（下游对齐方式）

A. 获取最新版本

- GET /support-list/meta?type=...
- 返回：{ currentVersion, lastUpdated }

B. 首次拉全量

- GET /support-list?type=...
- 返回：{ full: true, version: currentVersion, items: [...] }

C. 增量对齐

- GET /support-list?type=...&since=V
- 返回：{ full: false, from: V, to: currentVersion, added: [...], updated: [...], removed: [...] }

规则：

- since 太老或 delta 不完整 → 返回全量（full: true）
- since == currentVersion → 返回空增量

### 3. 删除同步

必须提供 removed 列表，否则下游无法删掉过期数据。

示例结构：

{
  "added": [...],
  "updated": [...],
  "removed": ["AAPL.US", "00700.HK"]
}

### 4. 下游对齐流程

1. 读取 currentVersion
2. 传 since（本地历史版本）
3. 返回 full → 覆盖
4. 返回 delta → 依次 apply
5. 更新本地版本号

———

## 固定参数（已确认）

- 增量保留窗口：7 天
- 更新周期：1 天（每日一次全量拉取 + 生成增量）

### 环境变量配置（已确认）

- `SUPPORT_LIST_TYPES`：支持的 `type` 白名单（逗号分隔，启动时加载；未配置回退 provider 默认集合）
- `PROVIDER_PRIORITY_GET_SUPPORT_LIST`：`get-support-list` 能力级 provider 优先级
- `PROVIDER_PRIORITY_DEFAULT`：全局 provider 优先级回退配置

说明：

- 不做 provider pin 固定策略。
- 不做 source-switch 标记字段。
- 首选 provider 失败时按优先级自动切换到下一个候选。

———

## 关键补充（落地细节）

### 1. 缓存命中范围

- 仅对“symbols 为空”的全量请求启用缓存。
- 带 symbols 的请求默认走实时拉取（避免局部筛选导致与源不一致）。
- 如果必须支持 symbols 过滤，可基于全量缓存本地过滤，但需要额外一致性说明，不在最小成本方案内。

### 2. 版本与回退策略

- since 太老或 delta 不完整，必须返回全量并标记 full: true。
- 返回 full 时，下游应直接覆盖本地数据并更新版本。

### 3. 存储键规范（建议）

- support_list_current_{type}
- support_list_delta_{version}_{type}
- support_list_meta_{type}

说明：

- current：保存最新全量 + version
- delta：保存增量（added/updated/removed）
- meta：保存 currentVersion + lastUpdated

### 4. 数据保留策略

- delta 仅保留 7 天（TTL）
- current/meta 长期保留

### 5. 版本号生成

- 推荐 YYYYMMDDHHmmss（单调递增）
- 每日全量任务成功后生成新版本号

———

## 接口字段与数据结构（落地规格）

### 1. Meta 接口

GET /support-list/meta?type=...

返回：

{
  "type": "STOCK_US",
  "currentVersion": "20260309020000",
  "lastUpdated": "2026-03-09T02:00:00.000Z",
  "retentionDays": 7
}

### 2. 全量接口

GET /support-list?type=...

返回：

{
  "full": true,
  "version": "20260309020000",
  "items": [
    {
      "symbol": "AAPL.US",
      "name": "Apple Inc.",
      "market": "US",
      "exchange": "NASDAQ"
    }
  ]
}

### 3. 增量接口

GET /support-list?type=...&since=20260301020000

返回：

{
  "full": false,
  "from": "20260301020000",
  "to": "20260309020000",
  "added": [
    {
      "symbol": "TSLA.US",
      "name": "Tesla Inc.",
      "market": "US",
      "exchange": "NASDAQ"
    }
  ],
  "updated": [
    {
      "symbol": "META.US",
      "name": "Meta Platforms, Inc.",
      "market": "US",
      "exchange": "NASDAQ"
    }
  ],
  "removed": ["BABA.US"]
}

### 4. 特殊返回规则

- since == currentVersion → 返回空增量：

{
  "full": false,
  "from": "20260309020000",
  "to": "20260309020000",
  "added": [],
  "updated": [],
  "removed": []
}

- since 超过保留窗口或 delta 不完整 → 返回全量：

{
  "full": true,
  "version": "20260309020000",
  "items": [...]
}

### 5. 存储结构（建议字段）

A. current

{
  "key": "support_list_current_STOCK_US",
  "version": "20260309020000",
  "updatedAt": "2026-03-09T02:00:00.000Z",
  "items": [...]
}

B. delta

{
  "key": "support_list_delta_20260309020000_STOCK_US",
  "from": "20260301020000",
  "to": "20260309020000",
  "added": [...],
  "updated": [...],
  "removed": [...]
}

C. meta

{
  "key": "support_list_meta_STOCK_US",
  "currentVersion": "20260309020000",
  "lastUpdated": "2026-03-09T02:00:00.000Z",
  "retentionDays": 7
}

———

## 字段校验规则（建议）

1. type
   - 必填
   - 必须在白名单内（与 provider 支持类型一致）

2. since
   - 可选
   - 仅允许 14 位数字（YYYYMMDDHHmmss）或纯数字递增版本号
   - 不允许未来时间

3. symbols
   - 可选
   - 仅允许字母/数字/点号/下划线/中划线/冒号
   - 最大数量 1000，单项长度受 provider 限制

———

## 版本对齐异常码约定（建议）

- SUPPORT_LIST_VERSION_INVALID
  - since 格式非法或无法解析
- SUPPORT_LIST_VERSION_TOO_OLD
  - since 早于保留窗口或 delta 不完整
- SUPPORT_LIST_TYPE_INVALID
  - type 不在支持列表

说明：

- 如果是 VERSION_TOO_OLD，建议直接返回 full: true，避免硬错误影响对齐。
- 只有参数非法（VERSION_INVALID / TYPE_INVALID）才返回错误响应。

———

## 最小成本实现路径（现有架构）

1. 新增定时任务（每天一次）
2. 定时任务调用 Infoway 全量
3. 对比上一次版本（按 symbol hash）
4. 写入 StorageService（current + delta + meta）
5. API 读取 current 或 delta 返回

———

## 组件归属（最终）

1. provider（`providersv2/providers/infoway/capabilities/get-support-list.ts`）
   - 只负责上游能力拉取，不承载版本/增量逻辑
2. core/03-fetching/support-list
   - 负责同步编排、版本生成、差量计算、持久化读写
3. query（`/query/support-list*`）
   - 只负责协议层：参数校验、鉴权、响应包装、调用读取服务
