import { deepFreeze, isDeepFrozen } from '../../../../../src/common/utils/object-immutability.util';

describe('ObjectImmutabilityUtil - Comprehensive Coverage', () => {
  describe('deepFreeze', () => {
    it('should handle null and undefined values', () => {
      expect(deepFreeze(null)).toBe(null);
      expect(deepFreeze(undefined)).toBe(undefined);
    });

    it('should handle primitive values', () => {
      expect(deepFreeze(42)).toBe(42);
      expect(deepFreeze('test')).toBe('test');
      expect(deepFreeze(true)).toBe(true);
      expect(deepFreeze(false)).toBe(false);
      expect(deepFreeze(Symbol('test'))).toEqual(expect.any(Symbol));
    });

    it('should freeze simple objects', () => {
      const obj = { a: 1, b: 'test' };
      const frozen = deepFreeze(obj);

      expect(Object.isFrozen(frozen)).toBe(true);
      expect(frozen).toBe(obj); // Should return the same reference
      expect(() => {
        (frozen as any).a = 2;
      }).toThrow();
    });

    it('should freeze nested objects recursively', () => {
      const obj = {
        level1: {
          level2: {
            level3: {
              value: 'deep'
            }
          },
          array: [1, 2, { nested: true }]
        },
        simple: 'value'
      };

      const frozen = deepFreeze(obj);

      expect(Object.isFrozen(frozen)).toBe(true);
      expect(Object.isFrozen(frozen.level1)).toBe(true);
      expect(Object.isFrozen(frozen.level1.level2)).toBe(true);
      expect(Object.isFrozen(frozen.level1.level2.level3)).toBe(true);
      expect(Object.isFrozen(frozen.level1.array)).toBe(true);
      expect(Object.isFrozen(frozen.level1.array[2])).toBe(true);

      // Test that modifications are prevented
      expect(() => {
        (frozen.level1.level2.level3 as any).value = 'modified';
      }).toThrow();

      expect(() => {
        (frozen.level1.array[2] as any).nested = false;
      }).toThrow();
    });

    it('should handle arrays', () => {
      const arr = [1, 'test', { nested: true }, [1, 2, 3]];
      const frozen = deepFreeze(arr);

      expect(Object.isFrozen(frozen)).toBe(true);
      expect(Object.isFrozen(frozen[2])).toBe(true);
      expect(Object.isFrozen(frozen[3])).toBe(true);

      expect(() => {
        frozen.push(4);
      }).toThrow();

      expect(() => {
        (frozen[2] as any).nested = false;
      }).toThrow();
    });

    it('should handle objects with non-enumerable properties', () => {
      const obj = { visible: 'value' };
      Object.defineProperty(obj, 'hidden', {
        value: 'secret',
        enumerable: false,
        writable: true,
        configurable: true
      });

      const frozen = deepFreeze(obj);

      expect(Object.isFrozen(frozen)).toBe(true);
      expect(() => {
        (frozen as any).hidden = 'modified';
      }).toThrow();
    });

    it('should handle circular references without infinite recursion', () => {
      const obj: any = { name: 'parent' };
      obj.self = obj;

      const frozen = deepFreeze(obj);

      expect(Object.isFrozen(frozen)).toBe(true);
      expect(frozen.self).toBe(frozen);
    });

    it('should not re-freeze already frozen objects', () => {
      const obj = { value: 'test' };
      const firstFreeze = deepFreeze(obj);
      const secondFreeze = deepFreeze(firstFreeze);

      expect(firstFreeze).toBe(secondFreeze);
      expect(Object.isFrozen(secondFreeze)).toBe(true);
    });

    it('should handle dates', () => {
      const date = new Date();
      const frozen = deepFreeze(date);

      expect(Object.isFrozen(frozen)).toBe(true);
      expect(frozen).toBe(date);
    });

    it('should handle functions', () => {
      const func = function test() { return 'test'; };
      func.property = 'value';

      const frozen = deepFreeze(func);

      expect(Object.isFrozen(frozen)).toBe(true);
      expect(() => {
        (frozen as any).property = 'modified';
      }).toThrow();
    });

    it('should handle objects with getters and setters', () => {
      const obj = {
        _value: 'internal',
        get value() { return this._value; },
        set value(val) { this._value = val; }
      };

      const frozen = deepFreeze(obj);

      expect(Object.isFrozen(frozen)).toBe(true);
      // Getter should still work
      expect(frozen.value).toBe('internal');
      // Setter should be prevented
      expect(() => {
        frozen.value = 'modified';
      }).toThrow();
    });

    it('should handle empty objects and arrays', () => {
      const emptyObj = {};
      const emptyArr: any[] = [];

      const frozenObj = deepFreeze(emptyObj);
      const frozenArr = deepFreeze(emptyArr);

      expect(Object.isFrozen(frozenObj)).toBe(true);
      expect(Object.isFrozen(frozenArr)).toBe(true);

      expect(() => {
        (frozenObj as any).newProp = 'value';
      }).toThrow();

      expect(() => {
        frozenArr.push('item');
      }).toThrow();
    });
  });

  describe('isDeepFrozen', () => {
    it('should return true for null and undefined', () => {
      expect(isDeepFrozen(null)).toBe(true);
      expect(isDeepFrozen(undefined)).toBe(true);
    });

    it('should return true for primitive values', () => {
      expect(isDeepFrozen(42)).toBe(true);
      expect(isDeepFrozen('test')).toBe(true);
      expect(isDeepFrozen(true)).toBe(true);
      expect(isDeepFrozen(false)).toBe(true);
    });

    it('should return false for non-frozen objects', () => {
      const obj = { a: 1, b: 'test' };
      expect(isDeepFrozen(obj)).toBe(false);
    });

    it('should return true for shallow frozen objects without nested objects', () => {
      const obj = { a: 1, b: 'test' };
      Object.freeze(obj);
      expect(isDeepFrozen(obj)).toBe(true);
    });

    it('should return false for shallow frozen objects with non-frozen nested objects', () => {
      const obj = {
        simple: 'value',
        nested: { value: 'not frozen' }
      };
      Object.freeze(obj);
      expect(isDeepFrozen(obj)).toBe(false);
    });

    it('should return true for deeply frozen objects', () => {
      const obj = {
        level1: {
          level2: {
            value: 'deep'
          }
        },
        array: [1, 2, { nested: true }]
      };

      const frozen = deepFreeze(obj);
      expect(isDeepFrozen(frozen)).toBe(true);
    });

    it('should handle arrays correctly', () => {
      const arr = [1, 'test', { nested: true }];
      expect(isDeepFrozen(arr)).toBe(false);

      Object.freeze(arr);
      expect(isDeepFrozen(arr)).toBe(false); // nested object not frozen

      const frozenArr = deepFreeze([1, 'test', { nested: true }]);
      expect(isDeepFrozen(frozenArr)).toBe(true);
    });

    it('should handle empty objects and arrays', () => {
      const emptyObj = {};
      const emptyArr: any[] = [];

      Object.freeze(emptyObj);
      Object.freeze(emptyArr);

      expect(isDeepFrozen(emptyObj)).toBe(true);
      expect(isDeepFrozen(emptyArr)).toBe(true);
    });

    it('should handle objects with non-enumerable properties', () => {
      const obj = { visible: 'value' };
      Object.defineProperty(obj, 'hidden', {
        value: { secret: 'data' },
        enumerable: false,
        writable: true,
        configurable: true
      });

      Object.freeze(obj);
      expect(isDeepFrozen(obj)).toBe(false); // hidden property not frozen

      deepFreeze(obj);
      expect(isDeepFrozen(obj)).toBe(true);
    });

    it('should handle circular references', () => {
      const obj: any = { name: 'parent' };
      obj.self = obj;

      expect(isDeepFrozen(obj)).toBe(false);

      const frozen = deepFreeze(obj);
      expect(isDeepFrozen(frozen)).toBe(true);
    });

    it('should handle mixed frozen and non-frozen nested structures', () => {
      const partiallyFrozen = {
        frozen: Object.freeze({ value: 'frozen' }),
        notFrozen: { value: 'not frozen' }
      };
      
      Object.freeze(partiallyFrozen);
      expect(isDeepFrozen(partiallyFrozen)).toBe(false);
    });

    it('should handle dates and functions', () => {
      const frozenDate = Object.freeze(new Date());
      expect(isDeepFrozen(frozenDate)).toBe(true);

      const func = function() { return 'test'; };
      Object.freeze(func);
      expect(isDeepFrozen(func)).toBe(true);
    });
  });

  describe('Integration tests', () => {
    it('should work with complex configuration objects', () => {
      const config = {
        database: {
          host: 'localhost',
          port: 5432,
          credentials: {
            username: 'user',
            password: 'pass'
          },
          options: ['ssl', 'pooling']
        },
        cache: {
          ttl: 300,
          maxSize: 1000
        },
        features: {
          enabled: ['feature1', 'feature2'],
          disabled: []
        }
      };

      const frozenConfig = deepFreeze(config);

      expect(isDeepFrozen(frozenConfig)).toBe(true);

      // Test that all levels are protected
      expect(() => {
        (frozenConfig.database as any).host = 'changed';
      }).toThrow();

      expect(() => {
        (frozenConfig.database.credentials as any).username = 'hacker';
      }).toThrow();

      expect(() => {
        frozenConfig.database.options.push('newOption');
      }).toThrow();

      expect(() => {
        frozenConfig.features.enabled.push('feature3');
      }).toThrow();
    });

    it('should preserve object identity and properties', () => {
      const original = {
        name: 'test',
        getValue: function() { return this.name; },
        nested: { value: 42 }
      };

      const frozen = deepFreeze(original);

      expect(frozen).toBe(original);
      expect(frozen.getValue()).toBe('test');
      expect(frozen.nested.value).toBe(42);
      expect(Object.keys(frozen)).toEqual(Object.keys(original));
    });

    it('should work with objects containing Symbol properties', () => {
      const symbol = Symbol('test');
      const obj = {
        [symbol]: 'symbol value',
        regular: 'regular value'
      };

      const frozen = deepFreeze(obj);

      expect(Object.isFrozen(frozen)).toBe(true);
      expect(frozen[symbol]).toBe('symbol value');
      expect(() => {
        (frozen as any)[symbol] = 'modified';
      }).toThrow();
    });
  });
});