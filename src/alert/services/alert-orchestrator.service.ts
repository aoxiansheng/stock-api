/**
 * Alert编排服务
 * 🎯 协调所有Alert服务，提供统一的高级接口
 *
 * @description 门面模式，简化复杂的服务交互，提供统一的告警管理接口
 * @author Claude Code Assistant
 * @date 2025-09-10
 */

import {
  Injectable,
  OnModuleInit,
  Inject,
} from "@nestjs/common";
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from "@common/core/exceptions";
import { ALERT_ERROR_CODES } from "../constants/alert-error-codes.constants";
import { ConfigService } from "@nestjs/config";
import type { ConfigType } from "@nestjs/config";

import { createLogger } from "@common/logging/index";
import { BUSINESS_ERROR_MESSAGES } from "@common/constants/semantic/error-messages.constants";
import { DatabaseValidationUtils } from "@common/utils/database.utils";
import { CreateAlertRuleDto, UpdateAlertRuleDto } from "../dto";
import {
  IAlert,
  IAlertRule,
  IAlertQuery,
  IAlertStats,
  IMetricData,
} from "../interfaces";
import { AlertStatus } from "../types/alert.types";
import alertCacheConfig from "../config/alert-cache.config";

// 新服务层导入
import { AlertRuleService } from "./alert-rule.service";
import { AlertEvaluationService } from "./alert-evaluation.service";
import { AlertLifecycleService } from "./alert-lifecycle.service";
import { AlertQueryService } from "./alert-query.service";
import { AlertCacheService } from "./alert-cache.service";
import { AlertEventPublisher } from "./alert-event-publisher.service";

/**
 * 统一的Alert管理服务
 *
 * 这个服务作为门面，协调所有底层服务，
 * 提供简化的接口供控制器和其他模块使用
 */
@Injectable()
export class AlertOrchestratorService implements OnModuleInit {
  private readonly logger = createLogger("AlertOrchestratorService");

  constructor(
    private readonly ruleService: AlertRuleService,
    private readonly evaluationService: AlertEvaluationService,
    private readonly lifecycleService: AlertLifecycleService,
    private readonly queryService: AlertQueryService,
    private readonly cacheService: AlertCacheService,
    private readonly eventPublisher: AlertEventPublisher,
    private readonly configService: ConfigService,
    @Inject(alertCacheConfig.KEY)
    private readonly alertCacheLimits: ConfigType<typeof alertCacheConfig>,
  ) {}

  async onModuleInit() {
    this.logger.log("告警编排服务初始化完成");
    await this.performHealthCheck();
  }

  // ==================== 规则管理接口 ====================

  /**
   * 创建告警规则
   */
  async createRule(createRuleDto: CreateAlertRuleDto): Promise<IAlertRule> {
    return await this.ruleService.createRule(createRuleDto);
  }

  /**
   * 更新告警规则
   */
  async updateRule(
    ruleId: string,
    updateRuleDto: UpdateAlertRuleDto,
  ): Promise<IAlertRule> {
    DatabaseValidationUtils.validateObjectId(ruleId, "告警规则ID");
    return await this.ruleService.updateRule(ruleId, updateRuleDto);
  }

  /**
   * 删除告警规则
   */
  async deleteRule(ruleId: string): Promise<void> {
    DatabaseValidationUtils.validateObjectId(ruleId, "告警规则ID");

    // 删除规则前清理相关缓存
    await this.cacheService.clearActiveAlert(ruleId);
    await this.cacheService.clearCooldown(ruleId);

    const deleted = await this.ruleService.deleteRule(ruleId);
    if (!deleted) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.ALERT,
        errorCode: BusinessErrorCode.DATA_NOT_FOUND,
        operation: 'deleteRule',
        message: 'Alert rule not found for deletion',
        context: {
          ruleId: ruleId
        }
      });
    }
  }

  /**
   * 获取所有规则
   */
  async getRules(): Promise<IAlertRule[]> {
    return await this.ruleService.getAllRules();
  }

  /**
   * 根据ID获取规则
   */
  async getRuleById(ruleId: string): Promise<IAlertRule> {
    DatabaseValidationUtils.validateObjectId(ruleId, "告警规则ID");
    return await this.ruleService.getRuleById(ruleId);
  }

  /**
   * 启用/禁用规则
   */
  async toggleRule(ruleId: string, enabled: boolean): Promise<boolean> {
    DatabaseValidationUtils.validateObjectId(ruleId, "告警规则ID");

    const result = await this.ruleService.toggleRule(ruleId, enabled);

    // 如果禁用规则，清理相关缓存
    if (!enabled && result) {
      await this.cacheService.clearActiveAlert(ruleId);
      await this.cacheService.clearCooldown(ruleId);
    }

    return result;
  }

  // ==================== 评估和处理接口 ====================

  /**
   * 处理指标数据（主要入口）
   */
  async processMetrics(metricData: IMetricData[]): Promise<void> {
    return await this.evaluationService.processMetrics(metricData);
  }

  /**
   * 强制评估所有规则
   */
  async forceEvaluateAllRules(): Promise<{
    evaluatedCount: number;
    triggeredCount: number;
    errors: string[];
  }> {
    return await this.evaluationService.forceEvaluateAllRules();
  }

  /**
   * 评估所有规则 - Controller适配器
   */
  async evaluateAllRules(metricData: IMetricData[] = []): Promise<void> {
    // 如果有指标数据，先处理指标
    if (metricData.length > 0) {
      await this.processMetrics(metricData);
    } else {
      // 否则强制评估所有规则
      await this.forceEvaluateAllRules();
    }
  }

  /**
   * 评估单个规则
   */
  async evaluateRule(ruleId: string, metricData: IMetricData[]) {
    DatabaseValidationUtils.validateObjectId(ruleId, "告警规则ID");
    return await this.evaluationService.evaluateRule(ruleId, metricData);
  }

  // ==================== 告警生命周期接口 ====================

  /**
   * 确认告警
   */
  async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string,
    comment?: string,
  ): Promise<IAlert> {
    DatabaseValidationUtils.validateObjectId(alertId, "告警ID");

    const alert = await this.lifecycleService.acknowledgeAlert(
      alertId,
      acknowledgedBy,
      comment,
    );

    // 更新缓存
    await this.cacheService.updateTimeseriesAlertStatus(alert);

    return alert;
  }

  /**
   * 解决告警
   */
  async resolveAlert(
    alertId: string,
    resolvedBy: string,
    ruleId: string,
    comment?: string,
  ): Promise<IAlert> {
    DatabaseValidationUtils.validateObjectId(alertId, "告警ID");
    DatabaseValidationUtils.validateObjectId(ruleId, "告警规则ID");

    return await this.lifecycleService.resolveAlert(
      alertId,
      resolvedBy,
      ruleId,
      comment,
    );
  }

  /**
   * 抑制告警
   */
  async suppressAlert(
    alertId: string,
    suppressedBy: string,
    suppressionDuration: number,
    reason?: string,
  ): Promise<IAlert> {
    DatabaseValidationUtils.validateObjectId(alertId, "告警ID");

    const alert = await this.lifecycleService.suppressAlert(
      alertId,
      suppressedBy,
      suppressionDuration,
      reason,
    );

    // 更新缓存
    await this.cacheService.updateTimeseriesAlertStatus(alert);

    return alert;
  }

  /**
   * 升级告警严重程度
   */
  async escalateAlert(
    alertId: string,
    newSeverity: string,
    escalatedBy: string,
    reason?: string,
  ): Promise<IAlert> {
    DatabaseValidationUtils.validateObjectId(alertId, "告警ID");

    const alert = await this.lifecycleService.escalateAlert(
      alertId,
      newSeverity,
      escalatedBy,
      reason,
    );

    // 更新缓存
    await this.cacheService.updateTimeseriesAlertStatus(alert);

    return alert;
  }

  /**
   * 批量更新告警状态
   */
  async batchUpdateAlertStatus(
    alertIds: string[],
    status: AlertStatus,
    updatedBy: string,
  ): Promise<{ successCount: number; failedCount: number; errors: string[] }> {
    // 验证所有告警ID格式
    DatabaseValidationUtils.validateObjectIds(alertIds, "告警ID列表");

    // 检查批量操作限制
    if (alertIds.length > this.alertCacheLimits.batchSize) {
      throw UniversalExceptionFactory.createBusinessException({
        message: `Batch operation size exceeds limit, maximum allowed: ${this.alertCacheLimits.batchSize}`,
        errorCode: BusinessErrorCode.BUSINESS_RULE_VIOLATION,
        operation: 'batchUpdateAlertStatus',
        component: ComponentIdentifier.ALERT,
        context: {
          alertIdsCount: alertIds.length,
          maxBatchSize: this.alertCacheLimits.batchSize,
          customErrorCode: ALERT_ERROR_CODES.INVALID_PAGE_PARAMETERS,
          reason: 'batch_size_exceeded'
        },
        retryable: false
      });
    }

    return await this.lifecycleService.batchUpdateAlertStatus(
      alertIds,
      status,
      updatedBy,
    );
  }

  // ==================== 查询接口 ====================

  /**
   * 查询告警
   */
  async queryAlerts(query: IAlertQuery) {
    return await this.queryService.queryAlerts(query);
  }

  /**
   * 获取活跃告警
   */
  async getActiveAlerts(): Promise<IAlert[]> {
    // 优先从缓存获取
    const cachedAlerts = await this.cacheService.getAllActiveAlerts();

    if (cachedAlerts.length > 0) {
      return cachedAlerts;
    }

    // 回退到查询服务
    return await this.queryService.getActiveAlerts();
  }

  /**
   * 获取最近告警
   */
  async getRecentAlerts(limit: number = 20): Promise<IAlert[]> {
    return await this.queryService.getRecentAlerts(limit);
  }

  /**
   * 根据规则ID获取告警
   */
  async getAlertsByRuleId(
    ruleId: string,
    limit: number = 50,
  ): Promise<IAlert[]> {
    DatabaseValidationUtils.validateObjectId(ruleId, "告警规则ID");
    return await this.queryService.getAlertsByRuleId(ruleId, limit);
  }

  /**
   * 搜索告警
   */
  async searchAlerts(
    keyword: string,
    filters: Partial<IAlertQuery> = {},
    limit: number = 50,
  ): Promise<IAlert[]> {
    return await this.queryService.searchAlerts(keyword, filters, limit);
  }

  /**
   * 根据ID获取告警
   */
  async getAlertById(alertId: string): Promise<IAlert> {
    DatabaseValidationUtils.validateObjectId(alertId, "Alert ID");
    const alerts = await this.queryService.getAlerts({ alertId });
    if (alerts.length === 0) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.ALERT,
        errorCode: BusinessErrorCode.DATA_NOT_FOUND,
        operation: 'getAlertById',
        message: 'Alert not found',
        context: {
          alertId: alertId
        }
      });
    }
    return alerts[0];
  }

  // ==================== 统计接口 ====================

  /**
   * 获取完整的告警统计
   */
  async getStats(): Promise<IAlertStats> {
    const [ruleStats, alertStats] = await Promise.all([
      this.ruleService.getRuleStats(),
      this.queryService.getAlertStatistics(),
    ]);

    return {
      totalRules: ruleStats.totalRules,
      enabledRules: ruleStats.enabledRules,
      activeAlerts: alertStats.activeAlerts,
      criticalAlerts: alertStats.criticalAlerts,
      warningAlerts: alertStats.warningAlerts,
      infoAlerts: alertStats.infoAlerts,
      totalAlertsToday: alertStats.totalAlertsToday,
      resolvedAlertsToday: alertStats.resolvedAlertsToday,
      averageResolutionTime: alertStats.averageResolutionTime,
    };
  }

  /**
   * 获取告警趋势
   */
  async getAlertTrend(
    startDate: Date,
    endDate: Date,
    interval: "hour" | "day" | "week" = "day",
  ) {
    return await this.queryService.getAlertTrend(startDate, endDate, interval);
  }

  // ==================== 缓存管理接口 ====================

  /**
   * 清理过期数据
   */
  async cleanupExpiredData(daysToKeep: number = 7): Promise<{
    timeseriesCleanup: { cleanedKeys: number; errors: string[] };
  }> {
    const timeseriesCleanup =
      await this.cacheService.cleanupTimeseriesData(daysToKeep);

    return { timeseriesCleanup };
  }


  // ==================== 健康检查和监控 ====================

  /**
   * 执行服务健康检查
   */
  async performHealthCheck(): Promise<{
    status: "healthy" | "unhealthy" | "degraded";
    services: Record<string, any>;
    timestamp: Date;
  }> {
    const operation = "HEALTH_CHECK";

    this.logger.debug("执行服务健康检查", { operation });

    try {
      const serviceChecks = {
        ruleService: this.ruleService.getRuleStats(),
        queryService: this.queryService.getQueryStats(),
        // Note: cacheService stats removed - monitoring should be handled by monitoring module
        evaluationService: this.evaluationService.getEvaluationStats(),
        lifecycleService: this.lifecycleService.getLifecycleStats(),
        eventPublisher: this.eventPublisher.getPublisherStats(),
      };

      // 并发执行所有检查
      const results = await Promise.allSettled(
        Object.entries(serviceChecks).map(async ([name, checkFn]) => {
          try {
            const stats = await checkFn;
            return { name, status: "healthy", stats };
          } catch (error) {
            return { name, status: "unhealthy", error: error.message };
          }
        }),
      );

      const services = {};
      let healthyCount = 0;

      results.forEach((result, index) => {
        const serviceName = Object.keys(serviceChecks)[index];
        if (result.status === "fulfilled") {
          services[serviceName] = result.value;
          if (result.value.status === "healthy") {
            healthyCount++;
          }
        } else {
          services[serviceName] = { status: "unhealthy", error: result.reason };
        }
      });

      // 计算整体健康状态
      const totalServices = results.length;
      let overallStatus: "healthy" | "unhealthy" | "degraded";

      if (healthyCount === totalServices) {
        overallStatus = "healthy";
      } else if (healthyCount >= totalServices * 0.7) {
        overallStatus = "degraded";
      } else {
        overallStatus = "unhealthy";
      }

      const healthCheck = {
        status: overallStatus,
        services,
        timestamp: new Date(),
      };

      this.logger.log("服务健康检查完成", {
        operation,
        status: overallStatus,
        healthyServices: healthyCount,
        totalServices,
      });

      return healthCheck;
    } catch (error) {
      this.logger.error("服务健康检查失败", {
        operation,
        error: error.message,
      });

      return {
        status: "unhealthy",
        services: { error: error.message },
        timestamp: new Date(),
      };
    }
  }

  /**
   * 获取服务层统计概览
   */
  async getServiceOverview(): Promise<{
    rules: { total: number; enabled: number; disabled: number };
    alerts: { active: number; resolved: number; acknowledged: number };
    // Note: cache property removed - monitoring should be handled by monitoring module
    performance: { lastEvaluation: Date | null; averageResponseTime: number };
  }> {
    const operation = "SERVICE_OVERVIEW";

    try {
      const [ruleStats, alertStats, evaluationStats] =
        await Promise.all([
          this.ruleService.getRuleStats(),
          this.queryService.getAlertStatistics(),
          // Note: cacheStats removed - monitoring should be handled by monitoring module
          this.evaluationService.getEvaluationStats(),
        ]);

      const overview = {
        rules: {
          total: ruleStats.totalRules,
          enabled: ruleStats.enabledRules,
          disabled: ruleStats.disabledRules,
        },
        alerts: {
          active: alertStats.activeAlerts,
          resolved: alertStats.resolvedAlertsToday,
          acknowledged: 0, // TODO: 添加确认告警统计
        },
        // Note: cache section removed - monitoring should be handled by monitoring module
        performance: {
          lastEvaluation: evaluationStats.lastEvaluationTime,
          averageResponseTime: 0, // TODO: 添加响应时间统计
        },
      };

      this.logger.debug("服务层概览获取完成", {
        operation,
        overview,
      });

      return overview;
    } catch (error) {
      this.logger.error("获取服务层概览失败", {
        operation,
        error: error.message,
      });
      throw error;
    }
  }
}
