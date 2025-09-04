/**
 * 基础请求选项DTO类
 * 包含receiver组件通用的请求选项字段
 * 
 * 注意：Receiver组件不涉及分页功能，因此不包含分页相关字段
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { PERFORMANCE_CONSTANTS, RETRY_CONSTANTS } from "@common/constants/unified";

export class BaseRequestOptionsDto {
  @ApiPropertyOptional({ 
    description: "请求超时时间(毫秒)",
    default: PERFORMANCE_CONSTANTS.TIMEOUTS.RECEIVER.REQUEST_TIMEOUT_MS,
    minimum: 1000,
    maximum: 60000,
    example: 30000
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(60000)
  timeout?: number = PERFORMANCE_CONSTANTS.TIMEOUTS.RECEIVER.REQUEST_TIMEOUT_MS;

  @ApiPropertyOptional({ 
    description: "是否使用智能缓存", 
    default: true 
  })
  @IsOptional()
  @IsBoolean()
  useSmartCache?: boolean = true;

  @ApiPropertyOptional({ 
    description: "最大重试次数", 
    default: RETRY_CONSTANTS.BUSINESS_SCENARIOS.RECEIVER.MAX_RETRY_ATTEMPTS,
    minimum: 0,
    maximum: 10,
    example: 3
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxRetries?: number = RETRY_CONSTANTS.BUSINESS_SCENARIOS.RECEIVER.MAX_RETRY_ATTEMPTS;

  @ApiPropertyOptional({ 
    description: "是否启用后台更新", 
    default: false 
  })
  @IsOptional()
  @IsBoolean()
  enableBackgroundUpdate?: boolean = false;
}