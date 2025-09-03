/**
 * 监控序列化工具测试
 * 🎯 验证序列化工具的功能性和解决序列化逻辑问题的有效性
 */

import {
  MonitoringSerializer,
  MonitoringDataSerializer,
  monitoringSerializationUtils,
  type SerializationOptions,
  type SerializationResult
} from '../../../../../src/monitoring/utils/monitoring-serializer';

describe('MonitoringSerializer', () => {
  describe('基础序列化功能', () => {
    describe('serializeTags方法', () => {
      it('应该序列化简单对象', () => {
        const tags = { service: 'api', version: '1.0' };
        const result = MonitoringSerializer.serializeTags(tags);
        
        expect(result.success).toBe(true);
        expect(result.keyCount).toBe(2);
        expect(result.serialized).toContain('service');
        expect(result.serialized).toContain('api');
        expect(result.serialized).toContain('version');
        expect(result.serialized).toContain('1.0');
      });

      it('应该处理空对象', () => {
        const result = MonitoringSerializer.serializeTags({});
        
        expect(result.success).toBe(true);
        expect(result.keyCount).toBe(0);
        expect(result.serialized).toBe('{}');
      });

      it('应该处理null和undefined', () => {
        const nullResult = MonitoringSerializer.serializeTags(null as any);
        const undefinedResult = MonitoringSerializer.serializeTags(undefined as any);
        
        expect(nullResult.success).toBe(true);
        expect(nullResult.serialized).toBe('{}');
        expect(undefinedResult.success).toBe(true);
        expect(undefinedResult.serialized).toBe('{}');
      });

      it('应该处理非对象类型', () => {
        const stringResult = MonitoringSerializer.serializeTags('string' as any);
        const numberResult = MonitoringSerializer.serializeTags(123 as any);
        const booleanResult = MonitoringSerializer.serializeTags(true as any);
        
        expect(stringResult.success).toBe(true);
        expect(numberResult.success).toBe(true);
        expect(booleanResult.success).toBe(true);
      });
    });

    describe('序列化选项', () => {
      const testTags = { 
        zebra: 'last',
        alpha: 'first', 
        beta: 'second',
        nested: { c: 3, a: 1, b: 2 }
      };

      it('应该支持键排序', () => {
        const sortedResult = MonitoringSerializer.serializeTags(testTags, { sortKeys: true });
        const unsortedResult = MonitoringSerializer.serializeTags(testTags, { sortKeys: false });
        
        expect(sortedResult.success).toBe(true);
        expect(unsortedResult.success).toBe(true);
        
        // 排序后的键应该按字母顺序
        const sortedKeys = Object.keys(JSON.parse(sortedResult.serialized));
        expect(sortedKeys).toEqual(['alpha', 'beta', 'nested', 'zebra']);
      });

      it('应该支持紧凑输出', () => {
        const compactResult = MonitoringSerializer.serializeTags(testTags, { compact: true });
        const prettyResult = MonitoringSerializer.serializeTags(testTags, { compact: false });
        
        expect(compactResult.serialized).not.toContain('\n');
        expect(prettyResult.serialized).toContain('\n');
        expect(compactResult.serialized.length).toBeLessThan(prettyResult.serialized.length);
      });
    });

    describe('特殊值处理', () => {
      it('应该处理Date对象', () => {
        const date = new Date('2023-01-01T00:00:00Z');
        const tags = { timestamp: date };
        const result = MonitoringSerializer.serializeTags(tags, { handleSpecialValues: true });
        
        expect(result.success).toBe(true);
        expect(result.serialized).toContain('2023-01-01T00:00:00.000Z');
      });

      it('应该处理Error对象', () => {
        const error = new Error('Test error');
        error.stack = 'Test stack trace';
        const tags = { error: error };
        const result = MonitoringSerializer.serializeTags(tags, { handleSpecialValues: true });
        
        expect(result.success).toBe(true);
        expect(result.serialized).toContain('Test error');
        expect(result.serialized).toContain('Error');
      });

      it('应该处理function', () => {
        const fn = () => 'test';
        const tags = { callback: fn };
        const result = MonitoringSerializer.serializeTags(tags, { handleSpecialValues: true });
        
        expect(result.success).toBe(true);
        expect(result.serialized).toContain('[Function]');
      });

      it('应该处理Symbol', () => {
        const sym = Symbol('test');
        const tags = { id: sym };
        const result = MonitoringSerializer.serializeTags(tags, { handleSpecialValues: true });
        
        expect(result.success).toBe(true);
        expect(result.serialized).toContain('Symbol(test)');
      });

      it('应该处理循环引用保护', () => {
        const obj: any = { name: 'test' };
        obj.self = obj; // 创建循环引用
        
        const result = MonitoringSerializer.serializeTags(obj, { 
          handleSpecialValues: true,
          maxDepth: 2
        });
        
        expect(result.success).toBe(true);
        expect(result.serialized).toContain('[Max Depth Exceeded]');
      });
    });

    describe('错误处理', () => {
      it('应该处理序列化错误', () => {
        const cyclicObj: any = {};
        cyclicObj.self = cyclicObj;
        
        // 不启用特殊值处理时，应该会遇到循环引用错误
        const result = MonitoringSerializer.serializeTags(cyclicObj, { 
          handleSpecialValues: false 
        });
        
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.serialized).toBe('{}');
        expect(result.keyCount).toBe(0);
      });
    });
  });

  describe('反序列化功能', () => {
    it('应该反序列化有效的JSON字符串', () => {
      const originalTags = { service: 'api', version: '1.0', count: 42 };
      const serialized = JSON.stringify(originalTags);
      const deserialized = MonitoringSerializer.deserializeTags(serialized);
      
      expect(deserialized).toEqual(originalTags);
    });

    it('应该处理空字符串', () => {
      const result1 = MonitoringSerializer.deserializeTags('');
      const result2 = MonitoringSerializer.deserializeTags('   ');
      
      expect(result1).toEqual({});
      expect(result2).toEqual({});
    });

    it('应该处理无效的JSON', () => {
      const invalidJson = '{ invalid json }';
      const result = MonitoringSerializer.deserializeTags(invalidJson);
      
      expect(result).toEqual({});
    });

    it('应该处理非对象JSON', () => {
      const arrayJson = '[1, 2, 3]';
      const stringJson = '"hello world"';
      const numberJson = '123';
      
      expect(MonitoringSerializer.deserializeTags(arrayJson)).toEqual({});
      expect(MonitoringSerializer.deserializeTags(stringJson)).toEqual({});
      expect(MonitoringSerializer.deserializeTags(numberJson)).toEqual({});
    });
  });

  describe('缓存键生成', () => {
    it('应该生成正确的缓存键', () => {
      const metricName = 'response_time';
      const tags = { service: 'api', method: 'GET' };
      const key = MonitoringSerializer.generateCacheKey(metricName, tags);
      
      expect(key).toContain(metricName);
      expect(key).toContain(':');
      expect(key.split(':').length).toBe(2);
    });

    it('应该处理空标签', () => {
      const metricName = 'cpu_usage';
      const key = MonitoringSerializer.generateCacheKey(metricName, {});
      
      expect(key).toContain(metricName);
      expect(key).toContain('{}');
    });

    it('应该为相同输入生成相同键', () => {
      const metricName = 'memory_usage';
      const tags = { service: 'worker', instance: '1' };
      
      const key1 = MonitoringSerializer.generateCacheKey(metricName, tags);
      const key2 = MonitoringSerializer.generateCacheKey(metricName, tags);
      
      expect(key1).toBe(key2);
    });
  });

  describe('批量序列化', () => {
    it('应该批量序列化多个标签对象', () => {
      const tagsList = [
        { service: 'api', version: '1.0' },
        { service: 'worker', version: '2.0' },
        { service: 'db', version: '1.5' }
      ];
      
      const results = MonitoringSerializer.serializeTagsBatch(tagsList);
      
      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.keyCount).toBe(2);
        expect(result.serialized).toContain(tagsList[index].service);
        expect(result.serialized).toContain(tagsList[index].version);
      });
    });

    it('应该处理空数组', () => {
      const results = MonitoringSerializer.serializeTagsBatch([]);
      expect(results).toEqual([]);
    });

    it('应该处理包含错误的批次', () => {
      const cyclicObj: any = {};
      cyclicObj.self = cyclicObj;
      
      const tagsList = [
        { valid: 'object' },
        cyclicObj, // 会导致错误
        { another: 'valid' }
      ];
      
      const results = MonitoringSerializer.serializeTagsBatch(tagsList, { 
        handleSpecialValues: false 
      });
      
      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });

  describe('序列化一致性验证', () => {
    it('应该验证相同对象的一致性', () => {
      const obj1 = { service: 'api', version: '1.0' };
      const obj2 = { service: 'api', version: '1.0' };
      
      const consistent = MonitoringSerializer.areSerializationConsistent(obj1, obj2);
      expect(consistent).toBe(true);
    });

    it('应该检测不同对象', () => {
      const obj1 = { service: 'api', version: '1.0' };
      const obj2 = { service: 'api', version: '2.0' };
      
      const consistent = MonitoringSerializer.areSerializationConsistent(obj1, obj2);
      expect(consistent).toBe(false);
    });

    it('应该处理键顺序不同的对象', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { b: 2, a: 1 };
      
      const consistent = MonitoringSerializer.areSerializationConsistent(obj1, obj2, { 
        sortKeys: true 
      });
      expect(consistent).toBe(true);
    });

    it('应该处理序列化失败的情况', () => {
      const cyclicObj1: any = {};
      cyclicObj1.self = cyclicObj1;
      
      const cyclicObj2: any = {};
      cyclicObj2.self = cyclicObj2;
      
      const consistent = MonitoringSerializer.areSerializationConsistent(
        cyclicObj1, 
        cyclicObj2, 
        { handleSpecialValues: false }
      );
      expect(consistent).toBe(false); // 两者都序列化失败
    });
  });
});

describe('MonitoringDataSerializer', () => {
  describe('时间序列数据序列化', () => {
    it('应该序列化有效的时间序列数据', () => {
      const timeSeriesData = [
        { timestamp: 1234567890, value: 100, tags: { service: 'api' } },
        { timestamp: 1234567900, value: 150, tags: { service: 'worker' } },
        { timestamp: 1234567910, value: 200 }
      ];
      
      const result = MonitoringDataSerializer.serializeTimeSeriesData(timeSeriesData);
      
      expect(result.success).toBe(true);
      expect(result.keyCount).toBe(3);
      expect(result.serialized).toContain('1234567890');
      expect(result.serialized).toContain('100');
      expect(result.serialized).toContain('api');
    });

    it('应该处理空数组', () => {
      const result = MonitoringDataSerializer.serializeTimeSeriesData([]);
      
      expect(result.success).toBe(true);
      expect(result.keyCount).toBe(0);
      expect(result.serialized).toBe('[]');
    });

    it('应该处理无效输入', () => {
      const result = MonitoringDataSerializer.serializeTimeSeriesData('invalid' as any);
      
      expect(result.success).toBe(true);
      expect(result.keyCount).toBe(0);
      expect(result.serialized).toBe('[]');
    });

    it('应该处理没有标签的数据点', () => {
      const timeSeriesData = [
        { timestamp: 1234567890, value: 100 },
        { timestamp: 1234567900, value: 150 }
      ];
      
      const result = MonitoringDataSerializer.serializeTimeSeriesData(timeSeriesData);
      
      expect(result.success).toBe(true);
      expect(result.keyCount).toBe(2);
    });
  });

  describe('聚合数据序列化', () => {
    it('应该序列化聚合数据', () => {
      const aggregateData = {
        metric: 'response_time',
        aggregationType: 'average',
        value: 250.5,
        period: '5m',
        tags: { service: 'api', region: 'us-east-1' }
      };
      
      const result = MonitoringDataSerializer.serializeAggregateData(aggregateData);
      
      expect(result.success).toBe(true);
      expect(result.keyCount).toBe(1);
      expect(result.serialized).toContain('response_time');
      expect(result.serialized).toContain('average');
      expect(result.serialized).toContain('250.5');
      expect(result.serialized).toContain('5m');
      expect(result.serialized).toContain('api');
    });

    it('应该处理没有标签的聚合数据', () => {
      const aggregateData = {
        metric: 'cpu_usage',
        aggregationType: 'max',
        value: 85,
        period: '1h'
      };
      
      const result = MonitoringDataSerializer.serializeAggregateData(aggregateData);
      
      expect(result.success).toBe(true);
      expect(result.serialized).toContain('cpu_usage');
      expect(result.serialized).toContain('max');
      expect(result.serialized).toContain('85');
    });
  });
});

describe('monitoringSerializationUtils', () => {
  it('应该提供便利的序列化函数', () => {
    const tags = { service: 'api', version: '1.0' };
    const serialized = monitoringSerializationUtils.serializeTags(tags);
    
    expect(typeof serialized).toBe('string');
    expect(serialized).toContain('service');
    expect(serialized).toContain('api');
  });

  it('应该提供便利的反序列化函数', () => {
    const originalTags = { service: 'api', version: '1.0' };
    const serialized = JSON.stringify(originalTags);
    const deserialized = monitoringSerializationUtils.deserializeTags(serialized);
    
    expect(deserialized).toEqual(originalTags);
  });

  it('应该提供便利的缓存键生成函数', () => {
    const key = monitoringSerializationUtils.generateCacheKey('metric', { tag: 'value' });
    
    expect(typeof key).toBe('string');
    expect(key).toContain('metric');
    expect(key).toContain(':');
  });

  it('应该提供便利的时间序列序列化函数', () => {
    const data = [{ timestamp: 123, value: 456 }];
    const serialized = monitoringSerializationUtils.serializeTimeSeries(data);
    
    expect(typeof serialized).toBe('string');
    expect(serialized).toContain('123');
    expect(serialized).toContain('456');
  });
});

describe('性能测试', () => {
  it('序列化应该高效执行', () => {
    const tags = { service: 'api', version: '1.0', region: 'us-east-1' };
    const start = Date.now();
    
    for (let i = 0; i < 10000; i++) {
      MonitoringSerializer.serializeTags(tags);
    }
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000); // 应该在1秒内完成
  });

  it('反序列化应该高效执行', () => {
    const serialized = '{"service":"api","version":"1.0","region":"us-east-1"}';
    const start = Date.now();
    
    for (let i = 0; i < 10000; i++) {
      MonitoringSerializer.deserializeTags(serialized);
    }
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });

  it('缓存键生成应该高效执行', () => {
    const metricName = 'response_time';
    const tags = { service: 'api', method: 'GET' };
    const start = Date.now();
    
    for (let i = 0; i < 10000; i++) {
      MonitoringSerializer.generateCacheKey(metricName, tags);
    }
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });
});

describe('实际使用场景测试', () => {
  it('应该解决monitoring-event-bridge.service.ts的序列化问题', () => {
    // 模拟原来的问题代码
    const metricName = 'response_time';
    const tags = { service: 'api', method: 'GET' };
    
    // 新的解决方案
    const newKey = MonitoringSerializer.generateCacheKey(metricName, tags);
    
    // 原来的魔法字符串方式
    const oldKey = JSON.stringify({ metricName, tags });
    
    // 新方案应该更稳定和一致
    expect(typeof newKey).toBe('string');
    expect(newKey).toContain(metricName);
    expect(newKey.length).toBeGreaterThan(0);
  });

  it('应该解决analyzer-trend.service.ts的序列化问题', () => {
    // 模拟原来的指标数据
    const metricsData = {
      requestsCount: 100,
      databaseCount: 50,
      cacheCount: 25,
      hasSystem: true,
    };
    
    // 新的解决方案
    const newResult = MonitoringSerializer.serializeTags(metricsData);
    
    // 原来的方式
    const oldSerialized = JSON.stringify(metricsData);
    
    // 新方案应该提供更多信息和更好的错误处理
    expect(newResult.success).toBe(true);
    expect(newResult.serialized).toBe(oldSerialized);
    expect(newResult.keyCount).toBe(4);
  });
});

describe('边界情况和稳定性测试', () => {
  it('应该处理非常大的对象', () => {
    const largeObject: any = {};
    for (let i = 0; i < 1000; i++) {
      largeObject[`key_${i}`] = `value_${i}`;
    }
    
    const result = MonitoringSerializer.serializeTags(largeObject);
    
    expect(result.success).toBe(true);
    expect(result.keyCount).toBe(1000);
  });

  it('应该处理深度嵌套的对象', () => {
    let deepObject: any = { value: 'leaf' };
    for (let i = 0; i < 20; i++) {
      deepObject = { nested: deepObject };
    }
    
    const result = MonitoringSerializer.serializeTags(deepObject, { 
      handleSpecialValues: true,
      maxDepth: 10
    });
    
    expect(result.success).toBe(true);
    expect(result.serialized).toContain('[Max Depth Exceeded]');
  });

  it('应该处理Unicode和特殊字符', () => {
    const tags = {
      emoji: '🚀💾🔧',
      chinese: '测试数据',
      special: 'special!@#$%^&*()characters',
      unicode: '\u0000\u001F\u007F'
    };
    
    const result = MonitoringSerializer.serializeTags(tags);
    
    expect(result.success).toBe(true);
    expect(result.serialized).toContain('🚀💾🔧');
    expect(result.serialized).toContain('测试数据');
  });
});