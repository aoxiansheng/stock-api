import { REFERENCE_DATA } from "@common/constants/domain";
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
import { ApiTags, ApiOperation, ApiParam, ApiConsumes } from "@nestjs/swagger";

import { createLogger } from "@common/logging/index";
import {
  ApiSuccessResponse,
  ApiStandardResponses,
  ApiKeyAuthResponses,
} from "@common/core/decorators/swagger-responses.decorator";

import { AdminOnly } from "@authv2/decorators";

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

  @AdminOnly()
  @Post("store")
  @ApiOperation({
    summary: "💾 存储数据（仅持久化）",
    description: `
仅支持 MongoDB 持久化存储，提供可选压缩与过期时间（TTL）。\n\n权限：SYSTEM_ADMIN\n\n特性：\n- 仅持久化：聚焦核心，移除缓存/监控相关逻辑\n- 可选压缩：大对象按阈值自动压缩\n- 可选TTL：设置文档过期时间（MongoDB TTL 索引）
    `,
  })
  @ApiSuccessResponse({
    type: StorageResponseDto,
    description: "数据存储成功（持久化）",
    schema: {
      example: {
        statusCode: 200,
        message: "数据存储成功",
        data: {
          metadata: {
            dataSize: 1024,
            compressed: true,
            processingTimeMs: 45,
            storageType: "persistent"
          },
        },
        timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
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

  @AdminOnly()
  @Post("retrieve")
  @ApiOperation({
    summary: "📥 检索数据（仅持久化）",
    description: `
仅支持从 MongoDB 检索数据。可选返回压缩元信息。\n\n权限：SYSTEM_ADMIN
    `,
  })
  @ApiSuccessResponse({
    type: StorageResponseDto,
    description: "数据检索成功（持久化）",
    schema: {
      example: {
        statusCode: 200,
        message: "数据检索成功",
        data: {
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
            storedAt: "2024-01-01T15:29:45.000Z",
          },
          cacheInfo: { hit: true, source: "persistent" },
        },
        timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
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

  @AdminOnly()
  @Get("retrieve/:key")
  @ApiOperation({
    summary: "📤 按键检索（仅持久化）",
    description: `
便捷 GET 端点，按键名检索，内部固定使用持久化存储。\n\n权限：SYSTEM_ADMIN
    `,
  })
  @ApiParam({
    name: "key",
    description: "存储键名",
    example: "stock:AAPL:quote",
  })
  
  @ApiSuccessResponse({
    type: StorageResponseDto,
    description: "按键名检索成功",
    schema: {
      example: {
        statusCode: 200,
        message: "数据检索成功",
        data: {
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
            storedAt: "2024-01-01T15:28:30.000Z",
          },
          cacheInfo: { hit: true, source: "persistent" },
        },
        timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
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

    const isValidType = Object.values(StorageType).includes(preferredType as StorageType);

    const request: RetrieveDataDto = {
      key,
      preferredType: isValidType ? (preferredType as StorageType) : StorageType.PERSISTENT, // 仅支持数据库存储
    };

    return this.retrieveData(request);
  }

  @AdminOnly()
  @Delete(":key")
  @ApiOperation({
    summary: "🗑️ 删除数据（仅持久化）",
    description: `
从 MongoDB 删除指定 key 的数据。\n\n权限：SYSTEM_ADMIN\n\n注意：删除操作不可逆，请谨慎使用。
    `,
  })
  @ApiParam({
    name: "key",
    description: "要删除的存储键名",
    example: "stock:AAPL:quote",
  })
  
  @ApiSuccessResponse({
    description: "数据删除成功",
    schema: {
      example: {
        statusCode: 200,
        message: "数据删除成功",
        data: {
          deleted: 2,
          key: "stock:AAPL:quote",
        },
        timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
      },
    },
  })
  @ApiStandardResponses()
  async deleteData(
    @Param("key") key: string,
    @Query("storageType") storageType?: string,
  ) {
    const isValidType = Object.values(StorageType).includes(storageType as StorageType);
    const resolvedStorageType = isValidType ? (storageType as StorageType) : StorageType.PERSISTENT;

    this.logger.log(`API Request: Delete data`, {
      key,
      storageType: resolvedStorageType,
    });

    try {
      const deleted = await this.storageService.deleteData(
        key,
        resolvedStorageType,
      );

      this.logger.log(`API Success: Data deletion completed`, {
        key,
        deleted,
        storageType: resolvedStorageType,
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

  @AdminOnly()
  @Get("stats")
  @ApiOperation({
    summary: "📈 获取存储统计（仅持久化）",
    description: `
返回持久化存储的统计信息（文档数、总大小、分类/提供商分布）。\n\n权限：SYSTEM_MONITOR
    `,
  })
  @ApiSuccessResponse({
    type: StorageStatsDto,
    description: "存储统计信息获取成功（持久化）",
    schema: {
      example: {
        statusCode: 200,
        message: "存储统计信息获取成功",
        data: {
          persistent: {
            totalDocuments: 8934,
            totalSizeBytes: 1200000000,
            categoriesCounts: { stock_quote: 5000, stock_info: 3000 },
            providerCounts: { longport: 7000, yahoo: 1934 }
          },
        },
        timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
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
        persistentDocs: stats.persistent.totalDocuments,
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
