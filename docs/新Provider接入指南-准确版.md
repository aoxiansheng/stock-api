# 新 Provider 接入指南（准确版）

本文档基于当前 `providersv2` 实现，目标是让新 Provider 能被系统真实选中并稳定运行（REST + Stream）。

## 1. 当前机制（必须先理解）

1. Provider 通过 `IDataProvider` 暴露能力集合 `capabilities`，每个能力实现 `ICapability.execute(...)`。
2. `ProviderRegistryService` 采用**显式注入 + 显式注册**，不是自动扫描。
3. REST 查询链路按 `receiverType == capabilityName` 进行路由与执行。
4. Stream 默认选源已改为走 `ProviderRegistryService.getBestProvider(capability, market)`。
5. Provider 名称以 `REFERENCE_DATA.PROVIDER_IDS` 为准，避免硬编码字符串。

## 2. 接入步骤（最小可行）

### 步骤 1：定义能力（capability）

在新 Provider 目录下实现能力对象，至少包含：

- `name`（必须与调用方使用的 capability 一致）
- `supportedMarkets`
- `execute(params)`

建议路径：

- `src/providersv2/providers/<your-provider>/capabilities/*.ts`

### 步骤 2：实现 Provider 类

实现 `IDataProvider`，并提供上下文服务访问方法（按需）：

- `getContextService()`：REST 能力常用
- `getStreamContextService()`：Stream 能力必需

建议路径：

- `src/providersv2/providers/<your-provider>/<your-provider>.provider.ts`

关键要求：

1. `name` 使用统一常量（如 `REFERENCE_DATA.PROVIDER_IDS.XXX`）。
2. `capabilities` 中只放当前真实支持的能力（YAGNI）。

### 步骤 3：创建 Provider Module

在模块中 `providers` + `exports` 暴露 Provider 与上下文服务。

建议路径：

- `src/providersv2/providers/<your-provider>/module/<your-provider>.module.ts`

### 步骤 4：接入 ProvidersV2Module

把新模块加入：

- `src/providersv2/providers.module.ts`

示例（结构）：

```ts
@Module({
  imports: [LongportModule, LongportSgModule, YourProviderModule],
  providers: [ProviderRegistryService],
  exports: [ProviderRegistryService],
})
export class ProvidersV2Module {}
```

### 步骤 5：在注册表显式注册

在 `ProviderRegistryService` 中：

1. 构造函数注入新 Provider。
2. `onModuleInit()` 调用 `registerProvider(newProvider, priority)`。

文件：

- `src/providersv2/provider-registry.service.ts`

说明：

- `priority` 数字越小优先级越高。
- 未传 priority 时默认值为 `1`。

## 3. 什么时候需要改 capability 常量/映射

如果你只是实现已有 capability（例如 `get-stock-quote`），通常不需要新增常量。

如果你引入新 capability 名称，需要至少检查这些文件：

1. `src/providersv2/providers/constants/capability-names.constants.ts`
2. `src/core/01-entry/receiver/constants/operations.constants.ts`（`SUPPORTED_CAPABILITY_TYPES`）
3. `src/core/shared/types/field-naming.types.ts`（分类映射与 `TRANS_RULE_TYPE_BY_CAPABILITY`）
4. （可选）`src/common/constants/domain/api-operations.constants.ts`（如果你希望 capability 进入全局操作常量）

## 4. Stream 接入额外要求

若支持流式：

1. Provider 实现 `getStreamContextService()`。
2. `StreamContextService` 需具备 `initializeWebSocket/subscribe/unsubscribe` 等必要能力。
3. 确保 `wsCapabilityType` 与 Provider 的 stream capability 名称一致。

## 5. 命名与兼容性

1. 新 Provider 名称统一使用短横线风格（如 `xxx-provider`）。
2. 如需兼容旧名称，可在 `ProviderRegistryService` 增加 alias 映射（只做兼容，不作为主名称）。

## 6. 自测清单（上线前）

1. `registry.getProvider("<provider>")` 能拿到实例。
2. `registry.getCapability("<provider>", "<capability>")` 返回非空。
3. `registry.getBestProvider("<capability>", "<market>")` 能选中新 Provider（按优先级预期）。
4. REST 端到端请求成功。
5. Stream 订阅、取消订阅、重连都能正常工作。

## 7. 常见失败原因

1. 只导入了模块，但没在 `ProviderRegistryService` 显式注册。
2. capability 名称与 `receiverType/wsCapabilityType` 不一致。
3. `supportedMarkets` 未覆盖实际请求市场。
4. Provider `name` 与配置/请求使用的名称不一致。
