import { PartialType, ApiProperty } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsString,
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
  @ApiProperty({ description: "数据源名称", example: "longport" })
  @IsNotEmpty({ message: "dataSourceName 不能为空" })
  @IsString()
  dataSourceName: string;

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

export class AddSymbolMappingRuleDto {
  @ApiProperty({ description: "数据源名称", example: "longport" })
  @IsNotEmpty()
  @IsString()
  dataSourceName: string;

  @ApiProperty({ description: "映射规则", type: SymbolMappingRuleDto })
  @IsNotEmpty()
  symbolMappingRule: SymbolMappingRuleDto;
}

export class UpdateSymbolMappingRuleDto {
  @ApiProperty({ description: "数据源名称", example: "longport" })
  @IsNotEmpty()
  @IsString()
  dataSourceName: string;

  @ApiProperty({ description: "系统标准格式代码", example: "700.HK" })
  @IsNotEmpty()
  @IsString()
  standardSymbol: string;

  @ApiProperty({ description: "映射规则更新内容" })
  @IsNotEmpty()
  symbolMappingRule: Partial<SymbolMappingRuleDto>;
}
