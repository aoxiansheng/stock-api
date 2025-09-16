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

  // Alert模块特定TTL配置
  @IsNumber() @Min(60) @Max(7200)
  alertActiveDataTtl: number = parseInt(process.env.CACHE_ALERT_ACTIVE_TTL, 10) || 300;

  @IsNumber() @Min(300) @Max(86400)
  alertHistoricalDataTtl: number = parseInt(process.env.CACHE_ALERT_HISTORICAL_TTL, 10) || 3600;

  @IsNumber() @Min(60) @Max(7200) 
  alertCooldownTtl: number = parseInt(process.env.CACHE_ALERT_COOLDOWN_TTL, 10) || 300;

  @IsNumber() @Min(300) @Max(3600)
  alertConfigCacheTtl: number = parseInt(process.env.CACHE_ALERT_CONFIG_TTL, 10) || 600;

  @IsNumber() @Min(60) @Max(1800)
  alertStatsCacheTtl: number = parseInt(process.env.CACHE_ALERT_STATS_TTL, 10) || 300;
}

export default registerAs('unifiedTtl', () => new UnifiedTtlConfig());