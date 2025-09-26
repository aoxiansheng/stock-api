/**
 * MonitoringSerializer Unit Tests
 * 测试监控序列化工具类的功能
 */

import { MonitoringSerializer, MonitoringDataSerializer, monitoringSerializationUtils } from '@monitoring/utils/monitoring-serializer';
import { MONITORING_KEY_TEMPLATES } from '@monitoring/constants/config/monitoring-keys.constants';

// Mock MONITORING_KEY_TEMPLATES
jest.mock('@monitoring/constants/config/monitoring-keys.constants', () => ({
  MONITORING_KEY_TEMPLATES: {
    CACHE_KEY: jest.fn((metricName: string, tags: Record<string, any>) => 
      `${metricName}:${JSON.stringify(tags)} `
    ),
  },
}));

describe('MonitoringSerializer', () => {
  describe('serializeTags', () => {
    it('should serialize tags object correctly', () => {
      const tags = { service: 'test', env: 'dev' };
      const result = MonitoringSerializer.serializeTags(tags);

      expect(result).toEqual({
        serialized: '{"env":"dev","service":"test"}',
        keyCount: 2,
        success: true,
      });
    });

    it('should handle empty tags object', () => {
      const tags = {};
      const result = MonitoringSerializer.serializeTags(tags);

      expect(result).toEqual({
        serialized: '{}',
        keyCount: 0,
        success: true,
      });
    });

    it('should handle null tags', () => {
      const result = MonitoringSerializer.serializeTags(null as any);

      expect(result).toEqual({
        serialized: '{}',
        keyCount: 0,
        success: true,
      });
    });

    it('should handle undefined tags', () => {
      const result = MonitoringSerializer.serializeTags(undefined as any);

      expect(result).toEqual({
        serialized: '{}',
        keyCount: 0,
        success: true,
      });
    });

    it('should handle non-object tags', () => {
      const result = MonitoringSerializer.serializeTags('invalid' as any);

      expect(result).toEqual({
        serialized: '{}',
        keyCount: 0,
        success: true,
      });
    });

    it('should sort keys by default', () => {
      const tags = { z: 'last', a: 'first' };
      const result = MonitoringSerializer.serializeTags(tags);

      expect(result.serialized).toBe('{"a":"first","z":"last"}');
    });

    it('should not sort keys when sortKeys is false', () => {
      const tags = { z: 'last', a: 'first' };
      const result = MonitoringSerializer.serializeTags(tags, { sortKeys: false });

      // Order may vary, but should contain both keys
      expect(result.serialized).toContain('"z":"last"');
      expect(result.serialized).toContain('"a":"first"');
    });

    it('should produce compact output by default', () => {
      const tags = { service: 'test' };
      const result = MonitoringSerializer.serializeTags(tags);

      expect(result.serialized).toBe('{"service":"test"}');
      expect(result.serialized).not.toContain('\n');
    });

    it('should produce formatted output when compact is false', () => {
      const tags = { service: 'test' };
      const result = MonitoringSerializer.serializeTags(tags, { compact: false });

      expect(result.serialized).toContain('\n');
      expect(result.serialized).toContain('  ');
    });

    it('should handle special values when handleSpecialValues is true', () => {
      const tags = { 
        nullValue: null,
        undefinedValue: undefined,
        dateValue: new Date('2023-01-01T00:00:00Z'),
        funcValue: () => {},
      };
      
      const result = MonitoringSerializer.serializeTags(tags);

      expect(result.success).toBe(true);
      expect(result.serialized).toContain('"nullValue":null');
      expect(result.serialized).toContain('"dateValue":"2023-01-01T00:00:00.000Z"');
      expect(result.serialized).toContain('"funcValue":"[Function]"');
    });

    it('should handle circular references', () => {
      const tags: any = { a: 1 };
      tags.circular = tags;
      
      const result = MonitoringSerializer.serializeTags(tags);

      expect(result.success).toBe(true);
      expect(result.serialized).toBe('{"a":1,"circular":"[Max Depth Exceeded]"}');
    });

    it('should handle errors gracefully', () => {
      const tags = {
        invalid: {
          toJSON: () => {
            throw new Error('Serialization error');
          }
        }
      };
      
      const result = MonitoringSerializer.serializeTags(tags);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Serialization error');
      expect(result.serialized).toBe('{}');
    });
  });

  describe('deserializeTags', () => {
    it('should deserialize valid JSON string', () => {
      const serialized = '{"service":"test","env":"dev"}';
      const result = MonitoringSerializer.deserializeTags(serialized);

      expect(result).toEqual({ service: 'test', env: 'dev' });
    });

    it('should return empty object for empty string', () => {
      const result = MonitoringSerializer.deserializeTags('');

      expect(result).toEqual({});
    });

    it('should return empty object for null string', () => {
      const result = MonitoringSerializer.deserializeTags(null as any);

      expect(result).toEqual({});
    });

    it('should return empty object for invalid JSON', () => {
      const result = MonitoringSerializer.deserializeTags('invalid json');

      expect(result).toEqual({});
    });

    it('should return empty object for non-object JSON', () => {
      const result = MonitoringSerializer.deserializeTags('"string"');

      expect(result).toEqual({});
    });

    it('should return empty object for null JSON', () => {
      const result = MonitoringSerializer.deserializeTags('null');

      expect(result).toEqual({});
    });
  });

  describe('generateCacheKey', () => {
    it('should generate cache key using template', () => {
      const tags = { service: 'test', env: 'dev' };
      const result = MonitoringSerializer.generateCacheKey('metric_name', tags);

      expect(MONITORING_KEY_TEMPLATES.CACHE_KEY).toHaveBeenCalledWith('metric_name', tags);
    });
  });

  describe('serializeTagsBatch', () => {
    it('should serialize multiple tag objects', () => {
      const tagsList = [
        { service: 'test1', env: 'dev1' },
        { service: 'test2', env: 'dev2' },
      ];
      
      const result = MonitoringSerializer.serializeTagsBatch(tagsList);

      expect(result).toHaveLength(2);
      expect(result[0].success).toBe(true);
      expect(result[1].success).toBe(true);
      expect(result[0].serialized).toBe('{"env":"dev1","service":"test1"}');
      expect(result[1].serialized).toBe('{"env":"dev2","service":"test2"}');
    });

    it('should handle empty array', () => {
      const result = MonitoringSerializer.serializeTagsBatch([]);

      expect(result).toEqual([]);
    });
  });

  describe('areSerializationConsistent', () => {
    it('should return true for identical objects', () => {
      const obj1 = { service: 'test', env: 'dev' };
      const obj2 = { service: 'test', env: 'dev' };
      
      const result = MonitoringSerializer.areSerializationConsistent(obj1, obj2);

      expect(result).toBe(true);
    });

    it('should return true for objects with different key order', () => {
      const obj1 = { service: 'test', env: 'dev' };
      const obj2 = { env: 'dev', service: 'test' };
      
      const result = MonitoringSerializer.areSerializationConsistent(obj1, obj2);

      expect(result).toBe(true);
    });

    it('should return false for different objects', () => {
      const obj1 = { service: 'test1', env: 'dev' };
      const obj2 = { service: 'test2', env: 'dev' };
      
      const result = MonitoringSerializer.areSerializationConsistent(obj1, obj2);

      expect(result).toBe(false);
    });

    it('should return false when serialization fails', () => {
      const obj1 = { 
        invalid: {
          toJSON: () => {
            throw new Error('Serialization error');
          }
        }
      };
      const obj2 = { service: 'test' };
      
      const result = MonitoringSerializer.areSerializationConsistent(obj1, obj2);

      expect(result).toBe(false);
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize null and undefined values', () => {
      const result = (MonitoringSerializer as any).sanitizeObject(null, 10);
      expect(result).toBeNull();

      const result2 = (MonitoringSerializer as any).sanitizeObject(undefined, 10);
      expect(result2).toBeNull();
    });

    it('should sanitize function values', () => {
      const obj = { func: () => {} };
      const result = (MonitoringSerializer as any).sanitizeObject(obj, 10);

      expect(result.func).toBe('[Function]');
    });

    it('should sanitize symbol values', () => {
      const sym = Symbol('test');
      const obj = { symbol: sym };
      const result = (MonitoringSerializer as any).sanitizeObject(obj, 10);

      expect(result.symbol).toBe(sym.toString());
    });

    it('should sanitize date values', () => {
      const date = new Date('2023-01-01T00:00:00Z');
      const obj = { date };
      const result = (MonitoringSerializer as any).sanitizeObject(obj, 10);

      expect(result.date).toBe('2023-01-01T00:00:00.000Z');
    });

    it('should sanitize error values', () => {
      const error = new Error('Test error');
      const obj = { error };
      const result = (MonitoringSerializer as any).sanitizeObject(obj, 10);

      expect(result.error).toEqual({
        name: 'Error',
        message: 'Test error',
        stack: expect.any(String),
      });
    });

    it('should sanitize array values', () => {
      const obj = { arr: [1, null, () => {}] };
      const result = (MonitoringSerializer as any).sanitizeObject(obj, 10);

      expect(result.arr).toEqual([1, null, '[Function]']);
    });

    it('should handle max depth', () => {
      const obj = { nested: { deeper: { deepest: 'value' } } };
      const result = (MonitoringSerializer as any).sanitizeObject(obj, 2);

      expect(result.nested.deeper).toBe('[Max Depth Exceeded]');
    });
  });

  describe('sortObjectKeys', () => {
    it('should sort object keys', () => {
      const obj = { z: 'last', a: 'first', m: 'middle' };
      const result = (MonitoringSerializer as any).sortObjectKeys(obj);

      const keys = Object.keys(result);
      expect(keys).toEqual(['a', 'm', 'z']);
    });

    it('should handle non-object values', () => {
      expect((MonitoringSerializer as any).sortObjectKeys(null)).toBeNull();
      expect((MonitoringSerializer as any).sortObjectKeys('string')).toBe('string');
      expect((MonitoringSerializer as any).sortObjectKeys(123)).toBe(123);
    });

    it('should recursively sort nested objects', () => {
      const obj = { 
        z: 'last', 
        a: { 
          z: 'nested-last', 
          a: 'nested-first' 
        } 
      };
      const result = (MonitoringSerializer as any).sortObjectKeys(obj);

      expect(Object.keys(result)).toEqual(['a', 'z']);
      expect(Object.keys(result.a)).toEqual(['a', 'z']);
    });
  });
});

describe('MonitoringDataSerializer', () => {
  describe('serializeTimeSeriesData', () => {
    it('should serialize time series data correctly', () => {
      const timeSeriesData = [
        { timestamp: 1672531200000, value: 100, tags: { service: 'test' } },
        { timestamp: 1672531260000, value: 150, tags: { service: 'test' } },
      ];
      
      const result = MonitoringDataSerializer.serializeTimeSeriesData(timeSeriesData);

      expect(result.success).toBe(true);
      expect(result.keyCount).toBe(2);
      expect(result.serialized).toContain('"timestamp":1672531200000');
      expect(result.serialized).toContain('"value":100');
      expect(result.serialized).toContain('{"service":"test"}');
    });

    it('should handle empty time series data', () => {
      const result = MonitoringDataSerializer.serializeTimeSeriesData([]);

      expect(result).toEqual({
        serialized: '[]',
        keyCount: 0,
        success: true,
      });
    });

    it('should handle non-array time series data', () => {
      const result = MonitoringDataSerializer.serializeTimeSeriesData(null as any);

      expect(result).toEqual({
        serialized: '[]',
        keyCount: 0,
        success: true,
      });
    });

    it('should handle time series data without tags', () => {
      const timeSeriesData = [
        { timestamp: 1672531200000, value: 100 },
      ];
      
      const result = MonitoringDataSerializer.serializeTimeSeriesData(timeSeriesData);

      expect(result.success).toBe(true);
      expect(result.serialized).toContain('"tags":undefined');
    });

    it('should handle errors gracefully', () => {
      const timeSeriesData = [
        {
          timestamp: 1672531200000,
          value: 100,
          tags: {
            invalid: {
              toJSON: () => {
                throw new Error('Serialization error');
              }
            }
          }
        },
      ];
      
      const result = MonitoringDataSerializer.serializeTimeSeriesData(timeSeriesData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Serialization error');
    });
  });

  describe('serializeAggregateData', () => {
    it('should serialize aggregate data correctly', () => {
      const aggregateData = {
        metric: 'response_time',
        aggregationType: 'avg',
        value: 150,
        period: '1h',
        tags: { service: 'test' },
      };
      
      const result = MonitoringDataSerializer.serializeAggregateData(aggregateData);

      expect(result.success).toBe(true);
      expect(result.keyCount).toBe(1);
      expect(result.serialized).toContain('"metric":"response_time"');
      expect(result.serialized).toContain('"aggregationType":"avg"');
      expect(result.serialized).toContain('"value":150');
      expect(result.serialized).toContain('"period":"1h"');
      expect(result.serialized).toContain('{"service":"test"}');
    });

    it('should handle aggregate data without tags', () => {
      const aggregateData = {
        metric: 'response_time',
        aggregationType: 'avg',
        value: 150,
        period: '1h',
      };
      
      const result = MonitoringDataSerializer.serializeAggregateData(aggregateData);

      expect(result.success).toBe(true);
      expect(result.serialized).toContain('"tags":undefined');
    });

    it('should handle errors gracefully', () => {
      const aggregateData = {
        metric: 'response_time',
        aggregationType: 'avg',
        value: 150,
        period: '1h',
        tags: {
          invalid: {
            toJSON: () => {
              throw new Error('Serialization error');
            }
          }
        },
      };
      
      const result = MonitoringDataSerializer.serializeAggregateData(aggregateData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Serialization error');
    });
  });
});

describe('monitoringSerializationUtils', () => {
  describe('serializeTags', () => {
    it('should provide convenient serializeTags function', () => {
      const tags = { service: 'test' };
      const result = monitoringSerializationUtils.serializeTags(tags);

      expect(result).toBe('{"service":"test"}');
    });
  });

  describe('deserializeTags', () => {
    it('should provide convenient deserializeTags function', () => {
      const serialized = '{"service":"test"}';
      const result = monitoringSerializationUtils.deserializeTags(serialized);

      expect(result).toEqual({ service: 'test' });
    });
  });

  describe('generateCacheKey', () => {
    it('should provide convenient generateCacheKey function', () => {
      const tags = { service: 'test' };
      const result = monitoringSerializationUtils.generateCacheKey('metric_name', tags);

      expect(result).toBe('metric_name:{"service":"test"}');
    });
  });

  describe('serializeTimeSeries', () => {
    it('should provide convenient serializeTimeSeries function', () => {
      const timeSeriesData = [
        { timestamp: 1672531200000, value: 100 },
      ];
      const result = monitoringSerializationUtils.serializeTimeSeries(timeSeriesData);

      expect(typeof result).toBe('string');
      expect(result).toContain('"timestamp":1672531200000');
    });
  });
});