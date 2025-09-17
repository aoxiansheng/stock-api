/**
 * Alert模块缓存键管理工具类
 * 🎯 集中管理Alert模块的所有缓存键生成逻辑
 * 📊 提供类型安全的缓存键命名和模式匹配
 *
 * @description 替代AlertCacheService中分散的键生成方法，提供统一管理
 * @author Claude Code Assistant
 * @date 2025-09-17
 */

/**
 * Alert缓存键类型枚举
 */
export enum AlertCacheKeyType {
  ACTIVE_ALERT = "active",
  COOLDOWN = "cooldown", 
  TIMESERIES = "timeseries",
  STATS = "stats",
  BATCH_OPERATION = "batch"
}

/**
 * Alert缓存键配置接口
 */
export interface AlertCacheKeyConfig {
  readonly activeAlertPrefix: string;
  readonly cooldownPrefix: string;
  readonly timeseriesPrefix: string;
  readonly statsPrefix: string;
  readonly batchPrefix: string;
}

/**
 * 默认缓存键前缀配置
 */
const DEFAULT_KEY_CONFIG: AlertCacheKeyConfig = {
  activeAlertPrefix: "alert:active",
  cooldownPrefix: "alert:cooldown",
  timeseriesPrefix: "alert:timeseries",
  statsPrefix: "alert:stats",
  batchPrefix: "alert:batch"
} as const;

/**
 * Alert缓存键管理工具类
 * 🎯 提供所有Alert相关缓存键的生成、解析和模式匹配功能
 */
export class AlertCacheKeys {
  private readonly config: AlertCacheKeyConfig;

  constructor(config?: Partial<AlertCacheKeyConfig>) {
    this.config = { ...DEFAULT_KEY_CONFIG, ...config };
  }

  // =================================
  // 基础键生成方法
  // =================================

  /**
   * 生成活跃告警缓存键
   * @param ruleId 规则ID
   * @returns 缓存键
   */
  activeAlert(ruleId: string): string {
    return `${this.config.activeAlertPrefix}:${ruleId}`;
  }

  /**
   * 生成冷却期缓存键
   * @param ruleId 规则ID
   * @returns 缓存键
   */
  cooldown(ruleId: string): string {
    return `${this.config.cooldownPrefix}:${ruleId}`;
  }

  /**
   * 生成时序数据缓存键
   * @param ruleId 规则ID
   * @returns 缓存键
   */
  timeseries(ruleId: string): string {
    return `${this.config.timeseriesPrefix}:${ruleId}`;
  }

  /**
   * 生成统计数据缓存键
   * @param type 统计类型
   * @returns 缓存键
   */
  stats(type: string = "general"): string {
    return `${this.config.statsPrefix}:${type}`;
  }

  /**
   * 生成批量操作缓存键
   * @param operationId 操作ID
   * @returns 缓存键
   */
  batchOperation(operationId: string): string {
    return `${this.config.batchPrefix}:${operationId}`;
  }

  // =================================
  // 模式匹配方法
  // =================================

  /**
   * 获取活跃告警键的匹配模式
   * @returns 匹配模式
   */
  activeAlertPattern(): string {
    return `${this.config.activeAlertPrefix}:*`;
  }

  /**
   * 获取冷却期键的匹配模式
   * @returns 匹配模式
   */
  cooldownPattern(): string {
    return `${this.config.cooldownPrefix}:*`;
  }

  /**
   * 获取时序数据键的匹配模式
   * @returns 匹配模式
   */
  timeseriesPattern(): string {
    return `${this.config.timeseriesPrefix}:*`;
  }

  /**
   * 获取所有Alert相关键的匹配模式
   * @returns 匹配模式
   */
  allAlertKeysPattern(): string {
    return "alert:*";
  }

  /**
   * 根据键类型获取匹配模式
   * @param keyType 键类型
   * @returns 匹配模式
   */
  getPatternByType(keyType: AlertCacheKeyType): string {
    switch (keyType) {
      case AlertCacheKeyType.ACTIVE_ALERT:
        return this.activeAlertPattern();
      case AlertCacheKeyType.COOLDOWN:
        return this.cooldownPattern();
      case AlertCacheKeyType.TIMESERIES:
        return this.timeseriesPattern();
      case AlertCacheKeyType.STATS:
        return `${this.config.statsPrefix}:*`;
      case AlertCacheKeyType.BATCH_OPERATION:
        return `${this.config.batchPrefix}:*`;
      default:
        return this.allAlertKeysPattern();
    }
  }

  // =================================
  // 键解析方法
  // =================================

  /**
   * 从缓存键中提取规则ID
   * @param cacheKey 缓存键
   * @returns 规则ID，如果解析失败返回null
   */
  extractRuleId(cacheKey: string): string | null {
    // 尝试从不同类型的键中提取规则ID
    const patterns = [
      new RegExp(`^${this.config.activeAlertPrefix}:(.+)$`),
      new RegExp(`^${this.config.cooldownPrefix}:(.+)$`),
      new RegExp(`^${this.config.timeseriesPrefix}:(.+)$`)
    ];

    for (const pattern of patterns) {
      const match = cacheKey.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * 检查键是否属于指定类型
   * @param cacheKey 缓存键
   * @param keyType 键类型
   * @returns 是否匹配
   */
  isKeyOfType(cacheKey: string, keyType: AlertCacheKeyType): boolean {
    const pattern = this.getPatternByType(keyType);
    // 将通配符模式转换为正则表达式
    const regex = new RegExp(`^${pattern.replace(/\*/g, ".*")}$`);
    return regex.test(cacheKey);
  }

  /**
   * 获取键的类型
   * @param cacheKey 缓存键
   * @returns 键类型，如果无法识别返回null
   */
  getKeyType(cacheKey: string): AlertCacheKeyType | null {
    const types = Object.values(AlertCacheKeyType) as AlertCacheKeyType[];
    
    for (const type of types) {
      if (this.isKeyOfType(cacheKey, type)) {
        return type;
      }
    }

    return null;
  }

  // =================================
  // 批量键生成方法
  // =================================

  /**
   * 批量生成活跃告警键
   * @param ruleIds 规则ID列表
   * @returns 缓存键列表
   */
  batchActiveAlerts(ruleIds: string[]): string[] {
    return ruleIds.map(ruleId => this.activeAlert(ruleId));
  }

  /**
   * 批量生成冷却期键
   * @param ruleIds 规则ID列表
   * @returns 缓存键列表
   */
  batchCooldowns(ruleIds: string[]): string[] {
    return ruleIds.map(ruleId => this.cooldown(ruleId));
  }

  /**
   * 批量生成时序数据键
   * @param ruleIds 规则ID列表
   * @returns 缓存键列表
   */
  batchTimeseries(ruleIds: string[]): string[] {
    return ruleIds.map(ruleId => this.timeseries(ruleId));
  }

  // =================================
  // 配置和调试方法
  // =================================

  /**
   * 获取当前键配置
   * @returns 键配置
   */
  getConfig(): AlertCacheKeyConfig {
    return { ...this.config };
  }

  /**
   * 验证键格式是否正确
   * @param cacheKey 缓存键
   * @returns 验证结果
   */
  validateKey(cacheKey: string): {
    valid: boolean;
    type?: AlertCacheKeyType;
    ruleId?: string;
    error?: string;
  } {
    if (!cacheKey || typeof cacheKey !== "string") {
      return { valid: false, error: "缓存键必须是非空字符串" };
    }

    const keyType = this.getKeyType(cacheKey);
    if (!keyType) {
      return { valid: false, error: "无法识别的缓存键类型" };
    }

    // 对于需要规则ID的键类型，验证规则ID的存在
    if ([AlertCacheKeyType.ACTIVE_ALERT, AlertCacheKeyType.COOLDOWN, AlertCacheKeyType.TIMESERIES].includes(keyType)) {
      const ruleId = this.extractRuleId(cacheKey);
      if (!ruleId) {
        return { valid: false, error: "无法从缓存键中提取规则ID" };
      }
      return { valid: true, type: keyType, ruleId };
    }

    return { valid: true, type: keyType };
  }

  /**
   * 生成调试信息
   * @returns 调试信息对象
   */
  getDebugInfo(): {
    config: AlertCacheKeyConfig;
    patterns: Record<string, string>;
    sampleKeys: Record<string, string>;
  } {
    const sampleRuleId = "rule_123";
    const sampleOperationId = "op_456";

    return {
      config: this.getConfig(),
      patterns: {
        activeAlert: this.activeAlertPattern(),
        cooldown: this.cooldownPattern(),
        timeseries: this.timeseriesPattern(),
        allAlert: this.allAlertKeysPattern()
      },
      sampleKeys: {
        activeAlert: this.activeAlert(sampleRuleId),
        cooldown: this.cooldown(sampleRuleId),
        timeseries: this.timeseries(sampleRuleId),
        stats: this.stats("general"),
        batchOperation: this.batchOperation(sampleOperationId)
      }
    };
  }
}

/**
 * 默认Alert缓存键实例
 * 可直接导入使用，无需实例化
 */
export const alertCacheKeys = new AlertCacheKeys();

/**
 * 创建自定义配置的Alert缓存键实例的工厂函数
 * @param config 自定义配置
 * @returns Alert缓存键实例
 */
export function createAlertCacheKeys(config?: Partial<AlertCacheKeyConfig>): AlertCacheKeys {
  return new AlertCacheKeys(config);
}