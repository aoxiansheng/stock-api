import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { createLogger } from "@app/config/logger.config";

import { IAlert, IAlertQuery } from "../interfaces";
import { AlertHistory, AlertHistoryDocument } from "../schemas";
import { AlertStatus } from "../types/alert.types";
import { ALERT_RULE_CONSTANTS, ALERT_DEFAULTS } from "../constants";

type AlertCreateData = Omit<IAlert, "id" | "startTime" | "status">;
type AlertUpdateData = Partial<Omit<IAlert, "id">>;

@Injectable()
export class AlertHistoryRepository {
  private readonly logger = createLogger(AlertHistoryRepository.name);

  constructor(
    @InjectModel(AlertHistory.name)
    private readonly alertHistoryModel: Model<AlertHistoryDocument>,
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

    const page = query.page || 1;
    const limit = query.limit || ALERT_DEFAULTS.PAGINATION.limit;
    const skip = (page - 1) * limit;

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
                $gte: new Date(Date.now() - ALERT_RULE_CONSTANTS.TIME_CONFIG.EVALUATION_DEFAULT_MS / 1000 * 1000 * 48), // 约7天
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

  async findById(alertId: string): Promise<IAlert | null> {
    return this.alertHistoryModel.findOne({ id: alertId }).lean().exec();
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
