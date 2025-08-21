### 可执行遗留代码修复文档（providers/longport* 与 longport-sg*）

- **目标**: 提供可直接纳入迭代的修复路线图，保持业务功能等价、风险最小化、接口契约不变。
- **范围**: 数据层与业务逻辑层（NestJS Providers/Capabilities/Services）；不涉及 UI 与新技术栈。

## 架构模式对比分析（步骤 1）

- **期望架构（目标）**
  - **依赖注入与生命周期**: 使用 NestJS 单例与生命周期钩子管理资源。
  - **配置隔离**: 多 Provider 并存（如 `longport` 与 `longport-sg`）不应互相污染配置或全局状态。
  - **能力契约一致**: 同名能力（如 `get-stock-quote`）返回统一结构，减少调用端适配。
  - **代码风格一致**: ESM/CJS 导入方式统一，日志/错误信息语义一致。

- **当前差异（实际）**
  - 上下文服务 `getQuoteContext()` 在初始化失败后可能返回 null（运行时隐患）。
  - `LongportSgContextService` 初始化通过临时覆盖 `process.env` 实现（引发并发竞态）。
  - `LongportStreamContextService` 同时使用 Nest 单例与类内静态单例，并在 Provider 里运行时替换注入实例（双重单例反模式）。
  - 同名能力在 `longport` 与 `longport-sg` 返回结构不一致（契约易发散）。
  - SG 能力的注释/错误消息中引用 `LongportContextService`（命名不一致，影响排障与可读性）。
  - SDK 导入风格混用（ESM import 与 require）。

## 问题标记：废弃/无效/冗余（步骤 2）

- **严重：初始化后仍可能返回 null（两处）**
```90:101:/Users/honor/Documents/code/newstockapi/backend/src/providers/longport/services/longport-context.service.ts
  async getQuoteContext(): Promise<QuoteContext> {
    await this.initialize();

    if (!this.quoteContext) {
      this.logger.error(
        "获取 LongPort QuoteContext 失败，因初始化后实例仍为空",
      );
    }

    return this.quoteContext;
  }
```
```90:101:/Users/honor/Documents/code/newstockapi/backend/src/providers/longport-sg/services/longport-sg-context.service.ts
  async getQuoteContext(): Promise<QuoteContext> {
    await this.initialize();

    if (!this.quoteContext) {
      this.logger.error(
        "获取 LongPort QuoteContext 失败，因初始化后实例仍为空",
      );
    }

    return this.quoteContext;
  }
```

- **严重：SG 临时覆盖全局环境变量（并发/竞态）**
```54:68:/Users/honor/Documents/code/newstockapi/backend/src/providers/longport-sg/services/longport-sg-context.service.ts
        process.env.LONGPORT_APP_KEY = process.env.LONGPORT_SG_APP_KEY;
        process.env.LONGPORT_APP_SECRET = process.env.LONGPORT_SG_APP_SECRET;
        process.env.LONGPORT_ACCESS_TOKEN =
          process.env.LONGPORT_SG_ACCESS_TOKEN;

        const config = Config.fromEnv();
        this.quoteContext = await QuoteContext.new(config);

        // 恢复原环境变量
        process.env.LONGPORT_APP_KEY = originalEnv.LONGPORT_APP_KEY;
```

- **中高：双重单例反模式（类内静态单例 + 运行时替换注入实例）**
```46:53:/Users/honor/Documents/code/newstockapi/backend/src/providers/longport/services/longport-stream-context.service.ts
  private static instance: LongportStreamContextService | null = null;
  private static initializationLock = false;
  private static readonly lockTimeout = 10000; // 10秒初始化超时
```
```46:58:/Users/honor/Documents/code/newstockapi/backend/src/providers/longport/longport.provider.ts
  private async ensureStreamContextSingleton(): Promise<void> {
    const singletonInstance = await LongportStreamContextService.getInstance(this.configService);
    if (this.streamContextService !== singletonInstance) {
      this.logger.warn('检测到非单例StreamContextService实例，替换为单例实例');
      (this as any).streamContextService = singletonInstance;
    }
```

- **中：能力契约不一致（相同能力不同结构）** 
```39:41:/Users/honor/Documents/code/newstockapi/backend/src/providers/longport/capabilities/get-stock-quote.ts
      // 直接返回SDK原始格式，不做任何字段名转换
      return { secu_quote: quotes };
```
```39:52:/Users/honor/Documents/code/newstockapi/backend/src/providers/longport-sg/capabilities/get-stock-quote.ts
      // 转换为标准格式
      const secu_quote = quotes.map((quote) => ({
        symbol: quote.symbol,
        last_done: quote.lastDone,
        prev_close: quote.prevClose,
        ...
      }));
      return { secu_quote };
```

- **次要：SG 能力文案/异常命名不一致（应为 `LongportSgContextService` 或通用“contextService 未提供”）**
```7:13:/Users/honor/Documents/code/newstockapi/backend/src/providers/longport-sg/capabilities/get-stock-quote.ts
/**
 * 注意：此函数需要与 LongportContextService 配合使用
 */
```
```31:33:/Users/honor/Documents/code/newstockapi/backend/src/providers/longport-sg/capabilities/get-stock-quote.ts
      if (!params.contextService) {
        throw new Error("LongportContextService 未提供");
      }
```

- **次要：SDK 导入混用（风格不一）**
```1:9:/Users/honor/Documents/code/newstockapi/backend/src/providers/longport/services/longport-stream-context.service.ts
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Config, QuoteContext, SubType } = require('longport');
```

## 按紧急程度分类与分阶段替换方案（步骤 3）

- **高优先（本迭代完成）**
  - `getQuoteContext()` 不返回 null：初始化失败后直接抛错，消除下游 NPE 风险。
  - SG 配置初始化去竞态：改为显式 `new Config(LONGPORT_SG_APP_KEY, LONGPORT_SG_APP_SECRET, LONGPORT_SG_ACCESS_TOKEN)`，不修改 `process.env`。

- **中优先（下迭代）**
  - 统一能力返回结构：统一为 SDK 原始格式；调整 `longport-sg` 的 `get-stock-quote` 去除字段映射、改为透传 SDK 返回。
  - 清理双重单例：移除 `LongportStreamContextService` 类内静态单例与 Provider 的运行时替换逻辑，完全使用 Nest 单例；提供临时工厂作兼容层（标废弃）。

- **低优先（任意迭代）**
  - 修正文案/错误消息命名。
  - 统一 SDK 导入风格（ESM 或 require 二选一），不改变行为。

## 修复步骤（包含代码定位、问题说明、实施与测试）（步骤 4）

- **修复项 A（高）：`getQuoteContext()` 防空**
  - **代码定位**
    - `src/providers/longport/services/longport-context.service.ts`
    - `src/providers/longport-sg/services/longport-sg-context.service.ts`
  - **问题说明**
    - Promise 返回类型标注为 `QuoteContext`，但运行时可能返回 null。
  - **修复步骤**
    - 在 `await this.initialize()` 之后判断 `!this.quoteContext` 则 `throw new Error('QuoteContext not initialized')`；不再返回 null。
  - **测试**
    - 单测：模拟初始化失败，调用 `getQuoteContext()` 断言抛错。现有单测文件同目录可增补。

- **修复项 B（高）：SG 初始化去竞态**
  - **代码定位**
    - `src/providers/longport-sg/services/longport-sg-context.service.ts`
  - **问题说明**
    - 临时覆盖 `process.env` 造成并发污染。
  - **修复步骤**
    - 替换为读取 `process.env.LONGPORT_SG_*`，用 `new Config(appKey, appSecret, accessToken)` 构造；删除覆盖/恢复逻辑。
  - **测试**
    - 单测：并行触发 `LongportContextService` 与 `LongportSgContextService.initialize()`，断言未互相影响。

- **修复项 C（中）：统一能力返回结构（统一为 SDK 原始格式）**
  - **代码定位**
    - `src/providers/longport-sg/capabilities/get-stock-quote.ts`
    - （说明：`src/providers/longport/capabilities/get-stock-quote.ts` 已透传 SDK 原始格式，无需修改）
  - **问题说明**
    - `longport` 返回 SDK 原始格式，`longport-sg` 返回映射后的标准结构，导致同名能力返回结构不一致。
  - **修复步骤**
    - 在 `longport-sg` 的 `get-stock-quote` 中删除字段映射，直接返回 SDK 原始格式（与 `longport` 对齐）。
  - **测试**
    - 单测/集成：
      - `longport` 与 `longport-sg` 均直接返回 SDK 原始格式，结构一致。
      - 覆盖异常路径（空数组、非法 symbol、SDK 错误）。

- **修复项 D（中）：移除双重单例**
  - **代码定位**
    - `src/providers/longport/services/longport-stream-context.service.ts`
    - `src/providers/longport/longport.provider.ts`
  - **问题说明**
    - 同时使用类内静态单例和 Nest 单例，且在 Provider 中运行时替换注入实例，增加维护/测试复杂度。
  - **修复步骤**
    - 删除类内 `static instance/lock/getInstance/resetInstance()` 等；`LongportProvider.ensureStreamContextSingleton()` 改为仅日志提示或删除；通过模块 `providers: [LongportStreamContextService]` 保证单例。
    - 过渡：增加工厂导出 `getLongportStreamContextService()` 返回注入实例；标注废弃，设置移除期限。
  - **测试**
    - 单测与集成测试：原功能（initialize/subscribe/unsubscribe/isConnected）不变；Mock 更简洁；长连接测试通过。

- **修复项 E（低）：文案与异常命名**
  - **代码定位**
    - `src/providers/longport-sg/capabilities/*.ts`
  - **问题说明**
    - 引用 `LongportContextService` 的文案与错误消息不准确。
  - **修复步骤**
    - 更正为 `LongportSgContextService` 或通用“contextService 未提供”措辞。
  - **测试**
    - 更新对应单测断言字符串。

- **修复项 F（低）：导入风格统一**
  - **代码定位**
    - `src/providers/longport/services/longport-stream-context.service.ts`
  - **问题说明**
    - ESM/CJS 混用，无功能影响。
  - **修复步骤**
    - 统一使用与项目主流一致的导入方式（建议与其他服务一致的 ESM import）。
  - **测试**
    - 编译通过、行为不变。

## 迭代计划与回滚策略

- **迭代 1（1 天）**
  - 实施 A、B；加入/修补单测与基础集成测试。
  - 回滚：可单独撤销文件内小范围 edits，不影响外部契约。

- **迭代 2（2–3 天）**
  - 实施 C、D；D 增兼容工厂。
  - 回滚：如发现兼容性问题，临时回滚 `longport-sg` 能力到“映射结构”的历史实现（git revert），并在后续版本统一迁移调用方至 SDK 原始格式。

- **迭代 3（0.5 天）**
  - 实施 E、F；更新断言与风格统一。
  - 回滚：字符串与导入风格调整易于撤销。

## 验收标准（DoD）

- 不再出现 `getQuoteContext()` 返回 null 的路径；初始化失败时抛出明确错误。
- SG 与主 `longport` Provider 并行初始化无配置污染。
- 同名能力返回结构一致（SDK 原始格式）。
- 移除类内静态单例后，所有原有流能力功能正常（订阅/取消订阅/状态检测/重连）。
- 单测/集成测试覆盖新增分支并全部通过。

---

- 如需直接提交迭代 1 的代码 edits 与对应测试，请在本文件下方补充“同意实施”，我将落地实施并回传变更摘要。 