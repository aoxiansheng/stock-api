import { Controller, Post, Body, ValidationPipe } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiConsumes } from "@nestjs/swagger";

import { createLogger } from "@common/config/logger.config";
import {
  ApiSuccessResponse,
  ApiStandardResponses,
  ApiKeyAuthResponses,
} from "@common/core/decorators/swagger-responses.decorator";

import { ApiKeyAuth } from "../../../auth/decorators/auth.decorator";
import { RequirePermissions } from "../../../auth/decorators/permissions.decorator";
import { Permission } from "../../../auth/enums/user-role.enum";

import { TransformRequestDto } from "../dto/transform-request.dto";
import { TransformResponseDto } from "../dto/transform-response.dto";
import { TransformerService } from "../services/transformer.service";

@ApiTags("⚡ 数据转换")
@Controller("transformer")
export class TransformerController {
  private readonly logger = createLogger(TransformerController.name);

  constructor(private readonly transformerService: TransformerService) {}

  @ApiKeyAuth()
  @RequirePermissions(Permission.TRANSFORMER_PREVIEW)
  @Post("transform")
  @ApiOperation({
    summary: "⚡ 智能数据转换",
    description: `
### 功能说明
高性能数据转换引擎，使用预设映射规则将原始数据转换为标准化格式。

### 核心特性
- **🤖 智能映射**: 自动应用数据映射规则
- **📊 批量处理**: 支持大量数据同时转换
- **⚡ 高性能**: 毫秒级转换响应
- **🔍 详细统计**: 提供转换过程的详细指标

### 权限要求
需要 TRANSFORMER_PREVIEW 权限（开发者/管理员）

### 示例请求
\`\`\`json
{
  "provider": "longport",
  "transDataRuleListType": "get-stock-quote",
  "mappingOutRuleId": "rule_123",
  "rawData": {
    "secu_quote": [{
      "symbol": "700.HK",
      "last_done": 385.6,
      "change_val": -4.2,
      "change_rate": -0.0108
    }]
  },
  "options": {
    "validateOutput": true,
    "includeMetadata": true
  }
}
\`\`\`
    `,
  })
  @ApiSuccessResponse({
    type: TransformResponseDto,
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
            ruleId: "rule_123",
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
  async transform(@Body(ValidationPipe) request: TransformRequestDto) {
    this.logger.log(`API Request: Transform data`, {
      provider: request.provider,
      transDataRuleListType: request.transDataRuleListType,
      mappingOutRuleId: request.mappingOutRuleId,
      hasRawData: !!request.rawData,
      options: request.options,
    });

    try {
      const result = await this.transformerService.transform(request);

      this.logger.log(`API Success: Data transformation completed`, {
        provider: request.provider,
        transDataRuleListType: request.transDataRuleListType,
        success: true,
        recordsProcessed: result.metadata.recordsProcessed,
        fieldsTransformed: result.metadata.fieldsTransformed,
        processingTime: result.metadata.processingTime,
        ruleId: result.metadata.ruleId,
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

  @ApiKeyAuth()
  @RequirePermissions(Permission.TRANSFORMER_PREVIEW)
  @Post("transform-batch")
  @ApiOperation({
    summary: "🚀 批量数据转换",
    description: `
### 功能说明
高效的批量数据转换服务，支持多个数据集同时处理，适用于大规模数据处理场景。

### 核心特性
- **⚡ 并行处理**: 多个转换任务并行执行
- **📊 批量优化**: 优化的批处理算法
- **🔄 容错机制**: 单个失败不影响整体处理
- **📈 性能统计**: 详细的批处理性能指标

### 权限要求
需要 TRANSFORMER_PREVIEW 权限（开发者/管理员）

### 使用场景
- 批量股票数据转换
- 历史数据迁移
- 多数据源数据整合
- 定时数据处理任务

### 示例请求
\`\`\`json
[
  {
    "provider": "longport",
    "transDataRuleListType": "get-stock-quote",
    "mappingOutRuleId": "rule_123",
    "rawData": {"secu_quote": [{"symbol": "700.HK"}]}
  },
  {
    "provider": "longport",
    "transDataRuleListType": "get-stock-quote", 
    "mappingOutRuleId": "rule_123",
    "rawData": {"secu_quote": [{"symbol": "AAPL.US"}]}
  }
]
\`\`\`
    `,
  })
  @ApiSuccessResponse({
    type: [TransformResponseDto],
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
  async transformBatch(@Body(ValidationPipe) requests: TransformRequestDto[]) {
    this.logger.log(`API Request: Batch transform data`, {
      batchSize: requests.length,
      providers: [...new Set(requests.map((r) => r.provider))],
      transDataRuleListTypes: [...new Set(requests.map((r) => r.transDataRuleListType))],
    });

    try {
      const results = await this.transformerService.transformBatch({
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

  @ApiKeyAuth()
  @RequirePermissions(Permission.TRANSFORMER_PREVIEW)
  @Post("preview")
  @ApiOperation({
    summary: "🔍 数据转换预览",
    description: `
### 功能说明
数据转换预览服务，在不实际执行转换的情况下，展示数据将如何被转换。

### 核心特性
- **👀 预览模式**: 不实际转换数据，仅展示结果
- **🎯 精确预测**: 完全模拟真实转换过程
- **📋 映射展示**: 显示字段映射关系
- **⚡ 快速响应**: 轻量级预览处理

### 权限要求
需要 TRANSFORMER_PREVIEW 权限（开发者/管理员）

### 使用场景
- 调试映射规则
- 验证转换逻辑
- 测试新的数据源
- 数据转换验证

### 示例请求
\`\`\`json
{
  "provider": "longport",
  "transDataRuleListType": "get-stock-quote",
  "mappingOutRuleId": "rule_123",
  "rawData": {
    "secu_quote": [{
      "symbol": "700.HK",
      "last_done": 385.6
    }]
  }
}
\`\`\`
    `,
  })
  @ApiSuccessResponse({
    schema: {
      example: {
        statusCode: 200,
        message: "数据转换预览成功",
        data: {
          transformMappingRule: {
            id: "rule_123",
            name: "LongPort股票行情映射",
            provider: "longport",
            transDataRuleListType: "get-stock-quote",
          },
          sharedDataFieldMappings: [
            {
              sourceField: "secu_quote[].symbol",
              targetField: "symbol",
              transformation: "direct",
            },
            {
              sourceField: "secu_quote[].last_done",
              targetField: "lastPrice",
              transformation: "number",
            },
          ],
          previewResult: {
            input: { symbol: "700.HK", last_done: 385.6 },
            output: { symbol: "700.HK", lastPrice: 385.6 },
          },
        },
        timestamp: "2024-01-01T12:00:00.000Z",
      },
    },
  })
  @ApiKeyAuthResponses()
  @ApiStandardResponses()
  @ApiConsumes("application/json")
  async preview(@Body(ValidationPipe) request: TransformRequestDto) {
    this.logger.log(`API Request: Preview transformation`, {
      provider: request.provider,
      transDataRuleListType: request.transDataRuleListType,
      mappingOutRuleId: request.mappingOutRuleId,
    });

    try {
      const result =
        await this.transformerService.previewTransformation(request);

      this.logger.log(`API Success: Transformation preview generated`, {
        provider: request.provider,
        transDataRuleListType: request.transDataRuleListType,
        ruleId: result.transformMappingRule.id,
        dataFieldMappingsCount: result.sharedDataFieldMappings.length,
      });

      // 遵循控制器编写规范：让拦截器自动处理响应格式化
      return result;
    } catch (error: any) {
      this.logger.error(`API Error: Transformation preview failed`, {
        provider: request.provider,
        transDataRuleListType: request.transDataRuleListType,
        error: error.message,
        errorType: error.constructor.name,
      });
      throw error;
    }
  }
}
