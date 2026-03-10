import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { createLogger } from "@common/logging/index";
import { StorageQueryDto } from "../dto/storage-query.dto";
import { StoredData, StoredDataDocument } from "../schemas/storage.schema";

const LEASE_TAG_FIELD = "tags.__lease";
const LEASE_TAG_NORMALIZED_VALUE = "1";
const LEASE_TAG_COMPATIBLE_VALUES = [1, LEASE_TAG_NORMALIZED_VALUE] as const;

@Injectable()
export class StorageRepository {
  private readonly logger = createLogger(StorageRepository.name);

  constructor(
    @InjectModel(StoredData.name)
    private readonly storedDataModel: Model<StoredDataDocument>,
  ) {}

  // --- Repository专注于MongoDB持久化存储操作 ---
  // 缓存操作已迁移至 StandardizedCacheService

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
        .select({
          _id: 1,
          key: 1,
          provider: 1,
          market: 1,
          storageClassification: 1,
          compressed: 1,
          dataSize: 1,
          tags: 1,
          storedAt: 1,
          expiresAt: 1,
          sensitivityLevel: 1,
          encrypted: 1,
          // 排除data字段以优化内存使用，分页查询不需要实际数据
          data: 0,
        })
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
      {
        key: document.key,
        [LEASE_TAG_FIELD]: { $nin: LEASE_TAG_COMPATIBLE_VALUES },
      },
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

  async tryAcquireLease(
    key: string,
    owner: string,
    expiresAt: Date,
    metadata: {
      storageClassification: string;
      provider: string;
      market: string;
      tags?: Record<string, string>;
    },
  ): Promise<boolean> {
    const now = new Date();
    const leaseTags = {
      ...(metadata.tags ?? {}),
      __lease: LEASE_TAG_NORMALIZED_VALUE,
    };

    try {
      const document = await this.storedDataModel.findOneAndUpdate(
        {
          key,
          [LEASE_TAG_FIELD]: { $in: LEASE_TAG_COMPATIBLE_VALUES },
          $or: [
            { "data.owner": owner },
            { expiresAt: { $lte: now } },
          ],
        },
        {
          key,
          data: { owner },
          storageClassification: metadata.storageClassification,
          provider: metadata.provider,
          market: metadata.market,
          dataSize: 0,
          compressed: false,
          tags: leaseTags,
          expiresAt,
          storedAt: now,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      return !!document && document.data?.owner === owner;
    } catch (error: any) {
      if (error?.code === 11000) {
        return false;
      }
      throw error;
    }
  }

  async releaseLease(key: string, owner: string): Promise<void> {
    await this.storedDataModel.deleteOne({
      key,
      [LEASE_TAG_FIELD]: { $in: LEASE_TAG_COMPATIBLE_VALUES },
      "data.owner": owner,
    });
  }

  async renewLease(key: string, owner: string, expiresAt: Date): Promise<boolean> {
    const now = new Date();
    const document = await this.storedDataModel.findOneAndUpdate(
      {
        key,
        [LEASE_TAG_FIELD]: { $in: LEASE_TAG_COMPATIBLE_VALUES },
        "data.owner": owner,
      },
      {
        expiresAt,
        storedAt: now,
      },
      { new: true, upsert: false },
    );
    return !!document && document.data?.owner === owner;
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
