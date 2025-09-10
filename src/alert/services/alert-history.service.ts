import { Injectable } from "@nestjs/common";

import { createLogger, sanitizeLogData } from "@app/config/logger.config";

// 🎯 引入缓存服务用于时序数据存储
import { CacheService } from "../../cache/services/cache.service";
// 🎯 引入通用分页服务
import { PaginationService } from "@common/modules/pagination/services/pagination.service";
import {
  ALERT_DEFAULTS,
} from "../constants";
import { IAlert, IAlertQuery } from "../interfaces";

// 🎯 引入仓储层
import { AlertHistoryRepository } from "../repositories/alert-history.repository";
import { AlertStatus } from "../types/alert.types";

// 🎯 复用 common 模块的日志配置
// 🎯 使用内部 DTO 类型增强功能
import {
  AlertStatusUpdateDataDto,
  AlertQueryResultDto,
  AlertStatisticsDto,
  AlertCleanupResultDto,
} from "../dto/alert-history-internal.dto";
// 🎯 引入告警历史服务常量

@Injectable()
export class AlertHistoryService {
  private readonly logger = createLogger(AlertHistoryService.name);

  constructor(
    // 🎯 使用仓储层
    private readonly alertHistoryRepository: AlertHistoryRepository,
    // 🎯 注入缓存服务用于时序数据存储
    private readonly cacheService: CacheService,
    // 🎯 注入通用分页服务
    private readonly paginationService: PaginationService,
  ) {}

  /**
   * 创建告警记录
   */
  async createAlert(
    alertData: Omit<IAlert, "id" | "startTime" | "status">,
  ): Promise<IAlert> {
    const operation = "CREATE_ALERT";

    this.logger.debug(
      "告警创建开始",
      sanitizeLogData({
        operation,
        ruleId: alertData.ruleId,
        severity: alertData.severity,
      }),
    );

    try {
      const alertId = this.generateAlertId();
      const alert = await this.alertHistoryRepository.create({
        ...alertData,
        id: alertId,
        startTime: new Date(),
        status: AlertStatus.FIRING,
      });

      // 🎯 缓存告警历史到Redis时序存储
      await this.cacheAlertHistory(alert);

      this.logger.log(
        "告警创建成功",
        sanitizeLogData({
          operation,
          alertId,
          ruleId: alertData.ruleId,
          severity: alertData.severity,
        }),
      );

      return alert;
    } catch (error) {
      this.logger.error(
        "告警创建失败",
        sanitizeLogData({
          operation,
          error: error.message,
          stack: error.stack,
          ruleId: alertData.ruleId,
        }),
      );
      // 🎯 重新抛出原始错误
      throw error;
    }
  }

  /**
   * 更新告警状态
   */
  async updateAlertStatus(
    alertId: string,
    status: AlertStatus,
    updatedBy?: string,
  ): Promise<IAlert | null> {
    const operation = "UPDATE_ALERT_STATUS";

    this.logger.debug(
      "告警状态更新开始",
      sanitizeLogData({
        operation,
        alertId,
        status,
        updatedBy,
      }),
    );

    try {
      const updateData: AlertStatusUpdateDataDto = { status };

      if (status === AlertStatus.ACKNOWLEDGED) {
        updateData.acknowledgedBy = updatedBy;
        updateData.acknowledgedAt = new Date();
      } else if (status === AlertStatus.RESOLVED) {
        updateData.resolvedBy = updatedBy;
        updateData.resolvedAt = new Date();
        updateData.endTime = new Date();
      }

      const alert = await this.alertHistoryRepository.update(
        alertId,
        updateData,
      );

      if (alert) {
        // 🎯 更新缓存中的告警状态
        await this.updateCachedAlertStatus(alert);

        this.logger.log(
          "告警状态更新成功",
          sanitizeLogData({
            operation,
            alertId,
            status,
            updatedBy,
          }),
        );
      }

      return alert;
    } catch (error) {
      this.logger.error(
        "告警状态更新失败",
        sanitizeLogData({
          operation,
          alertId,
          status,
          error: error.message,
          stack: error.stack,
        }),
      );
      throw error;
    }
  }

  /**
   * 查询告警记录
   */
  async queryAlerts(query: IAlertQuery): Promise<AlertQueryResultDto> {
    const operation = "QUERY_ALERTS";

    this.logger.debug(
      "告警查询开始",
      sanitizeLogData({
        operation,
        queryParams: query,
      }),
    );

    try {
      const { alerts, total } = await this.alertHistoryRepository.find(query);
      const { page, limit } = this.paginationService.normalizePaginationQuery({
        page: query.page,
        limit: query.limit || ALERT_DEFAULTS.BATCH_SIZE,
      });

      // 使用通用分页服务计算分页信息
      const pagination = this.paginationService.createPagination(
        page,
        limit,
        total,
      );

      this.logger.debug(
        "告警查询完成",
        sanitizeLogData({
          operation,
          total,
          page,
          limit,
          alertsCount: alerts.length,
        }),
      );

      return {
        alerts,
        ...pagination,
      };
    } catch (error) {
      this.logger.error(
        "告警查询失败",
        sanitizeLogData({
          operation,
          queryParams: query,
          error: error.message,
          stack: error.stack,
        }),
      );
      throw error;
    }
  }

  /**
   * 获取活跃告警
   * 🎯 优先从Redis缓存获取，失败时回退到数据库
   */
  async getActiveAlerts(): Promise<IAlert[]> {
    const operation = "GET_ACTIVE_ALERTS";

    this.logger.debug(
      "活跃告警查询开始",
      sanitizeLogData({
        operation,
      }),
    );

    try {
      // 🎯 尝试从缓存获取活跃告警的合并数据
      let activeAlerts: IAlert[] = [];
      let cacheHitCount = 0;

      try {
        // 从缓存获取所有时序数据的键
        const cacheKeys = await this.cacheService
          .getClient()
          .keys("alert:history:timeseries:*");

        if (cacheKeys.length > 0) {
          // 从每个时序键获取最新的活跃告警
          const cachedPromises = cacheKeys.map(async (key) => {
            const ruleId = key.replace("alert:history:timeseries:", "");
            const cachedData = await this.getCachedAlertHistory(ruleId, 10); // 获取最近10条
            return cachedData.filter(
              (alert) =>
                alert.status === AlertStatus.FIRING ||
                alert.status === AlertStatus.ACKNOWLEDGED,
            );
          });

          const cachedResults = await Promise.all(cachedPromises);
          const cachedAlerts = cachedResults.flat();

          if (cachedAlerts.length > 0) {
            activeAlerts = cachedAlerts;
            cacheHitCount = cachedAlerts.length;

            this.logger.debug(
              "从Redis缓存获取活跃告警成功",
              sanitizeLogData({
                operation,
                cacheHitCount,
                cacheKeysCount: cacheKeys.length,
              }),
            );
          }
        }
      } catch (cacheError) {
        this.logger.debug(
          "从Redis缓存获取活跃告警失败，回退到数据库",
          sanitizeLogData({
            operation,
            cacheError: cacheError.message,
          }),
        );
      }

      // 如果缓存没有数据，从数据库获取
      if (activeAlerts.length === 0) {
        activeAlerts = await this.alertHistoryRepository.findActive();

        this.logger.debug(
          "从数据库获取活跃告警",
          sanitizeLogData({
            operation,
            databaseCount: activeAlerts.length,
          }),
        );
      }

      // 按时间排序（最新的在前）
      activeAlerts.sort(
        (a, b) => b.startTime.getTime() - a.startTime.getTime(),
      );

      this.logger.debug(
        "活跃告警查询完成",
        sanitizeLogData({
          operation,
          count: activeAlerts.length,
          cacheHitCount,
        }),
      );

      return activeAlerts;
    } catch (error) {
      this.logger.error(
        "活跃告警查询失败",
        sanitizeLogData({
          operation,
          error: error.message,
          stack: error.stack,
        }),
      );
      throw error;
    }
  }

  /**
   * 获取告警统计 (仅历史)
   */
  async getAlertStats(): Promise<AlertStatisticsDto> {
    const operation = "GET_ALERT_STATS";

    this.logger.debug(
      "告警统计计算开始",
      sanitizeLogData({
        operation,
      }),
    );

    try {
      const { activeAlerts, todayAlerts, resolvedToday, avgResolutionTime } =
        await this.alertHistoryRepository.getStatistics();

      const activeStats = { total: 0, critical: 0, warning: 0, info: 0 };
      activeAlerts.forEach((item) => {
        if (item._id) activeStats[item._id] = item.count;
        activeStats.total += item.count;
      });

      const avgResolutionMinutes = avgResolutionTime[0]?.avgTime
        ? Math.round(avgResolutionTime[0].avgTime / 1000 / 60)
        : 0;

      const stats = this.formatStatistics({
        activeAlerts: activeStats.total,
        criticalAlerts: activeStats.critical || 0,
        warningAlerts: activeStats.warning || 0,
        infoAlerts: activeStats.info || 0,
        totalAlertsToday: todayAlerts,
        resolvedAlertsToday: resolvedToday,
        averageResolutionTime: avgResolutionMinutes,
      });

      this.logger.debug(
        "告警统计计算完成",
        sanitizeLogData({
          operation,
          activeAlerts: stats.activeAlerts,
          totalAlertsToday: stats.totalAlertsToday,
        }),
      );

      return stats;
    } catch (error) {
      this.logger.error(
        "告警统计计算失败",
        sanitizeLogData({
          operation,
          error: error.message,
          stack: error.stack,
        }),
      );
      throw error;
    }
  }

  /**
   * 根据ID获取告警
   */
  async getAlertById(alertId: string): Promise<IAlert | null> {
    const operation = "GET_ALERT_BY_ID";

    this.logger.debug(
      "告警查询开始",
      sanitizeLogData({
        operation,
        alertId,
      }),
    );

    try {
      const alert = await this.alertHistoryRepository.findById(alertId);

      if (alert) {
        this.logger.debug(
          "告警查询成功",
          sanitizeLogData({
            operation,
            alertId,
            severity: alert.severity,
          }),
        );
      } else {
        this.logger.debug(
          "未找到告警",
          sanitizeLogData({
            operation,
            alertId,
          }),
        );
      }

      return alert;
    } catch (error) {
      this.logger.error(
        "告警查询失败",
        sanitizeLogData({
          operation,
          alertId,
          error: error.message,
          stack: error.stack,
        }),
      );
      throw error;
    }
  }

  /**
   * 删除过期告警
   */
  async cleanupExpiredAlerts(
    daysToKeep: number = 90,
  ): Promise<AlertCleanupResultDto> {
    const operation = "CLEANUP_EXPIRED_ALERTS";
    const startTime = new Date();

    // 验证清理天数
    if (daysToKeep <= 0 || daysToKeep > 365) {
      daysToKeep = 90;
    }

    this.logger.log(
      "清理过期告警开始",
      sanitizeLogData({
        operation,
        daysToKeep,
      }),
    );

    try {
      const deletedCount =
        await this.alertHistoryRepository.cleanup(daysToKeep);
      const endTime = new Date();
      const executionTime = this.calculateExecutionTime(
        startTime,
        endTime,
      );

      const result: AlertCleanupResultDto = {
        deletedCount,
        executionTimeMs: executionTime,
        startTime,
        endTime,
      };

      this.logger.log(
        "清理过期告警完成",
        sanitizeLogData({
          operation,
          daysToKeep,
          deletedCount,
          executionTime,
        }),
      );

      return result;
    } catch (error) {
      const endTime = new Date();
      const executionTime = this.calculateExecutionTime(
        startTime,
        endTime,
      );

      this.logger.error(
        "清理过期告警失败",
        sanitizeLogData({
          operation,
          daysToKeep,
          executionTime,
          error: error.message,
          stack: error.stack,
        }),
      );
      throw error;
    }
  }

  /**
   * 批量更新告警状态
   */
  async batchUpdateAlertStatus(
    alertIds: string[],
    status: AlertStatus,
    updatedBy?: string,
  ): Promise<{ successCount: number; failedCount: number; errors: string[] }> {
    const operation = "BATCH_UPDATE_ALERT_STATUS";
    const executionStart = Date.now();

    // 验证批量大小
    if (alertIds.length > 1000) {
      throw new Error(
        `批量大小超出限制，最大允许 1000 个`,
      );
    }

    this.logger.log(
      "批量更新告警状态开始",
      sanitizeLogData({
        operation,
        alertIdsCount: alertIds.length,
        status,
        updatedBy,
      }),
    );

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    try {
      const promises = alertIds.map(async (alertId) => {
        try {
          await this.updateAlertStatus(alertId, status, updatedBy);
          successCount++;
        } catch (error) {
          failedCount++;
          errors.push(`${alertId}: ${error.message}`);
        }
      });

      await Promise.all(promises);

      const executionTime = Date.now() - executionStart;
      const summary = this.generateBatchResultSummary(
        successCount,
        failedCount,
        errors,
      );

      this.logger.log(
        "批量更新告警状态完成",
        sanitizeLogData({
          operation,
          successCount,
          failedCount,
          executionTime,
          successRate: summary.successRate,
        }),
      );

      return { successCount, failedCount, errors };
    } catch (error) {
      const executionTime = Date.now() - executionStart;
      this.logger.error(
        "批量更新告警状态失败",
        sanitizeLogData({
          operation,
          alertIdsCount: alertIds.length,
          executionTime,
          error: error.message,
        }),
      );
      throw error;
    }
  }

  /**
   * 获取告警数量统计（按状态）
   */
  async getAlertCountByStatus(): Promise<Record<string, number>> {
    const operation = "GET_ALERT_COUNT_BY_STATUS";

    this.logger.debug(
      "告警数量统计计算开始",
      sanitizeLogData({
        operation,
      }),
    );

    try {
      // 这里需要仓储层支持该方法，暂时返回默认值
      const statusCounts = {
        [AlertStatus.FIRING]: 0,
        [AlertStatus.ACKNOWLEDGED]: 0,
        [AlertStatus.RESOLVED]: 0,
      };

      this.logger.debug(
        "告警数量统计计算完成",
        sanitizeLogData({
          operation,
          statusCounts,
          totalStatuses: Object.keys(statusCounts).length,
        }),
      );

      return statusCounts;
    } catch (error) {
      this.logger.error(
        "告警数量统计计算失败",
        sanitizeLogData({
          operation,
          error: error.message,
        }),
      );
      throw error;
    }
  }

  /**
   * 获取最近的告警记录
   */
  async getRecentAlerts(
    limit: number = 20,
  ): Promise<IAlert[]> {
    const operation = "GET_RECENT_ALERTS";

    // 验证限制参数
    if (limit <= 0 || limit > 100) {
      limit = 20;
    }

    this.logger.debug(
      "最近告警查询开始",
      sanitizeLogData({
        operation,
        limit,
      }),
    );

    try {
      const query: IAlertQuery = {
        page: 1,
        limit,
      };

      const { alerts } = await this.alertHistoryRepository.find(query);

      this.logger.debug(
        "最近告警查询完成",
        sanitizeLogData({
          operation,
          alertsCount: alerts.length,
          requestedLimit: limit,
        }),
      );

      return alerts;
    } catch (error) {
      this.logger.error(
        "最近告警查询失败",
        sanitizeLogData({
          operation,
          limit,
          error: error.message,
        }),
      );
      throw error;
    }
  }

  /**
   * 获取服务统计信息
   */
  getServiceStats(): {
    supportedStatuses: string[];
    defaultCleanupDays: number;
    idPrefixFormat: string;
    maxBatchUpdateSize: number;
  } {
    this.logger.debug(
      `获取服务统计信息`,
      sanitizeLogData({
        operation: "getServiceStats",
      }),
    );

    return {
      supportedStatuses: Object.values(AlertStatus),
      defaultCleanupDays: 90,
      idPrefixFormat: "alert_",
      maxBatchUpdateSize: 1000,
    };
  }

  /**
   * 🎯 私有方法：缓存告警历史到Redis时序存储
   */
  private async cacheAlertHistory(alert: IAlert): Promise<void> {
    try {
      const timeSeriesKey = `alert:history:timeseries:${alert.ruleId}`;
      const alertData = JSON.stringify({
        id: alert.id,
        ruleId: alert.ruleId, // 🎯 修复：在缓存数据中包含ruleId字段
        status: alert.status,
        severity: alert.severity,
        message: alert.message,
        value: alert.value,
        threshold: alert.threshold,
        startTime: alert.startTime,
        metric: alert.metric,
        tags: alert.tags,
        context: alert.context,
      });

      // 将告警数据推入Redis时序列表（最新的在前）
      await this.cacheService.listPush(timeSeriesKey, alertData);

      // 限制时序列表长度，保持最近的1000条记录
      await this.cacheService.listTrim(timeSeriesKey, 0, 999);

      // 设置TTL为24小时
      await this.cacheService.expire(timeSeriesKey, 24 * 60 * 60);

      this.logger.debug(
        "告警历史已缓存到Redis时序存储",
        sanitizeLogData({
          operation: "cacheAlertHistory",
          ruleId: alert.ruleId,
          alertId: alert.id,
          timeSeriesKey,
        }),
      );
    } catch (error) {
      // 缓存失败不应影响主要功能，仅记录错误
      this.logger.warn(
        "缓存告警历史到Redis失败",
        sanitizeLogData({
          operation: "cacheAlertHistory",
          ruleId: alert.ruleId,
          alertId: alert.id,
          error: error.message,
        }),
      );
    }
  }

  /**
   * 🎯 私有方法：从Redis时序存储获取告警历史
   */
  private async getCachedAlertHistory(
    ruleId: string,
    limit: number = 100,
  ): Promise<IAlert[]> {
    try {
      const timeSeriesKey = `alert:history:timeseries:${ruleId}`;
      const cachedData = await this.cacheService.listRange(
        timeSeriesKey,
        0,
        limit - 1,
      );

      return cachedData.map((data) => {
        const parsed = JSON.parse(data);
        return {
          ...parsed,
          ruleId, // 🎯 修复：从键名中恢复ruleId字段
          startTime: new Date(parsed.startTime),
        };
      });
    } catch (error) {
      this.logger.debug(
        "从Redis获取缓存的告警历史失败",
        sanitizeLogData({
          operation: "getCachedAlertHistory",
          ruleId,
          error: error.message,
        }),
      );
      return [];
    }
  }

  /**
   * 🎯 私有方法：更新Redis缓存中的告警状态
   */
  private async updateCachedAlertStatus(updatedAlert: IAlert): Promise<void> {
    try {
      const timeSeriesKey = `alert:history:timeseries:${updatedAlert.ruleId}`;

      // 获取当前缓存的数据
      const cachedData = await this.cacheService.listRange(
        timeSeriesKey,
        0,
        -1,
      );

      // 查找并更新对应的告警记录
      let updated = false;
      const updatedData = cachedData.map((data) => {
        const parsed = JSON.parse(data);
        if (parsed.id === updatedAlert.id) {
          updated = true;
          return JSON.stringify({
            ...parsed,
            ruleId: updatedAlert.ruleId, // 🎯 修复：确保更新时也包含ruleId字段
            status: updatedAlert.status,
            acknowledgedBy: updatedAlert.acknowledgedBy,
            acknowledgedAt: updatedAlert.acknowledgedAt,
            resolvedBy: updatedAlert.resolvedBy,
            resolvedAt: updatedAlert.resolvedAt,
            endTime: updatedAlert.endTime,
          });
        }
        return data;
      });

      if (updated) {
        // 删除旧的时序数据
        await this.cacheService.del(timeSeriesKey);

        // 重新推入更新后的数据（保持顺序）
        if (updatedData.length > 0) {
          await this.cacheService.listPush(
            timeSeriesKey,
            updatedData.reverse(),
          );
          await this.cacheService.expire(timeSeriesKey, 24 * 60 * 60);
        }

        this.logger.debug(
          "已更新Redis缓存中的告警状态",
          sanitizeLogData({
            operation: "updateCachedAlertStatus",
            ruleId: updatedAlert.ruleId,
            alertId: updatedAlert.id,
            status: updatedAlert.status,
          }),
        );
      }
    } catch (error) {
      // 缓存更新失败不应影响主要功能，仅记录警告
      this.logger.warn(
        "更新Redis缓存中的告警状态失败",
        sanitizeLogData({
          operation: "updateCachedAlertStatus",
          ruleId: updatedAlert.ruleId,
          alertId: updatedAlert.id,
          error: error.message,
        }),
      );
    }
  }

  /**
   * 生成告警ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * 计算执行时间
   */
  private calculateExecutionTime(startTime: Date, endTime: Date): number {
    return endTime.getTime() - startTime.getTime();
  }

  /**
   * 格式化统计信息
   */
  private formatStatistics(stats: any): AlertStatisticsDto {
    return {
      activeAlerts: stats.activeAlerts || 0,
      criticalAlerts: stats.criticalAlerts || 0,
      warningAlerts: stats.warningAlerts || 0,
      infoAlerts: stats.infoAlerts || 0,
      totalAlertsToday: stats.totalAlertsToday || 0,
      resolvedAlertsToday: stats.resolvedAlertsToday || 0,
      averageResolutionTime: stats.averageResolutionTime || 0,
      statisticsTime: new Date(),
    };
  }

  /**
   * 生成批量结果摘要
   */
  private generateBatchResultSummary(
    successCount: number,
    failedCount: number,
    errors: string[],
  ): { successRate: number; errorSummary: string } {
    const totalCount = successCount + failedCount;
    const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0;
    
    return {
      successRate,
      errorSummary: errors.length > 0 
        ? `失败详情: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? ` 等${errors.length}个错误` : ''}` 
        : '无错误'
    };
  }
}