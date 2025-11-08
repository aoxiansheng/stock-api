import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiSecurity } from "@nestjs/swagger";

import { Permission, UserRole } from "./enums";
import { ROLES_KEY, PERMISSIONS_KEY, IS_PUBLIC_KEY, READ_PROFILE, ADMIN_PROFILE } from "./constants";
import { ApiKeyAuthGuard, JwtAuthGuard, PermissionsGuard } from "./guards";

// 基础元数据装饰器
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
export const RequirePermissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// 认证装饰器
export function Auth(roles?: UserRole[], permissions?: Permission[]) {
  const decorators = [UseGuards(JwtAuthGuard, PermissionsGuard), ApiBearerAuth()];
  if (roles?.length) decorators.push(Roles(...roles));
  if (permissions?.length) decorators.push(RequirePermissions(...permissions));
  return applyDecorators(...decorators);
}

export function ApiKeyAuth(permissions?: Permission[]) {
  const decorators = [UseGuards(ApiKeyAuthGuard, PermissionsGuard), ApiSecurity("ApiKey"), ApiSecurity("AccessToken")];
  if (permissions?.length) decorators.push(RequirePermissions(...permissions));
  return applyDecorators(...decorators);
}

export function MixedAuth(roles?: UserRole[], permissions?: Permission[]) {
  const decorators = [UseGuards(JwtAuthGuard, ApiKeyAuthGuard, PermissionsGuard), ApiBearerAuth(), ApiSecurity("ApiKey"), ApiSecurity("AccessToken")];
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
