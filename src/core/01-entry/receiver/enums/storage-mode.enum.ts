/**
 * 存储模式枚举常量
 * 替代字符串联合类型，提高类型安全性和IDE支持
 */

export const StorageMode = {
  NONE: "none", // 不存储数据
  SHORT_TTL: "short_ttl", // 仅短期缓存存储
  BOTH: "both", // 缓存和持久化存储
} as const;

export type StorageMode = (typeof StorageMode)[keyof typeof StorageMode];

/**
 * 存储模式工具类
 * 提供枚举相关的辅助方法
 */
export class StorageModeUtils {
  /**
   * 验证给定字符串是否为有效的存储模式
   * @param mode 待验证的字符串
   * @returns 是否为有效的存储模式
   */
  static isValid(mode: string): mode is StorageMode {
    return Object.values(StorageMode).includes(mode as StorageMode);
  }

  /**
   * 获取存储模式的描述信息
   * @param mode 存储模式
   * @returns 描述信息
   */
  static getDescription(mode: StorageMode): string {
    const descriptions = {
      [StorageMode.NONE]: "不进行数据存储",
      [StorageMode.SHORT_TTL]: "仅短期缓存存储",
      [StorageMode.BOTH]: "缓存和持久化存储",
    };
    return descriptions[mode];
  }

  /**
   * 根据存储模式获取默认TTL值
   * @param mode 存储模式
   * @returns TTL值（秒）
   */
  static getDefaultTTL(mode: StorageMode): number {
    // 引用receiver缓存配置中的TTL值
    const ttlMap = {
      [StorageMode.NONE]: 0,
      [StorageMode.SHORT_TTL]: 5, // 强时效性：5秒
      [StorageMode.BOTH]: 300, // 弱时效性：5分钟
    };
    return ttlMap[mode];
  }

  /**
   * 获取所有可用的存储模式
   * @returns 存储模式数组
   */
  static getAllModes(): StorageMode[] {
    return Object.values(StorageMode);
  }

  /**
   * 获取默认存储模式
   * @returns 默认的存储模式
   */
  static getDefault(): StorageMode {
    return StorageMode.BOTH;
  }
}
