import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
} from "class-validator";

/**
 * 分布式锁信息DTO
 */
export class DistributedLockInfoDto {
  @ApiProperty({ description: "锁键" })
  @IsString()
  lockKey: string;

  @ApiProperty({ description: "锁值" })
  @IsString()
  lockValue: string;

  @ApiProperty({ description: "锁TTL（秒）" })
  @IsNumber()
  lockTtl: number;

  @ApiProperty({ description: "是否获取成功" })
  @IsBoolean()
  acquired: boolean;

  @ApiProperty({ description: "获取锁的时间戳" })
  @IsNumber()
  acquiredAt: number;
}