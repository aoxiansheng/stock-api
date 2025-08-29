import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

import { QueryExecutorFactory } from '../../../../../../../src/core/01-entry/query/factories/query-executor.factory';
import { SymbolQueryExecutor } from '../../../../../../../src/core/01-entry/query/factories/executors/symbol-query.executor';
import { MarketQueryExecutor } from '../../../../../../../src/core/01-entry/query/factories/executors/market-query.executor';
import { QueryType } from '../../../../../../../src/core/01-entry/query/dto/query-types.dto';

describe('QueryExecutorFactory', () => {
  let factory: QueryExecutorFactory;
  let symbolExecutor: jest.Mocked<SymbolQueryExecutor>;
  let marketExecutor: jest.Mocked<MarketQueryExecutor>;

  beforeEach(async () => {
    // 创建模拟的执行器
    symbolExecutor = {
      execute: jest.fn(),
    } as any;

    marketExecutor = {
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryExecutorFactory,
        {
          provide: SymbolQueryExecutor,
          useValue: symbolExecutor,
        },
        {
          provide: MarketQueryExecutor,
          useValue: marketExecutor,
        },
      ],
    }).compile();

    factory = module.get<QueryExecutorFactory>(QueryExecutorFactory);
  });

  describe('create', () => {
    it('应该为BY_SYMBOLS查询类型创建SymbolQueryExecutor', () => {
      // Act
      const executor = factory.create(QueryType.BY_SYMBOLS);

      // Assert
      expect(executor).toBe(symbolExecutor);
    });

    it('应该为BY_MARKET查询类型创建MarketQueryExecutor', () => {
      // Act
      const executor = factory.create(QueryType.BY_MARKET);

      // Assert
      expect(executor).toBe(marketExecutor);
    });

    it('应该对不支持的查询类型抛出BadRequestException', () => {
      // Act & Assert
      expect(() => factory.create('UNSUPPORTED_TYPE' as QueryType))
        .toThrow(BadRequestException);
      expect(() => factory.create('UNSUPPORTED_TYPE' as QueryType))
        .toThrow('不支持的查询类型: UNSUPPORTED_TYPE');
    });
  });

  describe('getSupportedQueryTypes', () => {
    it('应该返回所有支持的查询类型', () => {
      // Act
      const supportedTypes = factory.getSupportedQueryTypes();

      // Assert
      expect(supportedTypes).toEqual([
        QueryType.BY_SYMBOLS,
        QueryType.BY_MARKET,
      ]);
    });
  });

  describe('isQueryTypeSupported', () => {
    it('应该对支持的查询类型返回true', () => {
      // Act & Assert
      expect(factory.isQueryTypeSupported(QueryType.BY_SYMBOLS)).toBe(true);
      expect(factory.isQueryTypeSupported(QueryType.BY_MARKET)).toBe(true);
    });

    it('应该对不支持的查询类型返回false', () => {
      // Act & Assert
      expect(factory.isQueryTypeSupported('UNSUPPORTED_TYPE' as QueryType)).toBe(false);
    });
  });

  describe('扩展性验证', () => {
    it('新增查询类型的工厂应该保持类型安全', () => {
      // 这个测试验证工厂模式的扩展能力
      // 当添加新的查询类型时，TypeScript应该要求相应的case处理

      const supportedTypes = factory.getSupportedQueryTypes();
      
      // 验证当前支持的所有类型都能正确创建执行器
      supportedTypes.forEach(type => {
        expect(() => factory.create(type)).not.toThrow();
      });
    });

    it('工厂应该支持查询类型检查API', () => {
      // 验证工厂提供了足够的API来检查查询类型支持情况
      expect(factory.getSupportedQueryTypes()).toBeInstanceOf(Array);
      expect(typeof factory.isQueryTypeSupported).toBe('function');
    });
  });
});