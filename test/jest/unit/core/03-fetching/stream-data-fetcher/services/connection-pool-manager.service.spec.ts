import { Test, TestingModule } from '@nestjs/testing';
import { ConnectionPoolManager } from '@core/03-fetching/stream-data-fetcher/services/connection-pool-manager.service';
import { StreamConfigService } from '@core/03-fetching/stream-data-fetcher/config/stream-config.service';
import { BusinessErrorCode, ComponentIdentifier } from '@common/core/exceptions';
import { UnitTestSetup } from '../../../../../../testbasic/setup/unit-test-setup';

describe('ConnectionPoolManager', () => {
  let service: ConnectionPoolManager;
  let module: TestingModule;
  let streamConfigService: jest.Mocked<StreamConfigService>;

  const mockConnectionConfig = {
    maxGlobal: 100,
    maxPerKey: 10,
    maxPerIP: 5,
  };

  beforeEach(async () => {
    const mockStreamConfigService = {
      getConnectionConfig: jest.fn().mockReturnValue(mockConnectionConfig),
    };

    module = await UnitTestSetup.createBasicTestModule({
      providers: [
        ConnectionPoolManager,
        {
          provide: StreamConfigService,
          useValue: mockStreamConfigService,
        },
      ],
    });

    service = module.get<ConnectionPoolManager>(ConnectionPoolManager);
    streamConfigService = module.get(StreamConfigService);
  });

  afterEach(async () => {
    await UnitTestSetup.cleanupModule(module);
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with stream config', () => {
      expect(streamConfigService.getConnectionConfig).toHaveBeenCalled();
    });
  });

  describe('canCreateConnection', () => {
    beforeEach(() => {
      // Reset service state before each test
      service.reset();
    });

    it('should allow connection when within limits', () => {
      const key = 'longport:ws-stock-quote';
      const clientIP = '192.168.1.1';

      const result = service.canCreateConnection(key, clientIP);

      expect(result).toBe(true);
    });

    it('should throw error when global limit exceeded', () => {
      const key = 'longport:ws-stock-quote';

      // Register connections up to the global limit
      for (let i = 0; i < mockConnectionConfig.maxGlobal; i++) {
        service.registerConnection(`key-${i}`);
      }

      expect(() => service.canCreateConnection(key)).toThrow();

      try {
        service.canCreateConnection(key);
      } catch (error) {
        expect(error.component).toBe(ComponentIdentifier.STREAM_DATA_FETCHER);
        expect(error.errorCode).toBe(BusinessErrorCode.RESOURCE_EXHAUSTED);
        expect(error.message).toContain('Global connection limit exceeded');
        expect(error.context.limitType).toBe('global');
        expect(error.context.currentConnections).toBe(mockConnectionConfig.maxGlobal);
        expect(error.context.maxConnections).toBe(mockConnectionConfig.maxGlobal);
      }
    });

    it('should throw error when per-key limit exceeded', () => {
      const key = 'longport:ws-stock-quote';

      // Register connections up to the per-key limit
      for (let i = 0; i < mockConnectionConfig.maxPerKey; i++) {
        service.registerConnection(key);
      }

      expect(() => service.canCreateConnection(key)).toThrow();

      try {
        service.canCreateConnection(key);
      } catch (error) {
        expect(error.component).toBe(ComponentIdentifier.STREAM_DATA_FETCHER);
        expect(error.errorCode).toBe(BusinessErrorCode.RESOURCE_EXHAUSTED);
        expect(error.message).toContain(`Connection limit exceeded for key ${key}`);
        expect(error.context.limitType).toBe('per_key');
        expect(error.context.connectionKey).toBe(key);
        expect(error.context.currentConnections).toBe(mockConnectionConfig.maxPerKey);
        expect(error.context.maxConnections).toBe(mockConnectionConfig.maxPerKey);
      }
    });

    it('should throw error when per-IP limit exceeded', () => {
      const key = 'longport:ws-stock-quote';
      const clientIP = '192.168.1.1';

      // Register connections up to the per-IP limit
      for (let i = 0; i < mockConnectionConfig.maxPerIP; i++) {
        service.registerConnection(`key-${i}`, clientIP);
      }

      expect(() => service.canCreateConnection(key, clientIP)).toThrow();

      try {
        service.canCreateConnection(key, clientIP);
      } catch (error) {
        expect(error.component).toBe(ComponentIdentifier.STREAM_DATA_FETCHER);
        expect(error.errorCode).toBe(BusinessErrorCode.RESOURCE_EXHAUSTED);
        expect(error.message).toContain(`IP connection limit exceeded for ${clientIP}`);
        expect(error.context.limitType).toBe('per_ip');
        expect(error.context.clientIP).toBe(clientIP);
        expect(error.context.currentConnections).toBe(mockConnectionConfig.maxPerIP);
        expect(error.context.maxConnections).toBe(mockConnectionConfig.maxPerIP);
      }
    });

    it('should allow connection without IP parameter', () => {
      const key = 'longport:ws-stock-quote';

      const result = service.canCreateConnection(key);

      expect(result).toBe(true);
    });

    it('should check limits in order: global, per-key, per-IP', () => {
      const key = 'longport:ws-stock-quote';
      const clientIP = '192.168.1.1';

      // Fill global limit first
      for (let i = 0; i < mockConnectionConfig.maxGlobal; i++) {
        service.registerConnection(`different-key-${i}`);
      }

      // Should fail on global limit, not per-key or per-IP
      expect(() => service.canCreateConnection(key, clientIP)).toThrow(/Global connection limit exceeded/);
    });
  });

  describe('registerConnection', () => {
    beforeEach(() => {
      service.reset();
    });

    it('should register connection with key only', () => {
      const key = 'longport:ws-stock-quote';

      service.registerConnection(key);

      const stats = service.getStats();
      expect(stats.global.current).toBe(1);
      expect(stats.byKey).toHaveLength(1);
      expect(stats.byKey[0].key).toBe(key);
      expect(stats.byKey[0].current).toBe(1);
      expect(stats.byIP).toHaveLength(0);
    });

    it('should register connection with key and IP', () => {
      const key = 'longport:ws-stock-quote';
      const clientIP = '192.168.1.1';

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

    it('should increment counters for multiple connections', () => {
      const key = 'longport:ws-stock-quote';
      const clientIP = '192.168.1.1';

      service.registerConnection(key, clientIP);
      service.registerConnection(key, clientIP);

      const stats = service.getStats();
      expect(stats.global.current).toBe(2);
      expect(stats.byKey[0].current).toBe(2);
      expect(stats.byIP[0].current).toBe(2);
    });

    it('should handle multiple different keys', () => {
      const key1 = 'longport:ws-stock-quote';
      const key2 = 'futu:ws-stock-quote';

      service.registerConnection(key1);
      service.registerConnection(key2);

      const stats = service.getStats();
      expect(stats.global.current).toBe(2);
      expect(stats.byKey).toHaveLength(2);
      expect(stats.byKey.find(item => item.key === key1)?.current).toBe(1);
      expect(stats.byKey.find(item => item.key === key2)?.current).toBe(1);
    });

    it('should handle multiple different IPs', () => {
      const key = 'longport:ws-stock-quote';
      const ip1 = '192.168.1.1';
      const ip2 = '192.168.1.2';

      service.registerConnection(key, ip1);
      service.registerConnection(key, ip2);

      const stats = service.getStats();
      expect(stats.global.current).toBe(2);
      expect(stats.byIP).toHaveLength(2);
      expect(stats.byIP.find(item => item.ip === ip1)?.current).toBe(1);
      expect(stats.byIP.find(item => item.ip === ip2)?.current).toBe(1);
    });
  });

  describe('unregisterConnection', () => {
    beforeEach(() => {
      service.reset();
    });

    it('should unregister connection with key only', () => {
      const key = 'longport:ws-stock-quote';

      service.registerConnection(key);
      service.unregisterConnection(key);

      const stats = service.getStats();
      expect(stats.global.current).toBe(0);
      expect(stats.byKey).toHaveLength(0);
      expect(stats.byIP).toHaveLength(0);
    });

    it('should unregister connection with key and IP', () => {
      const key = 'longport:ws-stock-quote';
      const clientIP = '192.168.1.1';

      service.registerConnection(key, clientIP);
      service.unregisterConnection(key, clientIP);

      const stats = service.getStats();
      expect(stats.global.current).toBe(0);
      expect(stats.byKey).toHaveLength(0);
      expect(stats.byIP).toHaveLength(0);
    });

    it('should handle partial unregistration', () => {
      const key = 'longport:ws-stock-quote';
      const clientIP = '192.168.1.1';

      service.registerConnection(key, clientIP);
      service.registerConnection(key, clientIP);
      service.unregisterConnection(key, clientIP);

      const stats = service.getStats();
      expect(stats.global.current).toBe(1);
      expect(stats.byKey).toHaveLength(1);
      expect(stats.byKey[0].current).toBe(1);
      expect(stats.byIP).toHaveLength(1);
      expect(stats.byIP[0].current).toBe(1);
    });

    it('should handle unregistration when no connections exist', () => {
      const key = 'longport:ws-stock-quote';
      const clientIP = '192.168.1.1';

      // Should not throw error
      expect(() => service.unregisterConnection(key, clientIP)).not.toThrow();

      const stats = service.getStats();
      expect(stats.global.current).toBe(0);
      expect(stats.byKey).toHaveLength(0);
      expect(stats.byIP).toHaveLength(0);
    });

    it('should delete keys and IPs when count reaches zero', () => {
      const key = 'longport:ws-stock-quote';
      const clientIP = '192.168.1.1';

      service.registerConnection(key, clientIP);

      let stats = service.getStats();
      expect(stats.byKey).toHaveLength(1);
      expect(stats.byIP).toHaveLength(1);

      service.unregisterConnection(key, clientIP);

      stats = service.getStats();
      expect(stats.byKey).toHaveLength(0);
      expect(stats.byIP).toHaveLength(0);
    });

    it('should not let counters go below zero', () => {
      const key = 'longport:ws-stock-quote';

      // Try to unregister without registering
      service.unregisterConnection(key);
      service.unregisterConnection(key);

      const stats = service.getStats();
      expect(stats.global.current).toBe(0);
    });
  });

  describe('getStats', () => {
    beforeEach(() => {
      service.reset();
    });

    it('should return correct stats structure', () => {
      const stats = service.getStats();

      expect(stats).toEqual({
        global: {
          current: 0,
          max: mockConnectionConfig.maxGlobal,
          utilization: 0,
        },
        byKey: [],
        byIP: [],
        config: mockConnectionConfig,
      });
    });

    it('should calculate utilization correctly', () => {
      const key = 'longport:ws-stock-quote';
      const clientIP = '192.168.1.1';

      // Register half of max connections
      const halfGlobal = Math.floor(mockConnectionConfig.maxGlobal / 2);
      for (let i = 0; i < halfGlobal; i++) {
        service.registerConnection(`key-${i}`);
      }

      // Register half of max per-key connections
      const halfPerKey = Math.floor(mockConnectionConfig.maxPerKey / 2);
      for (let i = 0; i < halfPerKey; i++) {
        service.registerConnection(key);
      }

      // Register half of max per-IP connections
      const halfPerIP = Math.floor(mockConnectionConfig.maxPerIP / 2);
      for (let i = 0; i < halfPerIP; i++) {
        service.registerConnection(`ip-key-${i}`, clientIP);
      }

      const stats = service.getStats();

      expect(stats.global.utilization).toBeCloseTo(
        (halfGlobal + halfPerKey + halfPerIP) / mockConnectionConfig.maxGlobal * 100,
        1
      );

      const keyStats = stats.byKey.find(item => item.key === key);
      expect(keyStats?.utilization).toBeCloseTo(
        halfPerKey / mockConnectionConfig.maxPerKey * 100,
        1
      );

      const ipStats = stats.byIP.find(item => item.ip === clientIP);
      expect(ipStats?.utilization).toBeCloseTo(
        halfPerIP / mockConnectionConfig.maxPerIP * 100,
        1
      );
    });
  });

  describe('getAlerts', () => {
    beforeEach(() => {
      service.reset();
    });

    it('should return no alerts when utilization is low', () => {
      const key = 'longport:ws-stock-quote';
      service.registerConnection(key);

      const alerts = service.getAlerts();

      expect(alerts).toHaveLength(0);
    });

    it('should return warning alert when global utilization >= 80%', () => {
      const warningThreshold = Math.ceil(mockConnectionConfig.maxGlobal * 0.8);

      for (let i = 0; i < warningThreshold; i++) {
        service.registerConnection(`key-${i}`);
      }

      const alerts = service.getAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('global_utilization_warning');
      expect(alerts[0].level).toBe('warning');
      expect(alerts[0].message).toContain('全局连接数使用率达到');
    });

    it('should return critical alert when global utilization >= 90%', () => {
      const criticalThreshold = Math.ceil(mockConnectionConfig.maxGlobal * 0.9);

      for (let i = 0; i < criticalThreshold; i++) {
        service.registerConnection(`key-${i}`);
      }

      const alerts = service.getAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('global_utilization_critical');
      expect(alerts[0].level).toBe('critical');
      expect(alerts[0].message).toContain('全局连接数使用率达到');
    });

    it('should return key-specific alerts', () => {
      const key = 'longport:ws-stock-quote';
      const warningThreshold = Math.ceil(mockConnectionConfig.maxPerKey * 0.8);

      for (let i = 0; i < warningThreshold; i++) {
        service.registerConnection(key);
      }

      const alerts = service.getAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('key_utilization_warning');
      expect(alerts[0].level).toBe('warning');
      expect(alerts[0].message).toContain(key);
      expect(alerts[0].message).toContain('连接数使用率达到');
    });

    it('should return multiple alerts for different keys', () => {
      const key1 = 'longport:ws-stock-quote';
      const key2 = 'futu:ws-stock-quote';
      const warningThreshold = Math.ceil(mockConnectionConfig.maxPerKey * 0.8);

      for (let i = 0; i < warningThreshold; i++) {
        service.registerConnection(key1);
        service.registerConnection(key2);
      }

      const alerts = service.getAlerts();

      expect(alerts.length).toBeGreaterThanOrEqual(2);
      expect(alerts.some(alert => alert.message.includes(key1))).toBe(true);
      expect(alerts.some(alert => alert.message.includes(key2))).toBe(true);
    });

    it('should prioritize critical over warning alerts', () => {
      const criticalThreshold = Math.ceil(mockConnectionConfig.maxGlobal * 0.9);

      for (let i = 0; i < criticalThreshold; i++) {
        service.registerConnection(`key-${i}`);
      }

      const alerts = service.getAlerts();
      const globalAlert = alerts.find(alert => alert.type.includes('global'));

      expect(globalAlert?.level).toBe('critical');
      expect(globalAlert?.type).toBe('global_utilization_critical');
    });
  });

  describe('reset', () => {
    it('should reset all connection counts', () => {
      const key = 'longport:ws-stock-quote';
      const clientIP = '192.168.1.1';

      // Register some connections
      service.registerConnection(key, clientIP);
      service.registerConnection(key, clientIP);
      service.registerConnection('another-key');

      // Verify connections exist
      let stats = service.getStats();
      expect(stats.global.current).toBe(3);
      expect(stats.byKey).toHaveLength(2);
      expect(stats.byIP).toHaveLength(1);

      // Reset
      service.reset();

      // Verify all counters are reset
      stats = service.getStats();
      expect(stats.global.current).toBe(0);
      expect(stats.byKey).toHaveLength(0);
      expect(stats.byIP).toHaveLength(0);
    });

    it('should allow new connections after reset', () => {
      const key = 'longport:ws-stock-quote';

      // Fill to capacity
      for (let i = 0; i < mockConnectionConfig.maxGlobal; i++) {
        service.registerConnection(`key-${i}`);
      }

      // Should fail
      expect(() => service.canCreateConnection(key)).toThrow();

      // Reset
      service.reset();

      // Should succeed
      expect(() => service.canCreateConnection(key)).not.toThrow();
      expect(service.canCreateConnection(key)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      service.reset();
    });

    it('should handle empty key strings', () => {
      const emptyKey = '';

      expect(() => service.canCreateConnection(emptyKey)).not.toThrow();
      expect(() => service.registerConnection(emptyKey)).not.toThrow();
      expect(() => service.unregisterConnection(emptyKey)).not.toThrow();
    });

    it('should handle null/undefined IP addresses gracefully', () => {
      const key = 'longport:ws-stock-quote';

      expect(() => service.canCreateConnection(key, undefined)).not.toThrow();
      expect(() => service.registerConnection(key, undefined)).not.toThrow();
      expect(() => service.unregisterConnection(key, undefined)).not.toThrow();
    });

    it('should handle concurrent operations correctly', () => {
      const key = 'longport:ws-stock-quote';

      // Simulate concurrent registration
      service.registerConnection(key);
      service.registerConnection(key);
      service.unregisterConnection(key);

      const stats = service.getStats();
      expect(stats.global.current).toBe(1);
      expect(stats.byKey[0].current).toBe(1);
    });
  });
});