/**
 * 通知事件处理器
 * 🎯 处理所有通知相关事件的核心处理器
 * 
 * @description 实现事件驱动架构，处理通知生命周期中的各种事件
 * @author Claude Code Assistant
 * @date 2025-09-12
 */

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { createLogger } from '@appcore/config/logger.config';

// 导入事件类型
import {
  NotificationEvent,
  NotificationEventType,
  NotificationRequestedEvent,
  NotificationSentEvent,
  NotificationDeliveredEvent,
  NotificationFailedEvent,
  NotificationRetriedEvent,
  BatchNotificationStartedEvent,
  BatchNotificationCompletedEvent,
  BatchNotificationFailedEvent,
  NotificationHistoryRecordedEvent,
  NotificationHistoryQueriedEvent,
  NotificationSystemErrorEvent,
  NotificationChannelErrorEvent,
  NotificationEventTypeGuards,
} from '../events/notification.events';

// 导入DTO类型
import {
  CreateNotificationHistoryDto,
  NotificationHistoryDto,
  NotificationStatsDto,
} from '../dto/notification-history.dto';

// 导入服务
import { NotificationHistoryService } from '../services/notification-history.service';

// 导入常量
import { NOTIFICATION_MESSAGES } from '../constants/notification.constants';

/**
 * 通知事件统计接口
 */
interface EventStatistics {
  totalEvents: number;
  eventsByType: Record<NotificationEventType, number>;
  errorEvents: number;
  successEvents: number;
  lastEventAt: Date;
  averageProcessingTime: number;
}

/**
 * 通知事件处理器
 * 使用NestJS EventEmitter装饰器处理事件
 */
@Injectable()
export class NotificationEventHandler {
  private readonly logger = createLogger('NotificationEventHandler');
  
  // 事件处理统计
  private readonly statistics: EventStatistics = {
    totalEvents: 0,
    eventsByType: {} as Record<NotificationEventType, number>,
    errorEvents: 0,
    successEvents: 0,
    lastEventAt: new Date(),
    averageProcessingTime: 0,
  };

  // 处理时间记录（用于计算平均值）
  private processingTimes: number[] = [];

  constructor(
    private readonly historyService: NotificationHistoryService,
  ) {
    this.logger.debug('NotificationEventHandler 已初始化');
    
    // 初始化统计数据
    Object.values(NotificationEventType).forEach(type => {
      this.statistics.eventsByType[type] = 0;
    });
  }

  // ==================== 核心事件处理器 ====================

  /**
   * 处理通知请求事件
   */
  @OnEvent(NotificationEventType.NOTIFICATION_REQUESTED)
  async handleNotificationRequested(event: NotificationRequestedEvent): Promise<void> {
    const startTime = Date.now();

    this.logger.debug('处理通知请求事件', {
      eventId: event.eventId,
      alertId: event.alertId,
      requestId: event.requestId,
      severity: event.severity,
      channelCount: event.channelTypes.length,
    });

    try {
      // 记录通知请求统计
      await this.recordEventStatistics(event);
      
      // 可以在这里添加额外的业务逻辑
      // 例如：验证请求、预处理、路由等
      
      this.logger.debug('通知请求事件处理完成', {
        eventId: event.eventId,
        requestId: event.requestId,
      });

    } catch (error) {
      this.logger.error('处理通知请求事件失败', {
        eventId: event.eventId,
        error: error.message,
      });
    } finally {
      this.updateProcessingTime(startTime);
    }
  }

  /**
   * 处理通知发送成功事件
   */
  @OnEvent(NotificationEventType.NOTIFICATION_SENT)
  async handleNotificationSent(event: NotificationSentEvent): Promise<void> {
    const startTime = Date.now();

    this.logger.debug('处理通知发送成功事件', {
      eventId: event.eventId,
      alertId: event.alertId,
      notificationId: event.notificationId,
      channelType: event.channelType,
    });

    try {
      // 记录到通知历史
      const historyDto: CreateNotificationHistoryDto = {
        notificationId: event.notificationId,
        alertId: event.alertId,
        channelId: event.channelId,
        channelType: event.channelType,
        status: 'sent',
        priority: event.metadata.priority || 'NORMAL',
        recipient: event.recipient,
        title: event.metadata.title || '通知',
        content: event.metadata.content || '',
        sentAt: event.sentAt.toISOString(),
        retryCount: 0,
        duration: event.duration,
        metadata: {
          ...event.metadata,
          eventProcessed: true,
        },
      };

      await this.historyService.logNotificationResult(
        { id: event.notificationId, alertId: event.alertId } as any,
        {
          success: true,
          channelId: event.channelId,
          channelType: event.channelType,
          message: '通知发送成功',
          sentAt: event.sentAt,
          duration: event.duration,
        } as any
      );

      await this.recordEventStatistics(event, true);

      this.logger.debug('通知发送成功事件处理完成', {
        eventId: event.eventId,
        notificationId: event.notificationId,
      });

    } catch (error) {
      this.logger.error('处理通知发送成功事件失败', {
        eventId: event.eventId,
        error: error.message,
      });
    } finally {
      this.updateProcessingTime(startTime);
    }
  }

  /**
   * 处理通知投递成功事件
   */
  @OnEvent(NotificationEventType.NOTIFICATION_DELIVERED)
  async handleNotificationDelivered(event: NotificationDeliveredEvent): Promise<void> {
    const startTime = Date.now();

    this.logger.debug('处理通知投递成功事件', {
      eventId: event.eventId,
      alertId: event.alertId,
      notificationId: event.notificationId,
      confirmationId: event.confirmationId,
    });

    try {
      // 更新历史记录状态
      // 这里需要实现更新历史记录状态的逻辑
      
      await this.recordEventStatistics(event, true);

      this.logger.debug('通知投递成功事件处理完成', {
        eventId: event.eventId,
        notificationId: event.notificationId,
      });

    } catch (error) {
      this.logger.error('处理通知投递成功事件失败', {
        eventId: event.eventId,
        error: error.message,
      });
    } finally {
      this.updateProcessingTime(startTime);
    }
  }

  /**
   * 处理通知发送失败事件
   */
  @OnEvent(NotificationEventType.NOTIFICATION_FAILED)
  async handleNotificationFailed(event: NotificationFailedEvent): Promise<void> {
    const startTime = Date.now();

    this.logger.warn('处理通知发送失败事件', {
      eventId: event.eventId,
      alertId: event.alertId,
      notificationId: event.notificationId,
      channelType: event.channelType,
      error: event.error,
      retryCount: event.retryCount,
      willRetry: event.willRetry,
    });

    try {
      // 记录失败的通知历史
      await this.historyService.logNotificationResult(
        { id: event.notificationId, alertId: event.alertId } as any,
        {
          success: false,
          channelType: event.channelType,
          error: event.error,
          sentAt: event.failedAt,
          retryCount: event.retryCount,
          message: `通知发送失败: ${event.error}`,
        } as any
      );

      // 如果需要重试，这里可以触发重试逻辑
      if (event.willRetry) {
        this.logger.debug('通知将进行重试', {
          notificationId: event.notificationId,
          retryCount: event.retryCount,
        });
        // 可以在这里调用重试服务
      }

      await this.recordEventStatistics(event, false);

      this.logger.debug('通知发送失败事件处理完成', {
        eventId: event.eventId,
        notificationId: event.notificationId,
      });

    } catch (error) {
      this.logger.error('处理通知发送失败事件失败', {
        eventId: event.eventId,
        error: error.message,
      });
    } finally {
      this.updateProcessingTime(startTime);
    }
  }

  /**
   * 处理通知重试事件
   */
  @OnEvent(NotificationEventType.NOTIFICATION_RETRIED)
  async handleNotificationRetried(event: NotificationRetriedEvent): Promise<void> {
    const startTime = Date.now();

    this.logger.debug('处理通知重试事件', {
      eventId: event.eventId,
      alertId: event.alertId,
      notificationId: event.notificationId,
      retryAttempt: event.retryAttempt,
      previousError: event.previousError,
    });

    try {
      await this.recordEventStatistics(event);

      this.logger.debug('通知重试事件处理完成', {
        eventId: event.eventId,
        notificationId: event.notificationId,
        retryAttempt: event.retryAttempt,
      });

    } catch (error) {
      this.logger.error('处理通知重试事件失败', {
        eventId: event.eventId,
        error: error.message,
      });
    } finally {
      this.updateProcessingTime(startTime);
    }
  }

  // ==================== 批量事件处理器 ====================

  /**
   * 处理批量通知开始事件
   */
  @OnEvent(NotificationEventType.BATCH_NOTIFICATION_STARTED)
  async handleBatchNotificationStarted(event: BatchNotificationStartedEvent): Promise<void> {
    const startTime = Date.now();

    this.logger.debug('处理批量通知开始事件', {
      eventId: event.eventId,
      alertId: event.alertId,
      batchId: event.batchId,
      requestCount: event.requestCount,
      concurrency: event.concurrency,
    });

    try {
      await this.recordEventStatistics(event);

      this.logger.debug('批量通知开始事件处理完成', {
        eventId: event.eventId,
        batchId: event.batchId,
      });

    } catch (error) {
      this.logger.error('处理批量通知开始事件失败', {
        eventId: event.eventId,
        error: error.message,
      });
    } finally {
      this.updateProcessingTime(startTime);
    }
  }

  /**
   * 处理批量通知完成事件
   */
  @OnEvent(NotificationEventType.BATCH_NOTIFICATION_COMPLETED)
  async handleBatchNotificationCompleted(event: BatchNotificationCompletedEvent): Promise<void> {
    const startTime = Date.now();

    this.logger.log('处理批量通知完成事件', {
      eventId: event.eventId,
      alertId: event.alertId,
      batchId: event.batchId,
      successCount: event.successCount,
      failureCount: event.failureCount,
      successRate: event.metadata.successRate,
      totalDuration: event.totalDuration,
    });

    try {
      await this.recordEventStatistics(event, event.successCount > 0);

      // 可以在这里添加批量处理完成后的业务逻辑
      // 例如：发送汇总报告、更新统计等

      this.logger.debug('批量通知完成事件处理完成', {
        eventId: event.eventId,
        batchId: event.batchId,
      });

    } catch (error) {
      this.logger.error('处理批量通知完成事件失败', {
        eventId: event.eventId,
        error: error.message,
      });
    } finally {
      this.updateProcessingTime(startTime);
    }
  }

  /**
   * 处理批量通知失败事件
   */
  @OnEvent(NotificationEventType.BATCH_NOTIFICATION_FAILED)
  async handleBatchNotificationFailed(event: BatchNotificationFailedEvent): Promise<void> {
    const startTime = Date.now();

    this.logger.error('处理批量通知失败事件', {
      eventId: event.eventId,
      alertId: event.alertId,
      batchId: event.batchId,
      error: event.error,
      processedCount: event.processedCount,
      totalCount: event.totalCount,
    });

    try {
      await this.recordEventStatistics(event, false);

      this.logger.debug('批量通知失败事件处理完成', {
        eventId: event.eventId,
        batchId: event.batchId,
      });

    } catch (error) {
      this.logger.error('处理批量通知失败事件失败', {
        eventId: event.eventId,
        error: error.message,
      });
    } finally {
      this.updateProcessingTime(startTime);
    }
  }

  // ==================== 历史事件处理器 ====================

  /**
   * 处理通知历史记录事件
   */
  @OnEvent(NotificationEventType.NOTIFICATION_HISTORY_RECORDED)
  async handleNotificationHistoryRecorded(event: NotificationHistoryRecordedEvent): Promise<void> {
    const startTime = Date.now();

    this.logger.debug('处理通知历史记录事件', {
      eventId: event.eventId,
      alertId: event.alertId,
      historyId: event.historyId,
      notificationId: event.notificationId,
      status: event.status,
    });

    try {
      await this.recordEventStatistics(event);

      this.logger.debug('通知历史记录事件处理完成', {
        eventId: event.eventId,
        historyId: event.historyId,
      });

    } catch (error) {
      this.logger.error('处理通知历史记录事件失败', {
        eventId: event.eventId,
        error: error.message,
      });
    } finally {
      this.updateProcessingTime(startTime);
    }
  }

  /**
   * 处理通知历史查询事件
   */
  @OnEvent(NotificationEventType.NOTIFICATION_HISTORY_QUERIED)
  async handleNotificationHistoryQueried(event: NotificationHistoryQueriedEvent): Promise<void> {
    const startTime = Date.now();

    this.logger.debug('处理通知历史查询事件', {
      eventId: event.eventId,
      alertId: event.alertId,
      queryId: event.queryId,
      resultCount: event.resultCount,
      queryDuration: event.queryDuration,
    });

    try {
      await this.recordEventStatistics(event);

      this.logger.debug('通知历史查询事件处理完成', {
        eventId: event.eventId,
        queryId: event.queryId,
      });

    } catch (error) {
      this.logger.error('处理通知历史查询事件失败', {
        eventId: event.eventId,
        error: error.message,
      });
    } finally {
      this.updateProcessingTime(startTime);
    }
  }

  // ==================== 错误事件处理器 ====================

  /**
   * 处理通知系统错误事件
   */
  @OnEvent(NotificationEventType.NOTIFICATION_SYSTEM_ERROR)
  async handleNotificationSystemError(event: NotificationSystemErrorEvent): Promise<void> {
    const startTime = Date.now();

    this.logger.error('处理通知系统错误事件', {
      eventId: event.eventId,
      alertId: event.alertId,
      component: event.component,
      error: event.error,
      context: event.context,
    });

    try {
      await this.recordEventStatistics(event, false);

      // 可以在这里添加错误处理逻辑
      // 例如：发送错误报告、触发自动恢复等

      this.logger.debug('通知系统错误事件处理完成', {
        eventId: event.eventId,
        component: event.component,
      });

    } catch (error) {
      this.logger.error('处理通知系统错误事件失败', {
        eventId: event.eventId,
        error: error.message,
      });
    } finally {
      this.updateProcessingTime(startTime);
    }
  }

  /**
   * 处理通知渠道错误事件
   */
  @OnEvent(NotificationEventType.NOTIFICATION_CHANNEL_ERROR)
  async handleNotificationChannelError(event: NotificationChannelErrorEvent): Promise<void> {
    const startTime = Date.now();

    this.logger.error('处理通知渠道错误事件', {
      eventId: event.eventId,
      alertId: event.alertId,
      channelType: event.channelType,
      channelId: event.channelId,
      error: event.error,
      isChannelDown: event.isChannelDown,
    });

    try {
      await this.recordEventStatistics(event, false);

      // 如果渠道完全不可用，可以在这里触发降级逻辑
      if (event.isChannelDown) {
        this.logger.warn('通知渠道不可用，建议启用降级方案', {
          channelType: event.channelType,
          channelId: event.channelId,
        });
        // 可以在这里触发渠道故障转移逻辑
      }

      this.logger.debug('通知渠道错误事件处理完成', {
        eventId: event.eventId,
        channelType: event.channelType,
      });

    } catch (error) {
      this.logger.error('处理通知渠道错误事件失败', {
        eventId: event.eventId,
        error: error.message,
      });
    } finally {
      this.updateProcessingTime(startTime);
    }
  }

  // ==================== 辅助方法 ====================

  /**
   * 记录事件统计信息
   */
  private async recordEventStatistics(event: NotificationEvent, isSuccess?: boolean): Promise<void> {
    this.statistics.totalEvents++;
    this.statistics.eventsByType[event.eventType]++;
    this.statistics.lastEventAt = event.timestamp;

    if (isSuccess === true) {
      this.statistics.successEvents++;
    } else if (isSuccess === false || NotificationEventTypeGuards.isErrorEvent(event)) {
      this.statistics.errorEvents++;
    }
  }

  /**
   * 更新处理时间统计
   */
  private updateProcessingTime(startTime: number): void {
    const processingTime = Date.now() - startTime;
    this.processingTimes.push(processingTime);

    // 只保留最近100次的处理时间记录
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift();
    }

    // 计算平均处理时间
    this.statistics.averageProcessingTime = 
      this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
  }

  /**
   * 获取事件处理统计信息
   */
  getStatistics(): EventStatistics {
    return { ...this.statistics };
  }

  /**
   * 重置统计信息
   */
  resetStatistics(): void {
    this.statistics.totalEvents = 0;
    this.statistics.errorEvents = 0;
    this.statistics.successEvents = 0;
    this.statistics.averageProcessingTime = 0;
    this.processingTimes = [];
    
    Object.keys(this.statistics.eventsByType).forEach(key => {
      this.statistics.eventsByType[key as NotificationEventType] = 0;
    });
  }

  /**
   * 健康检查
   */
  healthCheck(): { status: 'healthy' | 'unhealthy'; details: any } {
    const errorRate = this.statistics.totalEvents > 0 
      ? this.statistics.errorEvents / this.statistics.totalEvents 
      : 0;

    const isHealthy = errorRate < 0.1 && this.statistics.averageProcessingTime < 1000;

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      details: {
        ...this.statistics,
        errorRate: errorRate.toFixed(3),
        healthCheck: {
          errorRateThreshold: '< 10%',
          processingTimeThreshold: '< 1000ms',
          currentErrorRate: `${(errorRate * 100).toFixed(1)}%`,
          currentAvgProcessingTime: `${this.statistics.averageProcessingTime.toFixed(1)}ms`,
        },
      },
    };
  }
}