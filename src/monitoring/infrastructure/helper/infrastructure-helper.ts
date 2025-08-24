/**
 * 🎯 Metrics Helper
 *
 * 提供简化的指标记录API，将业务层与具体实现解耦
 * 统一管理指标命名、标签等
 */
import { MetricsRegistryService } from '../metrics/metrics-registry.service';

/**
 * 指标助手工具类
 * 提供简单的接口用于记录各类指标，避免业务代码直接操作 Counter/Gauge/Histogram
 */
export class MetricsHelper {
  // 默认关闭 legacyMode，后续将完全移除旧统计逻辑
  static legacyMode = false;

  /**
   * 递增计数器
   * @param registry 指标注册中心
   * @param name 指标名称
   * @param labels 标签值
   * @param value 增加值（默认为1）
   * @param legacyCallback 旧指标更新回调
   */
  static inc(
    registry: MetricsRegistryService, 
    name: string, 
    labels?: object, 
    value: number = 1,
    legacyCallback?: () => void
  ): void {
    const counter = registry[name];
    if (counter && typeof counter.inc === 'function') {
      counter.inc(labels, value);
    }
    
    // 兼容模式下，同时更新旧指标
    if (this.legacyMode && legacyCallback) {
      legacyCallback();
    }
  }

  /**
   * 设置仪表值
   * @param registry 指标注册中心
   * @param name 指标名称
   * @param value 设置值
   * @param labels 标签值
   * @param legacyCallback 旧指标更新回调
   */
  static setGauge(
    registry: MetricsRegistryService, 
    name: string, 
    value: number, 
    labels?: object,
    legacyCallback?: () => void
  ): void {
    const gauge = registry[name];
    if (gauge && typeof gauge.set === 'function') {
      gauge.set(labels, value);
    }
    
    // 兼容模式下，同时更新旧指标
    if (this.legacyMode && legacyCallback) {
      legacyCallback();
    }
  }

  /**
   * 记录直方图观测值
   * @param registry 指标注册中心
   * @param name 指标名称
   * @param value 观测值
   * @param labels 标签值
   * @param legacyCallback 旧指标更新回调
   */
  static observe(
    registry: MetricsRegistryService, 
    name: string, 
    value: number, 
    labels?: object,
    legacyCallback?: () => void
  ): void {
    const histogram = registry[name];
    if (histogram && typeof histogram.observe === 'function') {
      histogram.observe(labels, value);
    }
    
    // 兼容模式下，同时更新旧指标
    if (this.legacyMode && legacyCallback) {
      legacyCallback();
    }
  }

  /**
   * 获取指定名称的计数器
   * @param registry 指标注册中心
   * @param name 指标名称
   */
  static getCounter(registry: MetricsRegistryService, name: string) {
    return registry[name];
  }

  /**
   * 获取指定名称的仪表
   * @param registry 指标注册中心
   * @param name 指标名称
   */
  static getGauge(registry: MetricsRegistryService, name: string) {
    return registry[name];
  }

  /**
   * 获取指定名称的直方图
   * @param registry 指标注册中心
   * @param name 指标名称
   */
  static getHistogram(registry: MetricsRegistryService, name: string) {
    return registry[name];
  }
  
  /**
   * 设置兼容模式状态
   * @param enabled 是否启用兼容模式
   */
  static setLegacyMode(enabled: boolean): void {
    // 临时保留接口以兼容旧代码，但默认关闭 legacyMode
    this.legacyMode = enabled;
  }
} 