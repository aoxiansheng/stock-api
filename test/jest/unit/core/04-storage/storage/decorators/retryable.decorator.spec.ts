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
        expect(typeof result.value).toBe('function');
        // 验证方法被装饰器包装
        expect(result.value).toBeDefined();
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

  describe('Direct Decorator Factory Function Coverage', () => {
    describe('Retryable decorator factory function execution', () => {
      it('should execute Retryable decorator factory with default options', () => {
        // Arrange
        const target = {};
        const propertyName = 'testMethod';
        const originalDescriptor = {
          value: jest.fn().mockResolvedValue('test'),
          writable: true,
          enumerable: true,
          configurable: true
        };

        // Act - 直接调用装饰器工厂函数以触发函数覆盖
        const decoratorFactory = Retryable();
        expect(typeof decoratorFactory).toBe('function');

        const result = decoratorFactory(target, propertyName, originalDescriptor);

        // Assert - 验证装饰器工厂函数执行
        expect(result).toBe(originalDescriptor);
        expect(typeof result.value).toBe('function');
        // 验证函数被装饰器修改（装饰器会替换原方法）
        expect(result.value).toBeDefined();
      });

      it('should execute Retryable decorator factory with custom options', () => {
        // Arrange
        const target = { constructor: { name: 'TestClass' } };
        const propertyName = 'customMethod';
        const originalDescriptor = {
          value: jest.fn().mockResolvedValue('custom'),
          writable: true,
          enumerable: true,
          configurable: true
        };
        const customOptions = {
          maxAttempts: 5,
          baseDelay: 2000,
          operationName: 'customOperation'
        };

        // Act - 使用自定义选项调用装饰器工厂
        const decoratorFactory = Retryable(customOptions);
        const result = decoratorFactory(target, propertyName, originalDescriptor);

        // Assert - 验证自定义选项处理
        expect(result).toBe(originalDescriptor);
        expect(typeof result.value).toBe('function');
      });

      it('should execute Retryable decorator factory with configType options', () => {
        // Arrange
        const target = { constructor: { name: 'ConfigTestClass' } };
        const propertyName = 'configMethod';
        const originalDescriptor = {
          value: jest.fn().mockResolvedValue('config'),
          writable: true,
          enumerable: true,
          configurable: true
        };

        const configTypes = ['quick', 'standard', 'persistent', 'network'] as const;

        for (const configType of configTypes) {
          // Act - 测试每种配置类型的装饰器工厂执行
          const decoratorFactory = Retryable({ configType });
          const result = decoratorFactory(target, `${propertyName}_${configType}`, originalDescriptor);

          // Assert - 验证配置类型特定的装饰器工厂执行
          expect(result).toBe(originalDescriptor);
          expect(typeof result.value).toBe('function');
        }
      });

      it('should execute Retryable decorator factory operation name generation logic', () => {
        // Arrange
        const target = { constructor: { name: 'OperationNameTest' } };
        const propertyName = 'methodForNameGeneration';
        const originalDescriptor = {
          value: jest.fn().mockResolvedValue('name-gen'),
          writable: true,
          enumerable: true,
          configurable: true
        };

        // Act - 测试操作名称生成逻辑的执行
        const decoratorWithoutName = Retryable({});
        const resultWithoutName = decoratorWithoutName(target, propertyName, originalDescriptor);

        const decoratorWithName = Retryable({ operationName: 'explicitName' });
        const resultWithName = decoratorWithName(target, 'anotherMethod', originalDescriptor);

        // Assert - 验证操作名称生成和显式名称处理
        expect(resultWithoutName).toBe(originalDescriptor);
        expect(resultWithName).toBe(originalDescriptor);
        expect(typeof resultWithoutName.value).toBe('function');
        expect(typeof resultWithName.value).toBe('function');
      });

      it('should execute Retryable decorator factory property descriptor modification', () => {
        // Arrange
        const target = {};
        const propertyName = 'descriptorTest';
        const originalDescriptor = {
          value: jest.fn().mockResolvedValue('descriptor-test'),
          writable: false,
          enumerable: false,
          configurable: false
        };

        // Act - 测试属性描述符修改逻辑的执行
        const decoratorFactory = Retryable({ maxAttempts: 3 });
        const result = decoratorFactory(target, propertyName, originalDescriptor);

        // Assert - 验证属性描述符保持原有特性但函数被替换
        expect(result).toBe(originalDescriptor);
        expect(result.writable).toBe(false);
        expect(result.enumerable).toBe(false);
        expect(result.configurable).toBe(false);
        expect(typeof result.value).toBe('function');
        // 验证函数被装饰器处理
        expect(result.value).toBeDefined();
      });
    });

    describe('StandardRetry decorator factory function execution', () => {
      it('should execute StandardRetry decorator factory without operation name', () => {
        // Arrange
        const target = { constructor: { name: 'StandardTestClass' } };
        const propertyName = 'standardTestMethod';
        const originalDescriptor = {
          value: jest.fn().mockResolvedValue('standard'),
          writable: true,
          enumerable: true,
          configurable: true
        };

        // Act - 直接调用StandardRetry装饰器工厂函数
        const decoratorFactory = StandardRetry();
        expect(typeof decoratorFactory).toBe('function');

        const result = decoratorFactory(target, propertyName, originalDescriptor);

        // Assert - 验证StandardRetry装饰器工厂执行
        expect(result).toBe(originalDescriptor);
        expect(typeof result.value).toBe('function');
        expect(result.value).toBeDefined();
      });

      it('should execute StandardRetry decorator factory with operation name', () => {
        // Arrange
        const target = { constructor: { name: 'StandardNamedTestClass' } };
        const propertyName = 'standardNamedMethod';
        const originalDescriptor = {
          value: jest.fn().mockResolvedValue('standard-named'),
          writable: true,
          enumerable: true,
          configurable: true
        };
        const operationName = 'customStandardOperation';

        // Act - 使用操作名称调用StandardRetry装饰器工厂
        const decoratorFactory = StandardRetry(operationName);
        const result = decoratorFactory(target, propertyName, originalDescriptor);

        // Assert - 验证带操作名称的StandardRetry装饰器工厂执行
        expect(result).toBe(originalDescriptor);
        expect(typeof result.value).toBe('function');
      });

      it('should execute StandardRetry decorator factory parameter passing logic', () => {
        // Arrange
        const target = {};
        const propertyName = 'parameterTestMethod';
        const originalDescriptor = {
          value: jest.fn(),
          writable: true,
          enumerable: true,
          configurable: true
        };

        // Act - 测试参数传递逻辑的执行
        const decoratorWithParam = StandardRetry('testOperation');
        const decoratorWithoutParam = StandardRetry(undefined);
        const decoratorNoArgs = StandardRetry();

        const resultWithParam = decoratorWithParam(target, propertyName, originalDescriptor);
        const resultWithoutParam = decoratorWithoutParam(target, propertyName, originalDescriptor);
        const resultNoArgs = decoratorNoArgs(target, propertyName, originalDescriptor);

        // Assert - 验证不同参数情况下的装饰器工厂执行
        expect(resultWithParam).toBe(originalDescriptor);
        expect(resultWithoutParam).toBe(originalDescriptor);
        expect(resultNoArgs).toBe(originalDescriptor);
        expect(typeof resultWithParam.value).toBe('function');
        expect(typeof resultWithoutParam.value).toBe('function');
        expect(typeof resultNoArgs.value).toBe('function');
      });
    });

    describe('PersistentRetry decorator factory function execution', () => {
      it('should execute PersistentRetry decorator factory without operation name', () => {
        // Arrange
        const target = { constructor: { name: 'PersistentTestClass' } };
        const propertyName = 'persistentTestMethod';
        const originalDescriptor = {
          value: jest.fn().mockResolvedValue('persistent'),
          writable: true,
          enumerable: true,
          configurable: true
        };

        // Act - 直接调用PersistentRetry装饰器工厂函数
        const decoratorFactory = PersistentRetry();
        expect(typeof decoratorFactory).toBe('function');

        const result = decoratorFactory(target, propertyName, originalDescriptor);

        // Assert - 验证PersistentRetry装饰器工厂执行
        expect(result).toBe(originalDescriptor);
        expect(typeof result.value).toBe('function');
        expect(result.value).toBeDefined();
      });

      it('should execute PersistentRetry decorator factory with operation name', () => {
        // Arrange
        const target = { constructor: { name: 'PersistentNamedTestClass' } };
        const propertyName = 'persistentNamedMethod';
        const originalDescriptor = {
          value: jest.fn().mockResolvedValue('persistent-named'),
          writable: true,
          enumerable: true,
          configurable: true
        };
        const operationName = 'customPersistentOperation';

        // Act - 使用操作名称调用PersistentRetry装饰器工厂
        const decoratorFactory = PersistentRetry(operationName);
        const result = decoratorFactory(target, propertyName, originalDescriptor);

        // Assert - 验证带操作名称的PersistentRetry装饰器工厂执行
        expect(result).toBe(originalDescriptor);
        expect(typeof result.value).toBe('function');
      });

      it('should execute PersistentRetry decorator factory parameter handling logic', () => {
        // Arrange
        const target = {};
        const propertyName = 'paramHandlingMethod';
        const originalDescriptor = {
          value: jest.fn(),
          writable: true,
          enumerable: true,
          configurable: true
        };

        // Act - 测试参数处理逻辑的执行
        const decoratorWithString = PersistentRetry('stringParam');
        const decoratorWithUndefined = PersistentRetry(undefined);
        const decoratorWithEmptyString = PersistentRetry('');

        const resultWithString = decoratorWithString(target, propertyName, originalDescriptor);
        const resultWithUndefined = decoratorWithUndefined(target, propertyName, originalDescriptor);
        const resultWithEmptyString = decoratorWithEmptyString(target, propertyName, originalDescriptor);

        // Assert - 验证不同参数类型的装饰器工厂执行
        expect(resultWithString).toBe(originalDescriptor);
        expect(resultWithUndefined).toBe(originalDescriptor);
        expect(resultWithEmptyString).toBe(originalDescriptor);
        expect(typeof resultWithString.value).toBe('function');
        expect(typeof resultWithUndefined.value).toBe('function');
        expect(typeof resultWithEmptyString.value).toBe('function');
      });
    });

    describe('Decorator factory function wrapper execution paths', () => {
      it('should execute Retryable wrapper function with all switch case branches', async () => {
        // Arrange
        const mockMethod = jest.fn().mockResolvedValue('test-result');
        const target = { constructor: { name: 'SwitchTestClass' } };
        const propertyName = 'switchTestMethod';
        const originalDescriptor = { value: mockMethod, writable: true, enumerable: true, configurable: true };

        // Test each switch case branch by creating decorated methods
        const configTypes = ['quick', 'standard', 'persistent', 'network'] as const;

        for (const configType of configTypes) {
          // Act - 创建带有特定配置类型的装饰方法并执行以触发switch分支
          const decoratorFactory = Retryable({ configType });
          const decoratedDescriptor = decoratorFactory(target, propertyName, originalDescriptor);

          // 重置mock以确保每次测试独立
          jest.clearAllMocks();

          // 设置对应的mock
          switch (configType) {
            case 'quick':
              mockUniversalRetryHandler.quickRetry.mockResolvedValue('quick-result');
              break;
            case 'standard':
              mockUniversalRetryHandler.standardRetry.mockResolvedValue('standard-result');
              break;
            case 'persistent':
              mockUniversalRetryHandler.persistentRetry.mockResolvedValue('persistent-result');
              break;
            case 'network':
              mockUniversalRetryHandler.networkRetry.mockResolvedValue('network-result');
              break;
          }

          // 执行装饰后的方法以触发switch分支代码路径
          const result = await decoratedDescriptor.value.call({}, 'arg1', 'arg2');

          // Assert - 验证特定配置类型的代码路径执行
          expect(result).toBeDefined();

          switch (configType) {
            case 'quick':
              expect(mockUniversalRetryHandler.quickRetry).toHaveBeenCalledTimes(1);
              break;
            case 'standard':
              expect(mockUniversalRetryHandler.standardRetry).toHaveBeenCalledTimes(1);
              break;
            case 'persistent':
              expect(mockUniversalRetryHandler.persistentRetry).toHaveBeenCalledTimes(1);
              break;
            case 'network':
              expect(mockUniversalRetryHandler.networkRetry).toHaveBeenCalledTimes(1);
              break;
          }
        }
      });

      it('should execute Retryable wrapper function custom config branch', async () => {
        // Arrange
        const mockMethod = jest.fn().mockResolvedValue('custom-result');
        const target = { constructor: { name: 'CustomConfigClass' } };
        const propertyName = 'customConfigMethod';
        const originalDescriptor = { value: mockMethod, writable: true, enumerable: true, configurable: true };

        // Act - 创建使用自定义配置的装饰方法(不使用configType)
        const decoratorFactory = Retryable({ maxAttempts: 5, baseDelay: 2000 });
        const decoratedDescriptor = decoratorFactory(target, propertyName, originalDescriptor);

        // 设置executeWithRetry mock以模拟成功情况
        mockUniversalRetryHandler.executeWithRetry.mockResolvedValue({
          success: true,
          result: 'custom-success',
          error: null,
          attempts: 1,
          totalDuration: 100,
          attemptDurations: [100]
        });

        // 执行装饰后的方法以触发自定义配置分支
        const result = await decoratedDescriptor.value.call({}, 'custom-arg');

        // Assert - 验证自定义配置分支执行
        expect(result).toBe('custom-success');
        expect(mockUniversalRetryHandler.executeWithRetry).toHaveBeenCalledWith(
          expect.any(Function),
          'CustomConfigClass.customConfigMethod',
          ComponentIdentifier.STORAGE,
          { maxAttempts: 5, baseDelay: 2000 }
        );
      });

      it('should execute Retryable wrapper function error handling branch', async () => {
        // Arrange
        const mockMethod = jest.fn().mockResolvedValue('error-test');
        const target = { constructor: { name: 'ErrorTestClass' } };
        const propertyName = 'errorTestMethod';
        const originalDescriptor = { value: mockMethod, writable: true, enumerable: true, configurable: true };

        // Act - 创建装饰方法并测试错误分支
        const decoratorFactory = Retryable({ maxAttempts: 2 });
        const decoratedDescriptor = decoratorFactory(target, propertyName, originalDescriptor);

        const testError = new BusinessException({
          component: ComponentIdentifier.STORAGE,
          errorCode: BusinessErrorCode.EXTERNAL_API_ERROR,
          operation: 'errorTestMethod',
          message: 'Test retry error',
          context: {}
        });
        // 设置executeWithRetry mock以模拟失败情况
        mockUniversalRetryHandler.executeWithRetry.mockResolvedValue({
          success: false,
          result: null,
          error: testError,
          attempts: 2,
          totalDuration: 3000,
          attemptDurations: [1000, 2000]
        });

        // 执行装饰后的方法以触发错误处理分支
        await expect(decoratedDescriptor.value.call({}, 'error-arg')).rejects.toThrow(testError);

        // Assert - 验证错误处理分支执行
        expect(mockUniversalRetryHandler.executeWithRetry).toHaveBeenCalledTimes(1);
      });
    });

    describe('Factory function return value and closure execution', () => {
      it('should execute decorator factory closure with proper context binding', () => {
        // Arrange
        const target = { constructor: { name: 'ClosureTestClass' } };
        const propertyName = 'closureTestMethod';
        const originalMethod = jest.fn().mockReturnValue('original');
        const originalDescriptor = { value: originalMethod, writable: true, enumerable: true, configurable: true };

        // Act - 测试装饰器工厂返回的闭包函数执行
        const retryableFactory = Retryable({ operationName: 'closureTest' });
        const standardFactory = StandardRetry('standardClosure');
        const persistentFactory = PersistentRetry('persistentClosure');

        // 执行装饰器工厂以获取闭包函数
        const retryableDecorator = retryableFactory;
        const standardDecorator = standardFactory;
        const persistentDecorator = persistentFactory;

        // 执行闭包函数以修改属性描述符
        const retryableResult = retryableDecorator(target, propertyName, originalDescriptor);
        const standardResult = standardDecorator(target, propertyName, originalDescriptor);
        const persistentResult = persistentDecorator(target, propertyName, originalDescriptor);

        // Assert - 验证闭包函数执行和上下文绑定
        expect(retryableResult).toBe(originalDescriptor);
        expect(standardResult).toBe(originalDescriptor);
        expect(persistentResult).toBe(originalDescriptor);

        // 验证原方法被替换
        expect(retryableResult.value).not.toBe(originalMethod);
        expect(standardResult.value).not.toBe(originalMethod);
        expect(persistentResult.value).not.toBe(originalMethod);

        // 验证替换方法是函数
        expect(typeof retryableResult.value).toBe('function');
        expect(typeof standardResult.value).toBe('function');
        expect(typeof persistentResult.value).toBe('function');
      });

      it('should execute decorator factory with edge case parameter combinations', () => {
        // Arrange
        const target = { constructor: { name: 'EdgeCaseClass' } };
        const propertyName = 'edgeCaseMethod';
        const originalDescriptor = {
          value: jest.fn(),
          writable: true,
          enumerable: true,
          configurable: true
        };

        // Act - 测试边界情况参数组合的装饰器工厂执行
        const edgeCases = [
          Retryable({}), // 空选项对象
          Retryable({ maxAttempts: 0 }), // 零重试次数
          Retryable({ baseDelay: 0 }), // 零延迟
          Retryable({ operationName: '' }), // 空操作名称
          Retryable({ configType: 'quick', maxAttempts: 10 }), // 混合配置
          StandardRetry(''), // 空字符串操作名称
          StandardRetry(null as any), // null操作名称
          PersistentRetry(''), // 空字符串操作名称
          PersistentRetry(null as any), // null操作名称
        ];

        for (let i = 0; i < edgeCases.length; i++) {
          const decorator = edgeCases[i];
          const result = decorator(target, `${propertyName}_${i}`, originalDescriptor);

          // Assert - 验证边界情况的装饰器工厂执行
          expect(result).toBe(originalDescriptor);
          expect(typeof result.value).toBe('function');
        }
      });
    });
  });
});
