/**
 * Gateway广播错误处理工具
 *
 * 用于Legacy代码移除后，当Gateway广播失败时创建统一异常
 * 替代原有的fallback机制，提供详细的错误信息和健康状态
 */

import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from "@common/core/exceptions";
import { STREAM_DATA_FETCHER_ERROR_CODES } from "../constants/stream-data-fetcher-error-codes.constants";

export class GatewayBroadcastError {
  /**
   * 创建广播错误异常
   */
  static create(symbol: string, healthStatus: any, reason: string) {
    return UniversalExceptionFactory.createBusinessException({
      component: ComponentIdentifier.STREAM_DATA_FETCHER,
      errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
      operation: 'gatewayBroadcast',
      message: `Gateway broadcast failed for symbol ${symbol}: ${reason}`,
      context: {
        symbol,
        healthStatus,
        reason,
        timestamp: new Date().toISOString(),
        isCritical: GatewayBroadcastError.isCritical(healthStatus, reason),
        recommendation: GatewayBroadcastError.getRecommendation(reason, healthStatus)
      }
    });
  }

  /**
   * 判断是否为严重错误（需要立即告警）
   */
  static isCritical(healthStatus: any, reason: string): boolean {
    return (
      healthStatus?.status === "unhealthy" ||
      reason.includes("No server instance") ||
      reason.includes("未集成")
    );
  }

  /**
   * 获取建议的修复操作
   */
  static getRecommendation(reason: string, healthStatus: any): string {
    if (reason.includes("No server instance")) {
      return "Check if Gateway server is properly started and integrated with WebSocketServerProvider";
    }

    if (reason.includes("未集成")) {
      return "Ensure StreamReceiverGateway.afterInit() correctly calls webSocketProvider.setGatewayServer()";
    }

    if (healthStatus?.status === "degraded") {
      return "Check Gateway server initialization status, ensure all components are loaded correctly";
    }

    if (healthStatus?.status === "unhealthy") {
      return "Immediately check Gateway health status, review detailed error information and fix root cause";
    }

    return "Check Gateway connection status and network configuration, ensure WebSocket server is running properly";
  }
}
