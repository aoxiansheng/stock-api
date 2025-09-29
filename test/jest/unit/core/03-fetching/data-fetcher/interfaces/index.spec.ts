/**
 * DataFetcher Interfaces Index 模块导出测试
 * 测试interfaces/index.ts的导出功能和模块完整性
 */

import * as DataFetcherInterfaces from '@core/03-fetching/data-fetcher/interfaces';
import {
  DataFetchParams,
  RawDataResult,
  IDataFetcher
} from '@core/03-fetching/data-fetcher/interfaces';

describe('DataFetcher Interfaces Index Module', () => {
  describe('module exports', () => {
    it('should export interfaces module successfully', () => {
      // 验证模块本身能够被导入
      expect(DataFetcherInterfaces).toBeDefined();
      expect(typeof DataFetcherInterfaces).toBe('object');
    });

    it('should allow direct import of interfaces for type usage', () => {
      // 通过实际使用接口来验证它们能被正确导入
      const testParams: DataFetchParams = {
        provider: 'test-provider',
        capability: 'test-capability',
        symbols: ['TEST.XX'],
        requestId: 'test-request-123'
      };

      const testResult: RawDataResult = {
        data: [{ symbol: 'TEST.XX', price: 100 }],
        metadata: {
          provider: 'test-provider',
          capability: 'test-capability',
          processingTimeMs: 1000,
          symbolsProcessed: 1
        }
      };

      // 验证类型定义正确
      expect(testParams.provider).toBe('test-provider');
      expect(testResult.data).toHaveLength(1);
    });

    it('should support interface implementation through import', () => {
      // 验证IDataFetcher接口可以被实现
      class TestImplementation implements IDataFetcher {
        async fetchRawData(params: DataFetchParams): Promise<RawDataResult> {
          return {
            data: [],
            metadata: {
              provider: params.provider,
              capability: params.capability,
              processingTimeMs: 0,
              symbolsProcessed: 0
            }
          };
        }

        async supportsCapability(): Promise<boolean> {
          return true;
        }

        async getProviderContext(): Promise<any> {
          return {};
        }
      }

      const implementation = new TestImplementation();
      expect(implementation).toBeInstanceOf(TestImplementation);
    });
  });

  describe('interface type verification', () => {
    it('should export DataFetchParams with correct type signature', () => {
      // 创建一个符合DataFetchParams接口的对象来验证类型
      const testParams: DataFetchParams = {
        provider: 'test-provider',
        capability: 'test-capability',
        symbols: ['TEST.XX'],
        requestId: 'test-request-123'
      };

      expect(testParams.provider).toBe('test-provider');
      expect(testParams.capability).toBe('test-capability');
      expect(Array.isArray(testParams.symbols)).toBe(true);
      expect(testParams.requestId).toBe('test-request-123');
    });

    it('should export RawDataResult with correct type signature', () => {
      // 创建一个符合RawDataResult接口的对象来验证类型
      const testResult: RawDataResult = {
        data: [{ symbol: 'TEST.XX', price: 100 }],
        metadata: {
          provider: 'test-provider',
          capability: 'test-capability',
          processingTimeMs: 1000,
          symbolsProcessed: 1
        }
      };

      expect(Array.isArray(testResult.data)).toBe(true);
      expect(testResult.metadata.provider).toBe('test-provider');
      expect(typeof testResult.metadata.processingTimeMs).toBe('number');
      expect(typeof testResult.metadata.symbolsProcessed).toBe('number');
    });

    it('should export IDataFetcher interface that can be implemented', () => {
      // 创建一个实现IDataFetcher接口的类来验证接口完整性
      class TestDataFetcher implements IDataFetcher {
        async fetchRawData(params: DataFetchParams): Promise<RawDataResult> {
          return {
            data: [{ symbol: params.symbols[0], test: true }],
            metadata: {
              provider: params.provider,
              capability: params.capability,
              processingTimeMs: 100,
              symbolsProcessed: params.symbols.length
            }
          };
        }

        async supportsCapability(provider: string, capability: string): Promise<boolean> {
          return provider === 'test' && capability === 'test';
        }

        async getProviderContext(provider: string): Promise<any> {
          return { provider, initialized: true };
        }
      }

      const testFetcher = new TestDataFetcher();
      expect(testFetcher).toBeInstanceOf(TestDataFetcher);
      expect(typeof testFetcher.fetchRawData).toBe('function');
      expect(typeof testFetcher.supportsCapability).toBe('function');
      expect(typeof testFetcher.getProviderContext).toBe('function');
    });
  });

  describe('module completeness', () => {
    it('should maintain consistent export structure', () => {
      // 验证导出结构的一致性
      expect(typeof DataFetcherInterfaces).toBe('object');
      expect(DataFetcherInterfaces).not.toBeNull();
    });

    it('should allow re-export pattern validation', () => {
      // 验证index.ts的re-export功能通过实际类型使用
      const testExportUsage: DataFetchParams = {
        provider: 'export-test',
        capability: 'export-capability',
        symbols: ['EXPORT.TEST'],
        requestId: 'export-123'
      };

      expect(testExportUsage.provider).toBe('export-test');
    });
  });

  describe('practical usage validation', () => {
    it('should allow creating valid DataFetchParams through exported interface', () => {
      const params: DataFetchParams = {
        provider: 'longport',
        capability: 'get-stock-quote',
        symbols: ['700.HK', 'AAPL.US'],
        requestId: 'practical-test-123',
        apiType: 'rest',
        options: {
          timeout: 5000,
          retries: 3
        }
      };

      expect(params.provider).toBe('longport');
      expect(params.symbols).toHaveLength(2);
      expect(params.apiType).toBe('rest');
      expect(params.options?.timeout).toBe(5000);
    });

    it('should allow creating valid RawDataResult through exported interface', () => {
      const result: RawDataResult = {
        data: [
          { symbol: '700.HK', price: 320.5, volume: 1000000 },
          { symbol: 'AAPL.US', price: 150.25, volume: 2000000 }
        ],
        metadata: {
          provider: 'longport',
          capability: 'get-stock-quote',
          processingTimeMs: 1500,
          symbolsProcessed: 2,
          failedSymbols: [],
          errors: []
        }
      };

      expect(result.data).toHaveLength(2);
      expect(result.metadata.symbolsProcessed).toBe(2);
      expect(result.metadata.failedSymbols).toEqual([]);
    });

    it('should support interface extension patterns', () => {
      // 验证接口可以被扩展使用
      interface ExtendedDataFetchParams extends DataFetchParams {
        customField: string;
        priority: 'high' | 'normal' | 'low';
      }

      const extendedParams: ExtendedDataFetchParams = {
        provider: 'test-provider',
        capability: 'test-capability',
        symbols: ['TEST.XX'],
        requestId: 'extended-test-123',
        customField: 'custom-value',
        priority: 'high'
      };

      expect(extendedParams.customField).toBe('custom-value');
      expect(extendedParams.priority).toBe('high');
      expect(extendedParams.provider).toBe('test-provider');
    });

    it('should validate index.ts export functionality through import test', () => {
      // 这个测试的存在本身就验证了index.ts的export语句能够正常工作
      // 如果export语句有问题，这个文件的import语句就会失败
      const moduleImportTest = typeof DataFetcherInterfaces;
      expect(moduleImportTest).toBe('object');

      // 通过使用接口创建对象来验证export功能
      const interfaceUsageTest: IDataFetcher = {
        async fetchRawData(params: DataFetchParams): Promise<RawDataResult> {
          return {
            data: [],
            metadata: {
              provider: params.provider,
              capability: params.capability,
              processingTimeMs: 0,
              symbolsProcessed: 0
            }
          };
        },
        async supportsCapability(): Promise<boolean> {
          return false;
        },
        async getProviderContext(): Promise<any> {
          return null;
        }
      };

      expect(typeof interfaceUsageTest.fetchRawData).toBe('function');
    });
  });
});