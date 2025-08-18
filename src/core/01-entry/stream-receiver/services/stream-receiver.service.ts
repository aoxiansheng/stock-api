import { Injectable } from '@nestjs/common';
import { createLogger } from '@common/config/logger.config';
import { SymbolMapperService } from '../../../00-prepare/symbol-mapper/services/symbol-mapper.service';
import { TransformerService } from '../../../02-processing/transformer/services/transformer.service';
import { StreamDataFetcherService } from '../../../03-fetching/stream-data-fetcher/services/stream-data-fetcher.service';
import { StreamRecoveryWorkerService, RecoveryJob } from '../../../03-fetching/stream-data-fetcher/services/stream-recovery-worker.service';
import { 
  ClientReconnectRequest, 
  ClientReconnectResponse 
} from '../../../03-fetching/stream-data-fetcher/interfaces';
import { StreamSubscribeDto } from '../dto/stream-subscribe.dto';
import { StreamUnsubscribeDto } from '../dto/stream-unsubscribe.dto';
import { TransformRequestDto } from '../../../02-processing/transformer/dto/transform-request.dto';
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
 * - 直接的数据转换 (统一由 TransformerService 负责)
 * - 客户端状态跟踪 (由 StreamClientStateManager 负责)
 * 
 * 🔗 Pipeline 位置：WebSocket → **StreamReceiver** → StreamDataFetcher → Transformer → Storage
 */
@Injectable()
export class StreamReceiverService {
  private readonly logger = createLogger('StreamReceiver');
  
  // 活跃的流连接管理 - provider:capability -> StreamConnection
  private readonly activeConnections = new Map<string, StreamConnection>();
  
  // 🎯 RxJS 批量处理管道
  private readonly quoteBatchSubject = new Subject<QuoteData>();
  private batchProcessingStats = {
    totalBatches: 0,
    totalQuotes: 0,
    batchProcessingTime: 0,
  };

  constructor(
    // Phase 4 精简依赖注入 - 从6个减少到5个核心依赖 (含Phase4监控)
    private readonly symbolMapperService: SymbolMapperService,
    private readonly transformerService: TransformerService,
    private readonly streamDataFetcher: StreamDataFetcherService,
    private readonly recoveryWorker?: StreamRecoveryWorkerService, // Phase 3 可选依赖
    private readonly metricsRegistry?: MetricsRegistryService, // Phase 4 可选监控依赖
  ) {
    this.logger.log('StreamReceiver Phase 4 重构完成 - 精简依赖架构 + 延迟监控');
    this.initializeBatchProcessing();
    this.setupSubscriptionChangeListener();
  }

  /**
   * 🎯 订阅流数据 - 重构后的核心方法
   * @param subscribeDto 订阅请求
   * @param messageCallback 消息回调
   */
  async subscribeStream(
    subscribeDto: StreamSubscribeDto,
    messageCallback: (data: any) => void
  ): Promise<void> {
    const { symbols, wsCapabilityType, preferredProvider } = subscribeDto;
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const providerName = preferredProvider || 'longport'; // 默认提供商
    const requestId = `request_${Date.now()}`;
    
    this.logger.log('开始订阅流数据', {
      clientId,
      symbolsCount: symbols.length,
      capability: wsCapabilityType,
      provider: providerName,
      requestId,
    });

    try {
      // 1. 符号映射
      const mappedSymbols = await this.mapSymbols(symbols, providerName);
      
      // 2. 更新客户端状态
      this.streamDataFetcher.getClientStateManager().addClientSubscription(
        clientId,
        mappedSymbols,
        wsCapabilityType,
        providerName,
        messageCallback
      );

      // 3. 获取或创建流连接
      const connection = await this.getOrCreateConnection(
        providerName,
        wsCapabilityType,
        requestId
      );

      // 4. 订阅符号到流连接
      await this.streamDataFetcher.subscribeToSymbols(connection, mappedSymbols);

      // 5. 设置数据接收处理
      this.setupDataReceiving(connection, providerName, wsCapabilityType);

      this.logger.log('流数据订阅成功', {
        clientId,
        symbolsCount: mappedSymbols.length,
        connectionId: connection.id,
      });

    } catch (error) {
      this.logger.error('流数据订阅失败', {
        clientId,
        error: error.message,
        requestId,
      });
      throw error;
    }
  }

  /**
   * 🎯 取消订阅流数据
   * @param unsubscribeDto 取消订阅请求
   */
  async unsubscribeStream(unsubscribeDto: StreamUnsubscribeDto): Promise<void> {
    const { symbols } = unsubscribeDto;
    // 注意：这里需要从WebSocket连接中获取clientId，暂时使用临时实现
    const clientId = 'temp_client_id'; // TODO: 从WebSocket连接上下文获取

    this.logger.log('开始取消订阅流数据', {
      clientId,
      symbolsCount: symbols?.length || 0,
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
    
    const providerName = preferredProvider || 'longport';
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
      
      // 3. 恢复客户端订阅
      const messageCallback = (data: any) => {
        // 这里需要从客户端状态中获取原始回调
        const clientInfo = this.streamDataFetcher.getClientStateManager().getClientSubscription(clientId);
        if (clientInfo?.messageCallback) {
          clientInfo.messageCallback(data);
        }
      };
      
      this.streamDataFetcher.getClientStateManager().addClientSubscription(
        clientId,
        confirmedSymbols,
        wsCapabilityType,
        providerName,
        messageCallback
      );
      
      // 4. 获取或创建连接
      const connection = await this.getOrCreateConnection(
        providerName,
        wsCapabilityType,
        requestId
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
    
    if (clientInfo?.messageCallback) {
      try {
        clientInfo.messageCallback({
          type: 'recovery_failed',
          message: '数据恢复失败，请重新订阅',
          action: 'resubscribe',
          error: errorMessage,
          timestamp: Date.now(),
        });
        
        this.logger.log('已通知客户端重新订阅', { clientId });
        
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
    const mappedSymbols: string[] = [];
    
    for (const symbol of symbols) {
      try {
        const mappedResult = await this.symbolMapperService.transformSymbolsForProvider(
          providerName, 
          [symbol], 
          `map_${Date.now()}`
        );
        const finalSymbol = mappedResult?.transformedSymbols?.[0] ?? symbol;
        mappedSymbols.push(finalSymbol);
      } catch (error) {
        this.logger.warn('符号映射失败，使用原始符号', {
          symbol,
          provider: providerName,
          error: error.message,
        });
        mappedSymbols.push(symbol);
      }
    }

    return mappedSymbols;
  }

  /**
   * 获取或创建流连接
   */
  private async getOrCreateConnection(
    provider: string,
    capability: string,
    requestId: string
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
      contextService: { requestId, provider }, // 简化的 contextService
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
        bufferTime(100), // 100ms 缓冲窗口
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
   * 处理批量数据
   */
  private async processBatch(batch: QuoteData[]): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.batchProcessingStats.totalBatches++;
      this.batchProcessingStats.totalQuotes += batch.length;

      // 按提供商和能力分组
      const groupedBatch = this.groupBatchByProviderCapability(batch);

      // 并行处理每个组
      const processingPromises = Object.entries(groupedBatch).map(async ([key, quotes]) => {
        const [provider, capability] = key.split(':');
        return this.processQuoteGroup(quotes, provider, capability);
      });

      await Promise.all(processingPromises);

      const processingTime = Date.now() - startTime;
      this.batchProcessingStats.batchProcessingTime += processingTime;

      this.logger.debug('批量处理完成', {
        batchSize: batch.length,
        processingTime,
        groups: Object.keys(groupedBatch).length,
      });

    } catch (error) {
      this.logger.error('批量处理失败', {
        batchSize: batch.length,
        error: error.message,
      });
    }
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
   * - 仅通过 TransformerService 进行数据转换
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

      // Step 1: 数据转换 - 仅通过 TransformerService
      const transformStartTime = Date.now();
      const transformRequestDto: TransformRequestDto = {
        provider: provider,
        apiType: 'stream' as const,
        transDataRuleListType: capability.replace('stream-', '').replace('-', '_'), // 转换为snake_case
        rawData: quotes.map(q => q.rawData),
      };

      const transformedData = await this.transformerService.transform(transformRequestDto);
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
      const allSymbols = Array.from(symbolsSet);

      // Step 4: 数据缓存
      const cacheStartTime = Date.now();
      await this.pipelineCacheData(dataArray, allSymbols);
      const cacheDuration = Date.now() - cacheStartTime;

      // Step 5: 数据广播
      const broadcastStartTime = Date.now();
      await this.pipelineBroadcastData(dataArray, allSymbols);
      const broadcastDuration = Date.now() - broadcastStartTime;

      // Step 6: 性能监控埋点
      const totalDuration = Date.now() - pipelineStartTime;
      this.recordPipelineMetrics({
        provider,
        capability,
        quotesCount: quotes.length,
        symbolsCount: allSymbols.length,
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
        symbolsCount: allSymbols.length,
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
          
          this.streamDataFetcher.getClientStateManager().broadcastToSymbolSubscribers(symbol, {
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
    // 更新批处理统计
    this.batchProcessingStats.totalBatches++;
    this.batchProcessingStats.totalQuotes += metrics.quotesCount;
    this.batchProcessingStats.batchProcessingTime += metrics.durations.total;

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
        
        // 记录到 stream_push_latency_ms 直方图指标
        this.metricsRegistry.streamPushLatencyMs.observe(
          {
            symbol: symbol,
            provider: provider,
            latency_category: latencyCategory,
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
   * 从符号中提取提供商信息 - Phase 4 辅助方法
   */
  private extractProviderFromSymbol(symbol: string): string {
    // 根据符号格式判断提供商和市场
    if (symbol.includes('.HK')) {
      return 'longport'; // 港股通常使用 LongPort
    } else if (symbol.includes('.US')) {
      return 'longport'; // 美股通常使用 LongPort
    } else if (symbol.includes('.SZ') || symbol.includes('.SH')) {
      return 'longport'; // A股通常使用 LongPort
    } else {
      return 'unknown'; // 默认未知提供商
    }
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