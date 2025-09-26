import { Retryable, StandardRetry, PersistentRetry } from '@core/04-storage/storage/decorators/retryable.decorator';
import { UniversalRetryHandler } from '@common/core/exceptions/universal-retry.handler';
import { ComponentIdentifier, BusinessException, BusinessErrorCode } from '@common/core/exceptions/business.exception';
import { STORAGE_CONFIG } from '@core/04-storage/storage/constants/storage.constants';

// Mock UniversalRetryHandler
jest.mock('@common/core/exceptions/universal-retry.handler');
jest.mock('@core/04-storage/storage/constants/storage.constants', () => ({
  STORAGE_CONFIG: {
    DEFAULT_RETRY_ATTEMPTS: 3,
  },
}));

describe('Retryable Decorators', () => {
  let mockUniversalRetryHandler: jest.Mocked<typeof UniversalRetryHandler>;

  beforeEach(() => {
    mockUniversalRetryHandler = UniversalRetryHandler as jest.Mocked<typeof UniversalRetryHandler>;
    jest.clearAllMocks();

    // Setup default mock implementations
    mockUniversalRetryHandler.quickRetry = jest.fn();
    mockUniversalRetryHandler.standardRetry = jest.fn();
    mockUniversalRetryHandler.persistentRetry = jest.fn();
    mockUniversalRetryHandler.networkRetry = jest.fn();
    mockUniversalRetryHandler.executeWithRetry = jest.fn();
  });

  describe('@Retryable decorator', () => {
    class TestService {
      @Retryable({ maxAttempts: 3, operationName: 'testOperation' })
      async testMethod(arg1: string, arg2: number): Promise<string> {
        return `Result: ${arg1} - ${arg2}`;
      }

      @Retryable({ configType: 'quick', operationName: 'quickOperation' })
      async quickMethod(): Promise<string> {
        return 'Quick result';
      }

      @Retryable({ configType: 'standard' })
      async standardMethod(): Promise<string> {
        return 'Standard result';
      }

      @Retryable({ configType: 'persistent' })
      async persistentMethod(): Promise<string> {
        return 'Persistent result';
      }

      @Retryable({ configType: 'network' })
      async networkMethod(): Promise<string> {
        return 'Network result';
      }

      @Retryable() // No options, should use defaults
      async defaultMethod(): Promise<string> {
        return 'Default result';
      }
    }

    describe('custom configuration', () => {
      it('should execute method with custom retry configuration', async () => {
        // Arrange
        const service = new TestService();
        const expectedResult = 'Test result';
        mockUniversalRetryHandler.executeWithRetry.mockResolvedValue({
          success: true,
          result: expectedResult,
          error: null,
          attempts: 1,
          totalDuration: 100,
          attemptDurations: [100]
        });

        // Act
        const result = await service.testMethod('test', 123);

        // Assert
        expect(result).toBe(expectedResult);
        expect(mockUniversalRetryHandler.executeWithRetry).toHaveBeenCalledWith(
          expect.any(Function),
          'testOperation',
          ComponentIdentifier.STORAGE,
          {
            maxAttempts: 3,
            baseDelay: 1000,
          }
        );
      });

      it('should use default configuration when no options provided', async () => {
        // Arrange
        const service = new TestService();
        const expectedResult = 'Default result';
        mockUniversalRetryHandler.executeWithRetry.mockResolvedValue({
          success: true,
          result: expectedResult,
          error: null,
          attempts: 1,
          totalDuration: 100,
          attemptDurations: [100]
        });

        // Act
        const result = await service.defaultMethod();

        // Assert
        expect(result).toBe(expectedResult);
        expect(mockUniversalRetryHandler.executeWithRetry).toHaveBeenCalledWith(
          expect.any(Function),
          'TestService.defaultMethod', // Auto-generated operation name
          ComponentIdentifier.STORAGE,
          {
            maxAttempts: STORAGE_CONFIG.DEFAULT_RETRY_ATTEMPTS,
            baseDelay: 1000,
          }
        );
      });

      it('should throw error when retry fails', async () => {
        // Arrange
        const service = new TestService();
        const expectedError = new BusinessException({
          component: ComponentIdentifier.STORAGE,
          errorCode: BusinessErrorCode.EXTERNAL_API_ERROR,
          operation: 'testMethod',
          message: 'Retry failed',
          context: {}
        });
        mockUniversalRetryHandler.executeWithRetry.mockResolvedValue({
          success: false,
          result: null,
          error: expectedError,
          attempts: 3,
          totalDuration: 5000,
          attemptDurations: [1000, 2000, 2000]
        });

        // Act & Assert
        await expect(service.testMethod('test', 123)).rejects.toThrow(expectedError);
        expect(mockUniversalRetryHandler.executeWithRetry).toHaveBeenCalledTimes(1);
      });

      it('should preserve method context and arguments', async () => {
        // Arrange
        const service = new TestService();
        let capturedThis: any;
        let capturedArgs: any[];

        mockUniversalRetryHandler.executeWithRetry.mockImplementation(async (fn) => {
          const result = await fn();
          return { success: true, result, error: null, attempts: 1, totalDuration: 100, attemptDurations: [100] };
        });

        // Spy on the original method to capture context
        const originalMethod = service.testMethod;
        const methodSpy = jest.fn().mockImplementation(function(this: any, ...args: any[]) {
          capturedThis = this;
          capturedArgs = args;
          return originalMethod.apply(this, args);
        });

        // Replace method with spy (simulating decorator behavior)
        (service as any).testMethod = methodSpy;

        // Act
        await service.testMethod('arg1', 456);

        // Assert
        expect(capturedThis).toBe(service);
        expect(capturedArgs).toEqual(['arg1', 456]);
      });
    });

    describe('predefined configuration types', () => {
      it('should use quickRetry for configType "quick"', async () => {
        // Arrange
        const service = new TestService();
        const expectedResult = 'Quick result';
        mockUniversalRetryHandler.quickRetry.mockResolvedValue(expectedResult);

        // Act
        const result = await service.quickMethod();

        // Assert
        expect(result).toBe(expectedResult);
        expect(mockUniversalRetryHandler.quickRetry).toHaveBeenCalledWith(
          expect.any(Function),
          'quickOperation',
          ComponentIdentifier.STORAGE
        );
        expect(mockUniversalRetryHandler.executeWithRetry).not.toHaveBeenCalled();
      });

      it('should use standardRetry for configType "standard"', async () => {
        // Arrange
        const service = new TestService();
        const expectedResult = 'Standard result';
        mockUniversalRetryHandler.standardRetry.mockResolvedValue(expectedResult);

        // Act
        const result = await service.standardMethod();

        // Assert
        expect(result).toBe(expectedResult);
        expect(mockUniversalRetryHandler.standardRetry).toHaveBeenCalledWith(
          expect.any(Function),
          'TestService.standardMethod', // Auto-generated when no operationName provided
          ComponentIdentifier.STORAGE
        );
        expect(mockUniversalRetryHandler.executeWithRetry).not.toHaveBeenCalled();
      });

      it('should use persistentRetry for configType "persistent"', async () => {
        // Arrange
        const service = new TestService();
        const expectedResult = 'Persistent result';
        mockUniversalRetryHandler.persistentRetry.mockResolvedValue(expectedResult);

        // Act
        const result = await service.persistentMethod();

        // Assert
        expect(result).toBe(expectedResult);
        expect(mockUniversalRetryHandler.persistentRetry).toHaveBeenCalledWith(
          expect.any(Function),
          'TestService.persistentMethod',
          ComponentIdentifier.STORAGE
        );
        expect(mockUniversalRetryHandler.executeWithRetry).not.toHaveBeenCalled();
      });

      it('should use networkRetry for configType "network"', async () => {
        // Arrange
        const service = new TestService();
        const expectedResult = 'Network result';
        mockUniversalRetryHandler.networkRetry.mockResolvedValue(expectedResult);

        // Act
        const result = await service.networkMethod();

        // Assert
        expect(result).toBe(expectedResult);
        expect(mockUniversalRetryHandler.networkRetry).toHaveBeenCalledWith(
          expect.any(Function),
          'TestService.networkMethod',
          ComponentIdentifier.STORAGE
        );
        expect(mockUniversalRetryHandler.executeWithRetry).not.toHaveBeenCalled();
      });
    });

    describe('operation name generation', () => {
      it('should use provided operationName when specified', async () => {
        // Arrange
        const service = new TestService();
        mockUniversalRetryHandler.quickRetry.mockResolvedValue('result');

        // Act
        await service.quickMethod();

        // Assert
        expect(mockUniversalRetryHandler.quickRetry).toHaveBeenCalledWith(
          expect.any(Function),
          'quickOperation', // Custom operation name
          ComponentIdentifier.STORAGE
        );
      });

      it('should auto-generate operationName when not provided', async () => {
        // Arrange
        const service = new TestService();
        mockUniversalRetryHandler.standardRetry.mockResolvedValue('result');

        // Act
        await service.standardMethod();

        // Assert
        expect(mockUniversalRetryHandler.standardRetry).toHaveBeenCalledWith(
          expect.any(Function),
          'TestService.standardMethod', // Auto-generated: ClassName.methodName
          ComponentIdentifier.STORAGE
        );
      });
    });

    describe('error handling', () => {
      it('should handle sync method errors in predefined configs', async () => {
        // Arrange
        class TestServiceWithError {
          @Retryable({ configType: 'quick' })
          async errorMethod(): Promise<string> {
            throw new Error('Original error');
          }
        }

        const service = new TestServiceWithError();
        const retryError = new Error('Retry failed');
        mockUniversalRetryHandler.quickRetry.mockRejectedValue(retryError);

        // Act & Assert
        await expect(service.errorMethod()).rejects.toThrow(retryError);
        expect(mockUniversalRetryHandler.quickRetry).toHaveBeenCalledTimes(1);
      });

      it('should handle async method errors in custom config', async () => {
        // Arrange
        class TestServiceWithAsyncError {
          @Retryable({ maxAttempts: 2 })
          async asyncErrorMethod(): Promise<string> {
            await new Promise(resolve => setTimeout(resolve, 10));
            throw new Error('Async error');
          }
        }

        const service = new TestServiceWithAsyncError();
        const finalError = new BusinessException({
          component: ComponentIdentifier.STORAGE,
          errorCode: BusinessErrorCode.EXTERNAL_API_ERROR,
          operation: 'asyncErrorMethod',
          message: 'Final retry error',
          context: {}
        });
        mockUniversalRetryHandler.executeWithRetry.mockResolvedValue({
          success: false,
          result: null,
          error: finalError,
          attempts: 2,
          totalDuration: 3000,
          attemptDurations: [1000, 2000]
        });

        // Act & Assert
        await expect(service.asyncErrorMethod()).rejects.toThrow(finalError);
        expect(mockUniversalRetryHandler.executeWithRetry).toHaveBeenCalledTimes(1);
      });
    });

    describe('decorator return value', () => {
      it('should return the modified property descriptor', () => {
        // Arrange
        const target = {};
        const propertyName = 'testMethod';
        const originalDescriptor = {
          value: jest.fn(),
          writable: true,
          enumerable: true,
          configurable: true
        };

        // Act
        const decorator = Retryable({ maxAttempts: 3 });
        const result = decorator(target, propertyName, originalDescriptor);

        // Assert
        expect(result).toBe(originalDescriptor);
        expect(result.value).not.toBe(originalDescriptor.value); // Method should be wrapped
        expect(typeof result.value).toBe('function');
      });

      it('should preserve descriptor properties', () => {
        // Arrange
        const target = {};
        const propertyName = 'testMethod';
        const originalDescriptor = {
          value: jest.fn(),
          writable: false,
          enumerable: false,
          configurable: false
        };

        // Act
        const decorator = Retryable();
        const result = decorator(target, propertyName, originalDescriptor);

        // Assert
        expect(result.writable).toBe(false);
        expect(result.enumerable).toBe(false);
        expect(result.configurable).toBe(false);
      });
    });
  });

  describe('@StandardRetry decorator', () => {
    it('should create Retryable decorator with standard config', async () => {
      // Arrange
      class TestService {
        @StandardRetry('customStandardOp')
        async standardMethod(): Promise<string> {
          return 'Standard result';
        }

        @StandardRetry() // No operation name
        async defaultStandardMethod(): Promise<string> {
          return 'Default standard result';
        }
      }

      const service = new TestService();
      mockUniversalRetryHandler.standardRetry.mockResolvedValue('result');

      // Act
      await service.standardMethod();
      await service.defaultStandardMethod();

      // Assert
      expect(mockUniversalRetryHandler.standardRetry).toHaveBeenCalledTimes(2);
      expect(mockUniversalRetryHandler.standardRetry).toHaveBeenNthCalledWith(
        1,
        expect.any(Function),
        'customStandardOp',
        ComponentIdentifier.STORAGE
      );
      expect(mockUniversalRetryHandler.standardRetry).toHaveBeenNthCalledWith(
        2,
        expect.any(Function),
        'TestService.defaultStandardMethod',
        ComponentIdentifier.STORAGE
      );
    });
  });

  describe('@PersistentRetry decorator', () => {
    it('should create Retryable decorator with persistent config', async () => {
      // Arrange
      class TestService {
        @PersistentRetry('customPersistentOp')
        async persistentMethod(): Promise<string> {
          return 'Persistent result';
        }

        @PersistentRetry() // No operation name
        async defaultPersistentMethod(): Promise<string> {
          return 'Default persistent result';
        }
      }

      const service = new TestService();
      mockUniversalRetryHandler.persistentRetry.mockResolvedValue('result');

      // Act
      await service.persistentMethod();
      await service.defaultPersistentMethod();

      // Assert
      expect(mockUniversalRetryHandler.persistentRetry).toHaveBeenCalledTimes(2);
      expect(mockUniversalRetryHandler.persistentRetry).toHaveBeenNthCalledWith(
        1,
        expect.any(Function),
        'customPersistentOp',
        ComponentIdentifier.STORAGE
      );
      expect(mockUniversalRetryHandler.persistentRetry).toHaveBeenNthCalledWith(
        2,
        expect.any(Function),
        'TestService.defaultPersistentMethod',
        ComponentIdentifier.STORAGE
      );
    });
  });

  describe('Edge cases and integration', () => {
    it('should handle methods with different return types', async () => {
      // Arrange
      class MultiTypeService {
        @Retryable({ configType: 'quick' })
        async stringMethod(): Promise<string> {
          return 'string';
        }

        @Retryable({ configType: 'standard' })
        async numberMethod(): Promise<number> {
          return 42;
        }

        @Retryable({ configType: 'persistent' })
        async objectMethod(): Promise<{ value: string }> {
          return { value: 'object' };
        }

        @Retryable({ configType: 'network' })
        async voidMethod(): Promise<void> {
          return;
        }
      }

      const service = new MultiTypeService();
      mockUniversalRetryHandler.quickRetry.mockResolvedValue('string');
      mockUniversalRetryHandler.standardRetry.mockResolvedValue(42);
      mockUniversalRetryHandler.persistentRetry.mockResolvedValue({ value: 'object' });
      mockUniversalRetryHandler.networkRetry.mockResolvedValue(undefined);

      // Act
      const stringResult = await service.stringMethod();
      const numberResult = await service.numberMethod();
      const objectResult = await service.objectMethod();
      const voidResult = await service.voidMethod();

      // Assert
      expect(stringResult).toBe('string');
      expect(numberResult).toBe(42);
      expect(objectResult).toEqual({ value: 'object' });
      expect(voidResult).toBeUndefined();
    });

    it('should handle methods with complex parameter types', async () => {
      // Arrange
      interface ComplexParam {
        id: string;
        data: number[];
        options?: { flag: boolean };
      }

      class ComplexParamService {
        @Retryable({ maxAttempts: 2, operationName: 'complexOperation' })
        async complexMethod(param: ComplexParam, callback?: () => void): Promise<string> {
          callback?.();
          return `Processed: ${param.id}`;
        }
      }

      const service = new ComplexParamService();
      const callback = jest.fn();
      const complexParam = { id: 'test', data: [1, 2, 3], options: { flag: true } };

      mockUniversalRetryHandler.executeWithRetry.mockImplementation(async (fn) => {
        const result = await fn();
        return { success: true, result, error: null, attempts: 1, totalDuration: 100, attemptDurations: [100] };
      });

      // Act
      const result = await service.complexMethod(complexParam, callback);

      // Assert
      expect(result).toBe('Processed: test');
      expect(callback).toHaveBeenCalled();
      expect(mockUniversalRetryHandler.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        'complexOperation',
        ComponentIdentifier.STORAGE,
        {
          maxAttempts: 2,
          baseDelay: 1000,
        }
      );
    });

    it('should work with inheritance', async () => {
      // Arrange
      class BaseService {
        @Retryable({ configType: 'standard' })
        async baseMethod(): Promise<string> {
          return 'base';
        }
      }

      class DerivedService extends BaseService {
        @Retryable({ configType: 'persistent' })
        async derivedMethod(): Promise<string> {
          return 'derived';
        }

        @Retryable({ configType: 'quick' })
        override async baseMethod(): Promise<string> {
          return 'overridden';
        }
      }

      const service = new DerivedService();
      mockUniversalRetryHandler.standardRetry.mockResolvedValue('base');
      mockUniversalRetryHandler.persistentRetry.mockResolvedValue('derived');
      mockUniversalRetryHandler.quickRetry.mockResolvedValue('overridden');

      // Act
      const baseResult = await service.baseMethod();
      const derivedResult = await service.derivedMethod();

      // Assert
      expect(baseResult).toBe('overridden'); // Should use the overridden method
      expect(derivedResult).toBe('derived');
      expect(mockUniversalRetryHandler.quickRetry).toHaveBeenCalledWith(
        expect.any(Function),
        'DerivedService.baseMethod',
        ComponentIdentifier.STORAGE
      );
      expect(mockUniversalRetryHandler.persistentRetry).toHaveBeenCalledWith(
        expect.any(Function),
        'DerivedService.derivedMethod',
        ComponentIdentifier.STORAGE
      );
    });
  });
});
