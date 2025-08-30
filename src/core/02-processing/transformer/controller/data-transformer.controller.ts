import { ApiTags, ApiOperation, ApiConsumes } from "@nestjs/swagger";

import { createLogger } from "@app/config/logger.config";
import {
  ApiSuccessResponse,
  ApiStandardResponses,
  ApiKeyAuthResponses,
} from "@common/core/decorators/swagger-responses.decorator";
import { Controller, Post, Body, ValidationPipe, BadRequestException } from "@nestjs/common";
import { ApiKeyAuth } from "../../../../auth/decorators/auth.decorator";
import { Permission } from "../../../../auth/enums/user-role.enum";

import { DataTransformRequestDto } from "../dto/data-transform-request.dto";
import { DataTransformResponseDto } from "../dto/data-transform-response.dto";
import { DataTransformerService } from "../services/data-transformer.service";

@ApiTags("数据转换 (Data Transformer)")
@Controller("data-transformer")
export class DataTransformerController {
  private readonly logger = createLogger(DataTransformerController.name);

  constructor(private readonly dataTransformerService: DataTransformerService) {}

  @ApiKeyAuth([Permission.DATA_READ])
  @Post("data-transform")
  @ApiOperation({
    summary: "数据转换",
    description: "使用预设映射规则将原始数据转换为标准化格式",
  })
  @ApiSuccessResponse({
    type: DataTransformResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: "数据转换成功",
        data: {
          success: true,
          transformedData: [
            {
              symbol: "700.HK",
              lastPrice: 385.6,
              change: -4.2,
              changePercent: -1.08,
              market: "HK",
            },
          ],
          metadata: {
            recordsProcessed: 1,
            fieldsTransformed: 4,
            processingTime: 25,
            dataMapperRuleId: "rule_123",
            ruleName: "LongPort股票行情映射",
            timestamp: "2024-01-01T12:00:00.000Z",
          },
        },
        timestamp: "2024-01-01T12:00:00.000Z",
      },
    },
  })
  @ApiKeyAuthResponses()
  @ApiStandardResponses()
  @ApiConsumes("application/json")
  async transform(@Body(ValidationPipe) request: DataTransformRequestDto) {
    this.logger.log(`API Request: Transform data`, {
      provider: request.provider,
      transDataRuleListType: request.transDataRuleListType,
      mappingOutRuleId: request.mappingOutRuleId,
      hasRawData: !!request.rawData,
      options: request.options,
    });

    try {
      const result = await this.dataTransformerService.transform(request);

      this.logger.log(`API Success: Data transformation completed`, {
        provider: request.provider,
        transDataRuleListType: request.transDataRuleListType,
        success: true,
        recordsProcessed: result.metadata.recordsProcessed,
        fieldsTransformed: result.metadata.fieldsTransformed,
        processingTime: result.metadata.processingTime,
        dataMapperRuleId: result.metadata.ruleId,
        ruleName: result.metadata.ruleName,
      });

      // 遵循控制器编写规范：让拦截器自动处理响应格式化
      return result;
    } catch (error: any) {
      this.logger.error(`API Error: Data transformation failed`, {
        provider: request.provider,
        transDataRuleListType: request.transDataRuleListType,
        error: error.message,
        errorType: error.constructor.name,
      });
      throw error;
    }
  }

  @ApiKeyAuth([Permission.DATA_READ])
  @Post("data-transform-batch")
  @ApiOperation({
    summary: "批量数据转换",
    description: "批量处理多个数据转换请求，支持并行优化",
  })
  @ApiSuccessResponse({
    type: [DataTransformResponseDto],
    schema: {
      example: {
        statusCode: 200,
        message: "批量数据转换成功",
        data: [
          {
            success: true,
            transformedData: [{ symbol: "700.HK", lastPrice: 385.6 }],
            metadata: { recordsProcessed: 1, processingTime: 25 },
          },
          {
            success: true,
            transformedData: [{ symbol: "AAPL.US", lastPrice: 195.89 }],
            metadata: { recordsProcessed: 1, processingTime: 28 },
          },
        ],
        timestamp: "2024-01-01T12:00:00.000Z",
      },
    },
  })
  @ApiKeyAuthResponses()
  @ApiStandardResponses()
  @ApiConsumes("application/json")
  async transformBatch(@Body(new ValidationPipe({ validateCustomDecorators: true, transform: true, whitelist: true })) requests: DataTransformRequestDto[]) {
    // 验证请求体是数组
    if (!Array.isArray(requests)) {
      throw new BadRequestException('批量请求必须是TransformRequestDto数组');
    }

    this.logger.log(`API Request: Batch transform data`, {
      batchSize: requests.length,
      providers: [...new Set(requests.map((r) => r.provider))],
      transDataRuleListTypes: [...new Set(requests.map((r) => r.transDataRuleListType))],
    });

    try {
      const results = await this.dataTransformerService.transformBatch({
        requests,
      });

      const successful = results.length;
      const failed = requests.length - results.length;

      this.logger.log(`API Success: Batch transformation completed`, {
        batchSize: requests.length,
        successful,
        failed,
        totalProcessingTime: results.reduce(
          (sum, r) => sum + r.metadata.processingTime,
          0,
        ),
      });

      // 遵循控制器编写规范：让拦截器自动处理响应格式化
      return results;
    } catch (error: any) {
      this.logger.error(`API Error: Batch transformation failed`, {
        batchSize: requests.length,
        error: error.message,
        errorType: error.constructor.name,
      });
      throw error;
    }
  }
}