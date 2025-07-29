# dataType 字段重构文档

## 概述

本文档记录了系统中 `dataType` 字段的重构过程，解决了三个核心组件中字段命名相同但语义不同的问题。

## 问题背景

### 原始问题
在重构前，系统中的三个核心组件都使用了相同的字段名 `dataType`，但含义完全不同：

- **Receiver 组件**: `dataType` 表示能力类型，用于提供商路由
- **Query 组件**: `dataType` 表示查询过滤条件
- **Storage 组件**: `dataType` 表示数据分类标识

这种命名混淆导致：
1. 开发者理解困难
2. 代码语义不清晰
3. 维护成本增加

## 重构方案

### 新的字段命名
根据各组件的实际职责，采用语义化的独立命名：

| 组件 | 原字段名 | 新字段名 | 语义说明 |
|------|----------|----------|----------|
| Receiver | `dataType` | `capabilityType` | 表示能力类型，用于提供商路由 |
| Query | `dataType` | `dataTypeFilter` | 表示数据类型过滤器，用于查询筛选 |
| Storage | `dataType` | `dataClassification` | 表示数据分类，用于存储管理 |

  - Receiver组件: capabilityType - 用于能力路由
  - Query组件: dataTypeFilter - 用于数据过滤
  - Storage组件: dataClassification - 用于数据分类
  - Transformer组件: dataRuleListType - 用于映射规则匹配
  - Data Mapper组件: dataRuleListType - 用于映射规则匹配 与 Transformer组件 是一样的



## 实现细节

### 1. 类型定义和映射服务

#### 新增文件
- `src/common/types/field-naming.types.ts` - 统一的类型定义
- `src/common/services/field-mapping.service.ts` - 字段映射转换服务

#### 关键类型
```typescript
// Receiver 组件的能力类型
export type CapabilityType = 
  | "get-stock-quote"
  | "get-stock-basic-info"
  | "get-index-quote"
  // ... 更多类型

// Storage 组件的数据分类
export enum DataClassification {
  STOCK_QUOTE = "stock_quote",
  COMPANY_PROFILE = "company_profile",
  // ... 更多分类
}

// Query 组件的过滤器类型
export type DataTypeFilter = string;
```

#### 映射配置
```typescript
export const FIELD_MAPPING_CONFIG = {
  // Receiver 能力类型到 Storage 数据分类的映射
  CAPABILITY_TO_CLASSIFICATION: {
    "get-stock-quote": DataClassification.STOCK_QUOTE,
    "get-stock-basic-info": DataClassification.COMPANY_PROFILE,
    // ... 更多映射
  },
  // 反向映射
  CLASSIFICATION_TO_CAPABILITY: {
    // ... 反向映射关系
  }
};
```

