import { plainToClass } from "class-transformer";
import { validate } from "class-validator";
import {
  CacheConfigDto,
  RedisCacheRuntimeStatsDto,
  CacheHealthCheckResultDto,
  CacheOperationResultDto,
  BatchCacheOperationDto,
  CacheMetricsUpdateDto,
  CacheWarmupConfigDto,
  CacheCompressionInfoDto,
  CacheSerializationInfoDto,
  DistributedLockInfoDto,
  CacheKeyPatternAnalysisDto,
  CachePerformanceMonitoringDto,
} from "../../../../../src/cache/dto/cache-internal.dto";

describe("CacheInternalDTOs", () => {
  describe("CacheConfigDto", () => {
    it("should pass validation with valid data", async () => {
      const dto = plainToClass(CacheConfigDto, {
        ttl: 60,
        maxMemory: 1024,
        compressionThreshold: 512,
        serializer: "json",
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should fail validation with invalid data", async () => {
      const dto = plainToClass(CacheConfigDto, { ttl: "invalid" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("RedisCacheRuntimeStatsDto", () => {
    it("should pass validation with valid data", async () => {
      const dto = plainToClass(RedisCacheRuntimeStatsDto, {
        hits: 100,
        misses: 20,
        hitRate: 0.83,
        memoryUsage: 2048,
        keyCount: 50,
        avgTtl: 300,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("CacheHealthCheckResultDto", () => {
    it("should pass validation with valid data", async () => {
      const dto = plainToClass(CacheHealthCheckResultDto, {
        status: "healthy",
        latency: 10,
        errors: [],
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("CacheOperationResultDto", () => {
    it("should pass validation with valid data", async () => {
      const dto = plainToClass(CacheOperationResultDto, {
        success: true,
        data: { key: "value" },
        source: "cache",
        executionTime: 5,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("BatchCacheOperationDto", () => {
    it("should pass validation with valid data", async () => {
      const dto = plainToClass(BatchCacheOperationDto, {
        entries: new Map([["key", "value"]]),
        ttl: 60,
        batchSize: 1,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("CacheMetricsUpdateDto", () => {
    it("should pass validation with valid data", async () => {
      const dto = plainToClass(CacheMetricsUpdateDto, {
        key: "test_key",
        operation: "hit",
        pattern: "test_*",
        timestamp: Date.now(),
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("CacheWarmupConfigDto", () => {
    it("should pass validation with valid data", async () => {
      const dto = plainToClass(CacheWarmupConfigDto, {
        warmupData: new Map([["key", "value"]]),
        config: { ttl: 60 },
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("CacheCompressionInfoDto", () => {
    it("should pass validation with valid data", async () => {
      const dto = plainToClass(CacheCompressionInfoDto, {
        shouldCompress: true,
        originalSize: 1024,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("CacheSerializationInfoDto", () => {
    it("should pass validation with valid data", async () => {
      const dto = plainToClass(CacheSerializationInfoDto, {
        type: "json",
        serializedSize: 512,
        serializationTime: 2,
        success: true,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("DistributedLockInfoDto", () => {
    it("should pass validation with valid data", async () => {
      const dto = plainToClass(DistributedLockInfoDto, {
        lockKey: "lock_key",
        lockValue: "lock_value",
        lockTtl: 10,
        acquired: true,
        acquiredAt: Date.now(),
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("CacheKeyPatternAnalysisDto", () => {
    it("should pass validation with valid data", async () => {
      const dto = plainToClass(CacheKeyPatternAnalysisDto, {
        pattern: "user_*",
        hits: 100,
        misses: 10,
        hitRate: 0.9,
        totalRequests: 110,
        lastAccessTime: Date.now(),
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("CachePerformanceMonitoringDto", () => {
    it("should pass validation with valid data", async () => {
      const dto = plainToClass(CachePerformanceMonitoringDto, {
        operation: "get",
        executionTime: 15,
        timestamp: Date.now(),
        isSlowOperation: false,
        slowOperationThreshold: 50,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
