import { applyDecorators, UseGuards } from "@nestjs/common";
import { Permission } from "../../../../auth/enums/user-role.enum";
import { WsAuthGuard } from "../guards/ws-auth.guard";
import { RequirePermissions } from "../../../../auth/decorators/permissions.decorator";

/**
 * WebSocket 认证装饰器
 * 复用现有API Key认证系统，统一使用API Key认证
 * 集成限速功能，与REST API共享相同的认证和限速策略
 *
 * 设计原则：
 * - 复用现有的ApiKeyService和RateLimitService
 * - 使用相同的权限常量和检查逻辑
 * - 与REST API使用相同的API Key和限速策略
 * - 支持WebSocket流专用权限检查
 *
 * @param permissions 可选的权限限制，默认需要STREAM_READ或STREAM_SUBSCRIBE权限
 *
 * @example
 * @SubscribeMessage('subscribe')
 * @WsAuth()
 * async handleSubscribe() {
 *   // 需要有效的API Key认证且具有流权限
 * }
 *
 * @example
 * @SubscribeMessage('publish')
 * @WsAuth([Permission.STREAM_WRITE])
 * async handlePublish() {
 *   // 需要特定的流写入权限
 * }
 */
export function WsAuth(permissions?: Permission[]) {
  const decorators = [UseGuards(WsAuthGuard)];

  if (permissions && permissions.length > 0) {
    decorators.push(RequirePermissions(...permissions));
  }

  return applyDecorators(...decorators);
}

/**
 * 公共WebSocket端点装饰器
 * 用于不需要认证的WebSocket消息处理器
 *
 * @example
 * @SubscribeMessage('ping')
 * @WsPublic()
 * async handlePing() {
 *   // 无需认证
 * }
 */
export function WsPublic() {
  // WebSocket公共端点不需要使用Guard
  // 只是为了保持一致的装饰器风格
  return (
    _target: any,
    _propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) => {
    // 标记为公共端点，但不需要实际的装饰器逻辑
    // 因为我们的WsAuthGuard默认会检查认证信息
    return descriptor;
  };
}
