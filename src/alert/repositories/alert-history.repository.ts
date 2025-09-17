import { Injectable, Inject } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ConfigType } from "@nestjs/config";
import { Model } from "mongoose";

import { createLogger } from "@common/logging/index";
import { PaginationService } from "@common/modules/pagination/services/pagination.service";

import { IAlert, IAlertQuery } from "../interfaces";
import { AlertHistory, AlertHistoryDocument } from "../schemas";
import { AlertStatus } from "../types/alert.types";
import cacheLimitsConfig from "../../cache/config/cache-unified.config";
import alertConfig from "../config/alert.config";

type AlertCreateData = Omit<IAlert, "id" | "startTime" | "status">;
type AlertUpdateData = Partial<Omit<IAlert, "id">>;

@Injectable()
export class AlertHistoryRepository {
  private readonly logger = createLogger(AlertHistoryRepository.name);

  constructor(
    @InjectModel(AlertHistory.name)
    private readonly alertHistoryModel: Model<AlertHistoryDocument>,
    @Inject(cacheLimitsConfig.KEY)
    private readonly cacheLimits: ConfigType<typeof cacheLimitsConfig>,
    @Inject(alertConfig.KEY)
    private readonly alertConfigData: ConfigType<typeof alertConfig>,
    private readonly paginationService: PaginationService,
  ) {}

  async create(
    alertData: AlertCreateData & {
      id: string;
      startTime: Date;
      status: AlertStatus;
    },
  ): Promise<IAlert> {
    const alert = new this.alertHistoryModel(alertData);
    const savedAlert = await alert.save();
    return savedAlert.toObject();
  }

  async update(
    alertId: string,
    updateData: AlertUpdateData,
  ): Promise<IAlert | null> {
    const alert = await this.alertHistoryModel
      .findOneAndUpdate({ id: alertId }, updateData, { new: true })
      .exec();
    return alert?.toObject() || null;
  }

  async find(query: IAlertQuery): Promise<{ alerts: IAlert[]; total: number }> {
    const filter: any = {};

    if (query.ruleId) filter.ruleId = query.ruleId;
    if (query.severity) filter.severity = query.severity;
    if (query.status) filter.status = query.status;
    if (query.metric) filter.metric = new RegExp(query.metric, "i");

    if (query.startTime || query.endTime) {
      filter.startTime = {};
      if (query.startTime) filter.startTime.$gte = new Date(query.startTime);
      if (query.endTime) filter.startTime.$lte = new Date(query.endTime);
    }

    if (query.tags) {
      Object.entries(query.tags).forEach(([key, value]) => {
        filter[`tags.${key}`] = value;
      });
    }

    // ✅ 使用通用PaginationService替代手动分页计算
    const normalizedPagination =
      this.paginationService.normalizePaginationQuery({
        page: query.page,
        limit: query.limit || this.cacheLimits.maxBatchSize,
      });
    const { page, limit } = normalizedPagination;
    const skip = this.paginationService.calculateSkip(page, limit);

    const sortField = query.sortBy || "startTime";
    const sortOrder = query.sortOrder === "asc" ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };

    const [alerts, total] = await Promise.all([
      this.alertHistoryModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.alertHistoryModel.countDocuments(filter).exec(),
    ]);

    return { alerts, total };
  }

  async findActive(): Promise<IAlert[]> {
    return this.alertHistoryModel
      .find({
        status: { $in: [AlertStatus.FIRING, AlertStatus.ACKNOWLEDGED] },
      })
      .sort({ startTime: -1 })
      .lean()
      .exec();
  }

  async getStatistics(): Promise<{
    activeAlerts: any[];
    todayAlerts: number;
    resolvedToday: number;
    avgResolutionTime: any[];
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [activeAlerts, todayAlerts, resolvedToday, avgResolutionTime] =
      await Promise.all([
        this.alertHistoryModel.aggregate([
          {
            $match: {
              status: { $in: [AlertStatus.FIRING, AlertStatus.ACKNOWLEDGED] },
            },
          },
          { $group: { _id: "$severity", count: { $sum: 1 } } },
        ]),
        this.alertHistoryModel.countDocuments({ startTime: { $gte: today } }),
        this.alertHistoryModel.countDocuments({
          startTime: { $gte: today },
          status: AlertStatus.RESOLVED,
        }),
        this.alertHistoryModel.aggregate([
          {
            $match: {
              status: AlertStatus.RESOLVED,
              resolvedAt: { $exists: true },
              startTime: {
                $gte: new Date(
                  Date.now() -
                    this.alertConfigData.evaluationInterval * 1000 * 48,
                ), // 约7天
              },
            },
          },
          {
            $project: {
              resolutionTime: { $subtract: ["$resolvedAt", "$startTime"] },
            },
          },
          { $group: { _id: null, avgTime: { $avg: "$resolutionTime" } } },
        ]),
      ]);

    return { activeAlerts, todayAlerts, resolvedToday, avgResolutionTime };
  }

  /**
   * 获取按状态分组的告警统计
   */
  async getCountByStatus(): Promise<Record<string, number>> {
    const statusCounts = await this.alertHistoryModel.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const result: Record<string, number> = {};
    statusCounts.forEach((item) => {
      result[item._id] = item.count;
    });

    return result;
  }

  /**
   * 获取按严重程度分组的告警统计
   */
  async getCountBySeverity(): Promise<Record<string, number>> {
    const severityCounts = await this.alertHistoryModel.aggregate([
      {
        $group: {
          _id: "$severity",
          count: { $sum: 1 },
        },
      },
    ]);

    const result: Record<string, number> = {};
    severityCounts.forEach((item) => {
      result[item._id] = item.count;
    });

    return result;
  }

  /**
   * 获取告警趋势数据
   */
  async getAlertTrend(
    startDate: Date,
    endDate: Date,
    interval: "hour" | "day" | "week" = "day",
  ): Promise<Array<{ time: string; count: number; resolved: number }>> {
    // 根据间隔类型确定分组格式
    let dateFormat: string;
    switch (interval) {
      case "hour":
        dateFormat = "%Y-%m-%d %H:00";
        break;
      case "week":
        dateFormat = "%Y-%U"; // 年-周
        break;
      default:
        dateFormat = "%Y-%m-%d";
        break;
    }

    const trendData = await this.alertHistoryModel.aggregate([
      {
        $match: {
          startTime: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            time: { $dateToString: { format: dateFormat, date: "$startTime" } },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.time",
          total: { $sum: "$count" },
          resolved: {
            $sum: {
              $cond: [
                { $eq: ["$_id.status", AlertStatus.RESOLVED] },
                "$count",
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          time: "$_id",
          count: "$total",
          resolved: "$resolved",
          _id: 0,
        },
      },
      { $sort: { time: 1 } },
    ]);

    return trendData;
  }

  async findById(alertId: string): Promise<IAlert | null> {
    return this.alertHistoryModel.findOne({ id: alertId }).lean().exec();
  }

  /**
   * 基于关键词搜索告警
   */
  async searchByKeyword(
    keyword: string,
    query: IAlertQuery,
  ): Promise<{ alerts: IAlert[]; total: number }> {
    const filter: any = {};

    // 添加基础查询条件
    if (query.ruleId) filter.ruleId = query.ruleId;
    if (query.severity) filter.severity = query.severity;
    if (query.status) filter.status = query.status;

    if (query.startTime || query.endTime) {
      filter.startTime = {};
      if (query.startTime) filter.startTime.$gte = new Date(query.startTime);
      if (query.endTime) filter.startTime.$lte = new Date(query.endTime);
    }

    // 添加关键词搜索条件
    // 使用 $or 操作符在多个字段中搜索
    const keywordRegex = new RegExp(
      keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    filter.$or = [
      { message: keywordRegex },
      { ruleName: keywordRegex },
      { metric: keywordRegex },
    ];

    // 分页设置
    const normalizedPagination =
      this.paginationService.normalizePaginationQuery({
        page: query.page,
        limit: query.limit || this.cacheLimits.maxBatchSize,
      });
    const { page, limit } = normalizedPagination;
    const skip = this.paginationService.calculateSkip(page, limit);

    // 排序设置
    const sortField = query.sortBy || "startTime";
    const sortOrder = query.sortOrder === "asc" ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };

    const [alerts, total] = await Promise.all([
      this.alertHistoryModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.alertHistoryModel.countDocuments(filter).exec(),
    ]);

    return { alerts, total };
  }

  async cleanup(daysToKeep: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.alertHistoryModel
      .deleteMany({
        startTime: { $lt: cutoffDate },
        status: AlertStatus.RESOLVED,
      })
      .exec();

    return result.deletedCount;
  }
}
