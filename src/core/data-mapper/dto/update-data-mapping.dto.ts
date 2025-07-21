import { PartialType, ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsOptional } from "class-validator";

import { CreateDataMappingDto } from "./create-data-mapping.dto";

export class UpdateDataMappingDto extends PartialType(CreateDataMappingDto) {}

export class ParseJsonDto {
  @ApiProperty({ description: "JSON数据对象", required: false })
  @IsOptional()
  jsonData?: any;

  @ApiProperty({ description: "JSON字符串", required: false })
  @IsOptional()
  @IsString()
  jsonString?: string;
}

export class FieldSuggestionDto {
  @ApiProperty({
    description: "源字段列表",
    example: ["last_done", "volume", "open"],
  })
  @IsNotEmpty()
  sourceFields: string[];

  @ApiProperty({
    description: "目标字段列表",
    example: ["lastPrice", "volume", "openPrice"],
  })
  @IsNotEmpty()
  targetFields: string[];
}

export class ApplyMappingDto {
  @ApiProperty({
    description: "映射规则ID",
    example: "507f1f77bcf86cd799439011",
  })
  @IsNotEmpty()
  @IsString()
  ruleId: string;

  @ApiProperty({ description: "原始数据" })
  @IsNotEmpty()
  sourceData: any;
}

export class TestMappingDto {
  @ApiProperty({
    description: "映射规则ID",
    example: "507f1f77bcf86cd799439011",
  })
  @IsNotEmpty()
  @IsString()
  ruleId: string;

  @ApiProperty({ description: "测试数据" })
  @IsNotEmpty()
  testData: any;
}
