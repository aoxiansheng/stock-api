import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
} from "class-validator";

export class RequestOptionsDto {
  @ApiProperty({ description: "首选数据提供商", required: false })
  @IsOptional()
  @IsString()
  preferredProvider?: string;

  @ApiProperty({ description: "是否实时数据", required: false })
  @IsOptional()
  @IsBoolean()
  realtime?: boolean;

  @ApiProperty({ description: "指定字段列表", required: false })
  @IsOptional()
  @IsArray()
  fields?: string[];

  @ApiProperty({ description: "指定市场", required: false })
  @IsOptional()
  @IsString()
  market?: string;

  @ApiProperty({ description: "是否启用智能缓存", required: false, default: true })
  @IsOptional()
  @IsBoolean()
  useSmartCache?: boolean;

  @ApiPropertyOptional({
    description: "其他动态选项，以键值对形式提供",
    type: "object",
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  extra?: Record<string, unknown>;
}

export class SymbolTransformationResultDto {
  @ApiProperty({ description: "转换后的股票代码列表" })
  @IsArray()
  transformedSymbols: string[];

  @ApiProperty({ description: "映射结果详情" })
  @IsObject()
  mappingResults: {
    transformedSymbols: Record<string, string>;
    failedSymbols: string[];
    metadata: {
      provider: string;
      totalSymbols: number;
      successfulTransformations: number;
      failedTransformations: number;
      processingTime: number;
      hasPartialFailures: boolean;
    };
  };
}

export class DataFetchingParamsDto {
  @ApiProperty({ description: "转换后的股票代码列表" })
  @IsArray()
  symbols: string[];

  @ApiProperty({ description: "请求选项", required: false })
  @IsOptional()
  @IsObject()
  options?: RequestOptionsDto;

  @ApiProperty({ description: "原始股票代码列表" })
  @IsArray()
  originalSymbols: string[];

  @ApiProperty({ description: "请求ID" })
  @IsString()
  requestId: string;

  @ApiProperty({ description: "上下文服务", required: false })
  @IsOptional()
  @IsObject()
  contextService?: any;

  @ApiPropertyOptional({ description: "执行上下文（透传给下游能力/转换器）", type: "object", additionalProperties: true })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class MarketInferenceResultDto {
  @ApiProperty({ description: "推断出的市场代码" })
  @IsString()
  marketCode: string;

  @ApiProperty({ description: "推断置信度" })
  @IsNumber()
  confidence: number;

  @ApiProperty({ description: "市场统计信息" })
  @IsObject()
  marketStats: Record<string, number>;

  @ApiProperty({ description: "主导市场" })
  @IsString()
  dominantMarket: string;
}

export class ReceiverPerformanceDto {
  @ApiProperty({ description: "请求ID" })
  @IsString()
  requestId: string;

  @ApiProperty({ description: "处理时间（毫秒）" })
  @IsNumber()
  processingTime: number;

  @ApiProperty({ description: "股票代码数量" })
  @IsNumber()
  symbolsCount: number;

  @ApiProperty({ description: "平均每个股票代码的处理时间" })
  @IsNumber()
  avgTimePerSymbol: number;

  @ApiProperty({ description: "是否为慢速请求" })
  @IsBoolean()
  isSlowRequest: boolean;

  @ApiProperty({ description: "性能阈值" })
  @IsNumber()
  threshold: number;
}

export class ProviderValidationResultDto {
  @ApiProperty({ description: "验证结果" })
  @IsBoolean()
  isValid: boolean;

  @ApiProperty({ description: "验证的提供商名称" })
  @IsString()
  provider: string;

  @ApiProperty({ description: "数据类型" })
  @IsString()
  receiverType: string;

  @ApiProperty({ description: "市场代码", required: false })
  @IsOptional()
  @IsString()
  market?: string;

  @ApiProperty({ description: "支持的市场列表", required: false })
  @IsOptional()
  @IsArray()
  supportedMarkets?: string[];

  @ApiProperty({ description: "错误消息", required: false })
  @IsOptional()
  @IsString()
  errorMessage?: string;
}

export class CapabilityExecutionResultDto {
  @ApiProperty({ description: "执行结果数据" })
  data: any;

  @ApiProperty({ description: "执行状态" })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ description: "提供商名称" })
  @IsString()
  provider: string;

  @ApiProperty({ description: "能力名称" })
  @IsString()
  capability: string;

  @ApiProperty({ description: "执行时间（毫秒）" })
  @IsNumber()
  executionTime: number;

  @ApiProperty({ description: "错误信息", required: false })
  @IsOptional()
  @IsString()
  error?: string;
}

export class SymbolMarketMappingDto {
  @ApiProperty({ description: "股票代码" })
  @IsString()
  symbol: string;

  @ApiProperty({ description: "市场代码" })
  @IsString()
  market: string;

  @ApiProperty({ description: "匹配置信度" })
  @IsNumber()
  confidence: number;

  @ApiProperty({ description: "市场匹配策略" })
  @IsString()
  matchStrategy: "suffix" | "prefix" | "pattern" | "numeric" | "alpha";
}
