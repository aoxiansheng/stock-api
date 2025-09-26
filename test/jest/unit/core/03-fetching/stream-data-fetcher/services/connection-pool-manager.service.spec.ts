import { Test, TestingModule } from '@nestjs/testing';
import { ConnectionPoolManager } from '@core/03-fetching/stream-data-fetcher/services/connection-pool-manager.service';
import { StreamConfigService } from '@core/03-fetching/stream-data-fetcher/config/stream-config.service';
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from '@common/core/exceptions';

describe('ConnectionPoolManager', () => {
  let service: ConnectionPoolManager;
  let streamConfigService: StreamConfigService;

  // 默认配置
  const mockConnectionConfig = {
    maxGlobal: 100,
    maxPerKey: 10,
    maxPerIP: 5,
    timeoutMs: 30000,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockStreamConfigService = {
      getConnectionConfig: jest.fn().mockReturnValue(mockConnectionConfig),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectionPoolManager,
        {
          provide: StreamConfigService,
          useValue: mockStreamConfigService,
        },
      ],
    }).compile();

    service = module.get<ConnectionPoolManager>(ConnectionPoolManager);
    streamConfigService = module.get<StreamConfigService>(StreamConfigService);
  });

  describe('服务初始化', () => {
    it('应该成功创建服务实例', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(ConnectionPoolManager);
    });

    it('应该在构造函数中记录配置信息', () => {
      expect(streamConfigService.getConnectionConfig).toHaveBeenCalled();
    });
  });

  describe('连接创建检查 - canCreateConnection', () => {
    it('应该允许在限制范围内创建连接', () => {
      const key = 'longport:ws-stock-quote';
      const clientIP = '192.168.1.100';

      expect(() => service.canCreateConnection(key, clientIP)).not.toThrow();
      expect(service.canCreateConnection(key, clientIP)).toBe(true);
    });

    it('应该在全局连接数达到上限时抛出异常', () => {
      const key = 'longport:ws-stock-quote';

      // 注册达到上限的连接数
      for (let i = 0; i < mockConnectionConfig.maxGlobal; i++) {
        service.registerConnection(`key-${i}`);
      }

      // 尝试创建超出上限的连接
      expect(() => service.canCreateConnection(key)).toThrow();

      try {
        service.canCreateConnection(key);
      } catch (error: any) {
        expect(error.context?.limitType).toBe('global');
        expect(error.context?.currentConnections).toBe(mockConnectionConfig.maxGlobal);
      }
    });

    it('应该在单个键连接数达到上限时抛出异常', () => {
      const key = 'longport:ws-stock-quote';

      // 注册达到上限的键连接数
      for (let i = 0; i < mockConnectionConfig.maxPerKey; i++) {
        service.registerConnection(key);
      }

      // 尝试创建超出上限的连接
      expect(() => service.canCreateConnection(key)).toThrow();

      try {
        service.canCreateConnection(key);
      } catch (error: any) {
        expect(error.context?.limitType).toBe('per_key');
        expect(error.context?.connectionKey).toBe(key);
      }
    });

    it('应该在IP连接数达到上限时抛出异常', () => {
      const key = 'longport:ws-stock-quote';
      const clientIP = '192.168.1.100';

      // 注册达到上限的IP连接数
      for (let i = 0; i < mockConnectionConfig.maxPerIP; i++) {
        service.registerConnection(`key-${i}`, clientIP);
      }

      // 尝试创建超出上限的连接
      expect(() => service.canCreateConnection(key, clientIP)).toThrow();

      try {
        service.canCreateConnection(key, clientIP);
      } catch (error: any) {
        expect(error.context?.limitType).toBe('per_ip');
        expect(error.context?.clientIP).toBe(clientIP);
      }
    });

    it('应该在没有提供IP时不检查IP限制', () => {
      const key = 'longport:ws-stock-quote';

      expect(() => service.canCreateConnection(key)).not.toThrow();
      expect(service.canCreateConnection(key)).toBe(true);
    });
  });

  describe('连接注册 - registerConnection', () => {
    it('应该成功注册新连接', () => {
      const key = 'longport:ws-stock-quote';
      const clientIP = '192.168.1.100';

      service.registerConnection(key, clientIP);

      const stats = service.getStats();
      expect(stats.global.current).toBe(1);
      expect(stats.byKey).toHaveLength(1);
      expect(stats.byKey[0].key).toBe(key);
      expect(stats.byKey[0].current).toBe(1);
      expect(stats.byIP).toHaveLength(1);
      expect(stats.byIP[0].ip).toBe(clientIP);
      expect(stats.byIP[0].current).toBe(1);
    });

    it('应该正确累计同一键的多个连接', () => {
      const key = 'longport:ws-stock-quote';

      service.registerConnection(key);
      service.registerConnection(key);
      service.registerConnection(key);

      const stats = service.getStats();
      expect(stats.global.current).toBe(3);
      expect(stats.byKey).toHaveLength(1);
      expect(stats.byKey[0].current).toBe(3);
    });

    it('应该正确累计同一IP的多个连接', () => {
      const clientIP = '192.168.1.100';

      service.registerConnection('key1', clientIP);
      service.registerConnection('key2', clientIP);
      service.registerConnection('key3', clientIP);

      const stats = service.getStats();
      expect(stats.global.current).toBe(3);
      expect(stats.byIP).toHaveLength(1);
      expect(stats.byIP[0].current).toBe(3);
    });

    it('应该在没有提供IP时不更新IP统计', () => {
      const key = 'longport:ws-stock-quote';

      service.registerConnection(key);

      const stats = service.getStats();
      expect(stats.global.current).toBe(1);
      expect(stats.byKey).toHaveLength(1);
      expect(stats.byIP).toHaveLength(0);
    });
  });

  describe('连接注销 - unregisterConnection', () => {
    beforeEach(() => {
      // 准备一些测试连接
      service.registerConnection('key1', '192.168.1.100');
      service.registerConnection('key1', '192.168.1.100');
      service.registerConnection('key2', '192.168.1.101');
    });

    it('应该成功注销连接', () => {
      service.unregisterConnection('key1', '192.168.1.100');

      const stats = service.getStats();
      expect(stats.global.current).toBe(2);
      expect(stats.byKey.find(k => k.key === 'key1')?.current).toBe(1);
      expect(stats.byIP.find(ip => ip.ip === '192.168.1.100')?.current).toBe(1);
    });

    it('应该在键连接数为0时移除键记录', () => {
      service.unregisterConnection('key2', '192.168.1.101');

      const stats = service.getStats();
      expect(stats.byKey.find(k => k.key === 'key2')).toBeUndefined();
    });

    it('应该在IP连接数为0时移除IP记录', () => {
      service.unregisterConnection('key2', '192.168.1.101');

      const stats = service.getStats();
      expect(stats.byIP.find(ip => ip.ip === '192.168.1.101')).toBeUndefined();
    });

    it('应该处理全局连接数为0的情况', () => {
      // 清空所有连接
      service.reset();

      // 尝试注销不存在的连接
      service.unregisterConnection('non-existent');

      const stats = service.getStats();
      expect(stats.global.current).toBe(0);
    });

    it('应该在没有提供IP时不更新IP统计', () => {
      service.registerConnection('test-key');
      service.unregisterConnection('test-key');

      const stats = service.getStats();
      expect(stats.global.current).toBe(2); // 原有的2个连接保持不变
    });
  });

  describe('统计信息 - getStats', () => {
    beforeEach(() => {
      service.registerConnection('longport:ws-stock-quote', '192.168.1.100');
      service.registerConnection('longport:ws-stock-quote', '192.168.1.100');
      service.registerConnection('itick:ws-option-quote', '192.168.1.101');
    });

    it('应该返回正确的全局统计信息', () => {
      const stats = service.getStats();

      expect(stats.global.current).toBe(3);
      expect(stats.global.max).toBe(mockConnectionConfig.maxGlobal);
      expect(stats.global.utilization).toBe(3);
    });

    it('应该返回正确的按键统计信息', () => {
      const stats = service.getStats();

      expect(stats.byKey).toHaveLength(2);

      const longportStats = stats.byKey.find(k => k.key === 'longport:ws-stock-quote');
      expect(longportStats?.current).toBe(2);
      expect(longportStats?.max).toBe(mockConnectionConfig.maxPerKey);
      expect(longportStats?.utilization).toBe(20);

      const itickStats = stats.byKey.find(k => k.key === 'itick:ws-option-quote');
      expect(itickStats?.current).toBe(1);
      expect(itickStats?.utilization).toBe(10);
    });

    it('应该返回正确的按IP统计信息', () => {
      const stats = service.getStats();

      expect(stats.byIP).toHaveLength(2);

      const ip100Stats = stats.byIP.find(ip => ip.ip === '192.168.1.100');
      expect(ip100Stats?.current).toBe(2);
      expect(ip100Stats?.max).toBe(mockConnectionConfig.maxPerIP);
      expect(ip100Stats?.utilization).toBe(40);

      const ip101Stats = stats.byIP.find(ip => ip.ip === '192.168.1.101');
      expect(ip101Stats?.current).toBe(1);
      expect(ip101Stats?.utilization).toBe(20);
    });

    it('应该包含配置信息', () => {
      const stats = service.getStats();
      expect(stats.config).toEqual(mockConnectionConfig);
    });
  });

  describe('告警系统 - getAlerts', () => {
    it('应该在全局使用率达到80%时产生警告告警', () => {
      // 注册80个连接
      for (let i = 0; i < 80; i++) {
        service.registerConnection(`key-${i}`);
      }

      const alerts = service.getAlerts();
      const globalAlert = alerts.find(a => a.type === 'global_utilization_warning');

      expect(globalAlert).toBeDefined();
      expect(globalAlert?.level).toBe('warning');
      expect(globalAlert?.message).toContain('80.0%');
    });

    it('应该在全局使用率达到90%时产生严重告警', () => {
      // 注册90个连接
      for (let i = 0; i < 90; i++) {
        service.registerConnection(`key-${i}`);
      }

      const alerts = service.getAlerts();
      const globalAlert = alerts.find(a => a.type === 'global_utilization_critical');

      expect(globalAlert).toBeDefined();
      expect(globalAlert?.level).toBe('critical');
      expect(globalAlert?.message).toContain('90.0%');
    });

    it('应该在键使用率达到80%时产生警告告警', () => {
      const key = 'longport:ws-stock-quote';

      // 注册8个连接 (80% of 10)
      for (let i = 0; i < 8; i++) {
        service.registerConnection(key);
      }

      const alerts = service.getAlerts();
      const keyAlert = alerts.find(a => a.type === 'key_utilization_warning');

      expect(keyAlert).toBeDefined();
      expect(keyAlert?.level).toBe('warning');
      expect(keyAlert?.message).toContain(key);
      expect(keyAlert?.message).toContain('80.0%');
    });

    it('应该在键使用率达到90%时产生严重告警', () => {
      const key = 'longport:ws-stock-quote';

      // 注册9个连接 (90% of 10)
      for (let i = 0; i < 9; i++) {
        service.registerConnection(key);
      }

      const alerts = service.getAlerts();
      const keyAlert = alerts.find(a => a.type === 'key_utilization_critical');

      expect(keyAlert).toBeDefined();
      expect(keyAlert?.level).toBe('critical');
      expect(keyAlert?.message).toContain(key);
      expect(keyAlert?.message).toContain('90.0%');
    });

    it('应该在使用率低于80%时不产生告警', () => {
      // 注册少量连接
      service.registerConnection('test-key');

      const alerts = service.getAlerts();
      expect(alerts).toHaveLength(0);
    });

    it('应该为多个键分别产生告警', () => {
      const key1 = 'longport:ws-stock-quote';
      const key2 = 'itick:ws-option-quote';

      // key1: 8个连接 (80%)
      for (let i = 0; i < 8; i++) {
        service.registerConnection(key1);
      }

      // key2: 9个连接 (90%)
      for (let i = 0; i < 9; i++) {
        service.registerConnection(key2);
      }

      const alerts = service.getAlerts();
      expect(alerts).toHaveLength(2);

      const key1Alert = alerts.find(a => a.message.includes(key1));
      const key2Alert = alerts.find(a => a.message.includes(key2));

      expect(key1Alert?.level).toBe('warning');
      expect(key2Alert?.level).toBe('critical');
    });
  });

  describe('重置功能 - reset', () => {
    beforeEach(() => {
      // 准备一些测试连接
      service.registerConnection('key1', '192.168.1.100');
      service.registerConnection('key2', '192.168.1.101');
    });

    it('应该重置所有连接统计', () => {
      service.reset();

      const stats = service.getStats();
      expect(stats.global.current).toBe(0);
      expect(stats.byKey).toHaveLength(0);
      expect(stats.byIP).toHaveLength(0);
    });

    it('应该在重置后允许重新注册连接', () => {
      service.reset();

      service.registerConnection('new-key', '192.168.1.200');

      const stats = service.getStats();
      expect(stats.global.current).toBe(1);
      expect(stats.byKey).toHaveLength(1);
      expect(stats.byIP).toHaveLength(1);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理空键字符串', () => {
      expect(() => service.canCreateConnection('')).not.toThrow();
      expect(() => service.registerConnection('')).not.toThrow();
      expect(() => service.unregisterConnection('')).not.toThrow();
    });

    it('应该处理空IP字符串', () => {
      const key = 'test-key';
      expect(() => service.canCreateConnection(key, '')).not.toThrow();
      expect(() => service.registerConnection(key, '')).not.toThrow();
      expect(() => service.unregisterConnection(key, '')).not.toThrow();
    });

    it('应该正确计算利用率百分比', () => {
      // 注册1个连接
      service.registerConnection('test-key');

      const stats = service.getStats();
      expect(stats.global.utilization).toBe(1); // 1/100 * 100 = 1%
      expect(stats.byKey[0].utilization).toBe(10); // 1/10 * 100 = 10%
    });

    it('应该处理超出整数范围的连接注销', () => {
      // 在没有连接的情况下尝试注销
      service.reset();

      expect(() => {
        for (let i = 0; i < 10; i++) {
          service.unregisterConnection('non-existent-key');
        }
      }).not.toThrow();

      const stats = service.getStats();
      expect(stats.global.current).toBe(0);
    });
  });

  describe('配置依赖性测试', () => {
    it('应该使用动态配置进行限制检查', () => {
      // 更改配置
      const newConfig = {
        maxGlobal: 2,
        maxPerKey: 1,
        maxPerIP: 1,
        timeoutMs: 30000,
      };

      jest.spyOn(streamConfigService, 'getConnectionConfig').mockReturnValue(newConfig);

      const key = 'test-key';

      // 第一个连接应该成功
      expect(() => service.canCreateConnection(key)).not.toThrow();
      service.registerConnection(key);

      // 第二个相同键的连接应该失败（maxPerKey = 1）
      expect(() => service.canCreateConnection(key)).toThrow();
    });
  });
});