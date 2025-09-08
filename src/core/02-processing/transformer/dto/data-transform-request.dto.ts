import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

import { REFERENCE_DATA } from '@common/constants/domain';
import {
  IsString,
  IsObject,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  ValidateNested,
} from "class-validator";
import { API_TYPE_VALUES } from "../../../00-prepare/data-mapper/constants/data-mapper.constants";
import type { ApiType } from "../../../00-prepare/data-mapper/constants/data-mapper.constants";

class TransformOptionsDto {
  @ApiPropertyOptional({ description: "是否验证输出数据" })
  @IsOptional()
  @IsBoolean()
  validateOutput?: boolean;

  @ApiPropertyOptional({
    description: "是否包含转换元数据",
  })
  @IsOptional()
  @IsBoolean()
  includeMetadata?: boolean;

  @ApiPropertyOptional({ description: "是否包含调试信息" })
  @IsOptional()
  @IsBoolean()
  includeDebugInfo?: boolean;

  @ApiPropertyOptional({ description: "自定义转换上下文" })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class DataTransformRequestDto {
  @ApiProperty({ description: "数据提供商名称", example: REFERENCE_DATA.PROVIDER_IDS.LONGPORT })
  @IsString()
  provider: string;

  @ApiProperty({
    description: "API类型",
    example: "rest",
    enum: API_TYPE_VALUES,
  })
  @IsEnum(API_TYPE_VALUES)
  apiType: ApiType;

  @ApiProperty({
    description: "数据映射规则列表类型（用于查找对应的映射规则）",
    example: "quote_fields",
  })
  @IsString()
  transDataRuleListType: string;

  @ApiProperty({ description: "要转换的原始数据" })
  @IsObject()
  @IsNotEmpty()
  rawData: any;

  @ApiPropertyOptional({ description: "要使用的特定映射规则ID" })
  @IsOptional()
  @IsString()
  mappingOutRuleId?: string;

  @ApiPropertyOptional({ description: "转换选项" })
  @IsOptional()
  @ValidateNested()
  @Type(() => TransformOptionsDto)
  options?: TransformOptionsDto;
}
