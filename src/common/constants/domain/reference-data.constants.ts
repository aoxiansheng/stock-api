/**
 * 参考数据常量
 * 🎯 Domain层 - 测试和参考数据专用常量
 * 📋 统一测试时间戳、示例股票代码、提供商标识等硬编码字符串
 *
 * 解决的重复问题：
 * - "2024-01-01T12:00:00.000Z" 测试时间戳 (73次重复)
 * - "700.HK" 测试股票代码 (23次重复)
 * - "longport" 提供商标识符 (65次重复)
 * - 各种示例和测试数据的硬编码问题
 */

/**
 * 参考数据配置常量
 * 🎯 解决系统中大量硬编码的测试和示例数据
 */
export const REFERENCE_DATA = Object.freeze({
  /**
   * 测试时间戳配置
   */
  TEST_TIMESTAMPS: {
    // 标准参考时间 - 用于示例和测试
    REFERENCE_DATE: "2024-01-01T12:00:00.000Z", // 2024年开始中午时间 (73次重复)

    // 年度时间范围
    YEAR_START: "2024-01-01T00:00:00.000Z", // 年度开始
    YEAR_END: "2024-12-31T23:59:59.999Z", // 年度结束

    // 季度时间范围
    Q1_START: "2024-01-01T00:00:00.000Z", // Q1开始
    Q1_END: "2024-03-31T23:59:59.999Z", // Q1结束
    Q2_START: "2024-04-01T00:00:00.000Z", // Q2开始
    Q2_END: "2024-06-30T23:59:59.999Z", // Q2结束
    Q3_START: "2024-07-01T00:00:00.000Z", // Q3开始
    Q3_END: "2024-09-30T23:59:59.999Z", // Q3结束
    Q4_START: "2024-10-01T00:00:00.000Z", // Q4开始
    Q4_END: "2024-12-31T23:59:59.999Z", // Q4结束

    // 特殊测试时间点

    // 历史时间点

    // 未来时间点
  },

  /**
   * 示例股票代码配置
   * 🔥 解决各种测试股票代码的重复硬编码
   */
  SAMPLE_SYMBOLS: {
    // 香港市场
    HK_TENCENT: "700.HK", // 腾讯控股 - 香港市场示例 (23次重复)
    HK_ALIBABA: "9988.HK", // 阿里巴巴 - 香港市场
    HK_MEITUAN: "3690.HK", // 美团 - 香港市场
    HK_XIAOMI: "1810.HK", // 小米集团 - 香港市场
    HK_BYD: "1211.HK", // 比亚迪 - 香港市场

    // 美国市场
    US_APPLE: "AAPL.US", // 苹果 - 美国市场示例
    US_MICROSOFT: "MSFT.US", // 微软 - 美国市场
    US_GOOGLE: "GOOGL.US", // 谷歌 - 美国市场
    US_AMAZON: "AMZN.US", // 亚马逊 - 美国市场
    US_TESLA: "TSLA.US", // 特斯拉 - 美国市场

    // 中国A股市场
    CN_PING_AN: "000001.SZ", // 平安银行 - 深圳市场示例
    CN_KWEICHOW: "600519.SH", // 贵州茅台 - 上海市场
    CN_TENCENT_MUSIC: "000665.SZ", // 腾讯音乐 - 深圳市场
    CN_BYD_A: "002594.SZ", // 比亚迪A股 - 深圳市场
    CN_ALIBABA_SW: "688688.SH", // 阿里软件 - 上海科创板

    // 特殊格式测试
  },

  /**
   * 数据提供商标识配置
   * 🔥 解决 "longport" 的65次重复和其他提供商标识
   */
  PROVIDER_IDS: {
    // 主要数据提供商
    LONGPORT: "longport", // 长桥证券 - 主要提供商 (65次重复)
    LONGPORT_SG: "longport-sg", // 长桥新加坡 - 区域提供商
    LONGPORT_HK: "longport-hk", // 长桥香港
    LONGPORT_US: "longport-us", // 长桥美国

    // 其他提供商

    // 测试提供商
  },

  /**
   * 测试用户和账户配置
   * 🔥 统一测试账户和用户数据
   */
  TEST_ACCOUNTS: {
    // 测试用户
    ADMIN_USER: {
      id: "test-admin-001",
      username: "test-admin",
      email: "test-admin@example.com",
      role: "admin",
    },

    DEVELOPER_USER: {
      id: "test-dev-001",
      username: "test-developer",
      email: "test-dev@example.com",
      role: "developer",
    },

    REGULAR_USER: {
      id: "test-user-001",
      username: "test-user",
      email: "test-user@example.com",
      role: "user",
    },

    // 测试API密钥
    TEST_API_KEYS: {},
  },

  /**
   * 测试数据集合配置
   * 🔥 统一各种测试场景的数据
   */
  TEST_DATASETS: {
    // 股票价格测试数据
    SAMPLE_PRICES: {
      TENCENT_PRICE: 350.5,
      APPLE_PRICE: 182.3,
      TESLA_PRICE: 245.75,
    },

    // 交易量测试数据
    SAMPLE_VOLUMES: {
      LOW_VOLUME: 1000,
      NORMAL_VOLUME: 10000,
      HIGH_VOLUME: 100000,
    },

    // 市值测试数据
    SAMPLE_MARKET_CAPS: {
      SMALL_CAP: 2000000000,
      MID_CAP: 10000000000,
      LARGE_CAP: 100000000000,
    },
  },

  /**
   * 测试环境配置
   * 🔥 统一测试环境相关的配置数据
   */
  TEST_ENVIRONMENTS: {
    // 数据库配置
    TEST_DB: {
      host: "localhost",
      port: 27017,
      database: "test_stock_data",
      collection: "test_collection",
    },

    // 缓存配置
    TEST_REDIS: {
      host: "localhost",
      port: 6379,
      db: 1, // 使用db 1作为测试数据库
      keyPrefix: "test:",
    },

    // API配置
    TEST_API: {
      baseUrl: "http://localhost:3000",
      testEndpoint: "/api/v1/test",
      healthEndpoint: "/health",
    },
  },

  /**
   * 错误和异常测试数据
   * 🔥 统一错误处理测试场景
   */
  ERROR_SCENARIOS: {
    // 网络错误
    // 数据错误
    // 认证错误
    // 限制错误
  },
} as const);


/**
 * 类型定义
 */
export type ReferenceMarket = "HK" | "US" | "CN";
export type Quarter = 1 | 2 | 3 | 4;
export type TestUser = typeof REFERENCE_DATA.TEST_ACCOUNTS.ADMIN_USER;

export type ReferenceDataConstants = typeof REFERENCE_DATA;
export type TestTimestamps = typeof REFERENCE_DATA.TEST_TIMESTAMPS;
export type SampleSymbols = typeof REFERENCE_DATA.SAMPLE_SYMBOLS;
export type ProviderIds = typeof REFERENCE_DATA.PROVIDER_IDS;
export type TestAccounts = typeof REFERENCE_DATA.TEST_ACCOUNTS;
export type TestDatasets = typeof REFERENCE_DATA.TEST_DATASETS;
export type ErrorScenarios = typeof REFERENCE_DATA.ERROR_SCENARIOS;
