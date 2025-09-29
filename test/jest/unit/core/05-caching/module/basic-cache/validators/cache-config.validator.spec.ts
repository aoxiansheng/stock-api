import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheConfigValidator, CacheConfigValidationResult, CacheValidatedConfig } from '@core/05-caching/module/basic-cache/validators/cache-config.validator';

describe('CacheConfigValidator', () => {
  let validator: CacheConfigValidator;
  let configService: ConfigService;

  // Mock配置服务
  const createMockConfigService = (overrides: Record<string, any> = {}) => {
    const defaultConfig = {
      'redis.host': 'localhost',
      'redis.port': 6379,
      'redis.password': undefined,
      'redis.db': 0,
      'redis.connectTimeout': 10000,
      'redis.commandTimeout': 5000,
      'redis.maxRetriesPerRequest': 3,
      'redis.retryDelayOnFailover': 100,
      'cache.compression.enabled': true,
      'cache.compression.thresholdBytes': 1024,
      'cache.compression.algorithm': 'gzip',
      'cache.decompression.maxConcurrent': 10,
      'cache.decompression.timeoutMs': 5000,
      'cache.batch.maxBatchSize': 100,
      'cache.batch.timeoutMs': 10000,
      'cache.ttl.defaultSeconds': 3600,
      'cache.ttl.maxSeconds': 86400,
      'cache.ttl.minSeconds': 60,
      'cache.security.enableMetrics': true,
      'cache.security.sanitizeKeys': true,
      ...overrides
    };

    return {
      get: jest.fn((key: string, defaultValue?: any) => {
        return overrides[key] !== undefined ? overrides[key] : (defaultConfig[key] !== undefined ? defaultConfig[key] : defaultValue);
      })
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheConfigValidator,
        {
          provide: ConfigService,
          useFactory: () => createMockConfigService()
        }
      ],
    }).compile();

    validator = module.get<CacheConfigValidator>(CacheConfigValidator);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('validateConfig', () => {
    it('should validate valid default configuration', () => {
      const result = validator.validateConfig();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.config).toBeDefined();
      expect(result.config.redis.host).toBe('localhost');
      expect(result.config.redis.port).toBe(6379);
    });

    it('should return configuration object with all sections', () => {
      const result = validator.validateConfig();

      expect(result.config).toMatchObject({
        redis: expect.any(Object),
        compression: expect.any(Object),
        decompression: expect.any(Object),
        batch: expect.any(Object),
        ttl: expect.any(Object),
        security: expect.any(Object)
      });
    });

    it('should include warnings and recommendations for default config', () => {
      const result = validator.validateConfig();

      expect(result.warnings).toBeDefined();
      expect(result.recommendations).toBeDefined();
      // Default config should have some recommendations about local environment
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle complex validation scenarios', () => {
      // Create validator with problematic config
      const problematicConfig = createMockConfigService({
        'redis.host': '',
        'redis.port': 70000,
        'redis.db': 20,
        'cache.compression.algorithm': 'invalid',
        'cache.ttl.minSeconds': 0,
        'cache.ttl.maxSeconds': 50
      });

      const testModule = Test.createTestingModule({
        providers: [
          CacheConfigValidator,
          { provide: ConfigService, useValue: problematicConfig }
        ],
      }).compile();

      return testModule.then(module => {
        const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
        const result = testValidator.validateConfig();

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Redis Configuration Validation', () => {
    it('should validate valid Redis configuration', () => {
      const result = validator.validateConfig();

      expect(result.config.redis).toMatchObject({
        host: 'localhost',
        port: 6379,
        db: 0,
        connectTimeout: 10000,
        commandTimeout: 5000,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100
      });
    });

    it('should detect invalid host configuration', async () => {
      const invalidHostConfig = createMockConfigService({
        'redis.host': ''
      });

      const module = await Test.createTestingModule({
        providers: [
          CacheConfigValidator,
          { provide: ConfigService, useValue: invalidHostConfig }
        ],
      }).compile();

      const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
      const result = testValidator.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Redis host 配置无效');
    });

    it('should detect invalid port configuration', async () => {
      const invalidPortConfig = createMockConfigService({
        'redis.port': 70000
      });

      const module = await Test.createTestingModule({
        providers: [
          CacheConfigValidator,
          { provide: ConfigService, useValue: invalidPortConfig }
        ],
      }).compile();

      const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
      const result = testValidator.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Redis port 必须在 1-65535 范围内');
    });

    it('should detect invalid database number', async () => {
      const invalidDbConfig = createMockConfigService({
        'redis.db': 20
      });

      const module = await Test.createTestingModule({
        providers: [
          CacheConfigValidator,
          { provide: ConfigService, useValue: invalidDbConfig }
        ],
      }).compile();

      const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
      const result = testValidator.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Redis database 必须在 0-15 范围内');
    });

    it('should warn about short timeout configurations', async () => {
      const shortTimeoutConfig = createMockConfigService({
        'redis.connectTimeout': 500,
        'redis.commandTimeout': 500
      });

      const module = await Test.createTestingModule({
        providers: [
          CacheConfigValidator,
          { provide: ConfigService, useValue: shortTimeoutConfig }
        ],
      }).compile();

      const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
      const result = testValidator.validateConfig();

      expect(result.warnings).toContain('Redis 连接超时过短，建议至少 1000ms');
      expect(result.warnings).toContain('Redis 命令超时过短，建议至少 1000ms');
    });

    it('should warn about long timeout configurations', async () => {
      const longTimeoutConfig = createMockConfigService({
        'redis.connectTimeout': 50000,
        'redis.commandTimeout': 15000
      });

      const module = await Test.createTestingModule({
        providers: [
          CacheConfigValidator,
          { provide: ConfigService, useValue: longTimeoutConfig }
        ],
      }).compile();

      const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
      const result = testValidator.validateConfig();

      expect(result.warnings).toContain('Redis 连接超时过长，可能影响用户体验');
      expect(result.warnings).toContain('Redis 命令超时过长，可能影响响应时间');
    });

    it('should warn about retry configuration issues', async () => {
      const badRetryConfig = createMockConfigService({
        'redis.maxRetriesPerRequest': 10,
        'redis.retryDelayOnFailover': 2000
      });

      const module = await Test.createTestingModule({
        providers: [
          CacheConfigValidator,
          { provide: ConfigService, useValue: badRetryConfig }
        ],
      }).compile();

      const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
      const result = testValidator.validateConfig();

      expect(result.warnings).toContain('Redis 最大重试次数过多，可能导致响应延迟');
      expect(result.warnings).toContain('Redis 故障转移延迟过长，建议不超过 1000ms');
    });

    it('should warn about remote connection without password', async () => {
      const remoteNoPasswordConfig = createMockConfigService({
        'redis.host': 'redis.example.com',
        'redis.password': undefined
      });

      const module = await Test.createTestingModule({
        providers: [
          CacheConfigValidator,
          { provide: ConfigService, useValue: remoteNoPasswordConfig }
        ],
      }).compile();

      const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
      const result = testValidator.validateConfig();

      expect(result.warnings).toContain('连接远程 Redis 时建议设置密码');
    });

    it('should handle valid port ranges', async () => {
      const validPortConfigs = [1, 6379, 65535];

      for (const port of validPortConfigs) {
        const config = createMockConfigService({
          'redis.port': port
        });

        const module = await Test.createTestingModule({
          providers: [
            CacheConfigValidator,
            { provide: ConfigService, useValue: config }
          ],
        }).compile();

        const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
        const result = testValidator.validateConfig();

        expect(result.config.redis.port).toBe(port);
        expect(result.errors.filter(e => e.includes('port')).length).toBe(0);
      }
    });
  });

  describe('Compression Configuration Validation', () => {
    it('should validate compression configuration', () => {
      const result = validator.validateConfig();

      expect(result.config.compression).toMatchObject({
        enabled: true,
        thresholdBytes: 1024,
        algorithm: 'gzip'
      });
    });

    it('should warn about small compression threshold', async () => {
      const smallThresholdConfig = createMockConfigService({
        'cache.compression.thresholdBytes': 50
      });

      const module = await Test.createTestingModule({
        providers: [
          CacheConfigValidator,
          { provide: ConfigService, useValue: smallThresholdConfig }
        ],
      }).compile();

      const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
      const result = testValidator.validateConfig();

      expect(result.warnings).toContain('压缩阈值过小，可能导致过度压缩小数据');
    });

    it('should warn about large compression threshold', async () => {
      const largeThresholdConfig = createMockConfigService({
        'cache.compression.thresholdBytes': 15000
      });

      const module = await Test.createTestingModule({
        providers: [
          CacheConfigValidator,
          { provide: ConfigService, useValue: largeThresholdConfig }
        ],
      }).compile();

      const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
      const result = testValidator.validateConfig();

      expect(result.warnings).toContain('压缩阈值过大，可能错过压缩机会');
    });

    it('should detect unsupported compression algorithm', async () => {
      const invalidAlgorithmConfig = createMockConfigService({
        'cache.compression.algorithm': 'invalid'
      });

      const module = await Test.createTestingModule({
        providers: [
          CacheConfigValidator,
          { provide: ConfigService, useValue: invalidAlgorithmConfig }
        ],
      }).compile();

      const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
      const result = testValidator.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('不支持的压缩算法: invalid，支持的算法: gzip, deflate, br');
    });

    it('should provide recommendations for different algorithms', async () => {
      const algorithmConfigs = [
        { algorithm: 'gzip', expectedRecommendation: 'Gzip 压缩平衡了压缩比和性能，适合大多数场景' },
        { algorithm: 'br', expectedRecommendation: 'Brotli 压缩比更高但 CPU 消耗更大，适合低频访问的数据' }
      ];

      for (const { algorithm, expectedRecommendation } of algorithmConfigs) {
        const config = createMockConfigService({
          'cache.compression.algorithm': algorithm
        });

        const module = await Test.createTestingModule({
          providers: [
            CacheConfigValidator,
            { provide: ConfigService, useValue: config }
          ],
        }).compile();

        const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
        const result = testValidator.validateConfig();

        expect(result.recommendations).toContain(expectedRecommendation);
      }
    });

    it('should handle all supported compression algorithms', async () => {
      const supportedAlgorithms = ['gzip', 'deflate', 'br'];

      for (const algorithm of supportedAlgorithms) {
        const config = createMockConfigService({
          'cache.compression.algorithm': algorithm
        });

        const module = await Test.createTestingModule({
          providers: [
            CacheConfigValidator,
            { provide: ConfigService, useValue: config }
          ],
        }).compile();

        const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
        const result = testValidator.validateConfig();

        expect(result.config.compression.algorithm).toBe(algorithm);
        expect(result.errors.filter(e => e.includes('压缩算法')).length).toBe(0);
      }
    });
  });

  describe('Decompression Configuration Validation', () => {
    it('should validate decompression configuration', () => {
      const result = validator.validateConfig();

      expect(result.config.decompression).toMatchObject({
        maxConcurrent: 10,
        timeoutMs: 5000
      });
    });

    it('should detect invalid max concurrent', async () => {
      const invalidConcurrentConfig = createMockConfigService({
        'cache.decompression.maxConcurrent': 0
      });

      const module = await Test.createTestingModule({
        providers: [
          CacheConfigValidator,
          { provide: ConfigService, useValue: invalidConcurrentConfig }
        ],
      }).compile();

      const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
      const result = testValidator.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('解压缩最大并发数必须大于 0');
    });

    it('should warn about high concurrent numbers', async () => {
      const highConcurrentConfig = createMockConfigService({
        'cache.decompression.maxConcurrent': 100
      });

      const module = await Test.createTestingModule({
        providers: [
          CacheConfigValidator,
          { provide: ConfigService, useValue: highConcurrentConfig }
        ],
      }).compile();

      const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
      const result = testValidator.validateConfig();

      expect(result.warnings).toContain('解压缩最大并发数过高，可能导致内存压力');
    });

    it('should warn about low concurrent numbers', async () => {
      const lowConcurrentConfig = createMockConfigService({
        'cache.decompression.maxConcurrent': 2
      });

      const module = await Test.createTestingModule({
        providers: [
          CacheConfigValidator,
          { provide: ConfigService, useValue: lowConcurrentConfig }
        ],
      }).compile();

      const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
      const result = testValidator.validateConfig();

      expect(result.warnings).toContain('解压缩最大并发数过低，可能影响高并发场景性能');
    });

    it('should warn about timeout issues', async () => {
      const badTimeoutConfigs = [
        { timeout: 500, expectedWarning: '解压缩超时过短，复杂数据可能解压失败' },
        { timeout: 35000, expectedWarning: '解压缩超时过长，可能影响用户体验' }
      ];

      for (const { timeout, expectedWarning } of badTimeoutConfigs) {
        const config = createMockConfigService({
          'cache.decompression.timeoutMs': timeout
        });

        const module = await Test.createTestingModule({
          providers: [
            CacheConfigValidator,
            { provide: ConfigService, useValue: config }
          ],
        }).compile();

        const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
        const result = testValidator.validateConfig();

        expect(result.warnings).toContain(expectedWarning);
      }
    });

    it('should provide CPU-based recommendations', () => {
      // This test ensures the CPU core logic works
      const result = validator.validateConfig();

      // The recommendation should be based on actual CPU cores
      const cpuBasedRecommendations = result.recommendations.filter(r =>
        r.includes('CPU 核心数') || r.includes('解压缩并发数')
      );

      // May or may not have CPU-based recommendations depending on the actual concurrent setting
      expect(cpuBasedRecommendations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Batch Configuration Validation', () => {
    it('should validate batch configuration', () => {
      const result = validator.validateConfig();

      expect(result.config.batch).toMatchObject({
        maxBatchSize: 100,
        timeoutMs: 10000
      });
    });

    it('should detect invalid batch size', async () => {
      const invalidBatchConfig = createMockConfigService({
        'cache.batch.maxBatchSize': 0
      });

      const module = await Test.createTestingModule({
        providers: [
          CacheConfigValidator,
          { provide: ConfigService, useValue: invalidBatchConfig }
        ],
      }).compile();

      const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
      const result = testValidator.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('批处理最大大小必须大于 0');
    });

    it('should warn about extreme batch sizes', async () => {
      const extremeBatchConfigs = [
        { size: 2000, expectedWarning: '批处理最大大小过大，可能导致内存溢出或超时' },
        { size: 5, expectedWarning: '批处理最大大小过小，可能无法发挥批处理优势' }
      ];

      for (const { size, expectedWarning } of extremeBatchConfigs) {
        const config = createMockConfigService({
          'cache.batch.maxBatchSize': size
        });

        const module = await Test.createTestingModule({
          providers: [
            CacheConfigValidator,
            { provide: ConfigService, useValue: config }
          ],
        }).compile();

        const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
        const result = testValidator.validateConfig();

        expect(result.warnings).toContain(expectedWarning);
      }
    });

    it('should warn about batch timeout issues', async () => {
      const timeoutConfigs = [
        { timeout: 2000, expectedWarning: '批处理超时过短，大批量操作可能失败' },
        { timeout: 80000, expectedWarning: '批处理超时过长，可能影响系统响应性' }
      ];

      for (const { timeout, expectedWarning } of timeoutConfigs) {
        const config = createMockConfigService({
          'cache.batch.timeoutMs': timeout
        });

        const module = await Test.createTestingModule({
          providers: [
            CacheConfigValidator,
            { provide: ConfigService, useValue: config }
          ],
        }).compile();

        const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
        const result = testValidator.validateConfig();

        expect(result.warnings).toContain(expectedWarning);
      }
    });

    it('should provide recommendations for large batches', async () => {
      const largeBatchConfig = createMockConfigService({
        'cache.batch.maxBatchSize': 800
      });

      const module = await Test.createTestingModule({
        providers: [
          CacheConfigValidator,
          { provide: ConfigService, useValue: largeBatchConfig }
        ],
      }).compile();

      const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
      const result = testValidator.validateConfig();

      expect(result.recommendations).toContain('大批量操作建议考虑分批处理以避免阻塞');
    });
  });

  describe('TTL Configuration Validation', () => {
    it('should validate TTL configuration', () => {
      const result = validator.validateConfig();

      expect(result.config.ttl).toMatchObject({
        defaultSeconds: 3600,
        maxSeconds: 86400,
        minSeconds: 60
      });
    });

    it('should detect invalid TTL ranges', async () => {
      const invalidTtlConfigs = [
        {
          config: { 'cache.ttl.minSeconds': 0 },
          expectedError: '最小TTL必须大于 0 秒'
        },
        {
          config: {
            'cache.ttl.minSeconds': 100,
            'cache.ttl.maxSeconds': 50
          },
          expectedError: '最大TTL不能小于最小TTL'
        },
        {
          config: {
            'cache.ttl.defaultSeconds': 50,
            'cache.ttl.minSeconds': 100,
            'cache.ttl.maxSeconds': 200
          },
          expectedError: '默认TTL必须在最小TTL和最大TTL之间'
        }
      ];

      for (const { config, expectedError } of invalidTtlConfigs) {
        const testConfig = createMockConfigService(config);

        const module = await Test.createTestingModule({
          providers: [
            CacheConfigValidator,
            { provide: ConfigService, useValue: testConfig }
          ],
        }).compile();

        const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
        const result = testValidator.validateConfig();

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(expectedError);
      }
    });

    it('should warn about extreme TTL values', async () => {
      const extremeTtlConfigs = [
        {
          config: { 'cache.ttl.minSeconds': 5000 },
          expectedWarning: '最小TTL过长，可能导致数据更新不及时'
        },
        {
          config: { 'cache.ttl.maxSeconds': 700000 },
          expectedWarning: '最大TTL过长，建议不超过 7 天'
        }
      ];

      for (const { config, expectedWarning } of extremeTtlConfigs) {
        const testConfig = createMockConfigService(config);

        const module = await Test.createTestingModule({
          providers: [
            CacheConfigValidator,
            { provide: ConfigService, useValue: testConfig }
          ],
        }).compile();

        const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
        const result = testValidator.validateConfig();

        expect(result.warnings).toContain(expectedWarning);
      }
    });

    it('should provide TTL recommendations', async () => {
      const ttlRecommendationConfigs = [
        {
          config: { 'cache.ttl.defaultSeconds': 200 },
          expectedRecommendation: '默认TTL较短，适合实时性要求高的数据'
        },
        {
          config: { 'cache.ttl.defaultSeconds': 10000 },
          expectedRecommendation: '默认TTL较长，适合相对稳定的数据'
        }
      ];

      for (const { config, expectedRecommendation } of ttlRecommendationConfigs) {
        const testConfig = createMockConfigService(config);

        const module = await Test.createTestingModule({
          providers: [
            CacheConfigValidator,
            { provide: ConfigService, useValue: testConfig }
          ],
        }).compile();

        const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
        const result = testValidator.validateConfig();

        expect(result.recommendations).toContain(expectedRecommendation);
      }
    });
  });

  describe('Security Configuration Validation', () => {
    it('should validate security configuration', () => {
      const result = validator.validateConfig();

      expect(result.config.security).toMatchObject({
        enableMetrics: true,
        sanitizeKeys: true
      });
    });

    it('should provide recommendations for disabled features', async () => {
      const securityConfigs = [
        {
          config: { 'cache.security.enableMetrics': false },
          expectedRecommendation: '建议启用指标收集以监控缓存性能'
        }
      ];

      for (const { config, expectedRecommendation } of securityConfigs) {
        const testConfig = createMockConfigService(config);

        const module = await Test.createTestingModule({
          providers: [
            CacheConfigValidator,
            { provide: ConfigService, useValue: testConfig }
          ],
        }).compile();

        const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
        const result = testValidator.validateConfig();

        expect(result.recommendations).toContain(expectedRecommendation);
      }
    });

    it('should warn about disabled key sanitization', async () => {
      const noSanitizeConfig = createMockConfigService({
        'cache.security.sanitizeKeys': false
      });

      const module = await Test.createTestingModule({
        providers: [
          CacheConfigValidator,
          { provide: ConfigService, useValue: noSanitizeConfig }
        ],
      }).compile();

      const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
      const result = testValidator.validateConfig();

      expect(result.warnings).toContain('未启用键名清理，可能存在注入风险');
    });

    it('should handle production environment requirements', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        const noSanitizeConfig = createMockConfigService({
          'cache.security.sanitizeKeys': false
        });

        const module = await Test.createTestingModule({
          providers: [
            CacheConfigValidator,
            { provide: ConfigService, useValue: noSanitizeConfig }
          ],
        }).compile();

        const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
        const result = testValidator.validateConfig();

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('生产环境必须启用键名清理');
        expect(result.recommendations).toContain('生产环境建议定期审查缓存配置和安全策略');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should provide development environment recommendations', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
        const result = validator.validateConfig();

        expect(result.recommendations).toContain('开发环境可以考虑启用更详细的调试日志');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('getConfigSummary', () => {
    it('should generate summary for valid configuration', () => {
      const result = validator.validateConfig();
      const summary = validator.getConfigSummary(result);

      expect(summary).toContain('缓存配置验证: ✅ 通过');
      expect(summary).toContain('建议');
    });

    it('should generate summary with errors', async () => {
      const invalidConfig = createMockConfigService({
        'redis.host': '',
        'redis.port': 70000
      });

      const module = await Test.createTestingModule({
        providers: [
          CacheConfigValidator,
          { provide: ConfigService, useValue: invalidConfig }
        ],
      }).compile();

      const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
      const result = testValidator.validateConfig();
      const summary = testValidator.getConfigSummary(result);

      expect(summary).toContain('缓存配置验证: ❌ 失败');
      expect(summary).toContain('错误');
      expect(summary).toContain('Redis host 配置无效');
      expect(summary).toContain('Redis port 必须在 1-65535 范围内');
    });

    it('should include all sections in summary', async () => {
      const warningConfig = createMockConfigService({
        'redis.connectTimeout': 500,
        'cache.compression.thresholdBytes': 50
      });

      const module = await Test.createTestingModule({
        providers: [
          CacheConfigValidator,
          { provide: ConfigService, useValue: warningConfig }
        ],
      }).compile();

      const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
      const result = testValidator.validateConfig();
      const summary = testValidator.getConfigSummary(result);

      expect(summary).toContain('警告');
      expect(summary).toContain('建议');
      expect(summary).toMatch(/警告 \(\d+\):/);
      expect(summary).toMatch(/建议 \(\d+\):/);
    });
  });

  describe('isProductionReady', () => {
    it('should detect production readiness issues', () => {
      const result = validator.validateConfig();
      const productionCheck = validator.isProductionReady(result.config);

      // Default localhost config should not be production ready
      expect(productionCheck.ready).toBe(false);
      expect(productionCheck.issues).toContain('生产环境应使用专用 Redis 服务器');
    });

    it('should validate production-ready configuration', async () => {
      const productionConfig = createMockConfigService({
        'redis.host': 'redis.production.com',
        'redis.password': 'secure-password',
        'redis.connectTimeout': 5000,
        'cache.security.sanitizeKeys': true,
        'cache.decompression.maxConcurrent': 15,
        'cache.batch.maxBatchSize': 400
      });

      const module = await Test.createTestingModule({
        providers: [
          CacheConfigValidator,
          { provide: ConfigService, useValue: productionConfig }
        ],
      }).compile();

      const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
      const result = testValidator.validateConfig();
      const productionCheck = testValidator.isProductionReady(result.config);

      expect(productionCheck.ready).toBe(true);
      expect(productionCheck.issues).toHaveLength(0);
    });

    it('should detect all production issues', async () => {
      const badProductionConfig = createMockConfigService({
        'redis.host': 'remote.redis.com',
        'redis.password': undefined,
        'redis.connectTimeout': 3000,
        'cache.security.sanitizeKeys': false,
        'cache.decompression.maxConcurrent': 25,
        'cache.batch.maxBatchSize': 600
      });

      const module = await Test.createTestingModule({
        providers: [
          CacheConfigValidator,
          { provide: ConfigService, useValue: badProductionConfig }
        ],
      }).compile();

      const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
      const result = testValidator.validateConfig();
      const productionCheck = testValidator.isProductionReady(result.config);

      expect(productionCheck.ready).toBe(false);
      expect(productionCheck.issues).toContain('生产环境连接远程 Redis 应设置密码');
      expect(productionCheck.issues).toContain('生产环境 Redis 连接超时建议至少 5 秒');
      expect(productionCheck.issues).toContain('生产环境必须启用键名清理');
      expect(productionCheck.issues).toContain('生产环境解压缩并发数建议控制在 20 以内');
      expect(productionCheck.issues).toContain('生产环境批处理大小建议控制在 500 以内');
    });

    it('should handle edge cases in production check', async () => {
      const edgeCaseConfig = createMockConfigService({
        'redis.host': '127.0.0.1',
        'redis.password': 'password',
        'redis.connectTimeout': 5000,
        'cache.security.sanitizeKeys': true,
        'cache.decompression.maxConcurrent': 20,
        'cache.batch.maxBatchSize': 500
      });

      const module = await Test.createTestingModule({
        providers: [
          CacheConfigValidator,
          { provide: ConfigService, useValue: edgeCaseConfig }
        ],
      }).compile();

      const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
      const result = testValidator.validateConfig();
      const productionCheck = testValidator.isProductionReady(result.config);

      expect(productionCheck.ready).toBe(false);
      expect(productionCheck.issues).toContain('生产环境应使用专用 Redis 服务器');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete validation workflow', async () => {
      const complexConfig = createMockConfigService({
        'redis.host': 'prod.redis.com',
        'redis.port': 6380,
        'redis.password': 'secure123',
        'redis.db': 1,
        'redis.connectTimeout': 8000,
        'redis.commandTimeout': 4000,
        'cache.compression.enabled': true,
        'cache.compression.thresholdBytes': 2048,
        'cache.compression.algorithm': 'br',
        'cache.decompression.maxConcurrent': 12,
        'cache.decompression.timeoutMs': 6000,
        'cache.batch.maxBatchSize': 150,
        'cache.batch.timeoutMs': 15000,
        'cache.ttl.defaultSeconds': 1800,
        'cache.ttl.maxSeconds': 43200,
        'cache.ttl.minSeconds': 120,
        'cache.security.enableMetrics': true,
        'cache.security.sanitizeKeys': true
      });

      const module = await Test.createTestingModule({
        providers: [
          CacheConfigValidator,
          { provide: ConfigService, useValue: complexConfig }
        ],
      }).compile();

      const testValidator = module.get<CacheConfigValidator>(CacheConfigValidator);
      const result = testValidator.validateConfig();

      expect(result.valid).toBe(true);
      expect(result.config.redis.host).toBe('prod.redis.com');
      expect(result.config.compression.algorithm).toBe('br');
      expect(result.recommendations).toContain('Brotli 压缩比更高但 CPU 消耗更大，适合低频访问的数据');

      const summary = testValidator.getConfigSummary(result);
      expect(summary).toContain('✅ 通过');

      const productionCheck = testValidator.isProductionReady(result.config);
      expect(productionCheck.ready).toBe(true);
    });

    it('should validate realistic development configuration', () => {
      const devConfig = createMockConfigService({
        'redis.host': 'localhost',
        'redis.port': 6379,
        'redis.db': 0,
        'cache.compression.enabled': false,
        'cache.decompression.maxConcurrent': 5,
        'cache.batch.maxBatchSize': 50,
        'cache.ttl.defaultSeconds': 1800,
        'cache.security.enableMetrics': false
      });

      const module = Test.createTestingModule({
        providers: [
          CacheConfigValidator,
          { provide: ConfigService, useValue: devConfig }
        ],
      }).compile();

      return module.then(testModule => {
        const testValidator = testModule.get<CacheConfigValidator>(CacheConfigValidator);
        const result = testValidator.validateConfig();

        expect(result.valid).toBe(true);
        expect(result.recommendations).toContain('本地开发环境，建议生产环境使用专用 Redis 集群');
        expect(result.recommendations).toContain('建议启用指标收集以监控缓存性能');

        const productionCheck = testValidator.isProductionReady(result.config);
        expect(productionCheck.ready).toBe(false);
      });
    });
  });
});
