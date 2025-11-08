import { IsString, IsEmail, MinLength, IsOptional, IsEnum, IsArray, IsNumber, Min } from 'class-validator';
import { UserRole, Permission } from './enums';

/**
 * 用户注册 DTO
 */
export class RegisterDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

/**
 * 用户登录 DTO
 */
export class LoginDto {
  @IsString()
  username: string;

  @IsString()
  password: string;
}

/**
 * Token 刷新 DTO
 */
export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

/**
 * 创建 API Key DTO
 */
export class CreateApiKeyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions?: Permission[];

  @IsOptional()
  @IsString()
  expiresIn?: string; // 如 "30d", "1y"

  @IsOptional()
  @IsEnum(['READ', 'ADMIN'])
  profile?: 'READ' | 'ADMIN';
}

/**
 * API Key 响应 DTO
 */
export class ApiKeyResponseDto {
  appKey: string;
  accessToken: string;
  profile: string;
  expiresAt?: Date;
  createdAt: Date;
}

/**
 * 认证响应 DTO
 */
export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    email: string;
    role: UserRole;
  };
}
