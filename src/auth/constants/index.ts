/**
 * Auth 模块常量统一导出入口
 * 🎯 主索引文件 - 提供 Auth 模块所有常量的统一访问接口
 * 
 * 📁 架构说明:
 * - 原有常量文件：apikey、auth、http-status、permission、validation
 * - 新增剥离常量：rate-limit (从 common 常量剥离)
 * 
 * 🎯 使用方式:
 * 1. 频率限制: import { RateLimitStrategy, AUTH_RATE_LIMIT_CONFIG } from '@/auth/constants'
 * 2. API Key: import { API_KEY_CONSTANTS } from '@/auth/constants'
 * 3. 认证: import { AUTH_CONSTANTS } from '@/auth/constants'
 * 4. 权限: import { PERMISSION_CONSTANTS } from '@/auth/constants'
 */

// ================================
// 从 common 常量剥离的专属导出
// ================================
export * from './rate-limit';
export { 
  RateLimitStrategy, 
  RateLimitTier, 
  RateLimitScope,
  AUTH_RATE_LIMIT_CONFIG, 
  AUTH_RATE_LIMIT_MESSAGES,
  AuthRateLimitUtil 
} from './rate-limit';

// ================================
// 原有 Auth 模块常量导出
// ================================
export * from './apikey.constants';
export * from './auth.constants';
export * from './http-status.constants';
export * from './permission.constants';
export * from './validation.constants';