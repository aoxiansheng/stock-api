import { ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsString,
  IsNumber,
  IsOptional,
} from "class-validator";

/**
 * 缓存操作结果DTO
 */
export class CacheOperationResultDto<T = any> {
  @ApiProperty({ description: "操作是否成功" })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ description: "缓存数据" })
  data: T;

  @ApiProperty({ description: "数据来源", enum: ["cache", "callback"] })
  @IsString()
  source: "cache" | "callback";

  @ApiProperty({ description: "操作执行时间（毫秒）" })
  @IsNumber()
  executionTimeMs: number;

  @ApiProperty({ description: "是否使用了压缩", required: false })
  @IsOptional()
  @IsBoolean()
  compressed?: boolean;
}