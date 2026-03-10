# Repository Guidelines


## 项目概述

智能股票数据处理系统 - 基于NestJS框架的企业级股票数据处理平台，采用六组件核心架构，提供**强时效vs弱时效**双接口设计和多数据源融合能力。

## 核心架构

### 六组件核心架构（数据流管道）

系统采用清晰的六阶段数据流设计，从准备到缓存依次处理：

```
00-prepare → 01-entry → 02-processing → 03-fetching → 04-storage → 05-caching
```

#### 阶段详解

1. **00-prepare (准备阶段)**
   - `symbol-mapper/`: 股票代码格式转换和映射
   - `data-mapper/`: 数据源字段映射规则管理

2. **01-entry (入口阶段)**
   - `receiver/`: 强时效接口（交易时段 1 秒缓存，非交易时段可延长）
   - `receiver/receiver-chart-intraday.*`: 分时折线 HTTP 入口，负责 DTO、Swagger、鉴权与薄编排
   - `stream-receiver/`: WebSocket实时流数据接收（支持流缓存，按配置开关）
   - `query/`: 弱时效接口（智能检测，分析决策）
   - `query/support-list.*`: support-list 弱时效 HTTP 入口，负责协议暴露与薄编排

3. **02-processing (处理阶段)**
   - `symbol-transformer/`: 股票代码实时转换服务
   - `transformer/`: 原始数据格式标准化处理

4. **03-fetching (获取阶段)**
   - `data-fetcher/`: HTTP数据拉取服务
   - `stream-data-fetcher/`: WebSocket流数据推送服务
   - `chart-intraday/`: 分时折线读取能力实现，包含 `ChartIntradayReadService` 与 cursor 共享模块
   - `support-list/`: support-list 读取与同步实现，包含 `SupportListReadService`、同步调度、差异计算与存储协作

5. **04-storage (存储阶段)**
   - `storage/`: MongoDB 持久化存储（缓存能力由 05-caching 层承担）

6. **05-caching (缓存阶段)**
   - `module/basic-cache/`: 基础缓存模块
   - `module/smart-cache/`: 智能缓存编排器
   - `module/stream-cache/`: 流数据缓存
   - `module/data-mapper-cache/`: 映射规则缓存
   - `module/symbol-mapper-cache/`: 符号映射缓存
   - `foundation/`: 缓存基础设施（抽象类、接口、配置）

### 其他核心模块

- **appcore/**: 应用程序核心服务（生命周期管理、应用配置）
- **authv2/**: 认证授权模块（JWT + API Key + 权限管理）
- **common/**: 通用组件库（日志、异常、拦截器、验证器）
- **database/**: 统一数据库模块
- **providersv2/**: 数据源提供者（当前实现：LongPort、JvQuant、Infoway）


## 项目结构与模块组织
- 源码：`src/`（核心：`appcore/` 配置与启动、`core/` 领域模块、`providersv2/` 外部数据源、`cachev2/` 缓存、`authv2/` 鉴权、`common/` 公共模块、`database/` 数据库整合）。入口：`src/main.ts`。
- 文档与脚本：`docs/`、`scripts/`；构建产物：`dist/`；测试：`test/`（`test/unit` 与 `test/e2e` 并行维护）。
- TS 路径别名（见 `tsconfig.json`）：如 `@core/*`、`@providersv2/*`、`@cachev2/*` 等，优先使用别名而非相对路径。

### chart-intraday 最新落位
- 对外入口位于 `src/core/01-entry/receiver/`，当前由 `receiver-chart-intraday.controller.ts` 与 `receiver-chart-intraday.service.ts` 承担。
- 核心读取实现位于 `src/core/03-fetching/chart-intraday/`，由 `ChartIntradayReadService` 负责 snapshot/delta 编排。
- cursor 协议已统一为共享模块：`src/core/03-fetching/chart-intraday/module/chart-intraday-cursor.module.ts` + `services/chart-intraday-cursor.service.ts`，供 HTTP 与 WS 复用。
- 旧的 `src/core/01-entry/chart-intraday/` 已移除，不应恢复为独立入口模块。

### support-list 最新落位
- 对外入口位于 `src/core/01-entry/query/`，当前由 `support-list-query.controller.ts` 与 `support-list-query.service.ts` 承担。
- 核心读取实现位于 `src/core/03-fetching/support-list/`，由 `SupportListReadService` 对外提供 meta / full / delta 读取能力。
- 同步与存储职责保留在 fetching 层，由 `SupportListSyncService`、`SupportListFetchGatewayService`、`SupportListStoreService` 与 `SupportListSyncScheduler` 协同完成。
- 当前模式应保持为“query 入口消费 + fetching 能力实现”，不应把 support-list 核心逻辑回迁到 `01-entry/query/`。

## 构建、测试与本地开发
- 开发：`bun run dev`（热重载）/ 调试：`bun run start:debug`。
- 运行：`bun start`（默认）/ 生产：`bun run start:prod`。
- 构建：`bun run build`（调用 `tsc -p tsconfig.build.json` 输出到 `dist/`）。
- 质量：`bun run lint`、`bun run format:check`、`bun run format`、`bun run security:deps`。
- 类型单文件检查：`npm run typecheck:file -- <path.ts>`。
- 测试（Jest + ts-jest）：单元测试使用 `test/jest.unit.config.js`，命令 `bun run test:unit` / `bun run test:unit:coverage`；集成测试使用 `test/jest.e2e.config.js`，命令 `bun run test:e2e` / `bun run test:e2e:coverage`。

## JvQuant 调试脚本
- 生成测试凭证：`npm run tool:bootstrap-apikey`
  - 作用：自动注册（已存在则跳过）、登录、创建带流权限的 API Key。
  - 默认输出：`APP_KEY`、`ACCESS_TOKEN`、`USERNAME`、`PASSWORD`。
  - 常用参数：`BASE_URL`、`API_KEY_PROFILE`、`API_KEY_PERMISSIONS`、`API_KEY_EXPIRES_IN`。
- 流数据验证：`npm run tool:test-jvquant-ws`
  - 作用：连接 WebSocket 并订阅 `stream-stock-quote`（`preferredProvider=jvquant`），校验指定市场是否收到数据。
  - 常用参数：`BASE_URL`、`APP_KEY`、`ACCESS_TOKEN`、`SYMBOLS`、`EXPECT_MARKETS`、`MIN_DATA_COUNT`、`TIMEOUT_MS`、`VERBOSE_PACKET`。
  - 示例：
    - `BASE_URL=http://127.0.0.1:3001 APP_KEY=... ACCESS_TOKEN=... EXPECT_MARKETS=US npm run tool:test-jvquant-ws`

## Infoway 调试脚本
- REST 能力验证：`npm run tool:test-infoway-rest`
  - 作用：调用 `receiver/data` 并验证 `preferredProvider=infoway` 的 4 个能力：
    - `get-stock-quote`
    - `get-stock-basic-info`
    - `get-market-status`
    - `get-trading-days`
  - 常用参数：`BASE_URL`、`APP_KEY`、`ACCESS_TOKEN`、`USERNAME`、`PASSWORD`、`SYMBOLS`、`TEST_MARKET`、`BEGIN_DAY`、`END_DAY`。
  - 安全限制：仅允许在本地/测试环境执行，禁止在生产环境直接使用该调试命令。
  - 凭据要求：示例与日志必须使用占位符或脱敏值，不得把真实凭据写入命令历史、日志或 issue。
  - 示例：
    - `BASE_URL=http://127.0.0.1:3001 APP_KEY=<APP_KEY> ACCESS_TOKEN=<ACCESS_TOKEN> npm run tool:test-infoway-rest`

## 编码风格与命名规范
- 语言：TypeScript；缩进 2 空格；优先 `named export`；禁止无意义的缩写。
- 文件命名：`*.module.ts`、`*.service.ts`、`*.controller.ts`、`*.constants.ts`、`*.dto.ts`、`*.enum.ts`。
- Lint/Format：ESLint（`eslint.config.mts`）+ Prettier，遵循常量与弃用规则（存在多处 `no-restricted-*` 约束，避免硬编码字符串与旧路径）。

## 测试规范
- 框架：Jest 30.x + ts-jest；测试分层为 `test/unit/**/*.spec.ts`（单元）与 `test/e2e/**/*.e2e-spec.ts`（集成）。
- 基本要求：新增功能需配套最小可行单元测试，逐步提升覆盖率。
- 示例：`npx jest --passWithNoTests --runInBand` 或指定单测文件运行。

## Commit 与 PR 规范
- Commit：遵循 Conventional Commits，如 `feat(core/cache): add stream cache TTL`。常用类型：`feat|fix|refactor|chore|docs|test|perf|build|ci|style`。
- PR 要求：变更说明、动机与影响范围、测试方式/截图、关联 issue、风险与回滚策略；小步提交、保持可评审性。

## 安全与配置
- 环境：当前仓库示例为 `.env` 与 `.env.test`，请勿提交敏感信息；本地仅加载必要变量。
- 审计：`bun run security:deps` 定期检查依赖风险。

## Agent 专用指引
- 范围：遵循本文件；最小侵入修改，避免无关重构；优先使用现有脚本。
- 搜索：优先 `rg`；路径使用正斜杠，命令中的路径使用引号包裹。
- 禁止执行：`git push/reset`、删除/移动大量文件等高风险操作，除非得到明确授权。
