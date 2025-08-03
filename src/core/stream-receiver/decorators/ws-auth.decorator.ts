import { applyDecorators, UseGuards } from '@nestjs/common';
import { Permission } from '../../../auth/enums/user-role.enum';
import { WsAuthGuard } from '../guards/ws-auth.guard';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';

/**
 * WebSocket 认证装饰器
 * 复用现有认证系统的逻辑，支持JWT和API Key两种认证方式
 * 
 * 设计原则：
 * - 复用现有的TokenService和ApiKeyService
 * - 使用相同的权限常量和检查逻辑
 * - 保持与HTTP认证装饰器一致的接口设计
 * - 遵循系统的三层认证架构
 * 
 * @param permissions 可选的权限限制
 * 
 * @example
 * @SubscribeMessage('subscribe')
 * @WsAuth()
 * async handleSubscribe() {
 *   // 需要有效的JWT或API Key认证
 * }
 * 
 * @example
 * @SubscribeMessage('admin-operation')
 * @WsAuth([Permission.DATA_WRITE, Permission.ADMIN_ACCESS])
 * async handleAdminOperation() {
 *   // 需要特定权限
 * }
 */
export function WsAuth(permissions?: Permission[]) {
  const decorators = [
    UseGuards(WsAuthGuard),
  ];

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
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    // 标记为公共端点，但不需要实际的装饰器逻辑
    // 因为我们的WsAuthGuard默认会检查认证信息
    return descriptor;
  };
}