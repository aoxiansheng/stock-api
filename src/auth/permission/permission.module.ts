/**
 * 权限模块
 * 提供权限验证相关的服务和适配器
 */

import { Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";

import {
  AuthPermissionConstants,
  AuthPermissionMetadataExtractor,
  AuthPermissionValidationService,
} from "./adapters/auth-permission.adapter";
import { PermissionDecoratorValidator } from "./validators/permission-decorator.validator";

@Module({
  imports: [DiscoveryModule],
  providers: [
    AuthPermissionConstants,
    AuthPermissionMetadataExtractor,
    AuthPermissionValidationService,
    PermissionDecoratorValidator,
  ],
  exports: [AuthPermissionValidationService, PermissionDecoratorValidator],
})
export class PermissionModule {}
