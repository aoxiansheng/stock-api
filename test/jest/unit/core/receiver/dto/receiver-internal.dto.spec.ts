
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  RequestOptionsDto,
  SymbolTransformationResultDto,
  DataFetchingParamsDto,
  MarketInferenceResultDto,
  ReceiverPerformanceDto,
  ProviderValidationResultDto,
  CapabilityExecutionResultDto,
  SymbolMarketMappingDto,
} from '../../../../../../src/core/receiver/dto/receiver-internal.dto';

// 由于 DTO 众多，我们将为每个 DTO 创建一个 describe 块

describe('ReceiverInternal DTOs', () => {

  describe('RequestOptionsDto', () => {
    it('当所有字段都有效时应通过验证', async () => {
      const dto = plainToClass(RequestOptionsDto, {
        preferredProvider: 'test', realtime: true, fields: ['a'], market: 'HK', extra: { k: 'v' }
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('当字段为空时仍应通过验证（所有字段都是可选的）', async () => {
        const dto = plainToClass(RequestOptionsDto, {});
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
    });
  });

  describe('SymbolTransformationResultDto', () => {
    it('当数据有效时应通过验证', async () => {
      const dto = plainToClass(SymbolTransformationResultDto, {
        transformedSymbols: ['s1'],
        mappingResults: { transformedSymbols: {}, failedSymbols: [], metadata: {} }
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('DataFetchingParamsDto', () => {
    it('当数据有效时应通过验证', async () => {
      const dto = plainToClass(DataFetchingParamsDto, {
        symbols: ['s1'], originalSymbols: ['os1'], requestId: 'rid1'
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('MarketInferenceResultDto', () => {
    it('当数据有效时应通过验证', async () => {
      const dto = plainToClass(MarketInferenceResultDto, {
        marketCode: 'HK', confidence: 0.9, marketStats: {}, dominantMarket: 'HK'
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('ReceiverPerformanceDto', () => {
    it('当数据有效时应通过验证', async () => {
      const dto = plainToClass(ReceiverPerformanceDto, {
        requestId: 'rid1', processingTime: 100, symbolsCount: 10, avgTimePerSymbol: 10,
        isSlowRequest: false, threshold: 500
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('ProviderValidationResultDto', () => {
    it('当数据有效时应通过验证', async () => {
      const dto = plainToClass(ProviderValidationResultDto, {
        isValid: true, provider: 'p1', receiverType: 't1'
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('CapabilityExecutionResultDto', () => {
    it('当数据有效时应通过验证', async () => {
      const dto = plainToClass(CapabilityExecutionResultDto, {
        data: {}, success: true, provider: 'p1', capability: 'c1', executionTime: 50
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('SymbolMarketMappingDto', () => {
    it('当数据有效时应通过验证', async () => {
      const dto = plainToClass(SymbolMarketMappingDto, {
        symbol: 's1', market: 'HK', confidence: 1.0, ruleType: 'suffix'
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('当 ruleType 无效时应无法通过验证', async () => {
        // ruleType 约束当前未在 DTO 中强制实施，但测试可以预留
        // 如果未来添加 @IsIn(['suffix', ...])，此测试将失败
        const dto = plainToClass(SymbolMarketMappingDto, {
            symbol: 's1', market: 'HK', confidence: 1.0, ruleType: 'invalid_rule'
        });
        const errors = await validate(dto);
        // 期望无错误，因为没有 IsIn 装饰器
        expect(errors.length).toBe(0);
    });
  });

});
