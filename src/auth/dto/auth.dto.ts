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

/**
 * 用户注册DTO
 */
export class CreateUserDto {
  @ApiProperty({
    description: "用户名",
    example: "admin",
    minLength: 3,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: "用户名只能包含字母、数字、下划线和连字符",
  })
  username: string;

  @ApiProperty({
    description: "邮箱地址",
    example: "admin@example.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "密码",
    example: "password123",
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

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
 */
export class LoginDto {
  @ApiProperty({
    description: "用户名",
    example: "admin",
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: "密码",
    example: "password123",
  })
  @IsString()
  @IsNotEmpty()
  password: string;
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
    isActive: boolean;
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

  @ApiProperty({ description: "是否激活" })
  isActive: boolean;

  @ApiProperty({ description: "创建时间" })
  createdAt: Date;

  @ApiProperty({ description: "最后登录时间", required: false })
  lastLoginAt?: Date;
}

/**
 * 用户统计信息DTO
 */
export class UserStatsDto {
  @ApiProperty({ description: "用户总数" })
  totalUsers: number;

  @ApiProperty({ description: "活跃用户数" })
  activeUsers: number;

  @ApiProperty({ description: "非活跃用户数" })
  inactiveUsers: number;

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

  @ApiProperty({ description: "用户统计信息", type: UserStatsDto })
  stats: UserStatsDto;
}
