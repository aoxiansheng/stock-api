/* eslint-disable @typescript-eslint/no-unused-vars */
import { ObjectUtils } from '@core/public/shared/utils/object.util';
import { TRANSFORM_CONFIG } from '@core/public/transformer/constants/transformer.constants';

describe('ObjectUtils', () => {
  describe('getValueFromPath', () => {
    it('should return undefined for null or undefined object', () => {
      expect(ObjectUtils.getValueFromPath(null, 'test.path')).toBeUndefined();
      expect(ObjectUtils.getValueFromPath(undefined, 'test.path')).toBeUndefined();
    });

    it('should return undefined for empty path', () => {
      const obj = { test: { value: 'data' } };
      expect(ObjectUtils.getValueFromPath(obj, '')).toBeUndefined();
      expect(ObjectUtils.getValueFromPath(obj, null as any)).toBeUndefined();
      expect(ObjectUtils.getValueFromPath(obj, undefined as any)).toBeUndefined();
    });

    it('should return value for simple property path', () => {
      const obj = { name: 'TestName', value: 42 };
      expect(ObjectUtils.getValueFromPath(obj, 'name')).toBe('TestName');
      expect(ObjectUtils.getValueFromPath(obj, 'value')).toBe(42);
    });

    it('should handle nested object paths with dot notation', () => {
      const obj = { user: { profile: { name: 'John Doe' } } };
      const path = 'user.profile.name';
      const result = ObjectUtils.getValueFromPath(obj, path);
      console.log(`Test: Nested Dot Notation\n  Object: ${JSON.stringify(obj)}\n  Path: ${path}\n  Actual: ${result}\n  Expected: John Doe`);
      expect(result).toBe('John Doe');
    });

    it('should return undefined for non-existent nested paths', () => {
      const obj = { user: { profile: { name: 'John' } } };
      expect(ObjectUtils.getValueFromPath(obj, 'user.profile.age')).toBeUndefined();
    });

    it('should handle array access with bracket notation', () => {
      const obj = { items: ['first', 'second'] };
      let path = 'items[0]';
      let result = ObjectUtils.getValueFromPath(obj, path);
      console.log(`Test: Array Bracket Notation (Index 0)\n  Object: ${JSON.stringify(obj)}\n  Path: ${path}\n  Actual: ${result}\n  Expected: first`);
      expect(result).toBe('first');

      path = 'items[1]';
      result = ObjectUtils.getValueFromPath(obj, path);
      console.log(`Test: Array Bracket Notation (Index 1)\n  Object: ${JSON.stringify(obj)}\n  Path: ${path}\n  Actual: ${result}\n  Expected: second`);
      expect(result).toBe('second');
    });

    it('should handle mixed dot and bracket notation', () => {
      const obj = { users: [{ name: 'Alice' }] };
      const path = 'users[0].name';
      const result = ObjectUtils.getValueFromPath(obj, path);
      console.log(`Test: Mixed Dot and Bracket Notation\n  Object: ${JSON.stringify(obj)}\n  Path: ${path}\n  Actual: ${result}\n  Expected: Alice`);
      expect(result).toBe('Alice');
    });

    it('should fallback to camelCase key matching', () => {
      const obj = { firstName: 'John' };
      expect(ObjectUtils.getValueFromPath(obj, 'first_name')).toBe('John');
    });

    it('should handle kebab-case to camelCase conversion', () => {
      const obj = { userName: 'testUser' };
      expect(ObjectUtils.getValueFromPath(obj, 'user-name')).toBe('testUser');
    });

    it('should respect maximum nested depth limit', () => {
      let deepObj: any = { value: 'deep_value' };
      for (let i = 0; i < TRANSFORM_CONFIG.MAX_NESTED_DEPTH + 5; i++) {
        deepObj = { level: deepObj };
      }
      const pathParts = Array(TRANSFORM_CONFIG.MAX_NESTED_DEPTH + 2).fill('level');
      pathParts.push('value');
      const deepPath = pathParts.join('.');
      expect(ObjectUtils.getValueFromPath(deepObj, deepPath)).toBeUndefined();
    });

    it('should handle circular references gracefully', () => {
      const obj: any = { name: 'circular' };
      obj._self = obj;
      const path = 'self.name';
      const result = ObjectUtils.getValueFromPath(obj, path);
      // 移除JSON.stringify以避免循环引用错误
      expect(result).toBe('circular');
    });

    it('should handle various data types', () => {
      const obj = {
        string: 'text',
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined,
        array: [1, 2, 3],
        object: { nested: 'value' },
        date: new Date('2023-01-01'),
        regex: /test/g,
      };
      expect(ObjectUtils.getValueFromPath(obj, 'string')).toBe('text');
      expect(ObjectUtils.getValueFromPath(obj, 'number')).toBe(42);
      expect(ObjectUtils.getValueFromPath(obj, 'boolean')).toBe(true);
      expect(ObjectUtils.getValueFromPath(obj, 'null')).toBeNull();
      expect(ObjectUtils.getValueFromPath(obj, 'undefined')).toBeUndefined();
      expect(Array.isArray(ObjectUtils.getValueFromPath(obj, 'array'))).toBe(true);
      const path = 'object.nested';
      const result = ObjectUtils.getValueFromPath(obj, path);
      console.log(`Test: Various Data Types (object.nested)\n  Object: ${JSON.stringify(obj.object)}\n  Path: ${path}\n  Actual: ${result}\n  Expected: value`);
      expect(result).toBe('value');
      expect(ObjectUtils.getValueFromPath(obj, 'date')).toBeInstanceOf(Date);
      expect(ObjectUtils.getValueFromPath(obj, 'regex')).toBeInstanceOf(RegExp);
    });
  });
});