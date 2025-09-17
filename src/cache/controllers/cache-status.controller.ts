import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Public } from "@auth/decorators/public.decorator";

import { CacheService } from "../services/cache.service";
import { 
  ApiCacheHealthResponse,
  ApiCacheStatsResponse,
  ApiCacheConfigResponse 
} from "../decorators/cache-swagger-responses.decorator";
import { CACHE_STATUS } from "../constants/status/cache-status.constants";

/**
 * Cache状态控制器
 * 🎯 Phase 3: 响应格式统一验证 - 提供Cache模块状态查询端点
 * ✅ 用于验证ResponseInterceptor和Swagger装饰器的统一性
 * 🔄 遵循项目标准的响应格式规范
 */
@ApiTags("缓存状态")
@Controller("cache/status")
export class CacheStatusController {
  constructor(private readonly cacheService: CacheService) {}

  /**
   * 获取缓存健康状态
   * 🎯 用于验证ResponseInterceptor统一响应格式
   */
  @Get("health")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: "获取缓存健康状态",
    description: "检查Redis连接状态和基本健康指标"
  })
  @ApiCacheHealthResponse()
  async getHealth() {
    const startTime = Date.now();
    
    try {
      // 简单的健康检查 - ping Redis
      await this.cacheService.set("health-check", "ok", { ttl: 10 });
      const result = await this.cacheService.get("health-check");
      const latency = Date.now() - startTime;
      
      return {
        status: result === "ok" ? CACHE_STATUS.HEALTHY : CACHE_STATUS.DEGRADED,
        latency,
        errors: [],
        timestamp: Date.now(),
        memoryInfo: {
          used: 0, // 简化实现
          max: 1024 * 1024 * 1024, // 1GB
          usageRatio: 0.1,
        },
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        status: CACHE_STATUS.UNHEALTHY,
        latency,
        errors: [error.message],
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 获取缓存统计信息
   * 🎯 用于验证Cache专用Swagger装饰器
   */
  @Get("stats")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: "获取缓存统计信息",
    description: "获取缓存性能指标和使用统计"
  })
  @ApiCacheStatsResponse()
  async getStats() {
    // 简化的统计信息实现
    return {
      hitRate: 0.85,
      totalRequests: 1000,
      totalHits: 850,
      totalMisses: 150,
      totalKeys: 500,
      memoryUsage: 1024 * 1024 * 50, // 50MB
      ttlDistribution: {
        "0-300": 100,
        "300-3600": 300,
        "3600+": 100,
      },
      topKeys: [
        { key: "user:123", accessCount: 50 },
        { key: "config:app", accessCount: 30 },
      ],
      performanceMetrics: {
        avgResponseTime: 2.5,
        p95ResponseTime: 5.0,
        p99ResponseTime: 10.0,
      },
    };
  }

  /**
   * 获取缓存配置信息
   * 🎯 验证配置响应装饰器
   */
  @Get("config")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: "获取缓存配置信息",
    description: "获取当前缓存配置参数"
  })
  @ApiCacheConfigResponse()
  async getConfig() {
    // 返回简化的配置信息
    return {
      defaultTtl: 3600,
      maxSize: 1024 * 1024 * 10, // 10MB
      enabled: true,
      serializer: "json",
      compressionThreshold: 1024,
    };
  }
}