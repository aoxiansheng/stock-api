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
  @ApiPropertyOptional({ description: "Whether to validate output data" })
  @IsOptional()
  @IsBoolean()
  validateOutput?: boolean;

  @ApiPropertyOptional({
    description: "Whether to include transformation metadata",
  })
  @IsOptional()
  @IsBoolean()
  includeMetadata?: boolean;

  @ApiPropertyOptional({ description: "Custom transformation context" })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class TransformRequestDto {
  @ApiProperty({ description: "Data provider name", example: "longport" })
  @IsString()
  provider: string;

  @ApiProperty({
    description: "Data type to transform",
    example: "stock-quote",
  })
  @IsString()
  dataType: string;

  @ApiProperty({ description: "Raw data to transform" })
  @IsObject()
  rawData: any;

  @ApiPropertyOptional({ description: "Specific mapping rule ID to use" })
  @IsOptional()
  @IsString()
  mappingOutRuleId?: string;

  @ApiPropertyOptional({ description: "Transformation options" })
  @IsOptional()
  @ValidateNested()
  @Type(() => TransformOptionsDto)
  options?: TransformOptionsDto;
}
