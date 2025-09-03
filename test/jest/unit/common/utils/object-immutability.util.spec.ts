import {
  deepFreeze,
  isDeepFrozen,
} from "@common/utils/object-immutability.util";

describe("Object Immutability Utilities", () => {
  describe("deepFreeze", () => {
    it("should freeze a simple object", () => {
      const obj = { a: 1, b: "test" };
      const frozenObj = deepFreeze(obj);
      expect(Object.isFrozen(frozenObj)).toBe(true);
      expect(() => {
        const anyObj = frozenObj as any;
        anyObj.a = 2;
      }).toThrow();
    });

    it("should deep freeze nested objects", () => {
      const obj = { level1: { level2: { value: "deep" } } };
      const frozenObj = deepFreeze(obj);
      expect(Object.isFrozen(frozenObj.level1)).toBe(true);
      expect(Object.isFrozen(frozenObj.level1.level2)).toBe(true);
      expect(() => {
        const anyObj = frozenObj.level1.level2 as any;
        anyObj.value = "modified";
      }).toThrow();
    });

    it("should deep freeze arrays and their elements", () => {
      const arr = [1, { id: 1 }, [2, 3]];
      const frozenArr = deepFreeze(arr);
      expect(Object.isFrozen(frozenArr)).toBe(true);
      expect(Object.isFrozen(frozenArr[1])).toBe(true);
      expect(Object.isFrozen(frozenArr[2])).toBe(true);
      expect(() => {
        frozenArr.push(4);
      }).toThrow();
      expect(() => {
        const anyObj = frozenArr[1] as any;
        anyObj.id = 999;
      }).toThrow();
    });

    it("should handle circular references without infinite recursion", () => {
      const obj: any = { name: "test" };
      obj.self = obj;
      expect(() => deepFreeze(obj)).not.toThrow();
      expect(Object.isFrozen(obj)).toBe(true);
      expect(obj.self).toBe(obj);
    });

    it("should return primitive values unchanged", () => {
      expect(deepFreeze(null)).toBeNull();
      expect(deepFreeze(undefined)).toBeUndefined();
      expect(deepFreeze(42)).toBe(42);
      expect(deepFreeze("string")).toBe("string");
      expect(deepFreeze(true)).toBe(true);
    });

    it("should handle functions correctly", () => {
      const fn = function () {
        return "test";
      };
      const frozenFn = deepFreeze(fn);
      expect(Object.isFrozen(frozenFn)).toBe(true);
      expect(frozenFn()).toBe("test");
    });

    it("should handle functions with properties", () => {
      const fn: any = function () {
        return "test";
      };
      fn.customProp = { value: 42 };
      const frozenFn = deepFreeze(fn);
      expect(Object.isFrozen(frozenFn)).toBe(true);
      expect(Object.isFrozen(frozenFn.customProp)).toBe(true);
      expect(() => {
        frozenFn.customProp.value = 99;
      }).toThrow();
    });

    it("should handle Date objects", () => {
      const date = new Date();
      const frozenDate = deepFreeze(date);
      expect(Object.isFrozen(frozenDate)).toBe(true);
      expect(frozenDate.getTime()).toBe(date.getTime());
    });

    it("should handle RegExp objects", () => {
      const regex = /test/gi;
      const frozenRegex = deepFreeze(regex);
      // RegExp 对象使用 sealed 状态而不是 frozen，以保持 lastIndex 属性可变
      expect(Object.isSealed(frozenRegex)).toBe(true);
      expect(frozenRegex.test("test")).toBe(true);
    });

    it("should handle complex nested structures", () => {
      const complex = {
        array: [
          { id: 1, nested: { value: "deep" } },
          [1, 2, { inner: "value" }],
          function () {
            return "fn";
          },
        ],
        fn: function () {
          return "test";
        },
        obj: {
          level1: {
            level2: {
              level3: { deepValue: "very deep" },
            },
          },
        },
      };

      const frozen = deepFreeze(complex);
      expect(Object.isFrozen(frozen)).toBe(true);
      expect(Object.isFrozen(frozen.array)).toBe(true);
      expect(Object.isFrozen(frozen.array[0])).toBe(true);
      expect(
        Object.isFrozen((frozen.array[0] as { nested: object }).nested),
      ).toBe(true);
      expect(Object.isFrozen(frozen.array[1])).toBe(true);
      expect(Object.isFrozen(frozen.array[2])).toBe(true);
      expect(Object.isFrozen(frozen.array[2][2])).toBe(true);
      expect(Object.isFrozen(frozen.fn)).toBe(true);
      expect(Object.isFrozen(frozen.obj.level1.level2.level3)).toBe(true);
    });

    it("should handle already frozen objects", () => {
      const obj = { value: 42 };
      Object.freeze(obj);
      const result = deepFreeze(obj);
      expect(result).toBe(obj);
      expect(Object.isFrozen(result)).toBe(true);
    });

    it("should handle objects with non-enumerable properties", () => {
      const obj = {};
      Object.defineProperty(obj, "hidden", {
        value: { secret: "value" },
        enumerable: false,
        writable: true,
        configurable: true,
      });

      const frozen = deepFreeze(obj);
      expect(Object.isFrozen(frozen)).toBe(true);
      expect(Object.isFrozen((frozen as any).hidden)).toBe(true);
    });

    it("should handle multiple circular references", () => {
      const objA: any = { name: "A" };
      const objB: any = { name: "B" };
      objA.refB = objB;
      objB.refA = objA;
      objA.selfRef = objA;

      expect(() => deepFreeze(objA)).not.toThrow();
      expect(Object.isFrozen(objA)).toBe(true);
      expect(Object.isFrozen(objB)).toBe(true);
      expect(objA.refB).toBe(objB);
      expect(objB.refA).toBe(objA);
      expect(objA.selfRef).toBe(objA);
    });
  });

  describe("isDeepFrozen", () => {
    it("should return true for a deep frozen object", () => {
      const obj = { a: 1, b: { c: 2 } };
      deepFreeze(obj);
      expect(isDeepFrozen(obj)).toBe(true);
    });

    it("should return false for an unfrozen object", () => {
      const obj = { a: 1, b: { c: 2 } };
      expect(isDeepFrozen(obj)).toBe(false);
    });

    it("should return false for a partially frozen object", () => {
      const obj = { a: 1, b: { c: 2 } };
      Object.freeze(obj);
      expect(isDeepFrozen(obj)).toBe(false);
    });

    it("should return true for primitive values", () => {
      expect(isDeepFrozen(null)).toBe(true);
      expect(isDeepFrozen(undefined)).toBe(true);
      expect(isDeepFrozen(42)).toBe(true);
      expect(isDeepFrozen("string")).toBe(true);
      expect(isDeepFrozen(true)).toBe(true);
    });

    it("should handle circular references correctly", () => {
      const obj: any = { name: "test" };
      obj.self = obj;
      deepFreeze(obj);
      expect(isDeepFrozen(obj)).toBe(true);
    });

    it("should return true for frozen functions", () => {
      const fn = function () {
        return "test";
      };
      deepFreeze(fn);
      expect(isDeepFrozen(fn)).toBe(true);
    });

    it("should return false for unfrozen functions", () => {
      const fn = function () {
        return "test";
      };
      expect(isDeepFrozen(fn)).toBe(false);
    });

    it("should handle functions with properties", () => {
      const fn: any = function () {
        return "test";
      };
      fn._prop = { value: 42 };

      // Function frozen but property not
      Object.freeze(fn);
      expect(isDeepFrozen(fn)).toBe(false);

      // Deep freeze all
      deepFreeze(fn);
      expect(isDeepFrozen(fn)).toBe(true);
    });

    it("should handle arrays correctly", () => {
      const arr = [1, { id: 1 }, [2, 3]];

      // Array not frozen
      expect(isDeepFrozen(arr)).toBe(false);

      // Only array frozen
      Object.freeze(arr);
      expect(isDeepFrozen(arr)).toBe(false);

      // Deep freeze all
      deepFreeze(arr);
      expect(isDeepFrozen(arr)).toBe(true);
    });

    it("should handle complex nested structures", () => {
      const complex = {
        array: [
          { id: 1, nested: { value: "deep" } },
          [1, 2, { inner: "value" }],
        ],
        obj: {
          level1: {
            level2: { deepValue: "very deep" },
          },
        },
      };

      expect(isDeepFrozen(complex)).toBe(false);
      deepFreeze(complex);
      expect(isDeepFrozen(complex)).toBe(true);
    });

    it("should handle multiple circular references", () => {
      const objA: any = { name: "A" };
      const objB: any = { name: "B" };
      objA.refB = objB;
      objB.refA = objA;
      objA.selfRef = objA;

      expect(isDeepFrozen(objA)).toBe(false);
      deepFreeze(objA);
      expect(isDeepFrozen(objA)).toBe(true);
    });

    it("should handle objects with non-enumerable properties", () => {
      const obj = {};
      Object.defineProperty(obj, "hidden", {
        value: { secret: "value" },
        enumerable: false,
        writable: true,
        configurable: true,
      });

      expect(isDeepFrozen(obj)).toBe(false);
      deepFreeze(obj);
      expect(isDeepFrozen(obj)).toBe(true);
    });

    it("should return false when nested object is not frozen", () => {
      const obj = {
        level1: {
          level2: { value: "test" },
        },
      };

      // Freeze top level and level1 but not level2
      Object.freeze(obj);
      Object.freeze(obj.level1);

      expect(isDeepFrozen(obj)).toBe(false);
    });

    it("should handle Date and RegExp objects", () => {
      const date = new Date();
      const regex = /test/gi;

      expect(isDeepFrozen(date)).toBe(false);
      expect(isDeepFrozen(regex)).toBe(false);

      deepFreeze(date);
      deepFreeze(regex);

      expect(isDeepFrozen(date)).toBe(true);
      expect(isDeepFrozen(regex)).toBe(true);
    });
  });
});
