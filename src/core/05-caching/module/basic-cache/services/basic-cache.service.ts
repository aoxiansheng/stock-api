import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { CACHE_REDIS_CLIENT_TOKEN } from "../constants/cache.constants";
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from "@common/core/exceptions";

const MAX_VALUE_SIZE_BYTES = 1 * 1024 * 1024; // 1MB 硬限制

@Injectable()
export class BasicCacheService {
  constructor(
    @Inject(CACHE_REDIS_CLIENT_TOKEN) private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  private getDefaultTtl(): number {
    // 优先新变量，其次兼容旧变量，最后配置服务默认
    const raw =
      process.env.CACHE_DEFAULT_TTL_SECONDS ??
      process.env.CACHE_DEFAULT_TTL ??
      this.configService.get<string>("cache.defaultTtlSeconds");
    const ttl = parseInt(String(raw ?? "3600"), 10);
    return Number.isFinite(ttl) && ttl > 0 ? ttl : 3600;
  }

  private ensureSize(value: any) {
    try {
      const s = JSON.stringify(value);
      if (Buffer.byteLength(s, "utf8") > MAX_VALUE_SIZE_BYTES) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.COMMON_CACHE,
          errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
          operation: "set",
          message: `Cache value exceeds ${MAX_VALUE_SIZE_BYTES} bytes`,
          context: { sizeBytes: Buffer.byteLength(s, "utf8") },
        });
      }
    } catch (err: any) {
      if (err?.isBusinessException) throw err;
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.COMMON_CACHE,
        errorCode: BusinessErrorCode.DATA_SERIALIZATION_FAILED,
        operation: "set",
        message: `Failed to serialize value: ${err?.message ?? err}`,
      });
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch (err: any) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.COMMON_CACHE,
        errorCode: BusinessErrorCode.DATA_SERIALIZATION_FAILED,
        operation: "get",
        message: `Failed to parse JSON for key ${key}: ${err?.message ?? err}`,
        context: { key },
      });
    }
  }

  async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    if (!keys?.length) return [];
    const rows = await this.redis.mget(keys);
    return rows.map((raw, idx) => {
      if (raw == null) return null;
      try {
        return JSON.parse(raw) as T;
      } catch (err: any) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.COMMON_CACHE,
          errorCode: BusinessErrorCode.DATA_SERIALIZATION_FAILED,
          operation: "mget",
          message: `Failed to parse JSON for key ${keys[idx]}: ${err?.message ?? err}`,
          context: { key: keys[idx] },
        });
      }
    });
  }

  async set<T = any>(key: string, value: T, opts?: { ttlSeconds?: number }): Promise<void> {
    this.ensureSize(value);
    const payload = JSON.stringify(value);
    const ttl = opts?.ttlSeconds ?? this.getDefaultTtl();
    if (ttl && ttl > 0) {
      await this.redis.setex(key, ttl, payload);
    } else {
      await this.redis.set(key, payload);
    }
  }

  async del(key: string): Promise<number> {
    return this.redis.del(key);
  }

  async incr(key: string, by = 1): Promise<number> {
    if (by === 1) return this.redis.incr(key);
    return this.redis.incrby(key, by);
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    const r = await this.redis.expire(key, ttlSeconds);
    return r === 1;
  }
}
