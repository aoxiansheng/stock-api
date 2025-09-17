/**
 * 频率限制固定标准常量 - 重定向到统一语义常量文件
 * 🎯 重构说明：所有固定标准已整合到 auth-semantic.constants.ts
 *
 * ⚠️  此文件已废弃：所有语义常量已迁移到 auth-semantic.constants.ts
 * 🔧 配置参数访问：通过 AuthConfigCompatibilityWrapper 获取可配置参数
 *
 * @deprecated 使用 auth-semantic.constants.ts 中的对应常量
 * @see auth-semantic.constants.ts - 所有语义常量的统一位置
 * @see AuthConfigCompatibilityWrapper - 访问配置参数
 * @see .env.auth.example - 环境变量配置说明
 */

// 🔄 重新导出语义常量，以保持向后兼容性
export {
  RateLimitStrategy,
  RateLimitTier,
  RateLimitScope,
  RATE_LIMIT_SCOPES,
  TIME_UNITS,
  TIME_MULTIPLIERS,
  RATE_LIMIT_VALIDATION,
  RateLimitOperation,
  RateLimitMessage,
} from "./auth-semantic.constants";

// ⚠️  已完全迁移：所有可配置参数现在通过统一配置系统访问
// 🔧 新的访问方式：
// - AuthConfigCompatibilityWrapper.RATE_LIMITS - 频率限制配置
// - AuthConfigCompatibilityWrapper.VALIDATION_LIMITS - 验证限制配置
// - AuthConfigCompatibilityWrapper.SESSION_CONFIG - 会话配置
// - AuthConfigCompatibilityWrapper.SECURITY_CONFIG - 安全配置
//
// 📋 已迁移配置：
// - AUTH_RATE_LIMITS: 登录、注册、密码重置频率限制
// - SESSION_LIMITS: 会话创建、刷新、注销限制、并发会话数
// - PERMISSION_RATE_LIMITS: 权限检查频率和缓存TTL
// - GLOBAL_RATE_LIMITS: 全局频率限制、负载大小、查询参数、递归深度
// - RATE_LIMIT_TIERS: 用户层级限制倍数配置
// - RATE_LIMIT_STORAGE: Redis TTL、超时、重试、缓冲配置
// - PERFORMANCE_LIMITS: 慢请求阈值、字符串长度、对象深度、字段数量
//
// 💡 迁移指南：
// 旧代码: import { AUTH_RATE_LIMITS } from '@auth/constants/rate-limiting.constants';
// 新代码: 注入 AuthConfigCompatibilityWrapper，使用 wrapper.RATE_LIMITS
