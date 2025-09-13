import { IsString, IsEmail, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { USER_REGISTRATION } from '../constants/user-operations.constants';

/**
 * 基础认证DTO类
 * 包含通用的用户名验证规则
 */
export abstract class BaseAuthDto {
  @ApiProperty({
    description: '用户名',
    example: 'admin',
    minLength: USER_REGISTRATION.USERNAME_MIN_LENGTH,
    maxLength: USER_REGISTRATION.USERNAME_MAX_LENGTH,
  })
  @IsString()
  @MinLength(USER_REGISTRATION.USERNAME_MIN_LENGTH)
  @MaxLength(USER_REGISTRATION.USERNAME_MAX_LENGTH)
  @Matches(USER_REGISTRATION.USERNAME_PATTERN, {
    message: '用户名只能包含字母、数字、下划线和连字符',
  })
  username: string;
}

/**
 * 包含密码验证的基础DTO类
 * 继承BaseAuthDto并添加密码验证规则
 */
export abstract class BasePasswordDto extends BaseAuthDto {
  @ApiProperty({
    description: '密码',
    example: 'password123',
    minLength: USER_REGISTRATION.PASSWORD_MIN_LENGTH,
  })
  @IsString()
  @MinLength(USER_REGISTRATION.PASSWORD_MIN_LENGTH, {
    message: `密码长度不能少于 ${USER_REGISTRATION.PASSWORD_MIN_LENGTH} 位`,
  })
  @MaxLength(USER_REGISTRATION.PASSWORD_MAX_LENGTH)
  @Matches(USER_REGISTRATION.PASSWORD_PATTERN, {
    message: '密码必须包含至少一个字母和一个数字',
  })
  password: string;
}

/**
 * 完整的用户基础DTO类
 * 包含用户名、密码和邮箱验证
 */
export abstract class BaseUserDto extends BasePasswordDto {
  @ApiProperty({
    description: '邮箱地址',
    example: 'admin@example.com',
  })
  @IsEmail()
  @Matches(USER_REGISTRATION.EMAIL_PATTERN, {
    message: '邮箱格式不正确',
  })
  email: string;
}