# Data-Mapper 组件功能总览说明

## 📋 组件概述

Data-Mapper是一个企业级数据映射中台组件，支持从多个数据源（LongPort、Futu、iTick等）动态生成和管理数据映射规则。该组件通过智能字段对齐算法，自动将第三方数据格式转换为系统标准格式。

### 核心能力
- 🔄 **多源数据映射**：支持REST和Stream两种API类型的数据映射
- 📊 **双规则体系**：股票报价规则（quote_fields）和股票基本信息规则（basic_info_fields）
- 🎯 **智能字段对齐**：基于语义分析的自动字段匹配
- ⚡ **Redis缓存优化**：高性能映射规则缓存
- 🔧 **完整生命周期管理**：从模板创建到规则生成的全流程支持

## 🏗️ 组件架构

```
Data-Mapper Component
├── 控制器层 (4个控制器)
│   ├── UserJsonPersistenceController    # 用户JSON持久化
│   ├── SystemPersistenceController      # 系统预设持久化
│   ├── TemplateAdminController          # 模板管理
│   └── MappingRuleController            # 映射规则管理
├── 服务层 (6个核心服务)
│   ├── DataSourceAnalyzerService        # 数据源分析
│   ├── DataSourceTemplateService        # 模板管理
│   ├── FlexibleMappingRuleService       # 规则管理
│   ├── PersistedTemplateService         # 预设模板持久化
│   ├── RuleAlignmentService             # 规则对齐
│   └── MappingRuleCacheService          # Redis缓存
└── 数据层
    ├── DataSourceTemplate Schema         # 模板数据结构
    └── FlexibleMappingRule Schema        # 规则数据结构
```

## 🔐 权限体系

### 三种认证方式
1. **API Key认证** (`X-App-Key` + `X-Access-Token`)
   - 权限：`Permission.DATA_READ`
   - 适用：第三方应用访问

2. **JWT认证** (`Authorization: Bearer <token>`)
   - 角色：`UserRole.ADMIN`, `UserRole.DEVELOPER`
   - 适用：管理员和开发者操作

3. **公开访问** 
   - 无需认证（本组件不使用）

---

## 📡 API端点详细说明

## 1️⃣ UserJsonPersistenceController - 用户JSON持久化控制器

**基础路径**: `/api/v1/data-mapper/user-persistence`

### 1.1 分析数据源并可选保存

**端点**: `POST /analyze-source`

**权限**: API Key认证 (`Permission.DATA_READ`)

**功能**: 分析用户上传的JSON数据，自动提取字段结构和类型信息，可选择保存为模板

**请求体**:
```typescript
{
  provider?: string;           // 数据提供商名称 (默认: 'custom')
  apiType: 'rest' | 'stream';  // API类型 (必需)
  sampleData: object;           // 示例数据对象 (必需)
  name?: string;                // 数据源名称 (可选)
  description?: string;         // 数据源描述 (可选)
  dataType?: 'quote_fields' | 'basic_info_fields'; // 数据类型 (默认: 'quote_fields')
  saveAsTemplate?: boolean;     // 是否保存为模板 (默认: false)
}
```

**响应示例**:
```json
{
  "provider": "longport",
  "apiType": "stream",
  "sampleData": {...},
  "extractedFields": [
    {
      "fieldPath": "last_done",
      "fieldName": "last_done",
      "fieldType": "number",
      "sampleValue": 561,
      "confidence": 0.9,
      "isNested": false,
      "nestingLevel": 0
    }
  ],

  "totalFields": 15,
  "analysisTimestamp": "2024-08-11T10:00:00Z",
  "confidence": 0.85,
  "savedTemplate": {
    "id": "template123",
    "name": "longport_quote_fields_template",
    "message": "模板已成功保存到数据库"
  }
}
```

---

## 2️⃣ SystemPersistenceController - 系统预设持久化控制器

**基础路径**: `/api/v1/data-mapper/system-persistence`

### 2.1 持久化预设模板

**端点**: `POST /persist-presets`

**权限**: JWT认证 (`UserRole.ADMIN`)

**功能**: 将硬编码的预设模板保存到数据库中，支持后续编辑

**请求体**: 无

**响应示例**:
```json
{
  "created": 5,
  "updated": 0,
  "skipped": 0,
  "details": ["持久化成功"]
}
```

### 2.2 重置单个预设模板

**端点**: `POST /:id/reset`

**权限**: JWT认证 (`UserRole.ADMIN`)

**功能**: 将指定模板恢复为硬编码的原始配置

### 2.3 批量重置预设模板

**端点**: `POST /reset-bulk`

**权限**: JWT认证 (`UserRole.ADMIN`)

**请求体**:
```json
{
  "ids": ["template1", "template2", "template3"]
}
```

### 2.4 全量重置预设模板

**端点**: `POST /reset-all`

**权限**: JWT认证 (`UserRole.ADMIN`)

**功能**: 删除所有预设模板并恢复为硬编码配置

---

## 3️⃣ TemplateAdminController - 模板管理控制器

**基础路径**: `/api/v1/data-mapper/admin/templates`

### 3.1 创建数据源模板

**端点**: `POST /`

**权限**: JWT认证 (`UserRole.ADMIN`, `UserRole.DEVELOPER`)

**请求体**:
```typescript
{
  name: string;                              // 模板名称 (必需)
  provider: string;                          // 数据提供商 (必需)
  apiType: 'rest' | 'stream';               // API类型 (必需)
  description?: string;                      // 模板描述
  sampleData: object;                        // 示例数据 (必需)
  extractedFields: ExtractedFieldDto[];     // 提取的字段列表 (必需)
  isDefault?: boolean;                       // 是否设为默认模板
  confidence: number;                        // 模板可靠性评分 (0-1)
}
```

### 3.2 查询数据源模板

**端点**: `GET /`

**权限**: API Key认证 (`Permission.DATA_READ`)

**查询参数**:
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 20)
- `provider`: 提供商筛选
- `apiType`: API类型筛选

### 3.3 获取模板详情

**端点**: `GET /:id`

**权限**: API Key认证 (`Permission.DATA_READ`)

### 3.4 更新模板

**端点**: `PUT /:id`

**权限**: JWT认证 (`UserRole.ADMIN`)

### 3.5 删除模板

**端点**: `DELETE /:id`

**权限**: JWT认证 (`UserRole.ADMIN`)

### 3.6 持久化模板管理

**端点组**:
- `GET /persisted/all` - 获取所有持久化模板列表
- `GET /persisted/:id` - 获取持久化模板详情
- `PUT /persisted/:id` - 编辑持久化模板
- `DELETE /persisted/:id` - 删除持久化模板

### 3.7 统计和健康检查

**端点**: `GET /stats`

**权限**: JWT认证 (`UserRole.ADMIN`, `UserRole.DEVELOPER`)

**响应示例**:
```json
{
  "totalTemplates": 10,
  "templatesByProvider": {
    "longport": 6,
    "futu": 4
  },
  "templatesByApiType": {
    "rest": 5,
    "stream": 5
  },
  "activeTemplates": 8,
  "presetTemplates": 5
}
```

**端点**: `GET /health`

**权限**: JWT认证 (`UserRole.ADMIN`, `UserRole.DEVELOPER`)

---

## 4️⃣ MappingRuleController - 映射规则控制器

**基础路径**: `/api/v1/data-mapper/rules`

### 4.1 基础规则管理

#### 创建映射规则

**端点**: `POST /`

**权限**: JWT认证 (`UserRole.ADMIN`, `UserRole.DEVELOPER`)

**请求体**:
```typescript
{
  name: string;                              // 规则名称 (必需)
  provider: string;                          // 数据提供商 (必需)
  apiType: 'rest' | 'stream';               // API类型 (必需)
  transDataRuleListType: string;             // 规则类型 (必需)
  description?: string;                      // 规则描述
  sourceTemplateId?: string;                 // 数据源模板ID
  fieldMappings: FlexibleFieldMappingDto[];  // 字段映射列表 (必需)
  isDefault?: boolean;                       // 是否设为默认规则
  version?: string;                           // 版本号 (默认: '1.0.0')
}
```

**字段映射结构** (`FlexibleFieldMappingDto`):
```typescript
{
  sourceFieldPath: string;      // 源字段路径 (如: 'last_done')
  targetField: string;          // 目标字段名称 (如: 'lastPrice')
  transform?: {                 // 转换规则 (可选)
    type: 'multiply' | 'divide' | 'add' | 'subtract' | 'format' | 'custom';
    value?: number | string;
    customFunction?: string;
  };
  fallbackPaths?: string[];     // 回退路径列表
  confidence: number;           // 映射可靠性评分 (0-1)
  description?: string;         // 映射描述
  isActive?: boolean;           // 是否启用此字段映射
}
```

#### 查询映射规则

**端点**: `GET /`

**权限**: API Key认证 (`Permission.DATA_READ`)

**查询参数**:
- `page`: 页码
- `limit`: 每页数量
- `provider`: 提供商筛选
- `apiType`: API类型筛选
- `transDataRuleListType`: 规则类型筛选

#### 获取规则详情

**端点**: `GET /:id`

**权限**: API Key认证 (`Permission.DATA_READ`)

#### 更新规则

**端点**: `PUT /:id`

**权限**: JWT认证 (`UserRole.ADMIN`, `UserRole.DEVELOPER`)

#### 删除规则

**端点**: `DELETE /:id`

**权限**: JWT认证 (`UserRole.ADMIN`)

### 4.2 基于模板生成规则

#### 一键生成映射规则

**端点**: `POST /generate-from-template/:templateId`

**权限**: JWT认证 (`UserRole.ADMIN`, `UserRole.DEVELOPER`)

**请求体**:
```json
{
  "ruleType": "quote_fields",  // 或 "basic_info_fields"
  "ruleName": "自定义规则名称"
}
```

#### 预览字段对齐

**端点**: `POST /preview-alignment/:templateId`

**权限**: JWT认证 (`UserRole.ADMIN`, `UserRole.DEVELOPER`)

**查询参数**: `ruleType` ('quote_fields' | 'basic_info_fields')

### 4.3 规则对齐和调整

#### 重新对齐规则

**端点**: `POST /:id/realign`

**权限**: JWT认证 (`UserRole.ADMIN`, `UserRole.DEVELOPER`)

**功能**: 基于最新的模板重新对齐现有的映射规则

#### 手动调整字段映射

**端点**: `PUT /:id/adjust-mappings`

**权限**: JWT认证 (`UserRole.ADMIN`, `UserRole.DEVELOPER`)

**请求体**:
```json
[
  {
    "action": "add",           // 'add' | 'remove' | 'modify'
    "sourceField": "new_field",
    "targetField": "newField",
    "confidence": 0.8,
    "description": "新增字段映射"
  }
]
```

### 4.4 规则测试功能

#### 通用规则测试

**端点**: `POST /test`

**权限**: API Key认证 (`Permission.DATA_READ`)

**请求体**:
```json
{
  "dataMapperRuleId": "rule123",
  "testData": {
    "symbol": "700.HK",
    "last_done": 561
  },
  "includeDebugInfo": true
}
```

#### 特定规则测试

**端点**: `POST /:id/test`

**权限**: JWT认证 (`UserRole.ADMIN`, `UserRole.DEVELOPER`)

**请求体**:
```json
{
  "sampleData": {
    "symbol": "700.HK",
    "last_done": 561
  },
  "includeDebugInfo": true
}
```

**响应示例**:
```json
{
  "dataMapperRuleId": "rule123",
  "ruleName": "LongPort Stream Quote Rule",
  "originalData": {...},
  "transformedData": {
    "symbol": "700.HK",
    "lastPrice": 561
  },
  "success": true,
  "mappingStats": {
    "totalMappings": 10,
    "successfulMappings": 9,
    "failedMappings": 1,
    "successRate": 0.9
  },
  "debugInfo": [...],
  "executionTime": 23
}
```

---

## 📊 支持的标准字段

### Quote Fields (股票报价字段) - 14个字段

| 字段名 | 说明 | 类型 | 示例值 |
|--------|------|------|--------|
| `symbol` | 股票代码 | string | "700.HK" |
| `lastPrice` | 最新价 | number | 561.00 |
| `previousClose` | 昨收价 | number | 558.50 |
| `openPrice` | 开盘价 | number | 560.00 |
| `highPrice` | 最高价 | number | 565.50 |
| `lowPrice` | 最低价 | number | 558.00 |
| `volume` | 成交量 | number | 11292534 |
| `turnover` | 成交额 | number | 6334567890 |
| `timestamp` | 时间戳 | string/Date | "2024-08-11T10:00:00Z" |
| `tradeStatus` | 交易状态 | string | "NORMAL" |
| `preMarketPrice` | 盘前价格 | number | 560.50 |
| `postMarketPrice` | 盘后价格 | number | 562.00 |
| `preMarketVolume` | 盘前成交量 | number | 123456 |
| `postMarketVolume` | 盘后成交量 | number | 234567 |

### Basic Info Fields (股票基本信息字段) - 15个字段

| 字段名 | 说明 | 类型 | 示例值 |
|--------|------|------|--------|
| `symbol` | 股票代码 | string | "700.HK" |
| `nameCn` | 中文名称 | string | "腾讯控股" |
| `nameEn` | 英文名称 | string | "Tencent Holdings" |
| `nameHk` | 繁体名称 | string | "騰訊控股" |
| `exchange` | 交易所 | string | "HKEX" |
| `currency` | 货币 | string | "HKD" |
| `board` | 板块 | string | "主板" |
| `lotSize` | 每手股数 | number | 100 |
| `totalShares` | 总股本 | number | 9581064000 |
| `circulatingShares` | 流通股本 | number | 9581064000 |
| `hkShares` | 港股股本 | number | 9581064000 |
| `eps` | 每股收益 | number | 15.23 |
| `epsTtm` | 每股收益TTM | number | 16.45 |
| `bps` | 每股净资产 | number | 89.67 |
| `dividendYield` | 股息率 | number | 0.42 |
| `stockDerivatives` | 衍生品类型 | array | ["WARRANT", "CBBC"] |

---

## 🔄 数据转换规则类型

### 支持的转换操作

| 转换类型 | 说明 | 示例 |
|----------|------|------|
| `multiply` | 乘法 | 原值 × 0.13 (如：佣金计算) |
| `divide` | 除法 | 原值 ÷ 100 (如：百分比转小数) |
| `add` | 加法 | 原值 + 8 (如：时区调整) |
| `subtract` | 减法 | 原值 - 0.5 (如：价格调整) |
| `format` | 格式化 | 使用模板字符串格式化 |
| `custom` | 自定义 | 自定义转换函数 |

---

## 📈 使用统计字段

每个映射规则包含以下统计信息：

| 字段名 | 说明 | 类型 |
|--------|------|------|
| `usageCount` | 使用次数 | number |
| `lastUsedAt` | 最后使用时间 | Date |
| `lastValidatedAt` | 最后验证时间 | Date |
| `successfulTransformations` | 成功转换次数 | number |
| `failedTransformations` | 失败转换次数 | number |
| `successRate` | 成功率 | number (0-1) |
| `overallConfidence` | 整体规则可靠性 | number (0-1) |

---

## 🚀 典型使用流程

### 流程1：用户上传JSON创建规则
```
1. POST /api/v1/data-mapper/user-persistence/analyze-source (分析+保存模板)
2. POST /api/v1/data-mapper/rules/generate-from-template/:templateId (基于模板生成规则)
3. POST /api/v1/data-mapper/rules/:id/test (测试规则)
4. PUT /api/v1/data-mapper/rules/:id/adjust-mappings (按需调整)
```

### 流程2：使用系统预设模板
```
1. POST /api/v1/data-mapper/system-persistence/persist-presets (持久化预设)
2. GET /api/v1/data-mapper/admin/templates (查看可用模板)
3. POST /api/v1/data-mapper/rules/generate-from-template/:templateId (生成规则)
4. POST /api/v1/data-mapper/rules/test (测试规则效果)
```

### 流程3：手动创建映射规则
```
1. POST /api/v1/data-mapper/rules (创建自定义规则)
2. POST /api/v1/data-mapper/rules/:id/test (测试规则)
3. PUT /api/v1/data-mapper/rules/:id (更新优化)
4. POST /api/v1/data-mapper/rules/:id/realign (重新对齐)
```

---



## confidence 字段说明

1. confidence 字段的定义

  confidence 字段出现在两个主要的 Schema 中：

   * `ExtractedField` (在 `DataSourceTemplate` 内):
       * @Prop({ required: true, min: 0, max: 1 })
       * confidence: number; // 字段稳定性评分 0-1
       * 含义: 这个 confidence 代表了从原始数据源中自动提取的某个字段的稳定性或可靠性。分数在 0 到 1 之间。

   * `FlexibleFieldMapping` (在 `FlexibleMappingRule` 内):
       * @Prop({ min: 0, max: 1, default: 0.5 })
       * confidence: number; // 映射可靠性评分
       * 含义: 这个 confidence 代表了从源字段 (sourceFieldPath) 到目标字段 (targetField)
         这条映射规则的可靠性或准确性。

  2. confidence 的作用和目的

  字段级的 confidence 主要有以下几个关键作用：

   1. 量化数据质量和可靠性:
       * 它提供了一个量化指标来评估数据源中每个字段的稳定性和映射规则的准确性。这比简单的“有”或“没有”更加精细
         。
       * 例如，一个 confidence 为 0.9 的字段意味着它在 90% 的情况下都能被稳定地解析和映射，而一个 0.3
         的字段则表示它非常不稳定或不常用。

   2. 支持自动化和智能化决策:
       * 智能映射推荐: 在建立新的映射规则时，系统可以优先推荐 confidence
         更高的字段进行映射，减少人工选择的成本和错误率。
       * 动态数据清洗: 在数据处理流程中，可以根据 confidence
         分数来决定是否采纳某个字段的值。例如，可以设定一个阈值（如 confidence < 
         0.5），低于该阈值的字段数据将被标记为“低质量”或直接丢弃，从而提高最终数据的整体质量。
       * 风险评估: 在金融等对数据准确性要求极高的场景下，confidence
         可以作为风险评估的一个因子。如果一个关键交易字段的 confidence 很低，系统可以触发警报或需要人工介入。

   3. 提升系统的可维护性和健壮性:
       * 问题定位: 当数据出现问题时，confidence
         可以帮助开发人员快速定位到可能是问题根源的、低可靠性的字段或映射规则。
       * 版本控制和回归测试: 在数据源 API 发生变更后，可以通过重新分析数据样本来更新 confidence
         分数。如果一个字段的 confidence
         突然大幅下降，说明这次变更可能对该字段产生了破坏性影响，需要立即关注。
       * 计算整体可靠性: 正如 FlexibleMappingRuleSchema 中的 pre('save') 钩子所示，单个字段的 confidence
         可以被用来计算整个映射规则的整体可靠性 
         (`overallConfidence`)。这为评估和选择高质量的映射规则提供了依据。

  3. 使用场景

  confidence 字段在以下场景中会发挥重要作用：

   * 场景一：异构数据源接入 (Data Onboarding)
       * 问题: 当需要从一个新的、结构未知的第三方数据提供商（如 LongPort,
         Futu）接入数据时，需要快速理解其数据结构并建立映射规则。
       * 使用:
           1. 系统首先通过 data-source-analyzer.service.ts（推测）分析收到的示例数据 (`sampleData`)。
           2. 对于 sampleData
              中的每个字段，分析器会根据其出现频率、数据类型是否一致、是否为嵌套等因素，为其生成一个初始的
              confidence 分数，并记录在 ExtractedField 中。
           3. 当用户或系统基于这个模板创建 FlexibleMappingRule 时，会参考 ExtractedField 的 confidence
              来决定默认的映射关系和映射的 confidence。

   * 场景二：数据流的动态处理和清洗
       * 问题: 实时数据流（如股票报价）中可能存在数据缺失、格式错误或临时性的字段变更。
       * 使用:
           1. 数据进入 Transformer 组件（推测）进行处理。
           2. 对于每一条流入的数据，Transformer 会应用 FlexibleMappingRule。
           3. 在应用规则时，它可以检查每个字段映射的 confidence。如果一个非必填字段的 confidence
              低于预设阈值，并且转换失败，系统可以优雅地跳过该字段而不是抛出错误中断整个流程。

   * 场景三：数据质量监控和告警
       * 问题: 需要持续监控数据提供商的 API 质量，防止因其变更导致下游系统出错。
       * 使用:
           1. 可以定期（例如每天）用最新的数据样本重新运行数据源分析流程。
           2. 如果发现某个关键字段的 confidence 从 1.0 降到了
              0.5，系统可以自动触发一个警报，通知开发人员检查上游 API 是否发生了变更。

   * 场景四：多数据源的智能路由和容错
       * 问题: 同一个数据指标（如某支股票的最新价）可能可以从多个提供商获取，但质量参差不齐。
       * 使用:
           1. 系统可以维护来自不同提供商的映射规则，并记录它们各自的 confidence。
           2. 当需要获取数据时，系统可以优先选择 overallConfidence 最高的规则。
           3. 如果最高信誉的提供商出现故障，系统可以自动切换到次优选择，并使用其 fallbackPaths
              进行容错处理，保证了服务的高可用性。

  总结

  字段级的 confidence 是一个核心的元数据 (Metadata)，它将数据质量从一个抽象概念转化为一个可计算、可操作的量化
  指标。通过在数据提取和数据映射两个关键环节引入
  confidence，系统获得了更强的自动化处理能力、健壮性和可维护性，尤其适用于处理复杂多变、来源异构的数据场景。



## ✅ 重要更正说明

**与之前分析报告相比，实际代码实现度更高：**

### 🎯 **DataSourceAnalyzerService 实际状态**
- ✅ **DataSourceAnalyzerService** - 完整存在且功能齐全
- ✅ **analyzeDataSource()方法** - 存在，支持字段提取、类型检测、置信度计算
- ✅ **createTemplateFromAnalysis()方法** - 在DataSourceTemplateService中存在
- ✅ **数据源分析功能** - 全部实现，包括嵌套对象处理、类型推断等

### 🔧 **实际API端点路径**
```
实际存在的分析端点：
POST /api/v1/data-mapper/user-persistence/analyze-source  ✅

不存在的端点：
POST /api/v1/data-mapper/analyze     ❌
POST /api/v1/data-mapper/recommend   ❌
```

## 📝 注意事项

1. **权限要求**：管理操作需要JWT认证，查询操作支持API Key认证
2. **API类型**：必须明确指定`rest`或`stream`类型
3. **规则类型**：区分`quote_fields`（报价）和`basic_info_fields`（基本信息）
4. **缓存优化**：规则会自动缓存到Redis，提升性能
5. **字段对齐**：系统会自动进行语义匹配，但建议手动验证关键字段
6. **版本管理**：规则支持版本控制，便于回滚和追踪
7. **数据分析能力**：完整支持JSON数据源分析，包括字段类型推断和置信度评估

---

## 🔗 相关文档

- [Data-Mapper 组件功能简化.md](./Data-Mapper%20组件功能简化.md) - 架构设计文档
- [系统基本架构和说明文档.md](../系统基本架构和说明文档.md) - 系统整体架构
- API测试集合：`/test/jest/e2e/core/data-mapper/`

---

*最后更新时间：2024-08-11*
*版本：v1.0.0*