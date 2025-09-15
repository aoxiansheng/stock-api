import { registerAs } from '@nestjs/config';
import { AuthCacheConfigValidation, authCacheConfig } from './auth-cache.config';
import { AuthLimitsConfigValidation, authLimitsConfig } from './auth-limits.config';

/**
 * Auth统一配置入口
 * 整合所有Auth相关的分层配置，提供统一访问接口
 * 
 * @description
 * 这是Auth模块配置的统一入口点，包含：
 * 1. 缓存配置 - TTL和缓存相关参数
 * 2. 限制配置 - 数值限制、阈值、超时等参数
 * 
 * 通过分层设计避免单一配置类过大，同时提供统一访问入口
 */
export interface AuthUnifiedConfigInterface {
  /**
   * 缓存配置层
   * 包含所有缓存相关的TTL配置
   */
  cache: AuthCacheConfigValidation;
  
  /**
   * 限制配置层  
   * 包含所有数值限制、阈值、超时配置
   */
  limits: AuthLimitsConfigValidation;
}

/**
 * Auth统一配置创建函数
 * 整合各个分层配置，确保配置的一致性和完整性
 */
const createAuthUnifiedConfig = (): AuthUnifiedConfigInterface => {
  // 创建各层配置实例
  const cacheConfig = authCacheConfig();
  const limitsConfig = authLimitsConfig();
  
  return {
    cache: cacheConfig,
    limits: limitsConfig
  };
};

/**
 * 配置注册函数
 * 使用NestJS ConfigService标准模式注册统一配置
 */
const authUnifiedConfig = registerAs('authUnified', createAuthUnifiedConfig);

/**
 * 配置类型导出
 * 提供类型安全的配置访问
 */
export type AuthUnifiedConfig = ReturnType<typeof authUnifiedConfig>;

// 导出配置注册函数和默认导出
export { authUnifiedConfig };
export default authUnifiedConfig;

/**
 * 配置工厂函数
 * 提供配置实例的直接创建方法，用于测试和开发
 */
export const createAuthConfig = (): AuthUnifiedConfigInterface => {
  return createAuthUnifiedConfig();
};

/**
 * 配置验证函数
 * 验证统一配置的完整性和一致性
 */
export const validateAuthUnifiedConfig = (config: AuthUnifiedConfigInterface): string[] => {
  const errors: string[] = [];
  
  // 验证配置层级完整性
  if (!config.cache) {
    errors.push('缺少缓存配置层 (cache)');
  }
  
  if (!config.limits) {
    errors.push('缺少限制配置层 (limits)');
  }
  
  // 验证关键配置项存在性
  if (config.cache && typeof config.cache.permissionCacheTtl !== 'number') {
    errors.push('权限缓存TTL配置无效');
  }
  
  if (config.limits && typeof config.limits.globalRateLimit !== 'number') {
    errors.push('全局频率限制配置无效');
  }
  
  // 验证配置一致性
  if (config.cache && config.limits) {
    // 确保TTL配置合理性
    if (config.cache.permissionCacheTtl > config.limits.sessionTimeoutMinutes * 60) {
      errors.push('权限缓存TTL不应超过会话超时时间');
    }
    
    // 确保频率限制合理性
    if (config.limits.apiKeyValidatePerSecond * 60 > config.limits.globalRateLimit * 2) {
      errors.push('API Key验证频率与全局频率限制不匹配');
    }
  }
  
  return errors;
};

/**
 * 获取环境相关的配置摘要
 * 用于日志和调试，不包含敏感信息
 */
export const getAuthConfigSummary = (config: AuthUnifiedConfigInterface) => {
  return {
    cache: {
      permissionTtl: config.cache.permissionCacheTtl,
      apiKeyTtl: config.cache.apiKeyCacheTtl,
      sessionTtl: config.cache.sessionCacheTtl
    },
    limits: {
      globalRateLimit: config.limits.globalRateLimit,
      maxStringLength: config.limits.maxStringLength,
      maxApiKeysPerUser: config.limits.maxApiKeysPerUser,
      timeoutMs: config.limits.timeoutMs
    },
    validation: {
      configLayersCount: 2,
      hasCache: !!config.cache,
      hasLimits: !!config.limits
    }
  };
};