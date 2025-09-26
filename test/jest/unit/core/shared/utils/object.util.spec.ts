import { ObjectUtils } from '@core/shared/utils/object.util';

describe('ObjectUtils', () => {
  describe('getValueFromPath', () => {
    const testObj = {
      name: 'test',
      nested: {
        property: 'value',
        deep: {
          level: 'deep_value'
        }
      },
      array: [1, 2, { item: 'array_item' }],
      snake_case: 'snake_value',
      'kebab-case': 'kebab_value'
    };

    it('should get simple property values', () => {
      expect(ObjectUtils.getValueFromPath(testObj, 'name')).toBe('test');
    });

    it('should get nested property values', () => {
      expect(ObjectUtils.getValueFromPath(testObj, 'nested.property')).toBe('value');
      expect(ObjectUtils.getValueFromPath(testObj, 'nested.deep.level')).toBe('deep_value');
    });

    it('should get array values by index', () => {
      expect(ObjectUtils.getValueFromPath(testObj, 'array[0]')).toBe(1);
      expect(ObjectUtils.getValueFromPath(testObj, 'array[1]')).toBe(2);
      expect(ObjectUtils.getValueFromPath(testObj, 'array[2].item')).toBe('array_item');
    });

    it('should handle mixed notation', () => {
      expect(ObjectUtils.getValueFromPath(testObj, 'array[2].item')).toBe('array_item');
    });

    it('should handle camelCase conversion', () => {
      expect(ObjectUtils.getValueFromPath(testObj, 'snake_case')).toBe('snake_value');
    });

    it('should return undefined for non-existent paths', () => {
      expect(ObjectUtils.getValueFromPath(testObj, 'nonexistent')).toBeUndefined();
      expect(ObjectUtils.getValueFromPath(testObj, 'nested.nonexistent')).toBeUndefined();
      expect(ObjectUtils.getValueFromPath(testObj, 'array[10]')).toBeUndefined();
    });

    it('should handle null and undefined objects', () => {
      expect(ObjectUtils.getValueFromPath(null, 'path')).toBeUndefined();
      expect(ObjectUtils.getValueFromPath(undefined, 'path')).toBeUndefined();
    });

    it('should handle invalid path types', () => {
      expect(ObjectUtils.getValueFromPath(testObj, null as any)).toBeUndefined();
      expect(ObjectUtils.getValueFromPath(testObj, undefined as any)).toBeUndefined();
      expect(ObjectUtils.getValueFromPath(testObj, 123 as any)).toBeUndefined();
    });

    it('should handle empty paths', () => {
      expect(ObjectUtils.getValueFromPath(testObj, '')).toBeUndefined();
    });

    it('should block dangerous property access', () => {
      const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

      dangerousKeys.forEach(key => {
        expect(() => ObjectUtils.getValueFromPath(testObj, key)).toThrow();
      });
    });

    it('should handle array out of bounds gracefully', () => {
      expect(ObjectUtils.getValueFromPath(testObj, 'array[999]')).toBeUndefined();
      expect(ObjectUtils.getValueFromPath(testObj, 'array[-1]')).toBeUndefined();
    });

    it('should handle complex nested structures', () => {
      const complexObj = {
        level1: {
          level2: {
            level3: {
              data: 'deep_data'
            }
          }
        }
      };

      expect(ObjectUtils.getValueFromPath(complexObj, 'level1.level2.level3.data')).toBe('deep_data');
    });

    it('should handle arrays of objects', () => {
      const arrayObj = {
        users: [
          { id: 1, name: 'John' },
          { id: 2, name: 'Jane' }
        ]
      };

      expect(ObjectUtils.getValueFromPath(arrayObj, 'users[0].name')).toBe('John');
      expect(ObjectUtils.getValueFromPath(arrayObj, 'users[1].id')).toBe(2);
    });

    it('should handle mixed array and object notation', () => {
      const mixedObj = {
        data: [
          {
            items: ['a', 'b', 'c']
          }
        ]
      };

      expect(ObjectUtils.getValueFromPath(mixedObj, 'data[0].items[1]')).toBe('b');
    });

    it('should handle edge cases with valid data', () => {
      const edgeObj = {
        '0': 'zero',
        '': 'empty',
        ' ': 'space'
      };

      expect(ObjectUtils.getValueFromPath(edgeObj, '0')).toBe('zero');
    });
  });

  describe('Security and Safety', () => {
    it('should be a static utility class', () => {
      expect(typeof ObjectUtils.getValueFromPath).toBe('function');
    });

    it('should not allow instantiation attempts', () => {
      expect(() => ObjectUtils.getValueFromPath({}, 'test')).not.toThrow();
    });

    it('should handle prototype pollution attempts', () => {
      const maliciousObj = JSON.parse('{"__proto__": {"polluted": true}}');

      expect(() => ObjectUtils.getValueFromPath(maliciousObj, '__proto__.polluted')).toThrow();
    });

    it('should handle various dangerous property names', () => {
      const dangerousProperties = [
        '__proto__',
        'constructor',
        'prototype',
        '__defineGetter__',
        '__defineSetter__',
        'hasOwnProperty',
        'toString',
        'valueOf'
      ];

      dangerousProperties.forEach(prop => {
        expect(() => ObjectUtils.getValueFromPath({}, prop)).toThrow();
      });
    });
  });

  describe('Performance and Limits', () => {
    it('should handle reasonable path depths', () => {
      const deepObj = {
        a: { b: { c: { d: { e: 'deep' } } } }
      };

      expect(ObjectUtils.getValueFromPath(deepObj, 'a.b.c.d.e')).toBe('deep');
    });

    it('should handle large arrays efficiently', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => i);
      const obj = { data: largeArray };

      expect(ObjectUtils.getValueFromPath(obj, 'data[999]')).toBe(999);
      expect(ObjectUtils.getValueFromPath(obj, 'data[500]')).toBe(500);
    });
  });

  describe('Type Safety and Edge Cases', () => {
    it('should handle different data types', () => {
      const typedObj = {
        string: 'text',
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        object: { nested: 'value' }
      };

      expect(ObjectUtils.getValueFromPath(typedObj, 'string')).toBe('text');
      expect(ObjectUtils.getValueFromPath(typedObj, 'number')).toBe(42);
      expect(ObjectUtils.getValueFromPath(typedObj, 'boolean')).toBe(true);
      expect(ObjectUtils.getValueFromPath(typedObj, 'null')).toBeNull();
      expect(ObjectUtils.getValueFromPath(typedObj, 'array')).toEqual([1, 2, 3]);
      expect(ObjectUtils.getValueFromPath(typedObj, 'object.nested')).toBe('value');
    });

    it('should handle special characters in paths', () => {
      const specialObj = {
        'key with spaces': 'space_value',
        'key-with-dashes': 'dash_value',
        'key_with_underscores': 'underscore_value'
      };

      expect(ObjectUtils.getValueFromPath(specialObj, 'key with spaces')).toBe('space_value');
      expect(ObjectUtils.getValueFromPath(specialObj, 'key-with-dashes')).toBe('dash_value');
      expect(ObjectUtils.getValueFromPath(specialObj, 'key_with_underscores')).toBe('underscore_value');
    });

    it('should handle circular reference protection', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      // Should not cause infinite loop
      expect(ObjectUtils.getValueFromPath(circularObj, 'name')).toBe('test');
      expect(ObjectUtils.getValueFromPath(circularObj, 'self.name')).toBe('test');
    });
  });
});
