/**
 * 对象不可变性相关工具函数
 * 用于创建不可变对象，确保数据安全性
 */

/**
 * 深度冻结对象及其所有嵌套属性
 * 递归冻结对象的每个属性，确保整个对象树都是不可变的
 * 
 * 使用场景：
 * - 常量对象定义
 * - 配置对象保护
 * - 防止意外修改共享状态
 * 
 * @param object 要冻结的对象
 * @returns 已冻结的对象（类型保持不变）
 */
export function deepFreeze<T>(object: T): T {
  // 空值检查
  if (object === null || object === undefined) {
    return object;
  }
  
  // 非对象类型直接返回
  if (typeof object !== 'object') {
    return object;
  }
  
  // 获取对象的所有属性，包括不可枚举属性
  const propNames = Object.getOwnPropertyNames(object);

  // 在冻结对象本身之前，递归冻结所有属性
  for (const name of propNames) {
    const value = (object as any)[name];

    // 如果值是对象且不是null，则递归冻结
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }

  // 冻结对象本身
  return Object.freeze(object);
}

/**
 * 检查对象是否已被完全冻结（包括所有嵌套对象）
 * @param object 要检查的对象
 * @returns 如果对象及其所有嵌套对象都被冻结，则返回true
 */
export function isDeepFrozen(object: unknown): boolean {
  // 空值或非对象类型视为已冻结
  if (object === null || object === undefined || typeof object !== 'object') {
    return true;
  }
  
  // 检查对象本身是否被冻结
  if (!Object.isFrozen(object)) {
    return false;
  }
  
  // 递归检查所有属性
  const propNames = Object.getOwnPropertyNames(object);
  
  return propNames.every(name => {
    const value = (object as any)[name];
    // 如果值是对象，则递归检查
    if (value && typeof value === 'object') {
      return isDeepFrozen(value);
    }
    return true;
  });
} 