import { applyDecorators, UseGuards } from "@nestjs/common";
import { WsAuth, WsPublic } from '@core/01-entry/stream-receiver/decorators/ws-auth.decorator';
import { WsAuthGuard } from '@core/01-entry/stream-receiver/guards/ws-auth.guard';
import { RequirePermissions } from '@auth/decorators/permissions.decorator';
import { Permission } from '@auth/enums/user-role.enum';

// Mock NestJS decorators
jest.mock('@nestjs/common', () => ({
  applyDecorators: jest.fn(),
  UseGuards: jest.fn(),
}));

// Mock the permission decorator
jest.mock('@auth/decorators/permissions.decorator', () => ({
  RequirePermissions: jest.fn(),
}));

describe('WsAuth Decorator', () => {
  let mockApplyDecorators: jest.MockedFunction<typeof applyDecorators>;
  let mockUseGuards: jest.MockedFunction<typeof UseGuards>;
  let mockRequirePermissions: jest.MockedFunction<typeof RequirePermissions>;

  beforeEach(() => {
    mockApplyDecorators = applyDecorators as jest.MockedFunction<typeof applyDecorators>;
    mockUseGuards = UseGuards as jest.MockedFunction<typeof UseGuards>;
    mockRequirePermissions = RequirePermissions as jest.MockedFunction<typeof RequirePermissions>;

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock returns
    mockUseGuards.mockReturnValue('mockUseGuardsDecorator' as any);
    mockRequirePermissions.mockReturnValue('mockRequirePermissionsDecorator' as any);
    mockApplyDecorators.mockReturnValue('mockCombinedDecorator' as any);
  });

  describe('WsAuth without permissions', () => {
    it('should apply UseGuards with WsAuthGuard only when no permissions specified', () => {
      // Act
      const result = WsAuth();

      // Assert
      expect(mockUseGuards).toHaveBeenCalledWith(WsAuthGuard);
      expect(mockUseGuards).toHaveBeenCalledTimes(1);
      expect(mockRequirePermissions).not.toHaveBeenCalled();
      expect(mockApplyDecorators).toHaveBeenCalledWith('mockUseGuardsDecorator');
      expect(result).toBe('mockCombinedDecorator');
    });

    it('should apply UseGuards with WsAuthGuard only when empty permissions array', () => {
      // Act
      const result = WsAuth([]);

      // Assert
      expect(mockUseGuards).toHaveBeenCalledWith(WsAuthGuard);
      expect(mockUseGuards).toHaveBeenCalledTimes(1);
      expect(mockRequirePermissions).not.toHaveBeenCalled();
      expect(mockApplyDecorators).toHaveBeenCalledWith('mockUseGuardsDecorator');
      expect(result).toBe('mockCombinedDecorator');
    });
  });

  describe('WsAuth with permissions', () => {
    it('should apply both UseGuards and RequirePermissions when single permission specified', () => {
      // Arrange
      const permissions = [Permission.STREAM_READ];

      // Act
      const result = WsAuth(permissions);

      // Assert
      expect(mockUseGuards).toHaveBeenCalledWith(WsAuthGuard);
      expect(mockUseGuards).toHaveBeenCalledTimes(1);
      expect(mockRequirePermissions).toHaveBeenCalledWith(Permission.STREAM_READ);
      expect(mockRequirePermissions).toHaveBeenCalledTimes(1);
      expect(mockApplyDecorators).toHaveBeenCalledWith(
        'mockUseGuardsDecorator',
        'mockRequirePermissionsDecorator'
      );
      expect(result).toBe('mockCombinedDecorator');
    });

    it('should apply both UseGuards and RequirePermissions when multiple permissions specified', () => {
      // Arrange
      const permissions = [Permission.STREAM_READ, Permission.STREAM_WRITE];

      // Act
      const result = WsAuth(permissions);

      // Assert
      expect(mockUseGuards).toHaveBeenCalledWith(WsAuthGuard);
      expect(mockUseGuards).toHaveBeenCalledTimes(1);
      expect(mockRequirePermissions).toHaveBeenCalledWith(
        Permission.STREAM_READ,
        Permission.STREAM_WRITE
      );
      expect(mockRequirePermissions).toHaveBeenCalledTimes(1);
      expect(mockApplyDecorators).toHaveBeenCalledWith(
        'mockUseGuardsDecorator',
        'mockRequirePermissionsDecorator'
      );
      expect(result).toBe('mockCombinedDecorator');
    });

    it('should handle all stream-related permissions', () => {
      // Arrange
      const streamPermissions = [
        Permission.STREAM_READ,
        Permission.STREAM_WRITE,
        Permission.STREAM_SUBSCRIBE
      ];

      // Act
      const result = WsAuth(streamPermissions);

      // Assert
      expect(mockUseGuards).toHaveBeenCalledWith(WsAuthGuard);
      expect(mockRequirePermissions).toHaveBeenCalledWith(
        Permission.STREAM_READ,
        Permission.STREAM_WRITE,
        Permission.STREAM_SUBSCRIBE
      );
      expect(mockApplyDecorators).toHaveBeenCalledTimes(1);
      expect(result).toBe('mockCombinedDecorator');
    });

    it('should handle mixed permission types', () => {
      // Arrange
      const mixedPermissions = [Permission.STREAM_READ, Permission.DATA_READ];

      // Act
      const result = WsAuth(mixedPermissions);

      // Assert
      expect(mockUseGuards).toHaveBeenCalledWith(WsAuthGuard);
      expect(mockRequirePermissions).toHaveBeenCalledWith(
        Permission.STREAM_READ,
        Permission.DATA_READ
      );
      expect(mockApplyDecorators).toHaveBeenCalledTimes(1);
      expect(result).toBe('mockCombinedDecorator');
    });
  });

  describe('WsAuth edge cases', () => {
    it('should handle undefined permissions parameter', () => {
      // Act
      const result = WsAuth(undefined);

      // Assert
      expect(mockUseGuards).toHaveBeenCalledWith(WsAuthGuard);
      expect(mockRequirePermissions).not.toHaveBeenCalled();
      expect(mockApplyDecorators).toHaveBeenCalledWith('mockUseGuardsDecorator');
      expect(result).toBe('mockCombinedDecorator');
    });

    it('should call applyDecorators with correct decorator order', () => {
      // Arrange
      const permissions = [Permission.STREAM_READ];

      // Act
      WsAuth(permissions);

      // Assert - UseGuards should come first, then RequirePermissions
      expect(mockApplyDecorators).toHaveBeenCalledWith(
        'mockUseGuardsDecorator',
        'mockRequirePermissionsDecorator'
      );
    });

    it('should create new decorator instances for each call', () => {
      // Act
      WsAuth([Permission.STREAM_READ]);
      WsAuth([Permission.STREAM_WRITE]);

      // Assert
      expect(mockUseGuards).toHaveBeenCalledTimes(2);
      expect(mockRequirePermissions).toHaveBeenCalledTimes(2);
      expect(mockApplyDecorators).toHaveBeenCalledTimes(2);
    });
  });

  describe('WsAuth function signature and behavior', () => {
    it('should be a function that returns a decorator', () => {
      expect(typeof WsAuth).toBe('function');

      const decorator = WsAuth();
      expect(decorator).toBeDefined();
    });

    it('should handle permission parameter correctly', () => {
      // Test with different parameter types
      WsAuth(); // No parameters
      WsAuth([]); // Empty array
      WsAuth([Permission.STREAM_READ]); // Single permission
      WsAuth([Permission.STREAM_READ, Permission.STREAM_WRITE]); // Multiple permissions

      expect(mockApplyDecorators).toHaveBeenCalledTimes(4);
    });
  });
});

describe('WsPublic Decorator', () => {
  describe('basic functionality', () => {
    it('should be a function', () => {
      expect(typeof WsPublic).toBe('function');
    });

    it('should return a decorator function', () => {
      const decorator = WsPublic();
      expect(typeof decorator).toBe('function');
    });

    it('should return the same descriptor when called on a method', () => {
      // Arrange
      const mockTarget = {};
      const mockPropertyKey = 'testMethod';
      const mockDescriptor = {
        value: jest.fn(),
        enumerable: true,
        configurable: true,
        writable: true
      };

      // Act
      const decorator = WsPublic();
      const result = decorator(mockTarget, mockPropertyKey, mockDescriptor);

      // Assert
      expect(result).toBe(mockDescriptor);
    });

    it('should handle undefined descriptor', () => {
      // Arrange
      const mockTarget = {};
      const mockPropertyKey = 'testMethod';

      // Act
      const decorator = WsPublic();
      const result = decorator(mockTarget, mockPropertyKey, undefined);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should handle missing propertyKey parameter', () => {
      // Arrange
      const mockTarget = {};
      const mockDescriptor = {
        value: jest.fn(),
        enumerable: true,
        configurable: true,
        writable: true
      };

      // Act
      const decorator = WsPublic();
      const result = decorator(mockTarget, undefined, mockDescriptor);

      // Assert
      expect(result).toBe(mockDescriptor);
    });

    it('should not modify the descriptor', () => {
      // Arrange
      const mockTarget = {};
      const mockPropertyKey = 'testMethod';
      const mockDescriptor = {
        value: jest.fn(),
        enumerable: true,
        configurable: true,
        writable: true
      };
      const originalDescriptor = { ...mockDescriptor };

      // Act
      const decorator = WsPublic();
      decorator(mockTarget, mockPropertyKey, mockDescriptor);

      // Assert
      expect(mockDescriptor).toEqual(originalDescriptor);
    });
  });

  describe('decorator application scenarios', () => {
    it('should work as a method decorator', () => {
      // Arrange
      class TestClass {
        @WsPublic()
        testMethod() {
          return 'test';
        }
      }

      // Act & Assert - Should not throw
      expect(() => new TestClass()).not.toThrow();
      expect(new TestClass().testMethod()).toBe('test');
    });

    it('should handle multiple applications to different methods', () => {
      // Arrange & Act
      const decorator1 = WsPublic();
      const decorator2 = WsPublic();

      const mockDescriptor1 = { value: jest.fn() };
      const mockDescriptor2 = { value: jest.fn() };

      const result1 = decorator1({}, 'method1', mockDescriptor1);
      const result2 = decorator2({}, 'method2', mockDescriptor2);

      // Assert
      expect(result1).toBe(mockDescriptor1);
      expect(result2).toBe(mockDescriptor2);
    });

    it('should create independent decorator instances', () => {
      // Act
      const decorator1 = WsPublic();
      const decorator2 = WsPublic();

      // Assert - Each call should return a new function
      expect(decorator1).not.toBe(decorator2);
      expect(typeof decorator1).toBe('function');
      expect(typeof decorator2).toBe('function');
    });
  });

  describe('parameter handling', () => {
    it('should handle all undefined parameters', () => {
      // Act
      const decorator = WsPublic();
      const result = decorator(undefined, undefined, undefined);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should handle null parameters gracefully', () => {
      // Act
      const decorator = WsPublic();
      const result = decorator(null as any, null as any, null as any);

      // Assert
      expect(result).toBeNull();
    });

    it('should preserve descriptor properties', () => {
      // Arrange
      const mockDescriptor = {
        value: jest.fn(),
        enumerable: false,
        configurable: false,
        writable: false,
        get: jest.fn(),
        set: jest.fn()
      };

      // Act
      const decorator = WsPublic();
      const result = decorator({}, 'test', mockDescriptor);

      // Assert
      expect(result).toBe(mockDescriptor);
      expect(result?.enumerable).toBe(false);
      expect(result?.configurable).toBe(false);
      expect(result?.writable).toBe(false);
      expect(result?.get).toBe(mockDescriptor.get);
      expect(result?.set).toBe(mockDescriptor.set);
    });
  });

  describe('integration with WebSocket handlers', () => {
    it('should be suitable for marking public WebSocket endpoints', () => {
      // This test verifies the intended usage pattern
      const decorator = WsPublic();

      // Simulate usage on a WebSocket message handler
      const mockHandler = {
        handlePing: function() { return 'pong'; }
      };

      const mockDescriptor = {
        value: mockHandler.handlePing,
        enumerable: true,
        configurable: true,
        writable: true
      };

      // Act
      const result = decorator(mockHandler, 'handlePing', mockDescriptor);

      // Assert
      expect(result).toBe(mockDescriptor);
      expect(result?.value).toBe(mockHandler.handlePing);
    });

    it('should not interfere with the original method functionality', () => {
      // Arrange
      const originalMethod = jest.fn().mockReturnValue('original result');
      const mockDescriptor = {
        value: originalMethod,
        enumerable: true,
        configurable: true,
        writable: true
      };

      // Act
      const decorator = WsPublic();
      const result = decorator({}, 'test', mockDescriptor);
      const methodResult = result?.value?.();

      // Assert
      expect(originalMethod).toHaveBeenCalled();
      expect(methodResult).toBe('original result');
    });
  });
});
