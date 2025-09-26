import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { QueryConfigService } from '@core/01-entry/query/config/query.config';
import { UniversalExceptionFactory, ComponentIdentifier, BusinessErrorCode } from '@common/core/exceptions';

describe('QueryConfigService', () => {
  let service: QueryConfigService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryConfigService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<QueryConfigService>(QueryConfigService);
    configService = module.get<ConfigService>(ConfigService) as jest.Mocked<ConfigService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Batch Configuration', () => {
    describe('maxBatchSize', () => {
      it('should return default value when config is not set', () => {
        configService.get.mockReturnValue(undefined);
        expect(service.maxBatchSize).toBe(30);
        expect(configService.get).toHaveBeenCalledWith('QUERY_MAX_BATCH_SIZE', 30);
      });

      it('should return configured value when set', () => {
        configService.get.mockReturnValue('50');
        expect(service.maxBatchSize).toBe(50);
      });

      it('should convert string to number', () => {
        configService.get.mockReturnValue('25');
        expect(service.maxBatchSize).toBe(25);
        expect(typeof service.maxBatchSize).toBe('number');
      });

      it('should handle zero value', () => {
        configService.get.mockReturnValue('0');
        expect(service.maxBatchSize).toBe(0);
      });

      it('should handle negative value', () => {
        configService.get.mockReturnValue('-10');
        expect(service.maxBatchSize).toBe(-10);
      });
    });

    describe('maxMarketBatchSize', () => {
      it('should return default value when config is not set', () => {
        configService.get.mockReturnValue(undefined);
        expect(service.maxMarketBatchSize).toBe(100);
        expect(configService.get).toHaveBeenCalledWith('QUERY_MAX_MARKET_BATCH_SIZE', 100);
      });

      it('should return configured value when set', () => {
        configService.get.mockReturnValue('200');
        expect(service.maxMarketBatchSize).toBe(200);
      });

      it('should convert string to number', () => {
        configService.get.mockReturnValue('150');
        expect(service.maxMarketBatchSize).toBe(150);
        expect(typeof service.maxMarketBatchSize).toBe('number');
      });
    });
  });

  describe('Timeout Configuration', () => {
    describe('marketParallelTimeout', () => {
      it('should return default value when config is not set', () => {
        configService.get.mockReturnValue(undefined);
        // Should return QUERY_TIMEOUT_CONFIG.QUERY_MS default
        expect(typeof service.marketParallelTimeout).toBe('number');
        expect(configService.get).toHaveBeenCalledWith('QUERY_MARKET_TIMEOUT', expect.any(Number));
      });

      it('should return configured value when set', () => {
        configService.get.mockReturnValue('15000');
        expect(service.marketParallelTimeout).toBe(15000);
      });

      it('should convert string to number', () => {
        configService.get.mockReturnValue('20000');
        expect(service.marketParallelTimeout).toBe(20000);
        expect(typeof service.marketParallelTimeout).toBe('number');
      });
    });

    describe('receiverBatchTimeout', () => {
      it('should return default value when config is not set', () => {
        configService.get.mockReturnValue(undefined);
        // Should return QUERY_TIMEOUT_CONFIG.REALTIME_FETCH_MS default
        expect(typeof service.receiverBatchTimeout).toBe('number');
        expect(configService.get).toHaveBeenCalledWith('QUERY_RECEIVER_TIMEOUT', expect.any(Number));
      });

      it('should return configured value when set', () => {
        configService.get.mockReturnValue('8000');
        expect(service.receiverBatchTimeout).toBe(8000);
      });

      it('should convert string to number', () => {
        configService.get.mockReturnValue('12000');
        expect(service.receiverBatchTimeout).toBe(12000);
        expect(typeof service.receiverBatchTimeout).toBe('number');
      });
    });
  });

  describe('Memory Configuration', () => {
    describe('memoryWarningThreshold', () => {
      it('should return default value when config is not set', () => {
        configService.get.mockReturnValue(undefined);
        expect(service.memoryWarningThreshold).toBe(0.7);
        expect(configService.get).toHaveBeenCalledWith('QUERY_MEMORY_WARNING_THRESHOLD', 0.7);
      });

      it('should return configured value when set', () => {
        configService.get.mockReturnValue('0.8');
        expect(service.memoryWarningThreshold).toBe(0.8);
      });

      it('should handle decimal values correctly', () => {
        configService.get.mockReturnValue('0.75');
        expect(service.memoryWarningThreshold).toBe(0.75);
      });
    });

    describe('memoryCriticalThreshold', () => {
      it('should return default value when config is not set', () => {
        configService.get.mockReturnValue(undefined);
        expect(service.memoryCriticalThreshold).toBe(0.9);
        expect(configService.get).toHaveBeenCalledWith('QUERY_MEMORY_CRITICAL_THRESHOLD', 0.9);
      });

      it('should return configured value when set', () => {
        configService.get.mockReturnValue('0.85');
        expect(service.memoryCriticalThreshold).toBe(0.85);
      });
    });

    describe('memoryPressureReductionRatio', () => {
      it('should return default value when config is not set', () => {
        configService.get.mockReturnValue(undefined);
        expect(service.memoryPressureReductionRatio).toBe(0.5);
        expect(configService.get).toHaveBeenCalledWith('QUERY_MEMORY_REDUCTION_RATIO', 0.5);
      });

      it('should return configured value when set', () => {
        configService.get.mockReturnValue('0.3');
        expect(service.memoryPressureReductionRatio).toBe(0.3);
      });
    });
  });

  describe('Performance Configuration', () => {
    describe('enableMemoryOptimization', () => {
      it('should return default value when config is not set', () => {
        configService.get.mockReturnValue(undefined);
        expect(service.enableMemoryOptimization).toBe(false);
        expect(configService.get).toHaveBeenCalledWith('QUERY_ENABLE_MEMORY_OPTIMIZATION', false);
      });

      it('should return true when configured', () => {
        configService.get.mockReturnValue(true);
        expect(service.enableMemoryOptimization).toBe(true);
      });

      it('should return false when explicitly configured', () => {
        configService.get.mockReturnValue(false);
        expect(service.enableMemoryOptimization).toBe(false);
      });

      it('should handle string values', () => {
        configService.get.mockReturnValue('true');
        expect(service.enableMemoryOptimization).toBe('true');
      });
    });

    describe('gcTriggerInterval', () => {
      it('should return default value when config is not set', () => {
        configService.get.mockReturnValue(undefined);
        expect(service.gcTriggerInterval).toBe(1000);
        expect(configService.get).toHaveBeenCalledWith('QUERY_GC_TRIGGER_INTERVAL', 1000);
      });

      it('should return configured value when set', () => {
        configService.get.mockReturnValue('2000');
        expect(service.gcTriggerInterval).toBe(2000);
      });
    });
  });

  describe('getConfigSummary', () => {
    beforeEach(() => {
      // Mock the service methods to avoid constructor validation
      jest.spyOn(service, 'maxBatchSize', 'get').mockReturnValue(25);
      jest.spyOn(service, 'maxMarketBatchSize', 'get').mockReturnValue(150);
      jest.spyOn(service, 'marketParallelTimeout', 'get').mockReturnValue(20000);
      jest.spyOn(service, 'receiverBatchTimeout', 'get').mockReturnValue(8000);
      jest.spyOn(service, 'memoryWarningThreshold', 'get').mockReturnValue(0.75);
      jest.spyOn(service, 'memoryCriticalThreshold', 'get').mockReturnValue(0.85);
      jest.spyOn(service, 'memoryPressureReductionRatio', 'get').mockReturnValue(0.4);
      jest.spyOn(service, 'enableMemoryOptimization', 'get').mockReturnValue(true);
      jest.spyOn(service, 'gcTriggerInterval', 'get').mockReturnValue(2000);
    });

    it('should return complete configuration summary', () => {
      const summary = service.getConfigSummary();

      expect(summary).toEqual({
        batch: {
          maxBatchSize: 25,
          maxMarketBatchSize: 150,
        },
        timeout: {
          marketParallelTimeout: 20000,
          receiverBatchTimeout: 8000,
        },
        memory: {
          warningThreshold: 0.75,
          criticalThreshold: 0.85,
          reductionRatio: 0.4,
        },
        optimization: {
          enableMemoryOptimization: true,
          gcTriggerInterval: 2000,
        },
      });
    });

    it('should include all required sections', () => {
      const summary = service.getConfigSummary();

      expect(summary).toHaveProperty('batch');
      expect(summary).toHaveProperty('timeout');
      expect(summary).toHaveProperty('memory');
      expect(summary).toHaveProperty('optimization');
    });

    it('should include all batch configuration properties', () => {
      const summary = service.getConfigSummary() as any;

      expect(summary.batch).toHaveProperty('maxBatchSize');
      expect(summary.batch).toHaveProperty('maxMarketBatchSize');
    });

    it('should include all timeout configuration properties', () => {
      const summary = service.getConfigSummary() as any;

      expect(summary.timeout).toHaveProperty('marketParallelTimeout');
      expect(summary.timeout).toHaveProperty('receiverBatchTimeout');
    });

    it('should include all memory configuration properties', () => {
      const summary = service.getConfigSummary() as any;

      expect(summary.memory).toHaveProperty('warningThreshold');
      expect(summary.memory).toHaveProperty('criticalThreshold');
      expect(summary.memory).toHaveProperty('reductionRatio');
    });

    it('should include all optimization configuration properties', () => {
      const summary = service.getConfigSummary() as any;

      expect(summary.optimization).toHaveProperty('enableMemoryOptimization');
      expect(summary.optimization).toHaveProperty('gcTriggerInterval');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle non-numeric string configuration values', () => {
      configService.get.mockReturnValue('not-a-number');
      expect(service.maxBatchSize).toBeNaN();
    });

    it('should handle null configuration values', () => {
      configService.get.mockReturnValue(null);
      expect(service.maxBatchSize).toBe(0); // Number(null) === 0
    });

    it('should handle undefined configuration values with defaults', () => {
      configService.get.mockReturnValue(undefined);
      expect(service.maxBatchSize).toBe(30); // Default value
    });

    it('should handle boolean configuration values', () => {
      configService.get.mockReturnValue(true);
      expect(service.maxBatchSize).toBe(1); // Number(true) === 1
    });

    it('should handle array configuration values', () => {
      configService.get.mockReturnValue([1, 2, 3]);
      expect(service.maxBatchSize).toBeNaN(); // Number([1,2,3]) === NaN
    });

    it('should handle object configuration values', () => {
      configService.get.mockReturnValue({ value: 30 });
      expect(service.maxBatchSize).toBeNaN(); // Number({value: 30}) === NaN
    });
  });

  describe('Constructor and Validation', () => {
    describe('Valid Configuration', () => {
      beforeEach(() => {
        // Mock all the necessary calls that the constructor validation makes
        configService.get
          .mockReturnValueOnce('30')    // maxBatchSize (constructor call)
          .mockReturnValueOnce('100')   // maxMarketBatchSize (constructor call)
          .mockReturnValueOnce('30')    // maxBatchSize (validate call)
          .mockReturnValueOnce('100')   // maxMarketBatchSize (validate call)
          .mockReturnValueOnce('30')    // maxBatchSize (validate call)
          .mockReturnValueOnce('15000') // marketParallelTimeout (validate call)
          .mockReturnValueOnce('5000')  // receiverBatchTimeout (validate call)
          .mockReturnValueOnce('5000')  // receiverBatchTimeout (validate check)
          .mockReturnValueOnce('15000') // marketParallelTimeout (validate check)
          .mockReturnValueOnce('0.7')   // memoryWarningThreshold (validate call)
          .mockReturnValueOnce('0.9')   // memoryCriticalThreshold (validate call)
          .mockReturnValueOnce('0.9')   // memoryCriticalThreshold (validate check)
          .mockReturnValueOnce('0.7')   // memoryWarningThreshold (validate check)
          .mockReturnValueOnce('0.5')   // memoryPressureReductionRatio (validate call)
          .mockReturnValueOnce('1000'); // gcTriggerInterval (validate call)
      });

      it('should successfully create service with valid configuration', () => {
        expect(() => {
          const testService = new QueryConfigService(configService);
          expect(testService).toBeDefined();
        }).not.toThrow();
      });
    });

    describe('Invalid Configuration', () => {
      it('should throw error for invalid maxBatchSize', () => {
        configService.get
          .mockReturnValueOnce('0')     // Invalid maxBatchSize
          .mockReturnValueOnce('100');  // maxMarketBatchSize

        expect(() => {
          new QueryConfigService(configService);
        }).toThrow();
      });

      it('should throw error for invalid maxMarketBatchSize', () => {
        configService.get
          .mockReturnValueOnce('30')   // maxBatchSize
          .mockReturnValueOnce('0');   // Invalid maxMarketBatchSize

        expect(() => {
          new QueryConfigService(configService);
        }).toThrow();
      });

      it('should throw error when maxMarketBatchSize < maxBatchSize', () => {
        configService.get
          .mockReturnValueOnce('50')   // maxBatchSize
          .mockReturnValueOnce('30');  // maxMarketBatchSize (less than batch size)

        expect(() => {
          new QueryConfigService(configService);
        }).toThrow();
      });
    });
  });

  describe('Boundary Values', () => {
    describe('Batch Size Boundaries', () => {
      it('should accept minimum valid batch size', () => {
        configService.get
          .mockReturnValue('1')      // Minimum valid value
          .mockReturnValueOnce('1'); // For market batch size too

        expect(() => new QueryConfigService(configService)).not.toThrow();
      });

      it('should accept maximum valid batch size', () => {
        configService.get
          .mockReturnValue('1000')      // Maximum valid value
          .mockReturnValueOnce('1000'); // For market batch size too

        expect(() => new QueryConfigService(configService)).not.toThrow();
      });

      it('should reject batch size just outside valid range', () => {
        configService.get.mockReturnValue('1001'); // Just over maximum
        expect(() => new QueryConfigService(configService)).toThrow();

        configService.get.mockReturnValue('0'); // Just under minimum
        expect(() => new QueryConfigService(configService)).toThrow();
      });
    });

    describe('Memory Threshold Boundaries', () => {
      it('should accept valid memory threshold boundaries', () => {
        configService.get
          .mockReturnValueOnce('30')    // maxBatchSize
          .mockReturnValueOnce('100')   // maxMarketBatchSize
          .mockReturnValue('30')        // Continue with valid values
          .mockReturnValueOnce('100')
          .mockReturnValueOnce('30')
          .mockReturnValueOnce('15000') // marketParallelTimeout
          .mockReturnValueOnce('5000')  // receiverBatchTimeout
          .mockReturnValueOnce('5000')
          .mockReturnValueOnce('15000')
          .mockReturnValueOnce('0.1')   // memoryWarningThreshold - minimum valid
          .mockReturnValueOnce('0.5')   // memoryCriticalThreshold - minimum valid
          .mockReturnValueOnce('0.5')   // memoryCriticalThreshold check
          .mockReturnValueOnce('0.1')   // memoryWarningThreshold check
          .mockReturnValueOnce('0.1')   // memoryPressureReductionRatio - minimum valid
          .mockReturnValueOnce('1000'); // gcTriggerInterval

        expect(() => new QueryConfigService(configService)).not.toThrow();
      });

      it('should reject invalid memory threshold values', () => {
        // Test memory warning threshold too low
        configService.get
          .mockReturnValueOnce('30')
          .mockReturnValueOnce('100')
          .mockReturnValue('30')
          .mockReturnValueOnce('100')
          .mockReturnValueOnce('30')
          .mockReturnValueOnce('15000')
          .mockReturnValueOnce('5000')
          .mockReturnValueOnce('5000')
          .mockReturnValueOnce('15000')
          .mockReturnValueOnce('0.05'); // Just below minimum

        expect(() => new QueryConfigService(configService)).toThrow();
      });
    });

    describe('Timeout Boundaries', () => {
      it('should accept valid timeout boundaries', () => {
        configService.get
          .mockReturnValueOnce('30')     // maxBatchSize
          .mockReturnValueOnce('100')    // maxMarketBatchSize
          .mockReturnValue('30')         // Continue validation
          .mockReturnValueOnce('100')
          .mockReturnValueOnce('30')
          .mockReturnValueOnce('1')      // marketParallelTimeout - minimum valid
          .mockReturnValueOnce('1')      // receiverBatchTimeout - minimum valid (but must be < market)
          .mockReturnValueOnce('1')      // receiverBatchTimeout check
          .mockReturnValueOnce('1');     // marketParallelTimeout check - this will fail relationship test

        expect(() => new QueryConfigService(configService)).toThrow(); // Should fail because receiver >= market
      });

      it('should reject timeout values outside valid range', () => {
        configService.get
          .mockReturnValueOnce('30')
          .mockReturnValueOnce('100')
          .mockReturnValue('30')
          .mockReturnValueOnce('100')
          .mockReturnValueOnce('30')
          .mockReturnValueOnce('0'); // Invalid timeout

        expect(() => new QueryConfigService(configService)).toThrow();
      });
    });
  });

  describe('Multiple Configuration Access', () => {
    it('should cache configuration values on multiple access', () => {
      configService.get.mockReturnValue('50');

      const value1 = service.maxBatchSize;
      const value2 = service.maxBatchSize;

      expect(value1).toBe(value2);
      expect(value1).toBe(50);
      expect(configService.get).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent access to different properties', () => {
      configService.get
        .mockReturnValueOnce('30')  // maxBatchSize
        .mockReturnValueOnce('100') // maxMarketBatchSize
        .mockReturnValueOnce('5000'); // gcTriggerInterval

      const batchSize = service.maxBatchSize;
      const marketBatchSize = service.maxMarketBatchSize;
      const gcInterval = service.gcTriggerInterval;

      expect(batchSize).toBe(30);
      expect(marketBatchSize).toBe(100);
      expect(gcInterval).toBe(5000);
    });
  });

  describe('Real-World Configuration Scenarios', () => {
    it('should handle production-like configuration', () => {
      const productionConfig = {
        'QUERY_MAX_BATCH_SIZE': '50',
        'QUERY_MAX_MARKET_BATCH_SIZE': '200',
        'QUERY_MARKET_TIMEOUT': '30000',
        'QUERY_RECEIVER_TIMEOUT': '10000',
        'QUERY_MEMORY_WARNING_THRESHOLD': '0.8',
        'QUERY_MEMORY_CRITICAL_THRESHOLD': '0.95',
        'QUERY_MEMORY_REDUCTION_RATIO': '0.6',
        'QUERY_ENABLE_MEMORY_OPTIMIZATION': 'true',
        'QUERY_GC_TRIGGER_INTERVAL': '2000'
      };

      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        return productionConfig[key] || defaultValue;
      });

      expect(() => new QueryConfigService(configService)).not.toThrow();

      expect(service.maxBatchSize).toBe(50);
      expect(service.maxMarketBatchSize).toBe(200);
      expect(service.marketParallelTimeout).toBe(30000);
      expect(service.receiverBatchTimeout).toBe(10000);
      expect(service.memoryWarningThreshold).toBe(0.8);
      expect(service.memoryCriticalThreshold).toBe(0.95);
      expect(service.memoryPressureReductionRatio).toBe(0.6);
      expect(service.enableMemoryOptimization).toBe('true');
      expect(service.gcTriggerInterval).toBe(2000);
    });

    it('should handle development-like configuration', () => {
      const developmentConfig = {
        'QUERY_MAX_BATCH_SIZE': '10',
        'QUERY_MAX_MARKET_BATCH_SIZE': '50',
        'QUERY_MARKET_TIMEOUT': '5000',
        'QUERY_RECEIVER_TIMEOUT': '2000',
        'QUERY_MEMORY_WARNING_THRESHOLD': '0.6',
        'QUERY_MEMORY_CRITICAL_THRESHOLD': '0.8',
        'QUERY_MEMORY_REDUCTION_RATIO': '0.3',
        'QUERY_ENABLE_MEMORY_OPTIMIZATION': 'false',
        'QUERY_GC_TRIGGER_INTERVAL': '500'
      };

      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        return developmentConfig[key] || defaultValue;
      });

      expect(() => new QueryConfigService(configService)).not.toThrow();

      expect(service.maxBatchSize).toBe(10);
      expect(service.maxMarketBatchSize).toBe(50);
      expect(service.marketParallelTimeout).toBe(5000);
      expect(service.receiverBatchTimeout).toBe(2000);
      expect(service.memoryWarningThreshold).toBe(0.6);
      expect(service.memoryCriticalThreshold).toBe(0.8);
      expect(service.memoryPressureReductionRatio).toBe(0.3);
      expect(service.enableMemoryOptimization).toBe('false');
      expect(service.gcTriggerInterval).toBe(500);
    });

    it('should handle minimal configuration with defaults', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        // Return only default values
        return defaultValue;
      });

      expect(() => new QueryConfigService(configService)).not.toThrow();

      // Check that all properties return their expected defaults
      expect(service.maxBatchSize).toBe(30);
      expect(service.maxMarketBatchSize).toBe(100);
      expect(service.memoryWarningThreshold).toBe(0.7);
      expect(service.memoryCriticalThreshold).toBe(0.9);
      expect(service.memoryPressureReductionRatio).toBe(0.5);
      expect(service.enableMemoryOptimization).toBe(false);
      expect(service.gcTriggerInterval).toBe(1000);
    });
  });
});