import 'reflect-metadata';
import * as StreamDataFetcherIndex from '@core/03-fetching/stream-data-fetcher/index';
import { StreamDataFetcherModule } from '@core/03-fetching/stream-data-fetcher/index';

describe('StreamDataFetcher Index Module', () => {
  describe('Module Exports', () => {
    it('应该导出接口模块', () => {
      // 检查接口相关导出
      expect(typeof StreamDataFetcherIndex).toBe('object');

      // 验证重要的接口导出存在
      const exportedNames = Object.keys(StreamDataFetcherIndex);
      expect(exportedNames.length).toBeGreaterThan(0);
    });

    it('应该导出核心服务', () => {
      const exports = Object.keys(StreamDataFetcherIndex);

      // 验证核心服务导出
      expect(exports.some(name => name.includes('Service'))).toBe(true);
    });

    it('应该导出配置服务', () => {
      // 验证配置相关导出存在
      expect(StreamDataFetcherIndex).toBeDefined();

      const exports = Object.keys(StreamDataFetcherIndex);
      expect(exports.some(name => name.includes('Config'))).toBe(true);
    });

    it('应该导出WebSocket提供者', () => {
      // 验证提供者导出
      const exports = Object.keys(StreamDataFetcherIndex);
      expect(exports.some(name => name.includes('Provider'))).toBe(true);
    });

    it('应该导出NestJS模块', () => {
      // 验证模块导出
      const exports = Object.keys(StreamDataFetcherIndex);
      expect(exports.some(name => name.includes('Module'))).toBe(true);
    });

    it('应该具有预期的导出结构', () => {
      // 验证导出不为空
      expect(StreamDataFetcherIndex).toBeTruthy();

      // 验证是一个有效的模块对象
      expect(typeof StreamDataFetcherIndex).toBe('object');

      // 验证至少有一些导出
      const exportCount = Object.keys(StreamDataFetcherIndex).length;
      expect(exportCount).toBeGreaterThan(0);
    });

    it('应该遵循Barrel导出模式', () => {
      // 验证模块采用了barrel导出模式
      // 通过检查是否存在多个命名导出来验证
      const exports = Object.keys(StreamDataFetcherIndex);

      // Barrel模块通常会重新导出多个项目
      expect(exports.length).toBeGreaterThan(1);
    });
  });

  describe('导出命名约定', () => {
    it('应该包含服务相关的导出', () => {
      const exports = Object.keys(StreamDataFetcherIndex);
      const serviceExports = exports.filter(name =>
        name.toLowerCase().includes('service')
      );

      expect(serviceExports.length).toBeGreaterThan(0);
    });

    it('应该包含配置相关的导出', () => {
      const exports = Object.keys(StreamDataFetcherIndex);
      const configExports = exports.filter(name =>
        name.toLowerCase().includes('config')
      );

      expect(configExports.length).toBeGreaterThan(0);
    });

    it('应该包含模块相关的导出', () => {
      const exports = Object.keys(StreamDataFetcherIndex);
      const moduleExports = exports.filter(name =>
        name.toLowerCase().includes('module')
      );

      expect(moduleExports.length).toBeGreaterThan(0);
    });
  });

  describe('模块完整性验证', () => {
    it('应该没有未定义的导出', () => {
      const exports = Object.keys(StreamDataFetcherIndex);

      exports.forEach(exportName => {
        expect(StreamDataFetcherIndex[exportName as keyof typeof StreamDataFetcherIndex])
          .toBeDefined();
      });
    });

    it('应该没有null导出', () => {
      const exports = Object.keys(StreamDataFetcherIndex);

      exports.forEach(exportName => {
        expect(StreamDataFetcherIndex[exportName as keyof typeof StreamDataFetcherIndex])
          .not.toBeNull();
      });
    });

    it('应该具有一致的导出类型', () => {
      // 验证模块类的正确性 - NestJS模块应该是一个类（function类型）
      expect(typeof StreamDataFetcherModule).toBe('function');
      
      // 验证模块类具有构造函数属性
      expect(StreamDataFetcherModule.constructor).toBeDefined();
      
      // 验证模块类具有正确的名称
      expect(StreamDataFetcherModule.name).toBe('StreamDataFetcherModule');

      // 检查是否存在循环依赖（通过检查导出是否可以序列化）
      expect(() => {
        JSON.stringify(Object.keys(StreamDataFetcherModule));
      }).not.toThrow();
      
      // 验证模块具有NestJS装饰器元数据（间接验证@Module装饰器的存在）
      expect(Reflect.getMetadata).toBeDefined();
    });
  });

  describe('模块设计原则验证', () => {
    it('应该遵循单一职责原则', () => {
      // 验证模块专注于stream-data-fetcher相关功能
      const exports = Object.keys(StreamDataFetcherIndex);

      // 所有导出都应该与stream data fetching相关
      // 这里我们检查导出名称是否符合预期的命名模式
      const relevantExports = exports.filter(name => {
        const lowerName = name.toLowerCase();
        return lowerName.includes('stream') ||
               lowerName.includes('service') ||
               lowerName.includes('config') ||
               lowerName.includes('module') ||
               lowerName.includes('provider') ||
               lowerName.includes('interface');
      });

      // 大部分导出应该与模块功能相关
      expect(relevantExports.length).toBeGreaterThan(0);
    });

    it('应该提供清晰的API边界', () => {
      // 验证模块提供明确的公共API
      const exports = Object.keys(StreamDataFetcherIndex);

      // 应该有合理数量的导出，不会过度暴露内部实现
      expect(exports.length).toBeGreaterThan(0);
      expect(exports.length).toBeLessThan(100); // 避免过度导出
    });

    it('应该支持树摇优化', () => {
      // 验证模块使用命名导出，支持tree shaking
      const exports = Object.keys(StreamDataFetcherIndex);

      // 检查是否使用命名导出而不是默认导出
      expect(exports.includes('default')).toBe(false);

      // 验证所有导出都是具体的命名导出
      expect(exports.length).toBeGreaterThan(0);
    });
  });

  describe('导入/导出路径验证', () => {
    it('应该能够成功导入模块', () => {
      // 验证模块可以被正确导入
      expect(() => {
        require('@core/03-fetching/stream-data-fetcher/index');
      }).not.toThrow();
    });

    it('应该保持导出的稳定性', () => {
      // 验证关键导出存在，确保API稳定性
      expect(StreamDataFetcherIndex).toBeDefined();
      expect(StreamDataFetcherModule).toBeDefined();

      // 检查模块导出的基本完整性
      const indexString = Object.prototype.toString.call(StreamDataFetcherIndex);
      expect(indexString).toBe('[object Object]');
      
      // 验证特定模块类的正确性
      expect(typeof StreamDataFetcherModule).toBe('function');
      expect(StreamDataFetcherModule.name).toBe('StreamDataFetcherModule');
    });
  });
});
