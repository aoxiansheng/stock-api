import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createLogger } from "../../../../appcore/config/logger.config";

/**
 * 缓存配置验证结果接口
 */
export interface CacheConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
  config: CacheValidatedConfig;
}

/**
 * 验证后的缓存配置接口
 */
export interface CacheValidatedConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    connectTimeout: number;
    commandTimeout: number;
    maxRetriesPerRequest: number;
    retryDelayOnFailover: number;
  };
  compression: {
    enabled: boolean;
    thresholdBytes: number;
    algorithm: string;
  };
  decompression: {
    maxConcurrent: number;
    timeoutMs: number;
  };
  batch: {
    maxBatchSize: number;
    timeoutMs: number;
  };
  ttl: {
    defaultSeconds: number;
    maxSeconds: number;
    minSeconds: number;
  };
  security: {
    enableMetrics: boolean;
    sanitizeKeys: boolean;
  };
}

/**
 * 缓存配置验证器
 * 提供配置验证、安全检查和性能优化建议
 *
 * 验证范围：
 * - Redis连接配置有效性
 * - 压缩配置合理性
 * - 并发控制参数
 * - 批处理限制
 * - TTL策略
 * - 安全配置
 */
@Injectable()
export class CacheConfigValidator {
  private readonly logger = createLogger(CacheConfigValidator.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * 验证缓存配置
   * @returns 配置验证结果
   */
  validateConfig(): CacheConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // 验证Redis配置
    const redisConfig = this.validateRedisConfig(
      errors,
      warnings,
      recommendations,
    );

    // 验证压缩配置
    const compressionConfig = this.validateCompressionConfig(
      errors,
      warnings,
      recommendations,
    );

    // 验证解压缩配置
    const decompressionConfig = this.validateDecompressionConfig(
      errors,
      warnings,
      recommendations,
    );

    // 验证批处理配置
    const batchConfig = this.validateBatchConfig(
      errors,
      warnings,
      recommendations,
    );

    // 验证TTL配置
    const ttlConfig = this.validateTTLConfig(errors, warnings, recommendations);

    // 验证安全配置
    const securityConfig = this.validateSecurityConfig(
      errors,
      warnings,
      recommendations,
    );

    const config: CacheValidatedConfig = {
      redis: redisConfig,
      compression: compressionConfig,
      decompression: decompressionConfig,
      batch: batchConfig,
      ttl: ttlConfig,
      security: securityConfig,
    };

    const valid = errors.length === 0;

    // 记录验证结果
    if (!valid) {
      this.logger.error("缓存配置验证失败", { errors, warnings });
    } else if (warnings.length > 0 || recommendations.length > 0) {
      this.logger.warn("缓存配置验证通过但有建议", {
        warnings,
        recommendations,
      });
    } else {
      this.logger.log("缓存配置验证通过");
    }

    return {
      valid,
      errors,
      warnings,
      recommendations,
      config,
    };
  }

  /**
   * 验证Redis配置
   */
  private validateRedisConfig(
    errors: string[],
    warnings: string[],
    recommendations: string[],
  ): CacheValidatedConfig["redis"] {
    const host = this.configService.get<string>("redis.host", "localhost");
    const port = this.configService.get<number>("redis.port", 6379);
    const password = this.configService.get<string>("redis.password");
    const db = this.configService.get<number>("redis.db", 0);
    const connectTimeout = this.configService.get<number>(
      "redis.connectTimeout",
      10000,
    );
    const commandTimeout = this.configService.get<number>(
      "redis.commandTimeout",
      5000,
    );
    const maxRetriesPerRequest = this.configService.get<number>(
      "redis.maxRetriesPerRequest",
      3,
    );
    const retryDelayOnFailover = this.configService.get<number>(
      "redis.retryDelayOnFailover",
      100,
    );

    // 基础配置验证
    if (!host || typeof host !== "string") {
      errors.push("Redis host 配置无效");
    }

    if (!port || port < 1 || port > 65535) {
      errors.push("Redis port 必须在 1-65535 范围内");
    }

    if (db < 0 || db > 15) {
      errors.push("Redis database 必须在 0-15 范围内");
    }

    // 超时配置验证
    if (connectTimeout < 1000) {
      warnings.push("Redis 连接超时过短，建议至少 1000ms");
    } else if (connectTimeout > 30000) {
      warnings.push("Redis 连接超时过长，可能影响用户体验");
    }

    if (commandTimeout < 1000) {
      warnings.push("Redis 命令超时过短，建议至少 1000ms");
    } else if (commandTimeout > 10000) {
      warnings.push("Redis 命令超时过长，可能影响响应时间");
    }

    // 重试配置验证
    if (maxRetriesPerRequest > 5) {
      warnings.push("Redis 最大重试次数过多，可能导致响应延迟");
    } else if (maxRetriesPerRequest < 1) {
      warnings.push("Redis 重试次数过少，建议至少重试 1 次");
    }

    if (retryDelayOnFailover < 50) {
      warnings.push("Redis 故障转移延迟过短，建议至少 50ms");
    } else if (retryDelayOnFailover > 1000) {
      warnings.push("Redis 故障转移延迟过长，建议不超过 1000ms");
    }

    // 安全建议
    if (!password && host !== "localhost" && host !== "127.0.0.1") {
      warnings.push("连接远程 Redis 时建议设置密码");
    }

    if (host === "localhost" || host === "127.0.0.1") {
      recommendations.push("本地开发环境，建议生产环境使用专用 Redis 集群");
    }

    return {
      host,
      port,
      password,
      db,
      connectTimeout,
      commandTimeout,
      maxRetriesPerRequest,
      retryDelayOnFailover,
    };
  }

  /**
   * 验证压缩配置
   */
  private validateCompressionConfig(
    errors: string[],
    warnings: string[],
    recommendations: string[],
  ): CacheValidatedConfig["compression"] {
    const enabled = this.configService.get<boolean>(
      "cache.compression.enabled",
      true,
    );
    const thresholdBytes = this.configService.get<number>(
      "cache.compression.thresholdBytes",
      1024,
    );
    const algorithm = this.configService.get<string>(
      "cache.compression.algorithm",
      "gzip",
    );

    // 压缩阈值验证
    if (thresholdBytes < 100) {
      warnings.push("压缩阈值过小，可能导致过度压缩小数据");
    } else if (thresholdBytes > 10240) {
      warnings.push("压缩阈值过大，可能错过压缩机会");
    }

    // 压缩算法验证
    const supportedAlgorithms = ["gzip", "deflate", "br"];
    if (!supportedAlgorithms.includes(algorithm)) {
      errors.push(
        `不支持的压缩算法: ${algorithm}，支持的算法: ${supportedAlgorithms.join(", ")}`,
      );
    }

    // 性能建议
    if (enabled && algorithm === "br") {
      recommendations.push(
        "Brotli 压缩比更高但 CPU 消耗更大，适合低频访问的数据",
      );
    } else if (enabled && algorithm === "gzip") {
      recommendations.push("Gzip 压缩平衡了压缩比和性能，适合大多数场景");
    }

    return {
      enabled,
      thresholdBytes,
      algorithm,
    };
  }

  /**
   * 验证解压缩配置
   */
  private validateDecompressionConfig(
    errors: string[],
    warnings: string[],
    recommendations: string[],
  ): CacheValidatedConfig["decompression"] {
    const maxConcurrent = this.configService.get<number>(
      "cache.decompression.maxConcurrent",
      10,
    );
    const timeoutMs = this.configService.get<number>(
      "cache.decompression.timeoutMs",
      5000,
    );

    // 并发数验证
    if (maxConcurrent < 1) {
      errors.push("解压缩最大并发数必须大于 0");
    } else if (maxConcurrent > 50) {
      warnings.push("解压缩最大并发数过高，可能导致内存压力");
    } else if (maxConcurrent < 5) {
      warnings.push("解压缩最大并发数过低，可能影响高并发场景性能");
    }

    // 超时验证
    if (timeoutMs < 1000) {
      warnings.push("解压缩超时过短，复杂数据可能解压失败");
    } else if (timeoutMs > 30000) {
      warnings.push("解压缩超时过长，可能影响用户体验");
    }

    // 性能建议
    const cpuCores = require("os").cpus().length;
    if (maxConcurrent > cpuCores * 2) {
      recommendations.push(
        `当前 CPU 核心数: ${cpuCores}，建议解压缩并发数不超过 ${cpuCores * 2}`,
      );
    }

    return {
      maxConcurrent,
      timeoutMs,
    };
  }

  /**
   * 验证批处理配置
   */
  private validateBatchConfig(
    errors: string[],
    warnings: string[],
    recommendations: string[],
  ): CacheValidatedConfig["batch"] {
    const maxBatchSize = this.configService.get<number>(
      "cache.batch.maxBatchSize",
      100,
    );
    const timeoutMs = this.configService.get<number>(
      "cache.batch.timeoutMs",
      10000,
    );

    // 批处理大小验证
    if (maxBatchSize < 1) {
      errors.push("批处理最大大小必须大于 0");
    } else if (maxBatchSize > 1000) {
      warnings.push("批处理最大大小过大，可能导致内存溢出或超时");
    } else if (maxBatchSize < 10) {
      warnings.push("批处理最大大小过小，可能无法发挥批处理优势");
    }

    // 批处理超时验证
    if (timeoutMs < 5000) {
      warnings.push("批处理超时过短，大批量操作可能失败");
    } else if (timeoutMs > 60000) {
      warnings.push("批处理超时过长，可能影响系统响应性");
    }

    // 性能建议
    if (maxBatchSize > 500) {
      recommendations.push("大批量操作建议考虑分批处理以避免阻塞");
    }

    return {
      maxBatchSize,
      timeoutMs,
    };
  }

  /**
   * 验证TTL配置
   */
  private validateTTLConfig(
    errors: string[],
    warnings: string[],
    recommendations: string[],
  ): CacheValidatedConfig["ttl"] {
    const defaultSeconds = this.configService.get<number>(
      "cache.ttl.defaultSeconds",
      3600,
    );
    const maxSeconds = this.configService.get<number>(
      "cache.ttl.maxSeconds",
      86400,
    );
    const minSeconds = this.configService.get<number>(
      "cache.ttl.minSeconds",
      60,
    );

    // TTL范围验证
    if (minSeconds < 1) {
      errors.push("最小TTL必须大于 0 秒");
    } else if (minSeconds > 3600) {
      warnings.push("最小TTL过长，可能导致数据更新不及时");
    }

    if (maxSeconds < minSeconds) {
      errors.push("最大TTL不能小于最小TTL");
    } else if (maxSeconds > 604800) {
      // 7天
      warnings.push("最大TTL过长，建议不超过 7 天");
    }

    if (defaultSeconds < minSeconds || defaultSeconds > maxSeconds) {
      errors.push("默认TTL必须在最小TTL和最大TTL之间");
    }

    // 性能建议
    if (defaultSeconds < 300) {
      // 5分钟
      recommendations.push("默认TTL较短，适合实时性要求高的数据");
    } else if (defaultSeconds > 7200) {
      // 2小时
      recommendations.push("默认TTL较长，适合相对稳定的数据");
    }

    return {
      defaultSeconds,
      maxSeconds,
      minSeconds,
    };
  }

  /**
   * 验证安全配置
   */
  private validateSecurityConfig(
    errors: string[],
    warnings: string[],
    recommendations: string[],
  ): CacheValidatedConfig["security"] {
    const enableMetrics = this.configService.get<boolean>(
      "cache.security.enableMetrics",
      true,
    );
    const sanitizeKeys = this.configService.get<boolean>(
      "cache.security.sanitizeKeys",
      true,
    );

    // 安全建议
    if (!enableMetrics) {
      recommendations.push("建议启用指标收集以监控缓存性能");
    }

    if (!sanitizeKeys) {
      warnings.push("未启用键名清理，可能存在注入风险");
    }

    // 环境相关建议
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === "production") {
      if (!sanitizeKeys) {
        errors.push("生产环境必须启用键名清理");
      }
      recommendations.push("生产环境建议定期审查缓存配置和安全策略");
    } else {
      recommendations.push("开发环境可以考虑启用更详细的调试日志");
    }

    return {
      enableMetrics,
      sanitizeKeys,
    };
  }

  /**
   * 获取配置建议摘要
   * @param result 验证结果
   * @returns 配置建议摘要
   */
  getConfigSummary(result: CacheConfigValidationResult): string {
    const { valid, errors, warnings, recommendations } = result;

    let summary = `缓存配置验证: ${valid ? "✅ 通过" : "❌ 失败"}\n`;

    if (errors.length > 0) {
      summary += `\n错误 (${errors.length}):\n`;
      errors.forEach((error) => (summary += `  • ${error}\n`));
    }

    if (warnings.length > 0) {
      summary += `\n警告 (${warnings.length}):\n`;
      warnings.forEach((warning) => (summary += `  • ${warning}\n`));
    }

    if (recommendations.length > 0) {
      summary += `\n建议 (${recommendations.length}):\n`;
      recommendations.forEach((rec) => (summary += `  • ${rec}\n`));
    }

    return summary;
  }

  /**
   * 检查配置是否适合生产环境
   * @param config 验证后的配置
   * @returns 是否适合生产环境
   */
  isProductionReady(config: CacheValidatedConfig): {
    ready: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Redis配置检查
    if (
      config.redis.host === "localhost" ||
      config.redis.host === "127.0.0.1"
    ) {
      issues.push("生产环境应使用专用 Redis 服务器");
    }

    if (!config.redis.password && config.redis.host !== "localhost") {
      issues.push("生产环境连接远程 Redis 应设置密码");
    }

    if (config.redis.connectTimeout < 5000) {
      issues.push("生产环境 Redis 连接超时建议至少 5 秒");
    }

    // 安全配置检查
    if (!config.security.sanitizeKeys) {
      issues.push("生产环境必须启用键名清理");
    }

    // 性能配置检查
    if (config.decompression.maxConcurrent > 20) {
      issues.push("生产环境解压缩并发数建议控制在 20 以内");
    }

    if (config.batch.maxBatchSize > 500) {
      issues.push("生产环境批处理大小建议控制在 500 以内");
    }

    return {
      ready: issues.length === 0,
      issues,
    };
  }
}
