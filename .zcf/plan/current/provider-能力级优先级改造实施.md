# provider-能力级优先级改造实施

- 模式：执行
- 方案：方案2（新增 ProviderPriorityPolicyService）
- 范围：providersv2 选源策略 + stream/receiver 选源一致性 + 单元测试

## 执行步骤
1. 新增 `ProviderPriorityPolicyService`，实现 Env 解析、能力级排序与容错。
2. 在 `ProvidersV2Module` 注册并导出策略服务。
3. 改造 `ProviderRegistryService`：移除硬编码 priority 字段与校验，新增候选查询与排序委托。
4. 精简 `provider-id.constants.ts` 的 manifest 结构，移除 `priority` 字段。
5. 调整 `stream-receiver.service.ts`：移除市场优先级决策来源，改用 capability 驱动排序。
6. 重构并补齐单元测试：策略服务测试、registry/assembly/id/stream 相关测试。
7. 执行构建与定向单测验收。

## 验收标准
- 不再依赖硬编码 provider 全局优先级。
- 支持 `PROVIDER_PRIORITY_DEFAULT` 与 `PROVIDER_PRIORITY_<CAPABILITY_KEY>`。
- `preferredProvider` 语义不变。
- stream 与 receiver 在 capability+market 语义下选源一致。
