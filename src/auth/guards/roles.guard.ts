import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { UserRole, RolePermissions } from "../enums/user-role.enum";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles && !requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("用户未认证");
    }

    // 检查角色权限
    if (requiredRoles) {
      const hasRole = requiredRoles.some((role) => user.role === role);
      if (!hasRole) {
        throw new ForbiddenException("用户角色权限不足");
      }
    }

    // 检查具体权限
    if (requiredPermissions) {
      const userPermissions = RolePermissions[user.role] || [];
      const hasAllPermissions = requiredPermissions.every((permission) =>
        userPermissions.includes(permission),
      );

      if (!hasAllPermissions) {
        throw new ForbiddenException("用户权限不足");
      }
    }

    return true;
  }
}
