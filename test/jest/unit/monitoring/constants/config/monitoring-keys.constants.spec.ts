/**
 * 监控键模板常量测试
 * 🎯 验证键模板常量的功能性和解决魔法字符串问题的有效性
 */

import {
  MONITORING_KEY_TEMPLATES,
  MONITORING_KEY_PREFIXES,
  MONITORING_KEY_SEPARATORS,
  MonitoringKeyGenerator,
  type MonitoringKeyTemplate
} from '../../../../../../src/monitoring/constants/config/monitoring-keys.constants';

describe('MonitoringKeysConstants', () => {
  describe('键模板功能验证', () => {
    describe('REQUEST_KEY模板', () => {
      it('应该生成正确格式的请求键', () => {
        const method = 'GET';
        const endpoint = '/api/users';
        const key = MONITORING_KEY_TEMPLATES.REQUEST_KEY(method, endpoint);
        
        expect(key).toBe('GET:/api/users');
        expect(key).toContain(':');
        expect(key.split(':').length).toBe(2);
      });

      it('应该处理特殊字符和空格', () => {
        const method = 'POST';
        const endpoint = '/api/users with spaces';
        const key = MONITORING_KEY_TEMPLATES.REQUEST_KEY(method, endpoint);
        
        expect(key).toBe('POST:/api/users with spaces');
        expect(key).toContain(endpoint);
      });

      it('应该处理空参数', () => {
        const key1 = MONITORING_KEY_TEMPLATES.REQUEST_KEY('', '');
        const key2 = MONITORING_KEY_TEMPLATES.REQUEST_KEY('GET', '');
        const key3 = MONITORING_KEY_TEMPLATES.REQUEST_KEY('', '/api/test');
        
        expect(key1).toBe(':');
        expect(key2).toBe('GET:');
        expect(key3).toBe(':/api/test');
      });
    });

    describe('METRIC_KEY模板', () => {
      it('应该生成带时间戳的指标键', () => {
        const name = 'response_time';
        const timestamp = 1234567890;
        const key = MONITORING_KEY_TEMPLATES.METRIC_KEY(name, timestamp);
        
        expect(key).toBe('response_time_1234567890');
        expect(key).toContain('_');
        expect(key.split('_').length).toBe(3); // response, time, timestamp
      });

      it('应该处理数字时间戳', () => {
        const name = 'cpu_usage';
        const timestamp = Date.now();
        const key = MONITORING_KEY_TEMPLATES.METRIC_KEY(name, timestamp);
        
        expect(key).toBe(`cpu_usage_${timestamp}`);
        expect(key.endsWith(timestamp.toString())).toBe(true);
      });
    });

    describe('EVENT_KEY模板', () => {
      it('应该生成事件类型和ID组合键', () => {
        const type = 'alert';
        const id = 'alert-123';
        const key = MONITORING_KEY_TEMPLATES.EVENT_KEY(type, id);
        
        expect(key).toBe('alert:alert-123');
        expect(key.split(':').length).toBe(2);
      });
    });

    describe('CACHE_KEY模板', () => {
      it('应该生成带序列化标签的缓存键', () => {
        const metricName = 'response_time';
        const tags = { service: 'api', version: '1.0' };
        const key = MONITORING_KEY_TEMPLATES.CACHE_KEY(metricName, tags);
        
        expect(key).toContain(metricName);
        expect(key).toContain(':');
        expect(key.split(':').length).toBe(2);
        
        // 验证包含序列化的标签
        const serializedPart = key.split(':')[1];
        expect(serializedPart).toContain('service');
        expect(serializedPart).toContain('api');
      });

      it('应该处理空标签对象', () => {
        const metricName = 'cpu_usage';
        const tags = {};
        const key = MONITORING_KEY_TEMPLATES.CACHE_KEY(metricName, tags);
        
        expect(key).toBe('cpu_usage:{}');
      });

      it('应该处理复杂标签对象', () => {
        const metricName = 'database_query_time';
        const tags = {
          database: 'postgres',
          query_type: 'SELECT',
          table: 'users',
          slow_query: true,
          timeout: 5000
        };
        const key = MONITORING_KEY_TEMPLATES.CACHE_KEY(metricName, tags);
        
        expect(key).toContain(metricName);
        expect(key).toContain('postgres');
        expect(key).toContain('SELECT');
        expect(key).toContain('true');
        expect(key).toContain('5000');
      });
    });

    describe('COMPONENT_KEY模板', () => {
      it('应该生成不带实例ID的组件键', () => {
        const componentType = 'service';
        const componentName = 'user-service';
        const key = MONITORING_KEY_TEMPLATES.COMPONENT_KEY(componentType, componentName);
        
        expect(key).toBe('service:user-service');
        expect(key.split(':').length).toBe(2);
      });

      it('应该生成带实例ID的组件键', () => {
        const componentType = 'service';
        const componentName = 'user-service';
        const instanceId = 'instance-1';
        const key = MONITORING_KEY_TEMPLATES.COMPONENT_KEY(componentType, componentName, instanceId);
        
        expect(key).toBe('service:user-service:instance-1');
        expect(key.split(':').length).toBe(3);
      });
    });

    describe('其他键模板', () => {
      it('HEALTH_CHECK_KEY应该生成正确的健康检查键', () => {
        const key = MONITORING_KEY_TEMPLATES.HEALTH_CHECK_KEY('database', 'connection');
        expect(key).toBe('health:database:connection');
      });

      it('ALERT_KEY应该生成正确的告警键', () => {
        const key = MONITORING_KEY_TEMPLATES.ALERT_KEY('critical', 'api', 'response_time');
        expect(key).toBe('alert:critical:api:response_time');
      });

      it('SESSION_KEY应该生成正确的会话键', () => {
        const key = MONITORING_KEY_TEMPLATES.SESSION_KEY('user', 'session-123');
        expect(key).toBe('session:user:session-123');
      });
    });
  });

  describe('MonitoringKeyGenerator类', () => {
    describe('namespaced方法', () => {
      it('应该生成带命名空间的键', () => {
        const key = MonitoringKeyGenerator.namespaced('monitoring', 'metric-1');
        expect(key).toBe('monitoring:metric-1');
      });

      it('应该处理嵌套命名空间', () => {
        const key = MonitoringKeyGenerator.namespaced('app:monitoring', 'cpu_usage');
        expect(key).toBe('app:monitoring:cpu_usage');
      });
    });

    describe('timeWindowKey方法', () => {
      it('应该生成时间窗口键', () => {
        const key = MonitoringKeyGenerator.timeWindowKey('response_time', 60, 1234567890);
        expect(key).toContain('response_time');
        expect(key).toContain('window');
        expect(key).toContain('60');
      });

      it('应该计算正确的窗口开始时间', () => {
        const timestamp = 1234567890;
        const windowSize = 60;
        const expectedWindowStart = Math.floor(timestamp / windowSize) * windowSize;
        
        const key = MonitoringKeyGenerator.timeWindowKey('metric', windowSize, timestamp);
        expect(key).toContain(expectedWindowStart.toString());
      });
    });

    describe('aggregateKey方法', () => {
      it('应该生成聚合键', () => {
        const key = MonitoringKeyGenerator.aggregateKey('cpu_usage', 'average', '5m');
        expect(key).toBe('cpu_usage:agg:average:5m');
      });
    });

    describe('isValidKey方法', () => {
      it('应该验证有效的键', () => {
        const validKeys = [
          'metric:cpu_usage',
          'service:api:instance-1',
          'alert:critical:database:connection',
          'a',
          'simple-key'
        ];

        validKeys.forEach(key => {
          expect(MonitoringKeyGenerator.isValidKey(key)).toBe(true);
        });
      });

      it('应该拒绝无效的键', () => {
        const invalidKeys = [
          '', // 空键
          'key with spaces and tabs\t',
          'key\nwith\nnewlines',
          'key\rwith\rreturns',
          'a'.repeat(251) // 超过长度限制
        ];

        invalidKeys.forEach(key => {
          expect(MonitoringKeyGenerator.isValidKey(key)).toBe(false);
        });
      });

      it('应该处理边界长度', () => {
        const maxLengthKey = 'a'.repeat(250);
        const tooLongKey = 'a'.repeat(251);
        
        expect(MonitoringKeyGenerator.isValidKey(maxLengthKey)).toBe(true);
        expect(MonitoringKeyGenerator.isValidKey(tooLongKey)).toBe(false);
      });
    });
  });

  describe('键前缀和分隔符常量', () => {
    it('应该定义所有必需的前缀', () => {
      expect(MONITORING_KEY_PREFIXES.METRICS).toBe('metrics');
      expect(MONITORING_KEY_PREFIXES.HEALTH).toBe('health');
      expect(MONITORING_KEY_PREFIXES.ALERTS).toBe('alerts');
      expect(MONITORING_KEY_PREFIXES.EVENTS).toBe('events');
      expect(MONITORING_KEY_PREFIXES.SESSIONS).toBe('sessions');
      expect(MONITORING_KEY_PREFIXES.CACHE).toBe('cache');
      expect(MONITORING_KEY_PREFIXES.TEMP).toBe('temp');
    });

    it('应该定义所有必需的分隔符', () => {
      expect(MONITORING_KEY_SEPARATORS.NAMESPACE).toBe(':');
      expect(MONITORING_KEY_SEPARATORS.COMPONENT).toBe('.');
      expect(MONITORING_KEY_SEPARATORS.PARAMETER).toBe('_');
      expect(MONITORING_KEY_SEPARATORS.LIST).toBe('|');
    });

    it('前缀对象应该是不可变的', () => {
      expect(Object.isFrozen(MONITORING_KEY_PREFIXES)).toBe(true);
      expect(Object.isFrozen(MONITORING_KEY_SEPARATORS)).toBe(true);
    });
  });

  describe('类型安全性验证', () => {
    it('MonitoringKeyTemplate类型应该正确', () => {
      const template: MonitoringKeyTemplate = MONITORING_KEY_TEMPLATES.REQUEST_KEY;
      expect(typeof template).toBe('function');
    });

    it('所有模板应该返回字符串', () => {
      const requestKey = MONITORING_KEY_TEMPLATES.REQUEST_KEY('GET', '/api');
      const metricKey = MONITORING_KEY_TEMPLATES.METRIC_KEY('cpu', 123);
      const eventKey = MONITORING_KEY_TEMPLATES.EVENT_KEY('alert', '1');
      
      expect(typeof requestKey).toBe('string');
      expect(typeof metricKey).toBe('string');
      expect(typeof eventKey).toBe('string');
    });
  });

  describe('魔法字符串解决方案验证', () => {
    it('应该替换analyzer-metrics.service.ts中的魔法字符串', () => {
      const method = 'POST';
      const endpoint = '/api/stocks';
      
      // 新的标准化方式
      const standardKey = MONITORING_KEY_TEMPLATES.REQUEST_KEY(method, endpoint);
      
      // 原来的魔法字符串方式
      const magicStringKey = `${method}:${endpoint}`;
      
      // 应该产生相同的结果
      expect(standardKey).toBe(magicStringKey);
      expect(standardKey).toBe('POST:/api/stocks');
    });

    it('应该支持缓存键生成场景', () => {
      const metricName = 'response_time';
      const tags = { service: 'api', method: 'GET' };
      
      const cacheKey = MONITORING_KEY_TEMPLATES.CACHE_KEY(metricName, tags);
      
      expect(cacheKey).toContain(metricName);
      expect(cacheKey).toContain('service');
      expect(cacheKey).toContain('api');
    });
  });

  describe('性能测试', () => {
    it('键生成应该快速执行', () => {
      const start = Date.now();
      
      for (let i = 0; i < 10000; i++) {
        MONITORING_KEY_TEMPLATES.REQUEST_KEY('GET', '/api/test');
        MONITORING_KEY_TEMPLATES.METRIC_KEY('metric', i);
        MONITORING_KEY_TEMPLATES.CACHE_KEY('cache', { id: i });
        MonitoringKeyGenerator.namespaced('ns', `key-${i}`);
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(200); // 应该在200ms内完成
    });

    it('键验证应该高效', () => {
      const start = Date.now();
      const testKeys = ['valid:key', 'another-key', 'metric_name_123'];
      
      for (let i = 0; i < 10000; i++) {
        testKeys.forEach(key => {
          MonitoringKeyGenerator.isValidKey(key);
        });
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });
  });

  describe('并发安全性测试', () => {
    it('模板函数应该是线程安全的', async () => {
      const promises = Array.from({ length: 100 }, (_, i) => 
        Promise.resolve().then(() => {
          const key = MONITORING_KEY_TEMPLATES.REQUEST_KEY(`method-${i}`, `/endpoint-${i}`);
          return key;
        })
      );

      const results = await Promise.all(promises);
      
      // 所有结果应该是不同的
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(100);
      
      // 每个结果都应该符合预期格式
      results.forEach((key, index) => {
        expect(key).toBe(`method-${index}:/endpoint-${index}`);
      });
    });
  });

  describe('边界情况和错误处理', () => {
    it('应该处理undefined和null参数', () => {
      expect(() => {
        MONITORING_KEY_TEMPLATES.REQUEST_KEY(undefined as any, null as any);
      }).not.toThrow();

      expect(() => {
        MONITORING_KEY_TEMPLATES.CACHE_KEY('metric', null as any);
      }).not.toThrow();
    });

    it('应该处理非字符串参数', () => {
      const numericMethod = 123 as any;
      const booleanEndpoint = true as any;
      
      expect(() => {
        MONITORING_KEY_TEMPLATES.REQUEST_KEY(numericMethod, booleanEndpoint);
      }).not.toThrow();
    });

    it('应该处理非常长的键', () => {
      const longMethod = 'M'.repeat(1000);
      const longEndpoint = '/'.repeat(1000);
      
      expect(() => {
        const key = MONITORING_KEY_TEMPLATES.REQUEST_KEY(longMethod, longEndpoint);
        expect(key.length).toBeGreaterThan(2000);
      }).not.toThrow();
    });
  });
});