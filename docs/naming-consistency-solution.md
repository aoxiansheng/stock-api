# 字段命名一致性解决方案

## 问题描述
系统中存在多种 REST 能力的命名不一致问题，主要体现在：
- `stock-quote` vs `get-stock-quote`
- `index-quote` vs `get-index-quote` 
- `stock-basic-info` vs `get-stock-basic-info`
- `market-status` vs `get-market-status`

这些命名模式的混用造成了概念混淆和实现不一致。

## 核心原则

### 1. 动作前缀规则
- **需要动作前缀**：描述能力或操作时（Receiver、Query层）
  - ✅ `get-stock-quote` - 获取股票报价的能力
  - ✅ `get-index-quote` - 获取指数报价的能力
  - ✅ `get-stock-basic-info` - 获取股票基本信息的能力
  - ✅ `get-market-status` - 获取市场状态的能力
  
- **不需要动作前缀**：描述数据分类时（Storage、Transformer层）
  - ✅ `stock_quote` - 股票报价数据
  - ✅ `index_quote` - 指数报价数据
  - ✅ `stock_basic_info` - 公司基本信息数据
  - ✅ `market_status` - 市场状态数据
  - ✅ `quote_fields` - 报价字段映射规则
  - ✅ `basic_info_fields` - 基本信息字段映射规则

### 2. 格式规范
- **kebab-case**：用于能力和路由（如 `get-stock-quote`, `get-index-quote`）
- **snake_case**：用于数据分类和规则（如 `stock_quote`, `quote_fields`）

## 需要修改的文件

### 1. 核心常量更新
```typescript
// src/core/restapi/query/constants/query.constants.ts
export const QUERY_CONFIG = Object.freeze({
  // ...
  DEFAULT_DATA_TYPE: "get-stock-quote", // 修改：从 "stock-quote" 改为 "get-stock-quote"
  // ...
});

// 同步更新对应的单测断言
// test/jest/unit/core/restapi/query/constants/query.constants.spec.ts
expect(QUERY_CONFIG.DEFAULT_DATA_TYPE).toBe("get-stock-quote"); // 从 "stock-quote" 改为 "get-stock-quote"
```

**注意**：所有 REST 能力都需要遵循相同的规范：
- `get-index-quote`（不是 `index-quote`）
- `get-stock-basic-info`（不是 `stock-basic-info`）  
- `get-market-status`（不是 `market-status`）

### 2. Query 服务的存储映射修复
```typescript
// src/core/restapi/query/services/query.service.ts - 第514-544行附近
// 当前问题：直接将 queryTypeFilter 作为 storageClassification 使用
this.storageService.storeData({
  ...
  storageClassification: queryTypeFilter as StorageClassification, // ❌ 错误：直接使用能力名
  ...
});

// 应修改为：通过 FieldMappingService 映射
this.storageService.storeData({
  ...
  storageClassification: this.fieldMappingService.filterToClassification(queryTypeFilter), // ✅ 正确：映射为 snake_case
  ...
});
```

**重要提醒**：该行段范围内有两个 `storeData` 调用（缓存写入与持久化写入），两个 `storeData` 都需替换为映射结果，避免执行时遗漏其中一个。

### 3. FieldMappingService 的反向映射修复
```typescript
// src/core/public/shared/services/field-mapping.service.ts - 第78-80行
// 当前问题：返回 snake_case 的分类名，不符合 Query 层使用 get- 前缀的原则
classificationToFilter(classification: StorageClassification): QueryTypeFilter {
  return classification.toString(); // ❌ 返回 "stock_quote"
}

// 应修改为：返回对应的能力名
classificationToFilter(classification: StorageClassification): QueryTypeFilter {
  return FIELD_MAPPING_CONFIG.CLASSIFICATION_TO_CAPABILITY[classification] || classification.toString();
  // ✅ 返回 "get-stock-quote"
}
```

### 4. 控制器示例代码更新
```typescript
// src/core/public/storage/controller/storage.controller.ts - 第563-593行
// 当前示例使用了错误的 storageClassification
storageClassification: "get-stock-quote" as any, // ❌ 错误：使用了能力名

// 应修改为：
storageClassification: "stock_quote" as any, // ✅ 正确：使用 snake_case

// src/core/restapi/query/controller/query.controller.ts - 第116行, 617行
"queryTypeFilter": "stock-quote", // ❌ 错误：旧格式

// 应修改为：
"queryTypeFilter": "get-stock-quote", // ✅ 正确：新格式
```

### 5. 测试文件批量更新
需要将所有测试中的旧格式改为新格式（带 `get-` 前缀）：
- `queryTypeFilter: "stock-quote"` → `queryTypeFilter: "get-stock-quote"`
- `queryTypeFilter: "index-quote"` → `queryTypeFilter: "get-index-quote"`  
- `queryTypeFilter: "stock-basic-info"` → `queryTypeFilter: "get-stock-basic-info"`
- `queryTypeFilter: "market-status"` → `queryTypeFilter: "get-market-status"`

**单元测试：**
- `test/jest/unit/core/restapi/query/dto/query-request.dto.spec.ts`
- `test/jest/unit/core/restapi/query/controller/query.controller.spec.ts`
- `test/jest/unit/core/restapi/query/constants/query.constants.spec.ts`
- `test/jest/unit/core/restapi/query/utils/query.util.spec.ts`

**E2E测试：**
- `test/jest/e2e/core/restapi/query/controller/query.controller.e2e.test.ts` (多处)
- `test/jest/e2e/core/stream/stream-receiver/gateway/stream-receiver.gateway.e2e.test.ts`

**黑盒测试：**
- `test/jest/blackbox/market-awareness-caching.e2e.test.ts` (多处)

**安全测试：**
- `test/jest/security/common/constants/unified/constants-meta.security.test.ts` (发送样例)

### 6. 文档更新
在相关文档中明确说明：
- Query 层的 `queryTypeFilter` 应使用与 `receiverType` 相同的值
- 默认值应为 `"get-stock-quote"`，而非 `"stock-quote"`
- Storage 层写入时必须通过映射转换，不能直接使用能力名

## 映射关系表

| REST能力类型 | Provider能力 | Receiver路由 | Query过滤 | Storage分类 | Transformer规则 |
|-------------|-------------|------------|-----------|------------|---------------|
| **股票报价** | `get-stock-quote` | `get-stock-quote` | `get-stock-quote` | `stock_quote` | `quote_fields` |
| **指数报价** | `get-index-quote` | `get-index-quote` | `get-index-quote` | `index_quote` | `index_fields` |
| **股票基本信息** | `get-stock-basic-info` | `get-stock-basic-info` | `get-stock-basic-info` | `stock_basic_info` | `basic_info_fields` |
| **市场状态** | `get-market-status` | `get-market-status` | `get-market-status` | `market_status` | `market_status_fields` |

### 错误示例对比
| 层级 | 字段 | ❌ 错误值 | ✅ 正确值 |
|------|------|----------|----------|
| Provider/Receiver/Query | capability/receiverType/queryTypeFilter | `"stock-quote"` | `"get-stock-quote"` |
| Storage | storageClassification | `"get-stock-quote"` | `"stock_quote"` |
| Transformer | transDataRuleListType | `"get-stock-quote"` | `"quote_fields"` |

## 验证检查清单

### ✅ 正确的使用模式
```typescript
// Receiver 请求 - 股票报价
{
  receiverType: "get-stock-quote",
  symbols: ["AAPL.US"]
}

// Receiver 请求 - 指数报价  
{
  receiverType: "get-index-quote",
  symbols: ["HSI.HK"]
}

// Query 请求 - 股票基本信息
{
  queryType: "by_symbols",
  queryTypeFilter: "get-stock-basic-info",
  symbols: ["700.HK"]
}

// Storage 内部 - 对应的存储分类
{
  storageClassification: "stock_quote",    // 对应 get-stock-quote
  // storageClassification: "index_quote",   // 对应 get-index-quote
  // storageClassification: "stock_basic_info", // 对应 get-stock-basic-info
  data: {...}
}

// Transformer 内部 - 对应的规则类型
{
  transDataRuleListType: "quote_fields",      // 报价类数据
  // transDataRuleListType: "basic_info_fields", // 基本信息类数据
  mappingRules: [...]
}
```

### ❌ 错误的使用模式
```typescript
// 错误：Query 使用旧格式（缺少 get- 前缀）
{
  queryTypeFilter: "stock-quote"        // 应该是 "get-stock-quote"
  queryTypeFilter: "index-quote"        // 应该是 "get-index-quote"  
  queryTypeFilter: "stock-basic-info"   // 应该是 "get-stock-basic-info"
}

// 错误：Storage 使用能力名（应该用 snake_case 分类名）
{
  storageClassification: "get-stock-quote"      // 应该是 "stock_quote"
  storageClassification: "get-index-quote"      // 应该是 "index_quote"
  storageClassification: "get-stock-basic-info" // 应该是 "stock_basic_info"
}
```

## 迁移步骤

1. **第一步**：修复核心映射逻辑
   - 在 `query.service.ts` 的持久化路径，将 `queryTypeFilter` 通过 `FieldMappingService.filterToClassification` 转换为 `StorageClassification` 再写库
   - 修正 `FieldMappingService.classificationToFilter` 的返回值为能力名（带 `get-` 前缀）

2. **第二步**：更新核心常量和配置
   - 更新 `QUERY_CONFIG.DEFAULT_DATA_TYPE` 从 `"stock-quote"` 改为 `"get-stock-quote"`
   - 同步更新对应的单测断言

3. **第三步**：更新示例代码
   - 更新 `storage.controller.ts` 与 `query.controller.ts` 中的示例值
   - 确保示例代码符合命名规范

4. **第四步**：批量更新测试文件
   - 更新所有测试文件中的旧格式为新格式（添加 `get-` 前缀）
   - `stock-quote` → `get-stock-quote`
   - `index-quote` → `get-index-quote`  
   - `stock-basic-info` → `get-stock-basic-info`
   - `market-status` → `get-market-status`
   - 包括单元测试、E2E测试、黑盒测试和安全测试

5. **第五步**：运行完整测试套件确保兼容性
   - 特别关注存储相关的测试，确保映射逻辑正确

6. **第六步**：更新文档，明确命名规范
   - 在 CLAUDE.md 中强调层级边界和映射关系

## 风险评估与兼容性

### 数据兼容性风险
- **历史数据问题**：如果历史上已有用 `"get-stock-quote"` 作为 `storageClassification` 写入的文档，需要处理兼容性
- **建议方案**：在读取或统计路径增加兼容映射（允许同时识别 `"get-stock-quote"` 与 `"stock_quote"`）
- **长期清理**：计划一次离线数据清洗，统一为 snake_case 格式

### 改动范围评估
- **核心逻辑**：2处实现修正（Query->Storage 写入映射、classificationToFilter 返回值）
- **配置更新**：常量、示例代码更新
- **测试同步**：批量测试文件更新
- **风险等级**：可控，主要影响测试和配置层面

## 长期维护建议

1. **类型约束**：使用 TypeScript 类型系统强制正确的值
2. **代码审查**：检查新代码是否遵循命名规范
3. **自动化检查**：添加 linter 规则检查命名一致性
4. **文档更新**：在 CLAUDE.md 中强调层级边界
5. **数据监控**：监控存储层数据，确保不再出现能力名作为分类的情况

## 总结

### 核心原则确认
- **动作前缀**（get-）用于描述**能力和操作**（Receiver、Query层）
- **无前缀**用于描述**数据分类**（Storage、Transformer层）
- Query 层应与 Receiver 层保持一致，所有 REST 能力都使用 `get-` 前缀格式
- Storage 层使用对应的 snake_case 描述性名词

### 全面适用的 REST 能力
本方案适用于所有 REST 能力的命名规范化：
- `get-stock-quote` ↔ `stock_quote` ↔ `quote_fields`
- `get-index-quote` ↔ `index_quote` ↔ `quote_fields`
- `get-stock-basic-info` ↔ `stock_basic_info` ↔ `basic_info_fields`
- `get-market-status` ↔ `market_status` ↔ `market_status_fields`
- 以及其他所有 `get-` 前缀的 REST 能力

### 关键修复点
1. **Query->Storage 映射**：修复直接使用 `queryTypeFilter` 作为 `storageClassification` 的问题
2. **反向映射**：修复 `classificationToFilter` 返回值，确保返回能力名而非分类名
3. **常量同步**：更新默认值和相关测试断言
4. **示例统一**：确保所有示例代码符合命名规范

### 实施优先级
- **P0（必须）**：核心映射逻辑修复，避免将能力名写入存储分类
- **P1（重要）**：常量更新和测试同步
- **P2（建议）**：历史数据兼容性处理和监控机制

通过以上修复，系统将实现完整的命名一致性，确保每一层都使用正确的字段格式和语义。

## 范围说明

本文档专注于 REST 能力的命名一致性改造（使用 `get-` 前缀的能力名称）。代码库中同时存在流式能力命名（如 `stream-stock-quote`、`ws-stock-quote`、`streamType: 'stock-quote'`），这些流式能力命名不在本次改造范围内，与 REST 能力的命名规范无直接冲突。