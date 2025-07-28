# 股票报价预设字段映射配置

## 概述

基于您提供的 LongPort API `secu_quote` 响应结构，我已经创建了一个完整的股票报价预设字段映射配置。这个配置包含了标准化的字段映射，可以在数据映射器中作为目标字段的可选项使用。

## 字段结构分析

### 主要报价字段 (10个)
- `symbol` - 标的代码
- `last_done` - 最新价  
- `prev_close` - 昨收价
- `open` - 开盘价
- `high` - 最高价
- `low` - 最低价
- `timestamp` - 最新成交时间戳
- `volume` - 成交量
- `turnover` - 成交额
- `trade_status` - 交易状态

### 美股盘前交易字段 (7个)
- `pre_market_quote.last_done` - 盘前最新价
- `pre_market_quote.timestamp` - 盘前时间戳
- `pre_market_quote.volume` - 盘前成交量
- `pre_market_quote.turnover` - 盘前成交额
- `pre_market_quote.high` - 盘前最高价
- `pre_market_quote.low` - 盘前最低价
- `pre_market_quote.prev_close` - 盘前参考收盘价

### 美股盘后交易字段 (7个)
- `post_market_quote.last_done` - 盘后最新价
- `post_market_quote.timestamp` - 盘后时间戳
- `post_market_quote.volume` - 盘后成交量
- `post_market_quote.turnover` - 盘后成交额
- `post_market_quote.high` - 盘后最高价
- `post_market_quote.low` - 盘后最低价
- `post_market_quote.prev_close` - 盘后参考收盘价

### 美股夜盘交易字段 (7个)
- `overnight_quote.last_done` - 夜盘最新价
- `overnight_quote.timestamp` - 夜盘时间戳
- `overnight_quote.volume` - 夜盘成交量
- `overnight_quote.turnover` - 夜盘成交额
- `overnight_quote.high` - 夜盘最高价
- `overnight_quote.low` - 夜盘最低价
- `overnight_quote.prev_close` - 夜盘参考收盘价

### 计算字段 (2个)
- `priceChange` - 价格变动 (相对昨收价)
- `priceChangePercent` - 涨跌幅 (百分比)

## 配置详情

### 数据库配置
```typescript
{
  name: 'Stock Quote Preset Fields',
  description: '股票报价数据的标准字段映射配置 - 基于 LongPort secu_quote 响应结构',
  provider: 'preset',
  ruleType: 'get-stock-quote-fields',
  version: '1.0.0',
  isActive: true,
  sharedDataFieldMappings: [ ... ] // 33个字段映射
}
```

### 字段映射示例
```typescript
{
  sourceField: 'secu_quote[].last_done',
  targetField: 'lastPrice',
  description: '最新价 - 最新成交价格'
},
{
  sourceField: 'secu_quote[].pre_market_quote.last_done',
  targetField: 'preMarketPrice',
  description: '盘前最新价 - 美股盘前交易最新价格'
}
```

## 使用方式

### 1. 初始化预设字段配置
```bash
# 运行初始化脚本
bun run init:get-stock-quote-fields
```

### 2. 在数据映射器中使用
```typescript
// 获取预设字段配置
GET /api/v1/data-mapper/rules?provider=preset&ruleType=get-stock-quote-fields

// 获取字段建议
POST /api/v1/data-mapper/field-suggestions
{
  "sourceFields": ["last_done", "volume", "timestamp"],
  "targetFields": ["lastPrice", "volume", "timestamp", "openPrice", "highPrice"]
}
```

### 3. 创建具体数据源映射规则
```typescript
POST /api/v1/data-mapper/rules
{
  "name": "LongPort Stock Quote Mapping",
  "provider": "longport",
  "ruleType": "get-stock-quote",
  "sharedDataFieldMappings": [
    {
      "sourceField": "secu_quote[0].last_done",
      "targetField": "lastPrice",
      "description": "LongPort最新价映射"
    },
    {
      "sourceField": "secu_quote[0].volume", 
      "targetField": "volume",
      "description": "LongPort成交量映射"
    }
    // ... 更多映射规则
  ]
}
```

## API 接口

### 获取预设字段配置
```http
GET /api/v1/data-mapper/rules?provider=preset&ruleType=get-stock-quote-fields
```

### 字段映射建议
```http
POST /api/v1/data-mapper/field-suggestions
Content-Type: application/json

{
  "sourceFields": ["last_done", "open", "high", "low", "volume"],
  "targetFields": ["lastPrice", "openPrice", "highPrice", "lowPrice", "volume", "turnover"]
}
```

### 创建数据源映射规则
```http
POST /api/v1/data-mapper/rules
Content-Type: application/json

{
  "name": "Provider Specific Stock Quote Mapping",
  "provider": "your-provider",
  "ruleType": "get-stock-quote",
  "sharedDataFieldMappings": [...]
}
```

## 标准化字段命名约定

### 主要价格字段
- `lastPrice` - 最新价
- `openPrice` - 开盘价
- `highPrice` - 最高价
- `lowPrice` - 最低价
- `previousClose` - 昨收价

### 交易数据字段
- `volume` - 成交量
- `turnover` - 成交额
- `timestamp` - 时间戳
- `tradeStatus` - 交易状态

### 盘前/盘后字段命名
- `preMarket*` - 盘前交易字段前缀
- `postMarket*` - 盘后交易字段前缀
- `overnight*` - 夜盘交易字段前缀

### 计算字段
- `priceChange` - 价格变动 (绝对值)
- `priceChangePercent` - 涨跌幅 (百分比)

## 实际应用场景

### 1. 数据源适配器开发
开发新的数据源适配器时，可以参考这些标准字段来设计输出格式，确保数据的一致性。

### 2. 前端界面开发
前端开发时可以依据这些标准字段名来设计数据绑定，不需要关心具体的数据源格式差异。

### 3. 数据分析和报表
进行数据分析时，所有数据源的数据都会转换为统一的字段格式，便于处理和分析。

### 4. API 响应标准化
系统对外提供的 API 响应可以使用这些标准字段，提供一致的用户体验。

## 扩展和维护

### 添加新字段
1. 修改 `init-stock-quote-preset-fields.ts` 脚本
2. 在 `sharedDataFieldMappings` 数组中添加新的字段映射
3. 重新运行初始化脚本

### 字段重命名
1. 更新预设配置中的 `targetField` 名称
2. 确保所有相关的映射规则都更新
3. 更新前端和API文档

### 版本管理
每次更新预设字段配置时，建议更新版本号，便于追踪变更历史。

## 注意事项

1. **数组字段处理**: 源字段使用 `secu_quote[]` 表示数组结构，实际使用时需要指定具体索引
2. **可选字段**: 盘前、盘后、夜盘字段可能为 null，需要在映射时处理空值情况
3. **数据类型**: 价格字段通常为字符串类型，可能需要数值转换
4. **计算字段**: 价格变动字段需要在转换器中实现具体的计算逻辑

这个预设字段配置为系统提供了股票报价数据的标准化基础，确保了不同数据源之间的数据一致性和互操作性。