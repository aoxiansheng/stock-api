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
} from '@nestjs/websockets';
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { createLogger } from '@common/config/logger.config';
import { StreamReceiverService } from './stream-receiver.service';
import { StreamSubscribeDto, StreamUnsubscribeDto } from './dto';
import { Permission } from '../../auth/enums/user-role.enum';
import { ApiKeyService } from '../../auth/services/apikey.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  path: '/api/v1/stream-receiver/connect',
  transports: ['websocket'],
})
export class StreamReceiverGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = createLogger(StreamReceiverGateway.name);

  constructor(
    private readonly streamReceiverService: StreamReceiverService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  afterInit(server: Server) {
    // 添加认证中间件，在连接建立前进行认证检查
    server.use(async (socket, next) => {
      try {
        const authResult = await this.authenticateConnection(socket);
        
        if (!authResult.success) {
          this.logger.warn({
            message: 'WebSocket 连接认证失败（中间件）',
            clientId: socket.id,
            reason: authResult.reason,
          });
          
          // 创建认证错误并阻止连接
          const error = new Error(authResult.reason);
          error.name = 'AuthenticationError';
          return next(error);
        }

        this.logger.log({
          message: 'WebSocket 连接认证成功（中间件）',
          clientId: socket.id,
          apiKeyName: authResult.apiKey?.name,
        });

        next();
      } catch (error) {
        this.logger.error({
          message: 'WebSocket 认证中间件处理失败',
          clientId: socket.id,
          error: error.message,
        });
        
        const authError = new Error('连接认证失败');
        authError.name = 'AuthenticationError';
        next(authError);
      }
    });
  }

  /**
   * 客户端连接处理
   * 认证已在中间件中完成，这里只处理连接成功后的逻辑
   */
  async handleConnection(client: Socket) {
    this.logger.log({
      message: 'WebSocket 客户端连接',
      clientId: client.id,
      remoteAddress: client.handshake.address,
    });

    // 发送连接成功消息
    client.emit('connected', {
      message: '连接成功',
      clientId: client.id,
      timestamp: Date.now(),
    });
  }

  /**
   * 客户端断开连接处理
   */
  async handleDisconnect(client: Socket) {
    this.logger.log({
      message: 'WebSocket 客户端断开连接',
      clientId: client.id,
    });

    // 清理客户端订阅
    try {
      await this.streamReceiverService.cleanupClientSubscription(client.id);
    } catch (error) {
      this.logger.error({
        message: '清理客户端订阅失败',
        clientId: client.id,
        error: error.message,
      });
    }
  }

  /**
   * 订阅股票数据流
   * 使用连接级别认证，无需重复验证
   */
  @SubscribeMessage('subscribe')
  @UsePipes(new ValidationPipe({ 
    transform: true, 
    whitelist: true,
    exceptionFactory: (errors) => {
      return new WsException('数据验证失败: ' + errors.map(e => Object.values(e.constraints || {}).join(', ')).join('; '));
    }
  }))
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StreamSubscribeDto,
  ) {
    try {
      // 连接级别认证已完成，直接使用已验证的信息
      this.logger.log({
        message: '收到 WebSocket 订阅请求',
        clientId: client.id,
        symbols: data.symbols,
        wsCapabilityType: data.wsCapabilityType,
        apiKeyName: client.data?.apiKey?.name || '未知',
      });

      // 执行订阅
      await this.streamReceiverService.subscribeSymbols(
        client.id,
        data,
        (streamData) => {
          // 🔧 增强：推送数据给客户端并记录推送状态
          try {
            this.logger.debug({
              message: '🔧 Gateway推送数据给客户端',
              clientId: client.id,
              symbols: streamData.symbols,
              provider: streamData.provider,
              timestamp: streamData.timestamp,
            });
            
            client.emit('data', streamData);
            
            this.logger.debug({
              message: '🔧 Gateway成功推送数据',
              clientId: client.id,
              symbols: streamData.symbols,
              connected: client.connected,
            });
          } catch (error) {
            this.logger.error({
              message: '🔧 Gateway推送数据失败',
              clientId: client.id,
              error: error.message,
              symbols: streamData.symbols,
            });
          }
        },
      );

      // 发送订阅成功确认
      client.emit('subscribe-ack', {
        success: true,
        message: '订阅成功',
        symbols: data.symbols,
        wsCapabilityType: data.wsCapabilityType,
        timestamp: Date.now(),
      });

    } catch (error) {
      // 处理 WsException
      if (error instanceof WsException) {
        this.logger.warn({
          message: 'WebSocket 订阅验证失败',
          clientId: client.id,
          error: error.getError(),
        });
        
        client.emit('subscriptionError', {
          success: false,
          message: error.getError(),
          timestamp: Date.now(),
        });
        return;
      }

      this.logger.error({
        message: 'WebSocket 订阅处理失败',
        clientId: client.id,
        error: error.message,
      });

      // 发送错误消息
      client.emit('subscriptionError', {
        success: false,
        message: error.message || '订阅处理失败',
        symbols: data?.symbols || [],
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 取消订阅股票数据流
   * 使用连接级别认证，无需重复验证
   */
  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StreamUnsubscribeDto,
  ) {
    try {
      this.logger.log({
        message: '收到 WebSocket 取消订阅请求',
        clientId: client.id,
        symbols: data.symbols,
        apiKeyName: client.data?.apiKey?.name || '未知',
      });

      // 执行取消订阅
      await this.streamReceiverService.unsubscribeSymbols(client.id, data);

      // 发送取消订阅成功确认
      client.emit('unsubscribe-ack', {
        success: true,
        message: '取消订阅成功',
        symbols: data.symbols,
        timestamp: Date.now(),
      });

    } catch (error) {
      this.logger.error({
        message: 'WebSocket 取消订阅处理失败',
        clientId: client.id,
        error: error.message,
      });

      // 发送错误消息
      client.emit('unsubscribe-error', {
        success: false,
        message: error.message,
        symbols: data.symbols,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 获取订阅状态
   * 使用连接级别认证，无需重复验证
   */
  @SubscribeMessage('get-subscription')
  async handleGetSubscription(@ConnectedSocket() client: Socket) {
    try {
      const subscription = this.streamReceiverService.getClientSubscription(client.id);

      client.emit('subscription-status', {
        success: true,
        data: subscription ? {
          symbols: Array.from(subscription.symbols),
          wsCapabilityType: subscription.wsCapabilityType,
          providerName: subscription.providerName,
        } : null,
        timestamp: Date.now(),
      });

    } catch (error) {
      this.logger.error({
        message: '获取订阅状态失败',
        clientId: client.id,
        error: error.message,
      });

      client.emit('subscription-status', {
        success: false,
        message: error.message,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 心跳检测
   * 连接级别已认证，无需额外验证
   */
  @SubscribeMessage('ping')
  async handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', {
      timestamp: Date.now(),
    });
  }

  /**
   * 获取连接信息
   * 连接级别已认证，无需额外验证
   */
  @SubscribeMessage('get-info')
  async handleGetInfo(@ConnectedSocket() client: Socket) {
    const authInfo = client.data?.apiKey || null;
    
    client.emit('connection-info', {
      clientId: client.id,
      connected: true,
      authType: authInfo?.authType || 'apikey',
      apiKeyName: authInfo?.name || '未知',
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
    try {
      // 从连接认证信息中获取API Key
      const authData = this.extractAuthFromConnection(client);

      if (!authData.apiKey || !authData.accessToken) {
        return {
          success: false,
          reason: 'Missing API Key or Access Token',
        };
      }

      // 验证API Key
      const apiKeyDoc = await this.apiKeyService.validateApiKey(
        authData.apiKey,
        authData.accessToken
      );

      if (!apiKeyDoc) {
        return {
          success: false,
          reason: 'Invalid API Key or Access Token',
        };
      }

      // 检查流权限
      const hasStreamPermission = this.checkStreamPermissions(apiKeyDoc.permissions);
      if (!hasStreamPermission) {
        return {
          success: false,
          reason: 'Insufficient stream permissions',
        };
      }

      // 将认证信息附加到客户端
      client.data.apiKey = {
        id: apiKeyDoc._id,
        name: apiKeyDoc.name,
        permissions: apiKeyDoc.permissions,
        authType: 'apikey',
      };

      return {
        success: true,
        apiKey: apiKeyDoc,
      };

    } catch (error) {
      return {
        success: false,
        reason: `Authentication error: ${error.message}`,
      };
    }
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

    // 从查询参数获取
    if (handshake.query?.appKey && handshake.query?.accessToken) {
      return {
        apiKey: handshake.query.appKey,
        accessToken: handshake.query.accessToken,
      };
    }

    // 从头部获取
    return {
      apiKey: handshake.headers['x-app-key'],
      accessToken: handshake.headers['x-access-token'],
    };
  }

  /**
   * 检查流权限
   */
  private checkStreamPermissions(permissions: string[]): boolean {
    const requiredStreamPermissions = [
      Permission.STREAM_READ,
      Permission.STREAM_SUBSCRIBE,
    ];

    return permissions.some(permission => 
      requiredStreamPermissions.includes(permission as Permission)
    );
  }
}