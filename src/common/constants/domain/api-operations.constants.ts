/**
 * API操作常量
 * 🎯 Domain层 - API操作相关的业务领域专用常量
 * 🔧 统一API操作类型、数据类型、业务场景等重复字符串
 * 
 * 解决的重复问题：
 * - "get-stock-quote" API操作类型 (26次重复)
 * - "quote" 数据类型标识 (32次重复)
 * - "stream-stock-quote" 流式操作 (多次重复)
 * - 其他API操作类型的字符串硬编码
 */

import { CORE_VALUES } from '../foundation';

/**
 * API操作配置常量
 * 🎯 解决系统中大量重复的API操作类型字符串
 */
export const API_OPERATIONS = Object.freeze({
  /**
   * 股票数据操作类型
   * 🔥 解决股票相关API操作的字符串重复
   */
  STOCK_DATA: {
    // 基础查询操作
    GET_QUOTE: 'get-stock-quote',        // 获取股票报价 (26次重复)
    GET_INFO: 'get-stock-info',          // 获取股票基本信息
    GET_BASIC_INFO: 'get-stock-basic-info', // 获取股票基础信息
    GET_REALTIME: 'get-stock-realtime',  // 获取股票实时数据
    
    // 流式数据操作
    STREAM_QUOTE: 'stream-stock-quote',  // 流式股票报价
    STREAM_REALTIME: 'stream-stock-realtime', // 流式实时数据
    STREAM_PRICE: 'stream-stock-price',  // 流式价格数据
    
    // 批量操作
    BATCH_QUOTE: 'batch-stock-quote',    // 批量获取报价
    BATCH_INFO: 'batch-stock-info',      // 批量获取信息
    BATCH_SYMBOLS: 'batch-symbols-query', // 批量符号查询
  },
  
  /**
   * 指数数据操作类型
   * 🔧 统一指数相关API操作
   */
  INDEX_DATA: {
    GET_QUOTE: 'get-index-quote',        // 获取指数报价
    GET_INFO: 'get-index-info',          // 获取指数信息
    STREAM_QUOTE: 'stream-index-quote',  // 流式指数报价
    BATCH_QUOTE: 'batch-index-quote',    // 批量指数报价
  },
  
  /**
   * 数据类型标识
   * 🔥 解决 "quote" 等数据类型的32次重复
   */
  DATA_TYPES: {
    QUOTE: 'quote',                      // 报价数据 (32次重复)
    INFO: 'info',                        // 基本信息数据
    BASIC_INFO: 'basic-info',            // 基础信息数据
    REALTIME: 'realtime',                // 实时数据
    CHART: 'chart',                      // 图表数据
    NEWS: 'news',                        // 新闻数据
    FUNDAMENTAL: 'fundamental',          // 基本面数据
    TECHNICAL: 'technical',              // 技术分析数据
    HISTORICAL: 'historical',            // 历史数据
    INTRADAY: 'intraday',                // 日内数据
  },
  
  /**
   * 市场类型标识
   * 🔧 统一不同市场的标识符
   */
  MARKET_TYPES: {
    HK: 'hk',                           // 香港市场
    US: 'us',                           // 美国市场
    CN: 'cn',                           // 中国市场
    SG: 'sg',                           // 新加坡市场
    UK: 'uk',                           // 英国市场
    JP: 'jp',                           // 日本市场
  },
  
  /**
   * 数据获取方式
   * 🔧 统一数据获取模式标识
   */
  FETCH_MODES: {
    REST: 'rest',                       // REST API方式
    WEBSOCKET: 'websocket',             // WebSocket方式
    STREAM: 'stream',                   // 流式数据
    BATCH: 'batch',                     // 批量获取
    POLL: 'poll',                       // 轮询方式
    PUSH: 'push',                       // 推送方式
  },
  
  /**
   * 业务场景标识
   * 🔧 统一不同业务场景的操作类型
   */
  BUSINESS_SCENARIOS: {
    // 交易相关
    TRADING: 'trading',                 // 交易场景
    PORTFOLIO: 'portfolio',             // 投资组合
    WATCHLIST: 'watchlist',             // 观察列表
    ANALYSIS: 'analysis',               // 数据分析
    
    // 监控相关
    MONITORING: 'monitoring',           // 系统监控
    ALERTING: 'alerting',              // 告警通知
    REPORTING: 'reporting',            // 报告生成
    DASHBOARD: 'dashboard',            // 仪表盘
    
    // 研发相关
    TESTING: 'testing',                // 测试场景
    DEBUGGING: 'debugging',            // 调试场景
    DEVELOPMENT: 'development',        // 开发场景
    BENCHMARKING: 'benchmarking',      // 基准测试
  },
  
  /**
   * 操作优先级
   * 🔧 统一操作优先级标识
   */
  PRIORITIES: {
    REAL_TIME: 'real-time',            // 实时优先
    HIGH: 'high',                      // 高优先级
    NORMAL: 'normal',                  // 普通优先级
    LOW: 'low',                        // 低优先级
    BACKGROUND: 'background',          // 后台处理
    BATCH_LOW: 'batch-low',           // 批量低优先级
  },
  
  /**
   * 缓存策略标识
   * 🔧 统一缓存策略类型
   */
  CACHE_STRATEGIES: {
    STRONG_TIMELINESS: 'strong-timeliness',    // 强时效性
    WEAK_TIMELINESS: 'weak-timeliness',        // 弱时效性
    MARKET_AWARE: 'market-aware',              // 市场感知
    NO_CACHE: 'no-cache',                      // 不缓存
    FORCE_REFRESH: 'force-refresh',            // 强制刷新
    CACHE_FIRST: 'cache-first',                // 缓存优先
  }
} as const);

/**
 * API操作工具函数
 * 🛠️ 提供基于常量的API操作逻辑
 */
export class ApiOperationsUtil {
  /**
   * 根据数据类型获取推荐的API操作
   */
  static getRecommendedOperation(dataType: ApiDataType, market?: ApiMarketType): string {
    switch (dataType) {
      case 'quote':
        return market ? `get-${market}-stock-quote` : API_OPERATIONS.STOCK_DATA.GET_QUOTE;
      case 'info':
        return market ? `get-${market}-stock-info` : API_OPERATIONS.STOCK_DATA.GET_INFO;
      case 'realtime':
        return market ? `get-${market}-stock-realtime` : API_OPERATIONS.STOCK_DATA.GET_REALTIME;
      default:
        return API_OPERATIONS.STOCK_DATA.GET_QUOTE;
    }
  }
  
  /**
   * 判断是否为流式操作
   */
  static isStreamOperation(operation: string): boolean {
    return operation.startsWith('stream-');
  }
  
  /**
   * 判断是否为批量操作
   */
  static isBatchOperation(operation: string): boolean {
    return operation.startsWith('batch-');
  }
  
  /**
   * 根据业务场景获取推荐的获取方式
   */
  static getRecommendedFetchMode(scenario: ApiBusinessScenario): ApiFetchMode {
    switch (scenario) {
      case 'trading':
      case 'monitoring': 
        return 'stream';
      case 'analysis':
      case 'reporting':
        return 'batch';
      case 'testing':
      case 'debugging':
        return 'rest';
      default:
        return 'rest';
    }
  }
  
  /**
   * 根据操作类型获取推荐的缓存策略
   */
  static getRecommendedCacheStrategy(operation: string): ApiCacheStrategy {
    if (operation.includes('realtime') || operation.startsWith('stream-')) {
      return 'strong-timeliness';
    }
    if (operation.startsWith('batch-') || operation.includes('historical')) {
      return 'weak-timeliness';
    }
    if (operation.includes('quote') || operation.includes('price')) {
      return 'market-aware';
    }
    return 'normal';
  }
  
  /**
   * 构建操作标识符
   */
  static buildOperationId(dataType: ApiDataType, market: ApiMarketType, mode: ApiFetchMode): string {
    const modePrefix = mode === 'stream' ? 'stream' : mode === 'batch' ? 'batch' : 'get';
    return `${modePrefix}-${market}-stock-${dataType}`;
  }
  
  /**
   * 解析操作标识符
   */
  static parseOperationId(operationId: string): {
    mode: ApiFetchMode;
    market?: ApiMarketType;
    dataType: ApiDataType;
  } {
    const parts = operationId.split('-');
    const mode = parts[0] === 'stream' ? 'stream' : parts[0] === 'batch' ? 'batch' : 'rest';
    const market = parts[1] as ApiMarketType;
    const dataType = parts[parts.length - 1] as ApiDataType;
    
    return { mode, market, dataType };
  }
}

/**
 * 类型定义
 */
export type ApiDataType = 'quote' | 'info' | 'basic-info' | 'realtime' | 'chart' | 'news' | 'fundamental' | 'technical' | 'historical' | 'intraday';
export type ApiMarketType = 'hk' | 'us' | 'cn' | 'sg' | 'uk' | 'jp';
export type ApiFetchMode = 'rest' | 'websocket' | 'stream' | 'batch' | 'poll' | 'push';
export type ApiBusinessScenario = 'trading' | 'portfolio' | 'watchlist' | 'analysis' | 'monitoring' | 'alerting' | 'reporting' | 'dashboard' | 'testing' | 'debugging' | 'development' | 'benchmarking';
export type ApiPriority = 'real-time' | 'high' | 'normal' | 'low' | 'background' | 'batch-low';
export type ApiCacheStrategy = 'strong-timeliness' | 'weak-timeliness' | 'market-aware' | 'no-cache' | 'force-refresh' | 'cache-first' | 'normal';

export type ApiOperationsConstants = typeof API_OPERATIONS;
export type StockDataOperations = typeof API_OPERATIONS.STOCK_DATA;
export type IndexDataOperations = typeof API_OPERATIONS.INDEX_DATA;
export type DataTypes = typeof API_OPERATIONS.DATA_TYPES;
export type MarketTypes = typeof API_OPERATIONS.MARKET_TYPES;
export type FetchModes = typeof API_OPERATIONS.FETCH_MODES;
export type BusinessScenarios = typeof API_OPERATIONS.BUSINESS_SCENARIOS;
export type Priorities = typeof API_OPERATIONS.PRIORITIES;
export type CacheStrategies = typeof API_OPERATIONS.CACHE_STRATEGIES;