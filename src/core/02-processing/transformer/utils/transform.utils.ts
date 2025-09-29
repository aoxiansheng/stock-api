import { plainToClass, ClassConstructor } from 'class-transformer';

/**
 * 安全转换工具函数
 * 用于将普通对象安全地转换为 DTO 类实例，并处理循环引用等问题
 */

/**
 * 安全转换函数，将普通对象转换为指定的 DTO 类实例
 * 处理循环引用和其他潜在的序列化问题
 * 
 * @param cls 目标 DTO 类构造函数
 * @param plain 要转换的普通对象
 * @returns 转换后的 DTO 实例
 */
export function safeTransform<T, V extends Record<string, any>>(
  cls: ClassConstructor<T>,
  plain: V
): T {
  try {
    // 首先检查是否存在循环引用
    if (hasCircularReference(plain)) {
      // 如果存在循环引用，创建一个包含无效数据的对象，这样会在验证时失败
      const sanitizedPlain = sanitizeCircularReferences(plain);
      // 使用自定义验证器检测循环引用标记
      const result = plainToClass(cls, sanitizedPlain, {
        excludeExtraneousValues: false,
        enableImplicitConversion: true,
      });
      return result;
    }
    
    // 使用 class-transformer 进行转换
    return plainToClass(cls, plain, {
      excludeExtraneousValues: false,
      enableImplicitConversion: true,
    });
  } catch (error) {
    // 如果转换失败，返回一个基本的实例
    console.warn('Safe transform failed, falling back to basic transformation:', error);
    return plainToClass(cls, plain, {
      excludeExtraneousValues: false,
      enableImplicitConversion: true,
    });
  }
}

/**
 * 清理对象中的循环引用
 * 将循环引用的属性设置为 null 或简化表示
 * 
 * @param obj 要清理的对象
 * @param visited 已访问的对象集合（用于检测循环引用）
 * @returns 清理后的对象
 */
function sanitizeCircularReferences(obj: any, visited = new WeakSet()): any {
  // 如果是 null 或非对象类型，直接返回
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // 如果已经访问过，说明存在循环引用
  if (visited.has(obj)) {
    // 返回一个无效的值，这会导致 @IsObject() 验证失败
    return '[CIRCULAR_REFERENCE_INVALID]';
  }

  // 标记为已访问
  visited.add(obj);

  try {
    // 如果是数组
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeCircularReferences(item, visited));
    }

    // 如果是普通对象
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        try {
          sanitized[key] = sanitizeCircularReferences(obj[key], visited);
        } catch (error) {
          // 如果某个属性处理失败，设置为错误信息
          sanitized[key] = `[Error processing property: ${error.message}]`;
        }
      }
    }

    return sanitized;
  } finally {
    // 清理完成后从已访问集合中移除
    visited.delete(obj);
  }
}

/**
 * 验证对象是否包含循环引用
 * 
 * @param obj 要检查的对象
 * @returns 如果包含循环引用返回 true，否则返回 false
 */
export function hasCircularReference(obj: any, visited = new WeakSet()): boolean {
  if (obj === null || typeof obj !== 'object') {
    return false;
  }

  if (visited.has(obj)) {
    return true;
  }

  visited.add(obj);

  try {
    if (Array.isArray(obj)) {
      return obj.some(item => hasCircularReference(item, visited));
    }

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (hasCircularReference(obj[key], visited)) {
          return true;
        }
      }
    }

    return false;
  } finally {
    visited.delete(obj);
  }
}
