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
  UseInterceptors,
  UseFilters,
} from "@nestjs/common";

import { createLogger } from "@common/logging/index";

// 导入通用组件
import {
  ResponseInterceptor,
  RequestTrackingInterceptor,
} from "@common/core/interceptors";
import { GlobalExceptionFilter } from "@common/core/filters";
import {
  ApiSuccessResponse,
  ApiCreatedResponse,
  ApiPaginatedResponse,
  ApiStandardResponses,
} from "@common/core/decorators/swagger-responses.decorator";

// 导入服务
import { NotificationService } from "../services/notification.service";
import { NotificationHistoryService } from "../services/notification-history.service";

// 导入DTO
import { NotificationQueryDto } from "../dto/notification-query.dto";

// 导入常量
import { NOTIFICATION_MESSAGES } from "../constants/notification.constants";

@Controller("notifications")
@UseInterceptors(ResponseInterceptor, RequestTrackingInterceptor)
@UseFilters(GlobalExceptionFilter)
export class NotificationController {
  private readonly logger = createLogger("NotificationController");

  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationHistoryService: NotificationHistoryService,
  ) {}

  /**
   * 获取通知历史
   * GET /notifications
   */
  @ApiPaginatedResponse()
  @ApiStandardResponses()
  @Get()
  async getNotificationHistory(@Query() query: NotificationQueryDto) {
    this.logger.debug("获取通知历史", { query });

    // 直接返回数据，让ResponseInterceptor处理响应格式
    return await this.notificationHistoryService.queryNotificationHistory(
      query,
    );
  }

  /**
   * 获取通知统计信息
   * GET /notifications/stats
   */
  @ApiSuccessResponse()
  @ApiStandardResponses()
  @Get("stats")
  async getNotificationStats(
    @Query("startTime") startTime: string,
    @Query("endTime") endTime: string,
    @Query("period") period: string = "day",
  ) {
    this.logger.debug("获取通知统计信息", { startTime, endTime, period });

    const start = new Date(startTime);
    const end = new Date(endTime);

    // 直接返回业务数据
    return await this.notificationHistoryService.getNotificationStats(
      start,
      end,
      period,
    );
  }

  /**
   * 获取警告的通知历史
   * GET /notifications/alert/:alertId
   */
  @ApiSuccessResponse()
  @ApiStandardResponses()
  @Get("alert/:alertId")
  async getAlertNotificationHistory(@Param("alertId") alertId: string) {
    this.logger.debug("获取警告通知历史", { alertId });

    return await this.notificationHistoryService.getAlertNotificationHistory(
      alertId,
    );
  }

  /**
   * 获取渠道的通知历史
   * GET /notifications/channel/:channelId
   */
  @ApiSuccessResponse()
  @ApiStandardResponses()
  @Get("channel/:channelId")
  async getChannelNotificationHistory(@Param("channelId") channelId: string) {
    this.logger.debug("获取渠道通知历史", { channelId });

    return await this.notificationHistoryService.getChannelNotificationHistory(
      channelId,
    );
  }

  /**
   * 获取失败的通知
   * GET /notifications/failed
   */
  @ApiSuccessResponse()
  @ApiStandardResponses()
  @Get("failed")
  async getFailedNotifications(@Query("hours") hours: string = "24") {
    this.logger.debug("获取失败通知", { hours });

    const hoursNum = parseInt(hours, 10);
    return await this.notificationHistoryService.getFailedNotifications(
      hoursNum,
    );
  }

  /**
   * 测试通知渠道
   * POST /notifications/test
   */
  @ApiSuccessResponse()
  @ApiStandardResponses()
  @Post("test")
  @HttpCode(HttpStatus.OK)
  async testNotificationChannel(
    @Body()
    body: {
      channelType: string;
      config: Record<string, any>;
      message?: string;
    },
  ) {
    this.logger.debug("测试通知渠道", {
      channelType: body.channelType,
      message: body.message,
    });

    const result = await this.notificationService.testNotificationChannel(
      body.channelType as any,
      body.config,
      body.message,
    );

    // 直接返回业务数据，ResponseInterceptor会处理响应格式和消息
    return { success: result };
  }

  /**
   * 重试失败的通知
   * POST /notifications/:notificationId/retry
   */
  @ApiSuccessResponse()
  @ApiStandardResponses()
  @Post(":notificationId/retry")
  @HttpCode(HttpStatus.OK)
  async retryNotification(@Param("notificationId") notificationId: string) {
    this.logger.debug("重试通知", { notificationId });

    const result =
      await this.notificationHistoryService.retryFailedNotification(
        notificationId,
      );

    // 直接返回业务数据
    return { success: result };
  }

  /**
   * 批量重试失败的通知
   * POST /notifications/retry-batch
   */
  @ApiSuccessResponse()
  @ApiStandardResponses()
  @Post("retry-batch")
  @HttpCode(HttpStatus.OK)
  async retryFailedNotifications(
    @Body()
    body: {
      alertId?: string;
      channelType?: string;
      maxRetries?: number;
    },
  ) {
    this.logger.debug("批量重试失败通知", body);

    return await this.notificationHistoryService.retryFailedNotifications(
      body.alertId,
      body.channelType,
      body.maxRetries,
    );
  }

  /**
   * 清理过期通知日志
   * POST /notifications/cleanup
   */
  @ApiSuccessResponse()
  @ApiStandardResponses()
  @Post("cleanup")
  @HttpCode(HttpStatus.OK)
  async cleanupExpiredLogs(@Body() body: { retentionDays?: number }) {
    this.logger.debug("清理过期通知日志", body);

    const deletedCount =
      await this.notificationHistoryService.cleanupExpiredLogs(
        body.retentionDays,
      );

    return { deletedCount };
  }
}
