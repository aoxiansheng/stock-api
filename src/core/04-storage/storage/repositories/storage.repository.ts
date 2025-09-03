import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { createLogger } from "@app/config/logger.config";
import { StorageQueryDto } from "../dto/storage-query.dto";
import { StoredData, StoredDataDocument } from "../schemas/storage.schema";

@Injectable()
export class StorageRepository {
  private readonly logger = createLogger(StorageRepository.name);

  constructor(
    @InjectModel(StoredData.name)
    private readonly storedDataModel: Model<StoredDataDocument>,
  ) {}

  // --- Repository专注于MongoDB持久化存储操作 ---
  // 缓存操作已迁移至 CommonCacheService

  // --- Persistent Storage Methods ---

  async findByKey(key: string): Promise<StoredDataDocument | null> {
    this.logger.debug(`MongoDB查询开始`, { key, operation: "findByKey" });

    const result = await this.storedDataModel.findOne({ key }).lean();

    this.logger.debug(`MongoDB查询结果`, {
      key,
      found: !!result,
      resultId: result?._id,
      resultKey: result?.key,
    });

    return result;
  }

  async findPaginated(query: StorageQueryDto): Promise<{
    items: StoredDataDocument[];
    total: number;
  }> {
    this.logger.debug(`分页查询存储数据`, {
      page: query.page,
      limit: query.limit,
      keySearch: query.keySearch,
      operation: "findPaginated",
    });

    // 构建查询条件
    const filter: any = {};

    if (query.keySearch) {
      filter.key = { $regex: query.keySearch, $options: "i" };
    }

    if (query.provider) {
      filter.provider = query.provider;
    }

    if (query.market) {
      filter.market = query.market;
    }

    if (query.storageClassification) {
      filter.storageClassification = query.storageClassification.toString();
    }

    if (query.tags && query.tags.length > 0) {
      filter.tags = { $in: query.tags };
    }

    if (query.startDate || query.endDate) {
      filter.storedAt = {};
      if (query.startDate) {
        filter.storedAt.$gte = query.startDate;
      }
      if (query.endDate) {
        filter.storedAt.$lte = query.endDate;
      }
    }

    // 执行查询
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.storedDataModel
        .find(filter)
        .sort({ storedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.storedDataModel.countDocuments(filter),
    ]);

    this.logger.debug(`分页查询结果`, {
      total,
      pageSize: items.length,
      operation: "findPaginated",
    });

    return { items, total };
  }

  async upsert(
    document: Partial<StoredDataDocument>,
  ): Promise<StoredDataDocument> {
    this.logger.debug(`MongoDB upsert 开始`, {
      key: document.key,
      hasData: !!document.data,
      storageClassification: document.storageClassification,
      operation: "upsert",
    });

    const result = await this.storedDataModel.findOneAndUpdate(
      { key: document.key },
      document,
      { upsert: true, new: true },
    );

    this.logger.debug(`MongoDB upsert 完成`, {
      key: document.key,
      success: !!result,
      resultId: result._id,
      resultKey: result.key,
    });

    return result;
  }

  async deleteByKey(key: string): Promise<{ deletedCount: number }> {
    const result = await this.storedDataModel.deleteOne({ key });
    return { deletedCount: result.deletedCount };
  }

  async countAll(): Promise<number> {
    return this.storedDataModel.countDocuments();
  }

  async getStorageClassificationStats(): Promise<
    { _id: string; count: number }[]
  > {
    return this.storedDataModel.aggregate([
      {
        $group: {
          _id: "$storageClassification",
          count: { $sum: 1 },
        },
      },
    ]);
  }

  async getProviderStats(): Promise<{ _id: string; count: number }[]> {
    return this.storedDataModel.aggregate([
      { $group: { _id: "$provider", count: { $sum: 1 } } },
    ]);
  }

  async getSizeStats(): Promise<{ totalSize: number }[]> {
    return this.storedDataModel.aggregate([
      { $group: { _id: null, totalSize: { $sum: "$dataSize" } } },
    ]);
  }
}
