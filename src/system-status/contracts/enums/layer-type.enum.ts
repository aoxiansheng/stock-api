/**
 * 系统状态组件层类型枚举
 * 用于标识三层架构中的不同层级
 */

export enum LayerType {
  /**
   * 数据收集层
   * 职责：纯数据收集，不包含任何计算逻辑
   */
  COLLECTOR = 'collector',

  /**
   * 数据分析层  
   * 职责：所有计算和分析逻辑，统一缓存管理，事件发射中心
   */
  ANALYZER = 'analyzer',

  /**
   * 数据展示层
   * 职责：只负责HTTP路由，参数验证，响应格式化
   */
  PRESENTER = 'presenter'
}

/**
 * 层间操作类型枚举
 */
export enum LayerOperationType {
  /**
   * 数据收集操作
   */
  DATA_COLLECTION = 'data_collection',

  /**
   * 数据分析操作
   */
  DATA_ANALYSIS = 'data_analysis',

  /**
   * 数据展示操作
   */
  DATA_PRESENTATION = 'data_presentation',

  /**
   * 跨层数据传输
   */
  CROSS_LAYER_TRANSFER = 'cross_layer_transfer',

  /**
   * 层间缓存操作
   */
  LAYER_CACHE_OPERATION = 'layer_cache_operation'
}

/**
 * 层健康状态枚举
 */
export enum LayerHealthStatus {
  /**
   * 健康状态
   */
  HEALTHY = 'healthy',

  /**
   * 警告状态
   */
  WARNING = 'warning',

  /**
   * 严重状态
   */
  CRITICAL = 'critical',

  /**
   * 未知状态
   */
  UNKNOWN = 'unknown'
}