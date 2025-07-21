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
  requests: number;

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

  @ApiProperty({ description: "是否激活" })
  isActive: boolean;

  @ApiProperty({ description: "过期时间" })
  expiresAt?: Date;

  @ApiProperty({ description: "使用次数" })
  usageCount: number;

  @ApiProperty({ description: "最后使用时间" })
  lastUsedAt?: Date;

  @ApiProperty({ description: "创建时间" })
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
    description: "是否激活",
    required: false,
  })
  @IsOptional()
  isActive?: boolean;

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
