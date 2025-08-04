import { applyDecorators, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiSecurity } from "@nestjs/swagger";

import { UserRole, Permission } from "../enums/user-role.enum";
import { ApiKeyAuthGuard } from "../guards/apikey-auth.guard";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { UnifiedPermissionsGuard } from "../guards/unified-permissions.guard";

import { RequirePermissions } from "./permissions.decorator";
import { RequireApiKey } from "./require-apikey.decorator";
import { Roles } from "./roles.decorator";
export { Public } from "./public.decorator";

/**
 * JWT认证装饰器
 * 使用Bearer Token进行认证，适用于管理员和开发者
 *
 * 更新说明：
 * - 使用新的UnifiedPermissionsGuard替代RolesGuard
 * - 支持统一的角色和权限验证
 * - 提供更好的错误信息和日志记录
 *
 * @param roles 可选的角色限制
 * @param permissions 可选的权限限制
 *
 * @example
 * @ApiKeyAuth()
 * @Get('profile')
 * getProfile() {
 *   // 需要有效JWT Token
 * }
 *
 * @example
 * @ApiKeyAuth([UserRole.ADMIN])
 * @Delete('users/:id')
 * deleteUser() {
 *   // 只有管理员可以删除用户
 * }
 *
 * @example
 * @ApiKeyAuth([UserRole.DEVELOPER], [Permission.DATA_READ, Permission.QUERY_EXECUTE])
 * @Post('query/execute')
 * executeQuery() {
 *   // 需要开发者角色且拥有特定权限
 * }
 */
export function Auth(roles?: UserRole[], permissions?: Permission[]) {
  const decorators = [
    UseGuards(JwtAuthGuard, UnifiedPermissionsGuard),
    ApiBearerAuth(),
  ];

  if (roles && roles.length > 0) {
    decorators.push(Roles(...roles));
  }

  if (permissions && permissions.length > 0) {
    decorators.push(RequirePermissions(...permissions));
  }

  return applyDecorators(...decorators);
}

/**
 * API Key认证装饰器
 * 使用App Key + Access Token进行认证，适用于第三方应用
 * 自动应用权限验证和频率限制功能
 *
 * 更新说明：
 * - 添加了UnifiedPermissionsGuard进行权限验证
 * - 确保API Key拥有访问端点所需的权限
 * - 保持频率限制功能
 *
 * @param permissions 可选的权限限制
 *
 * @example
 * @ApiKeyAuth()
 * @Post('receiver/data')
 * handleDataRequest() {
 *   // 需要有效的API Key凭证，并检查频率限制
 * }
 *
 * @example
 * @ApiKeyAuth()
 * @RequirePermissions(Permission.DATA_READ, Permission.QUERY_EXECUTE)
 * @Post('query/execute')
 * executeQuery() {
 *   // 需要API Key拥有特定权限
 * }
 */
export function ApiKeyAuth(permissions?: Permission[]) {
  const decorators = [
    // RateLimitGuard 现在是全局守卫，不需要在这里重复使用
    UseGuards(ApiKeyAuthGuard, UnifiedPermissionsGuard),
    RequireApiKey(),
    ApiSecurity("ApiKey"),
    ApiSecurity("AccessToken"),
  ];

  if (permissions && permissions.length > 0) {
    decorators.push(RequirePermissions(...permissions));
  }

  return applyDecorators(...decorators);
}

/**
 * 混合认证装饰器
 * 支持JWT Token或API Key两种认证方式
 * 使用统一的权限验证系统
 *
 * 更新说明：
 * - 使用UnifiedPermissionsGuard进行统一权限验证
 * - JWT用户：检查角色和权限
 * - API Key：仅检查权限
 * - 添加频率限制（仅对API Key生效）
 *
 * @param roles JWT认证时的角色限制
 * @param permissions 权限限制（JWT用户和API Key都适用）
 *
 * @example
 * @MixedAuth()
 * @Get('providers/capabilities')
 * getCapabilities() {
 *   // 支持JWT或API Key认证
 * }
 *
 * @example
 * @MixedAuth([UserRole.DEVELOPER], [Permission.DATA_READ])
 * @Get('data')
 * getData() {
 *   // JWT用户需要开发者角色，API Key需要数据读取权限
 * }
 */
export function MixedAuth(roles?: UserRole[], permissions?: Permission[]) {
  const decorators = [
    // RateLimitGuard 现在是全局守卫，不需要在这里重复使用
    UseGuards(
      JwtAuthGuard,
      ApiKeyAuthGuard,
      UnifiedPermissionsGuard,
    ),
    ApiBearerAuth(),
    ApiSecurity("ApiKey"),
    ApiSecurity("AccessToken"),
  ];

  if (roles && roles.length > 0) {
    decorators.push(Roles(...roles));
  }

  if (permissions && permissions.length > 0) {
    decorators.push(RequirePermissions(...permissions));
  }

  return applyDecorators(...decorators);
}
