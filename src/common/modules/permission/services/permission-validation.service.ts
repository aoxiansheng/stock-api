import { Injectable, OnApplicationBootstrap } from '@nestjs/common';

import { createLogger } from "@app/config/logger.config";
import { PermissionDecoratorValidator, ValidationResult } from '../validators/permission-decorator.validator';

/**
 * 权限验证服务
 * 
 * 在应用启动时自动验证权限装饰器，并提供手动验证接口
 */
@Injectable()
export class PermissionValidationService implements OnApplicationBootstrap {
  private readonly logger = createLogger(PermissionValidationService.name);
  private lastValidationResult: ValidationResult[] = [];

  constructor(
    private readonly permissionValidator: PermissionDecoratorValidator,
  ) {}

  /**
   * 应用启动完成后自动验证（此时所有路由已注册）
   */
  async onApplicationBootstrap() {
    try {
      this.logger.log('应用启动完成后进行权限装饰器验证...');
      await this.validatePermissions();
    } catch (error: any) {
      this.logger.error('权限装饰器验证失败', {
        error: error.message,
        errorType: error.constructor.name,
      });
    }
  }

  /**
   * 执行权限验证
   */
  async validatePermissions(): Promise<ValidationResult[]> {
    this.logger.log('开始执行权限装饰器验证...');
    
    const startTime = Date.now();
    const results = await this.permissionValidator.validateAllControllers();
    const duration = Date.now() - startTime;

    this.lastValidationResult = results;

    const totalViolations = results.reduce((sum, result) => sum + result.violations.length, 0);
    const totalRoutes = results.reduce((sum, result) => sum + result.totalRoutes, 0);

    if (totalViolations === 0) {
      this.logger.log(`✅ 权限装饰器验证通过`, {
        totalControllers: results.length,
        totalRoutes,
        duration: `${duration}ms`,
      });
    } else {
      this.logger.warn(`⚠️ 发现权限装饰器问题`, {
        totalControllers: results.length,
        totalRoutes,
        totalViolations,
        violationRate: `${(totalViolations / totalRoutes * 100).toFixed(2)}%`,
        duration: `${duration}ms`,
      });

      // 输出详细的违规信息
      const report = this.permissionValidator.generateReport(results);
      this.logger.warn('权限装饰器验证报告:', report);
    }

    return results;
  }

  /**
   * 获取最后一次验证结果
   */
  getLastValidationResult(): ValidationResult[] {
    return this.lastValidationResult;
  }

  /**
   * 获取验证统计信息
   */
  getValidationStats() {
    const totalControllers = this.lastValidationResult.length;
    const totalViolations = this.lastValidationResult.reduce((sum, result) => sum + result.violations.length, 0);
    const totalRoutes = this.lastValidationResult.reduce((sum, result) => sum + result.totalRoutes, 0);
    const validControllers = this.lastValidationResult.filter(r => r.isValid).length;

    return {
      totalControllers,
      totalRoutes,
      totalViolations,
      validControllers,
      violationRate: totalRoutes > 0 ? (totalViolations / totalRoutes * 100) : 0,
      complianceRate: totalControllers > 0 ? (validControllers / totalControllers * 100) : 100,
      lastValidation: new Date().toISOString(),
    };
  }

  /**
   * 检查是否有高危险级别的违规
   */
  hasHighSeverityViolations(): boolean {
    return this.lastValidationResult.some(result => 
      result.violations.some(violation => violation.severity === 'high')
    );
  }

  /**
   * 获取高危险级别的违规列表
   */
  getHighSeverityViolations() {
    const highSeverityViolations = [];
    
    for (const result of this.lastValidationResult) {
      const highViolations = result.violations.filter(v => v.severity === 'high');
      if (highViolations.length > 0) {
        highSeverityViolations.push({
          controller: result.controller,
          violations: highViolations,
        });
      }
    }

    return highSeverityViolations;
  }

  /**
   * 生成权限装饰器使用指南
   */
  generateUsageGuide(): string {
    return `
权限装饰器使用指南
==================

## 基本规则

1. **API Key认证端点**
   必须同时使用 @ApiKeyAuth() 和 @RequirePermissions()：
   
   \`\`\`typescript
   @ApiKeyAuth()
   @RequirePermissions(Permission.DATA_READ)
   @Post('data')
   async getData() { ... }
   \`\`\`

2. **JWT认证端点**
   使用 @Auth() 装饰器：
   
   \`\`\`typescript
   @Auth([UserRole.ADMIN])
   @Get('admin-only')
   async adminFunction() { ... }
   \`\`\`

3. **公开端点**
   使用 @Public() 装饰器，并考虑添加频率限制：
   
   \`\`\`typescript
   @Public()
   @UseGuards(ThrottlerGuard)
   @Throttle({ default: { limit: 60, ttl: 60000 } })
   @Get('public-data')
   async getPublicData() { ... }
   \`\`\`

## 权限级别

- **基础数据权限**: DATA_READ, PROVIDERS_READ, QUERY_EXECUTE
- **业务操作权限**: TRANSFORMER_PREVIEW, QUERY_STATS
- **配置管理权限**: CONFIG_READ, CONFIG_WRITE, MAPPING_WRITE
- **系统监控权限**: SYSTEM_MONITOR, SYSTEM_HEALTH
- **系统管理权限**: SYSTEM_ADMIN

## 最佳实践

1. 遵循最小权限原则
2. 避免权限级别混合使用
3. 为公开端点添加适当的频率限制
4. 过滤健康检查端点的敏感信息
5. 定期运行权限装饰器验证

## 常见错误

1. @ApiKeyAuth() 没有配合 @RequirePermissions() 使用
2. 公开端点缺少频率限制保护
3. 健康检查端点泄露系统内部信息
4. 权限级别设置过高或过低

## 验证工具

运行权限装饰器验证：
- 启动应用时自动验证
- 使用 PermissionValidationService 手动验证
- 查看详细的验证报告和建议
`;
  }
}