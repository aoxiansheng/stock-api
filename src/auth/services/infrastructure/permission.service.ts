import { Injectable } from "@nestjs/common";

import { createLogger } from "@common/logging/index";

import { CacheService } from "../../../cache/services/cache.service";
import { securityConfig } from "@auth/config/security.config";
// 🆕 引入新的统一配置系统 - 与现有配置并存
import { AuthConfigCompatibilityWrapper } from "../../config/compatibility-wrapper";
// 更新导入路径，从utils导入PermissionTemplateUtil
import { CONSTANTS } from "@common/constants";

// 简化的权限操作和消息常量
const PERMISSION_OPERATIONS = {
  CHECK_PERMISSIONS: "checkPermissions",
  INVALIDATE_CACHE: "invalidateCacheFor"
};

const PERMISSION_EXTENDED_MESSAGES = {
  PERMISSION_CHECK_STARTED: "开始权限检查",
  CACHE_HIT: "权限检查命中缓存",
  CACHE_MISS: "权限检查缓存未命中",
  CHECK_FAILED: "权限检查失败",
  CHECK_PASSED: "权限检查通过",
  CACHE_INVALIDATED: "权限缓存已失效",
  NO_CACHE_TO_INVALIDATE: "未找到需要失效的权限缓存",
  CACHE_INVALIDATION_FAILED: "权限缓存失效失败"
};

// 从工具文件导入PermissionTemplateUtil
import { PermissionTemplateUtil } from "../../utils/permission.utils";

import { Permission, UserRole } from "../../enums/user-role.enum";
import {
  AuthSubject,
  PermissionContext,
} from "../../interfaces/auth-subject.interface";

/**
 * 权限验证结果
 */
export interface PermissionCheckResult {
  /** 是否有权限 */
  allowed: boolean;

  /** 缺失的权限 */
  missingPermissions: Permission[];

  /** 缺失的角色 */
  missingRoles: UserRole[];

  /** 检查耗时（毫秒） */
  duration: number;

  /** 详细信息 */
  details: string;
}

@Injectable()
export class PermissionService {
  private readonly logger = createLogger(PermissionService.name);
  // 🎯 使用集中化的配置 - 保留原有配置作为后备
  private readonly legacyConfig = securityConfig.permission;

  constructor(
    private readonly cacheService: CacheService,
    // 🆕 可选注入新配置系统 - 如果可用则使用，否则回退到原配置
    private readonly authConfig?: AuthConfigCompatibilityWrapper,
  ) {}

  // 🆕 统一配置访问方法 - 优先使用新配置，回退到原配置
  private get config() {
    if (this.authConfig) {
      // 使用新的统一配置系统
      const newConfig = {
        cacheTtlSeconds: this.authConfig.PERMISSION_CHECK.CACHE_TTL_SECONDS,
        cachePrefix: "perm", // 保持与原配置一致
      };
      
      // 🔍 调试日志：记录使用新配置系统
      this.logger.debug('PermissionService: 使用新统一配置系统', {
        configSource: 'AuthConfigCompatibilityWrapper',
        cacheTtlSeconds: newConfig.cacheTtlSeconds,
        cachePrefix: newConfig.cachePrefix,
      });
      
      return newConfig;
    }
    
    // 回退到原有配置
    this.logger.debug('PermissionService: 回退到原有配置系统', {
      configSource: 'securityConfig.permission',
      cacheTtlSeconds: this.legacyConfig.cacheTtlSeconds,
      cachePrefix: this.legacyConfig.cachePrefix,
    });
    
    return this.legacyConfig;
  }

  /**
   * 检查权限
   */
  async checkPermissions(
    subject: AuthSubject,
    requiredPermissions: Permission[] = [],
    requiredRoles: UserRole[] = [],
  ): Promise<PermissionCheckResult> {
    const operation = PERMISSION_OPERATIONS.CHECK_PERMISSIONS;
    const startTime = Date.now();

    this.logger.debug(PERMISSION_EXTENDED_MESSAGES.PERMISSION_CHECK_STARTED, {
      operation,
      subject: subject.getDisplayName(),
      requiredPermissions,
      requiredRoles,
    });

    // 生成缓存键
    const cacheKey = this.generateCacheKey(
      subject,
      requiredPermissions,
      requiredRoles,
    );

    try {
      // 检查缓存
      const cachedResult =
        await this.cacheService.get<PermissionCheckResult>(cacheKey);
      if (cachedResult) {
        this.logger.debug(PERMISSION_EXTENDED_MESSAGES.CACHE_HIT, {
          operation,
          subject: subject.getDisplayName(),
          cache: "hit",
        });
        return cachedResult;
      } else {
        this.logger.debug(PERMISSION_EXTENDED_MESSAGES.CACHE_MISS, {
          operation,
          subject: subject.getDisplayName(),
          cache: "miss",
        });
      }

      // 执行权限检查
      const result = this.performPermissionCheck(
        subject,
        requiredPermissions,
        requiredRoles,
      );
      result.duration = Date.now() - startTime;

      // 缓存结果
      await this.cacheService.set(cacheKey, result, {
        ttl: this.config.cacheTtlSeconds,
      });

      // 记录权限检查日志
      this.logPermissionCheck(
        subject,
        requiredPermissions,
        requiredRoles,
        result,
      );

      return result;
    } catch (error) {
      this.logger.error(PERMISSION_EXTENDED_MESSAGES.CHECK_FAILED, {
        operation,
        subject: subject.getDisplayName(),
        requiredPermissions,
        requiredRoles,
        error: error.stack,
      });
      // 🎯 重新抛出原始错误
      throw error;
    }
  }

  /**
   * 执行实际的权限检查
   */
  private performPermissionCheck(
    subject: AuthSubject,
    requiredPermissions: Permission[],
    requiredRoles: UserRole[],
  ): PermissionCheckResult {
    const missingPermissions: Permission[] = [];
    const missingRoles: UserRole[] = [];

    // 检查权限
    for (const permission of requiredPermissions) {
      if (!subject.hasPermission(permission)) {
        missingPermissions.push(permission);
      }
    }

    // 检查角色（如果需要）
    if (requiredRoles.length > 0) {
      const subjectRole = subject.role;
      if (!subjectRole || !requiredRoles.includes(subjectRole)) {
        missingRoles.push(...requiredRoles);
      }
    }

    const allowed =
      missingPermissions.length === 0 && missingRoles.length === 0;

    return {
      allowed,
      missingPermissions,
      missingRoles,
      duration: 0, // 将在调用方设置
      details: this.generateCheckDetails(
        subject,
        {
          requiredPermissions,
          requiredRoles,
          missingPermissions,
          missingRoles,
        },
        allowed,
      ),
    };
  }

  /**
   * 获取有效权限
   */
  getEffectivePermissions(subject: AuthSubject): Permission[] {
    return [...subject.permissions];
  }

  /**
   * 组合多个权限列表
   */
  combinePermissions(...permissionLists: Permission[][]): Permission[] {
    const combined = new Set<Permission>(permissionLists.flat());
    return Array.from(combined);
  }

  /**
   * 创建权限上下文
   */
  async createPermissionContext(
    subject: AuthSubject,
    requiredPermissions: Permission[] = [],
    requiredRoles: UserRole[] = [],
  ): Promise<PermissionContext> {
    const checkResult = await this.checkPermissions(
      subject,
      requiredPermissions,
      requiredRoles,
    );

    return {
      subject,
      requiredPermissions,
      requiredRoles,
      grantedPermissions: this.getEffectivePermissions(subject),
      hasAccess: checkResult.allowed,
      details: {
        missingPermissions: checkResult.missingPermissions,
        timestamp: new Date(),
        duration: checkResult.duration,
      },
    };
  }

  /**
   * 使指定主体的权限缓存失效
   * @param subject 权限主体
   */
  async invalidateCacheFor(subject: AuthSubject): Promise<void> {
    const operation = PERMISSION_OPERATIONS.INVALIDATE_CACHE;
    const pattern = `${this.config.cachePrefix}:${subject.type}:${subject.id}:*`;

    try {
      // 🎯 修复: 使用 CacheService 中提供的 delByPattern 方法
      const deletedCount = await this.cacheService.delByPattern(pattern);

      if (deletedCount > 0) {
        this.logger.log(PERMISSION_EXTENDED_MESSAGES.CACHE_INVALIDATED, {
          operation,
          subject: subject.getDisplayName(),
          deletedCount,
          pattern,
        });
      } else {
        this.logger.debug(PERMISSION_EXTENDED_MESSAGES.NO_CACHE_TO_INVALIDATE, {
          operation,
          subject: subject.getDisplayName(),
          pattern,
        });
      }
    } catch (error) {
      this.logger.error(PERMISSION_EXTENDED_MESSAGES.CACHE_INVALIDATION_FAILED, {
        operation,
        subject: subject.getDisplayName(),
        pattern,
        error: error.stack,
      });
      throw error;
    }
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(
    subject: AuthSubject,
    permissions: Permission[],
    roles: UserRole[],
  ): string {
    const permissionsStr = permissions.sort().join(",");
    const rolesStr = roles.sort().join(",");
    return `${this.config.cachePrefix}:${subject.type}:${subject.id}:${permissionsStr}:${rolesStr}`;
  }

  /**
   * 生成检查详情
   */
  private generateCheckDetails(
    subject: AuthSubject,
    context: {
      requiredPermissions: Permission[];
      requiredRoles: UserRole[];
      missingPermissions: Permission[];
      missingRoles: UserRole[];
    },
    allowed: boolean,
  ): string {
    if (allowed) {
      return PermissionTemplateUtil.generateDetails("CHECK_PASSED", {
        subjectName: subject.getDisplayName(),
      });
    }

    const details: string[] = [
      PermissionTemplateUtil.generateDetails("CHECK_FAILED", {
        subjectName: subject.getDisplayName(),
      }),
    ];

    if (context.missingPermissions.length > 0) {
      details.push(
        PermissionTemplateUtil.generateDetails("MISSING_PERMISSIONS", {
          permissions: context.missingPermissions,
        }),
      );
    }

    if (context.missingRoles.length > 0) {
      details.push(
        PermissionTemplateUtil.generateDetails("REQUIRED_ROLES", {
          requiredRoles: context.requiredRoles,
          currentRole: subject.role || "N/A",
        }),
      );
    }

    return details.join("; ");
  }

  /**
   * 记录权限检查日志
   */
  private logPermissionCheck(
    subject: AuthSubject,
    requiredPermissions: Permission[],
    requiredRoles: UserRole[],
    result: PermissionCheckResult,
  ): void {
    const logLevel = result.allowed ? "debug" : "warn";
    const message = result.allowed
      ? PERMISSION_EXTENDED_MESSAGES.CHECK_PASSED
      : PERMISSION_EXTENDED_MESSAGES.CHECK_FAILED;

    this.logger[logLevel]({
      subject: subject.getDisplayName(),
      subjectType: subject.type,
      subjectId: subject.id,
      requiredPermissions,
      requiredRoles,
      grantedPermissions: [...subject.permissions],
      allowed: result.allowed,
      missingPermissions: result.missingPermissions,
      missingRoles: result.missingRoles,
      durationMs: result.duration,
      message,
    });
  }
}