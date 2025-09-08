import { IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class BaseRequestOptionsDto {
  @ApiPropertyOptional({
    description: "是否启用智能缓存",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  useSmartCache?: boolean;

  @ApiPropertyOptional({
    description: "请求超时时间（毫秒）",
  })
  @IsOptional()
  @IsNumber()
  timeout?: number;

  @IsOptional()
  @IsBoolean()
  skipCache?: boolean;

  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;
}