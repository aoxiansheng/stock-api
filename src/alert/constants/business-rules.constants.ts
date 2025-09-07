/**
 * Alert模块业务规则常量文件
 * 🎯 定义业务逻辑中的魔法数字为命名常量
 * 🔧 提高代码可读性和可维护性
 */

import { TIMING_CONSTANTS } from './timing.constants';
import { SHARED_STRING_LIMITS, SHARED_BATCH_LIMITS } from './shared.constants';

/**
 * 告警规则业务常量
 */
export const ALERT_BUSINESS_RULES = Object.freeze({
  // 📊 数量限制
  LIMITS: {
    // 单个用户最大规则数量
    MAX_RULES_PER_USER: 100,
    // 单个规则最大条件数量
    MAX_CONDITIONS_PER_RULE: 10,
    // 单个规则最大动作数量
    MAX_ACTIONS_PER_RULE: 5,
    // 批量操作最大数量
    MAX_BATCH_SIZE: 50,
    // 搜索结果最大数量
    MAX_SEARCH_RESULTS: SHARED_BATCH_LIMITS.MAX_SEARCH_RESULTS,
    // 历史记录保留最大天数
    MAX_HISTORY_RETENTION_DAYS: 365,
    // 单次查询最大结果数
    MAX_QUERY_LIMIT: 100,
    // 分页常量已迁移到 ALERT_DEFAULTS.PAGINATION 中统一管理
  },

  // ⏱️ 时间间隔规则
  INTERVALS: {
    // 规则评估最小间隔(秒)
    MIN_EVALUATION_INTERVAL: 10,
    // 规则评估默认间隔(秒)  
    DEFAULT_EVALUATION_INTERVAL: 60,
    // 规则评估最大间隔(秒)
    MAX_EVALUATION_INTERVAL: 3600,
    // 清理任务间隔(秒)
    CLEANUP_INTERVAL: 3600,
    // 指标收集间隔(秒)
    METRICS_COLLECTION_INTERVAL: 60
  },


  // 🔄 重试策略 - 基础配置已迁移到 retry.constants.ts
  RETRY: {
    // 通知发送重试次数（特殊配置，高于默认值）
    NOTIFICATION_MAX_RETRIES: 5,
    // 数据库操作重试次数（特殊配置，低于默认值）
    DB_MAX_RETRIES: 2,
    // 其他基础重试配置请使用 BASE_RETRY_CONFIG
  },

  // 📈 性能优化
  PERFORMANCE: {
    // 缓存过期时间(秒)
    CACHE_TTL_SECONDS: TIMING_CONSTANTS.CACHE_TTL.STATS_SECONDS, // 使用统一时间常量
    // 批处理大小
    BATCH_PROCESS_SIZE: 20,
    // 连接池大小
    CONNECTION_POOL_SIZE: 10,
    // 查询超时时间(毫秒)
    QUERY_TIMEOUT_MS: 5000,
  },

  // 🔒 安全规则
  SECURITY: {
    // 密码最小长度
    MIN_PASSWORD_LENGTH: 8,
    // 密码最大长度
    MAX_PASSWORD_LENGTH: 128,
    // 登录失败最大次数
    MAX_LOGIN_ATTEMPTS: 5,
    // 账户锁定时间(秒)
    ACCOUNT_LOCKOUT_SECONDS: 1800,
    // JWT过期时间(秒)
    JWT_EXPIRES_SECONDS: 3600,
    // 刷新令牌过期时间(秒)
    REFRESH_TOKEN_EXPIRES_SECONDS: 86400,
    // API限流窗口大小(秒)
    RATE_LIMIT_WINDOW_SECONDS: 60,
    // API限流最大请求数
    RATE_LIMIT_MAX_REQUESTS: 100
  },

  // 📝 字符串长度限制
  STRING_LIMITS: {
    // 规则名称最大长度
    MAX_RULE_NAME_LENGTH: 100,
    // 规则描述最大长度
    MAX_RULE_DESCRIPTION_LENGTH: 500,
    // 标签最大长度
    MAX_TAG_LENGTH: 50,
    // 用户名最大长度
    MAX_USERNAME_LENGTH: 50,
    // 邮箱最大长度
    MAX_EMAIL_LENGTH: 320,
    // URL最大长度
    MAX_URL_LENGTH: 2048,
    // 消息内容最大长度
    MAX_MESSAGE_LENGTH: SHARED_STRING_LIMITS.MAX_MESSAGE_LENGTH,
    // 文件名最大长度
    MAX_FILENAME_LENGTH: 255
  }
});



/**
 * 导出所有业务规则相关常量
 */
export const BUSINESS_CONSTANTS = Object.freeze({
  ...ALERT_BUSINESS_RULES
});

export default ALERT_BUSINESS_RULES;