/* eslint-disable @typescript-eslint/no-unused-vars */

import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-jest';
import { ProvidersController } from '@providers/controller/providers-controller';
import { CapabilityRegistryService } from '@providers/services/capability-registry.service';
import { ICapabilityRegistration } from '@providers/interfaces/provider.interface';
import { ICapability } from '@providers/interfaces/capability.interface';
import { UnifiedPermissionsGuard } from '../../../../../src/auth/guards/unified-permissions.guard';
import { PermissionService } from '../../../../../src/auth/services/permission.service';
import { RateLimitGuard } from '../../../../../src/auth/guards/rate-limit.guard';
import { RateLimitService } from '../../../../../src/auth/services/rate-limit.service';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

describe('ProvidersController', () => {
  let controller: ProvidersController;
  let capabilityRegistryService: jest.Mocked<CapabilityRegistryService>;

  beforeEach(async () => {
    const mockCapabilityRegistryService = createMock<CapabilityRegistryService>();

    // 设置一个模拟的capabilities映射，确保getAllCapabilities返回有效数据
    const mockCapabilitiesMap = new Map();
    const mockProviderCapabilities = new Map();
    
    // 添加get-stock-quote能力到longport提供商
    mockProviderCapabilities.set('get-stock-quote', {
      providerName: 'longport',
      capability: {
        name: 'get-stock-quote',
        description: '获取股票报价数据',
        supportedMarkets: ['HK', 'US'],
        supportedSymbolFormats: ['700.HK'],
        execute: jest.fn(),
      },
      priority: 1,
      isEnabled: true,
    });
    
    mockCapabilitiesMap.set('longport', mockProviderCapabilities);
    
    mockCapabilityRegistryService.getAllCapabilities.mockReturnValue(mockCapabilitiesMap);

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{
          name: 'default',
          ttl: 60000,
          limit: 10,
        }]),
      ],
      controllers: [ProvidersController],
      providers: [
        {
          provide: CapabilityRegistryService,
          useValue: mockCapabilityRegistryService,
        },
        {
          provide: UnifiedPermissionsGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: PermissionService,
          useValue: {
            validatePermissions: jest.fn().mockReturnValue(true),
            checkPermissions: jest.fn().mockReturnValue(true),
            getEffectivePermissions: jest.fn().mockReturnValue([]),
            combinePermissions: jest.fn(),
            createPermissionContext: jest.fn(),
          },
        },
        {
          provide: RateLimitService,
          useValue: {
            checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, limit: 100, current: 1 }),
            consume: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: RateLimitGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
            getAll: jest.fn(),
            getAllAndOverride: jest.fn(),
            getAllAndMerge: jest.fn(),
          },
        },
        {
          provide: ThrottlerGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    controller = module.get<ProvidersController>(ProvidersController);
    capabilityRegistryService = module.get(CapabilityRegistryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should inject CapabilityRegistryService', () => {
      expect(capabilityRegistryService).toBeDefined();
    });
  });

  describe('getAllCapabilities', () => {
    it('should return all capabilities grouped by provider', () => {
      const mockCapability1: ICapability = {
        name: 'get-stock-quote',
        description: '获取股票报价数据',
        supportedMarkets: ['HK', 'US'],
        supportedSymbolFormats: ['700.HK'],
        execute: jest.fn(),
      };
      const mockCapability2: ICapability = {
        name: 'get-stock-basic-info',
        description: '获取股票基本信息',
        supportedMarkets: ['HK', 'US'],
        supportedSymbolFormats: ['700.HK'],
        execute: jest.fn(),
      };
      const mockCapability3: ICapability = {
        name: 'get-stock-basic-info',
        description: '获取股票基本信息',
        supportedMarkets: ['US'],
        supportedSymbolFormats: ['AAPL.US'],
        execute: jest.fn(),
      };

      const mockCapabilities = new Map<string, Map<string, ICapabilityRegistration>>([
        [
          'longport',
          new Map([
            [
              'get-stock-quote',
              {
                providerName: 'longport',
                capability: mockCapability1,
                priority: 1,
                isEnabled: true,
              },
            ],
            [
              'get-stock-basic-info',
              {
                providerName: 'longport',
                capability: mockCapability2,
                priority: 1,
                isEnabled: true,
              },
            ],
          ]),
        ],
        [
          'twelvedata',
          new Map([
            [
              'get-stock-basic-info',
              {
                providerName: 'twelvedata',
                capability: mockCapability3,
                priority: 2,
                isEnabled: true,
              },
            ],
          ]),
        ],
      ]);

      capabilityRegistryService.getAllCapabilities.mockReturnValue(mockCapabilities);

      const result = controller.getAllCapabilities();

      expect(capabilityRegistryService.getAllCapabilities).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        longport: [
          {
            name: 'get-stock-quote',
            description: '获取股票报价数据',
            supportedMarkets: ['HK', 'US'],
            priority: 1,
            isEnabled: true,
          },
          {
            name: 'get-stock-basic-info',
            description: '获取股票基本信息',
            supportedMarkets: ['HK', 'US'],
            priority: 1,
            isEnabled: true,
          },
        ],
        twelvedata: [
          {
            name: 'get-stock-basic-info',
            description: '获取股票基本信息',
            supportedMarkets: ['US'],
            priority: 2,
            isEnabled: true,
          },
        ],
      });
    });

    it('should return empty object when no capabilities exist', () => {
      capabilityRegistryService.getAllCapabilities.mockReturnValue(new Map());

      const result = controller.getAllCapabilities();

      expect(capabilityRegistryService.getAllCapabilities).toHaveBeenCalledTimes(1);
      expect(result).toEqual({});
    });

    it('should handle providers with no capabilities', () => {
      const mockCapabilities = new Map<string, Map<string, ICapabilityRegistration>>([
        ['empty_provider', new Map()],
      ]);

      capabilityRegistryService.getAllCapabilities.mockReturnValue(mockCapabilities);

      const result = controller.getAllCapabilities();

      expect(result).toEqual({
        empty_provider: [],
      });
    });
  });

  describe('getBestProviderWithoutMarket', () => {
    it('should return best provider for capability without market', () => {
      const capability = 'get-stock-quote';
      const mockBestProvider: ICapabilityRegistration = {
        providerName: 'longport',
        capability: {
          name: 'get-stock-quote',
          description: '获取股票报价数据',
          supportedMarkets: ['HK', 'US'],
          supportedSymbolFormats: ['700.HK'],
          execute: jest.fn(),
        },
        priority: 1,
        isEnabled: true,
      };

      // 确保getBestProvider返回正确的提供商名称
      capabilityRegistryService.getBestProvider.mockReturnValue(mockBestProvider.providerName);
      
      // 准备一个模拟的能力映射
      const mockCapabilitiesMap = new Map();
      const mockProviderCapabilities = new Map();
      mockProviderCapabilities.set('get-stock-quote', mockBestProvider);
      mockCapabilitiesMap.set('longport', mockProviderCapabilities);
      capabilityRegistryService.getAllCapabilities.mockReturnValue(mockCapabilitiesMap);

      const result = controller.getBestProviderWithoutMarket(capability);

      expect(capabilityRegistryService.getBestProvider).toHaveBeenCalledWith(capability, undefined);
      expect(result).toEqual({
        capability,
        market: null,
        bestProvider: {
          name: mockBestProvider.capability.name,
          description: mockBestProvider.capability.description,
          supportedMarkets: mockBestProvider.capability.supportedMarkets,
          priority: mockBestProvider.priority,
          isEnabled: mockBestProvider.isEnabled,
        },
      });
    });

    it('should handle capability with no available providers', () => {
      const capability = 'non-existent-capability';
      capabilityRegistryService.getBestProvider.mockReturnValue(null);

      const result = controller.getBestProviderWithoutMarket(capability);

      expect(capabilityRegistryService.getBestProvider).toHaveBeenCalledWith(capability, undefined);
      expect(result).toEqual({
        capability,
        market: null,
        bestProvider: null,
      });
    });

    it('should handle empty capability string', () => {
      const capability = '';
      capabilityRegistryService.getBestProvider.mockReturnValue(null);

      const result = controller.getBestProviderWithoutMarket(capability);

      expect(capabilityRegistryService.getBestProvider).toHaveBeenCalledWith('', undefined);
      expect(result).toEqual({
        capability: '',
        market: null,
        bestProvider: null,
      });
    });
  });

  describe('getBestProviderWithMarket', () => {
    it('should return best provider for capability with specific market', () => {
      const capability = 'get-stock-quote';
      const market = 'HK';
      const mockBestProvider: ICapabilityRegistration = {
        providerName: 'longport',
        capability: {
          name: 'get-stock-quote',
          description: '获取股票报价数据',
          supportedMarkets: ['HK', 'US'],
          supportedSymbolFormats: ['700.HK'],
          execute: jest.fn(),
        },
        priority: 1,
        isEnabled: true,
      };

      // 确保getBestProvider返回正确的提供商名称
      capabilityRegistryService.getBestProvider.mockReturnValue(mockBestProvider.providerName);
      
      // 准备一个模拟的能力映射
      const mockCapabilitiesMap = new Map();
      const mockProviderCapabilities = new Map();
      mockProviderCapabilities.set('get-stock-quote', mockBestProvider);
      mockCapabilitiesMap.set('longport', mockProviderCapabilities);
      capabilityRegistryService.getAllCapabilities.mockReturnValue(mockCapabilitiesMap);

      const result = controller.getBestProviderWithMarket(capability, market);

      expect(capabilityRegistryService.getBestProvider).toHaveBeenCalledWith(capability, market);
      expect(result).toEqual({
        capability,
        market,
        bestProvider: {
          name: mockBestProvider.capability.name,
          description: mockBestProvider.capability.description,
          supportedMarkets: mockBestProvider.capability.supportedMarkets,
          priority: mockBestProvider.priority,
          isEnabled: mockBestProvider.isEnabled,
        },
      });
    });

    it('should handle US market requests', () => {
      const capability = 'get-stock-quote';
      const market = 'US';
      const mockBestProvider: ICapabilityRegistration = {
        providerName: 'longport',
        capability: {
          name: 'get-stock-quote',
          description: '获取股票报价数据',
          supportedMarkets: ['HK', 'US'],
          supportedSymbolFormats: ['AAPL.US'],
          execute: jest.fn(),
        },
        priority: 1,
        isEnabled: true,
      };

      // 确保getBestProvider返回正确的提供商名称
      capabilityRegistryService.getBestProvider.mockReturnValue(mockBestProvider.providerName);
      
      // 准备一个模拟的能力映射
      const mockCapabilitiesMap = new Map();
      const mockProviderCapabilities = new Map();
      mockProviderCapabilities.set('get-stock-quote', mockBestProvider);
      mockCapabilitiesMap.set('longport', mockProviderCapabilities);
      capabilityRegistryService.getAllCapabilities.mockReturnValue(mockCapabilitiesMap);

      const result = controller.getBestProviderWithMarket(capability, market);

      expect(capabilityRegistryService.getBestProvider).toHaveBeenCalledWith(capability, market);
      expect(result).toEqual({
        capability,
        market,
        bestProvider: {
          name: mockBestProvider.capability.name,
          description: mockBestProvider.capability.description,
          supportedMarkets: mockBestProvider.capability.supportedMarkets,
          priority: mockBestProvider.priority,
          isEnabled: mockBestProvider.isEnabled,
        },
      });
    });

    it('should handle unsupported market', () => {
      const capability = 'get-stock-quote';
      const market = 'UNKNOWN';
      capabilityRegistryService.getBestProvider.mockReturnValue(null);

      const result = controller.getBestProviderWithMarket(capability, market);

      expect(capabilityRegistryService.getBestProvider).toHaveBeenCalledWith(capability, market);
      expect(result).toEqual({
        capability,
        market,
        bestProvider: null,
      });
    });

    it('should handle capability not available in specified market', () => {
      const capability = 'get-stock-basic-info';
      const market = 'CN';
      capabilityRegistryService.getBestProvider.mockReturnValue(null);

      const result = controller.getBestProviderWithMarket(capability, market);

      expect(capabilityRegistryService.getBestProvider).toHaveBeenCalledWith(capability, market);
      expect(result).toEqual({
        capability,
        market,
        bestProvider: null,
      });
    });
  });

  describe('getProviderCapabilities', () => {
    it('should return capabilities for existing provider', () => {
      const provider = 'longport';
      const mockCapability1: ICapability = {
        name: 'get-stock-quote',
        description: '获取股票报价数据',
        supportedMarkets: ['HK', 'US'],
        supportedSymbolFormats: ['700.HK'],
        execute: jest.fn(),
      };
      const mockCapability2: ICapability = {
        name: 'get-stock-basic-info',
        description: '获取股票基本信息',
        supportedMarkets: ['HK', 'US'],
        supportedSymbolFormats: ['700.HK'],
        execute: jest.fn(),
      };

      const mockAllCapabilities = new Map<string, Map<string, ICapabilityRegistration>>([
        [
          'longport',
          new Map([
            [
              'get-stock-quote',
              {
                providerName: 'longport',
                capability: mockCapability1,
                priority: 1,
                isEnabled: true,
              },
            ],
            [
              'get-stock-basic-info',
              {
                providerName: 'longport',
                capability: mockCapability2,
                priority: 1,
                isEnabled: true,
              },
            ],
          ]),
        ],
        [
          'twelvedata',
          new Map([
            [
              'get-stock-basic-info',
              {
                providerName: 'twelvedata',
                capability: mockCapability2,
                priority: 2,
                isEnabled: true,
              },
            ],
          ]),
        ],
      ]);

      capabilityRegistryService.getAllCapabilities.mockReturnValue(mockAllCapabilities);

      const result = controller.getProviderCapabilities(provider);

      expect(capabilityRegistryService.getAllCapabilities).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        provider,
        capabilities: [
          {
            name: 'get-stock-quote',
            description: '获取股票报价数据',
            supportedMarkets: ['HK', 'US'],
            priority: 1,
            isEnabled: true,
          },
          {
            name: 'get-stock-basic-info',
            description: '获取股票基本信息',
            supportedMarkets: ['HK', 'US'],
            priority: 1,
            isEnabled: true,
          },
        ],
      });
    });

    it('should return empty capabilities for non-existent provider', () => {
      const provider = 'non-existent-provider';
      const mockAllCapabilities = new Map<string, Map<string, ICapabilityRegistration>>([
        [
          'longport',
          new Map([
            [
              'get-stock-quote',
              {
                providerName: 'longport',
                capability: {
                  name: 'get-stock-quote',
                  description: '获取股票报价数据',
                  supportedMarkets: ['HK', 'US'],
                  supportedSymbolFormats: ['700.HK'],
                  execute: jest.fn(),
                },
                priority: 1,
                isEnabled: true,
              },
            ],
          ]),
        ],
      ]);

      capabilityRegistryService.getAllCapabilities.mockReturnValue(mockAllCapabilities);

      const result = controller.getProviderCapabilities(provider);

      expect(capabilityRegistryService.getAllCapabilities).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        provider,
        capabilities: [],
      });
    });

    it('should handle provider with no capabilities', () => {
      const provider = 'empty_provider';
      const mockAllCapabilities = new Map<string, Map<string, ICapabilityRegistration>>([
        ['empty_provider', new Map()],
        [
          'longport',
          new Map([
            [
              'get-stock-quote',
              {
                providerName: 'longport',
                capability: {
                  name: 'get-stock-quote',
                  description: '获取股票报价数据',
                  supportedMarkets: ['HK', 'US'],
                  supportedSymbolFormats: ['700.HK'],
                  execute: jest.fn(),
                },
                priority: 1,
                isEnabled: true,
              },
            ],
          ]),
        ],
      ]);

      capabilityRegistryService.getAllCapabilities.mockReturnValue(mockAllCapabilities);

      const result = controller.getProviderCapabilities(provider);

      expect(result).toEqual({
        provider,
        capabilities: [],
      });
    });

    it('should handle empty provider name', () => {
      const provider = '';
      const mockAllCapabilities = new Map();

      capabilityRegistryService.getAllCapabilities.mockReturnValue(mockAllCapabilities);

      const result = controller.getProviderCapabilities(provider);

      expect(result).toEqual({
        provider: '',
        capabilities: [],
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle multiple providers with overlapping capabilities', () => {
      const mockCapability1: ICapability = {
        name: 'get-stock-quote',
        description: '获取股票报价数据',
        supportedMarkets: ['HK', 'US'],
        supportedSymbolFormats: ['700.HK'],
        execute: jest.fn(),
      };
      const mockCapability2: ICapability = {
        name: 'get-stock-quote',
        description: '获取新加坡股票报价数据',
        supportedMarkets: ['SG'],
        supportedSymbolFormats: ['D05.SG'],
        execute: jest.fn(),
      };

      const mockCapabilities = new Map<string, Map<string, ICapabilityRegistration>>([
        [
          'longport',
          new Map([
            [
              'get-stock-quote',
              {
                providerName: 'longport',
                capability: mockCapability1,
                priority: 1,
                isEnabled: true,
              },
            ],
          ]),
        ],
        [
          'longport_sg',
          new Map([
            [
              'get-stock-quote',
              {
                providerName: 'longport_sg',
                capability: mockCapability2,
                priority: 1,
                isEnabled: true,
              },
            ],
          ]),
        ],
      ]);

      capabilityRegistryService.getAllCapabilities.mockReturnValue(mockCapabilities);

      const result = controller.getAllCapabilities();

      expect(result).toHaveProperty('longport');
      expect(result).toHaveProperty('longport_sg');
            expect(result['longport'][0].name).toBe('get-stock-quote');
      expect(result['longport_sg'][0].name).toBe('get-stock-quote');
      expect(result['longport'][0].supportedMarkets).toEqual(['HK', 'US']);
      expect(result['longport_sg'][0].supportedMarkets).toEqual(['SG']);
    });

    it('should handle provider selection logic correctly', () => {
      const capability = 'get-stock-quote';
      const market = 'HK';

      const mockBestProviderName = 'longport';
      const mockBestProviderCapability: ICapability = {
        name: 'get-stock-quote',
        description: '获取股票报价数据',
        supportedMarkets: ['HK', 'US'],
        supportedSymbolFormats: ['700.HK'],
        execute: jest.fn(),
      };
      
      // 创建模拟的能力注册信息
      const mockRegistration: ICapabilityRegistration = {
        providerName: mockBestProviderName,
        capability: mockBestProviderCapability,
        priority: 1,
        isEnabled: true,
      };

      // 确保getBestProvider返回正确的提供商名称
      capabilityRegistryService.getBestProvider.mockReturnValue(mockBestProviderName);
      
      // 准备一个模拟的能力映射
      const mockCapabilitiesMap = new Map();
      const mockProviderCapabilities = new Map();
      mockProviderCapabilities.set('get-stock-quote', mockRegistration);
      mockCapabilitiesMap.set(mockBestProviderName, mockProviderCapabilities);
      capabilityRegistryService.getAllCapabilities.mockReturnValue(mockCapabilitiesMap);

      const result = controller.getBestProviderWithMarket(capability, market);

      // 验证结果包含正确的对象
      expect(result.bestProvider).toEqual({
        name: mockBestProviderCapability.name,
        description: mockBestProviderCapability.description,
        supportedMarkets: mockBestProviderCapability.supportedMarkets,
        priority: mockRegistration.priority,
        isEnabled: mockRegistration.isEnabled,
      });
      
      // 由于 controller 内部会调用 getCapability 获取能力详情，所以我们需要验证这些方法被调用
      expect(capabilityRegistryService.getBestProvider).toHaveBeenCalledWith(capability, market);
      // getCapability 方法不再被调用，因为我们现在直接从 capabilities 映射中获取数据
    });

    it('should handle disabled providers correctly', () => {
      const provider = 'disabled_provider';
      const mockCapability: ICapability = {
        name: 'get-stock-quote',
        description: '获取股票报价数据',
        supportedMarkets: ['HK', 'US'],
        supportedSymbolFormats: ['700.HK'],
        execute: jest.fn(),
      };
      const mockCapabilities = new Map<string, Map<string, ICapabilityRegistration>>([
        [
          'disabled_provider',
          new Map([
            [
              'get-stock-quote',
              {
                providerName: 'disabled_provider',
                capability: mockCapability,
                priority: 1,
                isEnabled: false,
              },
            ],
          ]),
        ],
      ]);

      capabilityRegistryService.getAllCapabilities.mockReturnValue(mockCapabilities);

      const result = controller.getProviderCapabilities(provider);

      expect(result.capabilities[0].isEnabled).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle service exceptions gracefully', () => {
      capabilityRegistryService.getAllCapabilities.mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      expect(() => controller.getAllCapabilities()).toThrow('Service unavailable');
    });

    it('should handle getBestProvider exceptions', () => {
      const capability = 'get-stock-quote';
      capabilityRegistryService.getBestProvider.mockImplementation(() => {
        throw new Error('Provider lookup failed');
      });

      expect(() => controller.getBestProviderWithoutMarket(capability)).toThrow('Provider lookup failed');
    });
  });

  describe('Performance Considerations', () => {
    it('should efficiently handle large number of providers', () => {
      const largeCapabilitiesMap = new Map<string, Map<string, ICapabilityRegistration>>();
      
      for (let i = 0; i < 100; i++) {
        const providerCapabilities = new Map<string, ICapabilityRegistration>();
        for (let j = 0; j < 10; j++) {
          const mockCapability: ICapability = {
            name: `capability-${j}`,
            description: `Description ${j}`,
            supportedMarkets: ['HK', 'US'],
            supportedSymbolFormats: ['TEST'],
            execute: jest.fn(),
          };
          providerCapabilities.set(`capability-${j}`, {
            providerName: `provider-${i}`,
            capability: mockCapability,
            priority: j + 1,
            isEnabled: true,
          });
        }
        largeCapabilitiesMap.set(`provider-${i}`, providerCapabilities);
      }

      capabilityRegistryService.getAllCapabilities.mockReturnValue(largeCapabilitiesMap);

      const startTime = Date.now();
      const result = controller.getAllCapabilities();
      const endTime = Date.now();

      expect(Object.keys(result)).toHaveLength(100);
      expect(result['provider-0']).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle concurrent requests efficiently', async () => {
      const mockCapability1: ICapability = {
        name: 'get-stock-quote',
        description: '获取股票报价数据',
        supportedMarkets: ['HK', 'US'],
        supportedSymbolFormats: ['700.HK'],
        execute: jest.fn(),
      };
      const mockCapabilities = new Map<string, Map<string, ICapabilityRegistration>>([
        [
          'longport',
          new Map([
            [
              'get-stock-quote',
              {
                providerName: 'longport',
                capability: mockCapability1,
                priority: 1,
                isEnabled: true,
              },
            ],
          ]),
        ],
      ]);

      capabilityRegistryService.getAllCapabilities.mockReturnValue(mockCapabilities);

      const promises = Array.from({ length: 10 }, () => 
        Promise.resolve(controller.getAllCapabilities())
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result).toHaveProperty('longport');
        expect(result['longport']).toHaveLength(1);
      });
      expect(capabilityRegistryService.getAllCapabilities).toHaveBeenCalledTimes(10);
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should support typical stock quote provider lookup', () => {
      const mockBestProviderName = 'longport';
      const mockBestProviderCapability: ICapability = {
        name: 'get-stock-quote',
        description: '获取股票报价数据',
        supportedMarkets: ['HK', 'US'],
        supportedSymbolFormats: ['700.HK'],
        execute: jest.fn(),
      };
      
      // 创建模拟的能力注册信息
      const mockRegistration: ICapabilityRegistration = {
        providerName: mockBestProviderName,
        capability: mockBestProviderCapability,
        priority: 1,
        isEnabled: true,
      };

      // 确保getBestProvider返回正确的提供商名称
      capabilityRegistryService.getBestProvider.mockReturnValue(mockBestProviderName);
      
      // 准备一个模拟的能力映射
      const mockCapabilitiesMap = new Map();
      const mockProviderCapabilities = new Map();
      mockProviderCapabilities.set('get-stock-quote', mockRegistration);
      mockCapabilitiesMap.set(mockBestProviderName, mockProviderCapabilities);
      capabilityRegistryService.getAllCapabilities.mockReturnValue(mockCapabilitiesMap);

      const hkResult = controller.getBestProviderWithMarket('get-stock-quote', 'HK');
      const usResult = controller.getBestProviderWithMarket('get-stock-quote', 'US');

      // 验证结果包含正确的对象
      const expectedProvider = {
        name: mockBestProviderCapability.name,
        description: mockBestProviderCapability.description,
        supportedMarkets: mockBestProviderCapability.supportedMarkets,
        priority: mockRegistration.priority,
        isEnabled: mockRegistration.isEnabled,
      };
      
      expect(hkResult.bestProvider).toEqual(expectedProvider);
      expect(usResult.bestProvider).toEqual(expectedProvider);
      expect(hkResult.market).toBe('HK');
      expect(usResult.market).toBe('US');
    });

    it('should support provider capability discovery', () => {
      const mockCapability1: ICapability = {
        name: 'get-stock-quote',
        description: '获取股票报价数据',
        supportedMarkets: ['HK', 'US'],
        supportedSymbolFormats: ['700.HK'],
        execute: jest.fn(),
      };
      const mockCapability2: ICapability = {
        name: 'get-stock-basic-info',
        description: '获取股票基本信息',
        supportedMarkets: ['HK', 'US'],
        supportedSymbolFormats: ['700.HK'],
        execute: jest.fn(),
      };
      const mockCapability3: ICapability = {
        name: 'get-index-quote',
        description: '获取指数报价数据',
        supportedMarkets: ['HK', 'US'],
        supportedSymbolFormats: ['HSI.HI'],
        execute: jest.fn(),
      };

      const mockAllCapabilities = new Map<string, Map<string, ICapabilityRegistration>>([
        [
          'longport',
          new Map([
            [
              'get-stock-quote',
              {
                providerName: 'longport',
                capability: mockCapability1,
                priority: 1,
                isEnabled: true,
              },
            ],
            [
              'get-stock-basic-info',
              {
                providerName: 'longport',
                capability: mockCapability2,
                priority: 1,
                isEnabled: true,
              },
            ],
            [
              'get-index-quote',
              {
                providerName: 'longport',
                capability: mockCapability3,
                priority: 1,
                isEnabled: true,
              },
            ],
          ]),
        ],
      ]);

      capabilityRegistryService.getAllCapabilities.mockReturnValue(mockAllCapabilities);

      const result = controller.getProviderCapabilities('longport');

      expect(result.capabilities).toHaveLength(3);
      expect(result.capabilities.map(c => c.name)).toEqual([
        'get-stock-quote',
        'get-stock-basic-info',
        'get-index-quote',
      ]);
    });
  });
});
