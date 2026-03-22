import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WsException,
} from "@nestjs/websockets";
import { UsePipes, ValidationPipe, Optional } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { createLogger } from "@common/logging/index";
import {
  buildChartIntradayOwnerIdentity,
} from "@core/03-fetching/chart-intraday/services/chart-intraday-session.service";
import { ChartIntradayStreamSubscriptionService } from "@core/03-fetching/chart-intraday/services/chart-intraday-stream-subscription.service";
import { StreamReceiverService } from "../services/stream-receiver.service";
import { StreamSubscribeDto, StreamUnsubscribeDto } from "../dto";
import { Permission } from "@authv2/enums";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { ApiKeyDocument } from "@authv2/schema";
import { StreamRecoveryWorkerService } from "../../../03-fetching/stream-data-fetcher/services/stream-recovery-worker.service";
import {
  WebSocketServerProvider,
  WEBSOCKET_SERVER_TOKEN,
} from "../../../03-fetching/stream-data-fetcher/providers/websocket-server.provider";
import { Inject } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { STREAM_RECEIVER_TIMEOUTS } from "../constants/stream-receiver-timeouts.constants";
import { API_OPERATIONS } from "@common/constants/domain";
import { hasStreamPermissions } from "../constants/stream-permissions.constants";
import {
  UniversalExceptionFactory,
  BusinessErrorCode,
  ComponentIdentifier
} from '@common/core/exceptions';
import { STREAM_RECEIVER_ERROR_CODES } from '../constants/stream-receiver-error-codes.constants';
import { StreamResponses } from '../utils/stream-response.utils';

@WebSocketGateway({
  cors: {
    origin: (() => {
      const corsOrigin = process.env.CORS_ORIGIN;
      if (corsOrigin) {
        return corsOrigin.split(',');
      }
      // 生产环境强制要求配置，开发环境使用严格白名单
      if (process.env.NODE_ENV === 'production') {
        throw new Error('生产环境必须配置CORS_ORIGIN环境变量');
      }
      return [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000'
      ];
    })(),
    methods: ["GET"], // WebSocket升级只需要GET
    credentials: true,
    optionsSuccessStatus: 200,
  },
  path: "/api/v1/stream-receiver/connect",
  transports: ["websocket"],
})
export class StreamReceiverGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = createLogger(StreamReceiverGateway.name);

  constructor(
    private readonly streamReceiverService: StreamReceiverService,
    private readonly chartIntradayStreamSubscriptionService: ChartIntradayStreamSubscriptionService,
    @InjectModel('ApiKey') private readonly apiKeyModel: Model<ApiKeyDocument>,
    @Optional()
    private readonly streamRecoveryWorker?: StreamRecoveryWorkerService,
    @Inject(WEBSOCKET_SERVER_TOKEN)
    private readonly webSocketProvider?: WebSocketServerProvider,
  ) {}

  afterInit(server: Server) {
    // 🎯 CRITICAL FIX: 注入WebSocket服务器到WebSocketServerProvider (Gateway模式)
    if (this.webSocketProvider) {
      this.webSocketProvider.setGatewayServer(server);
      this.logger.log("✅ Gateway服务器已集成到WebSocketServerProvider", {
        serverPath: server.path(),
        engineConnectionCount: server.engine?.clientsCount || 0,
      });
    } else {
      this.logger.warn("⚠️ WebSocketServerProvider未注入，Gateway集成失败");
    }

    // StreamRecoveryWorker now uses WebSocketServerProvider automatically
    // No manual injection needed - deprecated setWebSocketServer method removed

    // 添加认证中间件，在连接建立前进行认证检查
    server.use(async (socket, next) => {
      const authStartTime = Date.now();
      
      try {
        const authResult = await this.authenticateConnection(socket);
        const authDuration = Date.now() - authStartTime;

        if (!authResult.success) {
          this.logger.warn("WebSocket 连接认证失败（中间件）", {
            clientId: socket.id,
            reason: authResult.reason,
          });

          // ✅ 记录认证失败的连接质量监控
          this.streamReceiverService.recordWebSocketConnectionQuality(
            socket.id,
            authDuration,
            'failed',
            authResult.reason
          );

          // 创建认证错误并阻止连接
          const authError = UniversalExceptionFactory.createBusinessException({
            component: ComponentIdentifier.STREAM_RECEIVER,
            errorCode: BusinessErrorCode.OPERATION_NOT_ALLOWED,
            operation: 'authenticateConnection',
            message: authResult.reason || 'Authentication failed',
            context: {
              clientId: socket.id,
              reason: authResult.reason,
              errorType: STREAM_RECEIVER_ERROR_CODES.AUTHENTICATION_FAILED
            }
          });
          return next(authError);
        }

        // ✅ 记录认证成功的连接质量监控
        this.streamReceiverService.recordWebSocketConnectionQuality(
          socket.id,
          authDuration,
          'success'
        );

        this.logger.log("WebSocket 连接认证成功（中间件）", {
          clientId: socket.id,
          apiKeyName: authResult.apiKey?.appKey || 'unknown',
          authDuration: `${authDuration}ms`
        });

        next();
      } catch (error) {
        const authDuration = Date.now() - authStartTime;
        
        this.logger.error("WebSocket 认证中间件处理失败", {
          clientId: socket.id,
          error: error.message,
        });

        // ✅ 记录认证错误的连接质量监控
        this.streamReceiverService.recordWebSocketConnectionQuality(
          socket.id,
          authDuration,
          'failed',
          `Middleware processing error: ${error.message}`
        );

        const authError = UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.STREAM_RECEIVER,
          errorCode: BusinessErrorCode.OPERATION_NOT_ALLOWED,
          operation: 'authenticateConnection',
          message: 'Connection authentication failed',
          context: {
            clientId: socket.id,
            originalError: error.message,
            errorType: STREAM_RECEIVER_ERROR_CODES.AUTHENTICATION_FAILED
          }
        });
        next(authError);
      }
    });
  }

  /**
   * 客户端连接处理
   * 认证已在中间件中完成，这里只处理连接成功后的逻辑
   */
  /**
   * 客户端连接处理
   * 认证已在中间件中完成，这里只处理连接成功后的逻辑
   */
  async handleConnection(client: Socket) {
    const connectionStartTime = Date.now();
    
    this.logger.log("WebSocket 客户端连接", {
      clientId: client.id,
      remoteAddress: client.handshake.address,
    });

    // ✅ 发送连接监控事件到 StreamReceiverService
    this.streamReceiverService.recordWebSocketConnection(
      client.id, 
      true, // 连接状态
      {
        remoteAddress: client.handshake.address,
        userAgent: client.handshake.headers['user-agent'],
        apiKeyName: client.data?.apiKey?.name
      }
    );

    // 发送连接成功消息
    client.emit("connected", StreamResponses.connected(client.id));
  }

  /**
   * 客户端断开连接处理
   */
  /**
   * 客户端断开连接处理
   */
  async handleDisconnect(client: Socket) {
    this.logger.log("WebSocket 客户端断开连接", {
      clientId: client.id,
    });

    // ✅ 发送断开连接监控事件到 StreamReceiverService
    this.streamReceiverService.recordWebSocketConnection(
      client.id, 
      false, // 断开连接状态
      {
        remoteAddress: client.handshake.address,
        apiKeyName: client.data?.apiKey?.name
      }
    );

    // 清理客户端订阅
    try {
      // Client cleanup is handled by StreamClientStateManager automatically
      this.logger.debug("客户端断开连接，状态管理器将自动清理", {
        clientId: client.id,
      });
      this.chartIntradayStreamSubscriptionService.unbindRealtimeClient(
        client.id,
      );
    } catch (error) {
      this.logger.error("清理客户端订阅失败", {
        clientId: client.id,
        error: error.message,
      });
    }
  }

  /**
   * 订阅股票数据流
   * 使用连接级别认证，无需重复验证
   */
  @SubscribeMessage("subscribe")
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      exceptionFactory: (errors) => {
        const errorMessage = "Data validation failed: " +
          errors
            .map((e) => Object.values(e.constraints || {}).join(", "))
            .join("; ");
        return new WsException(errorMessage);
      },
    }),
  )
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StreamSubscribeDto,
  ) {
    let subscribeData: StreamSubscribeDto = data;
    let subscriptionEstablished = false;
    try {
      const ownerIdentity = buildChartIntradayOwnerIdentity({
        userId: client.data?.apiKey?.userId,
        appKey: client.data?.apiKey?.name,
      });
      let sessionBinding: {
        sessionId: string;
        symbol: string;
        market: string;
        provider: string;
        wsCapabilityType: string;
      } | null = null;

      if (data.sessionId?.trim()) {
        if (!Array.isArray(data.symbols) || data.symbols.length !== 1) {
          throw new WsException(
            "chart-intraday WS 订阅携带 sessionId 时必须且只能订阅一个 symbol",
          );
        }

        try {
          const touched =
            await this.chartIntradayStreamSubscriptionService.validateWsSessionBinding(
              {
                sessionId: data.sessionId,
                symbol: String(data.symbols[0] || "")
                  .trim()
                  .toUpperCase(),
                provider: String(data.preferredProvider || "")
                  .trim()
                  .toLowerCase(),
                ownerIdentity,
              },
            );

          sessionBinding = {
            sessionId: touched.sessionId,
            symbol: touched.symbol,
            market: touched.market,
            provider: touched.provider,
            wsCapabilityType: touched.wsCapabilityType,
          };
          subscribeData = {
            sessionId: data.sessionId,
            ...data,
            symbols: [touched.symbol],
            preferredProvider: touched.provider,
            wsCapabilityType: touched.wsCapabilityType,
          };
        } catch (error) {
          if (!this.isChartIntradaySessionConflictError(error)) {
            throw error;
          }
          throw new WsException(
            "chart-intraday sessionId 无效、已失效或与当前订阅上下文不匹配",
          );
        }
      } else if (
        client.data?.authenticated === true &&
        Array.isArray(data.symbols) &&
        data.symbols.length === 1 &&
        typeof data.preferredProvider === "string" &&
        data.preferredProvider.trim().length > 0
      ) {
        const normalizedSymbol = String(data.symbols[0] || "")
          .trim()
          .toUpperCase();
        const normalizedProvider = String(data.preferredProvider || "")
          .trim()
          .toLowerCase();

        try {
          const ownerLease =
            await this.chartIntradayStreamSubscriptionService.findRealtimeOwnerLease(
              {
                ownerIdentity,
                symbol: normalizedSymbol,
                provider: normalizedProvider,
              },
            );

          if (ownerLease) {
            sessionBinding = {
              sessionId: ownerLease.sessionId,
              symbol: ownerLease.symbol,
              market: ownerLease.market,
              provider: ownerLease.provider,
              wsCapabilityType: ownerLease.wsCapabilityType,
            };
            subscribeData = {
              ...data,
              symbols: [ownerLease.symbol],
              preferredProvider: ownerLease.provider,
              wsCapabilityType: ownerLease.wsCapabilityType,
            };
          }
        } catch (error) {
          this.logger.warn("owner lease 自动查找失败，降级为普通订阅", {
            clientId: client.id,
            ownerIdentity,
            symbol: normalizedSymbol,
            provider: normalizedProvider,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // 连接级别认证已完成，直接使用已验证的信息
      this.logger.log("收到 WebSocket 订阅请求", {
        clientId: client.id,
        symbols: subscribeData.symbols,
        wsCapabilityType: subscribeData.wsCapabilityType,
        apiKeyName: client.data?.apiKey?.name || "未知",
      });

      // 执行订阅 - 通过Gateway直接广播
      await this.streamReceiverService.subscribeStream(
        subscribeData,
        client.id, // WebSocket客户端ID
        undefined,
        {
          connectionAuthenticated: client.data?.authenticated === true,
        },
      );
      subscriptionEstablished = true;

      if (sessionBinding) {
        await this.chartIntradayStreamSubscriptionService.bindRealtimeClientToSession(
          {
            sessionId: sessionBinding.sessionId,
            clientId: client.id,
            symbol: sessionBinding.symbol,
            market: sessionBinding.market,
            provider: sessionBinding.provider,
            ownerIdentity,
          },
        );
      }

      // 注册客户端数据推送监听 - 通过Gateway事件系统
      this.logger.debug("客户端订阅已建立，通过Gateway广播推送数据", {
        clientId: client.id,
        symbols: subscribeData.symbols,
        wsCapabilityType: subscribeData.wsCapabilityType,
        message: "messageCallback功能已由Gateway广播替代",
      });

      // 发送订阅成功确认
      client.emit(
        "subscribe-ack",
        StreamResponses.subscribeSuccess(
          subscribeData.symbols,
          subscribeData.wsCapabilityType,
        ),
      );
    } catch (error) {
      const rollbackError = subscriptionEstablished
        ? await this.rollbackClientSubscription(client.id, subscribeData, error)
        : null;
      if (rollbackError) {
        const fatalMessage =
          "Subscription rollback failed; connection state is unsafe and will be closed";
        this.logger.error("WebSocket 订阅回滚失败，连接将被关闭", {
          clientId: client.id,
          symbols: subscribeData.symbols,
          wsCapabilityType: subscribeData.wsCapabilityType,
          preferredProvider: subscribeData.preferredProvider,
          originalError: this.resolveErrorMessage(error),
          rollbackError: this.resolveErrorMessage(rollbackError),
        });
        client.emit(
          "subscribe-error",
          StreamResponses.subscribeError(
            fatalMessage,
            subscribeData.symbols || data?.symbols || [],
          ),
        );
        if (typeof client.disconnect === "function") {
          client.disconnect(true);
        }
        return;
      }

      // 处理 WsException
      if (error instanceof WsException) {
        this.logger.warn("WebSocket 订阅验证失败", {
          clientId: client.id,
          error: error.getError(),
        });

        client.emit("subscribe-error", StreamResponses.validationError(error.getError() as string));
        return;
      }

      this.logger.error("WebSocket 订阅处理失败", {
        clientId: client.id,
        error: error.message,
      });

      // 发送错误消息
      client.emit("subscribe-error", StreamResponses.subscribeError(
        error.message || "Subscription processing failed",
        data?.symbols || []
      ));
    }
  }

  /**
   * 取消订阅股票数据流
   * 使用连接级别认证，无需重复验证
   */
  @SubscribeMessage("unsubscribe")
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      exceptionFactory: (errors) => {
        const errorMessage = "Data validation failed: " +
          errors
            .map((e) => Object.values(e.constraints || {}).join(", "))
            .join("; ");
        return new WsException(errorMessage);
      },
    }),
  )
  async handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StreamUnsubscribeDto,
  ) {
    try {
      this.logger.log("收到 WebSocket 取消订阅请求", {
        clientId: client.id,
        symbols: data.symbols,
        apiKeyName: client.data?.apiKey?.name || "未知",
      });

      // 执行取消订阅 - ✅ Phase 3 - P2: 传递WebSocket客户端ID
      await this.streamReceiverService.unsubscribeStream(data, client.id);
      await this.unbindChartIntradaySessions(client.id, data.symbols);

      // 发送取消订阅成功确认
      client.emit("unsubscribe-ack", StreamResponses.unsubscribeSuccess(data.symbols));
    } catch (error) {
      this.logger.error("WebSocket 取消订阅处理失败", {
        clientId: client.id,
        error: error.message,
      });

      // 发送错误消息
      client.emit("unsubscribe-error", StreamResponses.unsubscribeError(error.message, data.symbols));
    }
  }

  /**
   * 获取订阅状态
   * 使用连接级别认证，无需重复验证
   */
  @SubscribeMessage("get-subscription")
  async handleGetSubscription(@ConnectedSocket() client: Socket) {
    try {
      // Note: Direct client subscription access not available in new architecture
      // Using stats API instead
      const subscription = null; // Client-specific subscription lookup not implemented yet

      const statusData = subscription
        ? {
            symbols: Array.from(subscription.symbols),
            wsCapabilityType: subscription.wsCapabilityType,
            providerName: subscription.providerName,
          }
        : null;
      client.emit("subscription-status", StreamResponses.statusSuccess(statusData));
    } catch (error) {
      this.logger.error("获取订阅状态失败", {
        clientId: client.id,
        error: error.message,
      });

      client.emit("subscription-status", StreamResponses.statusError(error.message));
    }
  }

  /**
   * 心跳检测
   * 连接级别已认证，无需额外验证
   */
  @SubscribeMessage("ping")
  async handlePing(@ConnectedSocket() client: Socket) {
    this.chartIntradayStreamSubscriptionService.touchRealtimeSessionsForClient(
      client.id,
    );
    client.emit("pong", {
      timestamp: Date.now(),
    });
  }

  /**
   * 客户端重连请求处理 - Phase 3 Recovery Integration
   * 客户端可以主动请求数据补发
   */
  @SubscribeMessage("request-recovery")
  async handleRecoveryRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      symbols: string[];
      lastReceiveTimestamp: number;
      wsCapabilityType?: string;
    },
  ) {
    try {
      const recoveryCapability = this.resolveRecoveryCapability(
        data.wsCapabilityType,
      );
      this.logger.log("收到客户端补发请求", {
        clientId: client.id,
        symbols: data.symbols,
        lastReceiveTimestamp: data.lastReceiveTimestamp,
        wsCapabilityType: recoveryCapability,
      });

      // 验证时间戳有效性
      const timeDiff = Date.now() - data.lastReceiveTimestamp;
      if (timeDiff > STREAM_RECEIVER_TIMEOUTS.RECOVERY_WINDOW_MS) {
        client.emit(
          "recovery-error",
          StreamResponses.recoveryWindowExceeded(
            STREAM_RECEIVER_TIMEOUTS.RECOVERY_WINDOW_MS,
          ),
        );
        return;
      }

      // 触发补发逻辑
      const reconnectResult = await this.streamReceiverService.handleClientReconnect({
        clientId: client.id,
        symbols: data.symbols,
        lastReceiveTimestamp: data.lastReceiveTimestamp,
        wsCapabilityType: recoveryCapability,
        reason: "manual",
      });

      if (!reconnectResult.success || !reconnectResult.recoveryStrategy?.willRecover) {
        client.emit(
          "recovery-error",
          StreamResponses.recoveryError(
            "recovery_start_failed",
            reconnectResult.instructions?.message ||
              "Recovery start failed or no recoverable data in current window",
            {
              clientId: client.id,
              symbolsCount: data.symbols?.length || 0,
            },
          ),
        );
        return;
      }

      // 发送补发已启动的确认
      const estimatedDataPoints = timeDiff < STREAM_RECEIVER_TIMEOUTS.RECOVERY_WINDOW_MS
        ? "< 1000"
        : "possibly large";
      client.emit("recovery-started", StreamResponses.recoveryStarted(data.symbols, estimatedDataPoints));
    } catch (error) {
      this.logger.error("处理客户端补发请求失败", {
        clientId: client.id,
        error: error.message,
      });

      client.emit(
        "recovery-error",
        StreamResponses.recoveryError(
          "processing_error",
          "Recovery request processing failed: " + error.message,
          {
            clientId: client.id,
            symbolsCount: data?.symbols?.length || 0,
          },
        ),
      );
    }
  }

  private resolveRecoveryCapability(wsCapabilityType?: string): string {
    const normalizedCapability = String(wsCapabilityType || "")
      .trim()
      .toLowerCase();
    if (
      !normalizedCapability ||
      normalizedCapability === API_OPERATIONS.DATA_TYPES.QUOTE
    ) {
      return API_OPERATIONS.STOCK_DATA.STREAM_QUOTE;
    }

    return normalizedCapability;
  }

  /**
   * 获取补发状态
   */
  @SubscribeMessage("get-recovery-status")
  async handleGetRecoveryStatus(@ConnectedSocket() client: Socket) {
    try {
      if (!this.streamRecoveryWorker) {
        client.emit(
          "recovery-status",
          StreamResponses.statusError("Recovery worker is not available"),
        );
        return;
      }

      const status = await this.streamRecoveryWorker.getClientRecoveryStatus(
        client.id,
      );

      client.emit(
        "recovery-status",
        StreamResponses.statusSuccess({
          clientId: client.id,
          ...status,
        }),
      );
    } catch (error) {
      this.logger.error("获取补发状态失败", {
        clientId: client.id,
        error: error.message,
      });

      client.emit("recovery-status", StreamResponses.statusError(error.message));
    }
  }

  /**
   * 获取连接信息
   * 连接级别已认证，无需额外验证
   */
  @SubscribeMessage("get-info")
  async handleGetInfo(@ConnectedSocket() client: Socket) {
    const authInfo = client.data?.apiKey || null;

    client.emit("connection-info", {
      clientId: client.id,
      connected: true,
      authType: authInfo?.authType || "apikey",
      apiKeyName: authInfo?.name || "未知",
      timestamp: Date.now(),
    });
  }

  /**
   * 连接级别的认证检查
   */
  private async authenticateConnection(client: Socket): Promise<{
    success: boolean;
    reason?: string;
    apiKey?: any;
  }> {
    client.data.authenticated = false;

    try {
      // 从连接认证信息中获取API Key
      const authData = this.extractAuthFromConnection(client);

      if (!authData.apiKey || !authData.accessToken) {
        return {
          success: false,
          reason: "Missing API Key or Access Token",
        };
      }

      // 验证API Key
      const apiKeyDoc = await this.apiKeyModel
        .findOne({ appKey: authData.apiKey, deletedAt: { $exists: false } })
        .exec();

      if (!apiKeyDoc) {
        return {
          success: false,
          reason: "Invalid API Key or Access Token",
        };
      }

      const accessTokenMatches = await bcrypt.compare(
        authData.accessToken,
        apiKeyDoc.accessToken,
      );
      if (!accessTokenMatches) {
        return {
          success: false,
          reason: "Invalid API Key or Access Token",
        };
      }

      if (this.isApiKeyExpired(apiKeyDoc)) {
        return {
          success: false,
          reason: "API Key expired",
        };
      }

      // 检查流权限：permissions 为空时直接拒绝
      const permissions = Array.isArray((apiKeyDoc as any).permissions)
        ? (apiKeyDoc as any).permissions
        : [];
      if (permissions.length === 0) {
        return {
          success: false,
          reason: "Insufficient stream permissions",
        };
      }
      const hasStreamPermission = hasStreamPermissions(
        permissions as Permission[],
      );
      if (!hasStreamPermission) {
        return {
          success: false,
          reason: "Insufficient stream permissions",
        };
      }

      // 将认证信息附加到客户端
      client.data.apiKey = {
        id: apiKeyDoc._id,
        name: (apiKeyDoc as any).appKey,
        userId: (apiKeyDoc as any).userId,
        permissions: Array.from(permissions as any),
        authType: "apikey",
      };
      client.data.authenticated = true;

      return {
        success: true,
        apiKey: apiKeyDoc,
      };
    } catch (error) {
      client.data.authenticated = false;
      return {
        success: false,
        reason: `Authentication error: ${error.message}`,
      };
    }
  }

  private async rollbackClientSubscription(
    clientId: string,
    subscribeData: StreamSubscribeDto,
    originalError: unknown,
  ): Promise<Error | null> {
    try {
      await this.streamReceiverService.unsubscribeStream(
        {
          symbols: subscribeData.symbols,
          wsCapabilityType: subscribeData.wsCapabilityType,
          preferredProvider: subscribeData.preferredProvider,
        },
        clientId,
      );
      return null;
    } catch (rollbackError: any) {
      this.logger.warn("WebSocket 订阅回滚失败", {
        clientId,
        symbols: subscribeData.symbols,
        wsCapabilityType: subscribeData.wsCapabilityType,
        preferredProvider: subscribeData.preferredProvider,
        originalError:
          originalError instanceof Error
            ? originalError.message
            : String(originalError),
        rollbackError: rollbackError?.message,
      });
      return rollbackError instanceof Error
        ? rollbackError
        : new Error(String(rollbackError));
    }
  }

  private isChartIntradaySessionConflictError(error: unknown): boolean {
    const message = this.resolveErrorMessage(error);
    return message === "UPSTREAM_NOT_FOUND" || message.startsWith("SESSION_");
  }

  private isApiKeyExpired(apiKeyDoc: ApiKeyDocument): boolean {
    return !!apiKeyDoc.expiresAt && apiKeyDoc.expiresAt.getTime() < Date.now();
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof WsException) {
      const payload = error.getError();
      return typeof payload === "string" ? payload : JSON.stringify(payload);
    }
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  private async unbindChartIntradaySessions(
    clientId: string,
    symbols: string[],
  ): Promise<void> {
    const normalizedSymbols = symbols
      .map((symbol) => String(symbol || "").trim().toUpperCase())
      .filter(Boolean);

    if (normalizedSymbols.length === 0) {
      return;
    }

    await this.chartIntradayStreamSubscriptionService.unbindRealtimeClientSessions(
      {
        clientId,
        symbols: normalizedSymbols,
      },
    );
  }

  /**
   * 从连接信息中提取认证数据
   */
  private extractAuthFromConnection(client: Socket) {
    const handshake = client.handshake;

    // 从auth字段获取（Socket.IO标准方式）
    if (handshake.auth?.appKey && handshake.auth?.accessToken) {
      return {
        apiKey: handshake.auth.appKey,
        accessToken: handshake.auth.accessToken,
      };
    }

    // 从头部获取
    return {
      apiKey: handshake.headers["x-app-key"],
      accessToken: handshake.headers["x-access-token"],
    };
  }

}
