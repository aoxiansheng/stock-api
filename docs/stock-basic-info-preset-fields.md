# 股票基本信息预设字段映射配置

## 概述

基于您提供的 LongPort API `secu_static_info` 响应结构，我已经创建了完整的股票基本信息预设字段映射配置。这个配置包含了公司基础数据、股本结构、财务指标等标准化字段映射，可以在数据映射器中作为目标字段的可选项使用。

## 字段结构分析

### 基础标识信息 (6个)
- `symbol` - 标的代码
- `name_cn` - 中文简体标的名称
- `name_en` - 英文标的名称  
- `name_hk` - 中文繁体标的名称
- `exchange` - 标的所属交易所
- `currency` - 交易币种

### 交易规则信息 (1个)
- `lot_size` - 每手股数

### 股本结构信息 (3个)
- `total_shares` - 总股本
- `circulating_shares` - 流通股本
- `hk_shares` - 港股股本 (仅港股)

### 财务指标信息 (4个)
- `eps` - 每股盈利
- `eps_ttm` - 每股盈利 (TTM)
- `bps` - 每股净资产
- `dividend_yield` - 股息率

### 衍生计算字段 (4个)
- `marketCapitalization` - 市值 (需要结合股价)
- `floatMarketCap` - 流通市值 (需要结合股价)
- `peRatio` - P/E 比率 (需要结合股价)
- `pbRatio` - P/B 比率 (需要结合股价)

### 通用标准化字段 (2个)
- `companyName` - 默认公司名称
- `companyDisplayName` - 国际化显示名称

## 配置详情

### 数据库配置
```typescript
{
  name: 'Stock Basic Info Preset Fields',
  description: '股票基本信息数据的标准字段映射配置 - 基于 LongPort secu_static_info 响应结构',
  provider: 'preset',
  ruleType: 'get-stock-basic-info-fields',
  version: '1.0.0',
  isActive: true,
  sharedDataFieldMappings: [ ... ] // 21个字段映射
}
```

### 字段映射示例
```typescript
{
  sourceField: 'secu_static_info[].symbol',
  targetField: 'symbol',
  description: '标的代码 - 股票或证券的唯一标识符'
},
{
  sourceField: 'secu_static_info[].name_cn',
  targetField: 'companyNameCN',
  description: '公司中文简体名称 - 中文简体标的名称'
},
{
  sourceField: 'secu_static_info[].total_shares',
  targetField: 'totalShares',
  description: '总股本 - 公司发行的全部股票数量'
}
```

### 衍生计算字段示例
```typescript
{
  sourceField: 'secu_static_info[].total_shares',
  targetField: 'marketCapitalization',
  transform: {
    type: 'custom',
    customFunction: 'calculateMarketCap',
  },
  description: '市值 - 总股本乘以当前股价 (需要结合报价数据计算)'
}
```

## 使用方式

### 1. 初始化预设字段配置
```bash
# 初始化基本信息字段
bun run init:stock-basic-info-fields

# 或者初始化所有预设字段
bun run init:preset-fields
```

### 2. 在数据映射器中使用
```typescript
// 获取预设字段配置
GET /api/v1/data-mapper/rules?provider=preset&ruleType=get-stock-basic-info-fields

// 获取字段建议
POST /api/v1/data-mapper/field-suggestions
{
  "sourceFields": ["name_cn", "total_shares", "eps"],
  "targetFields": ["companyNameCN", "totalShares", "earningsPerShare"]
}
```

### 3. 创建具体数据源映射规则
```typescript
POST /api/v1/data-mapper/rules
{
  "name": "LongPort Stock Basic Info Mapping",
  "provider": "longport",
  "ruleType": "get-stock-basic-info",
  "sharedDataFieldMappings": [
    {
      "sourceField": "secu_static_info[0].symbol",
      "targetField": "symbol",
      "description": "LongPort标的代码映射"
    },
    {
      "sourceField": "secu_static_info[0].name_cn",
      "targetField": "companyNameCN",
      "description": "LongPort公司中文名称映射"
    },
    {
      "sourceField": "secu_static_info[0].total_shares", 
      "targetField": "totalShares",
      "description": "LongPort总股本映射"
    }
    // ... 更多映射规则
  ]
}
```

## API 接口

### 获取预设字段配置
```http
GET /api/v1/data-mapper/rules?provider=preset&ruleType=get-stock-basic-info-fields
```

### 字段映射建议
```http
POST /api/v1/data-mapper/field-suggestions
Content-Type: application/json

{
  "sourceFields": ["name_cn", "exchange", "total_shares", "eps"],
  "targetFields": ["companyNameCN", "exchange", "totalShares", "earningsPerShare", "currency"]
}
```

### 创建数据源映射规则
```http
POST /api/v1/data-mapper/rules
Content-Type: application/json

{
  "name": "Provider Specific Stock Basic Info Mapping",
  "provider": "your-provider",
  "ruleType": "get-stock-basic-info",
  "sharedDataFieldMappings": [...]
}
```

## 标准化字段命名约定

### 公司标识字段
- `symbol` - 标的代码
- `companyNameCN` - 中文简体公司名称
- `companyNameEN` - 英文公司名称
- `companyNameHK` - 中文繁体公司名称
- `companyName` - 默认公司名称 (通常为中文)
- `companyDisplayName` - 国际化显示名称 (通常为英文)

### 市场信息字段
- `exchange` - 交易所代码
- `currency` - 交易币种
- `lotSize` - 每手股数

### 股本结构字段
- `totalShares` - 总股本
- `circulatingShares` - 流通股本
- `hkShares` - 港股股本 (仅港股)

### 财务指标字段
- `earningsPerShare` - 每股盈利 (EPS)
- `earningsPerShareTTM` - 每股盈利 TTM
- `bookValuePerShare` - 每股净资产 (BPS)
- `dividendYield` - 股息率

### 市值相关字段
- `marketCapitalization` - 总市值
- `floatMarketCap` - 流通市值
- `peRatio` - 市盈率 (P/E)
- `pbRatio` - 市净率 (P/B)

## 币种支持

### 标准货币代码
- `CNY` - 人民币 (中国大陆A股)
- `HKD` - 港币 (香港股票)
- `USD` - 美元 (美国股票)

### 扩展支持
系统设计支持更多货币类型，可根据需要添加：
- `SGD` - 新加坡元
- `JPY` - 日元
- `EUR` - 欧元

## 特殊字段说明

### 港股特有字段
- `hkShares` - 仅适用于港股市场，其他市场此字段可为 null 或忽略

### 衍生计算字段
以下字段需要结合实时报价数据进行计算：

1. **市值计算**
   ```typescript
   marketCapitalization = totalShares * currentPrice
   floatMarketCap = circulatingShares * currentPrice
   ```

2. **估值比率计算**
   ```typescript
   peRatio = currentPrice / earningsPerShareTTM
   pbRatio = currentPrice / bookValuePerShare
   ```

### 数据类型注意事项
- **数值字段**: `eps`, `eps_ttm`, `bps`, `dividend_yield` 为字符串格式，使用时需要转换为数值
- **整数字段**: `lot_size`, `total_shares`, `circulating_shares`, `hk_shares` 为整数类型
- **字符串字段**: 名称、代码、交易所等为字符串类型

## 实际应用场景

### 1. 公司信息展示
```typescript
// 公司基本信息卡片
{
  symbol: "700.HK",
  companyNameCN: "腾讯控股",
  companyNameEN: "Tencent Holdings Ltd",
  exchange: "SEHK",
  currency: "HKD"
}
```

### 2. 股本结构分析
```typescript
// 股本结构图表
{
  totalShares: 9570000000,
  circulatingShares: 9550000000,
  hkShares: 9550000000,
  lotSize: 100
}
```

### 3. 财务指标对比
```typescript
// 财务指标表格
{
  earningsPerShare: "15.85",
  earningsPerShareTTM: "16.23", 
  bookValuePerShare: "89.45",
  dividendYield: "0.42"
}
```

### 4. 估值分析
```typescript
// 需要结合实时价格计算
{
  currentPrice: 342.5, // 来自报价数据
  marketCapitalization: calculateMarketCap(totalShares, currentPrice),
  peRatio: calculatePERatio(currentPrice, earningsPerShareTTM),
  pbRatio: calculatePBRatio(currentPrice, bookValuePerShare)
}
```

## 与报价数据的集成

### 数据组合使用
基本信息数据通常与报价数据结合使用，提供完整的股票信息：

```typescript
// 完整股票信息
{
  // 基本信息
  symbol: "700.HK",
  companyNameCN: "腾讯控股",
  totalShares: 9570000000,
  earningsPerShareTTM: "16.23",
  
  // 实时报价
  lastPrice: 342.5,
  priceChange: 1.5,
  priceChangePercent: "0.44%",
  
  // 计算字段
  marketCapitalization: 3.276e12, // 总股本 * 股价
  peRatio: 21.1 // 股价 / EPS TTM
}
```

## 扩展和维护

### 添加新字段
1. 修改 `init-stock-basic-info-preset-fields.ts` 脚本
2. 在 `sharedDataFieldMappings` 数组中添加新的字段映射
3. 重新运行初始化脚本

### 字段重命名
1. 更新预设配置中的 `targetField` 名称
2. 确保所有相关的映射规则都更新
3. 更新前端和API文档

### 版本管理
每次更新预设字段配置时，建议更新版本号，便于追踪变更历史。

### 多语言支持
系统支持多语言名称字段：
- `companyNameCN` - 中文简体
- `companyNameEN` - 英文
- `companyNameHK` - 中文繁体

可根据用户语言偏好选择显示相应的名称字段。

## 注意事项

1. **数组字段处理**: 源字段使用 `secu_static_info[]` 表示数组结构，实际使用时需要指定具体索引
2. **港股特有字段**: `hk_shares` 仅适用于港股，其他市场可忽略
3. **数据类型转换**: 财务指标字段为字符串格式，计算时需要转换为数值
4. **计算字段依赖**: 估值比率和市值字段需要结合实时报价数据计算
5. **币种处理**: 不同市场使用不同货币，需要在显示时注意币种转换

这个预设字段配置为系统提供了股票基本信息数据的标准化基础，确保了不同数据源之间的数据一致性和完整性。