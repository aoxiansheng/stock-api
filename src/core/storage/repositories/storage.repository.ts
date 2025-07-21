import { RedisService } from "@liaoliaots/nestjs-redis";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import Redis from "ioredis";
import { Model } from "mongoose";

import { createLogger } from "@common/config/logger.config";

import { CACHE_CONFIG } from "../../../cache/constants/cache.constants";
import {
  STORAGE_ERROR_MESSAGES,
  STORAGE_KEY_PATTERNS,
} from "../constants/storage.constants";
import { StoredData, StoredDataDocument } from "../schemas/storage.schema";

@Injectable()
export class StorageRepository {
  private readonly logger = createLogger(StorageRepository.name);
  private redis: Redis | null = null;

  constructor(
    @InjectModel(StoredData.name)
    private readonly storedDataModel: Model<StoredDataDocument>,
    private readonly redisService: RedisService,
  ) {
    try {
      this.redis = this.redisService.getOrThrow();
    } catch (error) {
      this.logger.warn("Redis connection is not available on startup.", error);
      this.redis = null;
    }
  }

  // --- Cache Methods ---

  private getCacheKey(key: string): string {
    return `${CACHE_CONFIG.KEY_PREFIX}${STORAGE_KEY_PATTERNS.CACHE_KEY_SEPARATOR}${key}`;
  }

  async storeInCache(
    key: string,
    data: string,
    ttl: number,
    compressed: boolean,
  ): Promise<void> {
    if (!this.redis) {
      throw new ServiceUnavailableException(
        STORAGE_ERROR_MESSAGES.REDIS_NOT_AVAILABLE,
      );
    }
    const cacheKey = this.getCacheKey(key);
    const metadata = JSON.stringify({
      compressed,
      storedAt: new Date().toISOString(),
    });

    await this.redis
      .pipeline()
      .setex(cacheKey, ttl, data)
      .setex(
        `${cacheKey}${STORAGE_KEY_PATTERNS.METADATA_SUFFIX}`,
        ttl,
        metadata,
      )
      .exec();
  }

  async retrieveFromCache(
    key: string,
  ): Promise<{ data: string | null; metadata: string | null; ttl: number }> {
    if (!this.redis) {
      return { data: null, metadata: null, ttl: 0 };
    }
    const cacheKey = this.getCacheKey(key);
    const result = await this.redis
      .pipeline()
      .get(cacheKey)
      .get(`${cacheKey}${STORAGE_KEY_PATTERNS.METADATA_SUFFIX}`)
      .ttl(cacheKey)
      .exec();

    // result is an array of [error, value] tuples
    const data = result[0][1] as string | null;
    const metadata = result[1][1] as string | null;
    const ttl = result[2][1] as number;

    return { data, metadata, ttl: ttl || 0 };
  }

  async deleteFromCache(key: string): Promise<boolean> {
    if (!this.redis) {
      return false;
    }
    const cacheKey = this.getCacheKey(key);
    const deletedCount = await this.redis.del(
      cacheKey,
      `${cacheKey}${STORAGE_KEY_PATTERNS.METADATA_SUFFIX}`,
    );
    return deletedCount > 0;
  }

  async getCacheStats(): Promise<{ info: string | null; dbSize: number }> {
    if (!this.redis) {
      return { info: null, dbSize: 0 };
    }
    try {
      const [info, dbSize] = await Promise.all([
        this.redis.info("memory"),
        this.redis.dbsize(),
      ]);
      return { info, dbSize };
    } catch (error) {
      this.logger.error("Failed to get cache stats from Redis", error);
      return { info: null, dbSize: 0 };
    }
  }

  async getAverageTtl(): Promise<number> {
    if (!this.redis) return 0;
    try {
      const keyPromises: Promise<string>[] = [];
      for (let i = 0; i < 20; i++) {
        keyPromises.push(this.redis.randomkey());
      }
      const keys = (await Promise.all(keyPromises)).filter(
        (key) => key !== null,
      );

      if (keys.length === 0) return 0;

      const pipeline = this.redis.pipeline();
      keys.forEach((key) => pipeline.ttl(key));
      const results = await pipeline.exec();

      const ttls = results
        .map((res) => res[1] as number)
        .filter((ttl) => ttl > 0);
      if (ttls.length === 0) return 0;

      const average = ttls.reduce((sum, ttl) => sum + ttl, 0) / ttls.length;
      return Math.round(average);
    } catch (error) {
      this.logger.warn("Failed to calculate average TTL", error);
      return 3600; // Default to 1 hour on error
    }
  }

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

  async upsert(
    document: Partial<StoredDataDocument>,
  ): Promise<StoredDataDocument> {
    this.logger.debug(`MongoDB upsert 开始`, {
      key: document.key,
      hasData: !!document.data,
      dataTypeFilter: document.dataTypeFilter,
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

  async getDataTypeFilterStats(): Promise<{ _id: string; count: number }[]> {
    return this.storedDataModel.aggregate([
      { $group: { _id: "$dataTypeFilter", count: { $sum: 1 } } },
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
