import {
  Controller,
  Post,
  Get,
  Body,
  Query as QueryParam,
  ValidationPipe,
  HttpStatus,
  HttpCode,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiQuery,
  ApiSecurity,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { createLogger } from "@app/config/logger.config";
import {
  ApiSuccessResponse,
  ApiStandardResponses,
  ApiHealthResponse,
} from "@common/core/decorators/swagger-responses.decorator";

import { ApiKeyAuth } from "../../../../auth/decorators/auth.decorator";
import { RequirePermissions } from "../../../../auth/decorators/permissions.decorator";
import { Permission } from "../../../../auth/enums/user-role.enum";

import { QueryRequestDto, BulkQueryRequestDto } from "../dto/query-request.dto";
import {
  QueryResponseDto,
  BulkQueryResponseDto,
  QueryStatsDto,
} from "../dto/query-response.dto";
import { QueryType } from "../dto/query-types.dto";
import { QueryService } from "../services/query.service";

@ApiTags("🧠 弱时效接口 - 智能数据查询")
@Controller("query")
export class QueryController {
  private readonly logger = createLogger(QueryController.name);

  constructor(private readonly queryService: QueryService) {}

  @ApiKeyAuth()
  @RequirePermissions(Permission.QUERY_EXECUTE)
  @Post("execute")
  @HttpCode(200)
  @ApiOperation({
    summary: "🧠 弱时效数据查询 - 分析决策专用",
    description: `
### 🎯 弱时效接口特性  
**专为数据分析和决策支持场景设计，提供智能变化检测和双存储策略**

### 🧠 核心优势
- **🔍 智能变化检测**: 基于关键字段变化检测，避免不必要的数据更新
- **💾 双存储策略**: Redis缓存 + MongoDB持久化，确保数据可靠性
- **📊 多维查询**: 支持6种查询类型，满足复杂分析需求  
- **🎛️ 灵活配置**: 可自定义缓存策略、数据过滤等参数

### 🔄 智能缓存策略
- **变化检测**: 检测价格、成交量等关键字段变化
- **市场感知**: 交易时间1分钟缓存，休市时间1小时缓存
- **双存储**: 热数据存Redis，冷数据存MongoDB  
- **版本控制**: 数据变化历史追踪，支持回溯分析

### 📋 查询类型支持
1. **\`by_symbols\`** - 按股票代码查询 ✅ 已实现
   - 批量代码查询，支持跨市场
   - 智能变化检测，减少冗余更新
   - 适合投资组合监控

2. **\`by_market\`** - 按市场查询 🚧 框架就绪  
   - 整个市场数据概览
   - 支持 US、HK、SZ、SH 等市场
   - 适合市场趋势分析

3. **\`by_provider\`** - 按数据源查询 🚧 框架就绪
   - 指定数据源获取数据
   - 数据源质量对比分析
   - 适合数据验证场景

4. **\`by_tag\`** - 按分类查询 🚧 框架就绪
   - 按行业、板块、概念分类
   - 主题投资数据分析
   - 适合选股筛选

5. **\`by_time_range\`** - 历史数据查询 🚧 框架就绪
   - 指定时间范围历史数据
   - 支持技术分析指标计算
   - 适合回测和研究

6. **\`advanced\`** - 高级复合查询 🚧 框架就绪
   - 多条件组合查询
   - 复杂筛选和排序逻辑
   - 适合量化选股

### 📈 适用场景  
- 投资组合分析与监控
- 市场研究与趋势分析
- 量化策略回测验证
- 风险管理数据支持
- 基本面数据分析

### 📊 性能特性
- **三层缓存**: 内存 + Redis + MongoDB
- **批量处理**: 支持大批量数据查询  
- **并发优化**: 智能并发控制，防止系统过载
- **统计分析**: 完整的查询性能指标

### 📝 示例：智能组合查询
\`\`\`json
{
  "queryType": "by_symbols",
  "symbols": ["AAPL", "MSFT", "700.HK"],
  "queryTypeFilter": "get-stock-quote",
  "maxAge": 300,
  "options": {
    "useCache": true,
    "includeMetadata": true
  }
}
\`\`\`

### ⚠️ 使用建议
- 适合数据分析、研究等对时效性要求相对宽松的场景
- 对于毫秒级实时需求，建议使用 \`/receiver/data\` (强时效接口)
- 大批量查询建议使用 \`/query/bulk\` 端点
    `,
  })
  @ApiSecurity("ApiKey")
  @ApiSuccessResponse({
    description: "弱时效数据查询成功",
    type: QueryResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: "智能数据查询执行成功",
        data: {
          success: true,
          data: [
            {
              symbol: "AAPL",
              lastPrice: 195.89,
              change: 2.31,
              changePercent: 1.19,
              volume: 45678900,
              market: "US",
              dataAge: 45, // 数据年龄(秒)
              changeDetected: false, // 变化检测结果
              lastUpdate: "2024-01-01T15:29:15.000Z",
            },
          ],
          metadata: {
            queryType: "by_symbols",
            totalResults: 1,
            returnedResults: 1,
            executionTime: 89, // 相对较慢但智能
            cacheUsed: true,
            changeDetection: {
              // 变化检测信息
              enabled: true,
              queryFieldsChecked: ["lastPrice", "volume", "change"],
              significantChanges: 0,
            },
            dataSources: {
              cache: 1, // 优先使用缓存
              persistent: 0, // MongoDB持久化
              realtime: 0, // 实时获取
            },
            cachingStrategy: {
              ttl: 60, // 智能TTL
              dualStorage: true, // 双存储
              marketAware: true, // 市场感知
            },
            timestamp: "2024-01-01T12:00:00.000Z",
          },
        },
        timestamp: "2024-01-01T12:00:00.000Z",
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "查询参数错误",
    schema: {
      example: {
        statusCode: 400,
        message: ["queryType不能为空", "symbols数组不能为空"],
        error: "Bad Request",
        details: [
          {
            field: "queryType",
            code: "IS_NOT_EMPTY",
            message: "queryType不能为空",
          },
        ],
        timestamp: "2024-01-01T12:00:00.000Z",
        path: "/query/execute",
      },
    },
  })
  @ApiStandardResponses()
  @ApiConsumes("application/json")
  async executeQuery(@Body(ValidationPipe) request: QueryRequestDto) {
    this.logger.log(`API Request: Execute query`, {
      queryType: request.queryType,
      symbols: request.symbols?.slice(0, 3),
      market: request.market,
      provider: request.provider,
      queryTypeFilter: request.queryTypeFilter,
      limit: request.limit,
    });

    try {
      const result = await this.queryService.executeQuery(request);

      this.logger.log(`API Success: Query executed successfully`, {
        queryType: request.queryType,
        success: true,
        totalResults: result.metadata.totalResults,
        returnedResults: result.metadata.returnedResults,
        executionTime: result.metadata.executionTime,
        cacheUsed: result.metadata.cacheUsed,
        dataSources: result.metadata.dataSources,
      });

      // 遵循控制器编写规范：让拦截器自动处理响应格式化
      return result;
    } catch (error: any) {
      this.logger.error(`API Error: Query execution failed`, {
        queryType: request.queryType,
        error: error.message,
        errorType: error.constructor.name,
      });
      throw error;
    }
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.QUERY_EXECUTE)
  @Post("bulk")
  @ApiOperation({
    summary: "Execute multiple queries in bulk",
    description:
      "Execute multiple queries in parallel or sequentially with error handling",
  })
  @ApiSuccessResponse({ type: BulkQueryResponseDto })
  @ApiStandardResponses()
  @ApiConsumes("application/json")
  async executeBulkQuery(@Body(ValidationPipe) request: BulkQueryRequestDto) {
    this.logger.log(`API Request: Execute bulk query`, {
      queriesCount: request.queries.length,
      parallel: request.parallel,
      continueOnError: request.continueOnError,
      queryTypes: [...new Set(request.queries.map((q) => q.queryType))],
    });

    try {
      const result = await this.queryService.executeBulkQuery(request);

      this.logger.log(`API Success: Bulk query executed successfully`, {
        totalQueries: result.summary.totalQueries,
        successful: result.results.length,
        failed: result.summary.totalQueries - result.results.length,
        totalTime: result.summary.totalExecutionTime,
        averageTime: result.summary.averageExecutionTime,
      });

      // 遵循控制器编写规范：让拦截器自动处理响应格式化
      return result;
    } catch (error: any) {
      this.logger.error(`API Error: Bulk query execution failed`, {
        queriesCount: request.queries.length,
        error: error.message,
        errorType: error.constructor.name,
      });
      throw error;
    }
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.QUERY_EXECUTE)
  @Get("symbols")
  @ApiOperation({
    summary: "按股票代码快速查询（GET方式）",
    description:
      "便捷的GET端点，通过股票代码列表快速查询数据。支持多个代码用逗号分隔，适合简单的股票数据查询场景",
  })
  @ApiQuery({
    name: "symbols",
    description: "股票代码列表，多个代码用逗号分隔",
    example: "AAPL,GOOGL,MSFT",
  })
  @ApiQuery({
    name: "provider",
    description: "指定数据提供商（可选）",
    example: "longport",
    required: false,
  })
  @ApiQuery({
    name: "market",
    description: "指定市场（可选）",
    example: "US",
    required: false,
  })
  @ApiQuery({
    name: "queryTypeFilter",
    description: "数据类别（可选）",
    example: "get-stock-quote",
    required: false,
  })
  @ApiQuery({
    name: "limit",
    description: "返回结果数量限制",
    example: 10,
    required: false,
  })
  
  @ApiQuery({
    name: "useCache",
    description: "是否使用缓存",
    example: true,
    required: false,
  })
  @ApiSuccessResponse({
    description: "按代码查询成功",
    type: QueryResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: "按股票代码查询成功",
        data: {
          success: true,
          data: [
            {
              symbol: "AAPL",
              price: 150.25,
              change: 2.15,
              changePercent: 1.45,
              volume: 5234567,
              market: "US",
            },
            {
              symbol: "GOOGL",
              price: 2750.8,
              change: -15.2,
              changePercent: -0.55,
              volume: 1234567,
              market: "US",
            },
          ],
          metadata: {
            queryType: "by_symbols",
            totalResults: 2,
            returnedResults: 2,
            executionTime: 89,
            cacheUsed: true,
            dataSources: {
              cache: 2,
              persistent: 0,
              realtime: 0,
            },
            timestamp: "2024-01-01T12:00:00.000Z",
          },
        },
        timestamp: "2024-01-01T12:00:00.000Z",
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "参数错误",
    schema: {
      example: {
        statusCode: 400,
        message: "symbols参数是必需的",
        error: "Bad Request",
        timestamp: "2024-01-01T12:00:00.000Z",
        path: "/query/symbols",
      },
    },
  })
  @ApiStandardResponses()
  async queryBySymbols(
    @QueryParam("symbols") symbols: string,
    @QueryParam("provider") provider?: string,
    @QueryParam("market") market?: string,
    @QueryParam("queryTypeFilter") queryTypeFilter?: string,
    @QueryParam("limit") limit?: number,
    @QueryParam("page") page?: number,
    @QueryParam("useCache") useCache?: boolean,
  ) {
    if (!symbols) {
      throw new Error("Symbols parameter is required");
    }

    const symbolArray = symbols
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    this.logger.log(`API Request: Quick query by symbols`, {
      symbols: symbolArray.slice(0, 3),
      provider,
      market,
      queryTypeFilter,
      limit,
    });

    const request: QueryRequestDto = {
      queryType: QueryType.BY_SYMBOLS,
      symbols: symbolArray,
      provider,
      market,
      queryTypeFilter: queryTypeFilter,
      limit: limit || 100,
      page: page || 1,
      options: {
        useCache: useCache !== false,
        includeMetadata: false,
      },
    };

    return this.executeQuery(request);
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.QUERY_EXECUTE)
  @Get("market")
  @ApiOperation({
    summary: "Query data by market",
    description: "Query all available data for a specific market",
  })
  @ApiSuccessResponse({ type: QueryResponseDto })
  @ApiStandardResponses()
  async queryByMarket(
    @QueryParam("market") market: string,
    @QueryParam("provider") provider?: string,
    @QueryParam("queryTypeFilter") queryTypeFilter?: string,
    @QueryParam("limit") limit?: number,
    @QueryParam("page") page?: number,
  ) {
    if (!market) {
      throw new Error("Market parameter is required");
    }

    this.logger.log(`API Request: Query by market`, {
      market,
      provider,
      queryTypeFilter,
      limit,
    });

    const request: QueryRequestDto = {
      queryType: QueryType.BY_MARKET,
      market,
      provider,
      queryTypeFilter,
      limit: limit || 100,
      page: page || 1,
      options: {
        useCache: true,
        includeMetadata: true,
      },
    };

    return this.executeQuery(request);
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.QUERY_EXECUTE)
  @Get("provider")
  @ApiOperation({
    summary: "Query data by provider",
    description: "Query all available data from a specific provider",
  })
  @ApiSuccessResponse({ type: QueryResponseDto })
  @ApiStandardResponses()
  async queryByProvider(
    @QueryParam("provider") provider: string,
    @QueryParam("market") market?: string,
    @QueryParam("queryTypeFilter") queryTypeFilter?: string,
    @QueryParam("limit") limit?: number,
    @QueryParam("page") page?: number,
  ) {
    if (!provider) {
      throw new Error("Provider parameter is required");
    }

    this.logger.log(`API Request: Query by provider`, {
      provider,
      market,
      queryTypeFilter,
      limit,
    });

    const request: QueryRequestDto = {
      queryType: QueryType.BY_PROVIDER,
      provider,
      market,
      queryTypeFilter,
      limit: limit || 100,
      page: page || 1,
      options: {
        useCache: true,
        includeMetadata: true,
      },
    };

    return this.executeQuery(request);
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.SYSTEM_MONITOR)
  @Get("stats")
  @ApiOperation({
    summary: "获取查询统计信息",
    description:
      "获取查询服务的综合统计信息，包括性能指标、查询类型分布、数据源使用情况等详细分析数据",
  })
  @ApiSuccessResponse({
    description: "查询统计信息获取成功",
    type: QueryStatsDto,
    schema: {
      example: {
        statusCode: 200,
        message: "查询统计信息获取成功",
        data: {
          performance: {
            totalQueries: 15420,
            averageExecutionTime: 127,
            cacheHitRate: 0.82,
            errorRate: 0.03,
            queriesPerSecond: 45.6,
          },
          queryTypes: {
            by_symbols: {
              count: 8540,
              averageTime: 95,
            },
            by_market: {
              count: 4120,
              averageTime: 185,
            },
          },
          dataSources: {
            cache: { queries: 12644, avgTime: 15, successRate: 0.99 },
            persistent: { queries: 2776, avgTime: 125, successRate: 0.97 },
            realtime: { queries: 324, avgTime: 456, successRate: 0.94 },
          },
          popularQueries: [
            {
              pattern: "AAPL,GOOGL,MSFT",
              count: 156,
              averageTime: 89,
              lastExecuted: "2024-01-01T11:55:00.000Z",
            },
          ],
          timestamp: "2024-01-01T12:00:00.000Z",
        },
        timestamp: "2024-01-01T12:00:00.000Z",
      },
    },
  })
  @ApiStandardResponses()
  async getQueryStats() {
    this.logger.log(`API Request: Get query statistics`);

    try {
      const stats = await this.queryService.getQueryStats();

      this.logger.log(`API Success: Query statistics generated`, {
        totalQueries: stats.performance.totalQueries,
        averageExecutionTime: stats.performance.averageExecutionTime,
        cacheHitRate: stats.performance.cacheHitRate,
        errorRate: stats.performance.errorRate,
        queryTypesCount: Object.keys(stats.queryTypes).length,
      });

      // 遵循控制器编写规范：让拦截器自动处理响应格式化
      return stats;
    } catch (error: any) {
      this.logger.error(`API Error: Failed to get query statistics`, {
        error: error.message,
        errorType: error.constructor.name,
      });
      throw error;
    }
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.SYSTEM_HEALTH)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Get("health")
  @ApiOperation({
    summary: "查询服务健康检查",
    description:
      "测试查询服务功能和数据源连接状态，检查缓存、持久化存储和实时数据源的可用性（需要API Key认证）",
  })
  @ApiHealthResponse()
  async healthCheck() {
    this.logger.log(`API Request: Query service health check`);

    const startTime = Date.now();

    try {
      // Test basic query functionality
      const testQuery: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ["TEST"],
        queryTypeFilter: "get-stock-quote",
        options: {
          useCache: false,
        },
      };

      const result = await this.queryService.executeQuery(testQuery);
      const latency = Date.now() - startTime;

      // The result might not succeed (TEST symbol doesn't exist), but service should respond
      const queryServiceHealthy = result !== null;

      const healthResult = {
        queryService: {
          available: queryServiceHealthy,
          latency,
        },
        // 过滤敏感信息，只返回基础健康状态
        overallHealth: {
          healthy: queryServiceHealthy,
          timestamp: new Date().toISOString(),
        },
      };

      this.logger.log(`API Success: Query service health check completed`, {
        queryServiceHealthy,
        latency,
        overallHealthy: healthResult.overallHealth.healthy,
      });

      // 遵循控制器编写规范：让拦截器自动处理响应格式化
      return healthResult;
    } catch (error: any) {
      const latency = Date.now() - startTime;

      this.logger.error(`API Error: Query service health check failed`, {
        error: error.message,
        latency,
      });

      const healthResult = {
        queryService: {
          available: false,
          latency,
        },
        // 过滤敏感信息，只返回基础健康状态
        overallHealth: {
          healthy: false,
          timestamp: new Date().toISOString(),
        },
      };

      // 遵循控制器编写规范：让拦截器自动处理响应格式化，但需要抛出错误让系统处理
      const healthError = new Error("查询服务健康检查失败");
      (healthError as any).statusCode = 503;
      (healthError as any).data = healthResult;
      throw healthError;
    }
  }
}
