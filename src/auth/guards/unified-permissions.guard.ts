import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Optional,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";

import { createLogger } from "@app/config/logger.config";

import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { Permission, UserRole } from "../enums/user-role.enum";
import { AuthSubjectType } from "../interfaces/auth-subject.interface";
import { PermissionService } from "../services/permission.service";
import { AuthSubjectFactory } from "../subjects/auth-subject.factory";

/**
 * 统一权限验证守卫
 *
 * 替代原有的RolesGuard，提供JWT用户和API Key的统一权限验证。
 * 支持角色验证（仅JWT用户）和权限验证（JWT用户和API Key）。
 *
 * 验证逻辑：
 * 1. JWT用户：检查角色和权限
 * 2. API Key：仅检查权限
 * 3. 无认证要求：直接放行
 *
 * @example
 * ```typescript
 * // JWT用户角色验证
 * @ApiKeyAuth([UserRole.ADMIN])
 * @Get('admin/users')
 * async getUsers() {}
 *
 * // 权限验证（支持JWT和API Key）
 * @MixedAuth()
 * @RequirePermissions(Permission.DATA_READ)
 * @Get('data')
 * async getData() {}
 * ```
 */
@Injectable()
export class UnifiedPermissionsGuard implements CanActivate {
  private readonly logger = createLogger(UnifiedPermissionsGuard.name);

  constructor(
    @Optional() private readonly permissionService: PermissionService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    try {
      // 获取权限要求
      const requiredRoles = this.getRequiredRoles(context);
      const requiredPermissions = this.getRequiredPermissions(context);

      // 如果没有权限要求，直接放行
      if (requiredRoles.length === 0 && requiredPermissions.length === 0) {
        this.logger.debug("跳过权限检查 - 无权限要求");
        return true;
      }

      // 在需要检查权限时，确保权限服务已就绪
      if (!this.permissionService) {
        this.logger.error("权限服务未初始化，无法执行权限校验");
        throw new ForbiddenException({
          message: "权限服务不可用",
          error: "PermissionServiceUnavailable",
          timestamp: new Date().toISOString(),
        });
      }

      // 获取认证主体
      const authSubject = AuthSubjectFactory.createFromRequest(request);

      // 执行权限验证
      const checkResult = await this.permissionService.checkPermissions(
        authSubject,
        requiredPermissions,
        requiredRoles,
      );

      if (!checkResult.allowed) {
        this.logPermissionDenied(
          request,
          authSubject,
          requiredRoles,
          requiredPermissions,
          checkResult,
        );

        throw new ForbiddenException({
          message: this.generatePermissionDeniedMessage(
            authSubject,
            checkResult,
          ),
          error: "Insufficient Permissions",
          details: {
            type:
              authSubject.type === AuthSubjectType.JWT_USER
                ? "JWT_USER_PERMISSION_DENIED"
                : "API_KEY_PERMISSION_DENIED",
            subjectType: authSubject.type,
            subjectId: authSubject.id,
            subjectName: authSubject.getDisplayName(),
            requiredRoles,
            requiredPermissions,
            grantedPermissions: authSubject.permissions,
            currentRole: authSubject.role,
            missingPermissions: checkResult.missingPermissions,
            missingRoles: checkResult.missingRoles,
            endpoint: request.url,
            method: request.method,
          },
          timestamp: new Date().toISOString(),
        });
      }

      this.logPermissionGranted(
        request,
        authSubject,
        requiredRoles,
        requiredPermissions,
        checkResult,
      );

      return true;
    } catch (error) {
      this.logger.error("权限验证失败", error);
      // 若下游已抛出 ForbiddenException，则保持原样；否则统一包装为 ForbiddenException
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException("权限验证失败，请稍后重试");
    }
  }

  /**
   * 获取端点所需的角色
   */
  private getRequiredRoles(context: ExecutionContext): UserRole[] {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    return roles || [];
  }

  /**
   * 获取端点所需的权限
   */
  private getRequiredPermissions(context: ExecutionContext): Permission[] {
    const permissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    return permissions || [];
  }

  /**
   * 生成权限拒绝消息
   */
  private generatePermissionDeniedMessage(
    authSubject: any,
    checkResult: any,
  ): string {
    const subjectName = authSubject.getDisplayName();
    const messages = [subjectName + " 权限不足"];

    if (checkResult.missingRoles.length > 0) {
      messages.push(`所需角色: [${checkResult.missingRoles.join(", ")}]`);
      messages.push(`当前角色: ${authSubject.role || "N/A"}`);
    }

    if (checkResult.missingPermissions.length > 0) {
      messages.push(`缺失权限: [${checkResult.missingPermissions.join(", ")}]`);
      messages.push(`当前权限: [${authSubject.permissions.join(", ")}]`);
    }

    return messages.join("; ");
  }

  /**
   * 记录权限拒绝日志
   */
  private logPermissionDenied(
    request: Request,
    authSubject: any,
    requiredRoles: UserRole[],
    requiredPermissions: Permission[],
    checkResult: any,
  ): void {
    this.logger.warn("统一权限验证失败", {
      subject: authSubject.getDisplayName(),
      subjectType: authSubject.type,
      subjectId: authSubject.id,
      requiredRoles,
      requiredPermissions,
      currentRole: authSubject.role,
      grantedPermissions: authSubject.permissions,
      missingRoles: checkResult.missingRoles,
      missingPermissions: checkResult.missingPermissions,
      endpoint: request.url,
      method: request.method,
      userAgent: request.get("User-Agent"),
      ip: request.ip,
      duration: checkResult.duration,
    });
  }

  /**
   * 记录权限通过日志
   */
  private logPermissionGranted(
    request: Request,
    authSubject: any,
    requiredRoles: UserRole[],
    requiredPermissions: Permission[],
    checkResult: any,
  ): void {
    this.logger.debug("统一权限验证通过", {
      subject: authSubject.getDisplayName(),
      subjectType: authSubject.type,
      subjectId: authSubject.id,
      requiredRoles,
      requiredPermissions,
      currentRole: authSubject.role,
      grantedPermissions: authSubject.permissions,
      endpoint: request.url,
      method: request.method,
      duration: checkResult.duration,
    });
  }
}
