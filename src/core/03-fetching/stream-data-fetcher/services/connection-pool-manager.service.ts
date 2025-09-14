import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { createLogger } from "@common/logging";
import { StreamConfigService } from "../config/stream-config.service";

/**
 * 连接池管理器 - 防止连接池无限增长
 *
 * 功能：
 * - 全局连接数限制
 * - 每个 provider:capability 组合的连接数限制
 * - 连接数统计和监控
 */
@Injectable()
export class ConnectionPoolManager {
  private readonly logger = createLogger(ConnectionPoolManager.name);

  // 连接统计
  private globalConnectionCount = 0;
  private connectionsByKey = new Map<string, number>(); // provider:capability -> count
  private connectionsByIP = new Map<string, number>(); // IP -> count

  constructor(private readonly streamConfig: StreamConfigService) {
    const config = this.streamConfig.getConnectionConfig();
    this.logger.log("连接池管理器已初始化", {
      maxGlobal: config.maxGlobal,
      maxPerKey: config.maxPerKey,
      maxPerIP: config.maxPerIP,
    });
  }

  /**
   * 检查是否可以创建新连接
   *
   * @param key 连接键 (provider:capability)
   * @param clientIP 客户端IP（可选）
   * @returns 是否可以创建连接
   * @throws ServiceUnavailableException 当连接数达到上限时
   */
  canCreateConnection(key: string, clientIP?: string): boolean {
    const config = this.streamConfig.getConnectionConfig();

    // 1. 检查全局连接数限制
    if (this.globalConnectionCount >= config.maxGlobal) {
      this.logger.warn("全局连接数已达上限", {
        current: this.globalConnectionCount,
        max: config.maxGlobal,
        key,
      });
      throw new ServiceUnavailableException(
        `系统连接数已达上限 (${config.maxGlobal})`,
      );
    }

    // 2. 检查每个键的连接数限制
    const keyConnectionCount = this.connectionsByKey.get(key) || 0;
    if (keyConnectionCount >= config.maxPerKey) {
      this.logger.warn("连接键的连接数已达上限", {
        key,
        current: keyConnectionCount,
        max: config.maxPerKey,
      });
      throw new ServiceUnavailableException(
        `${key} 连接数已达上限 (${config.maxPerKey})`,
      );
    }

    // 3. 检查每个IP的连接数限制（如果提供了IP）
    if (clientIP) {
      const ipConnectionCount = this.connectionsByIP.get(clientIP) || 0;
      if (ipConnectionCount >= config.maxPerIP) {
        this.logger.warn("IP连接数已达上限", {
          clientIP,
          current: ipConnectionCount,
          max: config.maxPerIP,
          key,
        });
        throw new ServiceUnavailableException(
          `IP ${clientIP} 连接数已达上限 (${config.maxPerIP})`,
        );
      }
    }

    return true;
  }

  /**
   * 注册新连接
   *
   * @param key 连接键 (provider:capability)
   * @param clientIP 客户端IP（可选）
   */
  registerConnection(key: string, clientIP?: string): void {
    // 更新全局计数
    this.globalConnectionCount++;

    // 更新键计数
    const keyCount = this.connectionsByKey.get(key) || 0;
    this.connectionsByKey.set(key, keyCount + 1);

    // 更新IP计数（如果提供了IP）
    if (clientIP) {
      const ipCount = this.connectionsByIP.get(clientIP) || 0;
      this.connectionsByIP.set(clientIP, ipCount + 1);
    }

    this.logger.debug("连接已注册", {
      key,
      clientIP,
      globalCount: this.globalConnectionCount,
      keyCount: keyCount + 1,
      ipCount: clientIP ? this.connectionsByIP.get(clientIP) || 0 : 0,
    });
  }

  /**
   * 注销连接
   *
   * @param key 连接键 (provider:capability)
   * @param clientIP 客户端IP（可选）
   */
  unregisterConnection(key: string, clientIP?: string): void {
    // 更新全局计数
    if (this.globalConnectionCount > 0) {
      this.globalConnectionCount--;
    }

    // 更新键计数
    const keyCount = this.connectionsByKey.get(key) || 0;
    if (keyCount > 0) {
      this.connectionsByKey.set(key, keyCount - 1);
    }
    if (keyCount <= 1) {
      this.connectionsByKey.delete(key);
    }

    // 更新IP计数（如果提供了IP）
    if (clientIP) {
      const ipCount = this.connectionsByIP.get(clientIP) || 0;
      if (ipCount > 0) {
        this.connectionsByIP.set(clientIP, ipCount - 1);
      }
      if (ipCount <= 1) {
        this.connectionsByIP.delete(clientIP);
      }
    }

    this.logger.debug("连接已注销", {
      key,
      clientIP,
      globalCount: this.globalConnectionCount,
      keyCount: Math.max(0, keyCount - 1),
      ipCount: clientIP
        ? Math.max(0, this.connectionsByIP.get(clientIP) || 0)
        : 0,
    });
  }

  /**
   * 获取连接池统计信息
   */
  getStats() {
    const config = this.streamConfig.getConnectionConfig();

    return {
      global: {
        current: this.globalConnectionCount,
        max: config.maxGlobal,
        utilization: (this.globalConnectionCount / config.maxGlobal) * 100,
      },
      byKey: Array.from(this.connectionsByKey.entries()).map(
        ([key, count]) => ({
          key,
          current: count,
          max: config.maxPerKey,
          utilization: (count / config.maxPerKey) * 100,
        }),
      ),
      byIP: Array.from(this.connectionsByIP.entries()).map(([ip, count]) => ({
        ip,
        current: count,
        max: config.maxPerIP,
        utilization: (count / config.maxPerIP) * 100,
      })),
      config: config,
    };
  }

  /**
   * 获取连接池利用率告警信息
   */
  getAlerts(): Array<{
    type: string;
    message: string;
    level: "warning" | "critical";
  }> {
    const config = this.streamConfig.getConnectionConfig();
    const alerts = [];

    // 全局连接数告警
    const globalUtilization =
      (this.globalConnectionCount / config.maxGlobal) * 100;
    if (globalUtilization >= 90) {
      alerts.push({
        type: "global_utilization_critical",
        message: `全局连接数使用率达到 ${globalUtilization.toFixed(1)}%`,
        level: "critical" as const,
      });
    } else if (globalUtilization >= 80) {
      alerts.push({
        type: "global_utilization_warning",
        message: `全局连接数使用率达到 ${globalUtilization.toFixed(1)}%`,
        level: "warning" as const,
      });
    }

    // 各键连接数告警
    for (const [key, count] of this.connectionsByKey.entries()) {
      const utilization = (count / config.maxPerKey) * 100;
      if (utilization >= 90) {
        alerts.push({
          type: "key_utilization_critical",
          message: `${key} 连接数使用率达到 ${utilization.toFixed(1)}%`,
          level: "critical" as const,
        });
      } else if (utilization >= 80) {
        alerts.push({
          type: "key_utilization_warning",
          message: `${key} 连接数使用率达到 ${utilization.toFixed(1)}%`,
          level: "warning" as const,
        });
      }
    }

    return alerts;
  }

  /**
   * 重置连接池统计（用于测试或故障恢复）
   */
  reset(): void {
    this.globalConnectionCount = 0;
    this.connectionsByKey.clear();
    this.connectionsByIP.clear();
    this.logger.warn("连接池统计已重置");
  }
}
