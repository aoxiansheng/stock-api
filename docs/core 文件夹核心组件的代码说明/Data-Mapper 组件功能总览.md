📊 Data-Mapper 组件功能总览

  🎯 核心职责

  Data-Mapper是股票数据处理系统的字段映射规则引擎，位于6组件架构的第3位，负责将不同数据源
  的原始字段格式转换为系统标准化字段格式。

  🔄 在数据流中的位置

  Receiver → Symbol-Mapper → **Data-Mapper** → Transformer → Storage → Query
                               ↑
                      字段映射和标准化

  🏗️ 组件架构设计

  核心Schema定义

  // MongoDB数据模型
  class DataMappingRule {
    name: string;                    // 映射规则名称
    provider: string;                // 数据提供商 (如: "longport")
    dataRuleListType: string;           // 规则类型 (quote_fields, basic_info_fields)
    sharedDataFieldMappings: DataFieldMapping[];   // 字段映射数组
    isActive: boolean;              // 是否激活
    version: string;                // 版本号 (默认"1.0.0")
  }

  // 字段映射结构
  interface DataFieldMapping {
    sourceField: string;    // 源字段路径: "secu_quote[].last_done"
    targetField: string;    // 目标字段名: "lastPrice"
    transform?: {           // 可选转换函数
      type: "multiply" | "divide" | "add" | "subtract" | "format" | "custom";
      value?: number | string;
      customFunction?: string;
    };
    description?: string;   // 字段描述
  }

  核心业务逻辑

  1. 字段映射规则管理 - CRUD操作，支持分页查询和搜索
  2. 数据结构解析 - 智能解析JSON，提取嵌套字段路径
  3. 字段转换应用 - 根据映射规则转换原始数据
  4. 智能字段建议 - 基于相似度算法提供映射建议
  5. 映射测试验证 - 提供测试和预览功能

  📋 37个预设字段详细定义

  🎯 股票报价字段 (22个) - quote_fields

  基础报价字段 (10个)

  | 字段名           | 源字段路径                     | 描述    | 类型     |
  |---------------|---------------------------|-------|--------|
  | symbol        | secu_quote[].symbol       | 标的代码  | string |
  | lastPrice     | secu_quote[].last_done    | 最新成交价 | number |
  | previousClose | secu_quote[].prev_close   | 昨收价   | number |
  | openPrice     | secu_quote[].open         | 开盘价   | number |
  | highPrice     | secu_quote[].high         | 最高价   | number |
  | lowPrice      | secu_quote[].low          | 最低价   | number |
  | timestamp     | secu_quote[].timestamp    | 时间戳   | number |
  | volume        | secu_quote[].volume       | 成交量   | number |
  | turnover      | secu_quote[].turnover     | 成交额   | number |
  | tradeStatus   | secu_quote[].trade_status | 交易状态  | number |

  盘前交易字段 (6个)

  | 字段名                | 源字段路径                                   | 描述    |
  |--------------------|-----------------------------------------|-------|
  | preMarketPrice     | secu_quote[].pre_market_quote.last_done | 盘前最新价 |
  | preMarketTimestamp | secu_quote[].pre_market_quote.timestamp | 盘前时间戳 |
  | preMarketVolume    | secu_quote[].pre_market_quote.volume    | 盘前成交量 |
  | preMarketTurnover  | secu_quote[].pre_market_quote.turnover  | 盘前成交额 |
  | preMarketHigh      | secu_quote[].pre_market_quote.high      | 盘前最高价 |
  | preMarketLow       | secu_quote[].pre_market_quote.low       | 盘前最低价 |

  盘后交易字段 (4个)

  | 字段名                 | 源字段路径                                    | 描述    |
  |---------------------|------------------------------------------|-------|
  | postMarketPrice     | secu_quote[].post_market_quote.last_done | 盘后最新价 |
  | postMarketTimestamp | secu_quote[].post_market_quote.timestamp | 盘后时间戳 |
  | postMarketVolume    | secu_quote[].post_market_quote.volume    | 盘后成交量 |
  | postMarketTurnover  | secu_quote[].post_market_quote.turnover  | 盘后成交额 |

  夜盘和计算字段 (2个)

  | 字段名             | 源字段路径                                  | 描述    | 特殊处理
   |
  |-----------------|----------------------------------------|-------|------|
  | overnightPrice  | secu_quote[].overnight_quote.last_done | 夜盘最新价 | -    |
  | overnightVolume | secu_quote[].overnight_quote.volume    | 夜盘成交量 | -    |

  🏢 股票基本信息字段 (15个) - basic_info_fields

  基础信息字段 (7个)

  | 字段名           | 源字段路径                       | 描述       |
  |---------------|-----------------------------|----------|
  | symbol        | secu_static_info[].symbol   | 标的代码     |
  | companyNameCN | secu_static_info[].name_cn  | 公司中文名称   |
  | companyNameEN | secu_static_info[].name_en  | 公司英文名称   |
  | companyNameHK | secu_static_info[].name_hk  | 公司繁体中文名称 |
  | exchange      | secu_static_info[].exchange | 交易所      |
  | currency      | secu_static_info[].currency | 交易币种     |
  | lotSize       | secu_static_info[].lot_size | 每手股数     |

  股本结构字段 (3个)

  | 字段名               | 源字段路径                                 | 描述        |
  |-------------------|---------------------------------------|-----------|
  | totalShares       | secu_static_info[].total_shares       | 总股本       |
  | circulatingShares | secu_static_info[].circulating_shares | 流通股本      |
  | hkShares          | secu_static_info[].hk_shares          | 港股股本(仅港股) |

  财务指标字段 (4个)

  | 字段名                 | 源字段路径                             | 描述         |
  |---------------------|-----------------------------------|------------|
  | earningsPerShare    | secu_static_info[].eps            | 每股盈利(EPS)  |
  | earningsPerShareTTM | secu_static_info[].eps_ttm        | 每股盈利TTM    |
  | bookValuePerShare   | secu_static_info[].bps            | 每股净资产(BPS) |
  | dividendYield       | secu_static_info[].dividend_yield | 股息率        |

  标准化字段 (1个)

  | 字段名         | 源字段路径                      | 描述     |
  |-------------|----------------------------|--------|
  | companyName | secu_static_info[].name_cn | 默认公司名称 |

  🔧 字段转换功能

  支持的转换类型

  interface Transform {
    type: "multiply" | "divide" | "add" | "subtract" | "format" | "custom";
    value?: number | string;
    customFunction?: string;
  }

  转换示例

  // 数学运算转换
  {
    sourceField: "secu_quote[].last_done",
    targetField: "lastPriceInUSD",
    transform: {
      type: "multiply",
      value: 0.13  // 港币转美元汇率
    }
  }

  // 格式化转换
  {
    sourceField: "secu_quote[].last_done",
    targetField: "formattedPrice",
    transform: {
      type: "format",
      value: "HK$ {value}"  // 添加货币符号
    }
  }

  🎯 核心算法特性

  路径解析算法 (ObjectUtils.getValueFromPath)

  - 支持格式: a.b.c、a[0].b、a[].b
  - 深度限制: 最大10层嵌套
  - 容错机制: 自动驼峰转换，解析失败返回undefined

  字段建议算法 (StringUtils.calculateSimilarity)

  - 精确匹配: 1.0分
  - 子串匹配: 0.8分
  - Levenshtein距离: 1 - (距离/最大长度)
  - 相似度阈值: 30%

  性能监控

  - 慢映射阈值: 1秒
  - 批量处理: 支持大数据量映射
  - 索引优化: {provider: 1, dataRuleListType: 1}

  🔄 数据转换流程

  graph TD
      A[原始数据] --> B[查找映射规则]
      B --> C{数据结构类型?}
      C -->|数组| D[_transformArray]
      C -->|对象| E[_transformObject]
      D --> F[路径解析]
      E --> F
      F --> G[字段转换]
      G --> H[标准化输出]
      H --> I[性能监控]

  📝 字段命名规范

  规则类型 (dataRuleListType)

  - quote_fields - 股票报价字段
  - basic_info_fields - 基本信息字段
  - index_fields - 指数字段
  - market_status_fields - 市场状态字段

  字段命名约定

  - 驼峰命名: lastPrice, companyNameCN
  - 语义明确: preMarketPrice, postMarketVolume
  - 统一后缀: Price, Volume, Timestamp

  Data-Mapper组件通过37个精心设计的预设字段和灵活的映射规则，实现了多数据源的统一字段标准
  化，为整个股票数据处理系统提供了坚实的数据转换基础。




data-mapper 
是系统的 “规则定义中心”，它专门负责所有映射规则的生命周期管理，包括创建、读取、更新和删除 (CRUD)。
data-mapper 专注于数据映射这一纯粹的技术任务。
  具体来说，您会调用 data-mapper 模块暴露出的 create 接口（在 DataMapperService 中实现），并提供一个
  CreateDataMappingDto 对象作为请求体。这个对象会包含定义新规则所需的所有信息，例如：

   * name: 规则的名称。
   * provider: 规则适用的数据提供商 (e.g., "longport")。
   * dataRuleListType: 规则的类型 (e.g., "quote_fields")。
   * sharedDataFieldMappings: 最核心的部分，一个定义了所有源字段到目标字段映射关系的数组。


   * 规则的 CRUD (创建、读取、更新、删除):
       * 它提供了一整套 API 用于管理 DataMappingRule (数据映射规则)。这些规则存储在数据库中（根据
         data-mapper.schema.ts 定义）。
       * 一个规则的核心是 fieldMappings，它精确定义了 “哪个源字段 (`sourceField`) 对应哪个目标字段 
         (`targetField`)”。


   * 定义数据转换逻辑:
       * 在 sharedDataFieldMappings 中，除了简单的字段映射，还可以定义 transform 操作。
       * 这允许在映射过程中进行简单的数据处理，例如：
           * multiply / divide: 对数值进行乘除（比如单位换算）。
           * add / subtract: 对数值进行加减。
           * format: 将值嵌入到一个字符串模板中。


   * 核心方法 `applyMappingRule`:
       * 这是 data-mapper 最关键的执行方法。
       * 它接收一个 ruleId 和原始数据 sourceData。
       * 然后，它会根据规则中的 fieldMappings，遍历原始数据，提取 sourceField 的值，经过可选的 transform
         处理后，赋值给 targetField，最终生成一个 结构统一、字段标准 的新对象。


   * 辅助功能:
       * JSON 解析与字段提取: 能够解析一个 JSON
         字符串或对象，并自动提取其中所有的字段路径，这在创建新规则时非常有用。
       * 字段建议: 可以比较源字段和目标字段的名称，并基于字符串相似度给出匹配建议，提高了配置效率。
       * 规则测试: 提供测试接口，可以用样本数据来验证一个映射规则是否能正确转换数据。




  📊 管理相关 API

  查看现有规则：

  - GET /api/v1/data-mapper - 分页查询所有规则
  - GET /api/v1/data-mapper/provider/{provider} - 按数据源查询
  - GET /api/v1/data-mapper/presets - 查看预设字段配置

  规则生命周期管理：

  - PATCH /api/v1/data-mapper/{id} - 更新规则
  - PATCH /api/v1/data-mapper/{id}/activate - 激活规则
  - PATCH /api/v1/data-mapper/{id}/deactivate - 停用规则
  - DELETE /api/v1/data-mapper/{id} - 删除规则

  🎯 典型创建流程

  步骤 1：分析数据源

  POST /api/v1/data-mapper/parse-json
  # 了解新数据源的字段结构

  步骤 2：获取智能建议

  POST /api/v1/data-mapper/field-suggestions
  # 获取字段映射建议，减少手工配置

  步骤 3：创建映射规则

  POST /api/v1/data-mapper
  # 基于分析结果和建议创建完整的映射规则

  步骤 4：测试验证

  POST /api/v1/data-mapper/test
  # 使用真实数据测试映射效果

  步骤 5：激活应用

  PATCH /api/v1/data-mapper/{id}/activate
  # 激活规则，开始在生产环境中使用
