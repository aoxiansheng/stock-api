import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { PERMISSIONS_KEY, ROLES_KEY, IS_PUBLIC_KEY } from "./constants";
import { Permission, UserRole } from "./enums";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // 检查是否为公开端点
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // 检查请求头中是否有JWT Token
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // 如果没有Authorization头，跳过JWT认证（可能使用API Key）
    // 注意：这里只是跳过JWT验证，不代表放行请求
    // PermissionsGuard 会在后续检查 req.user 是否存在
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return true;
    }

    return super.canActivate(context);
  }
}

@Injectable()
export class ApiKeyAuthGuard extends AuthGuard("apikey") {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // 检查是否为公开端点
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // 检查请求头中是否有API Key相关头部
    const request = context.switchToHttp().getRequest();
    const appKey = request.headers['x-app-key'] || request.headers['appkey'];
    const accessToken = request.headers['x-access-token'] || request.headers['accesstoken'];

    // 如果没有API Key相关头部，跳过API Key认证（可能使用JWT）
    if (!appKey && !accessToken) {
      return true;
    }

    return super.canActivate(context);
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const subject = req.user as { role?: UserRole; permissions?: Permission[] } | undefined;

    // 对于非公开端点，必须有认证信息
    // 如果 req.user 不存在，说明 JWT 和 API Key 认证都失败了
    // 抛出 401 而不是返回 false(403)
    if (!subject) {
      throw new UnauthorizedException('未授权访问');
    }

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]) || [];
    const requiredPerms = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]) || [];

    // 🔍 DEBUG: 添加详细日志
    const endpoint = `${req.method} ${req.url}`;
    console.log('🔍 PermissionsGuard DEBUG:', {
      endpoint,
      userRole: subject.role,
      userPermissions: subject.permissions,
      requiredRoles,
      requiredPermsCount: requiredPerms.length,
      requiredPerms: requiredPerms.slice(0, 3), // 只显示前3个权限
    });

    // 如果没有指定角色和权限要求，但有认证信息，则允许访问
    if (!requiredRoles.length && !requiredPerms.length) return true;

    // 角色检查（JWT）
    if (requiredRoles.length) {
      if (!subject.role || !requiredRoles.includes(subject.role)) {
        console.log('❌ 角色检查失败:', {
          userRole: subject.role,
          requiredRoles,
          endpoint
        });
        throw new ForbiddenException('访问被拒绝');
      }
    }

    // 权限检查（JWT 或 API Key）
    if (requiredPerms.length) {
      const granted = new Set(subject.permissions || []);
      for (const p of requiredPerms) {
        if (!granted.has(p)) {
          console.log('❌ 权限检查失败:', {
            missingPermission: p,
            userPermissions: subject.permissions,
            requiredPerms,
            endpoint
          });
          throw new ForbiddenException('访问被拒绝');
        }
      }
    }
    return true;
  }
}

