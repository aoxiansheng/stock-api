import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsOptional, IsString, IsArray, IsDate } from "class-validator";

import { StorageClassification } from "../../../shared/types/storage-classification.enum";
import { StorageType } from "../enums/storage-type.enum";
import { BaseQueryDto } from "@common/dto/base-query.dto";

export class StorageQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({
    description: "按键名搜索",
  })
  @IsOptional()
  @IsString()
  keySearch?: string;

  @ApiPropertyOptional({
    description: "按存储类型筛选",
    enum: StorageType,
  })
  @IsOptional()
  @IsEnum(StorageType)
  storageType?: StorageType;

  @ApiPropertyOptional({
    description: "按数据分类筛选",
    enum: StorageClassification,
  })
  @IsOptional()
  @IsEnum(StorageClassification)
  storageClassification?: StorageClassification;

  @ApiPropertyOptional({
    description: "按提供商筛选",
  })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({
    description: "按市场筛选",
  })
  @IsOptional()
  @IsString()
  market?: string;

  @ApiPropertyOptional({
    description: "按标签筛选",
  })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({
    description: "开始日期",
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({
    description: "结束日期",
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}
