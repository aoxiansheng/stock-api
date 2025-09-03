/**
 * 异步测试辅助工具
 * 提供更可靠的异步操作等待机制，减少测试中的时序问题
 */

/**
 * 等待条件满足的选项
 */
interface WaitForConditionOptions {
  timeout?: number; // 最大等待时间（毫秒）
  interval?: number; // 检查间隔（毫秒）
  timeoutMessage?: string; // 超时错误消息
}

/**
 * 等待指定条件为真
 * @param condition 条件函数，返回 boolean 或 Promise<boolean>
 * @param options 等待选项
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  options: WaitForConditionOptions = {},
): Promise<void> {
  const {
    timeout = 5000,
    interval = 50,
    timeoutMessage = "Condition not met within timeout",
  } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const result = await condition();
      if (result) {
        return;
      }
    } catch (error) {
      // 如果条件函数抛出错误，继续等待
      console.debug("Condition check failed:", error.message);
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`${timeoutMessage} (waited ${timeout}ms)`);
}

/**
 * 等待数组长度达到指定值
 */
export async function waitForArrayLength<T>(
  getArray: () => T[] | Promise<T[]>,
  expectedLength: number,
  options: WaitForConditionOptions = {},
): Promise<T[]> {
  let finalArray: T[] = [];

  await waitForCondition(
    async () => {
      finalArray = await getArray();
      return finalArray.length === expectedLength;
    },
    {
      ...options,
      timeoutMessage: `Array length did not reach ${expectedLength} within timeout (current: ${finalArray.length})`,
    },
  );

  return finalArray;
}

/**
 * 等待对象属性值满足条件
 */
export async function waitForProperty<T, K extends keyof T>(
  getObject: () => T | Promise<T>,
  property: K,
  expectedValue: T[K] | ((value: T[K]) => boolean),
  options: WaitForConditionOptions = {},
): Promise<T> {
  let finalObject: T;

  await waitForCondition(
    async () => {
      finalObject = await getObject();
      const actualValue = finalObject[property];

      if (typeof expectedValue === "function") {
        return (expectedValue as (value: T[K]) => boolean)(actualValue);
      } else {
        return actualValue === expectedValue;
      }
    },
    {
      ...options,
      timeoutMessage: `Property '${String(property)}' did not match expected value within timeout`,
    },
  );

  return finalObject!;
}

/**
 * 等待事件发射
 */
export async function waitForEvent(
  eventEmitter: {
    once: (event: string, listener: (...args: any[]) => void) => void;
  },
  eventName: string,
  options: { timeout?: number } = {},
): Promise<any[]> {
  const { timeout = 5000 } = options;

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Event '${eventName}' not emitted within ${timeout}ms`));
    }, timeout);

    eventEmitter.once(eventName, (...args) => {
      clearTimeout(timeoutId);
      resolve(args);
    });
  });
}

/**
 * 等待HTTP请求完成（用于集成测试）
 */
export async function waitForHttpRequest(
  makeRequest: () => Promise<any>,
  successCondition?: (response: any) => boolean,
  options: WaitForConditionOptions = {},
): Promise<any> {
  let lastResponse: any;
  let lastError: Error | null = null;

  await waitForCondition(
    async () => {
      try {
        lastResponse = await makeRequest();

        if (successCondition) {
          return successCondition(lastResponse);
        } else {
          return lastResponse.status >= 200 && lastResponse.status < 300;
        }
      } catch (error) {
        lastError = error;
        return false;
      }
    },
    {
      ...options,
      timeoutMessage: `HTTP request did not succeed within timeout. Last error: ${lastError?.message}`,
    },
  );

  return lastResponse;
}

/**
 * 等待数据库操作完成
 */
export async function waitForDatabaseOperation<T>(
  operation: () => Promise<T>,
  validator?: (result: T) => boolean,
  options: WaitForConditionOptions = {},
): Promise<T> {
  let result: T;
  let lastError: Error | null = null;

  await waitForCondition(
    async () => {
      try {
        result = await operation();

        if (validator) {
          return validator(result);
        } else {
          return result !== null && result !== undefined;
        }
      } catch (error) {
        lastError = error;
        return false;
      }
    },
    {
      ...options,
      timeoutMessage: `Database operation did not complete successfully within timeout. Last error: ${lastError?.message}`,
    },
  );

  return result!;
}

/**
 * 等待Redis操作完成
 */
export async function waitForRedisOperation<T>(
  redisClient: any,
  operation: string,
  key: string,
  expectedValue?: any,
  options: WaitForConditionOptions = {},
): Promise<T> {
  let result: T;

  await waitForCondition(
    async () => {
      try {
        switch (operation) {
          case "exists":
            result = (await redisClient.exists(key)) as T;
            return expectedValue !== undefined
              ? result === expectedValue
              : !!result;

          case "get":
            result = (await redisClient.get(key)) as T;
            return expectedValue !== undefined
              ? result === expectedValue
              : result !== null;

          case "keys":
            result = (await redisClient.keys(key)) as T;
            return expectedValue !== undefined
              ? (result as unknown as any[]).length === expectedValue
              : (result as unknown as any[]).length > 0;

          default:
            result = (await redisClient[operation](key)) as T;
            return expectedValue !== undefined
              ? result === expectedValue
              : !!result;
        }
      } catch (error) {
        console.debug(`Redis ${operation} operation failed:`, error.message);
        return false;
      }
    },
    {
      ...options,
      timeoutMessage: `Redis ${operation} operation on key '${key}' did not complete within timeout`,
    },
  );

  return result!;
}

/**
 * 等待多个异步操作完成
 */
export async function waitForAll<T>(
  operations: (() => Promise<T>)[],
  options: WaitForConditionOptions = {},
): Promise<T[]> {
  let results: (T | Error)[] = [];

  await waitForCondition(
    async () => {
      results = await Promise.allSettled(operations.map((op) => op())).then(
        (results) =>
          results.map((result) =>
            result.status === "fulfilled" ? result.value : result.reason,
          ),
      );

      // 检查是否所有操作都成功
      return results.every((result) => !(result instanceof Error));
    },
    {
      ...options,
      timeoutMessage: `Not all operations completed successfully within timeout. Errors: ${results
        .filter((r) => r instanceof Error)
        .map((e) => (e as Error).message)
        .join(", ")}`,
    },
  );

  return results.filter((r) => !(r instanceof Error)) as T[];
}

/**
 * 智能延迟等待（根据环境自动调整）
 * 在CI环境中使用更长的延迟
 */
export async function smartDelay(baseMs: number = 100): Promise<void> {
  const isCI = process.env.CI === "true" || process.env.NODEENV === "ci";
  const isDebug = process.env.NODE_ENV === "debug";

  let actualDelay = baseMs;

  if (isCI) {
    actualDelay *= 3; // CI环境延迟3倍
  } else if (isDebug) {
    actualDelay *= 2; // 调试环境延迟2倍
  }

  await new Promise((resolve) => setTimeout(resolve, actualDelay));
}

/**
 * 重试机制
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    backoff?: boolean;
    condition?: (error: Error) => boolean;
  } = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 100,
    backoff = false,
    condition = () => true,
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !condition(error)) {
        throw error;
      }

      const waitTime = backoff ? delay * attempt : delay;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw lastError!;
}

/**
 * 超时包装器
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = "Operation timed out",
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs),
    ),
  ]);
}

/**
 * 事件监听器，等待多个事件
 */
export class EventWaiter {
  private events: Map<string, any[]> = new Map();
  private eventEmitter: any;

  constructor(eventEmitter: any) {
    this.eventEmitter = eventEmitter;
  }

  /**
   * 开始监听事件
   */
  startListening(eventNames: string[]): void {
    eventNames.forEach((eventName) => {
      this.events.set(eventName, []);
      this.eventEmitter.on(eventName, (...args: any[]) => {
        const events = this.events.get(eventName) || [];
        events.push(args);
        this.events.set(eventName, events);
      });
    });
  }

  /**
   * 等待指定事件发生指定次数
   */
  async waitForEvents(
    eventName: string,
    expectedCount: number,
    options: WaitForConditionOptions = {},
  ): Promise<any[][]> {
    await waitForCondition(
      () => {
        const events = this.events.get(eventName) || [];
        return events.length >= expectedCount;
      },
      {
        ...options,
        timeoutMessage: `Event '${eventName}' did not occur ${expectedCount} times within timeout`,
      },
    );

    return this.events.get(eventName) || [];
  }

  /**
   * 清理事件监听器
   */
  cleanup(): void {
    this.events.clear();
    this.eventEmitter.removeAllListeners();
  }

  /**
   * 获取事件统计
   */
  getEventCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    this.events.forEach((events, eventName) => {
      counts[eventName] = events.length;
    });
    return counts;
  }
}

/**
 * 测试环境检测
 */
export const TestEnvironment = {
  isCI: () => process.env.CI === "true" || process.env.NODE_ENV === "ci",
  isDebug: () => process.env.NODE_ENV === "debug",
  isIntegration: () => process.env.TESTTYPE === "integration",
  isE2E: () => process.env.TEST_TYPE === "e2e",

  /**
   * 获取适合当前环境的超时时间
   */
  getTimeout(baseTimeout: number): number {
    if (this.isCI()) return baseTimeout * 5;
    if (this.isDebug()) return baseTimeout * 3;
    if (this.isE2E()) return baseTimeout * 2;
    return baseTimeout;
  },

  /**
   * 获取适合当前环境的延迟时间
   */
  getDelay(baseDelay: number): number {
    if (this.isCI()) return baseDelay * 3;
    if (this.isDebug()) return baseDelay * 2;
    return baseDelay;
  },
};
