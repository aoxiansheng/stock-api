/**
 * 权限验证器合约接口
 * 用于解耦权限验证器与认证系统的直接依赖
 *
 * 设计目标：
 * - 降低模块间耦合度
 * - 提供稳定的权限验证接口
 * - 便于测试和扩展
 */

/**
 * 权限常量提供者接口
 * 提供权限相关的元数据键和权限枚举
 */
export interface PermissionConstants {
  /** API Key认证装饰器的元数据键 */
  readonly REQUIRE_API_KEY_METADATA_KEY: string;

  /** 权限装饰器的元数据键 */
  readonly PERMISSIONS_METADATA_KEY: string;

  /** 可用的权限列表 */
  readonly AVAILABLE_PERMISSIONS: readonly string[];

  /** 权限级别分类 */
  readonly PERMISSION_LEVELS: {
    readonly HIGH: readonly string[];
    readonly MEDIUM: readonly string[];
    readonly LOW: readonly string[];
  };
}

/**
 * 权限验证服务合约
 * 定义权限验证所需的核心方法
 */
export interface PermissionValidationContract {
  /**
   * 检查是否有API Key认证装饰器
   */
  hasApiKeyAuth(handler: (...args: any[]) => any): boolean;

  /**
   * 检查是否有权限要求装饰器
   */
  hasPermissionRequirements(handler: (...args: any[]) => any): boolean;

  /**
   * 获取处理器所需的权限列表
   */
  getRequiredPermissions(handler: (...args: any[]) => any): string[];

  /**
   * 验证权限级别是否合理
   */
  validatePermissionLevel(permissions: string[]): {
    isValid: boolean;
    issues: string[];
  };

  /**
   * 验证权限组合是否有效
   */
  validatePermissionCombination(permissions: string[]): {
    isValid: boolean;
    issues: string[];
  };
}

/**
 * 权限元数据提取器接口
 * 负责从装饰器中提取权限相关元数据
 */
export interface PermissionMetadataExtractor {
  /**
   * 从处理器中提取API Key认证标记
   */
  extractApiKeyAuthFlag(handler: (...args: any[]) => any): boolean;

  /**
   * 从处理器中提取所需权限
   */
  extractRequiredPermissions(handler: (...args: any[]) => any): string[];
}
