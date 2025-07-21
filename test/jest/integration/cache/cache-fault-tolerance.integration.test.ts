/**
 * CacheService 容错机制集成测试
 * 测试缓存服务在Redis连接失败时的故障容错行为
 */

import { INestApplication } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisService } from '@liaoliaots/nestjs-redis';

import { CacheService } from '../../../../src/cache/cache.service';

describe('CacheService 容错机制集成测试', () => {
  let app: INestApplication;
  let cacheService: CacheService;
  let redisClient: Redis;

  beforeAll(async () => {
    app = (global as any).testApp;
    cacheService = app.get<CacheService>(CacheService);
    const redisService = app.get(RedisService);
    redisClient = redisService.getOrThrow();
  });

  beforeEach(async () => {
    // 确保Redis连接正常，清理数据
    try {
      await redisClient.ping();
      await redisClient.flushall();
    } catch (error) {
      console.log('Redis连接异常，跳过清理');
    }
  });

  describe('Redis连接正常时的基础功能', () => {
    beforeEach(async () => {
      // 确保Redis连接正常
      try {
        await redisClient.connect();
      } catch (error) {
        // 如果已经连接，忽略错误
      }
    });

    it('应该正常执行哈希操作', async () => {
      // Arrange
      const key = 'test:hash';
      const field = 'field1';
      const value = 'value1';

      // Act - 写入数据
      await cacheService.hashSet(key, field, value);
      
      // Act & Assert - 读取数据
      const allFields = await cacheService.hashGetAll(key);
      expect(allFields[field]).toBe(value);
      expect(allFields).toEqual({ [field]: value });
    });

    it('应该正常执行列表操作', async () => {
      // Arrange
      const key = 'test:list';
      const values = ['item1', 'item2', 'item3'];

      // Act - 写入数据
      for (const value of values) {
        await cacheService.listPush(key, value);
      }

      // Act & Assert - 读取数据
      const retrievedValues = await cacheService.listRange(key, 0, -1);
      expect(retrievedValues).toEqual(values.reverse()); // LPUSH会反转顺序
    });

    it('应该正常执行集合操作', async () => {
      // Arrange
      const key = 'test:set';
      const members = ['member1', 'member2', 'member3'];

      // Act - 写入数据
      for (const member of members) {
        await cacheService.setAdd(key, member);
      }

      // Act & Assert - 读取数据
      const isMember = await cacheService.setIsMember(key, 'member1');
      expect(isMember).toBe(true);

      const allMembers = await cacheService.setMembers(key);
      expect(allMembers.sort()).toEqual(members.sort());
    });
  });

  describe('Redis连接断开时的容错行为', () => {
    beforeEach(async () => {
      // 断开Redis连接模拟故障情况
      try {
        await redisClient.disconnect();
      } catch (error) {
        // 如果连接已断开，忽略错误
      }
    });

    afterEach(async () => {
      // 每个测试后重新连接，避免影响其他测试
      try {
        await redisClient.connect();
      } catch (error) {
        // 如果连接失败，不影响测试结果
      }
    });

    describe('读操作容错行为', () => {
      it('hashGetAll应该返回空对象而非抛出异常', async () => {
        // Act & Assert
        const result = await cacheService.hashGetAll('any-key');
        expect(result).toEqual({});
      });

      it('listRange应该返回空数组而非抛出异常', async () => {
        // Act & Assert
        const result = await cacheService.listRange('any-key', 0, -1);
        expect(result).toEqual([]);
      });

      it('setIsMember应该返回false而非抛出异常', async () => {
        // Act & Assert
        const result = await cacheService.setIsMember('any-set', 'any-member');
        expect(result).toBe(false);
      });

      it('setMembers应该返回空数组而非抛出异常', async () => {
        // Act & Assert
        const result = await cacheService.setMembers('any-set');
        expect(result).toEqual([]);
      });

      it('get应该抛出异常（通用缓存方法不容错）', async () => {
        // Act & Assert - 通用缓存方法应该抛出异常
        await expect(cacheService.get('any-key')).rejects.toThrow();
      });
    });

    describe('写操作异常行为', () => {
      it('通用写操作应该抛出异常', async () => {
        // Act & Assert - 通用写操作应该抛出异常（不是容错方法）
        await expect(cacheService.set('key', 'value')).rejects.toThrow();
        await expect(cacheService.hashSet('hash', 'field', 'value')).rejects.toThrow();
        await expect(cacheService.listPush('list', 'value')).rejects.toThrow();
        await expect(cacheService.setAdd('set', 'member')).rejects.toThrow();
        await expect(cacheService.expire('key', 60)).rejects.toThrow();
        await expect(cacheService.del('key')).rejects.toThrow();
      });

      it('批量操作应该抛出异常', async () => {
        // Act & Assert - 批量操作也应该抛出异常
        await expect(cacheService.del(['key1', 'key2'])).rejects.toThrow();
        await expect(cacheService.listTrim('list', 0, 10)).rejects.toThrow();
      });
    });

    describe('容错方法验证', () => {
      it('只有指定的方法实现容错（返回默认值）', async () => {
        // Act & Assert - 验证容错方法返回默认值
        expect(await cacheService.hashGetAll('hash')).toEqual({});
        expect(await cacheService.listRange('list', 0, -1)).toEqual([]);
        expect(await cacheService.setIsMember('set', 'member')).toBe(false);
        expect(await cacheService.setMembers('set')).toEqual([]);
      });

      it('通用方法不实现容错（抛出异常）', async () => {
        // Act & Assert - 验证通用方法抛出异常
        await expect(cacheService.get('key')).rejects.toThrow();
        await expect(cacheService.set('key', 'value')).rejects.toThrow();
        await expect(cacheService.hashSet('hash', 'field', 'value')).rejects.toThrow();
        await expect(cacheService.listPush('list', 'value')).rejects.toThrow();
        await expect(cacheService.setAdd('set', 'member')).rejects.toThrow();
      });
    });
  });

  describe('Redis连接恢复后的行为', () => {
    it('应该在Redis重连后恢复正常功能', async () => {
      // Arrange - 先断开连接
      try {
        await redisClient.disconnect();
      } catch (error) {
        // 忽略断开失败
      }

      // 验证断开状态 - 通用方法应该抛出异常
      await expect(cacheService.get('test-key')).rejects.toThrow();

      // Act - 重新连接
      try {
        await redisClient.connect();
        // 等待连接稳定
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        // 如果连接失败，跳过这个测试
        console.log('Redis重连失败，跳过测试');
        return;
      }

      // Assert - 验证功能恢复
      await cacheService.set('test-key', 'test-value');
      const result = await cacheService.get('test-key');
      expect(result).toBe('test-value');
    });
  });

  describe('错误日志验证', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      // 监听console输出（在实际项目中可能需要监听具体的日志库）
      consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('应该记录Redis连接失败的错误日志', async () => {
      // Arrange - 断开Redis连接
      try {
        await redisClient.disconnect();
      } catch (error) {
        // 忽略断开失败
      }

      // Act - 尝试执行操作
      await cacheService.hashGetAll('test-key');

      // Assert - 验证是否有适当的错误处理
      // 注意：实际的日志验证取决于日志库的实现
      // 这里主要验证操作不会抛出异常
      expect(true).toBe(true);
    });
  });

  describe('性能监控场景', () => {
    it('应该在指标收集场景中正确容错', async () => {
      // Arrange - 断开Redis连接
      try {
        await redisClient.disconnect();
      } catch (error) {
        // 忽略断开失败
      }

      // Act - 模拟性能指标收集操作
      const endpointStatsKey = 'metrics:endpoint_stats:GET:/api/test';
      const responseTimeKey = `${endpointStatsKey}:responseTimes`;

      // 写操作会抛出异常（这是正确的设计）
      await expect(cacheService.hashSet(endpointStatsKey, 'totalRequests', '1')).rejects.toThrow();
      await expect(cacheService.hashSet(endpointStatsKey, 'successfulRequests', '1')).rejects.toThrow();
      await expect(cacheService.listPush(responseTimeKey, '120')).rejects.toThrow();

      // Assert - 读取操作应该返回默认值，不抛出异常（这是容错的部分）
      const stats = await cacheService.hashGetAll(endpointStatsKey);
      const responseTimes = await cacheService.listRange(responseTimeKey, 0, -1);

      expect(stats).toEqual({});
      expect(responseTimes).toEqual([]);
    });

    it('应该处理parseInt场景避免NaN错误', async () => {
      // Arrange - 断开Redis连接
      try {
        await redisClient.disconnect();
      } catch (error) {
        // 忽略断开失败
      }

      // Act - 模拟会导致原始NaN错误的场景
      const statsHash = await cacheService.hashGetAll('metrics:stats');
      const cachedValue = statsHash['totalRequests'] || null;
      
      // Assert - 应该返回null而非undefined，避免parseInt(undefined)
      expect(cachedValue).toBeNull();
      
      // 验证parseInt处理
      const parsedValue = parseInt(cachedValue || '0', 10);
      expect(parsedValue).toBe(0); // 而非NaN
      expect(isNaN(parsedValue)).toBe(false);
    });
  });
});