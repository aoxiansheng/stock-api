import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { createLogger } from '@app/config/logger.config';
import { ApiKeyService } from '../../../../auth/services/apikey.service';
import { RateLimitService } from '../../../../auth/services/rate-limit.service';
import { Socket } from 'socket.io';
import { Permission } from '../../../../auth/enums/user-role.enum';
import { RateLimitStrategy } from '@common/constants/rate-limit.constants';

/**
 * WebSocket 认证守卫
 * 复用现有的API Key认证逻辑，统一使用API Key认证
 * 集成限速功能，与REST API共享相同的认证和限速策略
 */
@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = createLogger(WsAuthGuard.name);

  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client = context.switchToWs().getClient<Socket>();
      const data = context.switchToWs().getData();

      // 从消息数据或连接握手中获取API Key认证信息
      const authData = this.extractAuthData(client, data);

      if (!authData.apiKey || !authData.accessToken) {
        this.logger.warn('WebSocket 连接缺少API Key认证信息');
        return false;
      }

      // API Key 认证（复用现有ApiKeyService）
      return await this.validateApiKey(authData.apiKey, authData.accessToken, client);

    } catch (error) {
      this.logger.error({
        message: 'WebSocket 认证过程中发生错误',
        error: error.message,
        clientId: context.switchToWs().getClient<Socket>()?.id,
      });
      return false;
    }
  }

  /**
   * 提取API Key认证数据（复用HTTP Guards的头部格式）
   */
  private extractAuthData(client: Socket, data: any) {
    // 优先从消息数据中获取
    if (data?.apiKey && data?.accessToken) {
      return {
        apiKey: data.apiKey,
        accessToken: data.accessToken,
      };
    }

    // 从连接握手头部获取（复用HTTP认证头部格式）
    const handshake = client.handshake;
    const headers = handshake.headers;
    const query = handshake.query;

    return {
      apiKey: headers['x-app-key'] || query.apiKey,
      accessToken: headers['x-access-token'] || query.accessToken,
    };
  }


  /**
   * 验证 API Key（复用现有ApiKeyService）并执行限速检查
   */
  private async validateApiKey(
    apiKey: string,
    accessToken: string,
    client: Socket,
  ): Promise<boolean> {
    try {
      // 复用现有的ApiKeyService验证逻辑
      const apiKeyDoc = await this.apiKeyService.validateApiKey(apiKey, accessToken);

      if (!apiKeyDoc) {
        this.logger.warn({
          message: 'API Key 验证失败',
          apiKey: apiKey.substring(0, 8) + '***', // 只记录前8位，保护敏感信息
          clientId: client.id,
        });
        return false;
      }

      // 检查WebSocket流权限（使用新的Permission枚举）
      const hasStreamPermission = this.checkStreamPermissions(apiKeyDoc.permissions);

      if (!hasStreamPermission) {
        this.logger.warn({
          message: 'API Key 缺少 WebSocket 流权限',
          apiKey: apiKey.substring(0, 8) + '***',
          requiredPermissions: [Permission.STREAM_READ, Permission.STREAM_SUBSCRIBE, Permission.STREAM_WRITE],
          clientId: client.id,
        });
        return false;
      }

      // 执行限速检查（复用现有的RateLimitService）
      const rateLimitPassed = await this.checkRateLimit(apiKeyDoc, client);
      if (!rateLimitPassed) {
        return false;
      }

      // 将API Key信息附加到客户端（格式与HTTP认证一致）
      client.data.apiKey = {
        id: apiKeyDoc._id,
        name: apiKeyDoc.name,
        permissions: apiKeyDoc.permissions,
        authType: 'apikey',
      };

      this.logger.log({
        message: 'WebSocket API Key 认证成功',
        apiKeyName: apiKeyDoc.name,
        clientId: client.id,
      });

      return true;

    } catch (error) {
      this.logger.warn({
        message: 'WebSocket API Key 认证失败',
        error: error.message,
        clientId: client.id,
      });
      return false;
    }
  }

  /**
   * 检查流权限（使用新的Permission枚举）
   */
  private checkStreamPermissions(permissions: string[]): boolean {
    // WebSocket流需要专门的流权限，至少需要读取或订阅权限
    const requiredStreamPermissions = [
      Permission.STREAM_READ,
      Permission.STREAM_SUBSCRIBE,
    ];

    return permissions.some(permission => 
      requiredStreamPermissions.includes(permission as Permission)
    );
  }

  /**
   * 执行限速检查（复用现有的RateLimitService）
   */
  private async checkRateLimit(apiKeyDoc: any, client: Socket): Promise<boolean> {
    try {
      // 如果API Key没有配置限速，跳过检查
      if (!apiKeyDoc.rateLimit) {
        return true;
      }

      // 使用默认策略执行限速检查
      const result = await this.rateLimitService.checkRateLimit(apiKeyDoc, RateLimitStrategy.SLIDING_WINDOW);

      if (!result.allowed) {
        this.logger.warn({
          message: 'WebSocket API Key 频率限制超出',
          apiKey: apiKeyDoc.appKey.substring(0, 8) + '***',
          limit: result.limit,
          current: result.current,
          clientId: client.id,
        });
        return false;
      }

      this.logger.debug({
        message: 'WebSocket 频率限制检查通过',
        apiKey: apiKeyDoc.appKey.substring(0, 8) + '***',
        current: result.current,
        limit: result.limit,
        clientId: client.id,
      });

      return true;
    } catch (error) {
      this.logger.error({
        message: 'WebSocket 限速检查失败，允许请求通过',
        error: error.message,
        clientId: client.id,
      });
      // 限速服务出错时，允许请求通过以保证服务可用性
      return true;
    }
  }

}