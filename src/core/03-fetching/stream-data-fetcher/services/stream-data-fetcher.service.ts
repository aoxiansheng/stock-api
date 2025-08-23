import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { BaseFetcherService } from '../../../shared/services/base-fetcher.service';
import { CapabilityRegistryService } from '../../../../providers/services/capability-registry.service';
import { MetricsRegistryService } from '../../../../common/core/monitoring/infrastructure/metrics-registry.service';
import { sanitizeLogData } from '../../../../common/config/logger.config';
import {
  IStreamDataFetcher,
  StreamConnectionParams,
  StreamConnection,
  StreamConnectionException,
  StreamSubscriptionException,
  StreamConnectionStats,
} from '../interfaces';
import { StreamConnectionImpl } from './stream-connection.impl';
import { StreamCacheService } from '../../../05-caching/stream-cache/services/stream-cache.service';
import { StreamClientStateManager } from './stream-client-state-manager.service';
import { StreamMetricsService } from './stream-metrics.service';

/**
 * 流数据获取器服务实现 - Stream Data Fetcher
 * 
 * 🎯 核心职责：
 * - WebSocket 流连接生命周期管理（建立、关闭、监控）
 * - 符号订阅/取消订阅操作
 * - 连接池管理和健康检查
 * - 与 CapabilityRegistry 集成获取提供商流能力
 * 
 * ❌ 明确不负责：
 * - 数据缓存（由 StreamCacheService 负责）
 * - 数据转换（由 Transformer 负责）
 * - 数据存储（由 Storage 负责）
 * - 数据路由（由 StreamReceiver 负责）
 * 
 * 📋 继承关系：
 * - 继承 BaseFetcherService 复用错误处理和指标逻辑
 * - 实现 IStreamDataFetcher 接口规范
 * 
 * 🔗 Pipeline 位置：WebSocket → StreamReceiver → **StreamDataFetcher** → Transformer → Storage
 */
@Injectable()
export class StreamDataFetcherService extends BaseFetcherService implements IStreamDataFetcher {
  
  // 连接池管理 - 支持多 provider 同时订阅
  // Key格式: `${provider}:${capability}` - 便于同一provider的不同能力复用连接
  private activeConnections = new Map<string, StreamConnection>();
  
  // 连接ID到Key的映射，便于查找和清理
  private connectionIdToKey = new Map<string, string>();
  
  constructor(
    protected readonly metricsRegistry: MetricsRegistryService,
    private readonly capabilityRegistry: CapabilityRegistryService,
    // Phase 4: 添加内部服务访问 - 供 StreamReceiver 使用
    private readonly streamCache: StreamCacheService,
    private readonly clientStateManager: StreamClientStateManager,
    private readonly streamMetrics: StreamMetricsService,
  ) {
    super(metricsRegistry);
  }

  /**
   * 建立流连接
   * @param params 连接参数
   * @returns 流连接实例
   */
  async establishStreamConnection(params: StreamConnectionParams): Promise<StreamConnection> {
    const startTime = Date.now();
    const { provider, capability, contextService, requestId, options } = params;
    
    this.logger.debug('开始建立流连接', sanitizeLogData({
      requestId,
      provider,
      capability,
      operation: 'establish_stream_connection',
    }));

    return await this.executeWithRetry(
      async () => {
        // 1. 获取提供商能力实例
        const capabilityInstance = await this.getStreamCapability(provider, capability);
        
        // 2. 生成连接ID
        const connectionId = uuidv4();
        
        // 3. 创建连接实例
        const connection = new StreamConnectionImpl(
          connectionId,
          provider,
          capability,
          capabilityInstance,
          contextService,
          options,
        );
        
        // 4. 等待连接建立
        await this.waitForConnectionEstablished(connection);
        
        // 5. 注册连接到连接池
        const connectionKey = `${provider}:${capability}`;
        this.activeConnections.set(connectionKey, connection);
        this.connectionIdToKey.set(connectionId, connectionKey);
        
        // 6. 设置连接监控
        this.setupConnectionMonitoring(connection);
        
        const processingTime = Date.now() - startTime;
        
        this.logger.log('流连接建立成功', sanitizeLogData({
          requestId,
          connectionId,
          provider,
          capability,
          processingTime,
          operation: 'establish_stream_connection',
        }));
        
        // 记录成功指标
        this.recordOperationSuccess('establish_connection', processingTime);
        this.streamMetrics.recordConnectionEvent('connected', connection.provider);
        this.streamMetrics.recordLatency('establish_connection', processingTime, connection.provider);
        this.streamMetrics.updateActiveConnectionsCount(this.activeConnections.size, connection.provider);
        
        return connection;
      },
      `establish_connection_${provider}_${capability}`,
      2, // 最大重试2次
      1000, // 重试间隔1秒
    );
  }

  /**
   * 订阅符号数据流
   * @param connection 流连接实例
   * @param symbols 要订阅的符号列表
   */
  async subscribeToSymbols(connection: StreamConnection, symbols: string[]): Promise<void> {
    const startTime = Date.now();
    
    if (!this.isConnectionActive(connection)) {
      throw new StreamConnectionException(
        '连接不活跃，无法订阅',
        connection.id,
        connection.provider,
        connection.capability,
      );
    }

    if (!symbols || symbols.length === 0) {
      throw new StreamSubscriptionException(
        '符号列表不能为空',
        symbols,
        connection.provider,
        connection.capability,
      );
    }

    this.logger.debug('开始订阅符号', sanitizeLogData({
      connectionId: connection.id,
      provider: connection.provider,
      capability: connection.capability,
      symbolsCount: symbols.length,
      symbols: symbols.slice(0, 10), // 只记录前10个符号
      operation: 'subscribe_symbols',
    }));

    return await this.executeWithRetry(
      async () => {
        // 获取连接实例的能力对象
        const connectionImpl = connection as StreamConnectionImpl;
        const capabilityInstance = (connectionImpl as any).capabilityInstance;
        const contextService = (connectionImpl as any).contextService;
        
        // 执行订阅
        if (typeof capabilityInstance.subscribe === 'function') {
          await capabilityInstance.subscribe(symbols, contextService);
          
          // 更新订阅符号记录
          symbols.forEach(symbol => connection.subscribedSymbols.add(symbol));
          
          const processingTime = Date.now() - startTime;
          
          this.logger.log('符号订阅成功', sanitizeLogData({
            connectionId: connection.id,
            symbolsCount: symbols.length,
            totalSubscribed: connection.subscribedSymbols.size,
            processingTime,
            operation: 'subscribe_symbols',
          }));
          
          // 记录订阅指标
          this.streamMetrics.recordSymbolProcessing(symbols, connection.provider, 'subscribe');
          this.streamMetrics.recordLatency('subscribe_symbols', processingTime, connection.provider);
          
        } else {
          throw new StreamSubscriptionException(
            '能力实例不支持订阅操作',
            symbols,
            connection.provider,
            connection.capability,
          );
        }
      },
      `subscribe_symbols_${connection.provider}_${connection.capability}`,
      1, // 订阅操作只重试1次
      500, // 重试间隔500ms
    );
  }

  /**
   * 取消订阅符号数据流
   * @param connection 流连接实例
   * @param symbols 要取消订阅的符号列表
   */
  async unsubscribeFromSymbols(connection: StreamConnection, symbols: string[]): Promise<void> {
    const startTime = Date.now();
    
    if (!this.isConnectionActive(connection)) {
      throw new StreamConnectionException(
        '连接不活跃，无法取消订阅',
        connection.id,
        connection.provider,
        connection.capability,
      );
    }

    if (!symbols || symbols.length === 0) {
      throw new StreamSubscriptionException(
        '符号列表不能为空',
        symbols,
        connection.provider,
        connection.capability,
      );
    }

    this.logger.debug('开始取消订阅符号', sanitizeLogData({
      connectionId: connection.id,
      symbolsCount: symbols.length,
      operation: 'unsubscribe_symbols',
    }));

    return await this.executeWithRetry(
      async () => {
        const connectionImpl = connection as StreamConnectionImpl;
        const capabilityInstance = (connectionImpl as any).capabilityInstance;
        const contextService = (connectionImpl as any).contextService;
        
        if (typeof capabilityInstance.unsubscribe === 'function') {
          await capabilityInstance.unsubscribe(symbols, contextService);
          
          // 更新订阅符号记录
          symbols.forEach(symbol => connection.subscribedSymbols.delete(symbol));
          
          const processingTime = Date.now() - startTime;
          
          this.logger.log('符号取消订阅成功', sanitizeLogData({
            connectionId: connection.id,
            symbolsCount: symbols.length,
            remainingSubscribed: connection.subscribedSymbols.size,
            processingTime,
            operation: 'unsubscribe_symbols',
          }));
          
          // 记录取消订阅指标
          this.streamMetrics.recordSymbolProcessing(symbols, connection.provider, 'unsubscribe');
          this.streamMetrics.recordLatency('unsubscribe_symbols', processingTime, connection.provider);
          
        } else {
          throw new StreamSubscriptionException(
            '能力实例不支持取消订阅操作',
            symbols,
            connection.provider,
            connection.capability,
          );
        }
      },
      `unsubscribe_symbols_${connection.provider}_${connection.capability}`,
      1,
      500,
    );
  }

  /**
   * 关闭流连接
   * @param connection 流连接实例
   */
  async closeConnection(connection: StreamConnection): Promise<void> {
    const startTime = Date.now();
    
    this.logger.debug('开始关闭流连接', {
      connectionId: connection.id,
      provider: connection.provider,
      capability: connection.capability,
      operation: 'close_connection',
    });

    try {
      // 1. 从连接池中移除
      const connectionKey = this.connectionIdToKey.get(connection.id);
      if (connectionKey) {
        this.activeConnections.delete(connectionKey);
        this.connectionIdToKey.delete(connection.id);
      }
      
      // 2. 调用连接实例的关闭方法，避免重复清理
      await connection.close();
      
      const processingTime = Date.now() - startTime;
      
      this.logger.log('流连接关闭成功', {
        connectionId: connection.id,
        processingTime,
        operation: 'close_connection',
      });
      
      // 记录关闭指标
      this.streamMetrics.recordConnectionEvent('disconnected', connection.provider);
      this.streamMetrics.recordLatency('close_connection', processingTime, connection.provider);
      this.streamMetrics.updateActiveConnectionsCount(this.activeConnections.size, connection.provider);
      
    } catch (error) {
      this.logger.error('流连接关闭失败', sanitizeLogData({
        connectionId: connection.id,
        error: error.message,
        operation: 'close_connection',
      }));
      
      throw new StreamConnectionException(
        `关闭连接失败: ${error.message}`,
        connection.id,
        connection.provider,
        connection.capability,
      );
    }
  }

  /**
   * 检查连接状态
   * @param connection 流连接实例
   * @returns 连接是否活跃
   */
  isConnectionActive(connection: StreamConnection): boolean {
    const connectionKey = this.connectionIdToKey.get(connection.id);
    return connection.isConnected && connectionKey ? this.activeConnections.has(connectionKey) : false;
  }

  /**
   * 获取连接统计信息
   * @param connection 流连接实例
   * @returns 连接统计
   */
  getConnectionStats(connection: StreamConnection): StreamConnectionStats {
    return connection.getStats();
  }

  /**
   * 获取所有活跃连接统计
   * @returns 所有连接的统计信息
   */
  getAllConnectionStats(): StreamConnectionStats[] {
    return Array.from(this.activeConnections.values()).map(connection => 
      connection.getStats()
    );
  }

  /**
   * 根据提供商和能力获取现有连接 - 支持连接复用
   * @param provider 提供商名称
   * @param capability 能力名称
   * @returns 现有连接实例或null
   */
  getExistingConnection(provider: string, capability: string): StreamConnection | null {
    const connectionKey = `${provider}:${capability}`;
    return this.activeConnections.get(connectionKey) || null;
  }

  /**
   * 获取按提供商分组的连接统计
   * @returns 按提供商分组的连接统计信息
   */
  getConnectionStatsByProvider(): Record<string, { 
    connections: number; 
    totalSubscriptions: number; 
    capabilities: string[] 
  }> {
    const stats: Record<string, { connections: number; totalSubscriptions: number; capabilities: string[] }> = {};
    
    this.activeConnections.forEach((connection, key) => {
      const [provider] = key.split(':');
      if (!stats[provider]) {
        stats[provider] = { connections: 0, totalSubscriptions: 0, capabilities: [] };
      }
      
      stats[provider].connections++;
      stats[provider].totalSubscriptions += connection.subscribedSymbols.size;
      if (!stats[provider].capabilities.includes(connection.capability)) {
        stats[provider].capabilities.push(connection.capability);
      }
    });
    
    return stats;
  }

  /**
   * 批量健康检查所有活跃连接
   * @param timeoutMs 健康检查超时时间
   * @returns 健康检查结果映射
   */
  async batchHealthCheck(timeoutMs: number = 5000): Promise<Record<string, boolean>> {
    const healthCheckPromises = Array.from(this.activeConnections.entries()).map(
      async ([key, connection]) => {
        try {
          // 使用接口方法进行健康检查
          const isAlive = await connection.isAlive(timeoutMs);
          return [key, isAlive] as [string, boolean];
        } catch (error) {
          this.logger.warn('连接健康检查失败', { connectionId: key, error: error.message });
          return [key, false] as [string, boolean];
        }
      }
    );
    
    const results = await Promise.all(healthCheckPromises);
    return Object.fromEntries(results);
  }

  /**
   * Phase 4: 获取内部缓存服务 - 供 StreamReceiver 使用
   */
  getStreamDataCache(): StreamCacheService {
    return this.streamCache;
  }

  /**
   * Phase 4: 获取客户端状态管理器 - 供 StreamReceiver 使用
   */
  getClientStateManager(): StreamClientStateManager {
    return this.clientStateManager;
  }

  /**
   * BaseFetcherService抽象方法实现
   * @param params 参数
   */
  async executeCore(): Promise<any> {
    // 这里可以用于其他核心操作，暂时不需要实现
    throw new Error('executeCore not implemented for StreamDataFetcher');
  }

  // === 私有方法 ===

  /**
   * 获取流能力实例
   * @param provider 提供商名称
   * @param capability 能力名称
   * @returns 能力实例
   */
  private async getStreamCapability(provider: string, capability: string): Promise<any> {
    try {
      // 使用现有的CapabilityRegistry获取能力
      const capabilityInstance = this.capabilityRegistry.getCapability(provider, capability);
      
      if (!capabilityInstance) {
        throw new NotFoundException(`流能力不存在: ${provider}/${capability}`);
      }
      
      // 验证这是一个WebSocket能力
      if (!capability.startsWith('ws-') && !capability.includes('stream')) {
        this.logger.warn('可能不是流能力', {
          provider,
          capability,
          suggestion: '流能力通常以"ws-"开头或包含"stream"',
        });
      }
      
      return capabilityInstance;
      
    } catch (error) {
      throw new StreamConnectionException(
        `获取流能力失败: ${error.message}`,
        undefined,
        provider,
        capability,
      );
    }
  }

  /**
   * 等待连接建立
   * @param connection 连接实例
   */
  private async waitForConnectionEstablished(
    connection: StreamConnection,
    timeoutMs: number = 10000,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkConnection = () => {
        if (connection.isConnected) {
          resolve();
          return;
        }
        
        if (Date.now() - startTime > timeoutMs) {
          reject(new StreamConnectionException(
            `连接建立超时 (${timeoutMs}ms)`,
            connection.id,
            connection.provider,
            connection.capability,
          ));
          return;
        }
        
        // 每100ms检查一次
        setTimeout(checkConnection, 100);
      };
      
      checkConnection();
    });
  }

  /**
   * 设置连接监控
   * @param connection 连接实例
   */
  private setupConnectionMonitoring(connection: StreamConnection): void {
    let previousStatus = 'connecting'; // 初始状态
    
    // 监听连接状态变化
    connection.onStatusChange((status) => {
      this.logger.debug('连接状态变化', {
        connectionId: connection.id,
        previousStatus,
        currentStatus: status,
      });
      
      // 使用新的语义明确的指标记录状态变化
      this.streamMetrics.recordConnectionStatusChange(
        connection.provider,
        previousStatus,
        status.toString()
      );
      
      previousStatus = status.toString();
    });
    
    // 监听连接错误
    connection.onError((error) => {
      this.logger.error('连接错误', sanitizeLogData({
        connectionId: connection.id,
        provider: connection.provider,
        capability: connection.capability,
        error: error.message,
      }));
      
      // 记录错误事件
      this.streamMetrics.recordErrorEvent(error.constructor.name, connection.provider);
      this.streamMetrics.recordConnectionEvent('failed', connection.provider);
    });
  }

  /**
   * 获取流指标摘要 - 用于监控和调试
   * @returns 指标摘要信息
   */
  getMetricsSummary(): any {
    return this.streamMetrics.getMetricsSummary();
  }
}