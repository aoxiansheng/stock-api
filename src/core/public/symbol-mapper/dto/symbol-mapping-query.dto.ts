import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
  IsBoolean,
} from "class-validator";

export class SymbolMappingQueryDto {
  @ApiProperty({ description: "数据源名称", required: false })
  @IsOptional()
  @IsString()
  dataSourceName?: string;

  @ApiProperty({ description: "市场标识", required: false })
  @IsOptional()
  @IsString()
  market?: string;

  @ApiProperty({ description: "股票类型", required: false })
  @IsOptional()
  @IsString()
  symbolType?: string;

  @ApiProperty({ description: "是否启用", required: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiProperty({ description: "页码", example: 1, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiProperty({ description: "每页数量", example: 10, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiProperty({ description: "搜索关键词", required: false })
  @IsOptional()
  @IsString()
  search?: string;
}
