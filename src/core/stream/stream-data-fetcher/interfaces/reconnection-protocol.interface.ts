/**
 * 客户端重连协议接口 - Phase 3
 * 
 * 定义标准化的客户端重连流程，确保数据连续性
 */

/**
 * 客户端重连请求
 */
export interface ClientReconnectRequest {
  /**
   * 客户端唯一标识
   */
  clientId: string;
  
  /**
   * 上次接收数据的时间戳（必需）
   * 用于确定补发起点
   */
  lastReceiveTimestamp: number;
  
  /**
   * 需要恢复的订阅符号
   */
  symbols: string[];
  
  /**
   * WebSocket能力类型
   */
  wsCapabilityType: string;
  
  /**
   * 优选的数据提供商
   */
  preferredProvider?: string;
  
  /**
   * 重连原因
   */
  reason?: 'network_error' | 'client_restart' | 'server_restart' | 'manual' | 'unknown';
  
  /**
   * 客户端版本信息
   */
  clientVersion?: string;
  
  /**
   * 额外的元数据
   */
  metadata?: Record<string, any>;
}

/**
 * 服务端重连响应
 */
export interface ClientReconnectResponse {
  /**
   * 重连是否成功
   */
  success: boolean;
  
  /**
   * 新的客户端ID（如果分配了新ID）
   */
  clientId: string;
  
  /**
   * 服务端确认的订阅符号
   */
  confirmedSymbols: string[];
  
  /**
   * 拒绝的符号及原因
   */
  rejectedSymbols?: Array<{
    symbol: string;
    reason: string;
  }>;
  
  /**
   * 数据补发策略
   */
  recoveryStrategy: {
    /**
     * 是否会补发历史数据
     */
    willRecover: boolean;
    
    /**
     * 补发时间范围
     */
    timeRange?: {
      from: number;
      to: number;
    };
    
    /**
     * 预计补发的数据点数量
     */
    estimatedDataPoints?: number;
    
    /**
     * 补发任务ID（用于跟踪）
     */
    recoveryJobId?: string;
  };
  
  /**
   * 连接信息
   */
  connectionInfo: {
    /**
     * 使用的提供商
     */
    provider: string;
    
    /**
     * 连接ID
     */
    connectionId: string;
    
    /**
     * 服务端时间戳
     */
    serverTimestamp: number;
    
    /**
     * 心跳间隔（毫秒）
     */
    heartbeatInterval: number;
  };
  
  /**
   * 服务端指令
   */
  instructions?: {
    /**
     * 客户端应执行的动作
     */
    action: 'wait_for_recovery' | 'resubscribe' | 'upgrade_client' | 'none';
    
    /**
     * 动作说明
     */
    message?: string;
    
    /**
     * 额外参数
     */
    params?: Record<string, any>;
  };
}

/**
 * 数据补发消息格式
 */
export interface RecoveryDataMessage {
  /**
   * 消息类型
   */
  type: 'recovery';
  
  /**
   * 补发的数据
   */
  data: any[];
  
  /**
   * 补发元数据
   */
  metadata: {
    /**
     * 当前批次号
     */
    recoveryBatch: number;
    
    /**
     * 总批次数
     */
    totalBatches: number;
    
    /**
     * 补发时间戳
     */
    timestamp: number;
    
    /**
     * 数据时间范围
     */
    timeRange?: {
      from: number;
      to: number;
    };
    
    /**
     * 是否为最后一批
     */
    isLastBatch?: boolean;
  };
}

/**
 * 补发失败通知
 */
export interface RecoveryFailureMessage {
  /**
   * 消息类型
   */
  type: 'recovery_failed';
  
  /**
   * 错误信息
   */
  message: string;
  
  /**
   * 影响的符号
   */
  symbols: string[];
  
  /**
   * 建议的客户端动作
   */
  action: 'resubscribe' | 'retry_later' | 'contact_support';
  
  /**
   * 时间戳
   */
  timestamp: number;
  
  /**
   * 错误详情
   */
  error?: {
    code: string;
    details?: any;
  };
}

/**
 * 重连状态枚举
 */
export enum ReconnectState {
  /**
   * 初始化重连
   */
  INITIALIZING = 'initializing',
  
  /**
   * 验证客户端
   */
  VALIDATING = 'validating',
  
  /**
   * 恢复订阅
   */
  RESTORING_SUBSCRIPTIONS = 'restoring_subscriptions',
  
  /**
   * 补发数据中
   */
  RECOVERING_DATA = 'recovering_data',
  
  /**
   * 重连完成
   */
  CONNECTED = 'connected',
  
  /**
   * 重连失败
   */
  FAILED = 'failed',
}

/**
 * 重连事件
 */
export interface ReconnectEvent {
  /**
   * 事件类型
   */
  type: 'state_change' | 'progress' | 'error' | 'complete';
  
  /**
   * 客户端ID
   */
  clientId: string;
  
  /**
   * 当前状态
   */
  state: ReconnectState;
  
  /**
   * 前一个状态
   */
  previousState?: ReconnectState;
  
  /**
   * 进度信息（如果applicable）
   */
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
  
  /**
   * 错误信息（如果有）
   */
  error?: {
    message: string;
    code?: string;
  };
  
  /**
   * 时间戳
   */
  timestamp: number;
}

/**
 * 重连策略配置
 */
export interface ReconnectStrategyConfig {
  /**
   * 最大重连尝试次数
   */
  maxAttempts: number;
  
  /**
   * 重连延迟策略
   */
  delayStrategy: {
    /**
     * 策略类型
     */
    type: 'fixed' | 'exponential' | 'linear';
    
    /**
     * 初始延迟（毫秒）
     */
    initialDelay: number;
    
    /**
     * 最大延迟（毫秒）
     */
    maxDelay: number;
    
    /**
     * 延迟因子（用于exponential）
     */
    factor?: number;
  };
  
  /**
   * 补发数据的最大时间窗口（毫秒）
   */
  maxRecoveryWindow: number;
  
  /**
   * 是否在重连时自动恢复订阅
   */
  autoRestoreSubscriptions: boolean;
  
  /**
   * 是否自动补发丢失的数据
   */
  autoRecoverData: boolean;
  
  /**
   * 补发数据的优先级
   */
  recoveryPriority: 'high' | 'normal' | 'low';
  
  /**
   * 心跳超时时间（毫秒）
   */
  heartbeatTimeout: number;
}