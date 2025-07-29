import { Injectable, Logger } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';

import { REQUIRE_API_KEY } from '../../../../auth/decorators/require-apikey.decorator';
import { PERMISSIONS_KEY } from '../../../../auth/decorators/permissions.decorator';
import { Permission } from '../../../../auth/enums/user-role.enum';

/**
 * 权限装饰器验证结果
 */
export interface ValidationResult {
  controller: string;
  violations: PermissionViolation[];
  isValid: boolean;
  totalRoutes: number;
  validRoutes: number;
}

/**
 * 权限违规详情
 */
export interface PermissionViolation {
  type: 'missing_require_permissions' | 'permission_level_inconsistency' | 'invalid_permission_combination';
  route: string;
  method: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  recommendation?: string;
}

/**
 * 权限装饰器验证器
 * 
 * 检查控制器中的权限装饰器使用是否符合规范：
 * 1. @ApiKeyAuth 装饰器必须配合 @RequirePermissions 使用
 * 2. 权限级别是否合理
 * 3. 权限组合是否有效
 */
@Injectable()
export class PermissionDecoratorValidator {
  private readonly logger = new Logger(PermissionDecoratorValidator.name);

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {}

  /**
   * 验证所有控制器的权限装饰器
   */
  async validateAllControllers(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const controllers = this.discoveryService.getControllers();

    this.logger.log(`开始验证权限装饰器，发现 ${controllers.length} 个控制器`);

    for (const controller of controllers) {
      try {
        const controllerResult = await this.validateController(controller);
        results.push(controllerResult);
        
        if (!controllerResult.isValid) {
          this.logger.warn(`控制器 ${controllerResult.controller} 存在 ${controllerResult.violations.length} 个权限装饰器问题`);
        }
      } catch (error: any) {
        this.logger.error(`验证控制器失败: ${controller.name}`, {
          error: error.message,
          errorType: error.constructor.name,
        });
      }
    }

    const totalViolations = results.reduce((sum, result) => sum + result.violations.length, 0);
    const totalRoutes = results.reduce((sum, result) => sum + result.totalRoutes, 0);
    
    this.logger.log(`权限装饰器验证完成`, {
      totalControllers: controllers.length,
      totalRoutes,
      totalViolations,
      violationRate: totalRoutes > 0 ? (totalViolations / totalRoutes * 100).toFixed(2) + '%' : '0%',
    });

    return results;
  }

  /**
   * 验证单个控制器
   */
  private async validateController(controller: InstanceWrapper): Promise<ValidationResult> {
    const routes = this.getRoutes(controller.metatype);
    const violations: PermissionViolation[] = [];

    for (const route of routes) {
      // 检查 @ApiKeyAuth 装饰器是否有对应的 @RequirePermissions
      if (this.hasApiKeyAuth(route) && !this.hasRequirePermissions(route)) {
        violations.push({
          type: 'missing_require_permissions',
          route: route.path,
          method: route.method,
          message: '@ApiKeyAuth装饰器必须配合@RequirePermissions使用',
          severity: 'high',
          recommendation: '添加 @RequirePermissions(Permission.XXX) 装饰器'
        });
      }

      // 检查权限级别是否合理
      const permissions = this.getRequiredPermissions(route);
      const levelViolation = this.validatePermissionLevel(permissions, route);
      if (levelViolation) {
        violations.push(levelViolation);
      }

      // 检查权限组合是否有效
      const combinationViolation = this.validatePermissionCombination(permissions, route);
      if (combinationViolation) {
        violations.push(combinationViolation);
      }
    }

    return {
      controller: controller.name || 'Unknown',
      violations,
      isValid: violations.length === 0,
      totalRoutes: routes.length,
      validRoutes: routes.length - violations.length,
    };
  }

  /**
   * 获取控制器的所有路由
   */
  private getRoutes(controller: any): Array<{ path: string; method: string; handler: (...args: any[]) => any }> {
    const routes: Array<{ path: string; method: string; handler: (...args: any[]) => any }> = [];
    
    if (!controller || !controller.prototype) {
      return routes;
    }

    const methodNames = this.metadataScanner.getAllMethodNames(controller.prototype);
    
    for (const methodName of methodNames) {
      const method = controller.prototype[methodName];
      
      if (typeof method === 'function') {
        // 检查是否有HTTP方法装饰器（GET, POST, PUT, DELETE等）
        const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
        let routeMethod = '';
        let routePath = '';

        for (const httpMethod of httpMethods) {
          const methodMetadata = this.reflector.get(`__${httpMethod.toLowerCase()}__`, method);
          if (methodMetadata !== undefined) {
            routeMethod = httpMethod;
            routePath = methodMetadata || '';
            break;
          }
        }

        if (routeMethod) {
          routes.push({
            path: `/${routePath}`.replace(/\/+/g, '/'), // 规范化路径
            method: routeMethod,
            handler: method as (...args: any[]) => any,
          });
        }
      }
    }

    return routes;
  }

  /**
   * 检查是否有 @ApiKeyAuth 装饰器
   */
  private hasApiKeyAuth(route: { handler: (...args: any[]) => any }): boolean {
    return this.reflector.get(REQUIRE_API_KEY, route.handler) === true;
  }

  /**
   * 检查是否有 @RequirePermissions 装饰器
   */
  private hasRequirePermissions(route: { handler: (...args: any[]) => any }): boolean {
    const permissions = this.reflector.get<Permission[]>(PERMISSIONS_KEY, route.handler);
    return Array.isArray(permissions) && permissions.length > 0;
  }

  /**
   * 获取所需权限
   */
  private getRequiredPermissions(route: { handler: (...args: any[]) => any }): Permission[] {
    return this.reflector.get<Permission[]>(PERMISSIONS_KEY, route.handler) || [];
  }

  /**
   * 验证权限级别是否合理
   */
  private validatePermissionLevel(permissions: Permission[], route: { path: string; method: string }): PermissionViolation | null {
    if (permissions.length === 0) {
      return null;
    }

    // 检查是否有权限级别不匹配的情况
    const hasHighLevelPermission = permissions.some(p => 
      p === Permission.SYSTEM_ADMIN || p === Permission.MAPPING_WRITE
    );
    const hasLowLevelPermission = permissions.some(p => 
      p === Permission.DATA_READ || p === Permission.CONFIG_READ
    );

    if (hasHighLevelPermission && hasLowLevelPermission) {
      return {
        type: 'permission_level_inconsistency',
        route: route.path,
        method: route.method,
        message: '权限级别不一致：同时包含高级和低级权限',
        severity: 'medium',
        recommendation: '使用单一权限级别或建立权限继承关系'
      };
    }

    return null;
  }

  /**
   * 验证权限组合是否有效
   */
  private validatePermissionCombination(permissions: Permission[], route: { path: string; method: string }): PermissionViolation | null {
    if (permissions.length <= 1) {
      return null;
    }

    // 检查是否有冲突的权限组合
    const readPermissions = permissions.filter(p => p.toString().includes('READ'));
    const writePermissions = permissions.filter(p => p.toString().includes('WRITE'));

    if (readPermissions.length > 1) {
      return {
        type: 'invalid_permission_combination',
        route: route.path,
        method: route.method,
        message: '存在多个读取权限，可能造成权限冗余',
        severity: 'low',
        recommendation: '使用最高级别的读取权限'
      };
    }

    if (writePermissions.length > 1) {
      return {
        type: 'invalid_permission_combination',
        route: route.path,
        method: route.method,
        message: '存在多个写入权限，可能造成权限冲突',
        severity: 'medium',
        recommendation: '使用最高级别的写入权限'
      };
    }

    return null;
  }

  /**
   * 生成验证报告
   */
  generateReport(results: ValidationResult[]): string {
    const totalControllers = results.length;
    const totalViolations = results.reduce((sum, result) => sum + result.violations.length, 0);
    const totalRoutes = results.reduce((sum, result) => sum + result.totalRoutes, 0);
    const validControllers = results.filter(r => r.isValid).length;

    let report = `权限装饰器验证报告\n`;
    report += `======================\n\n`;
    report += `总体统计:\n`;
    report += `- 控制器总数: ${totalControllers}\n`;
    report += `- 路由总数: ${totalRoutes}\n`;
    report += `- 违规总数: ${totalViolations}\n`;
    report += `- 合规控制器: ${validControllers}/${totalControllers} (${(validControllers/totalControllers*100).toFixed(1)}%)\n\n`;

    if (totalViolations > 0) {
      report += `违规详情:\n`;
      report += `--------\n`;

      for (const result of results) {
        if (result.violations.length > 0) {
          report += `\n控制器: ${result.controller}\n`;
          
          for (const violation of result.violations) {
            report += `  [${violation.severity.toUpperCase()}] ${violation.method} ${violation.route}\n`;
            report += `    问题: ${violation.message}\n`;
            if (violation.recommendation) {
              report += `    建议: ${violation.recommendation}\n`;
            }
          }
        }
      }
    } else {
      report += `✅ 所有控制器的权限装饰器都符合规范！\n`;
    }

    return report;
  }
}