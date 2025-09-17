import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

import { Permission } from "../enums/user-role.enum";
import { OperationStatus } from "@common/types/enums/shared-base.enum";

/**
 * 速率限制DTO
 */
export class RateLimitDto {
  @ApiProperty({
    description: "时间窗口内允许的请求数量",
    example: 1000,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  requestLimit: number;

  @ApiProperty({
    description: "时间窗口 (1m=1分钟, 1h=1小时, 1d=1天)",
    example: "1h",
  })
  @IsString()
  @IsNotEmpty()
  window: string;
}

/**
 * 创建API Key DTO
 */
export class CreateApiKeyDto {
  @ApiProperty({
    description: "API Key名称",
    example: "第三方应用A",
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: "API Key描述",
    example: "用于获取股票数据的第三方应用",
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: "API权限列表",
    enum: Permission,
    isArray: true,
    example: [Permission.DATA_READ, Permission.QUERY_EXECUTE],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions?: Permission[];

  @ApiProperty({
    description: "速率限制配置",
    type: RateLimitDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RateLimitDto)
  rateLimit?: RateLimitDto;

  @ApiProperty({
    description: "过期时间",
    type: Date,
    required: false,
    example: "2024-12-31T23:59:59.999Z",
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date;
}

/**
 * API Key响应DTO
 */
export class ApiKeyResponseDto {
  @ApiProperty({ description: "API Key ID" })
  id: string;

  @ApiProperty({ description: "App Key" })
  appKey: string;

  @ApiProperty({ description: "Access Token" })
  accessToken: string;

  @ApiProperty({ description: "API Key名称" })
  name: string;

  @ApiProperty({ description: "描述" })
  description?: string;

  @ApiProperty({ description: "权限列表", enum: Permission, isArray: true })
  permissions: Permission[];

  @ApiProperty({ description: "速率限制配置" })
  rateLimit: RateLimitDto;

  @ApiProperty({ description: "状态", enum: OperationStatus })
  status: OperationStatus;

  @ApiProperty({ description: "过期时间" })
  expiresAt?: Date;

  @ApiProperty({ description: "总请求次数" })
  totalRequestCount: number;

  @ApiProperty({ description: "最后访问时间" })
  lastAccessedAt?: Date;

  @ApiProperty({ description: "创建时间" })
  createdAt: Date;
}

/**
 * API Key使用统计DTO
 */
export class ApiKeyUsageDto {
  @ApiProperty({ description: "API Key ID" })
  apiKeyId: string;

  @ApiProperty({ description: "App Key" })
  appKey: string;

  @ApiProperty({ description: "API Key名称" })
  name: string;

  @ApiProperty({ description: "总请求次数" })
  totalRequestCount: number;

  @ApiProperty({ description: "今日请求次数" })
  todayRequests: number;

  @ApiProperty({ description: "本小时请求次数" })
  hourlyRequests: number;

  @ApiProperty({ description: "成功请求次数" })
  successfulRequests: number;

  @ApiProperty({ description: "失败请求次数" })
  failedRequests: number;

  @ApiProperty({ description: "平均响应时间(ms)" })
  averageResponseTimeMs: number;

  @ApiProperty({ description: "最后访问时间" })
  lastAccessedAt?: Date;

  @ApiProperty({ description: "创建时间" })
  createdAt: Date;
}

/**
 * 用户详细统计信息DTO
 */
export class UserDetailedStatsDto {
  @ApiProperty({ description: "用户ID" })
  userId: string;

  @ApiProperty({ description: "用户名" })
  username: string;

  @ApiProperty({ description: "用户角色" })
  role: string;

  @ApiProperty({ description: "API Key总数" })
  totalApiKeys: number;

  @ApiProperty({ description: "活跃API Key数" })
  activeApiKeys: number;

  @ApiProperty({ description: "总请求次数" })
  totalRequestCount: number;

  @ApiProperty({ description: "今日请求次数" })
  todayRequests: number;

  @ApiProperty({ description: "成功请求次数" })
  successfulRequests: number;

  @ApiProperty({ description: "失败请求次数" })
  failedRequests: number;

  @ApiProperty({ description: "最后访问时间" })
  lastAccessedAt?: Date;

  @ApiProperty({ description: "注册时间" })
  createdAt: Date;
}

/**
 * 更新API Key DTO
 */
export class UpdateApiKeyDto {
  @ApiProperty({
    description: "API Key名称",
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    description: "API Key描述",
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: "API权限列表",
    enum: Permission,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions?: Permission[];

  @ApiProperty({
    description: "速率限制配置",
    type: RateLimitDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RateLimitDto)
  rateLimit?: RateLimitDto;

  @ApiProperty({
    description: "状态",
    enum: OperationStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(OperationStatus)
  status?: OperationStatus;

  @ApiProperty({
    description: "过期时间",
    type: Date,
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date;
}
