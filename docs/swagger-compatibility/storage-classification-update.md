# Swagger StorageClassification 兼容性更新

## 更新内容

### 1. 枚举值示例修正
- 移除不存在的示例值: `SYMBOL_MAPPING`, `DATA_MAPPING`
- 使用实际存在的值: `stock_quote`, `stock_candle` 等

### 2. API文档一致性
- 所有 `@ApiProperty` 使用统一的枚举引用
- Swagger UI 显示正确的19个枚举值

### 3. OpenAPI 规范
所有API响应中的 `storageClassification` 字段都符合新的枚举定义。
