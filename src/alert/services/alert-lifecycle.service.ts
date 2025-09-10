/**
 * Alert生命周期服务
 * 🎯 专门负责告警的创建、更新、解决等生命周期管理
 * 
 * @description 单一职责：告警状态转换和生命周期事件
 * @author Claude Code Assistant
 * @date 2025-09-10
 */

import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { createLogger } from '@app/config/logger.config';
import { AlertHistoryRepository } from '../repositories/alert-history.repository';
import { IAlert, IAlertRule, IRuleEvaluationResult } from '../interfaces';
import { AlertStatus } from '../types/alert.types';
import { AlertEventPublisher } from './alert-event-publisher.service';
import { AlertCacheService } from './alert-cache.service';

@Injectable()
export class AlertLifecycleService {
  private readonly logger = createLogger('AlertLifecycleService');

  constructor(
    private readonly alertHistoryRepository: AlertHistoryRepository,
    private readonly alertEventPublisher: AlertEventPublisher,
    private readonly alertCacheService: AlertCacheService,
  ) {}

  /**
   * 创建新告警
   */
  async createAlert(result: IRuleEvaluationResult, rule: IAlertRule): Promise<IAlert> {
    const operation = 'CREATE_ALERT';
    
    this.logger.debug('创建新告警', {
      operation,
      ruleId: rule.id,
      ruleName: rule.name,
      triggered: result.triggered,
    });

    try {
      const alertData = {
        ruleId: rule.id,
        ruleName: rule.name,
        metric: rule.metric,
        value: result.value,
        threshold: result.threshold,
        severity: rule.severity,
        message: result.message,
        tags: rule.tags,
        context: result.context,
      };

      const alert = await this.alertHistoryRepository.create({
        ...alertData,
        id: this.generateAlertId(),
        startTime: new Date(),
        status: AlertStatus.FIRING,
      });

      // 缓存告警
      await this.alertCacheService.setActiveAlert(alert.ruleId, alert);

      // 发布告警触发事件
      await this.alertEventPublisher.publishAlertFiredEvent(alert, rule, {
        metricValue: result.value,
        threshold: result.threshold,
        triggeredAt: new Date(),
        tags: rule.tags,
        triggerCondition: {
          operator: rule.operator || '>',
          duration: rule.duration || 300,
        },
      });

      this.logger.log('告警创建成功', {
        operation,
        alertId: alert.id,
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
      });

      return alert;
    } catch (error) {
      this.logger.error('告警创建失败', {
        operation,
        ruleId: rule.id,
        ruleName: rule.name,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 确认告警
   */
  async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string,
    comment?: string
  ): Promise<IAlert> {
    const operation = 'ACKNOWLEDGE_ALERT';
    
    this.logger.debug('确认告警', {
      operation,
      alertId,
      acknowledgedBy,
    });

    try {
      const alert = await this.updateAlertStatus(
        alertId,
        AlertStatus.ACKNOWLEDGED,
        acknowledgedBy
      );

      // 发布告警确认事件
      await this.alertEventPublisher.publishAlertAcknowledgedEvent(
        alert,
        acknowledgedBy,
        new Date(),
        comment
      );

      this.logger.log('告警确认成功', {
        operation,
        alertId,
        acknowledgedBy,
      });

      return alert;
    } catch (error) {
      this.logger.error('告警确认失败', {
        operation,
        alertId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 解决告警
   */
  async resolveAlert(
    alertId: string,
    resolvedBy: string,
    ruleId: string,
    comment?: string
  ): Promise<IAlert> {
    const operation = 'RESOLVE_ALERT';
    
    this.logger.debug('解决告警', {
      operation,
      alertId,
      resolvedBy,
      ruleId,
    });

    try {
      const alert = await this.updateAlertStatus(
        alertId,
        AlertStatus.RESOLVED,
        resolvedBy
      );

      // 清除活跃告警缓存
      await this.alertCacheService.clearActiveAlert(ruleId);

      // 发布告警解决事件
      await this.alertEventPublisher.publishAlertResolvedEvent(
        alert,
        new Date(),
        resolvedBy,
        comment
      );

      this.logger.log('告警解决成功', {
        operation,
        alertId,
        resolvedBy,
      });

      return alert;
    } catch (error) {
      this.logger.error('告警解决失败', {
        operation,
        alertId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 抑制告警
   */
  async suppressAlert(
    alertId: string,
    suppressedBy: string,
    suppressionDuration: number,
    reason?: string
  ): Promise<IAlert> {
    const operation = 'SUPPRESS_ALERT';
    
    this.logger.debug('抑制告警', {
      operation,
      alertId,
      suppressedBy,
      suppressionDuration,
    });

    try {
      const alert = await this.updateAlertStatus(
        alertId,
        AlertStatus.SUPPRESSED,
        suppressedBy
      );

      // 发布告警抑制事件
      await this.alertEventPublisher.publishAlertSuppressedEvent(
        alert,
        suppressedBy,
        new Date(),
        suppressionDuration,
        reason
      );

      this.logger.log('告警抑制成功', {
        operation,
        alertId,
        suppressedBy,
        suppressionDuration,
      });

      return alert;
    } catch (error) {
      this.logger.error('告警抑制失败', {
        operation,
        alertId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 升级告警严重程度
   */
  async escalateAlert(
    alertId: string,
    newSeverity: string,
    escalatedBy: string,
    reason?: string
  ): Promise<IAlert> {
    const operation = 'ESCALATE_ALERT';
    
    this.logger.debug('升级告警严重程度', {
      operation,
      alertId,
      newSeverity,
      escalatedBy,
    });

    try {
      const existingAlert = await this.alertHistoryRepository.findById(alertId);
      if (!existingAlert) {
        throw new NotFoundException(`告警 ${alertId} 不存在`);
      }

      const previousSeverity = existingAlert.severity;
      
      const alert = await this.alertHistoryRepository.update(alertId, {
        severity: newSeverity as any, // Type conversion handled at runtime
      });

      if (!alert) {
        throw new NotFoundException(`更新后未找到告警 ${alertId}`);
      }

      // 发布告警升级事件
      await this.alertEventPublisher.publishAlertEscalatedEvent(
        alert,
        previousSeverity,
        newSeverity,
        new Date(),
        reason
      );

      this.logger.log('告警升级成功', {
        operation,
        alertId,
        previousSeverity,
        newSeverity,
        escalatedBy,
      });

      return alert;
    } catch (error) {
      this.logger.error('告警升级失败', {
        operation,
        alertId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 批量更新告警状态
   */
  async batchUpdateAlertStatus(
    alertIds: string[],
    status: AlertStatus,
    updatedBy: string
  ): Promise<{
    successCount: number;
    failedCount: number;
    errors: string[];
  }> {
    const operation = 'BATCH_UPDATE_STATUS';
    
    if (alertIds.length > 1000) {
      throw new Error('批量操作数量超出限制，最大允许1000个');
    }

    this.logger.log('批量更新告警状态', {
      operation,
      alertCount: alertIds.length,
      status,
      updatedBy,
    });

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    const results = await Promise.allSettled(
      alertIds.map(async (alertId) => {
        try {
          await this.updateAlertStatus(alertId, status, updatedBy);
          successCount++;
        } catch (error) {
          failedCount++;
          errors.push(`${alertId}: ${error.message}`);
        }
      })
    );

    this.logger.log('批量更新告警状态完成', {
      operation,
      successCount,
      failedCount,
      total: alertIds.length,
      successRate: (successCount / alertIds.length) * 100,
    });

    return { successCount, failedCount, errors };
  }

  /**
   * 获取告警详细信息
   */
  async getAlertById(alertId: string): Promise<IAlert> {
    const operation = 'GET_ALERT_BY_ID';
    
    try {
      const alert = await this.alertHistoryRepository.findById(alertId);
      
      if (!alert) {
        throw new NotFoundException(`告警 ${alertId} 不存在`);
      }

      this.logger.debug('获取告警详情成功', {
        operation,
        alertId,
        status: alert.status,
        severity: alert.severity,
      });

      return alert;
    } catch (error) {
      this.logger.error('获取告警详情失败', {
        operation,
        alertId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 更新告警状态的通用方法
   */
  private async updateAlertStatus(
    alertId: string,
    status: AlertStatus,
    updatedBy: string
  ): Promise<IAlert> {
    const updateData: any = { status };

    if (status === AlertStatus.ACKNOWLEDGED) {
      updateData.acknowledgedBy = updatedBy;
      updateData.acknowledgedAt = new Date();
    } else if (status === AlertStatus.RESOLVED) {
      updateData.resolvedBy = updatedBy;
      updateData.resolvedAt = new Date();
      updateData.endTime = new Date();
    }

    const alert = await this.alertHistoryRepository.update(alertId, updateData);
    
    if (!alert) {
      throw new NotFoundException(`更新后未找到告警 ${alertId}`);
    }

    return alert;
  }

  /**
   * 生成告警ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * 获取生命周期服务统计
   */
  getLifecycleStats(): {
    totalAlertsCreated: number;
    totalAlertsResolved: number;
    totalAlertsAcknowledged: number;
    averageResolutionTime: number;
  } {
    // TODO: 实现生命周期统计追踪
    return {
      totalAlertsCreated: 0,
      totalAlertsResolved: 0,
      totalAlertsAcknowledged: 0,
      averageResolutionTime: 0,
    };
  }
}