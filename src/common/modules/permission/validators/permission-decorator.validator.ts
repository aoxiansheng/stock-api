import { Injectable } from "@nestjs/common";

import { createLogger } from "@common/logging/index";
import { DiscoveryService, MetadataScanner, Reflector } from "@nestjs/core";
import { InstanceWrapper } from "@nestjs/core/injector/instance-wrapper";
import { HTTP_METHOD_ARRAYS } from "@common/constants/semantic";

import { AuthPermissionValidationService } from "../adapters/auth-permission.adapter";

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
  type:
    | "missing_require_permissions"
    | "permission_level_inconsistency"
    | "invalid_permission_combination";
  route: string;
  method: string;
  message: string;
  severity: "high" | "medium" | "low";
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
  private readonly logger = createLogger(PermissionDecoratorValidator.name);

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly permissionValidationService: AuthPermissionValidationService,
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
          this.logger.warn(
            `控制器 ${controllerResult.controller} 存在 ${controllerResult.violations.length} 个权限装饰器问题`,
          );
        }
      } catch (error: any) {
        this.logger.error(`验证控制器失败: ${controller.name}`, {
          error: error.message,
          errorType: error.constructor.name,
        });
      }
    }

    const totalViolations = results.reduce(
      (sum, result) => sum + result.violations.length,
      0,
    );
    const totalRoutes = results.reduce(
      (sum, result) => sum + result.totalRoutes,
      0,
    );

    this.logger.log(`权限装饰器验证完成`, {
      totalControllers: controllers.length,
      totalRoutes,
      totalViolations,
      violationRate:
        totalRoutes > 0
          ? ((totalViolations / totalRoutes) * 100).toFixed(2) + "%"
          : "0%",
    });

    return results;
  }

  /**
   * 验证单个控制器
   */
  private async validateController(
    controller: InstanceWrapper,
  ): Promise<ValidationResult> {
    const routes = this.getRoutes(controller.metatype);
    const violations: PermissionViolation[] = [];

    for (const route of routes) {
      // 检查 @ApiKeyAuth 装饰器是否有对应的 @RequirePermissions
      if (this.hasApiKeyAuth(route) && !this.hasRequirePermissions(route)) {
        violations.push({
          type: "missing_require_permissions",
          route: route.path,
          method: route.method,
          message: "@ApiKeyAuth装饰器必须配合@RequirePermissions使用",
          severity: "high",
          recommendation: "添加 @RequirePermissions(Permission.XXX) 装饰器",
        });
      }

      // 检查权限级别是否合理
      const permissions = this.getRequiredPermissions(route);
      const levelViolation = this.validatePermissionLevel(permissions, route);
      if (levelViolation) {
        violations.push(levelViolation);
      }

      // 检查权限组合是否有效
      const combinationViolation = this.validatePermissionCombination(
        permissions,
        route,
      );
      if (combinationViolation) {
        violations.push(combinationViolation);
      }
    }

    return {
      controller: controller.name || "Unknown",
      violations,
      isValid: violations.length === 0,
      totalRoutes: routes.length,
      validRoutes: routes.length - violations.length,
    };
  }

  /**
   * 获取控制器的所有路由
   */
  private getRoutes(
    controller: any,
  ): Array<{ path: string; method: string; handler: (...args: any[]) => any }> {
    const routes: Array<{
      path: string;
      method: string;
      handler: (...args: any[]) => any;
    }> = [];

    if (!controller || !controller.prototype) {
      return routes;
    }

    const methodNames = this.metadataScanner.getAllMethodNames(
      controller.prototype,
    );

    for (const methodName of methodNames) {
      const method = controller.prototype[methodName];

      if (typeof method === "function") {
        // 检查是否有HTTP方法装饰器（GET, POST, PUT, DELETE等）
        const httpMethods = HTTP_METHOD_ARRAYS.ALL_STANDARD;
        let routeMethod = "";
        let routePath = "";

        for (const httpMethod of httpMethods) {
          const methodMetadata = this.reflector.get(
            `__${httpMethod.toLowerCase()}__`,
            method,
          );
          if (methodMetadata !== undefined) {
            routeMethod = httpMethod;
            routePath = methodMetadata || "";
            break;
          }
        }

        if (routeMethod) {
          routes.push({
            path: `/${routePath}`.replace(/\/+/g, "/"), // 规范化路径
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
    return this.permissionValidationService.hasApiKeyAuth(route.handler);
  }

  /**
   * 检查是否有 @RequirePermissions 装饰器
   */
  private hasRequirePermissions(route: {
    handler: (...args: any[]) => any;
  }): boolean {
    return this.permissionValidationService.hasPermissionRequirements(route.handler);
  }

  /**
   * 获取所需权限
   */
  private getRequiredPermissions(route: {
    handler: (...args: any[]) => any;
  }): string[] {
    return this.permissionValidationService.getRequiredPermissions(route.handler);
  }

  /**
   * 验证权限级别是否合理
   */
  private validatePermissionLevel(
    permissions: string[],
    route: { path: string; method: string },
  ): PermissionViolation | null {
    const validation = this.permissionValidationService.validatePermissionLevel(permissions);
    
    if (validation.isValid) {
      return null;
    }

    return {
      type: "permission_level_inconsistency",
      route: route.path,
      method: route.method,
      message: validation.issues.join('; '),
      severity: "medium",
      recommendation: "使用单一权限级别或建立权限继承关系",
    };
  }

  /**
   * 验证权限组合是否有效
   */
  private validatePermissionCombination(
    permissions: string[],
    route: { path: string; method: string },
  ): PermissionViolation | null {
    const validation = this.permissionValidationService.validatePermissionCombination(permissions);
    
    if (validation.isValid) {
      return null;
    }

    // 根据问题类型确定严重程度
    const severity = validation.issues.some(issue => 
      issue.includes("冲突") || issue.includes("管理员")
    ) ? "medium" : "low";

    return {
      type: "invalid_permission_combination",
      route: route.path,
      method: route.method,
      message: validation.issues.join('; '),
      severity,
      recommendation: "简化权限组合，使用最高级别的必要权限",
    };
  }

  /**
   * 生成验证报告
   */
  generateReport(results: ValidationResult[]): string {
    const totalControllers = results.length;
    const totalViolations = results.reduce(
      (sum, result) => sum + result.violations.length,
      0,
    );
    const totalRoutes = results.reduce(
      (sum, result) => sum + result.totalRoutes,
      0,
    );
    const validControllers = results.filter((r) => r.isValid).length;

    let report = `权限装饰器验证报告\n`;
    report += `======================\n\n`;
    report += `总体统计:\n`;
    report += `- 控制器总数: ${totalControllers}\n`;
    report += `- 路由总数: ${totalRoutes}\n`;
    report += `- 违规总数: ${totalViolations}\n`;
    report += `- 合规控制器: ${validControllers}/${totalControllers} (${((validControllers / totalControllers) * 100).toFixed(1)}%)\n\n`;

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
