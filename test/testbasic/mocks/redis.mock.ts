/**
 * 标准化Redis Mock - 提供完整的Redis命令模拟
 * 用于单元测试中隔离Redis依赖
 */

export const redisMockFactory = () => {
  const mockData = new Map<string, any>();

  return {
    // 基础命令
    get: jest.fn().mockImplementation((key: string) => {
      return Promise.resolve(mockData.get(key) || null);
    }),

    set: jest.fn().mockImplementation((key: string, value: any, ...args: any[]) => {
      mockData.set(key, value);
      return Promise.resolve('OK');
    }),

    setex: jest.fn().mockImplementation((key: string, ttl: number, value: any) => {
      mockData.set(key, value);
      return Promise.resolve('OK');
    }),

    del: jest.fn().mockImplementation((...keys: string[]) => {
      let deletedCount = 0;
      keys.forEach(key => {
        if (mockData.has(key)) {
          mockData.delete(key);
          deletedCount++;
        }
      });
      return Promise.resolve(deletedCount);
    }),

    exists: jest.fn().mockImplementation((...keys: string[]) => {
      return Promise.resolve(keys.filter(key => mockData.has(key)).length);
    }),

    expire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(-1),

    // 批量操作
    mget: jest.fn().mockImplementation((...keys: string[]) => {
      return Promise.resolve(keys.map(key => mockData.get(key) || null));
    }),

    mset: jest.fn().mockImplementation((...args: any[]) => {
      for (let i = 0; i < args.length; i += 2) {
        mockData.set(args[i], args[i + 1]);
      }
      return Promise.resolve('OK');
    }),

    pipeline: jest.fn().mockReturnValue({
      setex: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      del: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        [null, 'OK'],
        [null, 'OK']
      ]),
    }),

    // 集合操作
    sadd: jest.fn().mockResolvedValue(1),
    sismember: jest.fn().mockResolvedValue(0),
    smembers: jest.fn().mockResolvedValue([]),
    srem: jest.fn().mockResolvedValue(1),
    scard: jest.fn().mockResolvedValue(0),

    // 列表操作
    lpush: jest.fn().mockResolvedValue(1),
    rpush: jest.fn().mockResolvedValue(1),
    lpop: jest.fn().mockResolvedValue(null),
    rpop: jest.fn().mockResolvedValue(null),
    ltrim: jest.fn().mockResolvedValue('OK'),
    lrange: jest.fn().mockResolvedValue([]),
    llen: jest.fn().mockResolvedValue(0),

    // 哈希操作
    hincrby: jest.fn().mockResolvedValue(1),
    hincrbyfloat: jest.fn().mockResolvedValue(1.0),
    hset: jest.fn().mockResolvedValue(1),
    hget: jest.fn().mockResolvedValue(null),
    hgetall: jest.fn().mockResolvedValue({}),
    hdel: jest.fn().mockResolvedValue(1),
    hexists: jest.fn().mockResolvedValue(0),
    hkeys: jest.fn().mockResolvedValue([]),
    hvals: jest.fn().mockResolvedValue([]),
    hlen: jest.fn().mockResolvedValue(0),

    // 有序集合操作
    zadd: jest.fn().mockResolvedValue(1),
    zcard: jest.fn().mockResolvedValue(0),
    zrange: jest.fn().mockResolvedValue([]),
    zrangebyscore: jest.fn().mockResolvedValue([]),
    zrem: jest.fn().mockResolvedValue(1),
    zscore: jest.fn().mockResolvedValue(null),

    // 计数器
    incr: jest.fn().mockResolvedValue(1),
    incrby: jest.fn().mockResolvedValue(1),
    decr: jest.fn().mockResolvedValue(-1),
    decrby: jest.fn().mockResolvedValue(-1),

    // Lua脚本
    eval: jest.fn().mockResolvedValue(null),
    evalsha: jest.fn().mockResolvedValue(null),
    script: jest.fn().mockReturnValue({
      load: jest.fn().mockResolvedValue('sha1hash'),
      exists: jest.fn().mockResolvedValue([1]),
      flush: jest.fn().mockResolvedValue('OK'),
    }),

    // 扫描操作
    scan: jest.fn().mockResolvedValue(['0', []]),
    sscan: jest.fn().mockResolvedValue(['0', []]),
    hscan: jest.fn().mockResolvedValue(['0', []]),
    zscan: jest.fn().mockResolvedValue(['0', []]),

    // 连接和信息
    status: 'ready',
    ping: jest.fn().mockResolvedValue('PONG'),
    info: jest.fn().mockResolvedValue('redis_version:6.0.0\r\nused_memory:1000000'),
    config: jest.fn().mockReturnValue({
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue('OK'),
    }),

    // 连接管理
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue('OK'),

    // 事务
    multi: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnThis(),
      get: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([['OK'], [null]]),
      discard: jest.fn().mockResolvedValue('OK'),
    }),

    // 发布订阅
    publish: jest.fn().mockResolvedValue(0),
    subscribe: jest.fn().mockResolvedValue(undefined),
    unsubscribe: jest.fn().mockResolvedValue(undefined),

    // 键操作
    keys: jest.fn().mockResolvedValue([]),
    type: jest.fn().mockResolvedValue('none'),
    randomkey: jest.fn().mockResolvedValue(null),
    rename: jest.fn().mockResolvedValue('OK'),

    // 数据库操作
    select: jest.fn().mockResolvedValue('OK'),
    flushdb: jest.fn().mockResolvedValue('OK'),
    flushall: jest.fn().mockResolvedValue('OK'),
    dbsize: jest.fn().mockResolvedValue(0),

    // 错误处理模拟
    _triggerError: jest.fn().mockImplementation((error: Error) => {
      // 用于测试错误处理的辅助方法
      throw error;
    }),

    // 内部状态访问（仅用于测试）
    _getMockData: () => mockData,
    _clearMockData: () => mockData.clear(),
  };
};

/**
 * 创建带有预设数据的Redis Mock
 */
export const createRedisMockWithData = (initialData: Record<string, any>) => {
  const mock = redisMockFactory();

  // 预设数据
  Object.entries(initialData).forEach(([key, value]) => {
    mock._getMockData().set(key, value);
  });

  return mock;
};

/**
 * 创建模拟连接错误的Redis Mock
 */
export const createFailingRedisMock = () => {
  const mock = redisMockFactory();
  const connectionError = new Error('Redis connection failed');

  // 将所有方法设置为抛出连接错误
  Object.keys(mock).forEach(key => {
    if (typeof mock[key] === 'function' && !key.startsWith('_')) {
      mock[key] = jest.fn().mockRejectedValue(connectionError);
    }
  });

  return mock;
};

/**
 * 创建具有特定延迟的Redis Mock（用于测试超时）
 */
export const createSlowRedisMock = (delayMs: number = 1000) => {
  const mock = redisMockFactory();

  Object.keys(mock).forEach(key => {
    if (typeof mock[key] === 'function' && !key.startsWith('_')) {
      const originalFn = mock[key];
      mock[key] = jest.fn().mockImplementation(async (...args) => {
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return originalFn.apply(mock, args);
      });
    }
  });

  return mock;
};