import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { PERMISSIONS_KEY, ROLES_KEY, IS_PUBLIC_KEY } from "./constants";
import { Permission, UserRole } from "./enums";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}

@Injectable()
export class ApiKeyAuthGuard extends AuthGuard("apikey") {}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]) || [];
    const requiredPerms = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]) || [];
    if (!requiredRoles.length && !requiredPerms.length) return true;

    const req = context.switchToHttp().getRequest();
    const subject = req.user as { role?: UserRole; permissions?: Permission[] } | undefined;
    if (!subject) return false;

    // 角色（JWT）
    if (requiredRoles.length) {
      if (!subject.role || !requiredRoles.includes(subject.role)) return false;
    }

    // 权限（JWT 或 API Key）
    if (requiredPerms.length) {
      const granted = new Set(subject.permissions || []);
      for (const p of requiredPerms) {
        if (!granted.has(p)) return false;
      }
    }
    return true;
  }
}

