import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createLogger } from '@common/config/logger.config';
import { StreamReceiverService } from './stream-receiver.service';
import { StreamSubscribeDto, StreamUnsubscribeDto } from './dto';
import { WsAuth, WsPublic } from './decorators/ws-auth.decorator';
import { Permission } from '../../auth/enums/user-role.enum';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/stream',
  transports: ['websocket'],
})
export class StreamReceiverGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = createLogger(StreamReceiverGateway.name);

  constructor(
    private readonly streamReceiverService: StreamReceiverService,
  ) {}

  /**
   * 客户端连接处理
   */
  async handleConnection(client: Socket) {
    this.logger.log({
      message: 'WebSocket 客户端连接',
      clientId: client.id,
      remoteAddress: client.handshake.address,
      userAgent: client.handshake.headers['user-agent'],
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
   * 复用现有认证系统，需要DATA_READ权限
   */
  @SubscribeMessage('subscribe')
  @WsAuth([Permission.DATA_READ])
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StreamSubscribeDto,
  ) {
    try {
      this.logger.log({
        message: '收到 WebSocket 订阅请求',
        clientId: client.id,
        symbols: data.symbols,
        capabilityType: data.capabilityType,
      });

      // 执行订阅
      await this.streamReceiverService.subscribeSymbols(
        client.id,
        data,
        (streamData) => {
          // 推送数据给客户端
          client.emit('data', streamData);
        },
      );

      // 发送订阅成功确认
      client.emit('subscribe-ack', {
        success: true,
        message: '订阅成功',
        symbols: data.symbols,
        capabilityType: data.capabilityType,
        timestamp: Date.now(),
      });

    } catch (error) {
      this.logger.error({
        message: 'WebSocket 订阅处理失败',
        clientId: client.id,
        error: error.message,
      });

      // 发送错误消息
      client.emit('subscribe-error', {
        success: false,
        message: error.message,
        symbols: data.symbols,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 取消订阅股票数据流
   * 复用现有认证系统，需要DATA_READ权限
   */
  @SubscribeMessage('unsubscribe')
  @WsAuth([Permission.DATA_READ])
  async handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StreamUnsubscribeDto,
  ) {
    try {
      this.logger.log({
        message: '收到 WebSocket 取消订阅请求',
        clientId: client.id,
        symbols: data.symbols,
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
   * 复用现有认证系统，需要DATA_READ权限
   */
  @SubscribeMessage('get-subscription')
  @WsAuth([Permission.DATA_READ])
  async handleGetSubscription(@ConnectedSocket() client: Socket) {
    try {
      const subscription = this.streamReceiverService.getClientSubscription(client.id);

      client.emit('subscription-status', {
        success: true,
        data: subscription ? {
          symbols: Array.from(subscription.symbols),
          capabilityType: subscription.capabilityType,
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
   * 公共端点，无需认证
   */
  @SubscribeMessage('ping')
  @WsPublic()
  async handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', {
      timestamp: Date.now(),
    });
  }

  /**
   * 获取连接信息
   * 公共端点，无需认证
   */
  @SubscribeMessage('get-info')
  @WsPublic()
  async handleGetInfo(@ConnectedSocket() client: Socket) {
    const authInfo = client.data?.user || client.data?.apiKey || null;
    
    client.emit('connection-info', {
      clientId: client.id,
      connected: true,
      authType: authInfo?.authType || 'none',
      timestamp: Date.now(),
    });
  }
}