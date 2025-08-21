import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createLogger } from '@common/config/logger.config';
import { SymbolTransformerService } from '../../../02-processing/symbol-transformer/services/symbol-transformer.service';
import { DataTransformerService } from '../../../02-processing/transformer/services/data-transformer.service';
import { StreamDataFetcherService } from '../../../03-fetching/stream-data-fetcher/services/stream-data-fetcher.service';
import { StreamRecoveryWorkerService, RecoveryJob } from '../../../03-fetching/stream-data-fetcher/services/stream-recovery-worker.service';
import { 
  ClientReconnectRequest, 
  ClientReconnectResponse 
} from '../../../03-fetching/stream-data-fetcher/interfaces';
import { StreamSubscribeDto } from '../dto/stream-subscribe.dto';
import { StreamUnsubscribeDto } from '../dto/stream-unsubscribe.dto';
import { DataTransformRequestDto } from '../../../02-processing/transformer/dto/data-transform-request.dto';
import { StreamConnection, StreamConnectionParams } from '../../../03-fetching/stream-data-fetcher/interfaces';
import { Subject } from 'rxjs';
import { MetricsRegistryService } from '../../../../monitoring/metrics/services/metrics-registry.service';
import { bufferTime, filter, mergeMap } from 'rxjs/operators';

/**
 * 批量处理的报价数据
 */
interface QuoteData {
  rawData: any;
  providerName: string;
  wsCapabilityType: string;
  timestamp: number;
  symbols: string[];
}

/**
 * 增强的流连接上下文接口
 */
interface StreamConnectionContext {
  // 基础信息
  requestId: string;
  provider: string;
  capability: string;
  clientId: string;
  
  // 市场和符号信息
  market: string;
  symbolsCount: number;
  marketDistribution: Record<string, number>;
  
  // 配置信息
  connectionConfig: {
    autoReconnect: boolean;
    maxReconnectAttempts: number;
    heartbeatIntervalMs: number;
    connectionTimeoutMs: number;
  };
  
  metricsConfig: {
    enableLatencyTracking: boolean;
    enableThroughputTracking: boolean;
    metricsPrefix: string;
  };
  
  errorHandling: {
    retryPolicy: string;
    maxRetries: number;
    circuitBreakerEnabled: boolean;
  };
  
  // 会话信息
  session: {
    createdAt: number;
    version: string;
    protocol: string;
    compression: string;
  };
  
  // 扩展字段
  extensions: Record<string, any>;
}

/**
 * StreamReceiver - 重构后的流数据接收器
 * 
 * 🎯 核心职责 (重构后精简)：
 * - 流数据订阅和取消订阅协调
 * - 数据路由和分发
 * - 与 StreamDataFetcher 集成的连接管理
 * - 数据缓存策略协调
 * 
 * ❌ 不再负责：
 * - 直接的 WebSocket 连接管理 (由 StreamDataFetcher 负责)
 * - 本地数据缓存 (由 StreamDataCacheService 负责)
 * - 直接的数据转换 (统一由 DataTransformerService 负责)
 * - 客户端状态跟踪 (由 StreamClientStateManager 负责)
 * 
 * 🔗 Pipeline 位置：WebSocket → **StreamReceiver** → StreamDataFetcher → Transformer → Storage
 */
@Injectable()
export class StreamReceiverService implements OnModuleDestroy {
  private readonly logger = createLogger('StreamReceiver');
  
  // ✅ 活跃的流连接管理 - provider:capability -> StreamConnection (已修复内存泄漏)
  private readonly activeConnections = new Map<string, StreamConnection>();
  
  // 连接清理配置 - 防止内存泄漏
  private readonly CONNECTION_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5分钟
  private readonly MAX_CONNECTIONS = 1000; // 连接数上限
  private readonly CONNECTION_STALE_TIMEOUT = 10 * 60 * 1000; // 10分钟超时
  private cleanupTimer?: NodeJS.Timeout; // 清理定时器
  
  // 🎯 RxJS 批量处理管道
  private readonly quoteBatchSubject = new Subject<QuoteData>();
  
  // 🔒 并发安全的批量处理统计 - 使用互斥锁保护
  private batchProcessingStats = {
    totalBatches: 0,
    totalQuotes: 0,
    batchProcessingTime: 0,
  };
  private readonly statsLock = new Map<string, Promise<void>>(); // 简单的锁机制
  
  // 🔄 错误恢复和重试配置
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_BASE = 1000; // 1秒基础延迟
  private readonly CIRCUIT_BREAKER_THRESHOLD = 50; // 50%失败率阈值
  private readonly CIRCUIT_BREAKER_RESET_TIMEOUT = 30000; // 30秒重置时间
  private circuitBreakerState = {
    failures: 0,
    successes: 0,
    lastFailureTime: 0,
    isOpen: false,
  };

  constructor(
    // ✅ Phase 4 精简依赖注入 - 已移除unused SymbolMapperService，现在4个核心依赖 + 2个可选依赖
    private readonly symbolTransformerService: SymbolTransformerService, // 🆕 新增SymbolTransformer依赖
    private readonly dataTransformerService: DataTransformerService,
    private readonly streamDataFetcher: StreamDataFetcherService,
    private readonly recoveryWorker?: StreamRecoveryWorkerService, // Phase 3 可选依赖
    private readonly metricsRegistry?: MetricsRegistryService, // Phase 4 可选监控依赖
  ) {
    this.logger.log('StreamReceiver Phase 4 重构完成 - 精简依赖架构 + 延迟监控 + 连接清理');
    this.initializeBatchProcessing();
    this.setupSubscriptionChangeListener();
    this.initializeConnectionCleanup(); // ✅ 初始化连接清理机制
  }

  /**
   * 🎯 订阅流数据 - 重构后的核心方法 (Gateway模式)
   * @param subscribeDto 订阅请求
   * @param clientId WebSocket客户端ID (从Socket.IO获取)
   */
  async subscribeStream(
    subscribeDto: StreamSubscribeDto,
    clientId?: string
  ): Promise<void> {
    const { symbols, wsCapabilityType, preferredProvider } = subscribeDto;
    // ✅ Phase 3 - P2: 使用传入的clientId或生成唯一ID作为回退
    const resolvedClientId = clientId || `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const providerName = preferredProvider || this.getDefaultProvider(symbols);
    const requestId = `request_${Date.now()}`;
    
    this.logger.log('开始订阅流数据', {
      clientId: resolvedClientId,
      symbolsCount: symbols.length,
      capability: wsCapabilityType,
      provider: providerName,
      requestId,
      contextSource: clientId ? 'websocket' : 'generated',
    });

    try {
      // 1. 符号映射
      const mappedSymbols = await this.mapSymbols(symbols, providerName);
      
      // 2. 更新客户端状态
      this.streamDataFetcher.getClientStateManager().addClientSubscription(
        resolvedClientId,
        mappedSymbols,
        wsCapabilityType,
        providerName
      );

      // 3. 获取或创建流连接
      const connection = await this.getOrCreateConnection(
        providerName,
        wsCapabilityType,
        requestId,
        symbols,
        resolvedClientId
      );

      // 4. 订阅符号到流连接
      await this.streamDataFetcher.subscribeToSymbols(connection, mappedSymbols);

      // 5. 设置数据接收处理
      this.setupDataReceiving(connection, providerName, wsCapabilityType);

      this.logger.log('流数据订阅成功', {
        clientId: resolvedClientId,
        symbolsCount: mappedSymbols.length,
        connectionId: connection.id,
      });

    } catch (error) {
      this.logger.error('流数据订阅失败', {
        clientId: resolvedClientId,
        error: error.message,
        requestId,
      });
      throw error;
    }
  }

  /**
   * 🎯 取消订阅流数据
   * @param unsubscribeDto 取消订阅请求
   * @param clientId WebSocket客户端ID (从Socket.IO获取)
   */
  async unsubscribeStream(unsubscribeDto: StreamUnsubscribeDto, clientId?: string): Promise<void> {
    const { symbols } = unsubscribeDto;
    // ✅ Phase 3 - P2: 使用传入的clientId，如果没有则记录警告
    if (!clientId) {
      this.logger.warn('取消订阅缺少clientId，无法精确定位客户端订阅', {
        symbolsCount: symbols?.length || 0,
        fallbackBehavior: 'skip_operation',
      });
      return;
    }

    this.logger.log('开始取消订阅流数据', {
      clientId,
      symbolsCount: symbols?.length || 0,
      contextSource: 'websocket',
    });

    try {
      // 获取客户端当前订阅信息
      const clientSub = this.streamDataFetcher.getClientStateManager().getClientSubscription(clientId);
      if (!clientSub) {
        this.logger.warn('客户端订阅不存在', { clientId });
        return;
      }

      // 获取要取消订阅的符号
      const symbolsToUnsubscribe = symbols && symbols.length > 0 
        ? symbols 
        : this.streamDataFetcher.getClientStateManager().getClientSymbols(clientId);

      if (symbolsToUnsubscribe.length === 0) {
        this.logger.warn('没有需要取消订阅的符号', { clientId });
        return;
      }

      // 映射符号
      const mappedSymbols = await this.mapSymbols(symbolsToUnsubscribe, clientSub.providerName);

      // 获取连接
      const connectionKey = `${clientSub.providerName}:${clientSub.wsCapabilityType}`;
      const connection = this.activeConnections.get(connectionKey);

      if (connection) {
        // 从流连接取消订阅
        await this.streamDataFetcher.unsubscribeFromSymbols(connection, mappedSymbols);
      }

      // 更新客户端状态
      this.streamDataFetcher.getClientStateManager().removeClientSubscription(clientId, symbolsToUnsubscribe);

      this.logger.log('流数据取消订阅成功', {
        clientId,
        symbolsCount: mappedSymbols.length,
      });

    } catch (error) {
      this.logger.error('流数据取消订阅失败', {
        clientId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 处理客户端重连 - Phase 3 重连协议实现
   */
  async handleClientReconnect(
    reconnectRequest: ClientReconnectRequest
  ): Promise<ClientReconnectResponse> {
    const {
      clientId,
      lastReceiveTimestamp,
      symbols,
      wsCapabilityType,
      preferredProvider,
      reason,
    } = reconnectRequest;
    
    const providerName = preferredProvider || this.getDefaultProvider(symbols);
    const requestId = `reconnect_${Date.now()}`;
    
    this.logger.log('客户端重连请求', {
      clientId,
      reason,
      symbolsCount: symbols.length,
      timeSinceLastReceive: Date.now() - lastReceiveTimestamp,
    });
    
    try {
      // 1. 验证lastReceiveTimestamp
      if (!lastReceiveTimestamp || lastReceiveTimestamp > Date.now()) {
        throw new Error('Invalid lastReceiveTimestamp');
      }
      
      // 2. 映射符号
      const mappedSymbols = await this.mapSymbols(symbols, providerName);
      const rejectedSymbols: Array<{ symbol: string; reason: string }> = [];
      
      // 检查映射失败的符号
      symbols.forEach((symbol, index) => {
        if (!mappedSymbols[index] || mappedSymbols[index] === symbol) {
          rejectedSymbols.push({
            symbol,
            reason: '符号映射失败',
          });
        }
      });
      
      const confirmedSymbols = mappedSymbols.filter(s => 
        !rejectedSymbols.find(r => r.symbol === s)
      );
      
      // 3. 恢复客户端订阅 (已移除messageCallback wrapper)
      this.streamDataFetcher.getClientStateManager().addClientSubscription(
        clientId,
        confirmedSymbols,
        wsCapabilityType,
        providerName
      );
      
      // 4. 获取或创建连接
      const connection = await this.getOrCreateConnection(
        providerName,
        wsCapabilityType,
        requestId,
        symbols,
        clientId
      );
      
      // 5. 订阅符号
      await this.streamDataFetcher.subscribeToSymbols(connection, confirmedSymbols);
      
      // 6. 判断是否需要补发数据
      const timeDiff = Date.now() - lastReceiveTimestamp;
      const maxRecoveryWindow = 300000; // 5分钟
      
      let recoveryJobId: string | undefined;
      const willRecover = timeDiff <= maxRecoveryWindow && confirmedSymbols.length > 0;
      
      if (willRecover && this.recoveryWorker) {
        // 提交补发任务
        const recoveryJob: RecoveryJob = {
          clientId,
          symbols: confirmedSymbols,
          lastReceiveTimestamp,
          provider: providerName,
          capability: wsCapabilityType,
          priority: reason === 'network_error' ? 'high' : 'normal',
        };
        
        recoveryJobId = await this.recoveryWorker.submitRecoveryJob(recoveryJob);
        
        this.logger.log('补发任务已提交', {
          clientId,
          jobId: recoveryJobId,
          symbolsCount: confirmedSymbols.length,
        });
      }
      
      // 7. 构建响应
      const response: ClientReconnectResponse = {
        success: true,
        clientId,
        confirmedSymbols,
        rejectedSymbols: rejectedSymbols.length > 0 ? rejectedSymbols : undefined,
        recoveryStrategy: {
          willRecover,
          timeRange: willRecover ? {
            from: lastReceiveTimestamp,
            to: Date.now(),
          } : undefined,
          recoveryJobId,
        },
        connectionInfo: {
          provider: providerName,
          connectionId: connection.id,
          serverTimestamp: Date.now(),
          heartbeatInterval: 30000,
        },
        instructions: {
          action: willRecover ? 'wait_for_recovery' : 'none',
          message: willRecover 
            ? '正在恢复历史数据，请等待' 
            : '已重新连接，开始接收实时数据',
        },
      };
      
      this.logger.log('客户端重连成功', {
        clientId,
        confirmedSymbolsCount: confirmedSymbols.length,
        willRecover,
        recoveryJobId,
      });
      
      return response;
      
    } catch (error) {
      this.logger.error('客户端重连失败', {
        clientId,
        error: error.message,
      });
      
      return {
        success: false,
        clientId,
        confirmedSymbols: [],
        recoveryStrategy: {
          willRecover: false,
        },
        connectionInfo: {
          provider: providerName,
          connectionId: '',
          serverTimestamp: Date.now(),
          heartbeatInterval: 30000,
        },
        instructions: {
          action: 'resubscribe',
          message: '重连失败，请重新订阅',
        },
      };
    }
  }

  /**
   * 主动断线检测 - Phase 3 Critical Fix
   * 检测连接异常并触发重连流程
   */
  detectReconnection(): void {
    // 获取所有活跃客户端
    const allClients = this.streamDataFetcher.getClientStateManager().getClientStateStats();
    const now = Date.now();
    const heartbeatTimeout = 60000; // 60秒心跳超时
    
    this.logger.debug('开始断线检测', {
      totalClients: allClients.totalClients,
      checkTime: now,
    });
    
    // 遍历所有提供商检查连接状态
    if (allClients.providerBreakdown) {
      Object.keys(allClients.providerBreakdown).forEach(provider => {
        // 检查提供商连接状态
        this.checkProviderConnections(provider);
      });
    }
    
    // 检查客户端最后活跃时间
    this.checkClientHeartbeat(heartbeatTimeout);
  }
  
  /**
   * 检查提供商连接状态
   */
  private checkProviderConnections(provider: string): void {
    // 获取该提供商的所有连接
    const connectionStats = this.streamDataFetcher.getConnectionStatsByProvider();
    const providerStats = connectionStats[provider];
    
    if (!providerStats || providerStats.connections === 0) {
      this.logger.warn('检测到提供商连接断开', {
        provider,
        stats: providerStats,
      });
      
      // 触发该提供商下所有客户端的重连
      this.triggerProviderReconnection(provider);
    }
  }
  
  /**
   * 检查客户端心跳超时
   */
  private checkClientHeartbeat(timeoutMs: number): void {
    const now = Date.now();
    
    // 这里需要遍历所有客户端，检查最后活跃时间
    // 由于 ClientStateManager 没有提供遍历所有客户端的方法，我们需要扩展它
    this.logger.debug('检查客户端心跳', {
      timeoutThreshold: timeoutMs,
      currentTime: now,
    });
    
    // TODO: 需要在 ClientStateManager 中添加 getAllClients() 方法
    // 暂时通过订阅变更监听来跟踪断线客户端
  }
  
  /**
   * 触发提供商重连
   */
  private triggerProviderReconnection(provider: string): void {
    this.logger.log('触发提供商重连', { provider });
    
    // 获取该提供商下的所有客户端 - 需要扩展 ClientStateManager
    // 暂时记录事件，等待 ClientStateManager 扩展
    this.logger.warn('提供商重连触发完成', { 
      provider,
      note: '需要 ClientStateManager 支持按提供商查询客户端',
    });
  }
  
  /**
   * 手动触发客户端重连检查 - 供外部调用
   */
  async handleReconnection(clientId: string, reason: string = 'manual_check'): Promise<void> {
    this.logger.log('手动触发重连检查', { clientId, reason });
    
    try {
      const clientInfo = this.streamDataFetcher.getClientStateManager().getClientSubscription(clientId);
      
      if (!clientInfo) {
        this.logger.warn('客户端不存在，跳过重连检查', { clientId });
        return;
      }
      
      // 检查连接是否活跃
      const connectionKey = `${clientInfo.providerName}:${clientInfo.wsCapabilityType}`;
      const connection = this.activeConnections.get(connectionKey);
      const isActive = connection ? this.streamDataFetcher.isConnectionActive(connection) : false;
      
      if (!isActive) {
        this.logger.warn('检测到连接不活跃，调度补发任务', {
          clientId,
          provider: clientInfo.providerName,
          capability: clientInfo.wsCapabilityType,
        });
        
        // 调用 scheduleRecovery (需要在 Worker 中实现)
        if (this.recoveryWorker) {
          await this.scheduleRecoveryForClient(clientInfo, reason);
        } else {
          this.logger.error('Recovery Worker 不可用，无法调度补发', { clientId });
        }
      } else {
        this.logger.debug('连接正常，无需重连', { clientId });
      }
      
    } catch (error) {
      this.logger.error('重连检查失败', {
        clientId,
        error: error.message,
      });
    }
  }
  
  /**
   * 为特定客户端调度补发任务
   */
  private async scheduleRecoveryForClient(
    clientInfo: any,
    reason: string
  ): Promise<void> {
    const now = Date.now();
    const lastReceiveTimestamp = clientInfo.lastActiveTime || now - 60000; // 默认1分钟前
    
    const recoveryJob: RecoveryJob = {
      clientId: clientInfo.clientId,
      symbols: Array.from(clientInfo.symbols) as string[],
      lastReceiveTimestamp,
      provider: clientInfo.providerName,
      capability: clientInfo.wsCapabilityType,
      priority: reason === 'network_error' ? 'high' : 'normal',
    };
    
    try {
      // 调用 Worker 的 submitRecoveryJob 方法
      const jobId = await this.recoveryWorker!.submitRecoveryJob(recoveryJob);
      
      this.logger.log('补发任务调度成功', {
        clientId: clientInfo.clientId,
        jobId,
        reason,
      });
      
    } catch (error) {
      this.logger.error('补发任务调度失败', {
        clientId: clientInfo.clientId,
        error: error.message,
        reason,
      });
      
      // 调度失败时的回退策略：提示客户端重新订阅
      await this.notifyClientResubscribe(clientInfo.clientId, error.message);
    }
  }
  
  /**
   * 通知客户端重新订阅 (调度失败时的回退)
   */
  private async notifyClientResubscribe(clientId: string, errorMessage: string): Promise<void> {
    const clientInfo = this.streamDataFetcher.getClientStateManager().getClientSubscription(clientId);
    
    if (clientInfo) {
      try {
        // messageCallback功能已移除，改为通过其他方式通知客户端
        // 例如：通过WebSocket直接发送消息或者通过事件系统
        
        this.logger.log('需要通知客户端重新订阅', { 
          clientId, 
          error: errorMessage,
          message: '数据恢复失败，请重新订阅'
        });
        
      } catch (error) {
        this.logger.error('通知客户端重新订阅失败', {
          clientId,
          error: error.message,
        });
      }
    }
  }

  /**
   * 获取客户端统计信息
   */
  getClientStats() {
    const clientStats = this.streamDataFetcher.getClientStateManager().getClientStateStats();
    const cacheStats = this.streamDataFetcher.getStreamDataCache().getCacheStats();
    const connectionStats = this.streamDataFetcher.getConnectionStatsByProvider();

    return {
      clients: clientStats,
      cache: cacheStats,
      connections: connectionStats,
      batchProcessing: this.batchProcessingStats,
    };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ 
    status: string; 
    connections: number; 
    clients: number; 
    cacheHitRate: number 
  }> {
    const stats = this.getClientStats();
    const connectionHealth = await this.streamDataFetcher.batchHealthCheck();
    const healthyConnections = Object.values(connectionHealth).filter(Boolean).length;
    const totalConnections = Object.keys(connectionHealth).length;

    const cacheHitRate = stats.cache.hotCacheHits + stats.cache.warmCacheHits > 0
      ? (stats.cache.hotCacheHits + stats.cache.warmCacheHits) / 
        (stats.cache.hotCacheHits + stats.cache.warmCacheHits + 
         stats.cache.hotCacheMisses + stats.cache.warmCacheMisses)
      : 0;

    return {
      status: healthyConnections === totalConnections ? 'healthy' : 'degraded',
      connections: totalConnections,
      clients: stats.clients.totalClients,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
    };
  }

  // === 私有方法 ===

  /**
   * 符号映射
   */
  private async mapSymbols(symbols: string[], providerName: string): Promise<string[]> {
    try {
      // 🎯 优化：一次性批量转换，充分利用三层缓存
      const transformResult = await this.symbolTransformerService.transformSymbols(
        providerName,
        symbols,        // 批量输入所有符号
        'to_standard'   // 明确转换方向
      );

      // 构建结果，保持顺序一致性
      return symbols.map(symbol => 
        transformResult.mappingDetails[symbol] || symbol
      );
    } catch (error) {
      this.logger.warn('批量符号映射失败，降级处理', {
        provider: providerName,
        symbolsCount: symbols.length,
        error: error.message,
      });
      return symbols; // 安全降级
    }
  }

  /**
   * 确保符号一致性：用于管道处理时的端到端标准化
   */
  private async ensureSymbolConsistency(symbols: string[], provider: string): Promise<string[]> {
    try {
      const result = await this.symbolTransformerService.transformSymbols(
        provider, symbols, 'to_standard'
      );
      return symbols.map(symbol => result.mappingDetails[symbol] || symbol);
    } catch (error) {
      this.logger.warn('符号标准化失败，使用原始符号', { 
        provider, 
        symbols, 
        error: error.message 
      });
      return symbols;
    }
  }

  /**
   * 获取或创建流连接
   */
  private async getOrCreateConnection(
    provider: string,
    capability: string,
    requestId: string,
    symbols: string[],
    clientId: string
  ): Promise<StreamConnection> {
    const connectionKey = `${provider}:${capability}`;
    
    // 检查现有连接
    let connection = this.activeConnections.get(connectionKey);
    if (connection && this.streamDataFetcher.isConnectionActive(connection)) {
      return connection;
    }

    // 创建新连接
    const connectionParams: StreamConnectionParams = {
      provider,
      capability,
      // 🎯 修复：使用增强的上下文服务
      contextService: this.buildEnhancedContextService(requestId, provider, symbols, capability, clientId),
      requestId,
      options: {
        autoReconnect: true,
        maxReconnectAttempts: 3,
        heartbeatIntervalMs: 30000,
      },
    };

    connection = await this.streamDataFetcher.establishStreamConnection(connectionParams);
    this.activeConnections.set(connectionKey, connection);

    this.logger.log('新流连接已创建', {
      connectionId: connection.id,
      provider,
      capability,
    });

    return connection;
  }

  /**
   * 设置数据接收处理
   */
  private setupDataReceiving(
    connection: StreamConnection,
    provider: string,
    capability: string
  ): void {
    // 设置数据接收回调
    connection.onData((rawData) => {
      this.handleIncomingData(rawData, provider, capability);
    });

    // 设置错误处理
    connection.onError((error) => {
      this.logger.error('流连接错误', {
        connectionId: connection.id,
        provider,
        capability,
        error: error.message,
      });
    });

    // 设置状态变化处理
    connection.onStatusChange((status) => {
      this.logger.debug('流连接状态变化', {
        connectionId: connection.id,
        provider,
        capability,
        status,
      });
    });
  }

  /**
   * 处理接收到的数据
   */
  private handleIncomingData(rawData: any, provider: string, capability: string): void {
    try {
      // 提取符号信息
      const symbols = this.extractSymbolsFromData(rawData);
      
      // 推送到批量处理管道
      this.quoteBatchSubject.next({
        rawData,
        providerName: provider,
        wsCapabilityType: capability,
        timestamp: Date.now(),
        symbols,
      });

    } catch (error) {
      this.logger.error('数据处理失败', {
        provider,
        capability,
        error: error.message,
      });
    }
  }

  /**
   * 从数据中提取符号
   */
  private extractSymbolsFromData(data: any): string[] {
    if (!data) return [];
    
    // 处理不同的数据格式
    if (data.symbol) return [data.symbol];
    if (data.symbols && Array.isArray(data.symbols)) return data.symbols;
    if (data.quote && data.quote.symbol) return [data.quote.symbol];
    if (Array.isArray(data)) {
      return data.map(item => item.symbol || item.s).filter(Boolean);
    }
    
    return [];
  }

  /**
   * 初始化批量处理管道
   */
  private initializeBatchProcessing(): void {
    this.quoteBatchSubject
      .pipe(
        // 🎯 修复：固定50ms窗口 + 200条缓冲上限，严格满足SLA且内存安全
        bufferTime(50, undefined, 200),
        filter(batch => batch.length > 0),
        mergeMap(async (batch) => this.processBatch(batch))
      )
      .subscribe({
        next: () => {
          // 处理成功
        },
        error: (error) => {
          this.logger.error('批量处理管道错误', { error: error.message });
        }
      });
  }

  /**
   * 🔄 处理批量数据 - 增强版本，包含重试和降级策略
   */
  private async processBatch(batch: QuoteData[]): Promise<void> {
    // 使用带重试和降级的增强处理方法
    await this.processBatchWithRecovery(batch);
  }

  /**
   * 按提供商和能力分组批量数据
   */
  private groupBatchByProviderCapability(batch: QuoteData[]): Record<string, QuoteData[]> {
    const groups: Record<string, QuoteData[]> = {};
    
    batch.forEach(quote => {
      const key = `${quote.providerName}:${quote.wsCapabilityType}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(quote);
    });

    return groups;
  }

  /**
   * 处理报价组 - 重构为使用统一管道
   */
  private async processQuoteGroup(quotes: QuoteData[], provider: string, capability: string): Promise<void> {
    try {
      // 使用统一的管道化数据处理
      await this.processDataThroughPipeline(quotes, provider, capability);

    } catch (error) {
      this.logger.error('报价组处理失败', {
        provider,
        capability,
        quotesCount: quotes.length,
        error: error.message,
      });
    }
  }

  /**
   * 🎯 统一的管道化数据处理 - Phase 4 核心重构
   * 
   * 数据流向：RawData → Transform → Cache → Broadcast
   * - 仅通过 DataTransformerService 进行数据转换
   * - 统一的错误处理和性能监控
   * - 支持延迟监控埋点
   */
  private async processDataThroughPipeline(
    quotes: QuoteData[], 
    provider: string, 
    capability: string
  ): Promise<void> {
    const pipelineStartTime = Date.now();
    
    try {
      this.logger.debug('开始管道化数据处理', {
        provider,
        capability,
        quotesCount: quotes.length,
        pipelineId: `${provider}_${capability}_${pipelineStartTime}`,
      });

      // Step 1: 数据转换 - 仅通过 DataTransformerService
      const transformStartTime = Date.now();
      const dataTransformRequestDto: DataTransformRequestDto = {
        provider: provider,
        apiType: 'stream' as const,
        // ✅ Phase 3 - P3: 替换脆弱的字符串替换，使用健壮的能力映射
        transDataRuleListType: this.mapCapabilityToTransformRuleType(capability),
        rawData: quotes.map(q => q.rawData),
      };

      const transformedData = await this.dataTransformerService.transform(dataTransformRequestDto);
      const transformDuration = Date.now() - transformStartTime;

      if (!transformedData?.transformedData) {
        this.logger.warn('数据转换返回空结果', {
          provider,
          capability,
          quotesCount: quotes.length,
        });
        return;
      }

      // Step 2: 标准化转换结果
      const dataArray = Array.isArray(transformedData.transformedData) 
        ? transformedData.transformedData 
        : [transformedData.transformedData];

      // Step 3: 提取符号信息
      const symbolsSet = new Set<string>();
      quotes.forEach(quote => {
        quote.symbols.forEach(symbol => symbolsSet.add(symbol));
      });
      const rawSymbols = Array.from(symbolsSet);
      
      // Step 3.5: 符号标准化（确保缓存键和广播键一致）
      const standardizedSymbols = await this.ensureSymbolConsistency(rawSymbols, provider);

      // Step 4: 使用标准化符号进行缓存
      const cacheStartTime = Date.now();
      await this.pipelineCacheData(dataArray, standardizedSymbols);
      const cacheDuration = Date.now() - cacheStartTime;

      // Step 5: 使用标准化符号进行广播
      const broadcastStartTime = Date.now();
      await this.pipelineBroadcastData(dataArray, standardizedSymbols);
      const broadcastDuration = Date.now() - broadcastStartTime;

      // Step 6: 性能监控埋点
      const totalDuration = Date.now() - pipelineStartTime;
      this.recordPipelineMetrics({
        provider,
        capability,
        quotesCount: quotes.length,
        symbolsCount: standardizedSymbols.length,
        durations: {
          total: totalDuration,
          transform: transformDuration,
          cache: cacheDuration,
          broadcast: broadcastDuration,
        },
      });

      this.logger.debug('管道化数据处理完成', {
        provider,
        capability,
        quotesCount: quotes.length,
        symbolsCount: standardizedSymbols.length,
        totalDuration,
        stages: {
          transform: transformDuration,
          cache: cacheDuration,
          broadcast: broadcastDuration,
        },
      });

    } catch (error) {
      const errorDuration = Date.now() - pipelineStartTime;
      
      this.logger.error('管道化数据处理失败', {
        provider,
        capability,
        quotesCount: quotes.length,
        error: error.message,
        duration: errorDuration,
      });
      
      // 记录错误指标
      this.recordPipelineError(provider, capability, error.message, errorDuration);
      
      throw error;
    }
  }
  
  /**
   * ✅ Phase 3 - P3: 健壮的能力映射 - 替换脆弱的字符串替换
   * 将WebSocket能力名称映射到TransformRequestDto所需的transDataRuleListType
   */
  private mapCapabilityToTransformRuleType(capability: string): string {
    // 标准化能力映射表 - 明确的键值对映射，避免字符串操作
    const capabilityMappingTable: Record<string, string> = {
      // WebSocket 流能力映射
      'ws-stock-quote': 'quote_fields',
      'ws-option-quote': 'option_fields', 
      'ws-futures-quote': 'futures_fields',
      'ws-forex-quote': 'forex_fields',
      'ws-crypto-quote': 'crypto_fields',
      
      // REST API 能力映射
      'get-stock-quote': 'quote_fields',
      'get-option-quote': 'option_fields',
      'get-futures-quote': 'futures_fields',
      'get-forex-quote': 'forex_fields',
      'get-crypto-quote': 'crypto_fields',
      
      // 实时数据流能力
      'stream-stock-quote': 'quote_fields',
      'stream-option-quote': 'option_fields',
      'stream-market-data': 'market_data_fields',
      'stream-trading-data': 'trading_data_fields',
      
      // 基础信息能力
      'get-stock-info': 'basic_info_fields',
      'get-company-info': 'company_info_fields',
      'get-market-info': 'market_info_fields',
      
      // 历史数据能力
      'get-historical-data': 'historical_data_fields',
      'get-historical-quotes': 'quote_fields',
      
      // 新闻和公告能力
      'get-news': 'news_fields',
      'get-announcements': 'announcement_fields',
    };
    
    // 1. 直接查表映射
    const mappedRuleType = capabilityMappingTable[capability];
    if (mappedRuleType) {
      this.logger.debug('能力映射成功', {
        capability,
        mappedRuleType,
        method: 'direct_mapping',
      });
      return mappedRuleType;
    }
    
    // 2. 智能后缀分析 (作为回退机制)
    const intelligentMapping = this.intelligentCapabilityMapping(capability);
    if (intelligentMapping) {
      this.logger.debug('智能能力映射成功', {
        capability,
        mappedRuleType: intelligentMapping,
        method: 'intelligent_analysis',
      });
      return intelligentMapping;
    }
    
    // 3. 兜底策略：基于关键词的推断
    const fallbackMapping = this.fallbackCapabilityMapping(capability);
    
    this.logger.warn('使用兜底能力映射', {
      capability,
      mappedRuleType: fallbackMapping,
      method: 'fallback_inference',
      warning: '建议在 capabilityMappingTable 中添加明确映射',
    });
    
    return fallbackMapping;
  }
  
  /**
   * 智能能力映射 - 基于模式识别的后缀分析
   */
  private intelligentCapabilityMapping(capability: string): string | null {
    const lowerCapability = capability.toLowerCase();
    
    // 分析能力字符串的语义组件
    const semanticPatterns = [
      { pattern: /quote|price|ticker/, ruleType: 'quote_fields' },
      { pattern: /option|derivative/, ruleType: 'option_fields' },
      { pattern: /futures|forward/, ruleType: 'futures_fields' },
      { pattern: /forex|currency|fx/, ruleType: 'forex_fields' },
      { pattern: /crypto|digital/, ruleType: 'crypto_fields' },
      { pattern: /info|detail|basic/, ruleType: 'basic_info_fields' },
      { pattern: /company|profile/, ruleType: 'company_info_fields' },
      { pattern: /market|exchange/, ruleType: 'market_info_fields' },
      { pattern: /historical|history/, ruleType: 'historical_data_fields' },
      { pattern: /news|article/, ruleType: 'news_fields' },
      { pattern: /announcement|notice/, ruleType: 'announcement_fields' },
      { pattern: /trading|trade/, ruleType: 'trading_data_fields' },
    ];
    
    for (const { pattern, ruleType } of semanticPatterns) {
      if (pattern.test(lowerCapability)) {
        return ruleType;
      }
    }
    
    return null;
  }
  
  /**
   * 兜底能力映射 - 最后的推断机制
   */
  private fallbackCapabilityMapping(capability: string): string {
    const lowerCapability = capability.toLowerCase();
    
    // 基于协议类型的推断
    if (lowerCapability.startsWith('ws-') || lowerCapability.includes('stream')) {
      return 'quote_fields'; // WebSocket默认为报价数据
    }
    
    if (lowerCapability.startsWith('get-') || lowerCapability.includes('rest')) {
      return 'basic_info_fields'; // REST默认为基础信息
    }
    
    // 最终兜底 - 基于最常见的数据类型
    return 'quote_fields';
  }

  /**
   * 管道化数据缓存
   */
  private async pipelineCacheData(transformedData: any[], symbols: string[]): Promise<void> {
    try {
      for (const symbol of symbols) {
        const symbolData = transformedData.filter(item => 
          item.symbol === symbol || item.s === symbol
        );

        if (symbolData.length > 0) {
          const cacheKey = `quote:${symbol}`;
          await this.streamDataFetcher.getStreamDataCache().setData(cacheKey, symbolData, 'auto');
        }
      }
    } catch (error) {
      this.logger.error('管道化缓存失败', {
        symbolsCount: symbols.length,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 管道化数据广播
   */
  private async pipelineBroadcastData(transformedData: any[], symbols: string[]): Promise<void> {
    try {
      for (const symbol of symbols) {
        const symbolData = transformedData.filter(item => 
          item.symbol === symbol || item.s === symbol
        );

        if (symbolData.length > 0) {
          // 记录推送延迟埋点
          const pushStartTime = Date.now();
          
          this.streamDataFetcher.getClientStateManager().broadcastToSymbolViaGateway(symbol, {
            ...symbolData,
            _metadata: {
              pushTimestamp: pushStartTime,
              symbol,
              provider: 'pipeline', // 标识来自管道处理
            },
          });
          
          const pushLatency = Date.now() - pushStartTime;
          this.recordStreamPushLatency(symbol, pushLatency);
        }
      }
    } catch (error) {
      this.logger.error('管道化广播失败', {
        symbolsCount: symbols.length,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 记录管道性能指标
   */
  private recordPipelineMetrics(metrics: {
    provider: string;
    capability: string;
    quotesCount: number;
    symbolsCount: number;
    durations: {
      total: number;
      transform: number;
      cache: number;
      broadcast: number;
    };
  }): void {
    // ✅ Removed duplicate accumulation - statistics are already accumulated in processBatch
    // Only record detailed performance metrics here
    
    // 详细阶段性能日志
    this.logger.debug('管道性能指标', {
      provider: metrics.provider,
      capability: metrics.capability,
      performance: {
        quotesPerSecond: Math.round((metrics.quotesCount / metrics.durations.total) * 1000),
        symbolsPerSecond: Math.round((metrics.symbolsCount / metrics.durations.total) * 1000),
        stageBreakdown: {
          transformPercent: Math.round((metrics.durations.transform / metrics.durations.total) * 100),
          cachePercent: Math.round((metrics.durations.cache / metrics.durations.total) * 100),
          broadcastPercent: Math.round((metrics.durations.broadcast / metrics.durations.total) * 100),
        },
      },
      notes: {
        message: 'Statistics already accumulated in processBatch - avoiding double counting',
        quotesCount: metrics.quotesCount,
        totalDuration: metrics.durations.total,
      },
    });
  }

  /**
   * 记录流数据推送延迟 - Phase 4 延迟监控埋点
   */
  private recordStreamPushLatency(symbol: string, latencyMs: number): void {
    // 分类延迟级别
    let latencyCategory: string;
    if (latencyMs <= 10) {
      latencyCategory = 'low'; // 0-10ms: 低延迟
    } else if (latencyMs <= 50) {
      latencyCategory = 'medium'; // 11-50ms: 中等延迟
    } else if (latencyMs <= 200) {
      latencyCategory = 'high'; // 51-200ms: 高延迟
    } else {
      latencyCategory = 'critical'; // 200ms+: 关键延迟
    }

    // 基础延迟日志
    if (latencyMs > 50) { // 超过50ms记录警告
      this.logger.warn('流数据推送延迟较高', {
        symbol,
        latencyMs,
        latencyCategory,
        threshold: 50,
      });
    } else if (latencyMs > 10) { // 超过10ms记录debug
      this.logger.debug('流数据推送延迟', {
        symbol,
        latencyMs,
        latencyCategory,
      });
    }

    // Phase 4 Critical: 集成 Prometheus 指标
    if (this.metricsRegistry) {
      try {
        // 提取提供商信息
        const provider = this.extractProviderFromSymbol(symbol);
        
        const market = this.inferMarketFromSymbol(symbol);
        
        // 🎯 修复：移除symbol高基数标签，使用聚合维度
        this.metricsRegistry.streamPushLatencyMs.observe(
          {
            provider: provider,          // 低基数：5个值
            market: market,             // 低基数：4个值 (HK/US/SH/SZ)
            latency_category: this.categorizeLatency(latencyMs), // 低基数：4个值
          },
          latencyMs
        );

        this.logger.debug('延迟指标已记录', {
          symbol,
          provider,
          latencyMs,
          latencyCategory,
          metric: 'stream_push_latency_ms',
        });

      } catch (error) {
        this.logger.warn('延迟指标记录失败', {
          symbol,
          latencyMs,
          error: error.message,
        });
      }
    } else {
      this.logger.debug('延迟指标服务不可用', {
        symbol,
        latencyMs,
        note: 'MetricsRegistry未注入',
      });
    }
  }

  /**
   * ✅ Phase 3 - P3: 智能提供商推断 - 基于能力注册表和市场支持
   * 替换简单的符号后缀匹配，使用更准确的提供商映射
   */
  private extractProviderFromSymbol(symbol: string): string {
    try {
      // 1. 首先通过符号格式推断市场
      const market = this.inferMarketFromSymbol(symbol);
      
      // 2. 查找支持该市场的最佳提供商 (如果可用的话)
      const optimalProvider = this.findOptimalProviderForMarket(market, symbol);
      if (optimalProvider) {
        this.logger.debug('基于能力注册表找到最佳提供商', {
          symbol,
          market,
          provider: optimalProvider,
          method: 'capability_registry',
        });
        return optimalProvider;
      }

      // 3. 回退到改进的启发式规则 (更准确的映射)
      const heuristicProvider = this.getProviderByHeuristics(symbol, market);
      
      this.logger.debug('使用改进启发式推断提供商', {
        symbol,
        market,
        provider: heuristicProvider,
        method: 'enhanced_heuristics',
      });
      
      return heuristicProvider;
      
    } catch (error) {
      this.logger.warn('提供商推断失败，使用默认提供商', {
        symbol,
        error: error.message,
        fallback: 'longport',
      });
      return 'longport'; // 安全的默认值
    }
  }
  
  /**
   * 从符号推断市场代码
   */
  private inferMarketFromSymbol(symbol: string): string {
    const upperSymbol = symbol.toUpperCase();
    
    // 港股市场
    if (upperSymbol.includes('.HK') || upperSymbol.includes('.HKG')) {
      return 'HK';
    }
    
    // 美股市场  
    if (upperSymbol.includes('.US') || upperSymbol.includes('.NASDAQ') || upperSymbol.includes('.NYSE')) {
      return 'US';
    }
    
    // A股市场
    if (upperSymbol.includes('.SZ') || upperSymbol.includes('.SH')) {
      return 'CN';
    }
    
    // 新加坡市场
    if (upperSymbol.includes('.SG') || upperSymbol.includes('.SGX')) {
      return 'SG';
    }
    
    // 基于符号模式推断 (无明确后缀的情况)
    if (/^[A-Z]{1,5}$/.test(upperSymbol)) {
      // 纯字母，可能是美股
      return 'US';
    }
    
    if (/^(00|30|60|68)\d{4}$/.test(upperSymbol)) {
      // 6位数字，以00/30/60/68开头，A股
      return 'CN';
    }
    
    if (/^\d{4,5}$/.test(upperSymbol)) {
      // 4-5位数字，可能是港股
      return 'HK';
    }
    
    return 'UNKNOWN';
  }

  /**
   * 延迟分类方法：将延迟时间归类为性能等级
   */
  private categorizeLatency(ms: number): string {
    if (ms <= 10) return 'excellent';
    if (ms <= 50) return 'good';
    if (ms <= 200) return 'acceptable';
    return 'poor';
  }

  /**
   * 获取默认Provider：第一阶段简版市场优先级策略
   */
  private getDefaultProvider(symbols: string[]): string {
    try {
      // 🎯 第一阶段：基于市场的简单优先级策略
      const marketDistribution = this.analyzeMarketDistribution(symbols);
      const primaryMarket = marketDistribution.primary;
      
      const provider = this.getProviderByMarketPriority(primaryMarket);
      
      this.logger.debug('Market-based provider selection', {
        primaryMarket,
        selectedProvider: provider,
        symbolsCount: symbols.length,
        method: 'market_priority_v1'
      });
      
      return provider;
      
    } catch (error) {
      this.logger.warn('Provider选择失败，使用默认', {
        error: error.message,
        fallback: 'longport'
      });
      return 'longport'; // 安全回退
    }
  }

  /**
   * 分析市场分布：找到占比最高的市场
   */
  private analyzeMarketDistribution(symbols: string[]): { primary: string; distribution: Record<string, number> } {
    const marketCounts: Record<string, number> = {};
    
    symbols.forEach(symbol => {
      const market = this.inferMarketFromSymbol(symbol);
      marketCounts[market] = (marketCounts[market] || 0) + 1;
    });
    
    // 找到占比最高的市场
    const sortedMarkets = Object.entries(marketCounts)
      .sort(([,a], [,b]) => b - a);
    
    return {
      primary: sortedMarkets[0]?.[0] || 'UNKNOWN',
      distribution: marketCounts
    };
  }

  /**
   * 基于市场优先级获取Provider
   */
  private getProviderByMarketPriority(market: string): string {
    const marketProviderPriority: Record<string, string> = {
      'HK': 'longport',    // 港股优先LongPort
      'US': 'longport',    // 美股优先LongPort  
      'CN': 'longport',    // A股优先LongPort
      'SG': 'longport',    // 新加坡优先LongPort
      'UNKNOWN': 'longport' // 未知市场默认LongPort
    };
    
    return marketProviderPriority[market] || 'longport';
  }

  /**
   * 构建增强的连接上下文服务
   */
  private buildEnhancedContextService(
    requestId: string, 
    provider: string, 
    symbols: string[], 
    capability: string,
    clientId: string
  ): StreamConnectionContext {
    const marketDistribution = this.analyzeMarketDistribution(symbols);
    const primaryMarket = marketDistribution.primary;
    
    return {
      // 基础信息
      requestId,
      provider,
      capability,
      clientId,
      
      // 市场和符号信息
      market: primaryMarket,
      symbolsCount: symbols.length,
      marketDistribution: marketDistribution.distribution,
      
      // 连接配置
      connectionConfig: {
        autoReconnect: true,
        maxReconnectAttempts: 3,
        heartbeatIntervalMs: 30000,
        connectionTimeoutMs: 10000,
      },
      
      // 性能监控配置
      metricsConfig: {
        enableLatencyTracking: true,
        enableThroughputTracking: true,
        metricsPrefix: `stream_${provider}_${capability}`,
      },
      
      // 错误处理配置
      errorHandling: {
        retryPolicy: 'exponential_backoff',
        maxRetries: 3,
        circuitBreakerEnabled: true,
      },
      
      // 会话信息
      session: {
        createdAt: Date.now(),
        version: '2.0',
        protocol: 'websocket',
        compression: 'gzip',
      },
      
      // 扩展字段 (为复杂SDK预留)
      extensions: {
        // 可以添加特定Provider需要的额外上下文
        // 例如：认证token、区域设置、特殊配置等
      }
    };
  }
  
  /**
   * 基于能力注册表查找最佳提供商
   */
  private findOptimalProviderForMarket(market: string, symbol: string): string | null {
    try {
      // 检查是否有 MetricsRegistry 注入的 EnhancedCapabilityRegistry
      // 由于目前没有直接注入，这里暂时返回 null，等待依赖注入扩展
      // TODO: 在构造函数中注入 EnhancedCapabilityRegistryService
      
      // 简化的能力查找逻辑 (等待注入)
      // const streamCapabilityName = 'ws-stock-quote'; // 假设的流能力名称
      
      // 临时实现：基于已知的市场-提供商映射
      const marketProviderMap: Record<string, string[]> = {
        'HK': ['longport', 'itick'],
        'US': ['longport', 'alpaca'],
        'CN': ['longport', 'tushare'],
        'SG': ['longport'],
        'UNKNOWN': ['longport'],
      };
      
      const candidateProviders = marketProviderMap[market] || ['longport'];
      
      // 返回第一个候选提供商 (优先级最高)
      return candidateProviders[0] || null;
      
    } catch (error) {
      this.logger.debug('能力注册表查询失败', {
        market,
        symbol,
        error: error.message,
      });
      return null;
    }
  }
  
  /**
   * 改进的启发式提供商推断
   */
  private getProviderByHeuristics(symbol: string, market: string): string {
    // 基于市场的提供商优先级映射
    const marketProviderPriority: Record<string, string[]> = {
      'HK': ['longport', 'itick'],          // 港股优先LongPort
      'US': ['longport', 'alpaca'],         // 美股优先LongPort  
      'CN': ['longport', 'tushare'],        // A股优先LongPort
      'SG': ['longport'],                   // 新加坡优先LongPort
      'UNKNOWN': ['longport'],              // 未知市场默认LongPort
    };
    
    // 特殊符号的自定义映射
    const symbolSpecificMapping: Record<string, string> = {
      // 可以在这里添加特定符号的提供商映射
      // 'AAPL.US': 'alpaca',
      // '00700.HK': 'longport',
    };
    
    // 1. 首先检查特定符号映射
    const specificProvider = symbolSpecificMapping[symbol.toUpperCase()];
    if (specificProvider) {
      return specificProvider;
    }
    
    // 2. 基于市场选择最佳提供商
    const priorityList = marketProviderPriority[market] || marketProviderPriority['UNKNOWN'];
    return priorityList[0];
  }

  /**
   * 记录管道错误指标
   */
  private recordPipelineError(provider: string, capability: string, errorMessage: string, duration: number): void {
    this.logger.error('管道处理错误指标', {
      provider,
      capability,
      errorType: this.classifyPipelineError(errorMessage),
      duration,
      error: errorMessage,
    });
  }

  /**
   * 分类管道错误类型
   */
  private classifyPipelineError(errorMessage: string): string {
    if (errorMessage.includes('transform')) return 'transform_error';
    if (errorMessage.includes('cache')) return 'cache_error';
    if (errorMessage.includes('broadcast')) return 'broadcast_error';
    if (errorMessage.includes('timeout')) return 'timeout_error';
    if (errorMessage.includes('network')) return 'network_error';
    return 'unknown_error';
  }



  /**
   * 初始化连接清理机制 - 防止内存泄漏
   */
  private initializeConnectionCleanup(): void {
    // 定期清理断开的连接
    this.cleanupTimer = setInterval(() => {
      this.cleanupStaleConnections();
    }, this.CONNECTION_CLEANUP_INTERVAL);

    this.logger.log('连接清理机制已初始化', {
      cleanupInterval: this.CONNECTION_CLEANUP_INTERVAL,
      maxConnections: this.MAX_CONNECTIONS,
      staleTimeout: this.CONNECTION_STALE_TIMEOUT,
    });
  }

  /**
   * 清理过期的连接
   */
  private cleanupStaleConnections(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [connectionId, connection] of this.activeConnections) {
      // 检查连接是否过期或已断开
      if (this.isConnectionStale(connection, now)) {
        this.activeConnections.delete(connectionId);
        cleanedCount++;
        this.logger.debug('清理过期连接', { connectionId });
      }
    }

    // 连接数上限保护
    if (this.activeConnections.size > this.MAX_CONNECTIONS) {
      this.enforceConnectionLimit();
    }

    if (cleanedCount > 0) {
      this.logger.log('连接清理完成', {
        cleanedCount,
        remainingConnections: this.activeConnections.size,
      });
    }
  }

  /**
   * 检查连接是否过期
   */
  private isConnectionStale(connection: StreamConnection, now: number = Date.now()): boolean {
    // 检查连接状态
    if (!connection.isConnected) {
      return true;
    }

    // 检查连接是否超时
    const lastActivity = connection.lastActiveAt || connection.createdAt;
    if (lastActivity && (now - lastActivity.getTime()) > this.CONNECTION_STALE_TIMEOUT) {
      return true;
    }

    return false;
  }

  /**
   * 强制执行连接数上限
   */
  private enforceConnectionLimit(): void {
    const connectionsArray = Array.from(this.activeConnections.entries());
    
    // 按最后活动时间排序，清理最老的连接
    connectionsArray.sort(([, a], [, b]) => {
      const aTime = a.lastActiveAt || a.createdAt;
      const bTime = b.lastActiveAt || b.createdAt;
      return (aTime?.getTime() || 0) - (bTime?.getTime() || 0);
    });

    // 移除超出上限的连接
    const toRemove = connectionsArray.slice(0, connectionsArray.length - this.MAX_CONNECTIONS);
    for (const [connectionId] of toRemove) {
      this.activeConnections.delete(connectionId);
    }

    this.logger.warn('强制执行连接数上限', {
      removedConnections: toRemove.length,
      currentConnections: this.activeConnections.size,
      maxConnections: this.MAX_CONNECTIONS,
    });
  }

  /**
   * 获取当前活跃连接数 (用于测试和监控)
   */
  getActiveConnectionsCount(): number {
    return this.activeConnections.size;
  }

  /**
   * 线程安全地更新批量处理统计 - 防止并发竞态条件
   */
  private async updateBatchStatsThreadSafe(batchSize: number, processingTime: number): Promise<void> {
    const lockKey = 'batchStats';
    
    // 等待之前的更新完成
    if (this.statsLock.has(lockKey)) {
      await this.statsLock.get(lockKey);
    }

    // 创建新的更新锁
    const updatePromise = new Promise<void>((resolve) => {
      // 原子性更新统计数据
      this.batchProcessingStats.totalBatches++;
      this.batchProcessingStats.totalQuotes += batchSize;
      this.batchProcessingStats.batchProcessingTime += processingTime;
      
      // 立即释放锁
      setImmediate(() => {
        this.statsLock.delete(lockKey);
        resolve();
      });
    });

    this.statsLock.set(lockKey, updatePromise);
    await updatePromise;
  }

  /**
   * 获取批量处理统计数据 (用于监控和测试)
   */
  getBatchProcessingStats(): { totalBatches: number; totalQuotes: number; batchProcessingTime: number } {
    // 返回副本以防止外部修改
    return { ...this.batchProcessingStats };
  }

  /**
   * 🔄 带重试和降级的批量处理 - 增强错误恢复能力
   */
  private async processBatchWithRecovery(batch: QuoteData[]): Promise<void> {
    // 检查断路器状态
    if (this.isCircuitBreakerOpen()) {
      this.logger.warn('断路器开启，跳过批量处理', { batchSize: batch.length });
      await this.fallbackProcessing(batch, 'circuit_breaker_open');
      return;
    }

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        await this.processBatchInternal(batch);
        
        // 成功处理，更新断路器状态
        this.recordCircuitBreakerSuccess();
        return;
        
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`批量处理失败，尝试 ${attempt}/${this.MAX_RETRY_ATTEMPTS}`, {
          batchSize: batch.length,
          attempt,
          error: error.message,
        });

        // 记录断路器失败
        this.recordCircuitBreakerFailure();

        // 如果不是最后一次尝试，等待后重试
        if (attempt < this.MAX_RETRY_ATTEMPTS) {
          await this.delay(this.calculateRetryDelay(attempt));
        }
      }
    }

    // 所有重试都失败，使用降级策略
    this.logger.error('批量处理所有重试失败，启用降级策略', {
      batchSize: batch.length,
      finalError: lastError?.message,
    });
    
    await this.fallbackProcessing(batch, lastError?.message || 'unknown_error');
  }

  /**
   * 内部批量处理逻辑 (可重试的核心逻辑)
   */
  private async processBatchInternal(batch: QuoteData[]): Promise<void> {
    const startTime = Date.now();
    
    // 按提供商和能力分组
    const groupedBatch = this.groupBatchByProviderCapability(batch);

    // 并行处理每个组
    const processingPromises = Object.entries(groupedBatch).map(async ([key, quotes]) => {
      const [provider, capability] = key.split(':');
      return this.processQuoteGroup(quotes, provider, capability);
    });

    await Promise.all(processingPromises);

    const processingTime = Date.now() - startTime;
    
    // 🔒 线程安全地更新统计数据
    await this.updateBatchStatsThreadSafe(batch.length, processingTime);

    this.logger.debug('批量处理完成', {
      batchSize: batch.length,
      processingTime,
      groups: Object.keys(groupedBatch).length,
    });
  }

  /**
   * 降级处理策略 - 当所有重试失败时的兜底方案
   */
  private async fallbackProcessing(batch: QuoteData[], reason: string): Promise<void> {
    this.logger.warn('启用批量处理降级策略', {
      batchSize: batch.length,
      reason,
      fallbackStrategy: 'basic_logging_only',
    });

    try {
      // 降级策略1: 仅记录关键信息，不进行复杂处理
      const symbolsCount = new Set(batch.flatMap(quote => quote.symbols)).size;
      const providersCount = new Set(batch.map(quote => quote.providerName)).size;

      // 简单统计更新 (降级模式)
      await this.updateBatchStatsThreadSafe(batch.length, 0);

      this.logger.log('降级处理完成', {
        batchSize: batch.length,
        uniqueSymbols: symbolsCount,
        providers: providersCount,
        reason,
      });

    } catch (fallbackError) {
      this.logger.error('降级处理也失败', {
        originalReason: reason,
        fallbackError: fallbackError.message,
        batchSize: batch.length,
      });
    }
  }

  /**
   * 计算重试延迟 (指数退避)
   */
  private calculateRetryDelay(attempt: number): number {
    return this.RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 检查断路器是否开启
   */
  private isCircuitBreakerOpen(): boolean {
    // 如果断路器已开启，检查是否可以重置
    if (this.circuitBreakerState.isOpen) {
      const now = Date.now();
      if (now - this.circuitBreakerState.lastFailureTime > this.CIRCUIT_BREAKER_RESET_TIMEOUT) {
        this.resetCircuitBreaker();
        return false;
      }
      return true;
    }

    // 计算失败率
    const totalAttempts = this.circuitBreakerState.failures + this.circuitBreakerState.successes;
    if (totalAttempts >= 10) { // 至少10次尝试后才考虑开启断路器
      const failureRate = (this.circuitBreakerState.failures / totalAttempts) * 100;
      if (failureRate >= this.CIRCUIT_BREAKER_THRESHOLD) {
        this.openCircuitBreaker();
        return true;
      }
    }

    return false;
  }

  /**
   * 记录断路器成功
   */
  private recordCircuitBreakerSuccess(): void {
    this.circuitBreakerState.successes++;
    
    // 重置计数器防止溢出
    if (this.circuitBreakerState.successes > 1000) {
      this.circuitBreakerState.successes = Math.floor(this.circuitBreakerState.successes / 2);
      this.circuitBreakerState.failures = Math.floor(this.circuitBreakerState.failures / 2);
    }
  }

  /**
   * 记录断路器失败
   */
  private recordCircuitBreakerFailure(): void {
    this.circuitBreakerState.failures++;
    this.circuitBreakerState.lastFailureTime = Date.now();
  }

  /**
   * 开启断路器
   */
  private openCircuitBreaker(): void {
    this.circuitBreakerState.isOpen = true;
    this.circuitBreakerState.lastFailureTime = Date.now();
    
    this.logger.warn('断路器开启', {
      failures: this.circuitBreakerState.failures,
      successes: this.circuitBreakerState.successes,
      failureRate: Math.round((this.circuitBreakerState.failures / 
        (this.circuitBreakerState.failures + this.circuitBreakerState.successes)) * 100),
    });
  }

  /**
   * 重置断路器
   */
  private resetCircuitBreaker(): void {
    this.circuitBreakerState.isOpen = false;
    this.circuitBreakerState.failures = 0;
    this.circuitBreakerState.successes = 0;
    
    this.logger.log('断路器重置', { 
      resetTime: new Date().toISOString(),
    });
  }

  /**
   * 获取断路器状态 (用于监控)
   */
  getCircuitBreakerState(): {
    isOpen: boolean;
    failures: number;
    successes: number;
    failureRate: number;
  } {
    const total = this.circuitBreakerState.failures + this.circuitBreakerState.successes;
    const failureRate = total > 0 ? (this.circuitBreakerState.failures / total) * 100 : 0;
    
    return {
      isOpen: this.circuitBreakerState.isOpen,
      failures: this.circuitBreakerState.failures,
      successes: this.circuitBreakerState.successes,
      failureRate: Math.round(failureRate * 100) / 100,
    };
  }

  /**
   * 模块销毁时清理资源
   */
  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.activeConnections.clear();
    this.logger.log('StreamReceiver 资源已清理');
  }

  /**
   * 设置订阅变更监听器
   */
  private setupSubscriptionChangeListener(): void {
    this.streamDataFetcher.getClientStateManager().addSubscriptionChangeListener((event) => {
      this.logger.debug('订阅变更事件', {
        clientId: event.clientId,
        action: event.action,
        symbolsCount: event.symbols.length,
        provider: event.provider,
        capability: event.capability,
      });

      // 这里可以添加订阅变更后的处理逻辑
      // 例如：优化连接管理、调整缓存策略等
    });
  }
}