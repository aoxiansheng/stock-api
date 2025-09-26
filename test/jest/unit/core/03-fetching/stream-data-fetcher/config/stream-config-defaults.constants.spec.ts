import { StreamConfigDefaults, STREAM_CONFIG_DEFAULTS } from '@core/03-fetching/stream-data-fetcher/config/stream-config-defaults.constants';

describe('StreamConfigDefaults', () => {
  describe('STREAM_CONFIG_DEFAULTS常量', () => {
    it('应该包含连接配置', () => {
      expect(STREAM_CONFIG_DEFAULTS.connections).toBeDefined();
      expect(STREAM_CONFIG_DEFAULTS.connections.maxGlobal).toBeGreaterThan(0);
      expect(STREAM_CONFIG_DEFAULTS.connections.maxPerKey).toBeGreaterThan(0);
      expect(STREAM_CONFIG_DEFAULTS.connections.maxPerIP).toBeGreaterThan(0);
      expect(STREAM_CONFIG_DEFAULTS.connections.timeout).toBeGreaterThan(0);
    });

    it('应该包含获取配置', () => {
      expect(STREAM_CONFIG_DEFAULTS.fetching).toBeDefined();
      expect(STREAM_CONFIG_DEFAULTS.fetching.timeout).toBeGreaterThan(0);
      expect(STREAM_CONFIG_DEFAULTS.fetching.maxRetries).toBeGreaterThanOrEqual(0);
      expect(STREAM_CONFIG_DEFAULTS.fetching.batchSize).toBeGreaterThan(0);
    });

    it('应该包含缓存配置', () => {
      expect(STREAM_CONFIG_DEFAULTS.cache).toBeDefined();
      expect(STREAM_CONFIG_DEFAULTS.cache.defaultTtl).toBeGreaterThan(0);
      expect(STREAM_CONFIG_DEFAULTS.cache.realtimeTtl).toBeGreaterThan(0);
    });

    it('应该包含限流配置', () => {
      expect(STREAM_CONFIG_DEFAULTS.rateLimiting).toBeDefined();
      expect(STREAM_CONFIG_DEFAULTS.rateLimiting.messagesPerMinute).toBeGreaterThan(0);
      expect(STREAM_CONFIG_DEFAULTS.rateLimiting.maxSubscriptionsPerConnection).toBeGreaterThan(0);
    });

    it('应该包含WebSocket配置', () => {
      expect(STREAM_CONFIG_DEFAULTS.websocket).toBeDefined();
      expect(STREAM_CONFIG_DEFAULTS.websocket.port).toBeGreaterThan(0);
      expect(STREAM_CONFIG_DEFAULTS.websocket.path).toBeDefined();
    });

    it('应该包含监控配置', () => {
      expect(STREAM_CONFIG_DEFAULTS.monitoring).toBeDefined();
      expect(typeof STREAM_CONFIG_DEFAULTS.monitoring.enabled).toBe('boolean');
      expect(STREAM_CONFIG_DEFAULTS.monitoring.interval).toBeGreaterThan(0);
    });
  });

  describe('StreamConfigDefaults类方法', () => {
    it('应该提供getFullConfig方法', () => {
      const config = StreamConfigDefaults.getFullConfig();
      expect(config).toBeDefined();
      expect(config.connections).toBeDefined();
      expect(config.fetching).toBeDefined();
      expect(config.cache).toBeDefined();
    });

    it('应该提供getEnvValue方法', () => {
      const defaultValue = 'test-default';
      const result = StreamConfigDefaults.getEnvValue('NON_EXISTENT_ENV_VAR', defaultValue);
      expect(result).toBe(defaultValue);
    });

    it('应该从环境变量获取数值类型', () => {
      const result = StreamConfigDefaults.getEnvValue('NON_EXISTENT_NUMBER', 100);
      expect(result).toBe(100);
      expect(typeof result).toBe('number');
    });

    it('应该从环境变量获取布尔类型', () => {
      const result = StreamConfigDefaults.getEnvValue('NON_EXISTENT_BOOLEAN', true);
      expect(result).toBe(true);
      expect(typeof result).toBe('boolean');
    });

    it('应该保持配置值的合理性', () => {
      const config = StreamConfigDefaults.getFullConfig();

      // 连接数限制应该合理
      expect(config.connections.maxPerKey).toBeLessThanOrEqual(config.connections.maxGlobal);
      expect(config.connections.maxPerIP).toBeLessThanOrEqual(config.connections.maxPerKey);

      // TTL值应该合理
      expect(config.cache.realtimeTtl).toBeLessThan(config.cache.defaultTtl);

      // 限流值应该合理
      expect(config.rateLimiting.burstMessages).toBeLessThan(config.rateLimiting.messagesPerMinute);
    });
  });

  describe('配置一致性验证', () => {
    it('应该保持配置键的一致性', () => {
      const config = StreamConfigDefaults.getFullConfig();
      const expectedKeys = ['connections', 'fetching', 'cache', 'rateLimiting', 'websocket', 'monitoring', 'security'];

      expectedKeys.forEach(key => {
        expect(config).toHaveProperty(key);
      });
    });

    it('应该提供有效的默认端口', () => {
      const config = StreamConfigDefaults.getFullConfig();
      expect(config.websocket.port).toBeGreaterThan(1000);
      expect(config.websocket.port).toBeLessThan(65536);
    });

    it('应该提供有效的超时配置', () => {
      const config = StreamConfigDefaults.getFullConfig();
      expect(config.connections.timeout).toBeGreaterThan(1000); // 至少1秒
      expect(config.connections.heartbeatInterval).toBeLessThan(config.connections.timeout);
    });
  });
});