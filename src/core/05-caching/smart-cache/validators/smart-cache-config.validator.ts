import { SMART_CACHE_CONSTANTS } from "../constants/smart-cache.constants";

/**
 * SmartCache 配置统一验证器
 * 提供类型安全和常量化的配置验证
 */
export class SmartCacheConfigValidator {
  /**
   * 验证TTL值
   * @param ttl TTL值(秒)
   * @param strategyName 策略名称
   * @returns 验证错误数组
   */
  static validateTTL(ttl: number, strategyName: string): string[] {
    const errors: string[] = [];

    if (ttl <= 0) {
      errors.push(`${strategyName}: TTL必须为正数，当前值: ${ttl}`);
    }

    if (ttl > SMART_CACHE_CONSTANTS.TTL_SECONDS.ADAPTIVE_MAX_S) {
      errors.push(
        `${strategyName}: TTL过大，最大值: ${SMART_CACHE_CONSTANTS.TTL_SECONDS.ADAPTIVE_MAX_S}秒`,
      );
    }

    return errors;
  }

  /**
   * 验证阈值比例
   * @param ratio 阈值比例 (0-1)
   * @param strategyName 策略名称
   * @returns 验证错误数组
   */
  static validateThresholdRatio(ratio: number, strategyName: string): string[] {
    const errors: string[] = [];

    if (ratio < 0 || ratio > 1) {
      errors.push(`${strategyName}: 阈值比例必须在0-1之间，当前值: ${ratio}`);
    }

    return errors;
  }

  /**
   * 验证并发数
   * @param concurrency 并发数
   * @returns 验证错误数组
   */
  static validateConcurrency(concurrency: number): string[] {
    const errors: string[] = [];
    const { MIN_CONCURRENT_UPDATES_COUNT, MAX_CONCURRENT_UPDATES_COUNT } =
      SMART_CACHE_CONSTANTS.CONCURRENCY_LIMITS;

    if (
      concurrency < MIN_CONCURRENT_UPDATES_COUNT ||
      concurrency > MAX_CONCURRENT_UPDATES_COUNT
    ) {
      errors.push(
        `并发数必须在${MIN_CONCURRENT_UPDATES_COUNT}-${MAX_CONCURRENT_UPDATES_COUNT}之间，当前值: ${concurrency}`,
      );
    }

    return errors;
  }

  /**
   * 验证时间间隔
   * @param interval 时间间隔(毫秒)
   * @param intervalName 间隔名称
   * @returns 验证错误数组
   */
  static validateInterval(interval: number, intervalName: string): string[] {
    const errors: string[] = [];

    if (interval <= 0) {
      errors.push(
        `${intervalName}: 时间间隔必须为正数，当前值: ${interval}毫秒`,
      );
    }

    // 最小间隔不能小于1秒
    if (interval < 1000) {
      errors.push(
        `${intervalName}: 时间间隔不能小于1秒，当前值: ${interval}毫秒`,
      );
    }

    // 最大间隔不能超过1天
    if (interval > 24 * 60 * 60 * 1000) {
      errors.push(
        `${intervalName}: 时间间隔不能超过1天，当前值: ${interval}毫秒`,
      );
    }

    return errors;
  }

  /**
   * 验证批次大小
   * @param batchSize 批次大小
   * @returns 验证错误数组
   */
  static validateBatchSize(batchSize: number): string[] {
    const errors: string[] = [];
    const { MIN_BATCH_SIZE_COUNT, MAX_BATCH_SIZE_COUNT } =
      SMART_CACHE_CONSTANTS.CONCURRENCY_LIMITS;

    if (batchSize < MIN_BATCH_SIZE_COUNT || batchSize > MAX_BATCH_SIZE_COUNT) {
      errors.push(
        `批次大小必须在${MIN_BATCH_SIZE_COUNT}-${MAX_BATCH_SIZE_COUNT}之间，当前值: ${batchSize}`,
      );
    }

    return errors;
  }

  /**
   * 验证内存阈值
   * @param memoryThreshold 内存阈值比例 (0-1)
   * @returns 验证错误数组
   */
  static validateMemoryThreshold(memoryThreshold: number): string[] {
    const errors: string[] = [];

    if (memoryThreshold < 0 || memoryThreshold > 1) {
      errors.push(`内存阈值必须在0-1之间，当前值: ${memoryThreshold}`);
    }

    // 内存阈值不应该设置得太低，建议至少50%
    if (memoryThreshold < 0.5) {
      errors.push(`内存阈值设置过低，建议至少0.5，当前值: ${memoryThreshold}`);
    }

    return errors;
  }

  /**
   * 验证自适应策略TTL范围
   * @param minTtl 最小TTL
   * @param maxTtl 最大TTL
   * @param baseTtl 基础TTL
   * @returns 验证错误数组
   */
  static validateAdaptiveTtlRange(
    minTtl: number,
    maxTtl: number,
    baseTtl: number,
  ): string[] {
    const errors: string[] = [];

    if (minTtl >= maxTtl) {
      errors.push(`自适应策略: 最小TTL(${minTtl})必须小于最大TTL(${maxTtl})`);
    }

    if (baseTtl < minTtl || baseTtl > maxTtl) {
      errors.push(
        `自适应策略: 基础TTL(${baseTtl})必须在最小TTL(${minTtl})和最大TTL(${maxTtl})之间`,
      );
    }

    return errors;
  }

  /**
   * 验证市场感知策略配置
   * @param openTtl 开市TTL
   * @param closedTtl 闭市TTL
   * @param checkInterval 市场状态检查间隔
   * @returns 验证错误数组
   */
  static validateMarketAwareConfig(
    openTtl: number,
    closedTtl: number,
    checkInterval: number,
  ): string[] {
    const errors: string[] = [];

    if (openTtl <= 0 || closedTtl <= 0) {
      errors.push("市场感知策略: 开市和闭市TTL必须为正数");
    }

    if (checkInterval <= 0) {
      errors.push("市场感知策略: 市场状态检查间隔必须为正数");
    }

    // 通常开市时TTL应该比闭市时短
    if (openTtl >= closedTtl) {
      errors.push(
        `市场感知策略: 建议开市TTL(${openTtl})小于闭市TTL(${closedTtl})以适应市场活跃度`,
      );
    }

    return errors;
  }
}
