import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsNotEmpty, IsString, ArrayNotEmpty } from "class-validator";

export class TransformSymbolsDto {
  @ApiProperty({ description: "数据源名称", example: "longport" })
  @IsNotEmpty({ message: "dataSourceName 不能为空" })
  @IsString()
  dataSourceName: string;

  @ApiProperty({ description: "需要转换的股票代码列表", example: ["700.HK", "AAPL"] })
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

