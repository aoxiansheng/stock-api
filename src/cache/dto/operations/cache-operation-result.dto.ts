import { ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsString,
  IsNumber,
  IsOptional,
} from "class-validator";
import { ProcessingTimeFields } from "../../../common/interfaces/time-fields.interface";

/**
 * 缓存操作结果DTO
 */
export class CacheOperationResultDto<T = any> implements ProcessingTimeFields {
  @ApiProperty({ description: "操作是否成功" })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ description: "缓存数据" })
  data: T;

  @ApiProperty({ description: "数据来源", enum: ["cache", "callback"] })
  @IsString()
  source: "cache" | "callback";

  @ApiProperty({ description: "处理时间（毫秒）" })
  @IsNumber()
  processingTimeMs: number;

  @ApiProperty({ description: "是否使用了压缩", required: false })
  @IsOptional()
  @IsBoolean()
  compressed?: boolean;
}