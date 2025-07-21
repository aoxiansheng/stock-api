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
