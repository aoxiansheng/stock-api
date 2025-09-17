/**
 * Redis特定常量
 * 🎯 Phase 2.4: 提取Redis特定的技术常量
 * ⚡ Domain层 - Redis特定的技术限制和配置常量
 * 
 * 与Cache业务常量的区别：
 * - 这里是Redis技术限制（如键长度、数据类型限制）
 * - Cache业务常量在cache模块中（如TTL策略、批量大小）
 */

/**
 * Redis键规范常量
 * 🔧 Redis键的技术限制和格式要求
 */
export const REDIS_KEY_CONSTRAINTS = Object.freeze({
  // 键长度限制
  MAX_KEY_LENGTH: 250, // Redis键最大长度（技术限制）
  MIN_KEY_LENGTH: 1, // Redis键最小长度
  
  // 键格式规范
  INVALID_CHARS_PATTERN: /[\s\r\n\t]/, // 不允许的字符：空格、换行、制表符
  VALID_KEY_PATTERN: /^[^\s\r\n\t]+$/, // 有效键模式
  
  // 键分隔符建议
  NAMESPACE_SEPARATOR: ":", // 命名空间分隔符
  LEVEL_SEPARATOR: ":", // 层级分隔符
  
  // 常见前缀建议
  SUGGESTED_PREFIXES: {
    CACHE: "cache",
    SESSION: "session", 
    LOCK: "lock",
    QUEUE: "queue",
    COUNTER: "counter",
    TEMP: "temp",
  },
});

/**
 * Redis数据类型限制
 * 🔧 Redis不同数据类型的技术限制
 */
export const REDIS_DATA_CONSTRAINTS = Object.freeze({
  // 字符串类型限制
  STRING: {
    MAX_VALUE_SIZE: 512 * 1024 * 1024, // 512MB - Redis字符串最大值
    RECOMMENDED_MAX_SIZE: 10 * 1024 * 1024, // 10MB - 推荐最大值
  },
  
  // 列表类型限制
  LIST: {
    MAX_ELEMENTS: 4294967295, // 2^32 - 1
    RECOMMENDED_MAX_ELEMENTS: 10000, // 推荐最大元素数
  },
  
  // 集合类型限制
  SET: {
    MAX_ELEMENTS: 4294967295, // 2^32 - 1
    RECOMMENDED_MAX_ELEMENTS: 10000, // 推荐最大元素数
  },
  
  // 哈希类型限制
  HASH: {
    MAX_FIELDS: 4294967295, // 2^32 - 1
    RECOMMENDED_MAX_FIELDS: 1000, // 推荐最大字段数
    MAX_FIELD_SIZE: 512 * 1024 * 1024, // 512MB - 字段值最大大小
  },
  
  // 有序集合类型限制
  ZSET: {
    MAX_ELEMENTS: 4294967295, // 2^32 - 1
    RECOMMENDED_MAX_ELEMENTS: 10000, // 推荐最大元素数
    SCORE_MIN: -1.7976931348623157e+308, // 最小分数
    SCORE_MAX: 1.7976931348623157e+308, // 最大分数
  },
});

/**
 * Redis连接和性能常量
 * 🔧 Redis连接池和性能相关的技术参数
 */
export const REDIS_CONNECTION_CONSTRAINTS = Object.freeze({
  // 连接池限制
  CONNECTION_POOL: {
    MIN_CONNECTIONS: 1, // 最小连接数
    MAX_CONNECTIONS: 10, // 最大连接数
    DEFAULT_CONNECTIONS: 5, // 默认连接数
  },
  
  // 超时设置
  TIMEOUTS: {
    CONNECT_TIMEOUT_MS: 5000, // 连接超时 5秒
    COMMAND_TIMEOUT_MS: 3000, // 命令超时 3秒
    KEEPALIVE_MS: 30000, // 保活时间 30秒
  },
  
  // 重试设置
  RETRY: {
    MAX_RETRIES: 3, // 最大重试次数
    RETRY_DELAY_MS: 1000, // 重试延迟 1秒
    BACKOFF_MULTIPLIER: 2, // 退避乘数
  },
  
  // 性能建议
  PERFORMANCE: {
    PIPELINE_BATCH_SIZE: 100, // 管道批量大小
    MEMORY_USAGE_WARNING_MB: 1024, // 内存使用警告阈值 1GB
    MEMORY_USAGE_CRITICAL_MB: 2048, // 内存使用危险阈值 2GB
  },
});

/**
 * Redis命令类别常量
 * 🔧 Redis命令的分类和使用建议
 */
export const REDIS_COMMAND_CATEGORIES = Object.freeze({
  // 读操作命令
  READ_COMMANDS: [
    "GET", "MGET", "HGET", "HGETALL", "LRANGE", "SMEMBERS", 
    "ZRANGE", "EXISTS", "TTL", "TYPE", "KEYS", "SCAN"
  ],
  
  // 写操作命令  
  WRITE_COMMANDS: [
    "SET", "MSET", "HSET", "HMSET", "LPUSH", "RPUSH", "SADD",
    "ZADD", "DEL", "HDEL", "LPOP", "RPOP", "SREM", "ZREM"
  ],
  
  // 危险命令（生产环境应避免）
  DANGEROUS_COMMANDS: [
    "FLUSHDB", "FLUSHALL", "KEYS", "DEBUG", "CONFIG", "SHUTDOWN"
  ],
  
  // 管理命令
  ADMIN_COMMANDS: [
    "INFO", "MONITOR", "CLIENT", "CONFIG", "SAVE", "BGSAVE"
  ],
});

/**
 * Redis特定验证工具类
 * 🛠️ 提供Redis技术限制的验证逻辑
 */
export class RedisValidationUtil {
  /**
   * 验证Redis键格式
   */
  static validateKeyFormat(key: string): { valid: boolean; error?: string } {
    if (!key || typeof key !== "string") {
      return { valid: false, error: "Redis键必须是非空字符串" };
    }
    
    // 长度检查
    if (key.length < REDIS_KEY_CONSTRAINTS.MIN_KEY_LENGTH) {
      return { valid: false, error: "Redis键长度不能为空" };
    }
    
    if (key.length > REDIS_KEY_CONSTRAINTS.MAX_KEY_LENGTH) {
      return { 
        valid: false, 
        error: `Redis键长度不能超过 ${REDIS_KEY_CONSTRAINTS.MAX_KEY_LENGTH} 字符，当前长度: ${key.length}` 
      };
    }
    
    // 格式检查
    if (REDIS_KEY_CONSTRAINTS.INVALID_CHARS_PATTERN.test(key)) {
      return { valid: false, error: "Redis键不能包含空格、换行符或制表符" };
    }
    
    return { valid: true };
  }
  
  /**
   * 验证Redis值大小
   */
  static validateValueSize(
    value: string | Buffer, 
    type: keyof typeof REDIS_DATA_CONSTRAINTS = "STRING"
  ): { valid: boolean; error?: string } {
    const size = typeof value === "string" ? Buffer.byteLength(value) : value.length;
    const constraint = REDIS_DATA_CONSTRAINTS[type];
    const limit = "MAX_VALUE_SIZE" in constraint ? constraint.MAX_VALUE_SIZE : REDIS_DATA_CONSTRAINTS.STRING.MAX_VALUE_SIZE;
    const recommended = "RECOMMENDED_MAX_SIZE" in constraint ? constraint.RECOMMENDED_MAX_SIZE : REDIS_DATA_CONSTRAINTS.STRING.RECOMMENDED_MAX_SIZE;
    
    if (size > limit) {
      return { 
        valid: false, 
        error: `Redis值大小超过技术限制 ${limit} 字节，当前大小: ${size} 字节` 
      };
    }
    
    if (size > recommended) {
      return { 
        valid: true, 
        error: `Redis值大小超过推荐限制 ${recommended} 字节，当前大小: ${size} 字节（警告）` 
      };
    }
    
    return { valid: true };
  }
  
  /**
   * 生成建议的Redis键名
   */
  static generateSuggestedKey(
    prefix: keyof typeof REDIS_KEY_CONSTRAINTS.SUGGESTED_PREFIXES,
    namespace: string,
    identifier: string
  ): string {
    const prefixValue = REDIS_KEY_CONSTRAINTS.SUGGESTED_PREFIXES[prefix];
    return `${prefixValue}${REDIS_KEY_CONSTRAINTS.NAMESPACE_SEPARATOR}${namespace}${REDIS_KEY_CONSTRAINTS.LEVEL_SEPARATOR}${identifier}`;
  }
  
  /**
   * 检查是否为危险命令
   */
  static isDangerousCommand(command: string): boolean {
    return REDIS_COMMAND_CATEGORIES.DANGEROUS_COMMANDS.includes(command.toUpperCase());
  }
  
  /**
   * 检查内存使用是否超限
   */
  static checkMemoryUsage(usageMB: number): { 
    status: "normal" | "warning" | "critical"; 
    message?: string 
  } {
    if (usageMB >= REDIS_CONNECTION_CONSTRAINTS.PERFORMANCE.MEMORY_USAGE_CRITICAL_MB) {
      return { 
        status: "critical", 
        message: `Redis内存使用达到危险级别: ${usageMB}MB` 
      };
    }
    
    if (usageMB >= REDIS_CONNECTION_CONSTRAINTS.PERFORMANCE.MEMORY_USAGE_WARNING_MB) {
      return { 
        status: "warning", 
        message: `Redis内存使用达到警告级别: ${usageMB}MB` 
      };
    }
    
    return { status: "normal" };
  }
}

/**
 * 类型导出
 */
export type RedisKeyConstraints = typeof REDIS_KEY_CONSTRAINTS;
export type RedisDataConstraints = typeof REDIS_DATA_CONSTRAINTS;
export type RedisConnectionConstraints = typeof REDIS_CONNECTION_CONSTRAINTS;
export type RedisCommandCategories = typeof REDIS_COMMAND_CATEGORIES;
export type RedisPrefixType = keyof typeof REDIS_KEY_CONSTRAINTS.SUGGESTED_PREFIXES;
export type RedisDataType = keyof typeof REDIS_DATA_CONSTRAINTS;
export type RedisMemoryStatus = "normal" | "warning" | "critical";