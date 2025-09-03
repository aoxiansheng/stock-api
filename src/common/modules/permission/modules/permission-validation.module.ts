import { Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";

import { PermissionDecoratorValidator } from "../validators/permission-decorator.validator";
import { PermissionValidationService } from "../services/permission-validation.service";

/**
 * 权限验证模块
 *
 * 提供权限装饰器验证功能，在应用启动时自动检查权限装饰器的使用规范
 */
@Module({
  imports: [DiscoveryModule],
  providers: [PermissionDecoratorValidator, PermissionValidationService],
  exports: [PermissionDecoratorValidator, PermissionValidationService],
})
export class PermissionValidationModule {}
