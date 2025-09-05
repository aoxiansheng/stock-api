/**
 * 基础常量抽象类
 * 提供统一的常量管理接口和工具方法，确保所有模块常量的一致性
 * 
 * @description
 * - 定义常量管理的标准接口
 * - 提供常量验证和工具方法
 * - 建立常量继承体系的基础
 * - 支持运行时常量验证和调试
 */

/**
 * 常量模块元数据接口
 */
export interface ConstantModuleMetadata {
  /** 模块名称 */
  readonly moduleName: string;
  /** 模块版本 */
  readonly version: string;
  /** 创建时间 */
  readonly createdAt: string;
  /** 最后更新时间 */
  readonly lastUpdated: string;
  /** 模块描述 */
  readonly description: string;
  /** 依赖的统一配置模块 */
  readonly dependencies: readonly string[];
}

/**
 * 常量验证规则接口
 */
export interface ConstantValidationRule<T = any> {
  /** 规则名称 */
  name: string;
  /** 验证函数 */
  validator: (value: T) => boolean;
  /** 错误消息 */
  errorMessage: string;
}

/**
 * 常量组接口
 */
export interface ConstantGroup {
  /** 组名称 */
  readonly name: string;
  /** 组描述 */
  readonly description: string;
  /** 常量键列表 */
  readonly keys: readonly string[];
}

/**
 * 基础常量抽象类
 * 所有模块常量类都应该继承此类或实现其接口
 */
export abstract class BaseConstants {
  /** 模块元数据 */
  protected abstract readonly metadata: ConstantModuleMetadata;
  
  /** 常量分组定义 */
  protected abstract readonly groups: readonly ConstantGroup[];

  /**
   * 获取模块元数据
   */
  public getMetadata(): ConstantModuleMetadata {
    return { ...this.metadata };
  }

  /**
   * 获取常量分组信息
   */
  public getGroups(): readonly ConstantGroup[] {
    return this.groups;
  }

  /**
   * 验证常量配置
   * @param constants 常量对象
   * @param rules 验证规则
   * @returns 验证结果
   */
  protected validateConstants(
    constants: Record<string, any>,
    rules: ConstantValidationRule[]
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const rule of rules) {
      for (const [key, value] of Object.entries(constants)) {
        if (!rule.validator(value)) {
          errors.push(`${key}: ${rule.errorMessage}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取常量的类型信息
   * @param constantName 常量名称
   * @returns 类型信息
   */
  public getConstantType(constantName: string): string {
    const value = (this as any)[constantName];
    if (value === undefined) {
      return 'undefined';
    }
    
    if (Array.isArray(value)) {
      return 'array';
    }
    
    if (typeof value === 'object' && value !== null) {
      return value.constructor.name.toLowerCase();
    }
    
    return typeof value;
  }

  /**
   * 检查常量是否存在
   * @param constantName 常量名称
   * @returns 是否存在
   */
  public hasConstant(constantName: string): boolean {
    return constantName in this;
  }

  /**
   * 获取所有常量键
   * @returns 常量键数组
   */
  public getConstantKeys(): string[] {
    return Object.keys(this).filter(key => !key.startsWith('_') && typeof (this as any)[key] !== 'function');
  }

  /**
   * 生成常量使用报告
   * @returns 使用报告
   */
  public generateUsageReport(): ConstantUsageReport {
    const keys = this.getConstantKeys();
    const report: ConstantUsageReport = {
      moduleName: this.metadata.moduleName,
      totalConstants: keys.length,
      constantsByType: {},
      constantsByGroup: {},
      generatedAt: new Date().toISOString(),
    };

    // 按类型统计
    keys.forEach(key => {
      const type = this.getConstantType(key);
      report.constantsByType[type] = (report.constantsByType[type] || 0) + 1;
    });

    // 按分组统计
    this.groups.forEach(group => {
      report.constantsByGroup[group.name] = group.keys.length;
    });

    return report;
  }
}

/**
 * 常量使用报告接口
 */
export interface ConstantUsageReport {
  /** 模块名称 */
  moduleName: string;
  /** 常量总数 */
  totalConstants: number;
  /** 按类型统计 */
  constantsByType: Record<string, number>;
  /** 按分组统计 */
  constantsByGroup: Record<string, number>;
  /** 生成时间 */
  generatedAt: string;
}

/**
 * 常量管理器单例类
 * 提供全局常量管理功能
 */
export class ConstantManager {
  private static instance: ConstantManager;
  private registeredModules = new Map<string, BaseConstants>();

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): ConstantManager {
    if (!ConstantManager.instance) {
      ConstantManager.instance = new ConstantManager();
    }
    return ConstantManager.instance;
  }

  /**
   * 注册常量模块
   * @param module 常量模块实例
   */
  public registerModule(module: BaseConstants): void {
    const metadata = module.getMetadata();
    this.registeredModules.set(metadata.moduleName, module);
  }

  /**
   * 获取注册的模块
   * @param moduleName 模块名称
   * @returns 模块实例或undefined
   */
  public getModule(moduleName: string): BaseConstants | undefined {
    return this.registeredModules.get(moduleName);
  }

  /**
   * 获取所有注册的模块名称
   * @returns 模块名称数组
   */
  public getRegisteredModules(): string[] {
    return Array.from(this.registeredModules.keys());
  }

  /**
   * 生成全局常量报告
   * @returns 全局报告
   */
  public generateGlobalReport(): GlobalConstantReport {
    const modules = Array.from(this.registeredModules.values());
    const reports = modules.map(module => module.generateUsageReport());

    const globalReport: GlobalConstantReport = {
      totalModules: modules.length,
      totalConstants: reports.reduce((sum, report) => sum + report.totalConstants, 0),
      moduleReports: reports,
      generatedAt: new Date().toISOString(),
    };

    return globalReport;
  }

  /**
   * 验证模块依赖关系
   * @returns 依赖验证结果
   */
  public validateDependencies(): DependencyValidationResult {
    const results: DependencyValidationResult = {
      isValid: true,
      missingDependencies: [],
      circularDependencies: [],
      validatedAt: new Date().toISOString(),
    };

    // 检查缺失的依赖
    for (const module of this.registeredModules.values()) {
      const metadata = module.getMetadata();
      for (const dependency of metadata.dependencies) {
        if (!this.registeredModules.has(dependency)) {
          results.missingDependencies.push({
            module: metadata.moduleName,
            missingDependency: dependency,
          });
          results.isValid = false;
        }
      }
    }

    // 检查循环依赖（简单实现）
    // 在实际应用中，这里需要更复杂的算法来检测循环依赖

    return results;
  }
}

/**
 * 全局常量报告接口
 */
export interface GlobalConstantReport {
  /** 总模块数 */
  totalModules: number;
  /** 总常量数 */
  totalConstants: number;
  /** 各模块报告 */
  moduleReports: ConstantUsageReport[];
  /** 生成时间 */
  generatedAt: string;
}

/**
 * 依赖验证结果接口
 */
export interface DependencyValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 缺失的依赖 */
  missingDependencies: Array<{
    module: string;
    missingDependency: string;
  }>;
  /** 循环依赖 */
  circularDependencies: Array<{
    modules: string[];
  }>;
  /** 验证时间 */
  validatedAt: string;
}

/**
 * 常量工具函数集合
 */
export const ConstantUtils = {
  /**
   * 深度冻结对象
   * @param obj 要冻结的对象
   * @returns 冻结后的对象
   */
  deepFreeze<T>(obj: T): T {
    const propNames = Object.getOwnPropertyNames(obj);

    for (const name of propNames) {
      const value = (obj as any)[name];
      if (value && typeof value === 'object') {
        ConstantUtils.deepFreeze(value);
      }
    }

    return Object.freeze(obj);
  },

  /**
   * 合并常量对象
   * @param target 目标对象
   * @param sources 源对象数组
   * @returns 合并后的对象
   */
  mergeConstants<T>(...sources: Partial<T>[]): T {
    const merged = Object.assign({}, ...sources) as T;
    return ConstantUtils.deepFreeze(merged);
  },

  /**
   * 验证常量命名规范
   * @param name 常量名称
   * @returns 是否符合规范
   */
  isValidConstantName(name: string): boolean {
    // 常量名应该是全大写，用下划线分隔
    return /^[A-Z][A-Z0-9_]*$/.test(name);
  },

  /**
   * 生成常量键的哈希值（用于缓存键等）
   * @param prefix 前缀
   * @param keys 键数组
   * @returns 哈希字符串
   */
  generateConstantHash(prefix: string, ...keys: (string | number)[]): string {
    const combined = `${prefix}:${keys.join(':')}`;
    // 简单哈希实现，实际应用中可能需要更强的哈希算法
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  },
} as const;