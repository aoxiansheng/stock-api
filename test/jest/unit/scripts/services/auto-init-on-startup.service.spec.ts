/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { ModuleRef } from '@nestjs/core';

import { AutoInitOnStartupService } from '../../../../../src/scripts/services/auto-init-on-startup.service';
import { getAutoInitConfig } from '@config/auto-init.config';

// 注意：旧版预设字段和符号映射已移除
// 新版架构不再需要这些自动初始化功能

// 模拟 logger
jest.mock('@app/config/logger.config', () => ({
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
}));

// 模拟 PersistedTemplateService
const mockPersistedTemplateService = {
  persistPresetTemplates: jest.fn(),
};

describe('AutoInitOnStartupService', () => {
  let service: AutoInitOnStartupService;
  let moduleRef: ModuleRef;

  // 在每个测试用例之前，创建一个新的测试模块
  beforeEach(async () => {
    // 清理所有mock
    jest.clearAllMocks();

    // 模拟 getAutoInitConfig 默认配置
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
            get: jest.fn().mockImplementation((token) => {
              if (token._name === 'PersistedTemplateService') {
                return mockPersistedTemplateService;
              }
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AutoInitOnStartupService>(AutoInitOnStartupService);
    moduleRef = module.get<ModuleRef>(ModuleRef);
  });

  // 测试 onApplicationBootstrap 方法
  describe('onApplicationBootstrap', () => {
    it('should skip initialization if disabled by config', async () => {
      (getAutoInitConfig as jest.Mock).mockReturnValue({ enabled: false });
      const loggerSpy = jest.spyOn((service as any).logger, 'log');
      await service.onApplicationBootstrap();
      expect(loggerSpy).toHaveBeenCalledWith('⏭️ 自动初始化已禁用，跳过启动初始化');
      expect(mockPersistedTemplateService.persistPresetTemplates).not.toHaveBeenCalled();
    });

    it('should skip initialization if DISABLE_AUTO_INIT is true', async () => {
      process.env.DISABLE_AUTOINIT = 'true';
      const loggerSpy = jest.spyOn((service as any).logger, 'log');
      await service.onApplicationBootstrap();
      expect(loggerSpy).toHaveBeenCalledWith('⏭️ 自动初始化已禁用，跳过启动初始化');
      expect(mockPersistedTemplateService.persistPresetTemplates).not.toHaveBeenCalled();
      delete process.env.DISABLE_AUTO_INIT;
    });

    it('should skip initialization in test environment', async () => {
      process.env.NODEENV = 'test';
      const loggerSpy = jest.spyOn((service as any).logger, 'log');
      await service.onApplicationBootstrap();
      expect(loggerSpy).toHaveBeenCalledWith('⏭️ 自动初始化已禁用，跳过启动初始化');
      expect(mockPersistedTemplateService.persistPresetTemplates).not.toHaveBeenCalled();
      process.env.NODE_ENV = 'development'; // Reset for other tests
    });

    it('should run initialization successfully', async () => {
      // 设置非测试环境
      process.env.NODE_ENV = 'development';
      
      // Mock persistPresetTemplates 返回成功结果
      mockPersistedTemplateService.persistPresetTemplates.mockResolvedValue({
        created: 2,
        updated: 0,
        skipped: 0,
        details: ['已创建: LongPort REST 股票报价模板', '已创建: LongPort WebSocket 股票报价流模板']
      });
      
      const loggerSpy = jest.spyOn((service as any).logger, 'log');
      
      await service.onApplicationBootstrap();
      
      // 验证启动日志
      expect(loggerSpy).toHaveBeenCalledWith('🚀 开始启动时自动初始化...', {
        config: { enabled: true }
      });
      
      // 验证初始化模板日志
      expect(loggerSpy).toHaveBeenCalledWith('📋 开始初始化预设模板...');
      
      // 验证完成日志
      expect(loggerSpy).toHaveBeenCalledWith('✅ 启动时自动初始化完成');
      
      // 验证调用了 persistPresetTemplates
      expect(mockPersistedTemplateService.persistPresetTemplates).toHaveBeenCalled();
      
      process.env.NODE_ENV = 'test'; // Reset
    });

    it('should log error if initialization fails', async () => {
      // 设置非测试环境
      process.env.NODE_ENV = 'development';
      
      // Mock persistPresetTemplates 抛出错误
      mockPersistedTemplateService.persistPresetTemplates.mockRejectedValue(
        new Error('Database connection failed')
      );
      
      const loggerErrorSpy = jest.spyOn((service as any).logger, 'error');
      
      await service.onApplicationBootstrap();
      
      // 验证错误日志
      expect(loggerErrorSpy).toHaveBeenCalledWith('❌ 预设模板初始化失败', {
        error: 'Database connection failed',
        operation: 'initializePresetTemplates'
      });
      
      process.env.NODE_ENV = 'test'; // Reset
    });
  });

  // 🎯 旧版预设字段和符号映射初始化测试已移除
  // 新版架构使用以下组件：
  // - PresetTemplatesService: 预设模板管理
  // - SymbolMapper: 符号映射管理
  // - IntelligentMappingSuggestionService: 智能字段映射建议
});