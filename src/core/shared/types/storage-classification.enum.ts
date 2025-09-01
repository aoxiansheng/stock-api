/**
 * 统一的存储分类枚举 (Core内部共享)
 * 
 * 此枚举整合了Core组件内的重复定义：
 * - /src/core/shared/types/field-naming.types.ts (19个值，完整)
 * - /src/core/04-storage/storage/enums/storage-type.enum.ts (11个值，不完整)
 * 
 * 设计原则：
 * - 🔒 Core内部封装：仅供Core内7个组件使用
 * - 🎯 单一数据源：解决Core内部重复定义问题  
 * - 📍 问题本地化：在问题发生的同一层级解决
 * - 🏗️ 架构一致性：与field-naming.types.ts保持同级
 * 
 * 使用范围：
 * - ✅ core/01-entry (receiver, query)
 * - ✅ core/04-storage (storage services, DTOs)
 * - ✅ core/shared (field-mapping service)
 * - ❌ 外部模块 (alert, auth, cache, monitoring, providers)
 */
export enum StorageClassification {
  // 股票相关数据类型
  STOCK_QUOTE = "stock_quote",
  STOCK_CANDLE = "stock_candle", 
  STOCK_TICK = "stock_tick",
  STOCK_BASIC_INFO = "stock_basic_info",
  STOCK_LOGO = "stock_logo",
  STOCK_NEWS = "stock_news",
  
  // 财务数据
  FINANCIAL_STATEMENT = "financial_statement",
  
  // 指数数据
  INDEX_QUOTE = "index_quote",
  
  // 市场数据
  MARKET_NEWS = "market_news",
  MARKET_STATUS = "market_status",
  TRADING_DAYS = "trading_days",
  
  // 交易相关
  TRADING_ORDER = "trading_order",
  USER_PORTFOLIO = "user_portfolio",
  
  // 加密货币数据类型
  CRYPTO_QUOTE = "crypto_quote",
  CRYPTO_BASIC_INFO = "crypto_basic_info",
  CRYPTO_LOGO = "crypto_logo", 
  CRYPTO_NEWS = "crypto_news",
  
  // 系统通用
  GENERAL = "general",
  GLOBAL_STATE = "global_state"
}

/**
 * 存储分类工具类 (Core内部共享)
 * 提供Core组件内存储分类的业务逻辑方法
 */
export class StorageClassificationUtils {
  /**
   * 获取股票相关的存储分类
   */
  static getStockRelatedTypes(): StorageClassification[] {
    return [
      StorageClassification.STOCK_QUOTE,
      StorageClassification.STOCK_CANDLE,
      StorageClassification.STOCK_TICK,
      StorageClassification.STOCK_BASIC_INFO,
      StorageClassification.STOCK_LOGO,
      StorageClassification.STOCK_NEWS
    ];
  }

  /**
   * 获取加密货币相关的存储分类
   */
  static getCryptoRelatedTypes(): StorageClassification[] {
    return [
      StorageClassification.CRYPTO_QUOTE,
      StorageClassification.CRYPTO_BASIC_INFO,
      StorageClassification.CRYPTO_LOGO,
      StorageClassification.CRYPTO_NEWS
    ];
  }

  /**
   * 获取实时数据相关的存储分类
   */
  static getRealTimeTypes(): StorageClassification[] {
    return [
      StorageClassification.STOCK_QUOTE,
      StorageClassification.STOCK_TICK,
      StorageClassification.INDEX_QUOTE,
      StorageClassification.CRYPTO_QUOTE,
      StorageClassification.MARKET_STATUS
    ];
  }

  /**
   * 检查是否为实时数据类型
   */
  static isRealTimeType(type: StorageClassification): boolean {
    return this.getRealTimeTypes().includes(type);
  }

  /**
   * 检查是否为股票相关类型
   */
  static isStockRelatedType(type: StorageClassification): boolean {
    return this.getStockRelatedTypes().includes(type);
  }

  /**
   * 检查是否为加密货币相关类型
   */
  static isCryptoRelatedType(type: StorageClassification): boolean {
    return this.getCryptoRelatedTypes().includes(type);
  }

  /**
   * 获取所有存储分类类型（用于验证完整性）
   */
  static getAllTypes(): StorageClassification[] {
    return Object.values(StorageClassification);
  }

  /**
   * 验证存储分类是否有效
   */
  static isValidType(type: string): type is StorageClassification {
    return Object.values(StorageClassification).includes(type as StorageClassification);
  }

  /**
   * 根据业务类型获取默认的存储分类
   */
  static getDefaultByDataType(dataType: 'stock' | 'crypto' | 'index' | 'market'): StorageClassification {
    switch (dataType) {
      case 'stock':
        return StorageClassification.STOCK_QUOTE;
      case 'crypto':
        return StorageClassification.CRYPTO_QUOTE;
      case 'index':
        return StorageClassification.INDEX_QUOTE;
      case 'market':
        return StorageClassification.MARKET_STATUS;
      default:
        return StorageClassification.GENERAL;
    }
  }
}