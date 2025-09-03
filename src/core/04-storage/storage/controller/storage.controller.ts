import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiConsumes,
  ApiQuery,
} from "@nestjs/swagger";

import { createLogger } from "@app/config/logger.config";
import {
  ApiSuccessResponse,
  ApiStandardResponses,
  ApiKeyAuthResponses,
} from "@common/core/decorators/swagger-responses.decorator";

import { ApiKeyAuth } from "../../../../auth/decorators/auth.decorator";
import { RequirePermissions } from "../../../../auth/decorators/permissions.decorator";
import { Permission } from "../../../../auth/enums/user-role.enum";

import { StoreDataDto, RetrieveDataDto } from "../dto/storage-request.dto";
import { StorageType } from "../enums/storage-type.enum";
import {
  StorageResponseDto,
  StorageStatsDto,
} from "../dto/storage-response.dto";
import { StorageService } from "../services/storage.service";

@ApiTags("💾 数据存储")
@Controller("storage")
export class StorageController {
  private readonly logger = createLogger(StorageController.name);

  constructor(private readonly storageService: StorageService) {}

  @ApiKeyAuth()
  @RequirePermissions(Permission.SYSTEM_ADMIN)
  @Post("store")
  @ApiOperation({
    summary: "💾 存储数据到缓存和持久化存储",
    description: `
### 功能说明
高性能数据存储服务，支持双层存储策略（Redis缓存 + MongoDB持久化）。

### 权限要求
需要 SYSTEM_ADMIN 权限（系统管理员）

### 核心特性
- **⚡ 双层存储**: Redis缓存 + MongoDB持久化
- **🗃️ 智能压缩**: 自动数据压缩优化
- **⏰ TTL管理**: 灵活的缓存过期时间控制
- **📈 性能监控**: 详细的存储性能指标

### 存储类型
- CACHE: 仅存储到Redis缓存
- PERSISTENT: 仅存储到MongoDB
- BOTH: 同时存储到缓存和数据库
    `,
  })
  @ApiSuccessResponse({
    type: StorageResponseDto,
    description: "数据存储成功",
    schema: {
      example: {
        statusCode: 200,
        message: "数据存储成功",
        data: {
          success: true,
          data: null,
          metadata: {
            dataSize: 1024,
            compressed: true,
            processingTimeMs: 45,
            storageType: "both",
            cacheWritten: true,
            persistentWritten: true,
          },
          cacheInfo: {
            hit: false,
            source: "write",
            ttlSet: 3600,
          },
        },
        timestamp: "2024-01-01T12:00:00.000Z",
      },
    },
  })
  @ApiKeyAuthResponses()
  @ApiStandardResponses()
  @ApiConsumes("application/json")
  async storeData(@Body(ValidationPipe) request: StoreDataDto) {
    this.logger.log(`API Request: Store data`, {
      key: request.key,
      storageType: request.storageType,
      storageClassification: request.storageClassification,
      provider: request.provider,
      market: request.market,
      hasData: !!request.data,
      options: request.options,
    });

    try {
      const result = await this.storageService.storeData(request);

      this.logger.log(`API Success: Data stored successfully`, {
        key: request.key,
        success: true,
        dataSize: result.metadata.dataSize,
        compressed: result.metadata.compressed,
        processingTimeMs: result.metadata.processingTimeMs,
      });

      // 遵循控制器编写规范：让拦截器自动处理响应格式化
      return result;
    } catch (error: any) {
      this.logger.error(`API Error: Failed to store data`, {
        key: request.key,
        error: error.message,
        errorType: error.constructor.name,
      });
      throw error;
    }
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.SYSTEM_ADMIN)
  @Post("retrieve")
  @ApiOperation({
    summary: "📥 从存储中检索数据",
    description: `
### 功能说明
智能数据检索服务，支持缓存优先策略和自动降级回退。

### 权限要求
需要 SYSTEM_ADMIN 权限（系统管理员）

### 检索策略
- **⚡ 缓存优先**: 优先从 Redis 缓存检索
- **🔄 自动降级**: 缓存未命中时自动从 MongoDB 检索
- **🔄 缓存回写**: 可选将数据库数据回写到缓存
- **📈 命中统计**: 提供详细的缓存命中信息

### 检索类型
- CACHE: 仅从缓存检索
- PERSISTENT: 仅从数据库检索  
- BOTH: 缓存优先，支持降级回退
    `,
  })
  @ApiSuccessResponse({
    type: StorageResponseDto,
    description: "数据检索成功",
    schema: {
      example: {
        statusCode: 200,
        message: "数据检索成功",
        data: {
          success: true,
          data: {
            symbol: "AAPL",
            lastPrice: 195.89,
            change: 2.31,
            changePercent: 1.19,
            volume: 45678900,
            timestamp: "2024-01-01T15:30:00.000Z",
          },
          metadata: {
            dataSize: 512,
            compressed: false,
            processingTimeMs: 12,
            source: "cache",
            storedAt: "2024-01-01T15:29:45.000Z",
          },
          cacheInfo: {
            hit: true,
            source: "redis",
            ttlRemaining: 3540,
            key: "stock:AAPL:quote",
          },
        },
        timestamp: "2024-01-01T12:00:00.000Z",
      },
    },
  })
  @ApiKeyAuthResponses()
  @ApiStandardResponses()
  @ApiConsumes("application/json")
  async retrieveData(@Body(ValidationPipe) request: RetrieveDataDto) {
    this.logger.log(`API Request: Retrieve data`, {
      key: request.key,
      preferredType: request.preferredType,
    });

    try {
      const result = await this.storageService.retrieveData(request);

      this.logger.log(`API Success: Data retrieved`, {
        key: request.key,
        success: true,
        source: result.cacheInfo?.source,
        cacheHit: result.cacheInfo?.hit,
        ttlRemaining: result.cacheInfo?.ttlRemaining,
        processingTimeMs: result.metadata.processingTimeMs,
      });

      // 遵循控制器编写规范：让拦截器自动处理响应格式化
      return result;
    } catch (error: any) {
      this.logger.error(`API Error: Failed to retrieve data`, {
        key: request.key,
        error: error.message,
        errorType: error.constructor.name,
      });
      throw error;
    }
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.SYSTEM_ADMIN)
  @Get("retrieve/:key")
  @ApiOperation({
    summary: "📤 按键名检索数据 (GET方式)",
    description: `
### 功能说明
便捷的GET端点，通过键名检索数据，支持默认配置选项。

### 权限要求
需要 SYSTEM_ADMIN 权限（系统管理员）

### 核心特性
- **🔑 简单检索**: 通过URL路径直接指定键名
- **⚙️ 默认配置**: 自动使用最佳检索策略
- **🔄 缓存优先**: 优先从缓存检索，自动降级到数据库
- **📊 查询参数**: 支持可选的存储类型和缓存更新参数

### 查询参数
- \`preferredType\`: 首选存储类型 (CACHE/PERSISTENT/BOTH)
    `,
  })
  @ApiParam({
    name: "key",
    description: "存储键名",
    example: "stock:AAPL:quote",
  })
  @ApiQuery({ name: "preferredType", enum: StorageType, required: false })
  @ApiSuccessResponse({
    type: StorageResponseDto,
    description: "按键名检索成功",
    schema: {
      example: {
        statusCode: 200,
        message: "数据检索成功",
        data: {
          success: true,
          data: {
            symbol: "GOOGL",
            lastPrice: 2750.8,
            change: -15.2,
            changePercent: -0.55,
            volume: 1234567,
            timestamp: "2024-01-01T15:30:00.000Z",
          },
          metadata: {
            dataSize: 486,
            compressed: false,
            processingTimeMs: 8,
            source: "cache",
            storedAt: "2024-01-01T15:28:30.000Z",
          },
          cacheInfo: {
            hit: true,
            source: "redis",
            ttlRemaining: 2890,
            key: "stock:GOOGL:quote",
          },
        },
        timestamp: "2024-01-01T12:00:00.000Z",
      },
    },
  })
  @ApiStandardResponses()
  async retrieveDataByKey(
    @Param("key") key: string,
    @Query("preferredType") preferredType?: string,
  ) {
    this.logger.log(`API Request: Retrieve data by key`, {
      key,
      preferredType,
    });

    const request: RetrieveDataDto = {
      key,
      preferredType: (preferredType as StorageType) || StorageType.BOTH, // 支持缓存回退到数据库
    };

    return this.retrieveData(request);
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.SYSTEM_ADMIN)
  @Delete(":key")
  @ApiOperation({
    summary: "🗑️ 从存储中删除数据",
    description: `
### 功能说明
从缓存和/或持久化存储中删除指定的数据。

### 权限要求
需要 SYSTEM_ADMIN 权限（系统管理员）

### 核心特性
- **🎯 精确删除**: 根据键名精确删除数据
- **🔄 双层清理**: 可同时删除缓存和数据库中的数据
- **⚙️ 灵活配置**: 支持指定删除范围（仅缓存/仅数据库/全部）
- **📊 删除反馈**: 返回实际删除的记录数量

### 查询参数
- \`storageType\`: 删除范围
  - \`CACHE\`: 仅删除Redis缓存
  - \`PERSISTENT\`: 仅删除MongoDB数据
  - \`BOTH\`: 删除缓存和数据库（默认）

### ⚠️ 注意事项
- 删除操作不可逆，请谨慎使用
- 建议先使用检索接口确认数据内容
- 删除缓存数据可能影响系统性能
    `,
  })
  @ApiParam({
    name: "key",
    description: "要删除的存储键名",
    example: "stock:AAPL:quote",
  })
  @ApiQuery({ name: "storageType", enum: StorageType, required: false })
  @ApiSuccessResponse({
    description: "数据删除成功",
    schema: {
      example: {
        statusCode: 200,
        message: "数据删除成功",
        data: {
          success: true,
          deleted: 2,
          key: "stock:AAPL:quote",
          details: {
            cacheDeleted: 1,
            persistentDeleted: 1,
          },
        },
        timestamp: "2024-01-01T12:00:00.000Z",
      },
    },
  })
  @ApiStandardResponses()
  async deleteData(
    @Param("key") key: string,
    @Query("storageType") storageType?: string,
  ) {
    this.logger.log(`API Request: Delete data`, {
      key,
      storageType: (storageType as StorageType) || StorageType.BOTH,
    });

    try {
      const deleted = await this.storageService.deleteData(
        key,
        (storageType as StorageType) || StorageType.BOTH,
      );

      this.logger.log(`API Success: Data deletion completed`, {
        key,
        deleted,
        storageType: storageType || StorageType.BOTH,
      });

      // 遵循控制器编写规范：让拦截器自动处理响应格式化
      return {
        success: true,
        deleted,
        key,
      };
    } catch (error: any) {
      this.logger.error(`API Error: Failed to delete data`, {
        key,
        error: error.message,
        errorType: error.constructor.name,
      });
      throw error;
    }
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.SYSTEM_MONITOR)
  @Get("stats")
  @ApiOperation({
    summary: "📈 获取存储统计信息",
    description: `
### 功能说明
获取缓存和持久化存储的综合使用统计和性能指标。

### 权限要求
需要 SYSTEM_MONITOR 权限（系统监控）

### 统计内容
- **📊 缓存指标**: 命中率、内存使用、键数量等
- **💾 数据库指标**: 文档数量、存储大小、索引使用
- **⚡ 性能指标**: 平均响应时间、在处理的请求数
- **🔄 操作统计**: 读取、写入、删除操作次数
- **⚠️ 错误统计**: 错误率和失败原因分析
    `,
  })
  @ApiSuccessResponse({
    type: StorageStatsDto,
    description: "存储统计信息获取成功",
    schema: {
      example: {
        statusCode: 200,
        message: "存储统计信息获取成功",
        data: {
          cache: {
            totalKeys: 15420,
            memoryUsed: "256MB",
            hitRate: 0.87,
            avgResponseTime: 2.3,
            connectionsActive: 45,
          },
          persistent: {
            totalDocuments: 8934,
            storageSize: "1.2GB",
            indexSize: "128MB",
            avgQueryTime: 15.6,
            connectionsActive: 12,
          },
          performance: {
            totalOperations: 245680,
            avgStorageTime: 8.9,
            avgRetrievalTime: 3.2,
            errorRate: 0.02,
            throughput: 156.7,
          },
        },
        timestamp: "2024-01-01T12:00:00.000Z",
      },
    },
  })
  @ApiKeyAuthResponses()
  @ApiStandardResponses()
  async getStorageStats() {
    this.logger.log(`API Request: Get storage statistics`);

    try {
      const stats = await this.storageService.getStorageStats();

      this.logger.log(`API Success: Storage statistics generated`, {
        cacheKeys: stats.cache.totalKeys,
        persistentDocs: stats.persistent.totalDocuments,
        cacheHitRate: stats.cache.hitRate,
        errorRate: stats.performance.errorRate,
      });

      // 遵循控制器编写规范：让拦截器自动处理响应格式化
      return stats;
    } catch (error: any) {
      this.logger.error(`API Error: Failed to get storage statistics`, {
        error: error.message,
        errorType: error.constructor.name,
      });
      throw error;
    }
  }
}
