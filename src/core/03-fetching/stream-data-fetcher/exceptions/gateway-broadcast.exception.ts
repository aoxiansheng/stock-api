/**
 * Gateway广播错误异常
 * 
 * 用于Legacy代码移除后，当Gateway广播失败时抛出的专用异常
 * 替代原有的fallback机制，提供详细的错误信息和健康状态
 */
export class GatewayBroadcastError extends Error {
  public readonly symbol: string;
  public readonly healthStatus: any;
  public readonly reason: string;
  public readonly timestamp: string;
  
  constructor(
    symbol: string,
    healthStatus: any,
    reason: string
  ) {
    super(`Gateway广播失败 [${symbol}]: ${reason}`);
    
    this.name = 'GatewayBroadcastError';
    this.symbol = symbol;
    this.healthStatus = healthStatus;
    this.reason = reason;
    this.timestamp = new Date().toISOString();
    
    // 保持Stack Trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GatewayBroadcastError);
    }
  }

  /**
   * 获取错误详情用于日志记录
   */
  getErrorDetails(): {
    errorType: string;
    symbol: string;
    reason: string;
    healthStatus: any;
    timestamp: string;
    message: string;
  } {
    return {
      errorType: 'GatewayBroadcastError',
      symbol: this.symbol,
      reason: this.reason,
      healthStatus: this.healthStatus,
      timestamp: this.timestamp,
      message: this.message
    };
  }

  /**
   * 判断是否为严重错误（需要立即告警）
   */
  isCritical(): boolean {
    return this.healthStatus?.status === 'unhealthy' || 
           this.reason.includes('No server instance') ||
           this.reason.includes('未集成');
  }

  /**
   * 获取建议的修复操作
   */
  getRecommendation(): string {
    if (this.reason.includes('No server instance')) {
      return '检查Gateway服务器是否正常启动并正确集成到WebSocketServerProvider';
    }
    
    if (this.reason.includes('未集成')) {
      return '确保StreamReceiverGateway.afterInit()正确调用webSocketProvider.setGatewayServer()';
    }
    
    if (this.healthStatus?.status === 'degraded') {
      return '检查Gateway服务器初始化状态，确保所有组件正常加载';
    }
    
    if (this.healthStatus?.status === 'unhealthy') {
      return '立即检查Gateway健康状态，查看详细错误信息并修复根本问题';
    }
    
    return '检查Gateway连接状态和网络配置，确保WebSocket服务器正常运行';
  }

  /**
   * 转换为JSON格式（用于API响应或日志）
   */
  toJSON(): object {
    return {
      ...this.getErrorDetails(),
      isCritical: this.isCritical(),
      recommendation: this.getRecommendation(),
      stack: this.stack
    };
  }
}