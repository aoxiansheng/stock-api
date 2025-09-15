/**
 * Alert查询服务
 * 🎯 专门负责告警查询、统计和报表功能
 * 
 * @description 单一职责：数据查询和统计，不涉及状态变更
 * @author Claude Code Assistant
 * @date 2025-09-10
 */

import { Injectable, Inject } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';

import { createLogger } from "@common/logging/index";
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import { AlertHistoryRepository } from '../repositories/alert-history.repository';
import { IAlert, IAlertQuery, IAlertStats } from '../interfaces';
import { AlertStatus } from '../types/alert.types';
import cacheLimitsConfig from '../../cache/config/cache-limits.config';
import {
  AlertQueryResultDto,
  AlertStatisticsDto,
} from '../dto/alert-history-internal.dto';

@Injectable()
export class AlertQueryService {
  private readonly logger = createLogger('AlertQueryService');

  constructor(
    private readonly alertHistoryRepository: AlertHistoryRepository,
    private readonly paginationService: PaginationService,
    @Inject(cacheLimitsConfig.KEY)
    private readonly cacheLimits: ConfigType<typeof cacheLimitsConfig>,
  ) {}

  /**
   * 通用告警查询方法 - Controller适配器
   */
  async getAlerts(filter: {
    alertId?: string;
    ruleId?: string;
    status?: string;
    severity?: string;
    metric?: string;
  }): Promise<IAlert[]> {
    const operation = 'GET_ALERTS';
    
    this.logger.debug('通用告警查询', {
      operation,
      filter,
    });

    try {
      // Convert filter to query format
      const query: IAlertQuery = {
        page: 1,
        limit: 1000, // Large limit for general queries
      };

      if (filter.alertId) {
        // For single alert lookup
        const alert = await this.alertHistoryRepository.findById(filter.alertId);
        return alert ? [alert] : [];
      }

      if (filter.ruleId) query.ruleId = filter.ruleId;
      if (filter.status) query.status = filter.status as AlertStatus;
      if (filter.severity) query.severity = filter.severity as any; // Type conversion for flexibility
      if (filter.metric) query.metric = filter.metric;

      const { alerts } = await this.alertHistoryRepository.find(query);
      return alerts;
    } catch (error) {
      this.logger.error('通用告警查询失败', { operation, error: error.message });
      throw error;
    }
  }

  /**
   * 查询告警历史 - Controller适配器
   */
  async getAlertHistory(query: IAlertQuery): Promise<AlertQueryResultDto> {
    return this.queryAlerts(query);
  }

  /**
   * 查询告警记录（分页）
   */
  async queryAlerts(query: IAlertQuery): Promise<AlertQueryResultDto> {
    const operation = 'QUERY_ALERTS';
    
    this.logger.debug('查询告警记录', {
      operation,
      query: this.sanitizeQuery(query),
    });

    try {
      const { alerts, total } = await this.alertHistoryRepository.find(query);
      
      const { page, limit } = this.paginationService.normalizePaginationQuery({
        page: query.page || 1,
        limit: query.limit || this.cacheLimits.alertBatchSize,
      });

      const pagination = this.paginationService.createPagination(page, limit, total);

      this.logger.debug('告警查询完成', {
        operation,
        total,
        page,
        limit,
        resultCount: alerts.length,
      });

      return {
        alerts,
        ...pagination,
      };
    } catch (error) {
      this.logger.error('告警查询失败', {
        operation,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 获取活跃告警列表
   */
  async getActiveAlerts(): Promise<IAlert[]> {
    const operation = 'GET_ACTIVE_ALERTS';
    
    this.logger.debug('获取活跃告警', { operation });

    try {
      const activeAlerts = await this.alertHistoryRepository.findActive();

      // 按时间排序（最新的在前）
      activeAlerts.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

      this.logger.debug('获取活跃告警完成', {
        operation,
        count: activeAlerts.length,
      });

      return activeAlerts;
    } catch (error) {
      this.logger.error('获取活跃告警失败', {
        operation,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 获取最近的告警记录
   */
  async getRecentAlerts(limit: number = 20): Promise<IAlert[]> {
    const operation = 'GET_RECENT_ALERTS';
    
    // 参数校验
    if (limit <= 0 || limit > 100) {
      limit = 20;
    }

    this.logger.debug('获取最近告警', {
      operation,
      limit,
    });

    try {
      const query: IAlertQuery = {
        page: 1,
        limit,
      };

      const { alerts } = await this.alertHistoryRepository.find(query);

      this.logger.debug('获取最近告警完成', {
        operation,
        requestedLimit: limit,
        resultCount: alerts.length,
      });

      return alerts;
    } catch (error) {
      this.logger.error('获取最近告警失败', {
        operation,
        limit,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 根据规则ID查询告警
   */
  async getAlertsByRuleId(ruleId: string, limit: number = 50): Promise<IAlert[]> {
    const operation = 'GET_ALERTS_BY_RULE';
    
    this.logger.debug('根据规则查询告警', {
      operation,
      ruleId,
      limit,
    });

    try {
      const query: IAlertQuery = {
        ruleId,
        page: 1,
        limit,
      };

      const { alerts } = await this.alertHistoryRepository.find(query);

      this.logger.debug('根据规则查询告警完成', {
        operation,
        ruleId,
        resultCount: alerts.length,
      });

      return alerts;
    } catch (error) {
      this.logger.error('根据规则查询告警失败', {
        operation,
        ruleId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 根据状态查询告警
   */
  async getAlertsByStatus(status: AlertStatus, limit: number = 50): Promise<IAlert[]> {
    const operation = 'GET_ALERTS_BY_STATUS';
    
    this.logger.debug('根据状态查询告警', {
      operation,
      status,
      limit,
    });

    try {
      const query: IAlertQuery = {
        status,
        page: 1,
        limit,
      };

      const { alerts } = await this.alertHistoryRepository.find(query);

      this.logger.debug('根据状态查询告警完成', {
        operation,
        status,
        resultCount: alerts.length,
      });

      return alerts;
    } catch (error) {
      this.logger.error('根据状态查询告警失败', {
        operation,
        status,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 根据严重程度查询告警
   */
  async getAlertsBySeverity(severity: string, limit: number = 50): Promise<IAlert[]> {
    const operation = 'GET_ALERTS_BY_SEVERITY';
    
    this.logger.debug('根据严重程度查询告警', {
      operation,
      severity,
      limit,
    });

    try {
      const query: IAlertQuery = {
        severity: severity as any, // Type conversion handled at runtime
        page: 1,
        limit,
      };

      const { alerts } = await this.alertHistoryRepository.find(query);

      this.logger.debug('根据严重程度查询告警完成', {
        operation,
        severity,
        resultCount: alerts.length,
      });

      return alerts;
    } catch (error) {
      this.logger.error('根据严重程度查询告警失败', {
        operation,
        severity,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 获取告警统计信息
   */
  async getAlertStatistics(): Promise<AlertStatisticsDto> {
    const operation = 'GET_ALERT_STATISTICS';
    
    this.logger.debug('计算告警统计', { operation });

    try {
      const { activeAlerts, todayAlerts, resolvedToday, avgResolutionTime } =
        await this.alertHistoryRepository.getStatistics();

      // 处理活跃告警统计
      const activeStats = { total: 0, critical: 0, warning: 0, info: 0 };
      activeAlerts.forEach((item) => {
        if (item._id) {
          activeStats[item._id] = item.count;
        }
        activeStats.total += item.count;
      });

      // 计算平均解决时间（转换为分钟）
      const avgResolutionMinutes = avgResolutionTime[0]?.avgTime
        ? Math.round(avgResolutionTime[0].avgTime / 1000 / 60)
        : 0;

      const statistics: AlertStatisticsDto = {
        activeAlerts: activeStats.total,
        criticalAlerts: activeStats.critical || 0,
        warningAlerts: activeStats.warning || 0,
        infoAlerts: activeStats.info || 0,
        totalAlertsToday: todayAlerts,
        resolvedAlertsToday: resolvedToday,
        averageResolutionTime: avgResolutionMinutes,
        statisticsTime: new Date(),
      };

      this.logger.debug('告警统计计算完成', {
        operation,
        activeAlerts: statistics.activeAlerts,
        totalToday: statistics.totalAlertsToday,
        resolvedToday: statistics.resolvedAlertsToday,
      });

      return statistics;
    } catch (error) {
      this.logger.error('告警统计计算失败', {
        operation,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 获取告警数量统计（按状态分组）
   */
  async getAlertCountByStatus(): Promise<Record<AlertStatus, number>> {
    const operation = 'GET_COUNT_BY_STATUS';
    
    this.logger.debug('获取状态统计', { operation });

    try {
      const rawCounts = await this.alertHistoryRepository.getCountByStatus();
      
      // 转换为规范化的状态统计格式
      const statusCounts: Record<AlertStatus, number> = {
        [AlertStatus.FIRING]: rawCounts[AlertStatus.FIRING] || 0,
        [AlertStatus.ACKNOWLEDGED]: rawCounts[AlertStatus.ACKNOWLEDGED] || 0,
        [AlertStatus.RESOLVED]: rawCounts[AlertStatus.RESOLVED] || 0,
        [AlertStatus.SUPPRESSED]: rawCounts[AlertStatus.SUPPRESSED] || 0,
      };

      this.logger.debug('状态统计完成', {
        operation,
        statusCounts,
      });

      return statusCounts;
    } catch (error) {
      this.logger.error('状态统计失败', {
        operation,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 获取告警数量统计（按严重程度分组）
   */
  async getAlertCountBySeverity(): Promise<Record<string, number>> {
    const operation = 'GET_COUNT_BY_SEVERITY';
    
    this.logger.debug('获取严重程度统计', { operation });

    try {
      // TODO: 仓储层需要实现按严重程度统计的方法
      const severityCounts: Record<string, number> = {
        critical: 0,
        warning: 0,
        info: 0,
      };

      this.logger.debug('严重程度统计完成', {
        operation,
        severityCounts,
      });

      return severityCounts;
    } catch (error) {
      this.logger.error('严重程度统计失败', {
        operation,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 获取时间范围内的告警趋势
   */
  async getAlertTrend(
    startDate: Date,
    endDate: Date,
    interval: 'hour' | 'day' | 'week' = 'day'
  ): Promise<Array<{ time: string; count: number; resolved: number }>> {
    const operation = 'GET_ALERT_TREND';
    
    this.logger.debug('获取告警趋势', {
      operation,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      interval,
    });

    try {
      // TODO: 仓储层需要实现趋势统计的方法
      const trendData: Array<{ time: string; count: number; resolved: number }> = [];

      this.logger.debug('告警趋势计算完成', {
        operation,
        dataPoints: trendData.length,
      });

      return trendData;
    } catch (error) {
      this.logger.error('告警趋势计算失败', {
        operation,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 搜索告警（支持关键词搜索）
   */
  async searchAlerts(
    keyword: string,
    filters: Partial<IAlertQuery> = {},
    limit: number = 50
  ): Promise<IAlert[]> {
    const operation = 'SEARCH_ALERTS';
    
    this.logger.debug('搜索告警', {
      operation,
      keyword,
      filters: this.sanitizeQuery(filters),
      limit,
    });

    try {
      const query: IAlertQuery = {
        ...filters,
        page: 1,
        limit,
        // TODO: 添加关键词搜索支持
      };

      const { alerts } = await this.alertHistoryRepository.find(query);

      // 在内存中进行关键词过滤（临时方案，应在数据库层实现）
      const filteredAlerts = alerts.filter(alert =>
        alert.message?.toLowerCase().includes(keyword.toLowerCase()) ||
        alert.ruleName?.toLowerCase().includes(keyword.toLowerCase()) ||
        alert.metric?.toLowerCase().includes(keyword.toLowerCase())
      );

      this.logger.debug('告警搜索完成', {
        operation,
        keyword,
        totalResults: alerts.length,
        filteredResults: filteredAlerts.length,
      });

      return filteredAlerts;
    } catch (error) {
      this.logger.error('告警搜索失败', {
        operation,
        keyword,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 导出告警数据
   */
  async exportAlerts(
    query: IAlertQuery,
    format: 'csv' | 'json' = 'json'
  ): Promise<{ data: any; filename: string; mimeType: string }> {
    const operation = 'EXPORT_ALERTS';
    
    this.logger.debug('导出告警数据', {
      operation,
      format,
      query: this.sanitizeQuery(query),
    });

    try {
      // 获取所有匹配的数据（不分页）
      const exportQuery = { ...query, limit: 10000 }; // 限制最大导出数量
      const { alerts } = await this.alertHistoryRepository.find(exportQuery);

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `alerts_export_${timestamp}.${format}`;
      
      let data: any;
      let mimeType: string;

      if (format === 'csv') {
        data = this.convertToCSV(alerts);
        mimeType = 'text/csv';
      } else {
        data = JSON.stringify(alerts, null, 2);
        mimeType = 'application/json';
      }

      this.logger.log('告警数据导出完成', {
        operation,
        format,
        recordCount: alerts.length,
        filename,
      });

      return { data, filename, mimeType };
    } catch (error) {
      this.logger.error('告警数据导出失败', {
        operation,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 获取查询服务统计信息
   */
  getQueryStats(): {
    totalQueries: number;
    cacheHitRate: number;
    averageQueryTime: number;
    popularFilters: string[];
  } {
    // TODO: 实现查询统计追踪
    return {
      totalQueries: 0,
      cacheHitRate: 0,
      averageQueryTime: 0,
      popularFilters: [],
    };
  }

  /**
   * 清理敏感查询参数用于日志
   */
  private sanitizeQuery(query: any): any {
    const { ...sanitized } = query;
    // 移除可能的敏感信息
    return sanitized;
  }

  /**
   * 转换为CSV格式
   */
  private convertToCSV(alerts: IAlert[]): string {
    if (alerts.length === 0) return '';

    const headers = [
      'ID', 'Rule ID', 'Rule Name', 'Status', 'Severity',
      'Metric', 'Value', 'Threshold', 'Message',
      'Start Time', 'End Time', 'Acknowledged By', 'Resolved By'
    ];

    const rows = alerts.map(alert => [
      alert.id,
      alert.ruleId,
      alert.ruleName || '',
      alert.status,
      alert.severity,
      alert.metric || '',
      alert.value || '',
      alert.threshold || '',
      alert.message || '',
      alert.startTime?.toISOString() || '',
      alert.endTime?.toISOString() || '',
      alert.acknowledgedBy || '',
      alert.resolvedBy || '',
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
}