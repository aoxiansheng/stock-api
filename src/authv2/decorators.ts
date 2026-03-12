import { applyDecorators, SetMetadata } from "@nestjs/common";
import { ApiBearerAuth, ApiSecurity } from "@nestjs/swagger";

import { Permission, UserRole } from "./enums";
import { ROLES_KEY, PERMISSIONS_KEY, IS_PUBLIC_KEY, READ_PROFILE, ADMIN_PROFILE } from "./constants";

// 基础元数据装饰器
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
export const RequirePermissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// 认证装饰器：仅声明 OpenAPI 安全方案与路由元数据，不直接执行鉴权逻辑。
// 生效前提：应用已通过全局 APP_GUARD 注册 ApiKeyAuthGuard、JwtAuthGuard、PermissionsGuard。
export function Auth(roles?: UserRole[], permissions?: Permission[]) {
  const decorators = [ApiBearerAuth()];
  if (roles?.length) decorators.push(Roles(...roles));
  if (permissions?.length) decorators.push(RequirePermissions(...permissions));
  return applyDecorators(...decorators);
}

export function ApiKeyAuth(permissions?: Permission[]) {
  const decorators = [ApiSecurity("ApiKey"), ApiSecurity("AccessToken")];
  if (permissions?.length) decorators.push(RequirePermissions(...permissions));
  return applyDecorators(...decorators);
}

export function MixedAuth(roles?: UserRole[], permissions?: Permission[]) {
  const decorators = [ApiBearerAuth(), ApiSecurity("ApiKey"), ApiSecurity("AccessToken")];
  if (roles?.length) decorators.push(Roles(...roles));
  if (permissions?.length) decorators.push(RequirePermissions(...permissions));
  return applyDecorators(...decorators);
}

// 便捷装饰器
export function ReadAccess() {
  // 允许 DEVELOPER 以及更高权限 ADMIN 访问只读端点
  return MixedAuth([UserRole.DEVELOPER, UserRole.ADMIN], READ_PROFILE as Permission[]);
}

export function AdminOnly() {
  return Auth([UserRole.ADMIN], ADMIN_PROFILE as Permission[]);
}
