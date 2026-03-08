# Provider 级标准符号直通方案

更新时间：2026-03-08

## 1. 背景

当前 Receiver/Stream 统一经过“前置符号转换 + 后置符号还原”链路。  
对于已确认“上游 SDK 原生接收标准符号”的 Provider，这两段流程是空转，且会产生以下问题：

- 无效查库噪音（如 `Data source mapping not found`）。
- 不必要的处理开销与日志噪音。
- 误判风险（标准符号被错误拦截）。

## 2. 目标

按 **Provider 维度** 开启“标准符号直通”模式：

1. 跳过前置转换（标准 -> provider）。
2. 跳过后置还原（provider -> 标准）。
3. 输入必须是标准符号；非标准符号直接返回 400（禁止静默纠正）。

不按 capability 细分，严格按 provider 生效。

## 3. 环境变量设计

新增环境变量：

```env
# 使用逗号分隔 provider 名称；命中的 provider 开启标准符号直通
# 示例：仅 infoway 开启
STANDARD_SYMBOL_IDENTITY_PROVIDERS=infoway
```

解析规则：

- 读取后按逗号拆分、`trim`、小写归一化、去重。
- 空值表示全部关闭（保持当前行为）。

## 4. 行为约束

当 `provider` 命中 `STANDARD_SYMBOL_IDENTITY_PROVIDERS`：

1. **严格输入校验**
- 所有 symbols 必须满足标准市场格式（`*.HK/*.US/*.SH/*.SZ`）。
- 任一 symbol 非标准格式，立即抛 `DATA_VALIDATION_FAILED`（HTTP 400）。

2. **跳过转换链路**
- 跳过 `transformSymbolsForProvider`。
- 跳过 `restoreStandardSymbols`。
- 直接使用标准 symbols 调上游 SDK/HTTP。

3. **错误语义**
- 建议固定 reason：`non_standard_symbol_in_identity_provider`。
- 错误上下文包含：`provider`、`symbol`、`expectedFormat`。

## 5. 影响范围

建议最小改造文件：

- `src/core/01-entry/receiver/services/receiver.service.ts`
- `src/core/01-entry/stream-receiver/services/stream-receiver.service.ts`
- `src/core/02-processing/transformer/services/data-transformer.service.ts`
- （可选）新增配置解析工具：`src/core/shared/utils/provider-symbol-identity.util.ts`

## 6. 与当前日志问题的关系

该方案可消除 `infoway` 上的符号映射空转与相关噪音日志；  
但 `get-stock-basic-info` 的 `mixed symbols + market=US` 冲突校验仍应保留（这是正确的参数保护行为）。

## 7. 落地顺序（最小成本）

1. 先仅对 `infoway` 开启：
- `STANDARD_SYMBOL_IDENTITY_PROVIDERS=infoway`

2. 补齐测试：
- Receiver：identity provider 下前后转换被跳过。
- Validation：identity provider 下非标准 symbol 必须 400。
- 回归：`get-stock-quote/get-stock-history/stream-stock-quote` 正常。

3. 稳定后再评估是否扩展到其他 provider。

## 8. 验收标准

- `infoway` 场景不再出现符号映射缺失噪音日志。
- `AAPL.US/00700.HK/600519.SH` 全链路请求成功。
- 非标准符号（如 `AAPL`、`700`）在 identity provider 下稳定返回 400。
- 现有非 identity provider 行为不变。
