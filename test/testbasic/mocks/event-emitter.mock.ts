/**
 * 标准化EventEmitter Mock - 提供事件发射器模拟
 * 用于单元测试中隔离事件依赖
 */

export const eventEmitterMockFactory = () => {
  const events = new Map<string, Array<{listener: Function, once: boolean}>>();

  const mockEmitter: any = {
    // 事件发射
    emit: jest.fn().mockImplementation((event: string, ...args: any[]) => {
      const listeners = events.get(event) || [];
      let hasListeners = false;

      listeners.forEach(({ listener, once }) => {
        hasListeners = true;
        try {
          listener.apply(null, args);
        } catch (error) {
          // 静默处理监听器错误，模拟真实EventEmitter行为
        }
      });

      // 移除once监听器
      if (hasListeners) {
        const remainingListeners = listeners.filter(({ once }) => !once);
        if (remainingListeners.length > 0) {
          events.set(event, remainingListeners);
        } else {
          events.delete(event);
        }
      }

      return hasListeners;
    }),

    // 添加监听器
    on: jest.fn().mockImplementation((event: string, listener: Function) => {
      if (!events.has(event)) {
        events.set(event, []);
      }
      const eventListeners = events.get(event);
      if (eventListeners) {
        eventListeners.push({ listener, once: false });
      }
      return mockEmitter;
    }),

    // 添加一次性监听器
    once: jest.fn().mockImplementation((event: string, listener: Function) => {
      if (!events.has(event)) {
        events.set(event, []);
      }
      const eventListeners = events.get(event);
      if (eventListeners) {
        eventListeners.push({ listener, once: true });
      }
      return mockEmitter;
    }),

    // 移除监听器
    off: jest.fn().mockImplementation((event: string, listener?: Function) => {
      if (!listener) {
        events.delete(event);
      } else {
        const listeners = events.get(event) || [];
        const filteredListeners = listeners.filter(({ listener: l }) => l !== listener);
        if (filteredListeners.length > 0) {
          events.set(event, filteredListeners);
        } else {
          events.delete(event);
        }
      }
      return mockEmitter;
    }),

    // 移除监听器（别名）
    removeListener: jest.fn().mockImplementation((event: string, listener: Function) => {
      return mockEmitter.off(event, listener);
    }),

    // 移除所有监听器
    removeAllListeners: jest.fn().mockImplementation((event?: string) => {
      if (event) {
        events.delete(event);
      } else {
        events.clear();
      }
      return mockEmitter;
    }),

    // 获取监听器
    listeners: jest.fn().mockImplementation((event: string) => {
      const eventListeners = events.get(event) || [];
      return eventListeners.map(({ listener }) => listener);
    }),

    // 获取监听器数量
    listenerCount: jest.fn().mockImplementation((event: string) => {
      return (events.get(event) || []).length;
    }),

    // 获取事件名称
    eventNames: jest.fn().mockImplementation(() => {
      return Array.from(events.keys());
    }),

    // 设置最大监听器数量
    setMaxListeners: jest.fn(),

    // 获取最大监听器数量
    getMaxListeners: jest.fn().mockReturnValue(10),

    // 添加监听器（别名）
    addListener: jest.fn().mockImplementation((event: string, listener: Function) => {
      return mockEmitter.on(event, listener);
    }),

    // 前置监听器
    prependListener: jest.fn().mockImplementation((event: string, listener: Function) => {
      if (!events.has(event)) {
        events.set(event, []);
      }
      const eventListeners = events.get(event);
      if (eventListeners) {
        eventListeners.unshift({ listener, once: false });
      }
      return mockEmitter;
    }),

    // 前置一次性监听器
    prependOnceListener: jest.fn().mockImplementation((event: string, listener: Function) => {
      if (!events.has(event)) {
        events.set(event, []);
      }
      const eventListeners = events.get(event);
      if (eventListeners) {
        eventListeners.unshift({ listener, once: true });
      }
      return mockEmitter;
    }),

    // 异步事件发射（NestJS EventEmitter2特有）
    emitAsync: jest.fn().mockImplementation(async (event: string, ...args: any[]) => {
      const listeners = events.get(event) || [];
      const promises = listeners.map(({ listener }) => {
        try {
          const result = listener.apply(null, args);
          return Promise.resolve(result);
        } catch (error) {
          return Promise.reject(error);
        }
      });

      try {
        await Promise.all(promises);
        return true;
      } catch (error) {
        return false;
      }
    }),

    // 等待事件
    waitFor: jest.fn().mockImplementation((event: string, timeout?: number) => {
      return new Promise((resolve, reject) => {
        const timeoutId = timeout ? setTimeout(() => {
          mockEmitter.off(event, onEvent);
          reject(new Error(`Timeout waiting for event: ${event}`));
        }, timeout) : null;

        const onEvent = (...args: any[]) => {
          if (timeoutId) clearTimeout(timeoutId);
          resolve(args);
        };

        mockEmitter.once(event, onEvent);
      });
    }),

    // 内部状态访问（仅用于测试）
    _getEvents: () => events,
    _clearEvents: () => events.clear(),
    _hasEvent: (event: string) => events.has(event),
    _getEventListenerCount: (event: string) => (events.get(event) || []).length,
  };

  // 设置setMaxListeners返回值为自身以支持链式调用
  mockEmitter.setMaxListeners.mockReturnValue(mockEmitter);

  return mockEmitter;
};

/**
 * 创建简化的EventEmitter Mock（仅包含基本功能）
 */
export const createSimpleEventEmitterMock = () => {
  const simpleMock = {
    emit: jest.fn().mockReturnValue(true),
    on: jest.fn(),
    once: jest.fn(),
    off: jest.fn(),
    removeAllListeners: jest.fn(),
    emitAsync: jest.fn().mockResolvedValue(true),
  };

  // 设置返回值为自身以支持链式调用
  simpleMock.on.mockReturnValue(simpleMock);
  simpleMock.once.mockReturnValue(simpleMock);
  simpleMock.off.mockReturnValue(simpleMock);
  simpleMock.removeAllListeners.mockReturnValue(simpleMock);

  return simpleMock;
};

/**
 * 创建总是失败的EventEmitter Mock
 */
export const createFailingEventEmitterMock = () => {
  const error = new Error('EventEmitter operation failed');

  return {
    emit: jest.fn().mockImplementation(() => { throw error; }),
    on: jest.fn().mockImplementation(() => { throw error; }),
    once: jest.fn().mockImplementation(() => { throw error; }),
    off: jest.fn().mockImplementation(() => { throw error; }),
    emitAsync: jest.fn().mockRejectedValue(error),
    removeAllListeners: jest.fn().mockImplementation(() => { throw error; }),
  };
};