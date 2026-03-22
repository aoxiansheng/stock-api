import { Injectable, Optional } from "@nestjs/common";
import { createLogger } from "@common/logging/index";
import {
  UniversalExceptionFactory,
  BusinessErrorCode,
  ComponentIdentifier,
} from "@common/core/exceptions";
import { STREAM_RECEIVER_ERROR_CODES } from "../constants/stream-receiver-error-codes.constants";
import {
  StreamRecoveryWorkerService,
  RecoveryJob,
} from "../../../03-fetching/stream-data-fetcher/services/stream-recovery-worker.service";
import { StreamDataFetcherService } from "../../../03-fetching/stream-data-fetcher/services/stream-data-fetcher.service";
import { StreamClientStateManager } from "../../../03-fetching/stream-data-fetcher/services/stream-client-state-manager.service";
import {
  ClientReconnectRequest,
  ClientReconnectResponse,
} from "../../../03-fetching/stream-data-fetcher/interfaces";
import { StreamConnectionManagerService } from "./stream-connection-manager.service";
import { StreamSubscriptionContextService } from "./stream-subscription-context.service";
import { StreamProviderResolutionService } from "./stream-provider-resolution.service";
import { StreamIngressBindingService } from "./stream-ingress-binding.service";
import { MarketInferenceService } from "@common/modules/market-inference/services/market-inference.service";
import { resolveMarketTypeFromSymbols } from "@core/shared/utils/market-type.util";
import { normalizeProviderName } from "@providersv2/provider-registry.service";
import { STREAM_RECEIVER_TIMEOUTS } from "../constants/stream-receiver-timeouts.constants";

/**
 * StreamReconnectCoordinatorService - 重连/巡检协调器
 *
 * 职责：
 * - 主动断线检测（遍历 provider 和客户端心跳）
 * - 客户端重连请求的完整处理 (executeClientReconnect)
 * - 检查提供商连接状态
 * - 触发提供商重连
 * - 手动触发客户端重连检查
 * - 为客户端调度补发任务
 * - 通知客户端重新订阅
 *
 * 从 StreamReceiverService 阶段4拆分而来
 */
@Injectable()
export class StreamReconnectCoordinatorService {
  private readonly logger = createLogger("StreamReconnectCoordinator");
  private static readonly HEARTBEAT_RECONNECT_BATCH_SIZE = 10;
  private static readonly PROVIDER_RECONNECT_BATCH_SIZE = 50;

  constructor(
    private readonly clientStateManager: StreamClientStateManager,
    private readonly streamDataFetcher: StreamDataFetcherService,
    private readonly connectionManager: StreamConnectionManagerService,
    private readonly subscriptionContext: StreamSubscriptionContextService,
    private readonly providerResolution: StreamProviderResolutionService,
    private readonly ingressBinding: StreamIngressBindingService,
    private readonly marketInferenceService: MarketInferenceService,
    @Optional()
    private readonly recoveryWorker?: StreamRecoveryWorkerService,
  ) {}

  /**
   * 执行客户端重连 - 完整实现
   */
  async executeClientReconnect(
    reconnectRequest: ClientReconnectRequest,
  ): Promise<ClientReconnectResponse> {
    const {
      clientId,
      lastReceiveTimestamp,
      symbols,
      wsCapabilityType,
      preferredProvider,
      reason,
    } = reconnectRequest;

    const marketContext = resolveMarketTypeFromSymbols(
      this.marketInferenceService,
      symbols,
    );
    const requestId = `reconnect_${Date.now()}`;
    let providerName = preferredProvider
      ? normalizeProviderName(preferredProvider)
      : "";

    this.logger.log("客户端重连请求", {
      clientId,
      reason,
      symbolsCount: symbols.length,
      timeSinceLastReceive: Date.now() - lastReceiveTimestamp,
    });

    try {
      // 1. 验证lastReceiveTimestamp
      if (!lastReceiveTimestamp || lastReceiveTimestamp > Date.now()) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.STREAM_RECEIVER,
          errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
          operation: "handleClientReconnect",
          message:
            "Invalid lastReceiveTimestamp: must be a valid past timestamp",
          context: {
            lastReceiveTimestamp,
            currentTime: Date.now(),
            errorType: STREAM_RECEIVER_ERROR_CODES.INVALID_TIMESTAMP,
          },
        });
      }

      // 2. 解析 Provider（委托给 ProviderResolutionService）
      providerName = this.providerResolution.resolveProviderForStreamRequest({
        symbols,
        capability: wsCapabilityType,
        preferredProvider,
        marketContext,
        operation: "handleClientReconnect",
        requestId,
      });
      
      // 添加兼容性校验 (Issue 4.3)
      this.subscriptionContext.assertSubscriptionContextCompatibility(
        clientId,
        providerName,
        wsCapabilityType,
      );

      // 3. 映射符号（委托给 SubscriptionContextService）
      const { standardSymbols, providerSymbols } =
        await this.subscriptionContext.resolveSymbolMappings(
          symbols,
          providerName,
          requestId,
        );
      const rejectedSymbols: Array<{ symbol: string; reason: string }> = [];
      const confirmedStandardSymbols: string[] = [];
      const confirmedProviderSymbols: string[] = [];

      standardSymbols.forEach((standardSymbol, index) => {
        const providerSymbol = providerSymbols[index];
        if (!standardSymbol || !providerSymbol) {
          rejectedSymbols.push({
            symbol: symbols[index],
            reason: "符号映射失败",
          });
          return;
        }
        confirmedStandardSymbols.push(standardSymbol);
        confirmedProviderSymbols.push(providerSymbol);
      });

      // 4. 获取或创建连接
      const connection = await this.connectionManager.getOrCreateConnection(
        providerName,
        wsCapabilityType,
        requestId,
        symbols,
        clientId,
      );

      // 5. 订阅符号（Provider格式）
      if (confirmedProviderSymbols.length > 0) {
        await this.streamDataFetcher.subscribeToSymbols(
          connection,
          confirmedProviderSymbols,
        );
      }
      
      // 配置入站端点 (Issue 4.1)
      this.ingressBinding.setupDataReceiving(connection, providerName, wsCapabilityType);

      // 6. 订阅成功后恢复客户端订阅状态
      if (confirmedStandardSymbols.length > 0) {
        this.clientStateManager.addClientSubscription(
          clientId,
          confirmedStandardSymbols,
          wsCapabilityType,
          providerName,
        );
      }

      // 7. 判断是否需要补发数据
      const timeDiff = Date.now() - lastReceiveTimestamp;
      const maxRecoveryWindow = STREAM_RECEIVER_TIMEOUTS.RECOVERY_WINDOW_MS;

      let recoveryJobId: string | undefined;
      const willRecover =
        timeDiff <= maxRecoveryWindow && confirmedStandardSymbols.length > 0;

      if (willRecover && this.recoveryWorker) {
        const recoveryJob: RecoveryJob = {
          clientId,
          symbols: confirmedStandardSymbols,
          lastReceiveTimestamp,
          provider: providerName,
          capability: wsCapabilityType,
          priority: reason === "network_error" ? "high" : "normal",
        };

        recoveryJobId =
          await this.recoveryWorker.submitRecoveryJob(recoveryJob);

        this.logger.log("补发任务已提交", {
          clientId,
          jobId: recoveryJobId,
          symbolsCount: confirmedStandardSymbols.length,
        });
      }

      // 8. 构建响应
      const response: ClientReconnectResponse = {
        success: true,
        clientId,
        confirmedSymbols: confirmedStandardSymbols,
        rejectedSymbols:
          rejectedSymbols.length > 0 ? rejectedSymbols : undefined,
        recoveryStrategy: {
          willRecover,
          timeRange: willRecover
            ? {
                from: lastReceiveTimestamp,
                to: Date.now(),
              }
            : undefined,
          recoveryJobId,
        },
        connectionInfo: {
          provider: providerName,
          connectionId: connection.id,
          serverTimestamp: Date.now(),
          heartbeatInterval: STREAM_RECEIVER_TIMEOUTS.HEARTBEAT_INTERVAL_MS,
        },
        instructions: {
          action: willRecover ? "wait_for_recovery" : "none",
          message: willRecover
            ? "正在恢复历史数据，请等待"
            : "已重新连接，开始接收实时数据",
        },
      };

      this.logger.log("客户端重连成功", {
        clientId,
        confirmedSymbolsCount: confirmedStandardSymbols.length,
        willRecover,
        recoveryJobId,
      });

      return response;
    } catch (error) {
      const failureMessage =
        (error as Error)?.message || "重连失败，请重新订阅";

      this.logger.error("客户端重连失败", {
        clientId,
        error: failureMessage,
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
          connectionId: "",
          serverTimestamp: Date.now(),
          heartbeatInterval: STREAM_RECEIVER_TIMEOUTS.HEARTBEAT_INTERVAL_MS,
        },
        instructions: {
          action: "resubscribe",
          message: failureMessage,
          params: {
            reason: failureMessage,
          },
        },
      };
    }
  }

  /**
   * 主动断线检测 - Phase 3 Critical Fix
   * 检测连接异常并触发重连流程
   */
  detectReconnection(): void {
    const allClients = this.clientStateManager.getClientStateStats();
    const heartbeatTimeout = STREAM_RECEIVER_TIMEOUTS.HEARTBEAT_TIMEOUT_MS;

    this.logger.debug("开始断线检测", {
      totalClients: allClients.totalClients,
      checkTime: Date.now(),
    });

    if (allClients.providerBreakdown) {
      Object.keys(allClients.providerBreakdown).forEach((provider) => {
        this.checkProviderConnections(provider);
      });
    }

    this.checkClientHeartbeat(heartbeatTimeout);
  }

  /**
   * 手动触发客户端重连检查 - 供外部调用
   */
  async handleReconnection(
    clientId: string,
    reason: string = "manual_check",
  ): Promise<void> {
    this.logger.log("手动触发重连检查", { clientId, reason });

    try {
      const clientInfo =
        this.clientStateManager.getClientSubscription(clientId);

      if (!clientInfo) {
        this.logger.warn("客户端不存在，跳过重连检查", { clientId });
        return;
      }

      const connectionKey = `${clientInfo.providerName}:${clientInfo.wsCapabilityType}`;
      const isActive = this.connectionManager.isConnectionActive(connectionKey);

      if (!isActive) {
        this.logger.warn("检测到连接不活跃，调度补发任务", {
          clientId,
          provider: clientInfo.providerName,
          capability: clientInfo.wsCapabilityType,
        });

        if (this.recoveryWorker) {
          await this.scheduleRecoveryForClient(clientInfo, reason);
        } else {
          this.logger.error("Recovery Worker 不可用，无法调度补发", {
            clientId,
          });
        }
      } else {
        this.logger.debug("连接正常，无需重连", { clientId });
      }
    } catch (error) {
      this.logger.error("重连检查失败", {
        clientId,
        error: (error as Error).message,
      });
    }
  }

  /**
   * 检查提供商连接状态
   */
  private checkProviderConnections(provider: string): void {
    const connectionStats =
      this.streamDataFetcher.getConnectionStatsByProvider(provider);
    const providerStats = connectionStats;

    if (!providerStats || providerStats.connections?.length === 0 || providerStats.active === 0 || providerStats.connections.some(c => !c.isConnected)) {
      this.logger.warn("检测到提供商连接断开或存在失活连接", {
        provider,
        stats: providerStats,
      });

      this.triggerProviderReconnection(provider);
    }
  }

  /**
   * 检查客户端心跳超时
   */
  private checkClientHeartbeat(_timeoutMs: number): void {
    const now = Date.now();

    this.logger.debug("检查客户端心跳", {
      timeoutThreshold: _timeoutMs,
      currentTime: now,
    });
    
    try {
      const timeoutClients =
        this.clientStateManager.getClientsWithHeartbeatTimeout(_timeoutMs);
      if (timeoutClients.length > 0) {
        const batchClients = this.takeUniqueClients(timeoutClients, 50);
        this.logger.warn("检测到客户端心跳超时，触发重连", {
          totalTimeout: timeoutClients.length,
          batchSize: batchClients.length,
        });

        void this.processClientsInBatches(
          batchClients,
          "heartbeat_timeout",
          StreamReconnectCoordinatorService.HEARTBEAT_RECONNECT_BATCH_SIZE,
        );
      }
    } catch (err) {
      this.logger.error("检查客户端心跳发生异常", { error: (err as Error).message });
    }
  }

  /**
   * 触发提供商重连
   */
  private triggerProviderReconnection(provider: string): void {
    this.logger.log("触发提供商重连", { provider });

    try {
      const affectedClients = this.clientStateManager.getClientsByProvider(
        provider,
      );
      if (affectedClients.length > 0) {
        const batchClients = this.takeUniqueClients(affectedClients, 500);
        this.logger.warn("提供商重连触发，开始补偿受影响客户端", {
          provider,
          totalAffected: affectedClients.length,
          batchProcessing: batchClients.length
        });

        void this.processClientsInBatches(
          batchClients,
          "provider_disconnected",
          StreamReconnectCoordinatorService.PROVIDER_RECONNECT_BATCH_SIZE,
          provider,
        );
      } else {
        this.logger.debug("提供商断开连接，但未发现受影响客户端", { provider });
      }
    } catch (err) {
      this.logger.error("处理提供商重连时发生异常", { provider, error: (err as Error).message });
    }
  }

  /**
   * 为特定客户端调度补发任务
   */
  private async scheduleRecoveryForClient(
    clientInfo: { clientId: string; symbols: Set<string> | string[]; providerName: string; wsCapabilityType: string; lastActiveTime?: number },
    reason: string,
  ): Promise<void> {
    const now = Date.now();
    const lastReceiveTimestamp =
      clientInfo.lastActiveTime ||
      now - STREAM_RECEIVER_TIMEOUTS.HEARTBEAT_TIMEOUT_MS;

    const recoveryJob: RecoveryJob = {
      clientId: clientInfo.clientId,
      symbols: Array.from(clientInfo.symbols) as string[],
      lastReceiveTimestamp,
      provider: clientInfo.providerName,
      capability: clientInfo.wsCapabilityType,
      priority: reason === "network_error" ? "high" : "normal",
    };

    try {
      const jobId = await this.recoveryWorker!.submitRecoveryJob(recoveryJob);

      this.logger.log("补发任务调度成功", {
        clientId: clientInfo.clientId,
        jobId,
        reason,
      });
    } catch (error) {
      this.logger.error("补发任务调度失败", {
        clientId: clientInfo.clientId,
        error: (error as Error).message,
        reason,
      });

      await this.notifyClientResubscribe(clientInfo.clientId, (error as Error).message);
    }
  }

  /**
   * 通知客户端重新订阅 (调度失败时的回退)
   */
  private async notifyClientResubscribe(
    clientId: string,
    errorMessage: string,
  ): Promise<void> {
    const clientInfo =
      this.clientStateManager.getClientSubscription(clientId);

    if (clientInfo) {
      try {
        this.logger.log("需要通知客户端重新订阅", {
          clientId,
          error: errorMessage,
          message: "数据恢复失败，请重新订阅",
        });
      } catch (error) {
        this.logger.error("通知客户端重新订阅失败", {
          clientId,
          error: (error as Error).message,
        });
      }
    }
  }

  private takeUniqueClients(clientIds: string[], maxCount: number): string[] {
    return Array.from(new Set(clientIds)).slice(0, maxCount);
  }

  private async processClientsInBatches(
    clientIds: string[],
    reason: string,
    batchSize: number,
    provider?: string,
  ): Promise<void> {
    for (let index = 0; index < clientIds.length; index += batchSize) {
      const batch = clientIds.slice(index, index + batchSize);
      await Promise.allSettled(
        batch.map((clientId) =>
          this.handleReconnection(clientId, reason).catch((err: Error) => {
            this.logger.error("批量重连处理失败", {
              clientId,
              provider,
              reason,
              error: err.message,
            });
          }),
        ),
      );
    }
  }
}
