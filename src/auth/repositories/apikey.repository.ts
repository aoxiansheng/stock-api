import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { PaginationService } from "@common/modules/pagination/services/pagination.service";
import { DatabaseValidationUtils } from "../../common/utils/database.utils";

import { ApiKey, ApiKeyDocument } from "../schemas/apikey.schema";
import { OperationStatus } from "@common/types/enums/shared-base.enum";

@Injectable()
export class ApiKeyRepository {
  constructor(
    @InjectModel(ApiKey.name)
    private readonly apiKeyModel: Model<ApiKeyDocument>,
    private readonly paginationService: PaginationService,
  ) {}

  /**
   * 创建新的 API Key
   * @param apiKeyData - API Key 数据
   */
  async create(apiKeyData: Partial<ApiKey>): Promise<ApiKeyDocument> {
    // 如果指定了用户ID，需要验证格式
    if (apiKeyData.userId) {
      DatabaseValidationUtils.validateObjectId(
        apiKeyData.userId.toString(),
        "用户ID",
      );
    }

    const apiKey = new this.apiKeyModel(apiKeyData);
    return apiKey.save();
  }

  /**
   * 根据ID查找API Key
   * @param id - API Key ID
   */
  async findById(id: string): Promise<ApiKeyDocument | null> {
    // 验证API Key ID格式
    DatabaseValidationUtils.validateObjectId(id, "API Key ID");

    return this.apiKeyModel.findById(id).exec();
  }

  /**
   * 根据用户ID查找API Keys
   * @param userId - 用户ID
   */
  async findByUserId(userId: string): Promise<ApiKeyDocument[]> {
    // 验证用户ID格式
    DatabaseValidationUtils.validateObjectId(userId, "用户ID");

    return this.apiKeyModel.find({ userId }).exec();
  }

  /**
   * 根据用户ID查找活跃的API Keys
   * @param userId - 用户ID
   */
  async findActiveByUserId(userId: string): Promise<ApiKeyDocument[]> {
    // 验证用户ID格式
    DatabaseValidationUtils.validateObjectId(userId, "用户ID");

    return this.apiKeyModel
      .find({
        userId,
        status: OperationStatus.ACTIVE,
      })
      .exec();
  }

  /**
   * 根据AppKey查找API Key
   * @param appKey - App Key
   */
  async findByAppKey(appKey: string): Promise<ApiKeyDocument | null> {
    return this.apiKeyModel.findOne({ appKey }).exec();
  }

  /**
   * 根据AccessToken查找API Key
   * @param accessToken - Access Token
   */
  async findByAccessToken(accessToken: string): Promise<ApiKeyDocument | null> {
    return this.apiKeyModel.findOne({ accessToken }).exec();
  }

  /**
   * 根据AppKey和AccessToken查找API Key（用于认证）
   * @param appKey - App Key
   * @param accessToken - Access Token
   */
  async findByCredentials(
    appKey: string,
    accessToken: string,
  ): Promise<ApiKeyDocument | null> {
    return this.apiKeyModel
      .findOne({
        appKey,
        accessToken,
        status: OperationStatus.ACTIVE,
      })
      .exec();
  }

  /**
   * 查找所有活跃的 API Key
   */
  async findAllActive(): Promise<ApiKeyDocument[]> {
    return this.apiKeyModel.find({ status: OperationStatus.ACTIVE }).exec();
  }

  /**
   * 分页查询API Keys
   * @param page - 页码（从1开始）
   * @param limit - 每页数量
   * @param userId - 可选的用户ID过滤
   * @param includeInactive - 是否包含非活跃的API Keys
   */
  async findAllPaginated(
    page: number = 1,
    limit: number = 10,
    userId?: string,
    includeInactive: boolean = false,
  ) {
    // 如果指定了用户ID，验证格式
    if (userId) {
      DatabaseValidationUtils.validateObjectId(userId, "用户ID");
    }

    // 使用通用分页服务标准化参数
    const { page: normalizedPage, limit: normalizedLimit } =
      this.paginationService.normalizePaginationQuery({
        page,
        limit,
      });

    const skip = this.paginationService.calculateSkip(
      normalizedPage,
      normalizedLimit,
    );

    // 构建查询条件
    const filter: any = {};
    if (userId) {
      filter.userId = userId;
    }
    if (!includeInactive) {
      filter.status = OperationStatus.ACTIVE;
    }

    const [apiKeys, total] = await Promise.all([
      this.apiKeyModel
        .find(filter)
        .select("-accessToken") // 排除敏感信息
        .sort({ createdAt: -1 }) // 按创建时间倒序
        .skip(skip)
        .limit(normalizedLimit)
        .exec(),
      this.apiKeyModel.countDocuments(filter).exec(),
    ]);

    // 使用通用分页服务创建分页信息
    const pagination = this.paginationService.createPagination(
      normalizedPage,
      normalizedLimit,
      total,
    );

    return {
      apiKeys,
      ...pagination,
    };
  }

  /**
   * 更新API Key状态
   * @param id - API Key ID
   * @param status - 新状态
   */
  async updateStatus(
    id: string,
    status: OperationStatus,
  ): Promise<ApiKeyDocument | null> {
    // 验证API Key ID格式
    DatabaseValidationUtils.validateObjectId(id, "API Key ID");

    return this.apiKeyModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();
  }

  /**
   * 更新API Key的使用统计
   * @param id - API Key ID
   * @param incrementCount - 请求计数增量（默认1）
   */
  async updateUsageStats(
    id: string,
    incrementCount: number = 1,
  ): Promise<void> {
    // 验证API Key ID格式
    DatabaseValidationUtils.validateObjectId(id, "API Key ID");

    await this.apiKeyModel
      .findByIdAndUpdate(id, {
        $inc: { totalRequestCount: incrementCount },
        lastAccessedAt: new Date(),
      })
      .exec();
  }

  /**
   * 更新API Key的最后访问时间
   * @param id - API Key ID
   */
  async updateLastAccessTime(id: string): Promise<void> {
    // 验证API Key ID格式
    DatabaseValidationUtils.validateObjectId(id, "API Key ID");

    await this.apiKeyModel
      .findByIdAndUpdate(id, {
        lastAccessedAt: new Date(),
      })
      .exec();
  }

  /**
   * 删除API Key（软删除，设置状态为DELETED）
   * @param id - API Key ID
   */
  async softDelete(id: string): Promise<ApiKeyDocument | null> {
    // 验证API Key ID格式
    DatabaseValidationUtils.validateObjectId(id, "API Key ID");

    return this.apiKeyModel
      .findByIdAndUpdate(id, { 
        status: OperationStatus.DELETED,
        deletedAt: new Date()
      }, { new: true })
      .exec();
  }

  /**
   * 永久删除API Key（硬删除）
   * @param id - API Key ID
   */
  async hardDelete(id: string): Promise<boolean> {
    // 验证API Key ID格式
    DatabaseValidationUtils.validateObjectId(id, "API Key ID");

    const result = await this.apiKeyModel.findByIdAndDelete(id).exec();
    return result !== null;
  }

  /**
   * 批量删除用户的所有API Keys（软删除）
   * @param userId - 用户ID
   */
  async softDeleteByUserId(userId: string): Promise<number> {
    // 验证用户ID格式
    DatabaseValidationUtils.validateObjectId(userId, "用户ID");

    const result = await this.apiKeyModel
      .updateMany({ userId }, { status: OperationStatus.DELETED })
      .exec();

    return result.modifiedCount;
  }

  /**
   * 根据过期时间查找需要清理的API Keys
   * @param beforeDate - 在此日期之前过期的API Keys
   */
  async findExpired(beforeDate: Date = new Date()): Promise<ApiKeyDocument[]> {
    return this.apiKeyModel
      .find({
        expiresAt: { $lt: beforeDate },
        status: { $ne: OperationStatus.DELETED },
      })
      .exec();
  }

  /**
   * 获取API Key统计信息
   * @param userId - 可选的用户ID过滤
   */
  async getStats(userId?: string) {
    // 如果指定了用户ID，验证格式
    if (userId) {
      DatabaseValidationUtils.validateObjectId(userId, "用户ID");
    }

    const baseFilter = userId ? { userId } : {};

    const [totalApiKeys, activeApiKeys, expiredApiKeys, usageStats] =
      await Promise.all([
        this.apiKeyModel.countDocuments(baseFilter).exec(),
        this.apiKeyModel
          .countDocuments({
            ...baseFilter,
            status: OperationStatus.ACTIVE,
          })
          .exec(),
        this.apiKeyModel
          .countDocuments({
            ...baseFilter,
            expiresAt: { $lt: new Date() },
            status: { $ne: OperationStatus.DELETED },
          })
          .exec(),
        this.apiKeyModel
          .aggregate([
            { $match: baseFilter },
            {
              $group: {
                _id: null,
                totalRequests: { $sum: "$totalRequestCount" },
                avgRequestsPerKey: { $avg: "$totalRequestCount" },
              },
            },
          ])
          .exec(),
      ]);

    const usage = usageStats[0] || {
      totalRequests: 0,
      avgRequestsPerKey: 0,
    };

    return {
      totalApiKeys,
      activeApiKeys,
      expiredApiKeys,
      deletedApiKeys: totalApiKeys - activeApiKeys - expiredApiKeys,
      totalRequests: usage.totalRequests,
      avgRequestsPerKey: Math.round(usage.avgRequestsPerKey || 0),
    };
  }
}
