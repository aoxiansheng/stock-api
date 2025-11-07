import { WsAuth, WsPublic } from '@core/01-entry/stream-receiver/decorators/ws-auth.decorator';
import { Permission } from '@authv2';

describe('WsAuth Decorator', () => {
  describe('Basic Functionality', () => {
    it('should be a function', () => {
      expect(typeof WsAuth).toBe('function');
    });

    it('should execute WsAuth function and return a decorator', () => {
      const decorator = WsAuth();
      expect(typeof decorator).toBe('function');
    });

    it('should execute WsAuth with permissions and return a decorator', () => {
      const decorator = WsAuth([Permission.STREAM_READ]);
      expect(typeof decorator).toBe('function');
    });

    it('should handle empty permissions array', () => {
      const decorator = WsAuth([]);
      expect(typeof decorator).toBe('function');
    });

    it('should handle undefined permissions', () => {
      const decorator = WsAuth(undefined);
      expect(typeof decorator).toBe('function');
    });

    it('should handle multiple permissions', () => {
      const decorator = WsAuth([Permission.STREAM_READ, Permission.STREAM_WRITE]);
      expect(typeof decorator).toBe('function');
    });

    it('should execute the decorator creation logic for different permission combinations', () => {
      // Test various permission combinations to ensure code paths are executed
      const decoratorNoPerms = WsAuth();
      const decoratorSinglePerm = WsAuth([Permission.STREAM_READ]);
      const decoratorMultiPerms = WsAuth([Permission.STREAM_READ, Permission.STREAM_WRITE]);
      const decoratorEmptyArray = WsAuth([]);

      expect(decoratorNoPerms).toBeDefined();
      expect(decoratorSinglePerm).toBeDefined();
      expect(decoratorMultiPerms).toBeDefined();
      expect(decoratorEmptyArray).toBeDefined();
    });

    it('should handle different permission types', () => {
      // Test with different permission combinations
      const decoratorStreamRead = WsAuth([Permission.STREAM_READ]);
      const decoratorStreamWrite = WsAuth([Permission.STREAM_WRITE]);
      const decoratorStreamSubscribe = WsAuth([Permission.STREAM_SUBSCRIBE]);
      const decoratorDataRead = WsAuth([Permission.DATA_READ]);

      expect(decoratorStreamRead).toBeDefined();
      expect(decoratorStreamWrite).toBeDefined();
      expect(decoratorStreamSubscribe).toBeDefined();
      expect(decoratorDataRead).toBeDefined();
    });

    it('should create independent decorator instances', () => {
      const decorator1 = WsAuth([Permission.STREAM_READ]);
      const decorator2 = WsAuth([Permission.STREAM_WRITE]);

      expect(decorator1).toBeDefined();
      expect(decorator2).toBeDefined();
      // Each call should create a new decorator function
      expect(decorator1).not.toBe(decorator2);
    });
  });

  describe('Decorator Application', () => {
    it('should work as a class decorator', () => {
      const decorator = WsAuth();

      class TestClass {}

      // Class decorators may not return anything (return void)
      const result = decorator(TestClass);

      expect(TestClass).toBeDefined();
      expect(typeof TestClass).toBe('function');
      // Test that decorator was applied without errors
      expect(result).toBeUndefined();
    });

    it('should work as a method decorator', () => {
      const decorator = WsAuth([Permission.STREAM_READ]);

      class TestClass {
        testMethod() {
          return 'test';
        }
      }

      const mockDescriptor = {
        value: TestClass.prototype.testMethod,
        enumerable: true,
        configurable: true,
        writable: true
      };

      const result = decorator(TestClass.prototype, 'testMethod', mockDescriptor);

      // Method decorator may return undefined/void, just ensure no errors
      expect(() => decorator(TestClass.prototype, 'testMethod', mockDescriptor)).not.toThrow();
      const instance = new TestClass();
      expect(instance.testMethod()).toBe('test');
    });

    it('should work with multiple decorators on same class', () => {
      const decorator1 = WsAuth([Permission.STREAM_READ]);
      const decorator2 = WsAuth([Permission.STREAM_WRITE]);

      class TestClass {
        method1() { return 'method1'; }
        method2() { return 'method2'; }
      }

      const mockDescriptor1 = {
        value: TestClass.prototype.method1,
        enumerable: true,
        configurable: true,
        writable: true
      };

      const mockDescriptor2 = {
        value: TestClass.prototype.method2,
        enumerable: true,
        configurable: true,
        writable: true
      };

      decorator1(TestClass.prototype, 'method1', mockDescriptor1);
      decorator2(TestClass.prototype, 'method2', mockDescriptor2);

      const instance = new TestClass();
      expect(instance.method1()).toBe('method1');
      expect(instance.method2()).toBe('method2');
    });
  });
});

describe('WsPublic Decorator', () => {
  describe('Basic Functionality', () => {
    it('should be a function', () => {
      expect(typeof WsPublic).toBe('function');
    });

    it('should return a decorator function', () => {
      const decorator = WsPublic();
      expect(typeof decorator).toBe('function');
    });

    it('should return the same descriptor when called on a method', () => {
      const mockTarget = {};
      const mockPropertyKey = 'testMethod';
      const mockDescriptor = {
        value: jest.fn(),
        enumerable: true,
        configurable: true,
        writable: true
      };

      const decorator = WsPublic();
      const result = decorator(mockTarget, mockPropertyKey, mockDescriptor);

      expect(result).toBe(mockDescriptor);
    });

    it('should handle undefined descriptor', () => {
      const mockTarget = {};
      const mockPropertyKey = 'testMethod';

      const decorator = WsPublic();
      const result = decorator(mockTarget, mockPropertyKey, undefined);

      expect(result).toBeUndefined();
    });

    it('should not modify the descriptor', () => {
      const mockTarget = {};
      const mockPropertyKey = 'testMethod';
      const mockDescriptor = {
        value: jest.fn(),
        enumerable: true,
        configurable: true,
        writable: true
      };
      const originalDescriptor = { ...mockDescriptor };

      const decorator = WsPublic();
      decorator(mockTarget, mockPropertyKey, mockDescriptor);

      expect(mockDescriptor).toEqual(originalDescriptor);
    });
  });

  describe('Decorator Application', () => {
    it('should work as a method decorator', () => {
      const decorator = WsPublic();

      class TestClass {
        testMethod() {
          return 'test';
        }
      }

      const mockDescriptor = {
        value: TestClass.prototype.testMethod,
        enumerable: true,
        configurable: true,
        writable: true
      };

      const result = decorator(TestClass.prototype, 'testMethod', mockDescriptor);

      expect(result).toBe(mockDescriptor);
      expect(() => new TestClass()).not.toThrow();
      expect(new TestClass().testMethod()).toBe('test');
    });

    it('should create independent decorator instances', () => {
      const decorator1 = WsPublic();
      const decorator2 = WsPublic();

      expect(decorator1).not.toBe(decorator2);
      expect(typeof decorator1).toBe('function');
      expect(typeof decorator2).toBe('function');
    });

    it('should handle multiple applications to different methods', () => {
      const decorator1 = WsPublic();
      const decorator2 = WsPublic();

      const mockDescriptor1 = { value: jest.fn() };
      const mockDescriptor2 = { value: jest.fn() };

      const result1 = decorator1({}, 'method1', mockDescriptor1);
      const result2 = decorator2({}, 'method2', mockDescriptor2);

      expect(result1).toBe(mockDescriptor1);
      expect(result2).toBe(mockDescriptor2);
    });
  });

  describe('Integration Usage', () => {
    it('should be suitable for marking public WebSocket endpoints', () => {
      const decorator = WsPublic();

      const mockHandler = {
        handlePing: function() { return 'pong'; }
      };

      const mockDescriptor = {
        value: mockHandler.handlePing,
        enumerable: true,
        configurable: true,
        writable: true
      };

      const result = decorator(mockHandler, 'handlePing', mockDescriptor);

      expect(result).toBe(mockDescriptor);
      expect(result?.value).toBe(mockHandler.handlePing);
    });

    it('should not interfere with original method functionality', () => {
      const originalMethod = jest.fn().mockReturnValue('original result');
      const mockDescriptor = {
        value: originalMethod,
        enumerable: true,
        configurable: true,
        writable: true
      };

      const decorator = WsPublic();
      const result = decorator({}, 'test', mockDescriptor);
      const methodResult = result?.value?.();

      expect(originalMethod).toHaveBeenCalled();
      expect(methodResult).toBe('original result');
    });
  });
});