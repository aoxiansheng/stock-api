import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  MaxLength,
} from "class-validator";

import { UserRole } from "../enums/user-role.enum";
import { CommonStatus } from "../enums/common-status.enum";
import { AUTH_CONFIG, AUTH_VALIDATION_RULES } from "../constants/auth.constants";
import { BaseUserDto, BasePasswordDto } from "./base-auth.dto";

/**
 * 用户注册DTO
 * 继承BaseUserDto，自动包含用户名、密码和邮箱验证
 */
export class CreateUserDto extends BaseUserDto {
  @ApiProperty({
    description: "用户角色",
    enum: UserRole,
    example: UserRole.DEVELOPER,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

/**
 * 用户登录DTO
 * 继承BasePasswordDto，自动包含用户名和密码验证
 * 但不需要邮箱验证
 */
export class LoginDto extends BasePasswordDto {
  // 继承的用户名和密码字段自动包含对应的ApiProperty和验证
  // 无需重复定义
}

/**
 * 登录响应DTO
 */
export class LoginResponseDto {
  @ApiProperty({ description: "用户信息" })
  user: {
    id: string;
    username: string;
    email: string;
    role: UserRole;
    status: CommonStatus;
    createdAt: Date;
  };

  @ApiProperty({ description: "访问令牌" })
  accessToken: string;

  @ApiProperty({ description: "刷新令牌" })
  refreshToken: string;
}

/**
 * 刷新令牌DTO
 */
export class RefreshTokenDto {
  @ApiProperty({ description: "刷新令牌" })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

/**
 * 用户响应DTO
 */
export class UserResponseDto {
  @ApiProperty({ description: "用户ID" })
  id: string;

  @ApiProperty({ description: "用户名" })
  username: string;

  @ApiProperty({ description: "邮箱" })
  email: string;

  @ApiProperty({ description: "用户角色", enum: UserRole })
  role: UserRole;

  @ApiProperty({ description: "用户状态", enum: Object.values(CommonStatus) })
  status: CommonStatus;

  @ApiProperty({ description: "创建时间" })
  createdAt: Date;

  @ApiProperty({ description: "最后访问时间", required: false })
  lastAccessedAt?: Date;
}

/**
 * 用户统计信息DTO
 */
export class UserStatsDto {
  @ApiProperty({ description: "用户总数" })
  totalUsers: number;

  @ApiProperty({ description: "活跃用户数" })
  activeUsers: number;

  @ApiProperty({
    description: "角色分布",
    example: { admin: 2, developer: 10, user: 5 },
  })
  roleDistribution: Record<string, number>;
}

/**
 * 用户列表分页响应DTO
 */
export class PaginatedUsersDto {
  @ApiProperty({ description: "用户列表", type: [UserResponseDto] })
  users: UserResponseDto[];

  @ApiProperty({ description: "总记录数" })
  total: number;

  @ApiProperty({ description: "当前页码" })
  page: number;

  @ApiProperty({ description: "每页数量" })
  limit: number;

  @ApiProperty({ description: "总页数" })
  totalPages: number;

  @ApiProperty({ description: "是否有下一页" })
  hasNext: boolean;

  @ApiProperty({ description: "是否有上一页" })
  hasPrev: boolean;

  @ApiProperty({ description: "用户统计信息", type: UserStatsDto, required: false })
  stats?: UserStatsDto;
}
