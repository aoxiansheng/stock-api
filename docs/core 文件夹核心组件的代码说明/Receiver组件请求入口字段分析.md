Receiver组件请求入口字段分析

  主要请求DTO：DataRequestDto

  1. 必填字段

  symbols (股票代码列表)

  - 类型: string[]
  - 验证规则:
    - 必须是非空数组
    - 最大100个股票代码 (MAX_SYMBOLS_COUNT: 100)
    - 每个代码最长20个字符 (MAX_SYMBOL_LENGTH: 20)
    - 格式正则验证:
  /^(\d{1,6}\.HK|[A-Z]{1,6}\.HK|\d{6}\.(SZ|SH)|[A-Z]{1,5}\.US|[A-Z]{2,6}\/[A-Z]{2,6})$/
  - 示例: ["700.HK", "AAPL.US", "000001.SZ"]
  - 支持格式:
    - 港股: 700.HK, HSBC.HK (数字或字母 + .HK)
    - 美股: AAPL.US (1-5位字母 + .US)
    - 深圳: 000001.SZ (6位数字 + .SZ，前缀00/30)
    - 上海: 600000.SH (6位数字 + .SH，前缀60/68)
    - 加密货币: BTC/USDT (币种对格式)

  capabilityType (数据类型)

  - 类型: string
  - 必填: 是
  - 支持的数据类型（统一使用get-前缀格式）:
    - "get-stock-quote"           // 实时行情
    - "get-stock-basic-info"      // 基本信息
    - "get-index-quote"           // 指数行情
    - "get-market-status"         // 市场状态
    - "get-trading-days"          // 交易日历
    - "get-global-state"          // 全球状态
    - "get-crypto-quote"          // 加密货币行情
    - "get-crypto-basic-info"     // 加密货币基本信息
    - "get-stock-logo"            // 股票Logo
    - "get-crypto-logo"           // 加密货币Logo
    - "get-stock-news"            // 股票新闻
    - "get-crypto-news"           // 加密货币新闻

  2. 可选字段

  options (请求选项) - RequestOptionsDto

  - 类型: object (可选)
  - 子字段:

  preferredProvider (首选提供商)

  - 类型: string (可选)
  - 描述: 指定首选的数据提供商
  - 示例: "longport"

  realtime (实时数据要求)

  - 类型: boolean (可选)
  - 默认值: false
  - 描述: 是否要求获取实时数据
  - 示例: true

  fields (返回字段)

  - 类型: string[] (可选)
  - 描述: 指定需要返回的特定字段
  - 示例: ["lastPrice", "volume", "change"]

  market (市场代码)

  - 类型: string (可选)
  - 描述: 明确指定市场代码
  - 示例: "HK"

  完整请求示例：

  {
    "symbols": ["700.HK", "AAPL.US", "000001.SZ"],
    "capabilityType": "get-stock-quote",
    "options": {
      "preferredProvider": "longport",
      "realtime": true,
      "fields": ["lastPrice", "volume", "change", "changePercent"],
      "market": "HK"
    }
  }

  验证规则汇总

  | 字段                        | 类型       | 必填  | 最大长度/数量 | 验证规则    |
  |---------------------------|----------|-----|---------|---------|
  | symbols                   | string[] | ✅   | 100个    | 正则格式验证  |
  | symbols[i]                | string   | ✅   | 20字符    | 非空，格式匹配 |
  | capabilityType                  | string   | ✅   | 50字符    | 枚举值验证   |
  | options.preferredProvider | string   | ❌   | 50字符    | 字符串类型   |
  | options.realtime          | boolean  | ❌   | -       | 布尔类型    |
  | options.fields            | string[] | ❌   | 50个     | 字符串数组   |
  | options.market            | string   | ❌   | 10字符    | 大写字母格式  |

  性能限制

  - 最大股票代码数量: 100个/请求
  - 单个代码最大长度: 20个字符
  - 请求超时时间: 30秒
  - 慢请求阈值: 1秒
  - 最大并发请求: 10个

  认证要求

  - 认证方式: API Key认证
  - 必需头部:
    - X-App-Key: 应用密钥
    - X-Access-Token: 访问令牌
  - 权限要求: Permission.DATA_READ
