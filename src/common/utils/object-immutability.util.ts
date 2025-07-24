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
 * @param visited 已访问的对象集合，用于处理循环引用
 * @returns 已冻结的对象（类型保持不变）
 */
export function deepFreeze<T>(
  object: T,
  visited: WeakSet<object> = new WeakSet(),
): T {
  // 空值检查
  if (object === null || object === undefined) {
    return object;
  }

  // 非对象和非函数类型直接返回
  if (typeof object !== "object" && typeof object !== "function") {
    return object;
  }

  // 检查对象是否已被处理过（避免循环引用）
  if (visited.has(object as unknown as object)) {
    return object; // 已处理过的对象直接返回，避免循环引用导致的栈溢出
  }

  // 添加当前对象到已访问集合
  visited.add(object as unknown as object);

  // 获取对象的所有属性，包括不可枚举属性
  const propNames = Object.getOwnPropertyNames(object);

  // 在冻结对象本身之前，递归冻结所有属性
  for (const name of propNames) {
    const value = (object as any)[name];

    // 如果值是对象、函数且不是null，则递归冻结
    if (
      value &&
      (typeof value === "object" || typeof value === "function") &&
      !Object.isFrozen(value)
    ) {
      deepFreeze(value, visited);
    }
  }

  // 冻结对象本身
  return Object.freeze(object);
}

/**
 * 检查对象是否已被完全冻结（包括所有嵌套对象）
 * @param object 要检查的对象
 * @param visited 已访问的对象集合，用于处理循环引用
 * @returns 如果对象及其所有嵌套对象都被冻结，则返回true
 */
export function isDeepFrozen(
  object: unknown,
  visited: WeakSet<object> = new WeakSet(),
): boolean {
  // 空值或非对象非函数类型视为已冻结
  if (
    object === null ||
    object === undefined ||
    (typeof object !== "object" && typeof object !== "function")
  ) {
    return true;
  }

  // 检查对象本身是否被冻结
  if (!Object.isFrozen(object)) {
    return false;
  }

  // 检查循环引用
  if (visited.has(object as object)) {
    return true; // 已处理过的对象直接返回true，避免循环引用
  }

  // 添加当前对象到已访问集合
  visited.add(object as object);

  // 如果是函数对象，且已被冻结，无需进一步检查属性
  // 因为函数对象的内部属性通常不重要，只要函数本身被冻结即可
  if (typeof object === "function") {
    return true;
  }

  // 递归检查所有属性
  const propNames = Object.getOwnPropertyNames(object);

  return propNames.every((name) => {
    const value = (object as any)[name];
    // 如果值是对象或函数，则递归检查
    if (value && (typeof value === "object" || typeof value === "function")) {
      return isDeepFrozen(value, visited);
    }
    return true;
  });
}
