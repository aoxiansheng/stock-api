import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsString,
  IsObject,
  IsOptional,
  IsBoolean,
  ValidateNested,
} from "class-validator";

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

  @ApiPropertyOptional({ description: "自定义转换上下文" })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class TransformRequestDto {
  @ApiProperty({ description: "数据提供商名称", example: "longport" })
  @IsString()
  provider: string;

  @ApiProperty({
    description: "数据映射规则列表类型（用于查找对应的映射规则）",
    example: "quote_fields",
  })
  @IsString()
  dataRuleListType: string;

  @ApiProperty({ description: "要转换的原始数据" })
  @IsObject()
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
