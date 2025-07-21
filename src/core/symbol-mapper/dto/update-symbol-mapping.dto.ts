import { PartialType, ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  ValidateIf,
  IsArray,
  ArrayNotEmpty,
} from "class-validator";

import {
  CreateSymbolMappingDto,
  SymbolMappingRuleDto,
} from "./create-symbol-mapping.dto";

export class UpdateSymbolMappingDto extends PartialType(
  CreateSymbolMappingDto,
) {}

export class TransformSymbolsDto {
  @ApiPropertyOptional({
    description: "映射配置 ID（优先使用）",
    example: "64e8f7b4b7dcb16f7a1c1234",
  })
  @IsOptional()
  @IsString()
  mappingInSymbolId?: string;

  @ApiProperty({ description: "数据源名称", example: "longport" })
  @ApiPropertyOptional({
    description: "数据源名称（若未传 mappingInSymbolId 时必填）",
    example: "longport",
  })
  @ValidateIf((o) => !o.mappingInSymbolId)
  @IsNotEmpty({
    message: "当未提供 mappingInSymbolId 时，dataSourceName 不能为空",
  })
  @IsString()
  dataSourceName?: string;

  @ApiProperty({
    description: "需要转换的股票代码列表",
    example: ["700.HK", "AAPL.US"],
  })
  @IsArray()
  @ArrayNotEmpty({ message: "股票代码列表不能为空" })
  @IsString({ each: true })
  @IsNotEmpty({ each: true, message: "股票代码不能为空字符串" })
  symbols: string[];
}

export class TransformSymbolsResponseDto {
  @ApiProperty({ description: "数据源名称" })
  dataSourceName: string;

  @ApiProperty({ description: "转换后的股票代码映射" })
  transformedSymbols: Record<string, string>;

  @ApiProperty({ description: "转换失败的股票代码列表" })
  failedSymbols: string[];

  @ApiProperty({ description: "处理时间（毫秒）" })
  processingTimeMs: number;
}

export class AddMappingRuleDto {
  @ApiProperty({ description: "数据源名称", example: "longport" })
  @IsNotEmpty()
  @IsString()
  dataSourceName: string;

  @ApiProperty({ description: "映射规则", type: SymbolMappingRuleDto })
  @IsNotEmpty()
  mappingRule: SymbolMappingRuleDto;
}

export class UpdateMappingRuleDto {
  @ApiProperty({ description: "数据源名称", example: "longport" })
  @IsNotEmpty()
  @IsString()
  dataSourceName: string;

  @ApiProperty({ description: "输入股票代码", example: "700.HK" })
  @IsNotEmpty()
  @IsString()
  inputSymbol: string;

  @ApiProperty({ description: "映射规则更新内容" })
  @IsNotEmpty()
  mappingRule: Partial<SymbolMappingRuleDto>;
}
