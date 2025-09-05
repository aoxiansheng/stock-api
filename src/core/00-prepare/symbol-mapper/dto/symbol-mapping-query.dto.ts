import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsOptional,
  IsString,
  IsBoolean,
} from "class-validator";
import { BaseQueryDto } from "@common/dto/base-query.dto";

export class SymbolMappingQueryDto extends BaseQueryDto {
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

  @ApiProperty({ description: "搜索关键词", required: false })
  @IsOptional()
  @IsString()
  search?: string;

  // 注意：page, limit 字段已从 BaseQueryDto 基类继承，无需重复定义
}
