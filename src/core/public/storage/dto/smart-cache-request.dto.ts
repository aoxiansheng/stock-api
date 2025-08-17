import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { MarketStatusResult } from '../../shared/services/market-status.service';

/**
 * 智能缓存选项DTO
 */
export class SymbolSmartCacheOptionsDto {
  @ApiProperty({
    description: '股票代码列表，用于市场状态判断',
    type: [String],
    example: ['700.HK', 'AAPL.US'],
  })
  @IsArray()
  @IsString({ each: true })
  symbols: string[];

  @ApiPropertyOptional({
    description: '市场状态信息',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  marketStatus?: Record<string, MarketStatusResult>;

  @ApiPropertyOptional({
    description: '最小缓存时间（秒）',
    minimum: 1,
    maximum: 3600,
    default: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3600)
  minCacheTtl?: number = 30;

  @ApiPropertyOptional({
    description: '最大缓存时间（秒）',
    minimum: 60,
    maximum: 86400,
    default: 3600,
  })
  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(86400)
  maxCacheTtl?: number = 3600;

  @ApiPropertyOptional({
    description: '是否强制刷新缓存',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean = false;

  @ApiPropertyOptional({
    description: '缓存键前缀',
    default: 'smart_cache',
  })
  @IsOptional()
  @IsString()
  keyPrefix?: string = 'smart_cache';
}

/**
 * 智能缓存结果DTO
 */
export class SymbolSmartCacheResultDto<T = any> {
  @ApiProperty({
    description: '是否命中缓存',
  })
  hit: boolean;

  @ApiPropertyOptional({
    description: '缓存数据',
  })
  data?: T;

  @ApiProperty({
    description: '缓存元数据',
  })
  metadata: {
    /** 缓存键 */
    key: string;
    /** 数据来源 */
    source: 'cache' | 'fresh';
    /** 剩余TTL（秒） */
    ttlRemaining?: number;
    /** 生成时间 */
    generatedAt: string;
    /** 市场状态影响的TTL */
    dynamicTtl: number;
  };

  constructor(
    hit: boolean,
    data: T,
    key: string,
    source: 'cache' | 'fresh',
    dynamicTtl: number,
    ttlRemaining?: number,
  ) {
    this.hit = hit;
    this.data = data;
    this.metadata = {
      key,
      source,
      ttlRemaining,
      generatedAt: new Date().toISOString(),
      dynamicTtl,
    };
  }

  /**
   * 创建缓存命中结果
   */
  static hit<T>(
    data: T,
    key: string,
    dynamicTtl: number,
    ttlRemaining: number,
  ): SymbolSmartCacheResultDto<T> {
    return new SymbolSmartCacheResultDto(true, data, key, 'cache', dynamicTtl, ttlRemaining);
  }

  /**
   * 创建缓存未命中结果
   */
  static miss<T>(data: T, key: string, dynamicTtl: number): SymbolSmartCacheResultDto<T> {
    return new SymbolSmartCacheResultDto(false, data, key, 'fresh', dynamicTtl);
  }
}