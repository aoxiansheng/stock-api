import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { createLogger } from "@common/logging/index";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { ApiKeyDocument } from "@authv2/schema";
import { Socket } from "socket.io";
import { Permission } from "@authv2/enums";
import {
  STREAM_PERMISSIONS,
  hasStreamPermissions,
} from "../constants/stream-permissions.constants";
import { CONSTANTS } from "@common/constants";
import { ADMIN_PROFILE, READ_PROFILE } from "@authv2/constants";

// Extract rate limit strategy for backward compatibility
// const { RateLimitStrategy } = CONSTANTS.DOMAIN.RATE_LIMIT.ENUMS;

/**
 * WebSocket 认证守卫
 * 复用现有的API Key认证逻辑，统一使用API Key认证
 * 集成限速功能，与REST API共享相同的认证和限速策略
 */
@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = createLogger(WsAuthGuard.name);

  constructor(
    @InjectModel('ApiKey') private readonly apiKeyModel: Model<ApiKeyDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client = context.switchToWs().getClient<Socket>();
      const data = context.switchToWs().getData();

      // 从消息数据或连接握手中获取API Key认证信息
      const authData = this.extractAuthData(client, data);

      if (!authData.apiKey || !authData.accessToken) {
        this.logger.warn("WebSocket 连接缺少API Key认证信息");
        return false;
      }

      // API Key 认证（复用现有ApiKeyService）
      return await this.validateApiKey(
        authData.apiKey,
        authData.accessToken,
        client,
      );
    } catch (error) {
      this.logger.error({
        message: "WebSocket 认证过程中发生错误",
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
      apiKey: headers["x-app-key"] || query.apiKey,
      accessToken: headers["x-access-token"] || query.accessToken,
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
      // v2 极简验证：直接查询 ApiKey 并校验状态/过期
      const apiKeyDoc = await this.apiKeyModel
        .findOne({ appKey: apiKey, accessToken, deletedAt: { $exists: false } })
        .exec();

      if (!apiKeyDoc) {
        this.logger.warn({
          message: "API Key 验证失败",
          apiKey:
            apiKey.substring(
              0,
              CONSTANTS.FOUNDATION.VALUES.QUANTITIES.TEN - 2,
            ) + "***", // 只记录前8位，保护敏感信息
          clientId: client.id,
        });
        return false;
      }

      // 过期校验
      if (apiKeyDoc.expiresAt && apiKeyDoc.expiresAt.getTime() < Date.now()) {
        this.logger.warn({ message: "API Key 已过期", clientId: client.id });
        return false;
      }

      // 由 profile 推导权限画像
      const permissions = (apiKeyDoc as any).permissions
        ? (apiKeyDoc as any).permissions
        : (apiKeyDoc.profile === 'ADMIN' ? ADMIN_PROFILE : READ_PROFILE);

      // 检查WebSocket流权限（使用新的Permission枚举）
      const hasStreamPermission = this.checkStreamPermissions(
        permissions as unknown as string[],
      );

      if (!hasStreamPermission) {
        this.logger.warn({
          message: "API Key 缺少 WebSocket 流权限",
          apiKey:
            apiKey.substring(
              0,
              CONSTANTS.FOUNDATION.VALUES.QUANTITIES.TEN - 2,
            ) + "***",
          requiredPermissions: [
            ...STREAM_PERMISSIONS.REQUIRED_STREAM_PERMISSIONS,
            Permission.STREAM_WRITE,
          ],
          clientId: client.id,
        });
        return false;
      }

      // 极简架构：移除限速检查（如需可在网关层按需加入 Throttler）

      // 将API Key信息附加到客户端（格式与HTTP认证一致）
      client.data.apiKey = {
        id: apiKeyDoc._id,
        name: (apiKeyDoc as any).appKey,
        permissions: Array.from(permissions as any),
        authType: "apikey",
      };

      this.logger.log({
        message: "WebSocket API Key 认证成功",
        apiKeyName: (apiKeyDoc as any).appKey,
        clientId: client.id,
      });

      return true;
    } catch (error) {
      this.logger.warn({
        message: "WebSocket API Key 认证失败",
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
    return hasStreamPermissions(permissions as Permission[]);
  }

  // 精简：去除限速检查方法
}
