import { Test, TestingModule } from '@nestjs/testing';
import { ModuleRef } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AutoInitOnStartupService } from '../../../../../src/scripts/services/auto-init-on-startup.service';
import { getAutoInitConfig, SAMPLE_SYMBOL_MAPPINGS } from '../../../../../src/common/config/auto-init.config';
import { DataMappingRule } from '../../../../../src/core/data-mapper/schemas/data-mapper.schema';
import { SymbolMappingRule } from '../../../../../src/core/symbol-mapper/schemas/symbol-mapping-rule.schema';

// 模拟 logger
jest.mock('../../../../../src/common/config/logger.config', () => ({
  createLogger: jest.fn(() => ({
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

// 模拟 auto-init.config
jest.mock('../../../../../src/common/config/auto-init.config', () => ({
  getAutoInitConfig: jest.fn(),
  PRESET_FIELD_DEFINITIONS: {
    stockQuote: {
      provider: 'longport',
      transDataRuleListType: 'stock-quote',
      name: 'Stock Quote Fields',
      description: 'Preset fields for stock quotes',
      fields: [{ source: 's1', target: 't1', desc: 'd1' }],
    },
    stockBasicInfo: {
      provider: 'longport',
      transDataRuleListType: 'stock-basic-info',
      name: 'Stock Basic Info Fields',
      description: 'Preset fields for stock basic info',
      fields: [{ source: 's2', target: 't2', desc: 'd2' }],
    },
  },
  SAMPLE_SYMBOL_MAPPINGS: [
    { dataSourceName: 'sample1', SymbolMappingRule: [] },
    { dataSourceName: 'sample2', SymbolMappingRule: [] },
  ],
}));

describe('AutoInitOnStartupService', () => {
  let service: AutoInitOnStartupService;
  let moduleRef: ModuleRef;
  let mockDataMapperModel: Partial<Model<any>> & { findOne: jest.Mock; create: jest.Mock };
  let mockSymbolMapperModel: Partial<Model<any>> & { findOne: jest.Mock; create: jest.Mock };

  // 在每个测试用例之前，创建一个新的测试模块
  beforeEach(async () => {
    // 清理所有mock
    jest.clearAllMocks();
    // 模拟 Mongoose Model
    mockDataMapperModel = {
      findOne: jest.fn().mockImplementation(() => Promise.resolve(null)),
      create: jest.fn().mockImplementation(() => Promise.resolve({})),
    } as any;
    mockSymbolMapperModel = {
      findOne: jest.fn().mockImplementation(() => Promise.resolve(null)),
      create: jest.fn().mockImplementation(() => Promise.resolve({})),
    } as any;

    // 模拟 getAutoInitConfig 默认启用所有初始化
    (getAutoInitConfig as jest.Mock).mockReturnValue({
      enabled: true,
      presetFields: { stockQuote: true, stockBasicInfo: true },
      sampleData: { symbolMappings: true },
      options: { skipExisting: false, logLevel: 'info' },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoInitOnStartupService,
        {
          provide: ModuleRef,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: getModelToken(DataMappingRule.name),
          useValue: mockDataMapperModel,
        },
        {
          provide: getModelToken(SymbolMappingRule.name),
          useValue: mockSymbolMapperModel,
        },
      ],
    }).compile();

    service = module.get<AutoInitOnStartupService>(AutoInitOnStartupService);
    moduleRef = module.get<ModuleRef>(ModuleRef);

    // 模拟 moduleRef.get
    jest.spyOn(moduleRef, 'get').mockImplementation((token: any) => {
      if (token === getModelToken(DataMappingRule.name)) {
        return mockDataMapperModel;
      }
      if (token === getModelToken(SymbolMappingRule.name)) {
        return mockSymbolMapperModel;
      }
      return null;
    });

    // 模拟 delay 方法，使其立即 resolve
    jest.spyOn(service as any, 'delay').mockResolvedValue(undefined);
  });

  // 测试 onApplicationBootstrap 方法
  describe('onApplicationBootstrap', () => {
    it('should skip initialization if disabled by config', async () => {
      (getAutoInitConfig as jest.Mock).mockReturnValue({ enabled: false });
      const loggerSpy = jest.spyOn((service as any).logger, 'log');
      await service.onApplicationBootstrap();
      expect(loggerSpy).toHaveBeenCalledWith('⏭️ 自动初始化已禁用，跳过启动初始化');
      expect(mockDataMapperModel.create).not.toHaveBeenCalled();
    });

    it('should skip initialization if DISABLE_AUTO_INIT is true', async () => {
      process.env.DISABLE_AUTO_INIT = 'true';
      const loggerSpy = jest.spyOn((service as any).logger, 'log');
      await service.onApplicationBootstrap();
      expect(loggerSpy).toHaveBeenCalledWith('⏭️ 自动初始化已禁用，跳过启动初始化');
      expect(mockDataMapperModel.create).not.toHaveBeenCalled();
      delete process.env.DISABLE_AUTO_INIT;
    });

    it('should skip initialization in test environment', async () => {
      process.env.NODE_ENV = 'test';
      const loggerSpy = jest.spyOn((service as any).logger, 'log');
      await service.onApplicationBootstrap();
      expect(loggerSpy).toHaveBeenCalledWith('⏭️ 自动初始化已禁用，跳过启动初始化');
      expect(mockDataMapperModel.create).not.toHaveBeenCalled();
      process.env.NODE_ENV = 'development'; // Reset for other tests
    });

    it('should initialize all configured data', async () => {
      await service.onApplicationBootstrap();
      expect(mockDataMapperModel.create).toHaveBeenCalledTimes(2);
      expect(mockSymbolMapperModel.create).toHaveBeenCalledTimes(SAMPLE_SYMBOL_MAPPINGS.length);
      expect((service as any).logger.log).toHaveBeenCalledWith('✅ 启动时自动初始化完成！');
    });

    it('should log error if initialization fails', async () => {
      // 临时设置非测试环境，以便触发实际的初始化逻辑
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      // 确保getAutoInitConfig返回启用的配置
      (getAutoInitConfig as jest.Mock).mockReturnValue({
        enabled: true,
        presetFields: { stockQuote: true, stockBasicInfo: true },
        sampleData: { symbolMappings: true },
        options: { skipExisting: false }
      });
      
      // 重新创建service以使用新的环境变量
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AutoInitOnStartupService,
          {
            provide: ModuleRef,
            useValue: moduleRef,
          },
          {
            provide: getModelToken(DataMappingRule.name),
            useValue: mockDataMapperModel,
          },
          {
            provide: getModelToken(SymbolMappingRule.name),
            useValue: mockSymbolMapperModel,
          },
        ],
      }).compile();

      const testService = module.get<AutoInitOnStartupService>(AutoInitOnStartupService);
      jest.spyOn(testService as any, 'delay').mockResolvedValue(undefined);
      
      // 让moduleRef.get抛出错误，这样会直接到达onApplicationBootstrap的catch块
      jest.spyOn(moduleRef, 'get').mockImplementation((token: any) => {
        if (token === getModelToken(DataMappingRule.name)) {
          throw new Error('Module get failed');
        }
        if (token === getModelToken(SymbolMappingRule.name)) {
          return mockSymbolMapperModel;
        }
        return null;
      });
      
      const loggerErrorSpy = jest.spyOn((testService as any).logger, 'error');
      
      await testService.onApplicationBootstrap();
      expect(loggerErrorSpy).toHaveBeenCalledWith('❌ 启动时自动初始化失败:', expect.any(Error));
      
      // 恢复原始环境变量
      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  // 测试 initStockQuotePresetFields 方法
  describe('initStockQuotePresetFields', () => {
    it('should skip if existing and skipExisting is true', async () => {
      // 直接设置service的config属性，而不是mock getAutoInitConfig
      (service as any).config = { enabled: true, options: { skipExisting: true } };
      mockDataMapperModel.findOne.mockResolvedValueOnce({}); // Simulate existing
      const loggerSpy = jest.spyOn((service as any).logger, 'debug');
      await (service as any).initStockQuotePresetFields(mockDataMapperModel);
      expect(loggerSpy).toHaveBeenCalledWith('⏭️ 股票报价预设字段已存在，跳过初始化');
      expect(mockDataMapperModel.create).not.toHaveBeenCalled();
    });

    it('should create if not existing', async () => {
      mockDataMapperModel.findOne.mockResolvedValueOnce(null);
      await (service as any).initStockQuotePresetFields(mockDataMapperModel);
      expect(mockDataMapperModel.create).toHaveBeenCalled();
      expect((service as any).logger.log).toHaveBeenCalledWith(expect.stringContaining('股票报价预设字段初始化完成'));
    });

    it('should log warning if creation fails', async () => {
      mockDataMapperModel.findOne.mockResolvedValueOnce(null);
      mockDataMapperModel.create.mockRejectedValueOnce(new Error('Create error'));
      const loggerWarnSpy = jest.spyOn((service as any).logger, 'warn');
      await (service as any).initStockQuotePresetFields(mockDataMapperModel);
      expect(loggerWarnSpy).toHaveBeenCalledWith('⚠️ 股票报价预设字段初始化失败:', 'Create error');
    });
  });

  // 测试 initStockBasicInfoPresetFields 方法
  describe('initStockBasicInfoPresetFields', () => {
    it('should skip if existing and skipExisting is true', async () => {
      // 直接设置service的config属性
      (service as any).config = { enabled: true, options: { skipExisting: true } };
      mockDataMapperModel.findOne.mockResolvedValueOnce({}); // Simulate existing
      const loggerSpy = jest.spyOn((service as any).logger, 'debug');
      await (service as any).initStockBasicInfoPresetFields(mockDataMapperModel);
      expect(loggerSpy).toHaveBeenCalledWith('⏭️ 股票基本信息预设字段已存在，跳过初始化');
      expect(mockDataMapperModel.create).not.toHaveBeenCalled();
    });

    it('should create if not existing', async () => {
      mockDataMapperModel.findOne.mockResolvedValueOnce(null);
      await (service as any).initStockBasicInfoPresetFields(mockDataMapperModel);
      expect(mockDataMapperModel.create).toHaveBeenCalled();
      expect((service as any).logger.log).toHaveBeenCalledWith(expect.stringContaining('股票基本信息预设字段初始化完成'));
    });

    it('should log warning if creation fails', async () => {
      mockDataMapperModel.findOne.mockResolvedValueOnce(null);
      mockDataMapperModel.create.mockRejectedValueOnce(new Error('Create error'));
      const loggerWarnSpy = jest.spyOn((service as any).logger, 'warn');
      await (service as any).initStockBasicInfoPresetFields(mockDataMapperModel);
      expect(loggerWarnSpy).toHaveBeenCalledWith('⚠️ 股票基本信息预设字段初始化失败:', 'Create error');
    });
  });

  // 测试 initSampleSymbolMappings 方法
  describe('initSampleSymbolMappings', () => {
    it('should skip if existing and skipExisting is true', async () => {
      // 直接设置service的config属性
      (service as any).config = { enabled: true, options: { skipExisting: true } };
      // SAMPLE_SYMBOL_MAPPINGS有多个元素，每个findOne调用都需要返回存在的记录
      mockSymbolMapperModel.findOne.mockResolvedValue({}); // 对所有调用都返回存在的记录
      const loggerSpy = jest.spyOn((service as any).logger, 'debug');
      await (service as any).initSampleSymbolMappings(mockSymbolMapperModel);
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('已存在，跳过初始化'));
      expect(mockSymbolMapperModel.create).not.toHaveBeenCalled();
    });

    it('should create if not existing', async () => {
      mockSymbolMapperModel.findOne.mockResolvedValue(null);
      await (service as any).initSampleSymbolMappings(mockSymbolMapperModel);
      expect(mockSymbolMapperModel.create).toHaveBeenCalledTimes(SAMPLE_SYMBOL_MAPPINGS.length);
      expect((service as any).logger.log).toHaveBeenCalledWith(expect.stringContaining('初始化完成'));
    });

    it('should log warning if creation fails for a mapping', async () => {
      mockSymbolMapperModel.findOne.mockResolvedValueOnce(null);
      mockSymbolMapperModel.create.mockRejectedValueOnce(new Error('Mapping error'));
      const loggerWarnSpy = jest.spyOn((service as any).logger, 'warn');
      await (service as any).initSampleSymbolMappings(mockSymbolMapperModel);
      expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('初始化失败'), 'Mapping error');
    });
  });
});