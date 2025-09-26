import {
  MONITORING_KEY_TEMPLATES,
  MONITORING_KEY_PREFIXES,
  MONITORING_KEY_SEPARATORS,
} from '@monitoring/constants/config/monitoring-keys.constants';

describe('MonitoringKeysConstants', () => {
  describe('MONITORING_KEY_TEMPLATES', () => {
    it('should define REQUEST_KEY template function', () => {
      const key = MONITORING_KEY_TEMPLATES.REQUEST_KEY('GET', '/api/test');
      expect(key).toBe('GET:/api/test');
    });

    it('should define CACHE_KEY template function', () => {
      const tags = { service: 'test', env: 'dev' };
      const key = MONITORING_KEY_TEMPLATES.CACHE_KEY('metric_name', tags);
      expect(key).toBe('metric_name:{"service":"test","env":"dev"}');
    });
  });

  describe('MONITORING_KEY_PREFIXES', () => {
    it('should define all key prefixes', () => {
      expect(MONITORING_KEY_PREFIXES.METRICS).toBe('metrics');
      expect(MONITORING_KEY_PREFIXES.HEALTH).toBe('health');
      expect(MONITORING_KEY_PREFIXES.EVENTS).toBe('events');
      expect(MONITORING_KEY_PREFIXES.CACHE).toBe('cache');
      expect(MONITORING_KEY_PREFIXES.TEMP).toBe('temp');
    });
  });

  describe('MONITORING_KEY_SEPARATORS', () => {
    it('should define all key separators', () => {
      expect(MONITORING_KEY_SEPARATORS.NAMESPACE).toBe(':');
      expect(MONITORING_KEY_SEPARATORS.COMPONENT).toBe('.');
      expect(MONITORING_KEY_SEPARATORS.LIST).toBe('|');
    });
  });
});