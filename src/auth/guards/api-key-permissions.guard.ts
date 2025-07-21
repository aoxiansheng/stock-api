import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { createLogger } from '@common/config/logger.config';

import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Permission } from '../enums/user-role.enum';
import { AuthSubjectType } from '../interfaces/auth-subject.interface';
import { PermissionService } from '../services/permission.service';
import { AuthSubjectFactory } from '../subjects/auth-subject.factory';

/**
 * API Key权限验证守卫
 * 
 * 专门处理API Key的权限验证逻辑，确保API Key拥有访问特定端点所需的权限。
 * 只对API Key认证的请求进行权限检查，对JWT认证的请求直接放行。
 * 
 * 使用场景：
 * - @ApiKeyAuth() 装饰器的端点
 * - @MixedAuth() 装饰器中的API Key认证
 * - 需要特定权限的API端点
 * 
 * @example
 * ```typescript
 * @ApiKeyAuth()
 * @RequirePermissions(Permission.DATA_READ, Permission.QUERY_EXECUTE)
 * @Post('query/execute')
 * async executeQuery() {
 *   // 只有拥有 DATA_READ 和 QUERY_EXECUTE 权限的API Key才能访问
 * }
 * ```
 */
@Injectable()
export class ApiKeyPermissionsGuard implements CanActivate {
  private readonly logger = createLogger(ApiKeyPermissionsGuard.name);

  constructor(
    private readonly permissionService: PermissionService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    try {
      // 获取认证主体
      const authSubject = AuthSubjectFactory.createFromRequest(request);
      
      // 只处理API Key认证
      if (authSubject.type !== AuthSubjectType.API_KEY) {
        this.logger.debug('跳过API Key权限检查 - 非API Key认证');
        return true;
      }

      // 获取所需权限
      const requiredPermissions = this.getRequiredPermissions(context);
      
      if (requiredPermissions.length === 0) {
        this.logger.debug('跳过API Key权限检查 - 无权限要求');
        return true;
      }

      // 执行权限检查
      const checkResult = await this.permissionService.checkPermissions(
        authSubject,
        requiredPermissions,
      );

      if (!checkResult.allowed) {
        this.logger.warn('API Key权限验证失败', {
          apiKey: authSubject.getDisplayName(),
          requiredPermissions,
          grantedPermissions: authSubject.permissions,
          missingPermissions: checkResult.missingPermissions,
          endpoint: request.url,
          method: request.method,
          userAgent: request.get('User-Agent'),
          ip: request.ip,
        });

        throw new ForbiddenException({
          message: 'API Key权限不足',
          error: 'Insufficient Permissions',
          details: {
            type: 'API_KEY_PERMISSION_DENIED',
            apiKeyName: authSubject.metadata?.name || 'unknown',
            requiredPermissions,
            grantedPermissions: authSubject.permissions,
            missingPermissions: checkResult.missingPermissions,
            endpoint: request.url,
            method: request.method,
          },
          timestamp: new Date().toISOString(),
        });
      }

      this.logger.debug('API Key权限验证通过', {
        apiKey: authSubject.getDisplayName(),
        requiredPermissions,
        grantedPermissions: authSubject.permissions,
        endpoint: request.url,
        method: request.method,
        duration: checkResult.duration,
      });

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error('API Key权限验证异常', {
        error: error.message,
        stack: error.stack,
        endpoint: request.url,
        method: request.method,
        userAgent: request.get('User-Agent'),
        ip: request.ip,
      });

      // 权限验证异常时拒绝访问，确保安全
      throw new ForbiddenException('权限验证失败，请稍后重试');
    }
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
   * 检查API Key是否有效
   */
  private isValidApiKey(authSubject: any): boolean {
    if (authSubject.type !== AuthSubjectType.API_KEY) {
      return false;
    }

    // 检查API Key是否激活
    if (!authSubject.metadata?.isActive) {
      return false;
    }

    // 检查API Key是否过期
    const expiresAt = authSubject.metadata?.expiresAt;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * 生成权限拒绝的详细错误信息
   */
  private generatePermissionDeniedMessage(
    authSubject: any,
    requiredPermissions: Permission[],
    missingPermissions: Permission[],
  ): string {
    const apiKeyName = authSubject.metadata?.name || 'unknown';
    const messages = [
      `API Key "${apiKeyName}" 权限不足`,
      `所需权限: [${requiredPermissions.join(', ')}]`,
      `缺失权限: [${missingPermissions.join(', ')}]`,
      `当前权限: [${authSubject.permissions.join(', ')}]`,
    ];

    return messages.join('; ');
  }
}
