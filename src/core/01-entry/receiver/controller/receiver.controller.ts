import { REFERENCE_DATA } from '@common/constants/domain';
import { API_OPERATIONS } from '@common/constants/domain';
import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  HttpCode
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiConsumes } from "@nestjs/swagger";

import { createLogger } from "@common/logging/index";
import {
  ApiSuccessResponse,
  ApiKeyAuthResponses,
} from "@common/core/decorators/swagger-responses.decorator";

import { ApiKeyAuth } from "../../../../auth/decorators/auth.decorator";
import { RequirePermissions } from "../../../../auth/decorators/permissions.decorator";
import { Permission } from "../../../../auth/enums/user-role.enum";

import { DataRequestDto } from "../dto/data-request.dto";
import { DataResponseDto } from "../dto/data-response.dto";
import { ReceiverService } from "../services/receiver.service";

@ApiTags("🚀 强时效接口 - 实时数据接收")
@Controller("receiver")
export class ReceiverController {
  private readonly logger = createLogger(ReceiverController.name);

  constructor(private readonly receiverService: ReceiverService) {}

  @ApiKeyAuth()
  @RequirePermissions(Permission.DATA_READ)
  @Post("data")
  @HttpCode(200)
  @ApiOperation({
    summary: "🚀 强时效数据接收 - 实时交易专用",
    description: `
### 🎯 强时效接口特性
**专为高频交易和实时决策场景设计，提供1秒级缓存策略和毫秒级响应**

### 🚀 核心优势
- **⚡ 超快响应**: 交易时间1秒缓存，非交易时间60秒缓存
- **📊 市场感知**: 自动识别交易时间，动态调整缓存策略  
- **🎯 实时优先**: 优先获取最新数据，适合高频交易场景
- **🔄 智能容错**: 缓存失败不阻塞业务，确保数据可用性

### 🕐 动态缓存策略
- **交易时间**: 1秒缓存 (确保极致实时性)
- **盘前盘后**: 5秒缓存 (平衡实时性与性能)  
- **休市时间**: 60秒缓存 (降低系统负载)
- **夏令时支持**: 自动适配美股夏令时变化

### 📈 适用场景
- 量化交易策略执行
- 实时价格监控告警
- 高频数据分析
- 交易决策支持系统

### 🌍 多市场支持
- **美股 (US)**: 9:30-16:00 EST, 支持夏令时
- **港股 (HK)**: 9:30-12:00, 13:00-16:00 HKT  
- **A股 (SH/SZ)**: 9:30-11:30, 13:00-15:00 CST

### 📊 支持的数据类型
- \`get-stock-quote\`: 实时行情 (价格、涨跌、成交量、买卖盘等)
- \`get-stock-basic-info\`: 基本信息 (公司名称、行业、财务指标等)
- \`get-index-quote\`: 指数行情 (主要指数实时数据)

### 📝 示例请求
\`\`\`json
{
  "symbols": ["AAPL", REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, "000001.SZ"],
  "receiverType": API_OPERATIONS.STOCK_DATA.GET_QUOTE,
  "options": {
    "realtime": true,
    "timeout": 3000
  }
}
\`\`\`

### ⚠️ 使用建议
- 适合需要极低延迟的实时数据场景
- 对于历史数据分析，建议使用 \`/query/execute\` (弱时效接口)
- 高频调用请注意API限额管理
    `,
  })
  @ApiSuccessResponse({
    type: DataResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: "强时效数据获取成功",
        data: {
          success: true,
          data: [
            {
              symbol: "AAPL",
              lastPrice: 195.89,
              change: 2.31,
              changePercent: 1.19,
              volume: 45678900,
              bid: 195.85,
              ask: 195.91,
              market: "US",
              marketStatus: "TRADING",
              timestamp: "2024-01-01T15:30:01.123Z", // 毫秒级时间戳
            },
            {
              symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
              lastPrice: 385.6,
              change: -4.2,
              changePercent: -1.08,
              volume: 12345600,
              bid: 385.4,
              ask: 385.8,
              market: "HK",
              marketStatus: "TRADING",
              timestamp: "2024-01-01T08:00:01.456Z", // 毫秒级时间戳
            },
          ],
          metadata: {
            requestId: "req_realtime_1704110400123",
            provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
            processingTime: 23, // 超快响应时间
            cacheUsed: false, // 强时效优先获取最新数据
            cacheTTL: 1, // 1秒缓存
            marketAware: true, // 市场感知
            timestamp: "2024-01-01T12:00:01.789Z",
          },
        },
        timestamp: "2024-01-01T12:00:01.789Z",
      },
    },
  })
  @ApiKeyAuthResponses()
  @ApiConsumes("application/json")
  async handleDataRequest(@Body(ValidationPipe) request: DataRequestDto) {
    this.logger.log(`接收数据请求`, {
      symbols: request.symbols,
      receiverType: request.receiverType,
      options: request.options,
    });

    try {
      const result = await this.receiverService.handleRequest(request);

      // 🎯 修改：根据部分失败情况动态判断成功状态
      const isFullySuccessful = !result.metadata.hasPartialFailures;

      this.logger.log(`数据请求处理完成`, {
        requestId: result.metadata.requestId,
        success: isFullySuccessful,
        provider: result.metadata.provider,
        processingTime: result.metadata.processingTime,
        totalRequested: result.metadata.totalRequested,
        successfullyProcessed: result.metadata.successfullyProcessed,
        hasPartialFailures: result.metadata.hasPartialFailures,
      });

      // 🎯 合规修复：直接返回业务数据，让 ResponseInterceptor 自动处理格式化
      return result;
    } catch (error: any) {
      this.logger.error(`数据请求处理失败`, {
        error: error.message,
        stack: error.stack,
        symbols: request.symbols,
        receiverType: request.receiverType,
      });
      throw error;
    }
  }
}
