import { deepFreeze, isDeepFrozen } from '@common/utils/object-immutability.util';

describe('Object Immutability Utils', () => {
  describe('deepFreeze', () => {
    describe('basic functionality', () => {
      it('should freeze a simple object', () => {
        const obj = { name: 'test', value: 42 };
        const frozenObj = deepFreeze(obj);

        expect(Object.isFrozen(frozenObj)).toBe(true);
        expect(() => {
          (frozenObj as any).name = 'changed';
        }).toThrow();
        expect(frozenObj.name).toBe('test');
      });

      it('should freeze nested objects recursively', () => {
        const obj = {
          level1: {
            level2: {
              level3: {
                value: 'deep',
              },
            },
          },
        };

        const frozenObj = deepFreeze(obj);

        expect(Object.isFrozen(frozenObj)).toBe(true);
        expect(Object.isFrozen(frozenObj.level1)).toBe(true);
        expect(Object.isFrozen(frozenObj.level1.level2)).toBe(true);
        expect(Object.isFrozen(frozenObj.level1.level2.level3)).toBe(true);

        expect(() => {
          (frozenObj.level1.level2.level3 as any).value = 'changed';
        }).toThrow();
      });

      it('should freeze arrays and their elements', () => {
        const obj = {
          items: [
            { id: 1, name: 'item1' },
            { id: 2, name: 'item2' },
          ],
        };

        const frozenObj = deepFreeze(obj);

        expect(Object.isFrozen(frozenObj.items)).toBe(true);
        expect(Object.isFrozen(frozenObj.items[0])).toBe(true);
        expect(Object.isFrozen(frozenObj.items[1])).toBe(true);

        expect(() => {
          frozenObj.items.push({ id: 3, name: 'item3' } as any);
        }).toThrow();

        expect(() => {
          (frozenObj.items[0] as any).name = 'changed';
        }).toThrow();
      });

      it('should freeze functions and their properties', () => {
        const func = function testFunc() { return 'test'; };
        (func as any).customProp = 'custom';
        (func as any).nestedObj = { prop: 'value' };

        const frozenFunc = deepFreeze(func);

        expect(Object.isFrozen(frozenFunc)).toBe(true);
        expect(Object.isFrozen((frozenFunc as any).nestedObj)).toBe(true);

        expect(() => {
          (frozenFunc as any).customProp = 'changed';
        }).toThrow();

        expect(() => {
          (frozenFunc as any).nestedObj.prop = 'changed';
        }).toThrow();
      });
    });

    describe('edge cases', () => {
      it('should handle null and undefined values', () => {
        expect(deepFreeze(null)).toBe(null);
        expect(deepFreeze(undefined)).toBe(undefined);
      });

      it('should handle primitive values', () => {
        expect(deepFreeze('string')).toBe('string');
        expect(deepFreeze(42)).toBe(42);
        expect(deepFreeze(true)).toBe(true);

        const testSymbol = Symbol('test');
        expect(deepFreeze(testSymbol)).toBe(testSymbol);
      });

      it('should handle empty objects and arrays', () => {
        const emptyObj = deepFreeze({});
        const emptyArray = deepFreeze([]);

        expect(Object.isFrozen(emptyObj)).toBe(true);
        expect(Object.isFrozen(emptyArray)).toBe(true);

        expect(() => {
          (emptyObj as any).newProp = 'value';
        }).toThrow();

        expect(() => {
          (emptyArray as any).push('item');
        }).toThrow();
      });

      it('should handle objects with circular references', () => {
        const obj: any = { name: 'parent' };
        obj.self = obj;
        obj.child = { parent: obj };

        const frozenObj = deepFreeze(obj);

        expect(Object.isFrozen(frozenObj)).toBe(true);
        expect(Object.isFrozen(frozenObj.child)).toBe(true);
        expect(frozenObj.self).toBe(frozenObj);
        expect(frozenObj.child.parent).toBe(frozenObj);

        expect(() => {
          frozenObj.name = 'changed';
        }).toThrow();
      });

      it('should handle already frozen objects', () => {
        const obj = { value: 'test' };
        Object.freeze(obj);

        const result = deepFreeze(obj);

        expect(result).toBe(obj);
        expect(Object.isFrozen(result)).toBe(true);
      });

      it('should handle Date objects', () => {
        const obj = {
          created: new Date('2023-01-01'),
          updated: new Date('2023-12-01'),
        };

        const frozenObj = deepFreeze(obj);

        expect(Object.isFrozen(frozenObj.created)).toBe(true);
        expect(Object.isFrozen(frozenObj.updated)).toBe(true);

        // Date methods should still work
        expect(frozenObj.created.getFullYear()).toBe(2023);
        expect(frozenObj.updated.getMonth()).toBe(11); // December is month 11
      });
    });

    describe('RegExp special handling', () => {
      it('should handle RegExp objects specially, preserving lastIndex mutability', () => {
        const obj = {
          pattern: /test/g,
          simplePattern: /simple/,
        };

        const frozenObj = deepFreeze(obj);

        expect(Object.isSealed(frozenObj.pattern)).toBe(true);
        expect(Object.isSealed(frozenObj.simplePattern)).toBe(true);

        // lastIndex should remain mutable for global RegExp
        frozenObj.pattern.lastIndex = 5;
        expect(frozenObj.pattern.lastIndex).toBe(5);

        // But source and flags should be immutable
        expect(() => {
          (frozenObj.pattern as any).source = 'changed';
        }).toThrow();
      });

      it('should handle RegExp with custom properties', () => {
        const regex = /test/g;
        (regex as any).customProp = 'custom';
        (regex as any).nestedObj = { prop: 'value' };

        const frozenRegex = deepFreeze(regex);

        expect(Object.isSealed(frozenRegex)).toBe(true);
        expect(Object.isFrozen((frozenRegex as any).nestedObj)).toBe(true);

        // lastIndex should be mutable
        frozenRegex.lastIndex = 10;
        expect(frozenRegex.lastIndex).toBe(10);

        // Custom properties should be frozen
        expect(() => {
          (frozenRegex as any).customProp = 'changed';
        }).toThrow();
      });
    });

    describe('complex nested structures', () => {
      it('should handle mixed data types in complex structure', () => {
        const complex = {
          string: 'text',
          number: 42,
          boolean: true,
          nullValue: null,
          undefinedValue: undefined,
          array: [1, 'two', { three: 3 }],
          object: {
            nested: {
              deep: {
                value: 'deepest',
              },
            },
          },
          func: function() { return 'test'; },
          date: new Date('2023-01-01'),
          regex: /pattern/gi,
        };

        const frozenComplex = deepFreeze(complex);

        // Check all levels are properly frozen
        expect(Object.isFrozen(frozenComplex)).toBe(true);
        expect(Object.isFrozen(frozenComplex.array)).toBe(true);
        expect(Object.isFrozen(frozenComplex.array[2])).toBe(true);
        expect(Object.isFrozen(frozenComplex.object)).toBe(true);
        expect(Object.isFrozen(frozenComplex.object.nested)).toBe(true);
        expect(Object.isFrozen(frozenComplex.object.nested.deep)).toBe(true);
        expect(Object.isFrozen(frozenComplex.func)).toBe(true);
        expect(Object.isFrozen(frozenComplex.date)).toBe(true);
        expect(Object.isSealed(frozenComplex.regex)).toBe(true);

        // Verify immutability
        expect(() => {
          (frozenComplex.array[2] as any).three = 999;
        }).toThrow();

        expect(() => {
          frozenComplex.object.nested.deep.value = 'changed';
        }).toThrow();
      });

      it('should preserve object type and prototype chain', () => {
        class TestClass {
          constructor(public value: string) {}

          getValue() {
            return this.value;
          }
        }

        const instance = new TestClass('test');
        const frozenInstance = deepFreeze(instance);

        expect(frozenInstance).toBeInstanceOf(TestClass);
        expect(frozenInstance.getValue()).toBe('test');
        expect(Object.isFrozen(frozenInstance)).toBe(true);

        expect(() => {
          frozenInstance.value = 'changed';
        }).toThrow();
      });
    });

    describe('performance and memory', () => {
      it('should handle large objects efficiently', () => {
        const largeObj: any = {};

        // Create a large object
        for (let i = 0; i < 100; i++) {
          largeObj[`prop${i}`] = {
            value: i,
            nested: {
              deep: `value${i}`,
            },
          };
        }

        const startTime = Date.now();
        const frozenLargeObj = deepFreeze(largeObj);
        const endTime = Date.now();

        // Should complete reasonably quickly (less than 1 second)
        expect(endTime - startTime).toBeLessThan(1000);
        expect(Object.isFrozen(frozenLargeObj)).toBe(true);
        expect(Object.isFrozen(frozenLargeObj.prop0)).toBe(true);
        expect(Object.isFrozen(frozenLargeObj.prop99.nested)).toBe(true);
      });
    });
  });

  describe('isDeepFrozen', () => {
    describe('basic functionality', () => {
      it('should return true for deep frozen objects', () => {
        const obj = {
          level1: {
            level2: {
              value: 'test',
            },
          },
        };

        const frozenObj = deepFreeze(obj);
        expect(isDeepFrozen(frozenObj)).toBe(true);
      });

      it('should return false for non-frozen objects', () => {
        const obj = {
          level1: {
            level2: {
              value: 'test',
            },
          },
        };

        expect(isDeepFrozen(obj)).toBe(false);
      });

      it('should return false for partially frozen objects', () => {
        const obj = {
          level1: {
            level2: {
              value: 'test',
            },
          },
        };

        Object.freeze(obj); // Only freeze top level
        expect(isDeepFrozen(obj)).toBe(false);
      });

      it('should return true for completely manually frozen objects', () => {
        const obj = {
          level1: {
            level2: {
              value: 'test',
            },
          },
        };

        // Manually freeze all levels
        Object.freeze(obj.level1.level2);
        Object.freeze(obj.level1);
        Object.freeze(obj);

        expect(isDeepFrozen(obj)).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should return true for primitive values', () => {
        expect(isDeepFrozen(null)).toBe(true);
        expect(isDeepFrozen(undefined)).toBe(true);
        expect(isDeepFrozen('string')).toBe(true);
        expect(isDeepFrozen(42)).toBe(true);
        expect(isDeepFrozen(true)).toBe(true);
        expect(isDeepFrozen(Symbol('test'))).toBe(true);
      });

      it('should handle circular references correctly', () => {
        const obj: any = { name: 'parent' };
        obj.self = obj;
        obj.child = { parent: obj };

        const frozenObj = deepFreeze(obj);
        expect(isDeepFrozen(frozenObj)).toBe(true);

        // Test with non-frozen circular reference
        const nonFrozen: any = { name: 'parent' };
        nonFrozen.self = nonFrozen;
        expect(isDeepFrozen(nonFrozen)).toBe(false);
      });

      it('should handle arrays correctly', () => {
        const frozenArray = deepFreeze([
          { id: 1, name: 'item1' },
          { id: 2, name: 'item2' },
        ]);

        expect(isDeepFrozen(frozenArray)).toBe(true);

        // Test non-frozen array
        const normalArray = [{ id: 1, name: 'item1' }];
        expect(isDeepFrozen(normalArray)).toBe(false);
      });

      it('should handle functions correctly', () => {
        const func = function() { return 'test'; };
        (func as any).customProp = { nested: 'value' };

        const frozenFunc = deepFreeze(func);
        expect(isDeepFrozen(frozenFunc)).toBe(true);

        // Test non-frozen function
        const normalFunc = function() { return 'test'; };
        (normalFunc as any).customProp = { nested: 'value' };
        expect(isDeepFrozen(normalFunc)).toBe(false);
      });
    });

    describe('RegExp special handling', () => {
      it('should return true for sealed RegExp objects (from deepFreeze)', () => {
        const regex = /test/g;
        const frozenRegex = deepFreeze(regex);

        expect(isDeepFrozen(frozenRegex)).toBe(true);
      });

      it('should return false for non-sealed RegExp objects', () => {
        const regex = /test/g;
        expect(isDeepFrozen(regex)).toBe(false);
      });

      it('should handle RegExp with custom properties', () => {
        const regex = /test/g;
        (regex as any).customProp = { nested: 'value' };

        const frozenRegex = deepFreeze(regex);
        expect(isDeepFrozen(frozenRegex)).toBe(true);

        // Test non-frozen RegExp with custom properties
        const normalRegex = /test/g;
        (normalRegex as any).customProp = { nested: 'value' };
        expect(isDeepFrozen(normalRegex)).toBe(false);
      });

      it('should ignore RegExp lastIndex property mutability', () => {
        const regex = /test/g;
        const frozenRegex = deepFreeze(regex);

        // lastIndex can still be changed
        frozenRegex.lastIndex = 5;
        expect(isDeepFrozen(frozenRegex)).toBe(true);
      });
    });

    describe('function intrinsic properties handling', () => {
      it('should ignore function intrinsic properties', () => {
        function testFunc() { return 'test'; }
        (testFunc as any).customProp = { value: 'custom' };

        const frozenFunc = deepFreeze(testFunc);

        // Should be considered deep frozen even though intrinsic properties
        // like prototype, length, name might not be frozen
        expect(isDeepFrozen(frozenFunc)).toBe(true);
      });

      it('should check custom function properties deeply', () => {
        function testFunc() { return 'test'; }
        (testFunc as any).customProp = { nested: { value: 'custom' } };

        // Only freeze the function, not its custom properties
        Object.freeze(testFunc);
        expect(isDeepFrozen(testFunc)).toBe(false);

        // Deep freeze should make it pass
        const deepFrozenFunc = deepFreeze(testFunc);
        expect(isDeepFrozen(deepFrozenFunc)).toBe(true);
      });
    });

    describe('complex scenarios', () => {
      it('should handle mixed frozen and non-frozen objects', () => {
        const obj = {
          frozenPart: deepFreeze({ value: 'frozen' }),
          normalPart: { value: 'normal' },
        };

        expect(isDeepFrozen(obj)).toBe(false);

        // Freeze the whole object
        const fullyFrozen = deepFreeze(obj);
        expect(isDeepFrozen(fullyFrozen)).toBe(true);
      });

      it('should handle Date objects correctly', () => {
        const obj = {
          created: new Date('2023-01-01'),
          metadata: { version: 1 },
        };

        const frozenObj = deepFreeze(obj);
        expect(isDeepFrozen(frozenObj)).toBe(true);

        // Test non-frozen Date
        const normalObj = {
          created: new Date('2023-01-01'),
          metadata: { version: 1 },
        };
        expect(isDeepFrozen(normalObj)).toBe(false);
      });

      it('should detect incomplete freezing in deep structures', () => {
        const obj = {
          level1: {
            level2: {
              level3: {
                value: 'deep',
              },
            },
          },
        };

        // Freeze only some levels
        Object.freeze(obj);
        Object.freeze(obj.level1);
        // obj.level1.level2 and obj.level1.level2.level3 not frozen

        expect(isDeepFrozen(obj)).toBe(false);
      });
    });

    describe('performance verification', () => {
      it('should check large objects efficiently', () => {
        const largeObj: any = {};

        for (let i = 0; i < 50; i++) {
          largeObj[`prop${i}`] = {
            value: i,
            nested: { deep: `value${i}` },
          };
        }

        const frozenLarge = deepFreeze(largeObj);

        const startTime = Date.now();
        const result = isDeepFrozen(frozenLarge);
        const endTime = Date.now();

        expect(result).toBe(true);
        expect(endTime - startTime).toBeLessThan(500); // Should be fast
      });
    });
  });

  describe('integration scenarios', () => {
    it('should work together for configuration objects', () => {
      const config = {
        database: {
          host: 'localhost',
          port: 5432,
          credentials: {
            username: 'user',
            password: 'secret',
          },
        },
        cache: {
          ttl: 3600,
          maxKeys: 1000,
        },
        features: ['feature1', 'feature2'],
      };

      // Freeze configuration to prevent accidental modifications
      const frozenConfig = deepFreeze(config);

      // Verify it's properly frozen
      expect(isDeepFrozen(frozenConfig)).toBe(true);

      // Verify all nested parts are protected
      expect(() => {
        frozenConfig.database.host = 'changed';
      }).toThrow();

      expect(() => {
        frozenConfig.database.credentials.password = 'hacked';
      }).toThrow();

      expect(() => {
        frozenConfig.features.push('newFeature');
      }).toThrow();

      // But reading should still work
      expect(frozenConfig.database.host).toBe('localhost');
      expect(frozenConfig.cache.ttl).toBe(3600);
      expect(frozenConfig.features).toHaveLength(2);
    });

    it('should handle constants with shared references', () => {
      const sharedObj = { shared: 'value' };
      const constants = {
        constant1: { ref: sharedObj },
        constant2: { ref: sharedObj },
      };

      const frozenConstants = deepFreeze(constants);

      expect(isDeepFrozen(frozenConstants)).toBe(true);
      expect(frozenConstants.constant1.ref).toBe(frozenConstants.constant2.ref);

      expect(() => {
        frozenConstants.constant1.ref.shared = 'changed';
      }).toThrow();
    });
  });
});