import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
} from "class-validator";

import { MappingRule } from "../schemas/symbol-mapping-rule.schema";

export class MappingConfigResultDto {
  @ApiProperty({ description: "是否找到映射配置" })
  @IsBoolean()
  found: boolean;

  @ApiProperty({ description: "映射规则列表", type: [MappingRule] })
  @IsArray()
  mappingRules: MappingRule[];

  @ApiProperty({ description: "数据源名称", required: false })
  @IsOptional()
  @IsString()
  dataSourceName?: string;
}

export class MappingRuleContextDto {
  @ApiProperty({ description: "数据源名称" })
  @IsString()
  source: string;

  @ApiProperty({ description: "映射配置ID", required: false })
  @IsOptional()
  @IsString()
  mappingInSymbolId?: string;
}

export class InternalSymbolMappingDto {
  @ApiProperty({ description: "输入股票代码" })
  @IsString()
  inputSymbol: string;

  @ApiProperty({ description: "输出股票代码" })
  @IsString()
  outputSymbol: string;

  @ApiProperty({ description: "规则是否激活", required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: "市场代码", required: false })
  @IsOptional()
  @IsString()
  market?: string;

  @ApiProperty({ description: "股票类型", required: false })
  @IsOptional()
  @IsString()
  symbolType?: string;

  @ApiProperty({ description: "备注信息", required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

export class SymbolMapperPerformanceDto {
  @ApiProperty({ description: "处理时间（毫秒）" })
  @IsNumber()
  processingTime: number;

  @ApiProperty({ description: "股票代码数量" })
  @IsNumber()
  symbolsCount: number;

  @ApiProperty({ description: "是否为慢速映射" })
  @IsBoolean()
  isSlowMapping: boolean;

  @ApiProperty({ description: "性能阈值（毫秒）" })
  @IsNumber()
  threshold: number;

  @ApiProperty({ description: "平均每个股票代码的处理时间（毫秒）" })
  @IsNumber()
  avgTimePerSymbol: number;
}

export class MappingApplicationResultDto {
  @ApiProperty({ description: "转换后的股票代码映射" })
  @IsObject()
  transformedSymbols: Record<string, string>;

  @ApiProperty({ description: "映射成功的数量" })
  @IsNumber()
  mappedCount: number;

  @ApiProperty({ description: "未映射的数量" })
  @IsNumber()
  unmappedCount: number;

  @ApiProperty({ description: "处理时间（毫秒）" })
  @IsNumber()
  processingTime: number;

  @ApiProperty({ description: "数据源名称" })
  @IsString()
  dataSourceName: string;

  @ApiProperty({ description: "映射配置ID", required: false })
  @IsOptional()
  @IsString()
  mappingInSymbolId?: string;
}

export class SymbolTransformationLogDto {
  @ApiProperty({ description: "原始股票代码" })
  @IsString()
  originalSymbol: string;

  @ApiProperty({ description: "转换后股票代码" })
  @IsString()
  mappedSymbol: string;

  @ApiProperty({ description: "来源提供商" })
  @IsString()
  fromProvider: string;

  @ApiProperty({ description: "目标提供商" })
  @IsString()
  toProvider: string;

  @ApiProperty({ description: "处理时间（毫秒）" })
  @IsNumber()
  processingTime: number;

  @ApiProperty({ description: "是否成功映射" })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ description: "操作类型" })
  @IsString()
  operation: string;
}

export class DataSourceMappingLogDto {
  @ApiProperty({ description: "数据源名称" })
  @IsString()
  dataSourceName: string;

  @ApiProperty({ description: "映射配置ID", required: false })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: "规则数量" })
  @IsNumber()
  rulesCount: number;

  @ApiProperty({ description: "操作类型" })
  @IsString()
  operation: string;

  @ApiProperty({ description: "处理时间（毫秒）", required: false })
  @IsOptional()
  @IsNumber()
  processingTime?: number;

  @ApiProperty({ description: "错误信息", required: false })
  @IsOptional()
  @IsString()
  error?: string;
}

export class BatchTransformationLogDto {
  @ApiProperty({ description: "数据源名称" })
  @IsString()
  dataSourceName: string;

  @ApiProperty({ description: "输入股票代码数量" })
  @IsNumber()
  symbolsCount: number;

  @ApiProperty({ description: "映射成功数量" })
  @IsNumber()
  mappedCount: number;

  @ApiProperty({ description: "处理时间（毫秒）" })
  @IsNumber()
  processingTime: number;

  @ApiProperty({ description: "操作类型" })
  @IsString()
  operation: string;

  @ApiProperty({ description: "股票代码列表样本", required: false })
  @IsOptional()
  @IsArray()
  symbols?: string[];

  @ApiProperty({ description: "映射配置ID", required: false })
  @IsOptional()
  @IsString()
  mappingInSymbolId?: string;
}
