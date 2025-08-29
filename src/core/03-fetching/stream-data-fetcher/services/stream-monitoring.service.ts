import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createLogger } from '@common/config/logger.config';
import { StreamMetricsService } from './stream-metrics.service';
import { Subject, race, timer, takeUntil, map } from 'rxjs';
import { StreamConnection, StreamConnectionStatus } from '../interfaces';

/**
 * StreamMonitoringService - 专门的流监控服务
 * 
 * P2-1: 优化依赖注入架构
 * 功能：
 * - 集中化连接监控逻辑
 * - 管理RxJS事件流
 * - 统一性能指标收集
 * - 减少主服务复杂性
 */
@Injectable()
export class StreamMonitoringService implements OnModuleDestroy {
  private readonly logger = createLogger('StreamMonitoringService');
  
  // P2-1: RxJS 清理机制
  private readonly destroy$ = new Subject<void>();
  
  // 监控状态
  private isServiceDestroyed = false;
  
  // 连接监控映射表
  private connectionMonitors = new Map<string, {
    statusSubscription?: any;
    errorSubscription?: any;
    startTime: number;
  }>();

  constructor(
    private readonly streamMetrics: StreamMetricsService,
  ) {
    this.logger.debug('StreamMonitoringService 已初始化');
  }

  /**
   * 设置连接监控 - 使用 RxJS 进行事件管理
   * @param connection 连接实例
   * @param onStatusChange 状态变化回调
   * @param onError 错误回调
   * @param onCleanup 清理回调
   */
  setupConnectionMonitoring(
    connection: StreamConnection,
    onStatusChange?: (status: string) => void,
    onError?: (error: Error) => void,
    onCleanup?: (connectionId: string) => void
  ): void {
    if (this.isServiceDestroyed) return;

    const connectionId = connection.id;
    let previousStatus = 'connecting'; // 初始状态
    
    try {
      // 记录监控开始时间
      this.connectionMonitors.set(connectionId, {
        startTime: Date.now(),
      });

      // 使用 RxJS 流监听状态变化，自动在服务销毁时清理
      const statusChange$ = new Promise<never>((resolve, reject) => {
        const handler = (status: string) => {
          this.logger.debug('连接状态变化', {
            connectionId: connectionId.substring(0, 8),
            previousStatus,
            currentStatus: status,
          });
          
          // 记录状态变化指标
          this.streamMetrics.recordConnectionStatusChange(
            connection.provider,
            previousStatus,
            status.toString()
          );
          
          // 调用外部回调
          if (onStatusChange) {
            onStatusChange(status);
          }
          
          // 如果连接状态变为关闭或错误，触发清理回调
          if ((status === StreamConnectionStatus.CLOSED || status === StreamConnectionStatus.ERROR) && onCleanup) {
            onCleanup(connectionId);
          }
          
          previousStatus = status.toString();
        };
        
        connection.onStatusChange(handler);
      });
      
      // 使用 RxJS 流监听错误事件，自动在服务销毁时清理
      const error$ = new Promise<never>((resolve, reject) => {
        const handler = (error: Error) => {
          this.logger.error('连接错误', {
            connectionId: connectionId.substring(0, 8),
            provider: connection.provider,
            capability: connection.capability,
            error: error.message,
          });
          
          // 记录错误事件指标
          this.streamMetrics.recordErrorEvent(error.constructor.name, connection.provider);
          this.streamMetrics.recordConnectionEvent('failed', connection.provider);
          
          // 调用外部回调
          if (onError) {
            onError(error);
          }
          
          // 异常情况下触发清理回调
          if (onCleanup) {
            onCleanup(connectionId);
          }
        };
        
        connection.onError(handler);
      });
      
      // 将事件流与销毁信号关联，确保在服务销毁时自动清理
      race(statusChange$, error$).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        complete: () => {
          this.logger.debug('连接监控事件流已清理', {
            connectionId: connectionId.substring(0, 8),
          });
          // 从监控映射表中移除
          this.connectionMonitors.delete(connectionId);
        }
      });
      
      this.logger.debug('连接监控已设置', {
        connectionId: connectionId.substring(0, 8),
        provider: connection.provider,
        capability: connection.capability,
      });
      
    } catch (monitoringError) {
      this.logger.warn('连接监控设置失败', {
        connectionId: connectionId.substring(0, 8),
        error: monitoringError.message,
      });
      
      // 清理失败的监控记录
      this.connectionMonitors.delete(connectionId);
    }
  }

  /**
   * 等待连接建立（事件驱动版本）
   * @param connection 连接实例
   * @param timeoutMs 超时时间
   * @returns Promise<void>
   */
  async waitForConnectionEstablished(
    connection: StreamConnection,
    timeoutMs: number = 10000,
  ): Promise<void> {
    const startTime = Date.now();
    
    // 如果连接已经建立，直接返回
    if (connection.isConnected) {
      return Promise.resolve();
    }
    
    try {
      // 使用 RxJS 创建状态变化流
      const statusChange$ = new Promise<string>((resolve) => {
        const handler = (status: string) => resolve(status);
        connection.onStatusChange(handler);
      });
      
      // 使用 RxJS 创建错误流
      const error$ = new Promise<never>((_, reject) => {
        const handler = (error: Error) => reject(error);
        connection.onError(handler);
      });
      
      // 创建超时流
      const timeout$ = timer(timeoutMs).pipe(
        map(() => {
          throw new Error(`连接建立超时 (${timeoutMs}ms)`);
        })
      );
      
      // 使用 race 操作符等待第一个完成的流
      await race(
        statusChange$.then(status => {
          if (status === 'CONNECTED' || connection.isConnected) {
            const establishmentTime = Date.now() - startTime;
            this.logger.debug('连接建立成功（RxJS事件驱动）', {
              connectionId: connection.id.substring(0, 8),
              provider: connection.provider,
              capability: connection.capability,
              establishmentTime,
            });
            return Promise.resolve();
          }
          throw new Error('连接状态未达到CONNECTED');
        }),
        error$,
        timeout$.toPromise()
      );
      
    } catch (listenerError) {
      // 如果 RxJS 事件流创建失败，回退到轮询机制
      this.logger.warn('RxJS事件流创建失败，回退到轮询模式', {
        connectionId: connection.id.substring(0, 8),
        error: listenerError.message,
      });
      
      return this.waitForConnectionEstablishedFallback(connection, timeoutMs);
    }
  }
  
  /**
   * 轮询模式备用方案（当事件驱动失败时使用）
   * @param connection 连接实例
   * @param timeoutMs 超时时间
   * @returns Promise<void>
   * @private
   */
  private async waitForConnectionEstablishedFallback(
    connection: StreamConnection,
    timeoutMs: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const pollInterval = parseInt(process.env.STREAM_POLLING_INTERVAL_MS || '100');
      
      const checkConnection = () => {
        if (connection.isConnected) {
          const establishmentTime = Date.now() - startTime;
          this.logger.debug('连接建立成功（轮询备用）', {
            connectionId: connection.id.substring(0, 8),
            provider: connection.provider,
            capability: connection.capability,
            establishmentTime,
            pollInterval,
          });
          resolve();
          return;
        }
        
        if (Date.now() - startTime > timeoutMs) {
          reject(new Error(`连接建立超时 (${timeoutMs}ms, fallback)`));
          return;
        }
        
        // 使用可配置的轮询间隔
        setTimeout(checkConnection, pollInterval);
      };
      
      checkConnection();
    });
  }

  /**
   * 停止连接监控
   * @param connectionId 连接ID
   */
  stopConnectionMonitoring(connectionId: string): void {
    const monitor = this.connectionMonitors.get(connectionId);
    if (monitor) {
      const duration = Date.now() - monitor.startTime;
      
      this.logger.debug('停止连接监控', {
        connectionId: connectionId.substring(0, 8),
        monitoringDuration: duration,
      });
      
      this.connectionMonitors.delete(connectionId);
    }
  }

  /**
   * 获取监控统计信息
   */
  getMonitoringStats() {
    const activeMonitors = this.connectionMonitors.size;
    const monitoringDurations = Array.from(this.connectionMonitors.values()).map(monitor => 
      Date.now() - monitor.startTime
    );
    
    return {
      activeMonitors,
      avgMonitoringDuration: monitoringDurations.length > 0 
        ? (monitoringDurations.reduce((a, b) => a + b, 0) / monitoringDurations.length).toFixed(0) + 'ms'
        : '0ms',
      longestMonitoringDuration: monitoringDurations.length > 0 
        ? Math.max(...monitoringDurations).toFixed(0) + 'ms'
        : '0ms',
      streamMetricsSummary: this.streamMetrics.getMetricsSummary(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 模块销毁时清理资源
   * 实现 OnModuleDestroy 接口确保 RxJS 事件监听器被正确清理
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.debug('StreamMonitoringService 开始销毁清理');
    
    // 标记服务为已销毁
    this.isServiceDestroyed = true;
    
    // 发送销毁信号，清理所有 RxJS 事件监听器
    this.destroy$.next();
    this.destroy$.complete();
    
    // 清理所有连接监控记录
    this.connectionMonitors.clear();
    
    this.logger.log('StreamMonitoringService 销毁清理完成', {
      clearedMonitors: this.connectionMonitors.size,
    });
  }
}