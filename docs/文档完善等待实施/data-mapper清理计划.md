# Data-Mapper 组件移除计划 - 实现代码纯净

## 1. @deprecated 标记的代码

### 文件：`src/core/00-prepare/data-mapper/constants/data-mapper.constants.ts`

**位置：第397行**
```typescript
/**
 * @deprecated 推荐使用 RULE_LIST_TYPES，本常量仅为向后兼容而保留
 */
export const COMMON_RULE_LIST_TYPES = Object.freeze({
  QUOTE_FIELDS: RULE_LIST_TYPES.QUOTE_FIELDS,
  BASIC_INFO_FIELDS: RULE_LIST_TYPES.BASIC_INFO_FIELDS,
} as const);
```

**移除计划：**
- 移除：第399-402行的 `COMMON_RULE_LIST_TYPES` 常量定义
- 移除：第404-412行的 `COMMON_RULE_LIST_TYPE_VALUES` 数组
- 移除：第377-398行相关的向后兼容性注释和文档

## 2. 兼容层和向后兼容代码

### 文件：`src/core/00-prepare/data-mapper/constants/data-mapper.constants.ts`

**第378-398行：向后兼容性设计**
```typescript
/**
 * 常用规则列表类型（向后兼容别名）
 * @description 常用的规则列表类型子集，为向后兼容而保留
 * @usage 在需要确保兼容性的场景中使用，特别是在DTO验证和前端展示中
 */
```

**移除计划：**
- 完全移除向后兼容别名系统
- 统一使用 `RULE_LIST_TYPES` 作为唯一数据源

### 文件：`src/core/00-prepare/data-mapper/utils/type-validation.utils.ts`

**第101行：兼容性验证参数**
```typescript
/** 目标端点（用于验证兼容性） */
targetEndpoint?: string;
```

**第180-201行：端点兼容性检查逻辑**
```typescript
// 端点兼容性检查
if (targetEndpoint) {
  const supportedEndpoints = getSupportedEndpoints(ruleType);
  if (!supportedEndpoints.includes(targetEndpoint)) {
    if (allowFallback && config.fallbackType) {
      // 降级逻辑...
    }
  }
}
```

**第394-424行：兼容性评分系统**
```typescript
// 端点兼容性
if (targetEndpoint && config.endpoints.includes(targetEndpoint)) {
  score += 30;
} else if (!targetEndpoint) {
  score += 10; // 没有特定端点要求时给基础分
}
```

**移除计划：**
- 保留兼容性检查逻辑（这是功能性代码，不是历史包袱）
- 清理过度复杂的降级策略

### 文件：`src/core/00-prepare/data-mapper/services/mapping-rule-cache.service.ts`

**第25-29行：向前兼容性声明**
```typescript
/**
 * ## 向前兼容性
 * - **V1 API**: 所有公共方法保持稳定的方法签名和返回类型
 * - **缓存键格式**: 使用固定前缀 `data-mapper:` 确保键名一致性
 * - **TTL配置**: 默认30分钟TTL，支持运行时动态配置
 */
```

**移除计划：**
- 移除过度设计的API版本兼容性声明
- 保留核心缓存功能

### 文件：`src/core/00-prepare/data-mapper/config/production-types.config.ts`

**第24行：DEPRECATED 枚举值**
```typescript
/** 已弃用 - 仍可用但计划移除 */
DEPRECATED = 'deprecated'
```

**移除计划：**
- 移除 `DEPRECATED` 枚举值（第24行）
- 更新相关类型定义和验证逻辑

## 3. 完整移除计划

### 阶段1：移除@deprecated标记的代码
1. **文件**：`src/core/00-prepare/data-mapper/constants/data-mapper.constants.ts`
   - **删除行数**：377-412行（36行代码）
   - **内容**：`COMMON_RULE_LIST_TYPES`、`COMMON_RULE_LIST_TYPE_VALUES` 及相关文档

### 阶段2：移除过度设计的兼容层
1. **文件**：`src/core/00-prepare/data-mapper/config/production-types.config.ts`
   - **删除行数**：第24行
   - **内容**：`DEPRECATED = 'deprecated'` 枚举值

2. **文件**：`src/core/00-prepare/data-mapper/services/mapping-rule-cache.service.ts`
   - **删除行数**：25-29行（5行代码）
   - **内容**：过度设计的API兼容性声明

### 阶段3：简化验证逻辑
1. **文件**：`src/core/00-prepare/data-mapper/utils/type-validation.utils.ts`
   - **重构**：简化降级策略，移除过度复杂的兼容性评分
   - **保留**：核心的端点验证功能

## 4. 影响评估

### 安全移除（无风险）
- `COMMON_RULE_LIST_TYPES` - 已明确标记为@deprecated
- `COMMON_RULE_LIST_TYPE_VALUES` - 向后兼容数组
- 过度设计的API版本声明
- `DEPRECATED` 枚举值

### 需要测试的移除
- 简化type-validation.utils.ts中的兼容性逻辑

## 5. 预期收益

- **代码减少**：~45行代码
- **维护负担减轻**：移除历史包袱和冗余设计
- **架构简化**：统一使用 `RULE_LIST_TYPES` 作为唯一数据源
- **类型安全提升**：移除废弃的枚举值和常量

## 总结

Data-mapper组件的历史包袱相对较少，主要集中在：
1. 明确标记为@deprecated的常量定义
2. 过度设计的向后兼容性声明
3. 不再需要的DEPRECATED枚举值

移除这些代码将使组件更加纯净，同时保持核心功能完整性。