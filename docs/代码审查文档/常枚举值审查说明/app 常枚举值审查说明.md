## app 常枚举值审查说明

### 范围 Scope
- 路径 Path: `backend/src/app/**`
- 内容 Content: TypeScript 枚举、常量配置、配置接口及相关启动/校验类

### 方法 Method
- 静态分析 Static analysis: 搜索 `enum`、`export const`、配置接口字段；全仓使用关系搜索验证引用情况
- 关注 Focus: 完全相同定义的重复项、从未引用项、语义重复字段、可简化/可删除字段

---

## 1. 枚举/常量重复与未使用 Duplicates & Unused

### 1.1 枚举 Enum
- 未使用的枚举成员 Unused enum member
  - 文件 File: `backend/src/app/config/validation/validation.interfaces.ts`
  - 成员 Member: `ValidationSeverity.INFO = 'info'`
  - 引用 Usage: 未检索到任何对 `ValidationSeverity.INFO` 的引用（ERROR、WARNING 有使用）
  - 片段 Snippet:
    ```35:39:backend/src/app/config/validation/validation.interfaces.ts
    export enum ValidationSeverity {
      ERROR = 'error',
      WARNING = 'warning',
      INFO = 'info'
    }
    ```
  - 建议 Suggestion: 若无需求请移除 INFO；或在非致命提示场景落地使用

### 1.2 常量 Constants
- `LoggerConfig.ROTATION` 未使用
  - 文件 File: `backend/src/app/config/logger.config.ts`
  - 片段 Snippet:
    ```401:407:backend/src/app/config/logger.config.ts
    // 日志轮转配置（如果使用文件日志）
    ROTATION: {
      maxSize: "20m",
      maxFiles: 10,
      datePattern: "YYYY-MM-DD",
    },
    ```
  - 引用 Usage: 未检测到对 `LoggerConfig.ROTATION` 的读取
  - 建议 Suggestion: 如无文件日志输出计划，可删除；或在生产落地文件日志时实际使用

- 配置工厂导出使用情况 Config factories
  - `export const appConfig = () => createAppConfig();`（被 `AppConfigModule` 加载）
  - `export const startupConfig = () => createStartupConfig();`（被 `AppConfigModule` 加载）
  - `export const notificationConfig = { ... }`（被 `AppConfigModule` 加载，且被通知服务引用）
  - 结论 Conclusion: 常量本身已被模块加载视为“使用”。但内部字段是否被业务消费需见下文字段层面分析

- 未被引用的导出类 Unused exported class
  - 文件 File: `backend/src/app/config/app.config.ts`
  - 符号 Symbol: `export class TypedConfigService`
  - 引用 Usage: 未检测到任何导入/使用
  - 建议 Suggestion: 若无计划使用，可删除；或在读取集中化配置时替代 `process.env` 直读

- 模板常量 Template constants
  - 文件 File: `backend/src/app/config/notification.config.ts`
  - 常量 Constant: `notificationConfig`（默认通知模板与邮件主题）
  - 引用 Usage: 已被 `alert/services/notification.service.ts` 使用，正常

---

## 2. 语义重复字段 Semantic duplicates across models/configs

> 依据字段名称、注释、使用上下文对比，识别“名称不同但含义相同/高度重合”的字段。

- 压缩阈值 Compression threshold（重复）
  - `AppConfig.cache.compressionThreshold`（定义于 `app.config.ts`）
  - `MonitoringConfig.cache.compressionThreshold`（定义于 `monitoring/config/monitoring.config.ts`，实际被监控缓存使用）
  - 使用 Usage: 监控侧大量使用 MonitoringConfig 的阈值；AppConfig 侧阈值未被消费
  - 合并建议 Merge: 统一到监控或通用缓存配置之一；若需全局统一，抽到 `common` 配置并全局引用

- 默认 TTL Default TTL（命名差异，含义一致）
  - `AppConfig.cache.defaultTtl`（camelCase）
  - `core/05-caching/common-cache/interfaces/cache-config.interface.ts` 中 `defaultTTL`（TTL 大写）
  - 使用 Usage: 业务实际侧多使用各服务内部 TTL/接口参数，未见从 `AppConfig` 读取该值
  - 合并建议 Merge: 统一命名与来源（建议 `defaultTTL`），并由各处通过 `ConfigService` 获取，避免硬编码

- API Key 请求头 API key header names（重复/分散）
  - `AppConfig.security.apiKey.headerName` / `accessTokenHeaderName`
  - 业务大量直接硬编码 `x-app-key`、`x-access-token`（见 `main.ts`、`auth`、`core` 等）
  - 合并建议 Merge: 建立单一来源（例如 `common/constants/http-headers.constants.ts` 或直接沿用 `AppConfig.security.apiKey`），替换硬编码

- 监控开关 Performance monitoring toggle（潜在重复）
  - `AppConfig.monitoring.performanceMonitoring`（定义）
  - 监控装饰器/拦截器实际通过自有配置与装饰器元数据控制，无读取该字段
  - 合并建议 Merge: 若不使用 `AppConfig` 字段，删除之；或拦截器/装饰器读取统一配置开关

- CORS 配置 CORS
  - `AppConfig.security.cors.origin/credentials` 定义
  - `main.ts` 直接从 `process.env` 读取并配置
  - 合并建议 Merge: 统一通过 `ConfigService` 读取，移除重复的 `process.env` 直读

---

## 3. 字段使用率与可简化建议 Field usage & simplification

> 基于代码实际引用与复杂度，提出删除/优化建议。

- `ValidationSeverity.INFO`（未使用）
  - 结论: 可删除；或在低优先级提示中落地使用

- `LoggerConfig.ROTATION`（未使用）
  - 结论: 若短期不落地文件日志，建议删除；或在生产启用文件轮转时接入 pino transport/file

- `TypedConfigService`（未使用）
  - 结论: 可删除；或推广在各模块替代 `process.env` 直读以统一配置访问

- `AppConfig.app.globalPrefix`（未使用）
  - 现状: `main.ts` 硬编码 `api/v1`
  - 建议: 由 `ConfigService` 读取 `app.globalPrefix` 并设置；否则移除该字段

- `AppConfig.security.apiKey.headerName / accessTokenHeaderName`（未使用）
  - 现状: 多处硬编码请求头
  - 建议: 建立统一常量来源，并替换所有硬编码；否则移除字段

- `AppConfig.security.cors.*`（未使用）
  - 现状: `main.ts` 使用 `process.env`
  - 建议: 统一到 `ConfigService`，或移除 `AppConfig` 字段

- `AppConfig.cache.defaultTtl / maxItems`（基本未被消费）
  - 现状: 业务侧使用自有 DTO/接口传参或模块内默认值
  - 建议: 若无全局消费点，删除或在缓存服务初始化中真正接入

- `AppConfig.alert.notificationChannels / rateLimits`（未使用）
  - 现状: 未检索到业务消费；通知逻辑使用 `notification.config`
  - 建议: 合并到 `alert.config` 或删除

- `AppConfig.monitoring.performanceMonitoring / metricsEndpoint`（未使用）
  - 建议: 统一到监控模块现有配置体系或删除

- 敏感字段脱敏规则重复（跨组件提示）
  - `LoggerConfig.SENSITIVE_FIELDS` vs `auth/middleware/security.middleware.ts` 内部 `sensitiveFields`
  - 建议: 以 `sanitizeLogData`/`LoggerConfig` 为单一来源，移除中间件重复实现

---

## 4. 明细清单 Detailed lists

### 4.1 未使用项 Unused items
- Enum member: `ValidationSeverity.INFO` → 值 value: `'info'`
  - 路径 Path: `backend/src/app/config/validation/validation.interfaces.ts`
- Constant property: `LoggerConfig.ROTATION`
  - 路径 Path: `backend/src/app/config/logger.config.ts`
- Exported class: `TypedConfigService`
  - 路径 Path: `backend/src/app/config/app.config.ts`
- AppConfig fields likely unused（未检索到消费）：
  - `app.globalPrefix`
  - `security.apiKey.headerName` / `security.apiKey.accessTokenHeaderName`
  - `security.cors.origin` / `security.cors.credentials`
  - `cache.defaultTtl` / `cache.maxItems`
  - `alert.enabled` / `alert.notificationChannels` / `alert.rateLimits`
  - `monitoring.performanceMonitoring` / `monitoring.metricsEndpoint`
  - 路径 Path: `backend/src/app/config/app.config.ts`

### 4.2 语义重复项 Semantic duplicates
- 压缩阈值 compressionThreshold
  - `app.config.ts` vs `monitoring/config/monitoring.config.ts`
- 默认 TTL defaultTTL/defaultTtl
  - `app.config.ts` vs `core/05-caching/common-cache/interfaces/cache-config.interface.ts`
- API 请求头名 API header names
  - `app.config.ts` vs 业务处多处硬编码（建议集中化）

> 注：本节仅列举“同义/重合”关系，详见第 3 节合并建议。

---

## 5. 处置建议 Actions
- 删除 Remove
  - `ValidationSeverity.INFO`、`LoggerConfig.ROTATION`、未使用的 `TypedConfigService`
- 合并/统一 Merge/Unify
  - 压缩阈值：统一到一个配置来源（建议 common/monitoring 二选一）
  - 默认 TTL：统一命名与读取方式
  - API Header：建立单一常量来源并全量替换
  - CORS/全局前缀：统一由 `ConfigService` 读取，消除 `process.env` 直读与硬编码
- 保留并落地 Use instead of delete
  - 若确有未来需求（如文件轮转、INFO 级校验提示），请在近期落地使用点，否则按删除处理

---

## 6. 后续计划 Next steps
- 在 `common/constants` 引入头部常量与敏感字段常量，替换全局硬编码
- 在 `cache` 与 `monitoring` 之间统一压缩阈值与默认 TTL 来源
- 在 `main.ts` 使用 `ConfigService` 读取 `app.globalPrefix` 与 `security.cors`
- 清理未使用字段/类，保持 KISS 原则 