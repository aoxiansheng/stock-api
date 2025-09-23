import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsArray } from "class-validator";


export class DataTransformationStatsDto {
  @ApiProperty({ description: "处理的记录数" })
  @IsNumber()
  recordsProcessed: number;

  @ApiProperty({ description: "转换的字段数" })
  @IsNumber()
  fieldsTransformed: number;

  @ApiProperty({ description: "应用的转换列表" })
  @IsArray()
  transformationsApplied: Array<{
    sourceField: string;
    targetField: string;
    transformType?: string;
    transformValue?: any;
  }>;
}
