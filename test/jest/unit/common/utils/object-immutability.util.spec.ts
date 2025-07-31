import { deepFreeze, isDeepFrozen } from '@common/utils/object-immutability.util';

describe('Object Immutability Utilities', () => {
  describe('deepFreeze', () => {
    it('should freeze a simple object', () => {
      const obj = { a: 1, b: 'test' };
      const frozenObj = deepFreeze(obj);
      expect(Object.isFrozen(frozenObj)).toBe(true);
      expect(() => (frozenObj as any).a = 2).toThrow();
    });

    it('should deep freeze nested objects', () => {
      const obj = { level1: { level2: { value: 'deep' } } };
      const frozenObj = deepFreeze(obj);
      expect(Object.isFrozen(frozenObj.level1)).toBe(true);
      expect(Object.isFrozen(frozenObj.level1.level2)).toBe(true);
      expect(() => (frozenObj.level1.level2 as any).value = 'modified').toThrow();
    });

    it('should deep freeze arrays and their elements', () => {
      const arr = [1, { id: 1 }, [2, 3]];
      const frozenArr = deepFreeze(arr);
      expect(Object.isFrozen(frozenArr)).toBe(true);
      expect(Object.isFrozen(frozenArr[1])).toBe(true);
      expect(Object.isFrozen(frozenArr[2])).toBe(true);
      expect(() => frozenArr.push(4)).toThrow();
      expect(() => (frozenArr[1] as any).id = 999).toThrow();
    });

    it('should handle circular references without infinite recursion', () => {
      const obj: any = { name: 'test' };
      obj.self = obj;
      expect(() => deepFreeze(obj)).not.toThrow();
      expect(Object.isFrozen(obj)).toBe(true);
      expect(obj.self).toBe(obj);
    });

    it('should return primitive values unchanged', () => {
      expect(deepFreeze(null)).toBeNull();
      expect(deepFreeze(undefined)).toBeUndefined();
      expect(deepFreeze(42)).toBe(42);
      expect(deepFreeze('string')).toBe('string');
      expect(deepFreeze(true)).toBe(true);
    });
  });

  describe('isDeepFrozen', () => {
    it('should return true for a deep frozen object', () => {
      const obj = { a: 1, b: { c: 2 } };
      deepFreeze(obj);
      expect(isDeepFrozen(obj)).toBe(true);
    });

    it('should return false for an unfrozen object', () => {
      const obj = { a: 1, b: { c: 2 } };
      expect(isDeepFrozen(obj)).toBe(false);
    });

    it('should return false for a partially frozen object', () => {
      const obj = { a: 1, b: { c: 2 } };
      Object.freeze(obj);
      expect(isDeepFrozen(obj)).toBe(false);
    });

    it('should return true for primitive values', () => {
      expect(isDeepFrozen(null)).toBe(true);
      expect(isDeepFrozen(undefined)).toBe(true);
      expect(isDeepFrozen(42)).toBe(true);
      expect(isDeepFrozen('string')).toBe(true);
      expect(isDeepFrozen(true)).toBe(true);
    });

    it('should handle circular references correctly', () => {
      const obj: any = { name: 'test' };
      obj.self = obj;
      deepFreeze(obj);
      expect(isDeepFrozen(obj)).toBe(true);
    });
  });
});