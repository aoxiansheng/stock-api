import { REFERENCE_DATA } from "@common/constants/domain";
import { API_OPERATIONS } from "@common/constants/domain";
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

import { createLogger } from "@common/logging/index";
import {
  ApiSuccessResponse,
  ApiStandardResponses,
} from "@common/core/decorators/swagger-responses.decorator";

import { ReadAccess } from "@authv2/decorators";

import {
  QueryRequestDto,
  BulkQueryRequestDto,
  QuerySymbolsRequestDto,
} from "../dto/query-request.dto";
import {
  QUERY_PERFORMANCE_CONFIG,
  QUERY_VALIDATION_RULES,
} from "../constants/query.constants";
import {
  QueryResponseDto,
  BulkQueryResponseDto,
  QueryStatsDto,
} from "../dto/query-response.dto";
import { QueryType } from "../dto/query-types.dto";
import { QueryService } from "../services/query.service";

// 统一错误处理基础设施
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from "@common/core/exceptions";

@ApiTags("🧠 弱时效接口 - 智能数据查询")
@Controller("query")
export class QueryController {
  private readonly logger = createLogger(QueryController.name);

  constructor(private readonly queryService: QueryService) {}

  @ReadAccess()
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
  "symbols": ["AAPL", "MSFT", REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
  "queryTypeFilter": API_OPERATIONS.STOCK_DATA.GET_QUOTE,
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
            timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
          },
        },
        timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
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
        timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
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

  @ReadAccess()
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

  @ReadAccess()
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
    example: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
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
    example: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
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
            timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
          },
        },
        timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
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
        timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
        path: "/query/symbols",
      },
    },
  })
  @ApiStandardResponses()
  async queryBySymbols(
    @QueryParam(new ValidationPipe({ transform: true, whitelist: true }))
    query: QuerySymbolsRequestDto,
  ) {
    const symbolArray = query.symbols
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (symbolArray.length === 0) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.QUERY,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'queryBySymbols',
        message: 'Symbols parameter is required',
        context: {
          endpoint: '/query/symbols',
          receivedSymbols: query.symbols,
          validationField: 'symbols',
        }
      });
    }

    if (symbolArray.length > QUERY_PERFORMANCE_CONFIG.MAX_SYMBOLS_PER_QUERY) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.QUERY,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'queryBySymbols',
        message: `单次查询股票代码数量不能超过${QUERY_PERFORMANCE_CONFIG.MAX_SYMBOLS_PER_QUERY}个`,
        context: {
          endpoint: '/query/symbols',
          receivedCount: symbolArray.length,
          maxAllowed: QUERY_PERFORMANCE_CONFIG.MAX_SYMBOLS_PER_QUERY,
          validationField: 'symbols',
        }
      });
    }

    const invalidSymbols = symbolArray.filter((symbol) => {
      const symbolLength = symbol.length;
      if (
        symbolLength < QUERY_VALIDATION_RULES.MIN_SYMBOL_LENGTH ||
        symbolLength > QUERY_VALIDATION_RULES.MAX_SYMBOL_LENGTH
      ) {
        return true;
      }

      return !QUERY_VALIDATION_RULES.SYMBOL_PATTERN.test(symbol);
    });

    if (invalidSymbols.length > 0) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.QUERY,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'queryBySymbols',
        message: 'symbols包含非法格式的股票代码',
        context: {
          endpoint: '/query/symbols',
          invalidSymbols: invalidSymbols.slice(0, 10),
          invalidCount: invalidSymbols.length,
          validationField: 'symbols',
          symbolPattern: QUERY_VALIDATION_RULES.SYMBOL_PATTERN.source,
          minLength: QUERY_VALIDATION_RULES.MIN_SYMBOL_LENGTH,
          maxLength: QUERY_VALIDATION_RULES.MAX_SYMBOL_LENGTH,
        }
      });
    }

    this.logger.log(`API Request: Quick query by symbols`, {
      symbols: symbolArray.slice(0, 3),
      provider: query.provider,
      market: query.market,
      queryTypeFilter: query.queryTypeFilter,
      limit: query.limit,
    });

    const request: QueryRequestDto = {
      queryType: QueryType.BY_SYMBOLS,
      symbols: symbolArray,
      provider: query.provider,
      market: query.market,
      queryTypeFilter: query.queryTypeFilter,
      limit: query.limit || 100,
      page: query.page || 1,
      options: {
        useCache: query.useCache !== false,
        includeMetadata: false,
      },
    };

    return this.executeQuery(request);
  }

  // 已移除 /query/market、/query/provider、/query/stats 端点，聚焦核心查询能力

  // ✅ 自定义健康检查端点已移除
  // 符合监控组件集成规范，健康检查统一由全局监控组件提供
  // 请使用: /api/v1/monitoring/health/score
}
