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

// 📊 预设字段映射配置已迁移到智能映射系统
// 现在使用 PresetTemplatesService 和 DataSourceTemplate 进行管理
// 详见：src/core/data-mapper/services/preset-templates.service.ts

// 🔀 符号映射数据配置已迁移到符号映射器
// 现在使用 SymbolMapper 组件进行管理
// 详见：src/core/public/symbol-mapper/

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
