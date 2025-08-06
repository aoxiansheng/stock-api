/**
 * 自动初始化配置
 *
 * 定义应用启动时需要自动初始化的数据和配置
 *
 * 📋 配置说明：
 * - 系统启动时会根据这个配置自动初始化必要的数据
 * - 包括预设字段映射、示例数据等
 * - 可以通过环境变量覆盖默认配置
 */

export interface AutoInitConfig {
  /**
   * 🔧 主开关：是否启用自动初始化
   *
   * 作用：控制整个自动初始化功能的开关
   * - true: 启用自动初始化（默认）
   * - false: 完全禁用自动初始化
   *
   * 环境变量：AUTO_INIT_ENABLED
   * 使用场景：生产环境可能需要禁用自动初始化
   */
  enabled: boolean;

  /**
   * 📊 预设字段映射配置
   *
   * 作用：定义哪些预设字段映射需要自动初始化
   * 这些字段映射用于数据转换和标准化
   */
  presetFields: {
    /**
     * 🎯 股票报价字段映射
     *
     * 作用：初始化股票报价相关的字段映射规则
     * 包括：最新价、开盘价、收盘价、成交量等24个字段
     * 数据来源：LongPort API 的 secu_quote 响应
     *
     * 环境变量：AUTO_INIT_STOCK_QUOTE
     */
    stockQuote: boolean;

    /**
     * 🏢 股票基本信息字段映射
     *
     * 作用：初始化股票基本信息相关的字段映射规则
     * 包括：公司名称、交易所、货币、股本结构、财务指标等18个字段
     * 数据来源：LongPort API 的 secu_static_info 响应
     *
     * 环境变量：AUTO_INIT_STOCK_BASIC_INFO
     */
    stockBasicInfo: boolean;
  };

  /**
   * 📝 示例数据配置
   *
   * 作用：定义哪些示例数据需要自动初始化
   * 这些数据用于演示和测试
   */
  sampleData: {
    /**
     * 🔀 符号映射数据
     *
     * 作用：初始化股票代码映射规则的示例数据
     * 用途：不同数据源的股票代码格式转换
     *
     * 示例：
     * - 输入 "700.HK" → 输出 "00700.HK" (LongPort格式)
     * - 输入 "AAPL" → 输出 "AAPL.US" (标准化格式)
     *
     * 环境变量：AUTO_INIT_SYMBOL_MAPPINGS
     */
    symbolMappings: boolean;

    /**
     * 🧪 测试数据
     *
     * 作用：初始化用于测试的示例数据
     * 包括：模拟的股票数据、用户数据等
     *
     * 注意：生产环境通常应该禁用
     * 环境变量：AUTO_INIT_TEST_DATA
     */
    testData: boolean;
  };

  /**
   * ⚙️ 初始化选项配置
   *
   * 作用：控制初始化过程的行为和策略
   */
  options: {
    /**
     * ⏭️ 跳过已存在的数据
     *
     * 作用：如果数据已存在，是否跳过初始化
     * - true: 跳过已存在的数据（默认，幂等操作）
     * - false: 强制重新初始化，可能覆盖现有数据
     *
     * 使用场景：
     * - 开发环境可能需要设置为 false 来重置数据
     * - 生产环境建议保持 true 确保数据安全
     *
     * 环境变量：AUTO_INIT_SKIP_EXISTING
     */
    skipExisting: boolean;

    /**
     * 📝 日志级别
     *
     * 作用：控制自动初始化过程的日志输出级别
     *
     * 级别说明：
     * - debug: 详细的调试信息
     * - info: 一般信息（默认）
     * - warn: 警告信息
     * - error: 仅错误信息
     *
     * 环境变量：AUTO_INIT_LOG_LEVEL
     */
    logLevel: "debug" | "info" | "warn" | "error";

    /**
     * 🔄 重试次数
     *
     * 作用：初始化失败时的重试次数
     * 默认：3次
     *
     * 使用场景：
     * - 数据库连接不稳定时增加重试次数
     * - 网络环境良好时可以减少重试次数
     *
     * 环境变量：AUTO_INIT_RETRY_ATTEMPTS
     */
    retryAttempts: number;

    /**
     * ⏰ 重试延迟（毫秒）
     *
     * 作用：每次重试之间的延迟时间
     * 默认：1000ms (1秒)
     *
     * 使用场景：
     * - 避免频繁重试对系统造成压力
     * - 给外部服务恢复时间
     *
     * 环境变量：AUTO_INIT_RETRY_DELAY
     */
    retryDelay: number;
  };
}

/**
 * 📋 默认自动初始化配置
 *
 * 作用：定义系统的默认初始化行为
 * 说明：当没有设置环境变量时，系统将使用这些默认值
 *
 * 💡 推荐设置：
 * - 开发环境：使用默认配置，便于快速开发和测试
 * - 生产环境：通过环境变量覆盖，确保数据安全
 */
export const DEFAULT_AUTO_INIT_CONFIG: AutoInitConfig = {
  // 🔧 默认启用自动初始化
  enabled: true,

  // 📊 默认启用所有预设字段映射
  presetFields: {
    stockQuote: true, // 股票报价字段映射
    stockBasicInfo: true, // 股票基本信息字段映射
  },

  // 📝 示例数据配置
  sampleData: {
    symbolMappings: true, // 默认启用符号映射示例数据
    testData: false, // 默认不创建测试数据（避免污染生产环境）
  },

  // ⚙️ 初始化选项
  options: {
    skipExisting: true, // 默认跳过已存在的数据（幂等操作）
    logLevel: "info", // 默认日志级别：一般信息
    retryAttempts: 3, // 默认重试3次
    retryDelay: 1000, // 默认延迟1秒重试
  },
};

/**
 * 🌍 从环境变量获取自动初始化配置
 *
 * 作用：根据环境变量动态生成配置，支持不同环境的个性化设置
 *
 * 🔧 环境变量说明：
 * - 大部分配置默认为 true，设置为 "false" 时禁用
 * - testData 例外：默认为 false，设置为 "true" 时启用
 * - 数值类型配置：直接设置数字字符串
 *
 * 💡 使用示例：
 * ```bash
 * # 禁用自动初始化
 * export AUTO_INIT_ENABLED=false
 *
 * # 启用测试数据
 * export AUTO_INIT_TEST_DATA=true
 *
 * # 设置日志级别为调试
 * export AUTO_INIT_LOG_LEVEL=debug
 *
 * # 增加重试次数
 * export AUTO_INIT_RETRY_ATTEMPTS=5
 * ```
 */
export function getAutoInitConfig(): AutoInitConfig {
  return {
    /**
     * 🔧 主开关配置
     * 环境变量：AUTO_INIT_ENABLED
     * 逻辑：!== "false" 意味着默认启用，只有明确设置为 "false" 才禁用
     */
    enabled: process.env.AUTO_INIT_ENABLED !== "false",

    /**
     * 📊 预设字段映射配置
     */
    presetFields: {
      /**
       * 🎯 股票报价字段映射
       * 环境变量：AUTO_INIT_STOCK_QUOTE
       * 默认：启用（!== "false"）
       */
      stockQuote: process.env.AUTO_INIT_STOCK_QUOTE !== "false",

      /**
       * 🏢 股票基本信息字段映射
       * 环境变量：AUTO_INIT_STOCK_BASIC_INFO
       * 默认：启用（!== "false"）
       */
      stockBasicInfo: process.env.AUTO_INIT_STOCK_BASIC_INFO !== "false",
    },

    /**
     * 📝 示例数据配置
     */
    sampleData: {
      /**
       * 🔀 符号映射数据
       * 环境变量：AUTO_INIT_SYMBOL_MAPPINGS
       * 默认：启用（!== "false"）
       */
      symbolMappings: process.env.AUTO_INIT_SYMBOL_MAPPINGS !== "false",

      /**
       * 🧪 测试数据
       * 环境变量：AUTO_INIT_TEST_DATA
       * 默认：禁用（=== "true" 才启用）
       *
       * 注意：出于安全考虑，测试数据默认禁用
       */
      testData: process.env.AUTO_INIT_TEST_DATA === "true",
    },

    /**
     * ⚙️ 初始化选项配置
     */
    options: {
      /**
       * ⏭️ 跳过已存在的数据
       * 环境变量：AUTO_INIT_SKIP_EXISTING
       * 默认：启用（!== "false"），确保幂等性
       */
      skipExisting: process.env.AUTO_INIT_SKIP_EXISTING !== "false",

      /**
       * 📝 日志级别
       * 环境变量：AUTO_INIT_LOG_LEVEL
       * 默认：info
       * 可选值：debug, info, warn, error
       */
      logLevel: (process.env.AUTO_INIT_LOG_LEVEL as any) || "info",

      /**
       * 🔄 重试次数
       * 环境变量：AUTO_INIT_RETRY_ATTEMPTS
       * 默认：3
       * 范围：建议 1-10
       */
      retryAttempts: parseInt(process.env.AUTO_INIT_RETRY_ATTEMPTS || "3"),

      /**
       * ⏰ 重试延迟（毫秒）
       * 环境变量：AUTO_INIT_RETRY_DELAY
       * 默认：1000ms (1秒)
       * 范围：建议 100-10000ms
       */
      retryDelay: parseInt(process.env.AUTO_INIT_RETRY_DELAY || "1000"),
    },
  };
}

/**
 * 📊 预设字段数据定义
 *
 * 作用：定义系统启动时需要初始化的字段映射规则
 *
 * 🎯 字段映射的作用：
 * - 统一不同数据源的字段名称
 * - 提供字段转换和标准化规则
 * - 支持数据验证和类型转换
 * - 便于前端展示和API响应
 *
 * 📋 字段映射结构说明：
 * - source: 数据源中的原始字段路径（如：secu_quote[].last_done）
 * - target: 系统标准化后的字段名（如：lastPrice）
 * - desc: 字段的中文描述
 * - transform: 可选的字段转换规则
 *
 * 🔧 使用场景：
 * - 数据接收：将外部API数据转换为系统标准格式
 * - 数据存储：统一数据库字段名称
 * - API响应：提供一致的字段名称给前端
 */
export const PRESET_FIELD_DEFINITIONS = {
  /**
   * 🎯 股票报价字段映射配置
   *
   * 作用：定义股票实时报价数据的字段映射规则
   * 数据来源：LongPort API 的 secu_quote 响应
   *
   * 📊 包含的字段类型：
   * - 基础报价：最新价、开盘价、收盘价、最高价、最低价
   * - 交易数据：成交量、成交额、交易状态
   * - 盘前交易：盘前价格、成交量、时间戳
   * - 盘后交易：盘后价格、成交量、时间戳
   * - 夜盘交易：夜盘价格、成交量
   * - 计算字段：价格变动、涨跌幅（需要自定义函数）
   *
   * 🔧 配置说明：
   * - provider: "preset" 表示这是系统预设的映射规则
   * - transDataRuleListType: "quote_fields" 标识这是报价字段类型
   * - fields: 具体的字段映射规则数组
   */
  stockQuote: {
    name: "Stock Quote Preset Fields",
    description: "股票报价数据的标准字段映射配置",
    provider: "preset",
    transDataRuleListType: "quote_fields",
    fields: [
      // 主要报价字段
      { source: "secu_quote[].symbol", target: "symbol", desc: "标的代码" },
      { source: "secu_quote[].last_done", target: "lastPrice", desc: "最新价" },
      {
        source: "secu_quote[].prev_close",
        target: "previousClose",
        desc: "昨收价",
      },
      { source: "secu_quote[].open", target: "openPrice", desc: "开盘价" },
      { source: "secu_quote[].high", target: "highPrice", desc: "最高价" },
      { source: "secu_quote[].low", target: "lowPrice", desc: "最低价" },
      { source: "secu_quote[].timestamp", target: "timestamp", desc: "时间戳" },
      { source: "secu_quote[].volume", target: "volume", desc: "成交量" },
      { source: "secu_quote[].turnover", target: "turnover", desc: "成交额" },
      {
        source: "secu_quote[].trade_status",
        target: "tradeStatus",
        desc: "交易状态",
      },

      // 盘前交易字段
      {
        source: "secu_quote[].pre_market_quote.last_done",
        target: "preMarketPrice",
        desc: "盘前最新价",
      },
      {
        source: "secu_quote[].pre_market_quote.timestamp",
        target: "preMarketTimestamp",
        desc: "盘前时间戳",
      },
      {
        source: "secu_quote[].pre_market_quote.volume",
        target: "preMarketVolume",
        desc: "盘前成交量",
      },
      {
        source: "secu_quote[].pre_market_quote.turnover",
        target: "preMarketTurnover",
        desc: "盘前成交额",
      },
      {
        source: "secu_quote[].pre_market_quote.high",
        target: "preMarketHigh",
        desc: "盘前最高价",
      },
      {
        source: "secu_quote[].pre_market_quote.low",
        target: "preMarketLow",
        desc: "盘前最低价",
      },

      // 盘后交易字段
      {
        source: "secu_quote[].post_market_quote.last_done",
        target: "postMarketPrice",
        desc: "盘后最新价",
      },
      {
        source: "secu_quote[].post_market_quote.timestamp",
        target: "postMarketTimestamp",
        desc: "盘后时间戳",
      },
      {
        source: "secu_quote[].post_market_quote.volume",
        target: "postMarketVolume",
        desc: "盘后成交量",
      },
      {
        source: "secu_quote[].post_market_quote.turnover",
        target: "postMarketTurnover",
        desc: "盘后成交额",
      },

      // 夜盘交易字段
      {
        source: "secu_quote[].overnight_quote.last_done",
        target: "overnightPrice",
        desc: "夜盘最新价",
      },
      {
        source: "secu_quote[].overnight_quote.volume",
        target: "overnightVolume",
        desc: "夜盘成交量",
      },

      // 计算字段
      {
        source: "secu_quote[].last_done",
        target: "priceChange",
        desc: "价格变动",
        transform: { type: "custom", customFunction: "calculatePriceChange" },
      },
      {
        source: "secu_quote[].last_done",
        target: "priceChangePercent",
        desc: "涨跌幅",
        transform: {
          type: "custom",
          customFunction: "calculatePriceChangePercent",
        },
      },
    ],
  },

  /**
   * 🏢 股票基本信息字段映射配置
   *
   * 作用：定义股票基本信息数据的字段映射规则
   * 数据来源：LongPort API 的 secu_static_info 响应
   *
   * 📊 包含的字段类型：
   * - 基础信息：股票代码、公司名称（中英文）、交易所、货币
   * - 交易信息：每手股数、交易单位
   * - 股本结构：总股本、流通股本、港股股本
   * - 财务指标：每股盈利(EPS)、每股净资产(BPS)、股息率
   * - 标准化字段：默认公司名称、国际化显示名称
   * - 计算字段：市值、P/E比率（需要自定义函数）
   *
   * 🔧 配置说明：
   * - provider: "preset" 表示这是系统预设的映射规则
   * - transDataRuleListType: "basic_info_fields" 标识这是基本信息字段类型
   * - fields: 具体的字段映射规则数组
   *
   * 💡 应用场景：
   * - 股票详情页面显示
   * - 财务分析和计算
   * - 股票筛选和搜索
   */
  stockBasicInfo: {
    name: "Stock Basic Info Preset Fields",
    description: "股票基本信息数据的标准字段映射配置",
    provider: "preset",
    transDataRuleListType: "basic_info_fields",
    fields: [
      // 基础信息字段
      {
        source: "secu_static_info[].symbol",
        target: "symbol",
        desc: "标的代码",
      },
      {
        source: "secu_static_info[].name_cn",
        target: "companyNameCN",
        desc: "公司中文名称",
      },
      {
        source: "secu_static_info[].name_en",
        target: "companyNameEN",
        desc: "公司英文名称",
      },
      {
        source: "secu_static_info[].name_hk",
        target: "companyNameHK",
        desc: "公司繁体中文名称",
      },
      {
        source: "secu_static_info[].exchange",
        target: "exchange",
        desc: "交易所",
      },
      {
        source: "secu_static_info[].currency",
        target: "currency",
        desc: "交易币种",
      },
      {
        source: "secu_static_info[].lot_size",
        target: "lotSize",
        desc: "每手股数",
      },

      // 股本结构字段
      {
        source: "secu_static_info[].total_shares",
        target: "totalShares",
        desc: "总股本",
      },
      {
        source: "secu_static_info[].circulating_shares",
        target: "circulatingShares",
        desc: "流通股本",
      },
      {
        source: "secu_static_info[].hk_shares",
        target: "hkShares",
        desc: "港股股本 (仅港股)",
      },

      // 财务指标字段
      {
        source: "secu_static_info[].eps",
        target: "earningsPerShare",
        desc: "每股盈利 (EPS)",
      },
      {
        source: "secu_static_info[].eps_ttm",
        target: "earningsPerShareTTM",
        desc: "每股盈利 TTM",
      },
      {
        source: "secu_static_info[].bps",
        target: "bookValuePerShare",
        desc: "每股净资产 (BPS)",
      },
      {
        source: "secu_static_info[].dividend_yield",
        target: "dividendYield",
        desc: "股息率",
      },

      // 标准化字段
      {
        source: "secu_static_info[].name_cn",
        target: "companyName",
        desc: "默认公司名称",
      },
      {
        source: "secu_static_info[].name_en",
        target: "companyDisplayName",
        desc: "国际化显示名称",
      },

      // 计算字段
      {
        source: "secu_static_info[].total_shares",
        target: "marketCapitalization",
        desc: "市值",
        transform: { type: "custom", customFunction: "calculateMarketCap" },
      },
      {
        source: "secu_static_info[].eps_ttm",
        target: "peRatio",
        desc: "P/E 比率",
        transform: { type: "custom", customFunction: "calculatePERatio" },
      },
    ],
  },
};

/**
 * 🔀 示例符号映射数据
 *
 * 作用：定义不同数据源的股票代码格式转换规则
 *
 * 🎯 符号映射的重要性：
 * - 不同的数据源使用不同的股票代码格式
 * - 需要统一转换为系统标准格式
 * - 支持用户输入的多种格式识别
 *
 * 📋 数据源格式差异示例：
 * - 腾讯控股 (700)：
 *   * 用户输入：700, 700.HK, 00700.HK
 *   * LongPort：00700.HK
 *   * Futu：HK.00700
 *   * 系统标准：700.HK
 *
 * 🔧 映射规则结构：
 * - dataSourceName: 数据源名称（如：longport, futu-demo）
 * - description: 数据源描述
 * - version: 版本号（便于升级管理）
 * - isActive: 是否启用该数据源
 * - SymbolMappingRule: 具体的映射规则数组
 *   * standardSymbol: 输入的符号格式
 *   * sdkSymbol: 该数据源需要的格式
 *   * market: 市场标识（HK, US, SZ, SH）
 *   * symbolType: 证券类型（stock, etf, index）
 *   * description: 证券描述
 *
 * 💡 使用场景：
 * - 用户查询时的符号识别和转换
 * - 调用不同数据源API时的格式适配
 * - 数据标准化和统一存储
 */
export const SAMPLE_SYMBOL_MAPPINGS = [
  /**
   * 🔌 LongPort 数据源映射配置
   *
   * 作用：定义 LongPort API 的股票代码格式转换
   *
   * 📊 LongPort 格式特点：
   * - 港股：补齐5位数字，如 700 → 00700.HK
   * - 美股：直接使用，如 AAPL → AAPL.US
   * - A股：保持原格式，如 000001 → 000001.SZ
   *
   * 🔧 映射规则说明：
   * - 支持多种输入格式映射到同一输出
   * - 涵盖港股、美股、深圳A股、上海A股
   */
  {
    dataSourceName: "longport",
    description: "LongPort 符号映射配置",
    version: "1.0.0",
    isActive: true,
    SymbolMappingRule: [
      {
        standardSymbol: "00700.HK",
        sdkSymbol: "700.HK",
        market: "HK",
        symbolType: "stock",
        description: "腾讯控股",
      },
      {
        standardSymbol: "700",
        sdkSymbol: "700.HK",
        market: "HK",
        symbolType: "stock",
        description: "腾讯控股",
      },
      {
        standardSymbol: "AAPL",
        sdkSymbol: "AAPL.US",
        market: "US",
        symbolType: "stock",
        description: "苹果公司",
      },
      {
        standardSymbol: "000001",
        sdkSymbol: "000001.SZ",
        market: "SZ",
        symbolType: "stock",
        description: "平安银行",
      },
      {
        standardSymbol: "600036",
        sdkSymbol: "600036.SH",
        market: "SH",
        symbolType: "stock",
        description: "招商银行",
      },
    ],
  },
  /**
   * 🔌 Futu 数据源映射配置（示例）
   *
   * 作用：定义 Futu API 的股票代码格式转换（演示用）
   *
   * 📊 Futu 格式特点：
   * - 使用市场前缀格式，如 HK.00700, US.AAPL
   * - 港股：HK.前缀 + 5位数字
   * - 美股：US.前缀 + 股票代码
   *
   * 🔧 映射规则说明：
   * - 这是一个示例配置，展示不同数据源的格式差异
   * - 实际集成时需要根据 Futu API 文档调整
   * - 主要用于演示多数据源支持能力
   */
  {
    dataSourceName: "futu-demo",
    description: "示例 Futu 符号映射配置",
    version: "1.0.0",
    isActive: true,
    SymbolMappingRule: [
      {
        standardSymbol: "700.HK",
        sdkSymbol: "HK.00700",
        market: "HK",
        symbolType: "stock",
        description: "腾讯控股",
      },
      {
        standardSymbol: "AAPL.US",
        sdkSymbol: "US.AAPL",
        market: "US",
        symbolType: "stock",
        description: "苹果公司",
      },
    ],
  },
];

/**
 * 📚 配置文件使用指南
 *
 * 🚀 快速开始：
 * 1. 默认配置：直接运行 `bun run dev`，使用默认配置
 * 2. 自定义配置：设置相应的环境变量
 * 3. 禁用初始化：设置 `AUTO_INIT_ENABLED=false`
 *
 * 🔧 常用环境变量设置：
 * ```bash
 * # 开发环境 - 启用所有功能
 * export AUTO_INIT_ENABLED=true
 * export AUTO_INIT_SYMBOL_MAPPINGS=true
 * export AUTO_INIT_LOG_LEVEL=debug
 *
 * # 生产环境 - 保守配置
 * export AUTO_INIT_ENABLED=true
 * export AUTO_INIT_TEST_DATA=false
 * export AUTO_INIT_SKIP_EXISTING=true
 * export AUTO_INIT_LOG_LEVEL=info
 *
 * # 测试环境 - 重置数据
 * export AUTO_INIT_SKIP_EXISTING=false
 * export AUTO_INIT_TEST_DATA=true
 * ```
 *
 * 🎯 核心概念：
 * - 字段映射：统一不同数据源的字段格式
 * - 符号映射：转换不同数据源的股票代码格式
 * - 预设数据：系统启动时自动初始化的基础数据
 * - 环境变量：支持不同环境的个性化配置
 *
 * 📋 维护建议：
 * - 新增数据源时，在 SAMPLE_SYMBOL_MAPPINGS 中添加相应配置
 * - 修改字段映射时，更新 PRESET_FIELD_DEFINITIONS 中的相关配置
 * - 生产环境部署前，确认环境变量设置正确
 * - 定期检查和更新映射规则，确保数据准确性
 */
