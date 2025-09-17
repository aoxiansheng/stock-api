/**
 * 认证系统权限适配器
 * 实现权限验证合约接口，作为认证系统与权限验证器之间的适配层
 *
 * 职责：
 * - 封装对认证系统的直接依赖
 * - 提供统一的权限验证接口
 * - 转换权限格式和类型
 */

import { Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import {
  PermissionConstants,
  PermissionValidationContract,
  PermissionMetadataExtractor,
} from "../contracts/permission-validator.contract";

// 动态导入认证相关常量，避免编译时依赖
let authConstants: any = null;

/**
 * 认证权限常量实现
 */
@Injectable()
export class AuthPermissionConstants implements PermissionConstants {
  private _constants: {
    REQUIRE_API_KEY_METADATA_KEY: string;
    PERMISSIONS_METADATA_KEY: string;
    AVAILABLE_PERMISSIONS: readonly string[];
    PERMISSION_LEVELS: {
      readonly HIGH: readonly string[];
      readonly MEDIUM: readonly string[];
      readonly LOW: readonly string[];
    };
  } | null = null;

  constructor() {
    this.initializeConstants();
  }

  get REQUIRE_API_KEY_METADATA_KEY(): string {
    return this._constants?.REQUIRE_API_KEY_METADATA_KEY || "require_api_key";
  }

  get PERMISSIONS_METADATA_KEY(): string {
    return this._constants?.PERMISSIONS_METADATA_KEY || "permissions";
  }

  get AVAILABLE_PERMISSIONS(): readonly string[] {
    return this._constants?.AVAILABLE_PERMISSIONS || [];
  }

  get PERMISSION_LEVELS(): {
    readonly HIGH: readonly string[];
    readonly MEDIUM: readonly string[];
    readonly LOW: readonly string[];
  } {
    return (
      this._constants?.PERMISSION_LEVELS || {
        HIGH: [],
        MEDIUM: [],
        LOW: [],
      }
    );
  }

  private async initializeConstants() {
    if (!authConstants) {
      try {
        // 动态导入认证模块常量
        const { REQUIRE_API_KEY } = await import(
          "../../../../auth/decorators/require-apikey.decorator"
        );
        const { PERMISSIONS_KEY } = await import(
          "../../../../auth/decorators/permissions.decorator"
        );
        const { Permission } = await import(
          "../../../../auth/enums/user-role.enum"
        );

        authConstants = {
          REQUIRE_API_KEY,
          PERMISSIONS_KEY,
          Permission,
        };
      } catch (error) {
        // 如果认证模块不可用，使用默认值
        console.warn("认证模块不可用，使用默认权限配置", error);
      }
    }

    // 提取权限枚举值
    const Permission = authConstants?.Permission || {};
    const availablePermissions = Object.values(Permission) as string[];

    // 设置常量值
    this._constants = {
      REQUIRE_API_KEY_METADATA_KEY:
        authConstants?.REQUIRE_API_KEY || "require_api_key",
      PERMISSIONS_METADATA_KEY: authConstants?.PERMISSIONS_KEY || "permissions",
      AVAILABLE_PERMISSIONS: availablePermissions,
      PERMISSION_LEVELS: {
        HIGH: availablePermissions.filter(
          (p) =>
            p.includes("ADMIN") || p.includes("WRITE") || p.includes("DELETE"),
        ),
        MEDIUM: availablePermissions.filter(
          (p) => p.includes("UPDATE") || p.includes("MODIFY"),
        ),
        LOW: availablePermissions.filter(
          (p) => p.includes("READ") || p.includes("VIEW"),
        ),
      },
    };
  }
}

/**
 * 认证权限元数据提取器实现
 */
@Injectable()
export class AuthPermissionMetadataExtractor
  implements PermissionMetadataExtractor
{
  constructor(
    private readonly reflector: Reflector,
    private readonly constants: AuthPermissionConstants,
  ) {}

  extractApiKeyAuthFlag(handler: (...args: any[]) => any): boolean {
    return (
      this.reflector.get(
        this.constants.REQUIRE_API_KEY_METADATA_KEY,
        handler,
      ) === true
    );
  }

  extractRequiredPermissions(handler: (...args: any[]) => any): string[] {
    const permissions = this.reflector.get<string[]>(
      this.constants.PERMISSIONS_METADATA_KEY,
      handler,
    );
    return Array.isArray(permissions) ? permissions : [];
  }
}

/**
 * 认证权限验证服务实现
 */
@Injectable()
export class AuthPermissionValidationService
  implements PermissionValidationContract
{
  constructor(
    private readonly extractor: AuthPermissionMetadataExtractor,
    private readonly constants: AuthPermissionConstants,
  ) {}

  hasApiKeyAuth(handler: (...args: any[]) => any): boolean {
    return this.extractor.extractApiKeyAuthFlag(handler);
  }

  hasPermissionRequirements(handler: (...args: any[]) => any): boolean {
    const permissions = this.extractor.extractRequiredPermissions(handler);
    return permissions.length > 0;
  }

  getRequiredPermissions(handler: (...args: any[]) => any): string[] {
    return this.extractor.extractRequiredPermissions(handler);
  }

  validatePermissionLevel(permissions: string[]): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (permissions.length === 0) {
      return { isValid: true, issues };
    }

    const { HIGH, MEDIUM, LOW } = this.constants.PERMISSION_LEVELS;

    const hasHigh = permissions.some((p) => HIGH.includes(p));
    const hasMedium = permissions.some((p) => MEDIUM.includes(p));
    const hasLow = permissions.some((p) => LOW.includes(p));

    // 检查权限级别一致性
    if (hasHigh && hasLow) {
      issues.push("权限级别不一致：同时包含高级和低级权限");
    }

    if (hasHigh && hasMedium && hasLow) {
      issues.push("权限级别过于复杂：包含所有级别的权限");
    }

    return { isValid: issues.length === 0, issues };
  }

  validatePermissionCombination(permissions: string[]): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (permissions.length <= 1) {
      return { isValid: true, issues };
    }

    // 检查读权限重复
    const readPermissions = permissions.filter((p) => p.includes("READ"));
    if (readPermissions.length > 1) {
      issues.push("存在多个读取权限，可能造成权限冗余");
    }

    // 检查写权限重复
    const writePermissions = permissions.filter((p) => p.includes("WRITE"));
    if (writePermissions.length > 1) {
      issues.push("存在多个写入权限，可能造成权限冲突");
    }

    // 检查管理员权限与其他权限的组合
    const adminPermissions = permissions.filter((p) => p.includes("ADMIN"));
    if (adminPermissions.length > 0 && permissions.length > 1) {
      issues.push("管理员权限不应与其他权限组合使用");
    }

    return { isValid: issues.length === 0, issues };
  }
}
