import { registerAs } from '@nestjs/config';
import { IsNumber, Min, Max } from 'class-validator';

export class UnifiedTtlConfig {
  // 基础TTL配置
  @IsNumber() @Min(1) @Max(86400)
  defaultTtl: number = parseInt(process.env.CACHE_DEFAULT_TTL, 10) || 300;

  @IsNumber() @Min(1) @Max(3600)
  strongTimelinessTtl: number = parseInt(process.env.CACHE_STRONG_TTL, 10) || 5;

  // 组件特定TTL
  @IsNumber() @Min(60) @Max(7200)
  authTtl: number = parseInt(process.env.CACHE_AUTH_TTL, 10) || 300;

  @IsNumber() @Min(30) @Max(1800)
  monitoringTtl: number = parseInt(process.env.CACHE_MONITORING_TTL, 10) || 300;

  @IsNumber() @Min(60) @Max(3600)
  alertTtl: number = parseInt(process.env.CACHE_ALERT_TTL, 10) || 1800;
}

export default registerAs('unifiedTtl', () => new UnifiedTtlConfig());