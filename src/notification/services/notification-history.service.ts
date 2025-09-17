/**
 * 通知历史服务
 * 🎯 负责通知历史的记录、查询和统计
 *
 * @description 从Alert模块拆分出来的通知历史管理服务
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, FilterQuery } from "mongoose";

import { createLogger } from "@common/logging/index";
import { PaginationService } from "@common/modules/pagination/services/pagination.service";
import { PaginatedDataDto } from "@common/modules/pagination/dto/paginated-data";
import { DatabaseValidationUtils } from "@common/utils/database.utils";

// 导入通知类型
import {
  Notification,
  NotificationLog as INotificationLog,
  NotificationQuery,
  NotificationStats,
  NotificationResult,
  NotificationChannelType,
  NotificationPriority,
  NotificationStatus,
} from "../types/notification.types";

// 导入常量
import { NOTIFICATION_MESSAGES } from "../constants/notification.constants";

// 导入Schema和数据模型
import {
  NotificationLog,
  NotificationLogDocument,
} from "../schemas/notification-log.schema";
import {
  NotificationInstance,
  NotificationDocument,
} from "../schemas/notification.schema";

// 导入DTO
import {
  CreateNotificationHistoryDto,
  NotificationHistoryDto,
  NotificationStatsDto,
} from "../dto/notification-history.dto";
import { NotificationQueryDto } from "../dto/notification-query.dto";

// 导入事件发布器 (可选)
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class NotificationHistoryService {
  private readonly logger = createLogger("NotificationHistoryService");

  constructor(
    @InjectModel(NotificationLog.name)
    private readonly notificationLogModel: Model<NotificationLogDocument>,
    @InjectModel(NotificationInstance.name)
    private readonly notificationModel: Model<NotificationDocument>,
    private readonly paginationService: PaginationService,
  ) {
    this.logger.debug("NotificationHistoryService 已初始化");
  }

  /**
   * 记录通知发送日志
   */
  async logNotificationResult(
    notification: Notification,
    result: NotificationResult,
  ): Promise<INotificationLog> {
    this.logger.debug("记录通知发送日志", {
      notificationId: notification.id,
      channelType: result.channelType,
      success: result.success,
    });

    try {
      // 1. 创建NotificationLog实例
      const logData = {
        notificationId: notification.id,
        alertId: notification.alertId,
        channelId: result.channelId,
        channelType: result.channelType,
        success: result.success,
        message: result.message,
        error: result.error,
        sentAt: result.sentAt,
        duration: result.duration,
        retryCount: result.retryCount || 0,
        metadata: {
          originalNotification: {
            id: notification.id,
            title: notification.title,
            priority: notification.priority,
            recipient: notification.recipient,
          },
          result: {
            success: result.success,
            channelId: result.channelId,
            channelType: result.channelType,
            duration: result.duration,
          },
          timestamp: new Date().toISOString(),
        },
      };

      // 2. 保存到数据库
      const savedLog = await this.notificationLogModel.create(logData);

      this.logger.debug("通知日志记录成功", {
        logId: savedLog.id,
        notificationId: notification.id,
        success: result.success,
      });

      // 3. 返回保存的日志
      const log: INotificationLog = {
        id: savedLog.id,
        notificationId: savedLog.notificationId,
        alertId: savedLog.alertId,
        channelId: savedLog.channelId,
        channelType: savedLog.channelType,
        success: savedLog.success,
        message: savedLog.message,
        error: savedLog.error,
        sentAt: savedLog.sentAt,
        duration: savedLog.duration,
        retryCount: savedLog.retryCount,
        metadata: savedLog.metadata,
      };

      return log;
    } catch (error) {
      this.logger.error("记录通知日志失败", {
        notificationId: notification.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 查询通知历史
   */
  async queryNotificationHistory(
    query: NotificationQueryDto,
  ): Promise<PaginatedDataDto<Notification>> {
    this.logger.debug("查询通知历史", {
      alertId: query.alertId,
      channelType: query.channelType,
      status: query.status,
      page: query.page,
      limit: query.limit,
    });

    try {
      // 1. 构建查询条件
      const filter: FilterQuery<NotificationDocument> = {};

      if (query.alertId) {
        filter.alertId = query.alertId;
      }

      if (query.channelType) {
        filter.channelType = query.channelType;
      }

      if (query.status) {
        filter.status = query.status;
      }

      if (query.recipient) {
        filter.recipient = { $regex: query.recipient, $options: "i" };
      }

      if (query.startTime || query.endTime) {
        filter.createdAt = {};
        if (query.startTime) {
          filter.createdAt.$gte = new Date(query.startTime);
        }
        if (query.endTime) {
          filter.createdAt.$lte = new Date(query.endTime);
        }
      }

      // 2. 使用通用分页器标准化分页参数
      const { page, limit } =
        this.paginationService.normalizePaginationQuery(query);
      const skip = this.paginationService.calculateSkip(page, limit);

      // 3. 执行数据库查询
      const [notifications, total] = await Promise.all([
        this.notificationModel
          .find(filter)
          .sort({ createdAt: -1 }) // 按创建时间倒序
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.notificationModel.countDocuments(filter).exec(),
      ]);

      // 4. 转换数据格式
      const transformedNotifications = notifications.map((notification) => ({
        id: notification._id?.toString() || "",
        alertId: notification.alertId?.toString() || "",
        channelId: notification.channelId?.toString() || "",
        channelType: notification.channelType,
        title: notification.title,
        content: notification.content,
        status: notification.status,
        priority: notification.priority,
        recipient: notification.recipient,
        sentAt: notification.sentAt,
        deliveredAt: notification.deliveredAt,
        failedAt: notification.failedAt,
        errorMessage: notification.errorMessage,
        retryCount: notification.retryCount,
        duration: notification.duration,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt,
      }));

      this.logger.debug("通知历史查询完成", {
        total,
        page,
        limit,
        filterCount: Object.keys(filter).length,
      });

      // 5. 使用通用分页器创建标准分页响应
      return this.paginationService.createPaginatedResponse(
        transformedNotifications,
        page,
        limit,
        total,
      );
    } catch (error) {
      this.logger.error("查询通知历史失败", {
        query,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 获取通知统计信息
   */
  async getNotificationStats(
    startTime: Date,
    endTime: Date,
    period: string = "day",
  ): Promise<NotificationStats> {
    this.logger.debug("获取通知统计信息", {
      startTime,
      endTime,
      period,
    });

    try {
      // 1. 查询指定时间范围的通知数据
      const filter: FilterQuery<NotificationLogDocument> = {
        sentAt: {
          $gte: startTime,
          $lte: endTime,
        },
      };

      // 2. 使用聚合查询统计数据
      const [overallStats, channelStats, priorityStats, statusStats] =
        await Promise.all([
          // 总体统计
          this.notificationLogModel
            .aggregate([
              { $match: filter },
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  successful: {
                    $sum: { $cond: [{ $eq: ["$success", true] }, 1, 0] },
                  },
                  failed: {
                    $sum: { $cond: [{ $eq: ["$success", false] }, 1, 0] },
                  },
                  totalDuration: { $sum: "$duration" },
                  averageDuration: { $avg: "$duration" },
                },
              },
            ])
            .exec(),

          // 按渠道统计
          this.notificationLogModel
            .aggregate([
              { $match: filter },
              {
                $group: {
                  _id: "$channelType",
                  total: { $sum: 1 },
                  successful: {
                    $sum: { $cond: [{ $eq: ["$success", true] }, 1, 0] },
                  },
                  failed: {
                    $sum: { $cond: [{ $eq: ["$success", false] }, 1, 0] },
                  },
                  averageDuration: { $avg: "$duration" },
                },
              },
            ])
            .exec(),

          // 按优先级统计 (从通知表查询)
          this.notificationModel
            .aggregate([
              {
                $match: {
                  createdAt: {
                    $gte: startTime,
                    $lte: endTime,
                  },
                },
              },
              {
                $group: {
                  _id: "$priority",
                  total: { $sum: 1 },
                  successful: {
                    $sum: { $cond: [{ $eq: ["$status", "sent"] }, 1, 0] },
                  },
                  failed: {
                    $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
                  },
                },
              },
            ])
            .exec(),

          // 按状态统计 (从通知表查询)
          this.notificationModel
            .aggregate([
              {
                $match: {
                  createdAt: {
                    $gte: startTime,
                    $lte: endTime,
                  },
                },
              },
              {
                $group: {
                  _id: "$status",
                  count: { $sum: 1 },
                },
              },
            ])
            .exec(),
        ]);

      // 3. 构建结果统计
      const overall = overallStats[0] || {
        total: 0,
        successful: 0,
        failed: 0,
        averageDuration: 0,
      };

      // 初始化渠道统计
      const byChannel: NotificationStats["byChannel"] = {
        [NotificationChannelType.EMAIL]: {
          total: 0,
          successful: 0,
          failed: 0,
          averageSendTime: 0,
        },
        [NotificationChannelType.WEBHOOK]: {
          total: 0,
          successful: 0,
          failed: 0,
          averageSendTime: 0,
        },
        [NotificationChannelType.SLACK]: {
          total: 0,
          successful: 0,
          failed: 0,
          averageSendTime: 0,
        },
        [NotificationChannelType.DINGTALK]: {
          total: 0,
          successful: 0,
          failed: 0,
          averageSendTime: 0,
        },
        [NotificationChannelType.SMS]: {
          total: 0,
          successful: 0,
          failed: 0,
          averageSendTime: 0,
        },
        [NotificationChannelType.LOG]: {
          total: 0,
          successful: 0,
          failed: 0,
          averageSendTime: 0,
        },
      };

      // 填充渠道统计数据
      channelStats.forEach((stat) => {
        if (byChannel[stat._id as NotificationChannelType]) {
          byChannel[stat._id as NotificationChannelType] = {
            total: stat.total,
            successful: stat.successful,
            failed: stat.failed,
            averageSendTime: Math.round(stat.averageDuration || 0),
          };
        }
      });

      // 初始化优先级统计
      const byPriority: NotificationStats["byPriority"] = {
        [NotificationPriority.LOW]: { total: 0, successful: 0, failed: 0 },
        [NotificationPriority.NORMAL]: { total: 0, successful: 0, failed: 0 },
        [NotificationPriority.HIGH]: { total: 0, successful: 0, failed: 0 },
        [NotificationPriority.URGENT]: { total: 0, successful: 0, failed: 0 },
        [NotificationPriority.CRITICAL]: { total: 0, successful: 0, failed: 0 },
      };

      // 填充优先级统计数据
      priorityStats.forEach((stat) => {
        if (byPriority[stat._id as NotificationPriority]) {
          byPriority[stat._id as NotificationPriority] = {
            total: stat.total,
            successful: stat.successful,
            failed: stat.failed,
          };
        }
      });

      // 初始化状态统计
      const byStatus: NotificationStats["byStatus"] = {
        [NotificationStatus.PENDING]: 0,
        [NotificationStatus.SENT]: 0,
        [NotificationStatus.DELIVERED]: 0,
        [NotificationStatus.FAILED]: 0,
        [NotificationStatus.RETRY]: 0,
      };

      // 填充状态统计数据
      statusStats.forEach((stat) => {
        if (byStatus[stat._id as NotificationStatus] !== undefined) {
          byStatus[stat._id as NotificationStatus] = stat.count;
        }
      });

      const stats: NotificationStats = {
        timestamp: new Date(),
        period,
        totalNotifications: overall.total,
        successfulNotifications: overall.successful,
        failedNotifications: overall.failed,
        averageSendTime: Math.round(overall.averageDuration || 0),
        byChannel,
        byPriority,
        byStatus,
      };

      this.logger.debug("通知统计查询完成", {
        period,
        startTime,
        endTime,
        totalNotifications: stats.totalNotifications,
        successfulNotifications: stats.successfulNotifications,
        failedNotifications: stats.failedNotifications,
      });

      return stats;
    } catch (error) {
      this.logger.error("获取通知统计失败", {
        startTime,
        endTime,
        period,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 获取警告的通知历史
   */
  async getAlertNotificationHistory(alertId: string): Promise<Notification[]> {
    this.logger.debug("获取警告通知历史", { alertId });

    // 验证ObjectId格式
    DatabaseValidationUtils.validateObjectId(alertId, "警告ID");

    try {
      const notifications = await this.notificationModel
        .find({ alertId })
        .sort({ createdAt: -1 }) // 按创建时间倒序
        .lean()
        .exec();

      const result = notifications.map((notification) => ({
        id: notification._id?.toString() || "",
        alertId: notification.alertId?.toString() || alertId,
        channelId: notification.channelId?.toString() || "",
        channelType: notification.channelType,
        title: notification.title,
        content: notification.content,
        status: notification.status,
        priority: notification.priority,
        recipient: notification.recipient,
        sentAt: notification.sentAt,
        deliveredAt: notification.deliveredAt,
        failedAt: notification.failedAt,
        errorMessage: notification.errorMessage,
        retryCount: notification.retryCount,
        duration: notification.duration,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt,
      }));

      this.logger.debug("警告通知历史查询完成", {
        alertId,
        count: result.length,
      });

      return result;
    } catch (error) {
      this.logger.error("查询警告通知历史失败", {
        alertId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 获取渠道的通知历史
   */
  async getChannelNotificationHistory(
    channelId: string,
  ): Promise<Notification[]> {
    this.logger.debug("获取渠道通知历史", { channelId });

    // 验证ObjectId格式
    DatabaseValidationUtils.validateObjectId(channelId, "渠道ID");

    try {
      const notifications = await this.notificationModel
        .find({ channelId })
        .sort({ createdAt: -1 }) // 按创建时间倒序
        .lean()
        .exec();

      const result = notifications.map((notification) => ({
        id: notification._id?.toString() || "",
        alertId: notification.alertId?.toString() || "",
        channelId: notification.channelId?.toString() || channelId,
        channelType: notification.channelType,
        title: notification.title,
        content: notification.content,
        status: notification.status,
        priority: notification.priority,
        recipient: notification.recipient,
        sentAt: notification.sentAt,
        deliveredAt: notification.deliveredAt,
        failedAt: notification.failedAt,
        errorMessage: notification.errorMessage,
        retryCount: notification.retryCount,
        duration: notification.duration,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt,
      }));

      this.logger.debug("渠道通知历史查询完成", {
        channelId,
        count: result.length,
      });

      return result;
    } catch (error) {
      this.logger.error("查询渠道通知历史失败", {
        channelId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 清理过期的通知日志
   */
  async cleanupExpiredLogs(retentionDays: number = 30): Promise<number> {
    this.logger.debug("清理过期通知日志", { retentionDays });

    try {
      // 1. 计算过期时间点
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - retentionDays);

      // 2. 删除过期的通知日志
      const result = await this.notificationLogModel
        .deleteMany({
          createdAt: { $lt: expiredDate },
        })
        .exec();

      // 3. 返回清理的记录数
      const deletedCount = result.deletedCount || 0;

      this.logger.log("过期通知日志清理完成", {
        retentionDays,
        expiredDate: expiredDate.toISOString(),
        deletedCount,
      });

      return deletedCount;
    } catch (error) {
      this.logger.error("清理过期日志失败", {
        retentionDays,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 获取通知发送失败的记录
   */
  async getFailedNotifications(hours: number = 24): Promise<Notification[]> {
    this.logger.debug("获取通知发送失败记录", { hours });

    try {
      // 1. 计算时间范围
      const timeThreshold = new Date();
      timeThreshold.setHours(timeThreshold.getHours() - hours);

      // 2. 查询指定时间内发送失败的通知
      const notifications = await this.notificationModel
        .find({
          status: NotificationStatus.FAILED,
          failedAt: { $gte: timeThreshold },
        })
        .sort({ failedAt: -1 }) // 按失败时间倒序
        .lean()
        .exec();

      // 3. 返回失败记录列表
      const result = notifications.map((notification) => ({
        id: notification._id?.toString() || "",
        alertId: notification.alertId?.toString() || "",
        channelId: notification.channelId?.toString() || "",
        channelType: notification.channelType,
        title: notification.title,
        content: notification.content,
        status: notification.status,
        priority: notification.priority,
        recipient: notification.recipient,
        sentAt: notification.sentAt,
        deliveredAt: notification.deliveredAt,
        failedAt: notification.failedAt,
        errorMessage: notification.errorMessage,
        retryCount: notification.retryCount,
        duration: notification.duration,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt,
      }));

      this.logger.debug("失败通知查询完成", {
        hours,
        timeThreshold: timeThreshold.toISOString(),
        count: result.length,
      });

      return result;
    } catch (error) {
      this.logger.error("查询失败通知失败", {
        hours,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 重试失败的通知
   */
  async retryFailedNotification(notificationId: string): Promise<boolean> {
    this.logger.debug("重试失败通知", { notificationId });

    // 验证ObjectId格式
    DatabaseValidationUtils.validateObjectId(notificationId, "通知ID");

    try {
      // 1. 获取失败的通知记录
      const notification = await this.notificationModel
        .findOne({
          _id: notificationId,
          status: NotificationStatus.FAILED,
        })
        .exec();

      if (!notification) {
        this.logger.warn("未找到可重试的通知", { notificationId });
        return false;
      }

      // 2. 检查重试次数限制 (最夵3次)
      const maxRetries = 3;
      if (notification.retryCount >= maxRetries) {
        this.logger.warn("通知重试次数超限", {
          notificationId,
          retryCount: notification.retryCount,
          maxRetries,
        });
        return false;
      }

      // 3. 更新通知状态为重试中
      await this.notificationModel
        .updateOne(
          { _id: notificationId },
          {
            $inc: { retryCount: 1 },
            $set: {
              status: NotificationStatus.RETRY,
              updatedAt: new Date(),
            },
            $unset: {
              errorMessage: "",
              failedAt: "",
            },
          },
        )
        .exec();

      // 4. 记录重试日志
      this.logger.log(NOTIFICATION_MESSAGES.NOTIFICATION_RETRIED, {
        notificationId,
        retryCount: notification.retryCount + 1,
        alertId: notification.alertId?.toString(),
        channelType: notification.channelType,
      });

      // 注意: 实际的重新发送逻辑应该由NotificationService或专门的重试服务处理
      // 这里只更新状态，标记为可以重试

      return true;
    } catch (error) {
      this.logger.error("通知重试失败", {
        notificationId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * 批量重试失败的通知
   */
  async retryFailedNotifications(
    alertId?: string,
    channelType?: string,
    maxRetries: number = 3,
  ): Promise<{
    total: number;
    retried: number;
    failed: number;
  }> {
    this.logger.debug("批量重试失败通知", {
      alertId,
      channelType,
      maxRetries,
    });

    try {
      // 构建查询条件
      const filter: FilterQuery<NotificationDocument> = {
        status: NotificationStatus.FAILED,
        retryCount: { $lt: maxRetries },
      };

      if (alertId) {
        filter.alertId = alertId;
      }

      if (channelType) {
        filter.channelType = channelType as NotificationChannelType;
      }

      // 查找符合条件的失败通知
      const failedNotifications = await this.notificationModel
        .find(filter)
        .limit(100) // 限制批量处理数量
        .exec();

      const total = failedNotifications.length;
      let retried = 0;
      let failed = 0;

      // 批量处理重试
      for (const notification of failedNotifications) {
        try {
          const success = await this.retryFailedNotification(
            notification._id.toString(),
          );
          if (success) {
            retried++;
          } else {
            failed++;
          }
        } catch (error) {
          failed++;
          this.logger.error("批量重试单个通知失败", {
            notificationId: notification._id.toString(),
            error: error.message,
          });
        }
      }

      const result = {
        total,
        retried,
        failed,
      };

      this.logger.log("批量重试完成", {
        alertId,
        channelType,
        maxRetries,
        ...result,
      });

      return result;
    } catch (error) {
      this.logger.error("批量重试失败", {
        alertId,
        channelType,
        maxRetries,
        error: error.message,
      });

      return {
        total: 0,
        retried: 0,
        failed: 1,
      };
    }
  }

  /**
   * 使用DTO创建通知历史记录
   * @param dto 创建通知历史DTO
   */
  async createNotificationHistory(
    dto: CreateNotificationHistoryDto,
  ): Promise<INotificationLog> {
    this.logger.debug("使用DTO创建通知历史", {
      notificationId: dto.notificationId,
      alertId: dto.alertId,
      status: dto.status,
    });

    try {
      const logData = {
        notificationId: dto.notificationId,
        alertId: dto.alertId,
        channelId: dto.channelId,
        channelType: dto.channelType,
        success: dto.status === "sent" || dto.status === "delivered",
        message: dto.status === "sent" ? "通知发送成功" : dto.errorMessage,
        error: dto.errorMessage,
        sentAt: dto.sentAt || new Date(),
        duration: dto.duration || 0,
        retryCount: dto.retryCount || 0,
        metadata: {
          title: dto.title,
          content: dto.content,
          priority: dto.priority,
          recipient: dto.recipient,
          status: dto.status,
          createdFromEvent: true,
          timestamp: new Date().toISOString(),
        },
      };

      const savedLog = await this.notificationLogModel.create(logData);

      const result: INotificationLog = {
        id: savedLog.id,
        notificationId: savedLog.notificationId,
        alertId: savedLog.alertId,
        channelId: savedLog.channelId,
        channelType: savedLog.channelType,
        success: savedLog.success,
        message: savedLog.message,
        error: savedLog.error,
        sentAt: savedLog.sentAt,
        duration: savedLog.duration,
        retryCount: savedLog.retryCount,
        metadata: savedLog.metadata,
      };

      this.logger.debug("DTO通知历史创建成功", {
        logId: result.id,
        notificationId: dto.notificationId,
        status: dto.status,
      });

      return result;
    } catch (error) {
      this.logger.error("使用DTO创建通知历史失败", {
        dto,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 更新通知历史记录
   * @param id 记录ID
   * @param dto 更新DTO
   */
  async updateNotificationHistory(
    id: string,
    dto: NotificationHistoryDto,
  ): Promise<INotificationLog | null> {
    this.logger.debug("更新通知历史", { id, dto });

    try {
      const updateData: any = {};

      if (dto.status !== undefined) {
        updateData.success =
          dto.status === "sent" || dto.status === "delivered";
        updateData["metadata.status"] = dto.status;
      }

      if (dto.errorMessage !== undefined) {
        updateData.error = dto.errorMessage;
        updateData.message = dto.errorMessage ? "发送失败" : "发送成功";
      }

      if (dto.retryCount !== undefined) {
        updateData.retryCount = dto.retryCount;
      }

      if (dto.duration !== undefined) {
        updateData.duration = dto.duration;
      }

      updateData.updatedAt = new Date();

      const updated = await this.notificationLogModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .exec();

      if (!updated) {
        this.logger.warn("未找到要更新的通知历史记录", { id });
        return null;
      }

      const result: INotificationLog = {
        id: updated.id,
        notificationId: updated.notificationId,
        alertId: updated.alertId,
        channelId: updated.channelId,
        channelType: updated.channelType,
        success: updated.success,
        message: updated.message,
        error: updated.error,
        sentAt: updated.sentAt,
        duration: updated.duration,
        retryCount: updated.retryCount,
        metadata: updated.metadata,
      };

      this.logger.debug("通知历史更新成功", { id });
      return result;
    } catch (error) {
      this.logger.error("更新通知历史失败", {
        id,
        dto,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    status: "healthy" | "unhealthy";
    details: any;
  }> {
    try {
      // 检查数据库连接
      const [notificationCount, logCount] = await Promise.all([
        this.notificationModel.countDocuments().exec(),
        this.notificationLogModel.countDocuments().exec(),
      ]);

      return {
        status: "healthy",
        details: {
          serviceName: "NotificationHistoryService",
          database: {
            notifications: notificationCount,
            logs: logCount,
          },
          lastHealthCheck: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        status: "unhealthy",
        details: {
          error: error.message,
          lastHealthCheck: new Date().toISOString(),
        },
      };
    }
  }
}
