import { IsString, IsEmail, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AUTH_VALIDATION_RULES } from '../constants/auth.constants';
import { 
  PASSWORD_CONSTRAINTS, 
  USERNAME_CONSTRAINTS 
} from '../constants/validation.constants';

/**
 * 基础认证DTO类
 * 包含通用的用户名验证规则
 */
export abstract class BaseAuthDto {
  @ApiProperty({
    description: '用户名',
    example: 'admin',
    minLength: USERNAME_CONSTRAINTS.MIN_LENGTH,
    maxLength: USERNAME_CONSTRAINTS.MAX_LENGTH,
  })
  @IsString()
  @MinLength(USERNAME_CONSTRAINTS.MIN_LENGTH)
  @MaxLength(USERNAME_CONSTRAINTS.MAX_LENGTH)
  @Matches(AUTH_VALIDATION_RULES.USERNAME_PATTERN, {
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
    minLength: PASSWORD_CONSTRAINTS.MIN_LENGTH,
  })
  @IsString()
  @MinLength(PASSWORD_CONSTRAINTS.MIN_LENGTH, {
    message: `密码长度不能少于 ${PASSWORD_CONSTRAINTS.MIN_LENGTH} 位`,
  })
  @MaxLength(PASSWORD_CONSTRAINTS.MAX_LENGTH)
  @Matches(AUTH_VALIDATION_RULES.PASSWORD_PATTERN, {
    message: '密码必须包含至少一个字母和一个数字',
  })
  password: string;
}

/**
 * 包含邮箱验证的基础DTO类
 * 用于需要邮箱验证的场景
 */
export abstract class BaseEmailDto extends BaseAuthDto {
  @ApiProperty({
    description: '邮箱地址',
    example: 'admin@example.com',
  })
  @IsEmail()
  @Matches(AUTH_VALIDATION_RULES.EMAIL_PATTERN, {
    message: '邮箱格式不正确',
  })
  email: string;
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
  @Matches(AUTH_VALIDATION_RULES.EMAIL_PATTERN, {
    message: '邮箱格式不正确',
  })
  email: string;
}