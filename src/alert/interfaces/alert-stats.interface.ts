/**
 * Alert模块共享统计接口
 * 🎯 消除统计结构重复定义，提供统一的统计数据接口
 * 🔧 用于alerting.constants.ts和alert-history.constants.ts的统计结构复用
 */

/**
 * 基础告警统计接口
 * 包含所有告警系统通用的统计字段
 */
export interface BaseAlertStats {
  /** 活跃告警数量 */
  activeAlerts: number;
  /** 严重级别告警数量 */
  criticalAlerts: number;
  /** 警告级别告警数量 */
  warningAlerts: number;
  /** 信息级别告警数量 */
  infoAlerts: number;
  /** 今日总告警数量 */
  totalAlertsToday: number;
  /** 今日已解决告警数量 */
  resolvedAlertsToday: number;
  /** 平均解决时间（分钟） */
  averageResolutionTime: number;
}


/**
 * 默认统计值常量
 * 提供统一的默认统计数据
 */
export const DEFAULT_ALERT_STATS: BaseAlertStats = Object.freeze({
  activeAlerts: 0,
  criticalAlerts: 0,
  warningAlerts: 0,
  infoAlerts: 0,
  totalAlertsToday: 0,
  resolvedAlertsToday: 0,
  averageResolutionTime: 0,
});

/**
 * 告警统计工具类
 * 提供统计数据操作的便利方法
 */
export class AlertStatsUtil {
  /**
   * 验证统计数据格式
   * @param stats 要验证的统计数据
   * @returns 验证结果
   */
  static validateStats(stats: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!stats || typeof stats !== 'object') {
      errors.push('统计数据必须是对象类型');
      return { isValid: false, errors };
    }

    const requiredFields = [
      'activeAlerts', 'criticalAlerts', 'warningAlerts', 'infoAlerts',
      'totalAlertsToday', 'resolvedAlertsToday', 'averageResolutionTime'
    ];

    for (const field of requiredFields) {
      if (typeof stats[field] !== 'number') {
        errors.push(`字段 ${field} 必须是数字类型`);
      }
      if (stats[field] < 0) {
        errors.push(`字段 ${field} 不能为负数`);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * 检查统计数据是否为空（全部为0）
   * @param stats 要检查的统计数据
   * @returns 是否为空
   */
  static isEmpty(stats: BaseAlertStats): boolean {
    return stats.activeAlerts === 0 &&
           stats.criticalAlerts === 0 &&
           stats.warningAlerts === 0 &&
           stats.infoAlerts === 0 &&
           stats.totalAlertsToday === 0 &&
           stats.resolvedAlertsToday === 0 &&
           stats.averageResolutionTime === 0;
  }
}