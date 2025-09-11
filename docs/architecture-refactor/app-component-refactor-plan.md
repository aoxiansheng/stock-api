## @/app 组件重构方案（采用 AppCoreModule 命名约束）

本方案针对 `backend/src/app` 组件内部架构混乱、可读性差、边界不清晰的问题，提供一套“零残留、可验证”的重构计划。保留唯一顶级根模块 `backend/src/app.module.ts` 不变；内部新增/迁移的聚合模块统一命名为 `AppCoreModule`（文件名 `appcore.module.ts`），避免出现额外的 `app.module.ts`。

---

### 重构目标
- 明确边界：将配置、启动编排、运行时任务、日志、特性开关与监控分层解耦。
- 提升可读性：统一命名与目录结构，模块职责单一，入口清晰。
- 零残留：迁移后删除旧目录与无引用文件；CI/ESLint 阻断旧路径引用。
- 可验证：提供命令级“残留检测”、测试与性能对比基线。

---

### 现状问题（基于代码库现况）
- 配置分散且重复：`app/config` 与 `app/configuration` 双轨并存（如 validators、feature-flags）。
- 基础设施杂糅：`app/infrastructure/health` 与 `monitoring/health` 职责重叠；`background-task`/`shutdown` 更适合归属“应用运行时”。
- 启动职责分散：`bootstrap` 与 `core/services/lifecycle`、`application.service` 边界不清。
- 超大单文件：`logger.config.ts`（≈12KB）维护成本高，建议拆分模块/工厂/配置项。

---

### 目标目录结构与职责边界
```text
src/app.module.ts                     # 顶层唯一根模块（保持）

src/app/
  runtime/                          # 应用运行时（原 core/services + infra/services 的运行时部分）
    appcore.module.ts               # 内部聚合模块（导出 AppCoreModule）
    application.service.ts          # 原 core/services/application.service.ts
    lifecycle.service.ts            # 原 core/services/lifecycle.service.ts
    tasks/
      background-tasks.service.ts   # 原 infrastructure/services/background-task.service.ts
    shutdown/
      shutdown.service.ts           # 原 infrastructure/services/shutdown.service.ts

  bootstrap/                        # 启动编排（职责纯化）
    bootstrap.module.ts
    startup-orchestrator.service.ts
    phases/
      ...                           # 仅保留启动流程相关

  config/                           # 统一配置（合并 configuration 与 config）
    app-config.module.ts            # 新：汇聚 loader + validation + providers
    loaders/
      app.config.ts                 # from app/config/app.config.ts
      feature-flags.config.ts       # from app/config/feature-flags.config.ts
      auto-init.config.ts           # from app/config/auto-init.config.ts
      startup.config.ts             # from app/config/startup.config.ts
      notification.config.ts        # from app/config/notification.config.ts
    validation/
      environment.validator.ts      # from app/configuration/validators/environment.validator.ts
      dependencies.validator.ts     # from app/configuration/validators/dependencies.validator.ts
      config-validator.service.ts   # from app/configuration/services/config-validator.service.ts
      environment-validator.service.ts
      dependencies-validator.service.ts
      config-validation.module.ts
    feature-flags/
      feature-flags.module.ts       # from app/configuration/feature-flags.module.ts
      feature-flags.service.ts      # from app/configuration/services/feature-flags.service.ts

  logging/
    logger.module.ts                # 新：日志模块化封装
    logger.config.ts                # 从 config/logger.config.ts 拆分出的配置
    logger.factory.ts               # 新：Logger 实例工厂
```
- 目录清理：
  - 删除 `src/app/configuration/`（全部并入 `config/`）。
  - `src/app/infrastructure/health/health-check.service.ts` 合并进 `src/monitoring/health/`，保留单一健康检查归属监控模块。
  - `src/app/infrastructure/services/*` 迁入 `runtime/`（运行时任务与优雅关闭）。
  - `src/app/core/services/*` 与 `src/app/core/application.module.ts` 迁入 `runtime/`（统一“应用服务层”）。

---

### 命名与导入规范
- 聚合模块命名：`AppCoreModule`（文件名 `appcore.module.ts`）。
- 顶层根模块：只保留 `backend/src/app.module.ts`。
- 模块命名：`XxxModule`；服务：`XxxService`；配置 loader：`xxx.config.ts`；工厂：`xxx.factory.ts`。
- Barrel 导出：仅在模块根导出 `module` 与公开 types/tokens，内部结构不对外暴露。
- 路径别名（tsconfig）：
  - `@app/*` → `src/app/*`
  - `@config/*` → `src/app/config/*`
  - `@logging/*` → `src/app/logging/*`
  - 约束：业务层不得越层引用 `config` 内部子路径（通过 ESLint 限制）。

---

### 模块迁移映射（代表性）
- 配置与特性开关：
  - `app/config/logger.config.ts` → 拆分为 `app/logging/logger.config.ts`、`app/logging/logger.factory.ts`、`app/logging/logger.module.ts`
  - `app/config/feature-flags.config.ts` + `app/configuration/feature-flags.module.ts` + `app/configuration/services/feature-flags.service.ts`
    → `app/config/feature-flags/*`（模块、服务、配置三位一体）
  - `app/configuration/validators/*` + `app/config/validation/*` → 统一到 `app/config/validation/*`，以 `config-validation.module.ts` 内聚
- 基础设施与运行时：
  - `app/infrastructure/health/health-check.service.ts` → `monitoring/health/*`（去重合并）
  - `app/infrastructure/services/background-task.service.ts` → `app/runtime/tasks/background-tasks.service.ts`
  - `app/infrastructure/services/shutdown.service.ts` → `app/runtime/shutdown/shutdown.service.ts`
- 应用服务层统一：
  - `app/core/application.module.ts` → `app/runtime/appcore.module.ts`（导出 `AppCoreModule`）
  - `app/core/services/*` → `app/runtime/*`

---

### 顶层装配保持唯一性（不新增根模块）
- 在 `backend/src/app.module.ts`：
  - 用 `./app/runtime/appcore.module` 替换原 `./app/core/application.module` 的导入（`AppCoreModule` 取代 `ApplicationModule`）。
  - 新增引入：`@config/app-config.module`、`@logging/logger.module`。
- 在 `backend/src/main.ts`：
  - `ApplicationService` 导入路径改为 `@app/runtime/application.service`。
  - `CustomLogger` 与 `getLogLevels` 从 `@config/logger.config` 迁移为 `@logging/logger.factory` 或由 `@logging/logger.module` 暴露的入口。
- 顶层只保留一个根模块：`AppModule`（文件 `backend/src/app.module.ts`）。

---

### 渐进式迁移步骤（零停机、零残留）
1) 准备阶段（并行引入，不切断旧引用）
   - 新建 `app/runtime`、`app/logging`、合并后的 `app/config` 骨架与空模块。
   - 在 `app.module.ts` 并行引入新模块，保证可回退。

2) 迁移实现
   - 移动 `configuration/*` → `config/*` 并修正所有导入。
   - 拆分 `logger.config.ts` 为 `logger.module/config/factory`，更新依赖注入。
   - 移动 `infrastructure/services/*` → `runtime/*`，保持 Provider token 不变或在 `runtime` 统一重新导出。
   - 合并 `infrastructure/health` → `monitoring/health`，消除重复实现。
   - 移动 `core/services/*` 与 `core/application.module.ts` → `runtime/*`。

3) 切换与清理
   - 更新 `app.module.ts` 仅指向新路径。
   - 执行“残留检测”后删除旧目录：
     - 删除 `src/app/configuration/`
     - 删除 `src/app/infrastructure/health/`
     - 删除 `src/app/infrastructure/services/`
     - 删除 `src/app/core/services/`（或整个 `core/` 目录若不再需要）

4) 验证与加固
   - 全量测试、性能基线对比、内存快照对比。
   - 引入 ESLint 边界规则与 CI 断言（见下）。

---

### 残留代码与错误引用的自动化防护
- 快速引用检查（示例命令）：
```bash
rg "from\s+[\"\\']@app/configuration" -n backend/src
rg "@app/infrastructure/health" -n backend/src
rg "@app/infrastructure/services" -n backend/src
rg "@app/core/services" -n backend/src
```
- 删除空文件/无引用文件（审阅后执行删除）：
```bash
rg --files-without-match "." backend/src/app/configuration | xargs -I{} echo "DELETE {}"
```
- ESLint 边界规则（示例增量，加入 `eslint.config.mts`）：
```ts
{
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          { name: '@app/configuration', message: '已移除，请使用 @config/*' },
          { name: '@app/infrastructure/health', message: '已合并到 monitoring/health' },
          { name: '@app/infrastructure/services', message: '请使用 @app/runtime/*' },
          { name: '@app/core/services', message: '请使用 @app/runtime/*' },
        ],
        patterns: [
          { group: ['@app/configuration/*'], message: '已移除，请使用 @config/*' },
        ],
      },
    ],
  },
}
```
- 结构校验：扩展现有 `tools/src-structure-validator.ts`，声明允许目录清单与禁止路径模式，CI 必须通过后方可合并。

---

### 测试与验收标准
- 测试：单元/集成/黑盒/安全/性能测试全部通过（仓库已有完整套件）。
- 构建：`bun run build` 无弃用导入/路径警告；`rg` 全局无旧路径匹配；不存在空目录。
- 监控：`monitoring/health` 中仅保留单一健康检查实现。
- 日志：`logger.module.ts` 可独立启用/替换；工厂暴露 `CustomLogger` 与 `getLogLevels`。
- 入口：`main.ts` 仍只创建唯一 `AppModule`；`AppCoreModule` 仅作为内部聚合模块被装配。

---

### 风险与回滚
- 风险：隐性依赖（Provider token/作用域变更）、路径别名冲突、未更新测试挂载点。
- 规避：迁移阶段保持同名 Provider token；必要时在 `runtime`/`config` 提供别名导出；先引入新模块再切断旧路径。
- 回滚：保留变更前分支；准备阶段新旧模块并行，可随时切换回旧实现。

---

### 排期（可并行）
- 第1天：新骨架、ESLint 禁止旧路径、`logging` 拆分。
- 第2天：合并 `configuration` → `config` 与 validators；修正引用。
- 第3天：迁移 `infrastructure/services` → `runtime`；合并健康检查到 `monitoring`。
- 第4天：删旧目录、全量修正导入、完善 CI 校验与全套测试/性能对比。

---

### 交付物
- 新内部模块与目录：`app/runtime/appcore.module.ts`、`app/logging/*`、合并后的 `app/config/*`。
- 更新的 `backend/src/app.module.ts` 与 `backend/src/main.ts` 导入路径。
- ESLint/CI 规则更新与结构校验脚本。
- 迁移报告（残留清单为零、测试与性能对比结果）。

---

### 路径别名基准（tsconfig）
为避免别名书写歧义，以下为实际生效的路径别名片段（来自 `backend/tsconfig.json`）：

```json
{
  "paths": {
    "@app/*": ["src/app/*"],
    "@config/*": ["src/app/config/*"]
  }
}
```

- 文档中的命令与 ESLint 规则均已统一为上述别名格式。

---

### 代码证据（分歧处需落地修正）
- `main.ts` 仍引用 `./app/core/services/application.service`，需迁移至 `@app/runtime/application.service`：
```20:21:backend/src/main.ts
import { ApplicationService } from "./app/core/services/application.service";
```

- 智能缓存编排仍依赖 `@app/infrastructure/services/background-task.service`，需迁移至 `@app/runtime/tasks/background-tasks.service`：
```16:16:backend/src/core/05-caching/smart-cache/services/smart-cache-orchestrator.service.ts
import { BackgroundTaskService } from "@app/infrastructure/services/background-task.service";
```

- 监控健康检查实现对 `HealthCheckService` 有反向依赖，整合后应移除：
```11:15:backend/src/monitoring/health/extended-health.service.ts
import {
  HealthCheckService,
  HealthCheckResult,
} from "../../app/infrastructure/health/health-check.service";
```

---

### 必须更新的引用清单（强制）
- 将 `./app/core/services/*` 全量替换为 `@app/runtime/*`。
- 将 `@app/infrastructure/services/*` 全量替换为 `@app/runtime/*`。
- `main.ts`：`ApplicationService` 改为 `@app/runtime/application.service`。
- 如有自定义日志引用，统一调整为从 `@logging/logger.module` 或 `@logging/logger.factory` 获取。

---

### 健康检查整合动作（强制）
- 在 `monitoring/health` 内统一实现 Redis/Mongo/Memory 等依赖检查，不再从 `app/infrastructure/health` 导入。
- 从 `extended-health.service.ts` 中移除对 `HealthCheckService` 的导入与调用，采用本地方法（已存在 `checkMongoDBHealth`、`checkRedisHealth`）。
- 删除 `src/app/infrastructure/health/` 目录，避免双实现与循环依赖。

---

### 命令补充（用于核对与落地）
```bash
# 发现仍在使用的旧引用
rg "\./app/core/services" -n backend/src
rg "@app/infrastructure/services" -n backend/src

# 确认 tsconfig 别名引用健康
rg "from\\s+\"@app/" -n backend/src | head -n 20
rg "from\\s+\"@config/" -n backend/src | head -n 20

# 健康检查去重核查（整合后应无结果）
rg "app/infrastructure/health/health-check.service" -n backend/src
```
