import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { createLogger } from '@common/config/logger.config';
import { ApiKeyService } from '../../../auth/services/apikey.service';
import { Socket } from 'socket.io';
import { TokenService } from '../../../auth/services/token.service';
import { Permission } from '../../../auth/enums/user-role.enum';

/**
 * WebSocket 认证守卫
 * 复用现有的认证服务逻辑，支持JWT和API Key两种认证方式
 */
@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = createLogger(WsAuthGuard.name);

  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly tokenService: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client = context.switchToWs().getClient<Socket>();
      const data = context.switchToWs().getData();

      // 从消息数据或连接握手中获取认证信息
      const authData = this.extractAuthData(client, data);

      if (!authData) {
        this.logger.warn('WebSocket 连接缺少认证信息');
        return false;
      }

      // JWT Token 认证（复用现有TokenService）
      if (authData.token) {
        return await this.validateJwtToken(authData.token, client);
      }

      // API Key 认证（复用现有ApiKeyService）
      if (authData.apiKey && authData.accessToken) {
        return await this.validateApiKey(authData.apiKey, authData.accessToken, client);
      }

      this.logger.warn('WebSocket 连接认证信息格式不正确');
      return false;

    } catch (error) {
      this.logger.error({
        message: 'WebSocket 认证失败',
        error: error.message,
      });
      return false;
    }
  }

  /**
   * 提取认证数据（从HTTP Guards复用的逻辑）
   */
  private extractAuthData(client: Socket, data: any) {
    // 优先从消息数据中获取
    if (data?.token || (data?.apiKey && data?.accessToken)) {
      return {
        token: data.token,
        apiKey: data.apiKey,
        accessToken: data.accessToken,
      };
    }

    // 从连接握手头部获取（复用HTTP认证头部格式）
    const handshake = client.handshake;
    const headers = handshake.headers;
    const query = handshake.query;

    return {
      token: headers.authorization?.replace('Bearer ', '') || query.token,
      apiKey: headers['x-app-key'] || query.apiKey,
      accessToken: headers['x-access-token'] || query.accessToken,
    };
  }

  /**
   * 验证 JWT Token（复用现有TokenService）
   */
  private async validateJwtToken(token: string, client: Socket): Promise<boolean> {
    try {
      // 复用现有的TokenService验证逻辑
      const decoded = await this.tokenService.verifyRefreshToken(token);
      
      if (!decoded || !decoded.sub) {
        return false;
      }

      // 将用户信息附加到客户端（格式与HTTP认证一致）
      client.data.user = {
        userId: decoded.sub,
        username: decoded.username,
        role: decoded.role,
        authType: 'jwt',
      };

      this.logger.log({
        message: 'WebSocket JWT 认证成功',
        userId: decoded.sub,
        username: decoded.username,
        clientId: client.id,
      });

      return true;

    } catch (error) {
      this.logger.warn({
        message: 'WebSocket JWT 认证失败',
        error: error.message,
        clientId: client.id,
      });
      return false;
    }
  }

  /**
   * 验证 API Key（复用现有ApiKeyService）
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
        return false;
      }

      // 检查WebSocket流权限（复用现有权限系统）
      const hasStreamPermission = this.checkStreamPermissions(apiKeyDoc.permissions);

      if (!hasStreamPermission) {
        this.logger.warn({
          message: 'API Key 缺少 WebSocket 流权限',
          apiKey,
          clientId: client.id,
        });
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
   * 检查流权限（复用现有权限常量）
   */
  private checkStreamPermissions(permissions: string[]): boolean {
    // 复用现有权限系统的权限检查逻辑
    const streamPermissions = [
      Permission.DATA_READ,
      'stream:read',
      'stream:subscribe',
    ];

    return permissions.some(permission => 
      streamPermissions.some(streamPerm => 
        permission.includes(streamPerm) || streamPerm.includes(permission)
      )
    );
  }
}