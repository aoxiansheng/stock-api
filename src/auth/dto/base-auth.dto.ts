import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { USER_REGISTRATION } from "../constants/user-operations.constants";
import { BaseQueryDto } from "@common/dto/base-query.dto";
// 🆕 使用Auth模块的通用验证装饰器
import {
  IsValidUsername,
  IsStrongPassword,
  IsValidEmail,
  AUTH_VALIDATION_CONSTANTS,
} from "../decorators/validation.decorator";

/**
 * 基础认证DTO类
 * 继承BaseQueryDto获得分页支持，并包含通用的用户名验证规则
 * 🎯 重构说明：现在支持分页查询，适用于用户列表等场景
 */
export abstract class BaseAuthDto extends BaseQueryDto {
  @ApiProperty({
    description: "用户名",
    example: "admin",
    minLength: AUTH_VALIDATION_CONSTANTS.USERNAME_MIN_LENGTH,
    maxLength: AUTH_VALIDATION_CONSTANTS.USERNAME_MAX_LENGTH,
  })
  @IsString()
  @IsValidUsername() // 🆕 使用统一的用户名验证装饰器
  username: string;
}

/**
 * 包含密码验证的基础DTO类
 * 继承BaseAuthDto并添加密码验证规则
 */
export abstract class BasePasswordDto extends BaseAuthDto {
  @ApiProperty({
    description: "密码",
    example: "Password123!",
    minLength: AUTH_VALIDATION_CONSTANTS.PASSWORD_MIN_LENGTH,
    maxLength: AUTH_VALIDATION_CONSTANTS.PASSWORD_MAX_LENGTH,
  })
  @IsString()
  @IsStrongPassword() // 🆕 使用统一的强密码验证装饰器
  password: string;
}

/**
 * 完整的用户基础DTO类
 * 包含用户名、密码和邮箱验证
 */
export abstract class BaseUserDto extends BasePasswordDto {
  @ApiProperty({
    description: "邮箱地址",
    example: "admin@example.com",
  })
  @IsValidEmail() // 🆕 使用统一的邮箱验证装饰器
  email: string;
}
