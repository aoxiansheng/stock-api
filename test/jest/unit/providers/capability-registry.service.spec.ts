/**
 * CapabilityRegistryService 单元测试
 * 测试能力发现功能是否正确排除系统目录
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CapabilityRegistryService } from '../../../../src/providers/capability-registry.service';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs/promises
jest.mock('fs/promises');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('CapabilityRegistryService', () => {
  let service: CapabilityRegistryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CapabilityRegistryService],
    }).compile();

    service = module.get<CapabilityRegistryService>(CapabilityRegistryService);
    
    // 清除所有模拟
    jest.clearAllMocks();
  });

  describe('discoverCapabilities', () => {
    it('应该排除 interfaces 目录', async () => {
      // Arrange - 模拟目录结构
      const mockDirents = [
        { name: 'longport', isDirectory: () => true },
        { name: 'longport-sg', isDirectory: () => true },
        { name: 'interfaces', isDirectory: () => true }, // 应该被排除
        { name: 'node_modules', isDirectory: () => true }, // 应该被排除
        { name: '.hidden', isDirectory: () => true }, // 应该被排除
        { name: 'main-controller.ts', isDirectory: () => false },
      ];

      mockedFs.readdir.mockResolvedValue(mockDirents as any);
      
      // Mock stat 用于检查 capabilities 目录是否存在
      mockedFs.stat.mockImplementation(async (dirPath: string) => {
        const pathStr = dirPath.toString();
        if (pathStr.includes('longport/capabilities') || pathStr.includes('longport-sg/capabilities')) {
          return { isDirectory: () => true } as any;
        }
        throw new Error('Directory not found');
      });

      // Mock readdir for capabilities directories
      mockedFs.readdir.mockImplementation(async (dirPath: string) => {
        const pathStr = dirPath.toString();
        if (pathStr.includes('capabilities')) {
          return ['get-stock-quote.ts', 'get-stock-basic-info.ts'] as any;
        }
        return mockDirents as any;
      });

      // Spy on loadProviderCapabilities to verify it's only called for valid providers
      const loadProviderCapabilitiesSpy = jest.spyOn(service as any, 'loadProviderCapabilities');
      loadProviderCapabilitiesSpy.mockImplementation(async () => {});

      // Act
      await service.discoverCapabilities();

      // Assert - 验证只有有效的提供商目录被处理
      expect(loadProviderCapabilitiesSpy).toHaveBeenCalledTimes(2);
      expect(loadProviderCapabilitiesSpy).toHaveBeenCalledWith('longport');
      expect(loadProviderCapabilitiesSpy).toHaveBeenCalledWith('longport-sg');
      
      // 验证系统目录没有被处理
      expect(loadProviderCapabilitiesSpy).not.toHaveBeenCalledWith('interfaces');
      expect(loadProviderCapabilitiesSpy).not.toHaveBeenCalledWith('node_modules');
      expect(loadProviderCapabilitiesSpy).not.toHaveBeenCalledWith('.hidden');
    });

    it('应该正确处理空目录', async () => {
      // Arrange
      mockedFs.readdir.mockResolvedValue([]);

      // Act & Assert - 不应该抛出异常
      await expect(service.discoverCapabilities()).resolves.not.toThrow();
    });

    it('应该处理文件系统错误', async () => {
      // Arrange
      mockedFs.readdir.mockRejectedValue(new Error('Permission denied'));

      // Act & Assert - 不应该抛出异常
      await expect(service.discoverCapabilities()).resolves.not.toThrow();
    });
  });

  describe('registerCapability', () => {
    it('应该成功注册能力', () => {
      // Arrange
      const mockCapability = {
        name: 'get-stock-quote',
        description: 'Test capability',
        supportedMarkets: ['HK'],
        supportedSymbolFormats: ['HK_FORMAT'],
        execute: jest.fn(),
      };

      // Act
      service.registerCapability('test-provider', mockCapability, 1, true);

      // Assert
      const registeredCapability = service.getCapability('test-provider', 'get-stock-quote');
      expect(registeredCapability).toBe(mockCapability);
    });
  });

  describe('getCapability', () => {
    it('应该返回已注册且启用的能力', () => {
      // Arrange
      const mockCapability = {
        name: 'get-stock-quote',
        description: 'Test capability',
        supportedMarkets: ['HK'],
        supportedSymbolFormats: ['HK_FORMAT'],
        execute: jest.fn(),
      };
      service.registerCapability('test-provider', mockCapability, 1, true);

      // Act
      const result = service.getCapability('test-provider', 'get-stock-quote');

      // Assert
      expect(result).toBe(mockCapability);
    });

    it('应该对禁用的能力返回 null', () => {
      // Arrange
      const mockCapability = {
        name: 'get-stock-quote',
        description: 'Test capability',
        supportedMarkets: ['HK'],
        supportedSymbolFormats: ['HK_FORMAT'],
        execute: jest.fn(),
      };
      service.registerCapability('test-provider', mockCapability, 1, false);

      // Act
      const result = service.getCapability('test-provider', 'get-stock-quote');

      // Assert
      expect(result).toBeNull();
    });

    it('应该对不存在的能力返回 null', () => {
      // Act
      const result = service.getCapability('nonexistent-provider', 'nonexistent-capability');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getBestProvider', () => {
    it('应该返回最高优先级的提供商', () => {
      // Arrange
      const capability1 = {
        name: 'get-stock-quote',
        description: 'Test capability 1',
        supportedMarkets: ['HK'],
        supportedSymbolFormats: ['HK_FORMAT'],
        execute: jest.fn(),
      };
      const capability2 = {
        name: 'get-stock-quote',
        description: 'Test capability 2',
        supportedMarkets: ['HK'],
        supportedSymbolFormats: ['HK_FORMAT'],
        execute: jest.fn(),
      };

      service.registerCapability('provider1', capability1, 2, true);
      service.registerCapability('provider2', capability2, 1, true);

      // Act
      const result = service.getBestProvider('get-stock-quote', 'HK');

      // Assert
      expect(result).toBe('provider2'); // 优先级更高（数字更小）
    });

    it('应该考虑市场支持', () => {
      // Arrange
      const capability1 = {
        name: 'get-stock-quote',
        description: 'Test capability 1',
        supportedMarkets: ['US'],
        supportedSymbolFormats: ['US_FORMAT'],
        execute: jest.fn(),
      };
      const capability2 = {
        name: 'get-stock-quote',
        description: 'Test capability 2',
        supportedMarkets: ['HK'],
        supportedSymbolFormats: ['HK_FORMAT'],
        execute: jest.fn(),
      };

      service.registerCapability('provider1', capability1, 1, true);
      service.registerCapability('provider2', capability2, 2, true);

      // Act
      const result = service.getBestProvider('get-stock-quote', 'HK');

      // Assert
      expect(result).toBe('provider2'); // 只有 provider2 支持 HK 市场
    });

    it('应该对没有匹配的提供商返回 null', () => {
      // Act
      const result = service.getBestProvider('nonexistent-capability');

      // Assert
      expect(result).toBeNull();
    });
  });
});