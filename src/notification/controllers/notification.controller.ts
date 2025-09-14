/**
 * 通知控制器
 * 🎯 提供通知相关的REST API接口
 * 
 * @description 从Alert模块拆分出来的独立通知API
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { createLogger } from '@appcore/config/logger.config';

// 导入服务
import { NotificationService } from '../services/notification.service';
import { NotificationHistoryService } from '../services/notification-history.service';

// 导入类型
import type {
  NotificationQuery,
  NotificationStats,
} from '../types/notification.types';

// 导入常量
import { NOTIFICATION_MESSAGES } from '../constants/notification.constants';

@Controller('notifications')
export class NotificationController {
  private readonly logger = createLogger('NotificationController');

  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationHistoryService: NotificationHistoryService,
  ) {}

  /**
   * 获取通知历史
   * GET /notifications
   */
  @Get()
  async getNotificationHistory(@Query() query: NotificationQuery) {
    this.logger.debug('获取通知历史', { query });

    const result = await this.notificationHistoryService.queryNotificationHistory(query);

    return {
      message: '获取通知历史成功',
      data: result.items,
      pagination: result.pagination,
    };
  }

  /**
   * 获取通知统计信息
   * GET /notifications/stats
   */
  @Get('stats')
  async getNotificationStats(
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Query('period') period: string = 'day',
  ) {
    this.logger.debug('获取通知统计信息', { startTime, endTime, period });

    const start = new Date(startTime);
    const end = new Date(endTime);

    const stats = await this.notificationHistoryService.getNotificationStats(
      start,
      end,
      period
    );

    return {
      message: '获取通知统计成功',
      data: stats,
    };
  }

  /**
   * 获取警告的通知历史
   * GET /notifications/alert/:alertId
   */
  @Get('alert/:alertId')
  async getAlertNotificationHistory(@Param('alertId') alertId: string) {
    this.logger.debug('获取警告通知历史', { alertId });

    const notifications = await this.notificationHistoryService.getAlertNotificationHistory(alertId);

    return {
      message: '获取警告通知历史成功',
      data: notifications,
    };
  }

  /**
   * 获取渠道的通知历史
   * GET /notifications/channel/:channelId
   */
  @Get('channel/:channelId')
  async getChannelNotificationHistory(@Param('channelId') channelId: string) {
    this.logger.debug('获取渠道通知历史', { channelId });

    const notifications = await this.notificationHistoryService.getChannelNotificationHistory(channelId);

    return {
      message: '获取渠道通知历史成功',
      data: notifications,
    };
  }

  /**
   * 获取失败的通知
   * GET /notifications/failed
   */
  @Get('failed')
  async getFailedNotifications(@Query('hours') hours: string = '24') {
    this.logger.debug('获取失败通知', { hours });

    const hoursNum = parseInt(hours, 10);
    const failedNotifications = await this.notificationHistoryService.getFailedNotifications(hoursNum);

    return {
      message: '获取失败通知成功',
      data: failedNotifications,
    };
  }

  /**
   * 测试通知渠道
   * POST /notifications/test/:channelId
   */
  @Post('test')
  @HttpCode(HttpStatus.OK)
  async testNotificationChannel(
    @Body() body: { 
      channelType: string;
      config: Record<string, any>;
      message?: string;
    },
  ) {
    this.logger.debug('测试通知渠道', { 
      channelType: body.channelType, 
      message: body.message 
    });

    const result = await this.notificationService.testNotificationChannel(
      body.channelType as any,
      body.config,
      body.message
    );

    const message = result
      ? NOTIFICATION_MESSAGES.CHANNEL_TEST_PASSED
      : NOTIFICATION_MESSAGES.CHANNEL_TEST_FAILED;

    return {
      message,
      data: { success: result },
    };
  }

  /**
   * 重试失败的通知
   * POST /notifications/:notificationId/retry
   */
  @Post(':notificationId/retry')
  @HttpCode(HttpStatus.OK)
  async retryNotification(@Param('notificationId') notificationId: string) {
    this.logger.debug('重试通知', { notificationId });

    const result = await this.notificationHistoryService.retryFailedNotification(notificationId);

    const message = result
      ? NOTIFICATION_MESSAGES.NOTIFICATION_RETRIED
      : NOTIFICATION_MESSAGES.NOTIFICATION_FAILED;

    return {
      message,
      data: { success: result },
    };
  }

  /**
   * 批量重试失败的通知
   * POST /notifications/retry-batch
   */
  @Post('retry-batch')
  @HttpCode(HttpStatus.OK)
  async retryFailedNotifications(
    @Body() body: {
      alertId?: string;
      channelType?: string;
      maxRetries?: number;
    },
  ) {
    this.logger.debug('批量重试失败通知', body);

    const result = await this.notificationHistoryService.retryFailedNotifications(
      body.alertId,
      body.channelType,
      body.maxRetries
    );

    return {
      message: '批量重试完成',
      data: result,
    };
  }

  /**
   * 清理过期通知日志
   * POST /notifications/cleanup
   */
  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  async cleanupExpiredLogs(@Body() body: { retentionDays?: number }) {
    this.logger.debug('清理过期通知日志', body);

    const deletedCount = await this.notificationHistoryService.cleanupExpiredLogs(
      body.retentionDays
    );

    return {
      message: '过期日志清理完成',
      data: { deletedCount },
    };
  }
}