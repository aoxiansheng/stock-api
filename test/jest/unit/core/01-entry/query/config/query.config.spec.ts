import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { QueryConfigService } from '../../../../../../../src/core/01-entry/query/config/query.config';

describe('QueryConfigService', () => {
  let service: QueryConfigService;
  let configService: jest.Mocked<ConfigService>;

  const defaultConfig = {
    QUERY_MAX_BATCH_SIZE: 50,
    QUERY_MAX_MARKET_BATCH_SIZE: 100,
    QUERY_MARKET_TIMEOUT: 30000,
    QUERY_RECEIVER_TIMEOUT: 15000,
    QUERY_MEMORY_WARNING_THRESHOLD: 0.7,
    QUERY_MEMORY_CRITICAL_THRESHOLD: 0.9,
    QUERY_MEMORY_REDUCTION_RATIO: 0.5,
    QUERY_ENABLE_MEMORY_OPTIMIZATION: false,
    QUERY_GC_TRIGGER_INTERVAL: 1000,
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue: any) => {
        return defaultConfig[key] ?? defaultValue;
      }),
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
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration Loading', () => {
    it('应该正确加载所有配置项', () => {
      expect(service.maxBatchSize).toBe(50);
      expect(service.maxMarketBatchSize).toBe(100);
      expect(service.marketParallelTimeout).toBe(30000);
      expect(service.receiverBatchTimeout).toBe(15000);
      expect(service.memoryWarningThreshold).toBe(0.7);
      expect(service.memoryCriticalThreshold).toBe(0.9);
      expect(service.memoryPressureReductionRatio).toBe(0.5);
      expect(service.enableMemoryOptimization).toBe(false);
      expect(service.gcTriggerInterval).toBe(1000);
    });

    it('应该使用默认值当环境变量不存在时', () => {
      expect(configService.get).toHaveBeenCalledWith('QUERY_MAX_BATCH_SIZE', 50);
      expect(configService.get).toHaveBeenCalledWith('QUERY_MAX_MARKET_BATCH_SIZE', 100);
      expect(configService.get).toHaveBeenCalledWith('QUERY_MARKET_TIMEOUT', 30000);
      expect(configService.get).toHaveBeenCalledWith('QUERY_RECEIVER_TIMEOUT', 15000);
      expect(configService.get).toHaveBeenCalledWith('QUERY_MEMORY_WARNING_THRESHOLD', 0.7);
      expect(configService.get).toHaveBeenCalledWith('QUERY_MEMORY_CRITICAL_THRESHOLD', 0.9);
      expect(configService.get).toHaveBeenCalledWith('QUERY_MEMORY_REDUCTION_RATIO', 0.5);
      expect(configService.get).toHaveBeenCalledWith('QUERY_ENABLE_MEMORY_OPTIMIZATION', false);
      expect(configService.get).toHaveBeenCalledWith('QUERY_GC_TRIGGER_INTERVAL', 1000);
    });
  });

  describe('Configuration Validation', () => {
    describe('批量大小验证', () => {
      it('应该通过有效的批量大小配置', () => {
        expect(() => service.validate()).not.toThrow();
      });

      it('应该拒绝无效的MAX_BATCH_SIZE (≤0)', () => {
        configService.get.mockImplementation((key: string, defaultValue: any) => {
          if (key === 'QUERY_MAX_BATCH_SIZE') return 0;
          return defaultConfig[key] ?? defaultValue;
        });

        expect(() => {
          new QueryConfigService(configService);
        }).toThrow('Invalid QUERY_MAX_BATCH_SIZE: 0. Must be between 1 and 1000.');
      });

      it('应该拒绝无效的MAX_BATCH_SIZE (>1000)', () => {
        configService.get.mockImplementation((key: string, defaultValue: any) => {
          if (key === 'QUERY_MAX_BATCH_SIZE') return 1500;
          return defaultConfig[key] ?? defaultValue;
        });

        expect(() => {
          new QueryConfigService(configService);
        }).toThrow('Invalid QUERY_MAX_BATCH_SIZE: 1500. Must be between 1 and 1000.');
      });

      it('应该拒绝无效的MAX_MARKET_BATCH_SIZE (≤0)', () => {
        configService.get.mockImplementation((key: string, defaultValue: any) => {
          if (key === 'QUERY_MAX_MARKET_BATCH_SIZE') return -10;
          return defaultConfig[key] ?? defaultValue;
        });

        expect(() => {
          new QueryConfigService(configService);
        }).toThrow('Invalid QUERY_MAX_MARKET_BATCH_SIZE: -10. Must be between 1 and 2000.');
      });

      it('应该拒绝MAX_MARKET_BATCH_SIZE < MAX_BATCH_SIZE', () => {
        configService.get.mockImplementation((key: string, defaultValue: any) => {
          if (key === 'QUERY_MAX_BATCH_SIZE') return 100;
          if (key === 'QUERY_MAX_MARKET_BATCH_SIZE') return 50;
          return defaultConfig[key] ?? defaultValue;
        });

        expect(() => {
          new QueryConfigService(configService);
        }).toThrow('Invalid configuration: maxMarketBatchSize (50) must be >= maxBatchSize (100).');
      });
    });

    describe('超时时间验证', () => {
      it('应该拒绝无效的MARKET_TIMEOUT (≤0)', () => {
        configService.get.mockImplementation((key: string, defaultValue: any) => {
          if (key === 'QUERY_MARKET_TIMEOUT') return -1000;
          return defaultConfig[key] ?? defaultValue;
        });

        expect(() => {
          new QueryConfigService(configService);
        }).toThrow('Invalid QUERY_MARKET_TIMEOUT: -1000. Must be between 1 and 300000ms (5 minutes).');
      });

      it('应该拒绝无效的MARKET_TIMEOUT (>300000)', () => {
        configService.get.mockImplementation((key: string, defaultValue: any) => {
          if (key === 'QUERY_MARKET_TIMEOUT') return 400000;
          return defaultConfig[key] ?? defaultValue;
        });

        expect(() => {
          new QueryConfigService(configService);
        }).toThrow('Invalid QUERY_MARKET_TIMEOUT: 400000. Must be between 1 and 300000ms (5 minutes).');
      });

      it('应该拒绝RECEIVER_TIMEOUT >= MARKET_TIMEOUT', () => {
        configService.get.mockImplementation((key: string, defaultValue: any) => {
          if (key === 'QUERY_MARKET_TIMEOUT') return 15000;
          if (key === 'QUERY_RECEIVER_TIMEOUT') return 15000;
          return defaultConfig[key] ?? defaultValue;
        });

        expect(() => {
          new QueryConfigService(configService);
        }).toThrow('Invalid configuration: receiverBatchTimeout (15000) must be < marketParallelTimeout (15000).');
      });
    });

    describe('内存阈值验证', () => {
      it('应该拒绝无效的MEMORY_WARNING_THRESHOLD (<0.1)', () => {
        configService.get.mockImplementation((key: string, defaultValue: any) => {
          if (key === 'QUERY_MEMORY_WARNING_THRESHOLD') return 0.05;
          return defaultConfig[key] ?? defaultValue;
        });

        expect(() => {
          new QueryConfigService(configService);
        }).toThrow('Invalid QUERY_MEMORY_WARNING_THRESHOLD: 0.05. Must be between 0.1 and 0.95.');
      });

      it('应该拒绝无效的MEMORY_CRITICAL_THRESHOLD (>0.99)', () => {
        configService.get.mockImplementation((key: string, defaultValue: any) => {
          if (key === 'QUERY_MEMORY_CRITICAL_THRESHOLD') return 1.1;
          return defaultConfig[key] ?? defaultValue;
        });

        expect(() => {
          new QueryConfigService(configService);
        }).toThrow('Invalid QUERY_MEMORY_CRITICAL_THRESHOLD: 1.1. Must be between 0.5 and 0.99.');
      });

      it('应该拒绝CRITICAL_THRESHOLD <= WARNING_THRESHOLD', () => {
        configService.get.mockImplementation((key: string, defaultValue: any) => {
          if (key === 'QUERY_MEMORY_WARNING_THRESHOLD') return 0.8;
          if (key === 'QUERY_MEMORY_CRITICAL_THRESHOLD') return 0.8;
          return defaultConfig[key] ?? defaultValue;
        });

        expect(() => {
          new QueryConfigService(configService);
        }).toThrow('Invalid configuration: memoryCriticalThreshold (0.8) must be > memoryWarningThreshold (0.8).');
      });

      it('应该拒绝无效的MEMORY_REDUCTION_RATIO', () => {
        configService.get.mockImplementation((key: string, defaultValue: any) => {
          if (key === 'QUERY_MEMORY_REDUCTION_RATIO') return 1.5;
          return defaultConfig[key] ?? defaultValue;
        });

        expect(() => {
          new QueryConfigService(configService);
        }).toThrow('Invalid QUERY_MEMORY_REDUCTION_RATIO: 1.5. Must be between 0.1 and 1.0.');
      });
    });

    describe('性能调优参数验证', () => {
      it('应该拒绝无效的GC_TRIGGER_INTERVAL (≤0)', () => {
        configService.get.mockImplementation((key: string, defaultValue: any) => {
          if (key === 'QUERY_GC_TRIGGER_INTERVAL') return 0;
          return defaultConfig[key] ?? defaultValue;
        });

        expect(() => {
          new QueryConfigService(configService);
        }).toThrow('Invalid QUERY_GC_TRIGGER_INTERVAL: 0. Must be between 1 and 10000.');
      });

      it('应该拒绝无效的GC_TRIGGER_INTERVAL (>10000)', () => {
        configService.get.mockImplementation((key: string, defaultValue: any) => {
          if (key === 'QUERY_GC_TRIGGER_INTERVAL') return 15000;
          return defaultConfig[key] ?? defaultValue;
        });

        expect(() => {
          new QueryConfigService(configService);
        }).toThrow('Invalid QUERY_GC_TRIGGER_INTERVAL: 15000. Must be between 1 and 10000.');
      });
    });
  });

  describe('getConfigSummary()', () => {
    it('应该返回完整的配置摘要', () => {
      const summary = service.getConfigSummary();

      expect(summary).toEqual({
        batch: {
          maxBatchSize: 50,
          maxMarketBatchSize: 100,
        },
        timeout: {
          marketParallelTimeout: 30000,
          receiverBatchTimeout: 15000,
        },
        memory: {
          warningThreshold: 0.7,
          criticalThreshold: 0.9,
          reductionRatio: 0.5,
        },
        optimization: {
          enableMemoryOptimization: false,
          gcTriggerInterval: 1000,
        },
      });
    });

    it('应该反映实际的配置值', () => {
      configService.get.mockImplementation((key: string, defaultValue: any) => {
        const customConfig = {
          QUERY_MAX_BATCH_SIZE: 75,
          QUERY_MAX_MARKET_BATCH_SIZE: 150,
          QUERY_MEMORY_WARNING_THRESHOLD: 0.8,
          QUERY_MEMORY_CRITICAL_THRESHOLD: 0.95,
        };
        return customConfig[key] ?? defaultConfig[key] ?? defaultValue;
      });

      const customService = new QueryConfigService(configService);
      const summary = customService.getConfigSummary() as any;

      expect(summary.batch.maxBatchSize).toBe(75);
      expect(summary.batch.maxMarketBatchSize).toBe(150);
      expect(summary.memory.warningThreshold).toBe(0.8);
      expect(summary.memory.criticalThreshold).toBe(0.95);
    });
  });

  describe('边界值测试', () => {
    it('应该接受最小有效值', () => {
      configService.get.mockImplementation((key: string, defaultValue: any) => {
        const minValidConfig = {
          QUERY_MAX_BATCH_SIZE: 1,
          QUERY_MAX_MARKET_BATCH_SIZE: 1,
          QUERY_MARKET_TIMEOUT: 1,
          QUERY_RECEIVER_TIMEOUT: 1, // 会因为 < marketTimeout 而失败，但这里先测试单独参数
          QUERY_MEMORY_WARNING_THRESHOLD: 0.1,
          QUERY_MEMORY_CRITICAL_THRESHOLD: 0.5,
          QUERY_MEMORY_REDUCTION_RATIO: 0.1,
          QUERY_GC_TRIGGER_INTERVAL: 1,
        };
        return minValidConfig[key] ?? defaultValue;
      });

      // 需要调整一下使得 receiverTimeout < marketTimeout
      configService.get.mockImplementation((key: string, defaultValue: any) => {
        const minValidConfig = {
          QUERY_MAX_BATCH_SIZE: 1,
          QUERY_MAX_MARKET_BATCH_SIZE: 1,
          QUERY_MARKET_TIMEOUT: 2,
          QUERY_RECEIVER_TIMEOUT: 1,
          QUERY_MEMORY_WARNING_THRESHOLD: 0.1,
          QUERY_MEMORY_CRITICAL_THRESHOLD: 0.5,
          QUERY_MEMORY_REDUCTION_RATIO: 0.1,
          QUERY_GC_TRIGGER_INTERVAL: 1,
        };
        return minValidConfig[key] ?? defaultValue;
      });

      expect(() => {
        new QueryConfigService(configService);
      }).not.toThrow();
    });

    it('应该接受最大有效值', () => {
      configService.get.mockImplementation((key: string, defaultValue: any) => {
        const maxValidConfig = {
          QUERY_MAX_BATCH_SIZE: 1000,
          QUERY_MAX_MARKET_BATCH_SIZE: 2000,
          QUERY_MARKET_TIMEOUT: 300000,
          QUERY_RECEIVER_TIMEOUT: 120000,
          QUERY_MEMORY_WARNING_THRESHOLD: 0.95,
          QUERY_MEMORY_CRITICAL_THRESHOLD: 0.99,
          QUERY_MEMORY_REDUCTION_RATIO: 1.0,
          QUERY_GC_TRIGGER_INTERVAL: 10000,
        };
        return maxValidConfig[key] ?? defaultValue;
      });

      expect(() => {
        new QueryConfigService(configService);
      }).not.toThrow();
    });
  });
});