import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { TransformerService } from '../../../../src/core/transformer/transformer.service';
import { DataMapperService } from '../../../../src/core/data-mapper/data-mapper.service';
import { TransformRequestDto } from '../../../../src/core/transformer/dto/transform-request.dto';
import { DataMappingResponseDto } from '../../../../src/core/data-mapper/dto/data-mapping-response.dto';
import { TransformResponseDto } from '../../../../src/core/transformer/dto/transform-response.dto';

describe('TransformerService', () => {
  let service: TransformerService;
  let dataMapperService: jest.Mocked<DataMapperService>;

  const mockMappingRule: DataMappingResponseDto = {
    id: '507f1f77bcf86cd799439011',
    name: 'Test Mapping Rule',
    provider: 'longport',
    ruleListType: 'quote_fields',
    fieldMappings: [
      {
        sourceField: 'last_done',
        targetField: 'lastPrice',
      },
      {
        sourceField: 'volume',
        targetField: 'volume',
      },
    ],
    isActive: true,
    version: '1.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockDataMapperService = {
      getMappingRules: jest.fn(),
      findOne: jest.fn(),
      applyMappingRule: jest.fn(),
      findBestMatchingRule: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransformerService,
        {
          provide: DataMapperService,
          useValue: mockDataMapperService,
        },
      ],
    }).compile();

    service = module.get<TransformerService>(TransformerService);
    dataMapperService = module.get(DataMapperService);
  });

  describe('transform', () => {
    const validRequest: TransformRequestDto = {
      provider: 'longport',
      dataType: 'stock-quote',
      rawData: {
        last_done: 150.75,
        volume: 5000,
        symbol: 'AAPL',
      },
    };

    it('should transform data successfully using provider and dataType', async () => {
      // Mock findBestMatchingRule 来返回映射规则
      dataMapperService.findBestMatchingRule.mockResolvedValue(mockMappingRule);
      dataMapperService.applyMappingRule.mockResolvedValue([{
        lastPrice: 150.75,
        volume: 5000,
      }]);

      const result = await service.transform(validRequest);

      expect(result.transformedData).toEqual([{
        lastPrice: 150.75,
        volume: 5000,
      }]);
      expect(result.metadata.provider).toBe('longport');
      expect(result.metadata.dataType).toBe('stock-quote');
      expect(result.metadata.ruleId).toBe(mockMappingRule.id);
      expect(result.metadata.ruleName).toBe(mockMappingRule.name);
    });

    it('should transform data using specific mappingOutRuleId', async () => {
      const requestWithRuleId: TransformRequestDto = {
        ...validRequest,
        mappingOutRuleId: '507f1f77bcf86cd799439011',
      };

      dataMapperService.findOne.mockResolvedValue(mockMappingRule);
      dataMapperService.applyMappingRule.mockResolvedValue([{ lastPrice: 150.75 }]);

      const result = await service.transform(requestWithRuleId);

      expect(result.transformedData).toEqual([{ lastPrice: 150.75 }]);
      expect(result.metadata.ruleId).toBe(mockMappingRule.id);
      expect(dataMapperService.findOne).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    it('should handle no mapping rule found', async () => {
      // Mock findBestMatchingRule 返回 null 表示没找到规则
      dataMapperService.findBestMatchingRule.mockResolvedValue(null);

      // 应该抛出异常 - 外层会将业务异常包装成 InternalServerErrorException
      await expect(service.transform(validRequest)).rejects.toThrow(InternalServerErrorException);
      await expect(service.transform(validRequest)).rejects.toThrow('数据转换失败: 未找到匹配的映射规则');
    });

    it('should handle transformation errors gracefully', async () => {
      // Mock findBestMatchingRule 抛出数据库错误
      dataMapperService.findBestMatchingRule.mockRejectedValue(new Error('Database error'));

      // 应该抛出异常
      await expect(service.transform(validRequest)).rejects.toThrow();
    });
  });

  describe('transformBatch', () => {
    it('should transform multiple data records successfully', async () => {
      const batchRequest: TransformRequestDto[] = [
        {
          provider: 'longport',
          dataType: 'stock-quote',
          rawData: { last_done: 150.75, volume: 5000 },
        },
        {
          provider: 'longport',
          dataType: 'stock-quote',
          rawData: { last_done: 75.25, volume: 3000 },
        },
      ];

      // Mock findBestMatchingRule 对两次调用都返回映射规则
      dataMapperService.findBestMatchingRule.mockResolvedValue(mockMappingRule);
      dataMapperService.applyMappingRule
        .mockResolvedValueOnce([{ lastPrice: 150.75, volume: 5000 }])
        .mockResolvedValueOnce([{ lastPrice: 75.25, volume: 3000 }]);

      const results = await service.transformBatch({ requests: batchRequest });

      expect(results).toHaveLength(2);
      expect(results[0].transformedData[0].lastPrice).toBe(150.75);
      expect(results[1].transformedData[0].lastPrice).toBe(75.25);
    });

    it('should handle partial failures', async () => {
      const batchRequest: TransformRequestDto[] = [
        {
          provider: 'longport',
          dataType: 'stock-quote',
          rawData: { last_done: 150.75 },
        },
        {
          provider: 'unknown',
          dataType: 'unknown-type',
          rawData: { invalid: 'data' },
        },
      ];

      // Mock findBestMatchingRule: 第一次成功，第二次返回 null
      dataMapperService.findBestMatchingRule
        .mockResolvedValueOnce(mockMappingRule)
        .mockResolvedValueOnce(null);
      
      dataMapperService.applyMappingRule.mockResolvedValue([{ lastPrice: 150.75 }]);

      const results = await service.transformBatch({ requests: batchRequest, options: { continueOnError: true } });

      // 只有成功的转换会在结果中返回
      expect(results).toHaveLength(1);
      expect(results[0].transformedData[0].lastPrice).toBe(150.75);
    });

    it('should stop on first error when continueOnError is false', async () => {
      const batchRequest: TransformRequestDto[] = [
        {
          provider: 'unknown',
          dataType: 'unknown-type',
          rawData: { invalid: 'data' },
        },
        {
          provider: 'longport',
          dataType: 'stock-quote',
          rawData: { last_done: 150.75 },
        },
      ];

      // Mock findBestMatchingRule 第一个请求就抛出异常
      dataMapperService.findBestMatchingRule.mockRejectedValue(new Error('Database connection failed'));

      const results = await service.transformBatch({ requests: batchRequest, options: { continueOnError: false } });

      // 应该返回空数组，因为所有组都失败了
      expect(results).toHaveLength(0);
    });
  });

  describe('findMappingRule', () => {
    it('should find rule by ID when provided', async () => {
      dataMapperService.findOne.mockResolvedValue(mockMappingRule);

      const result = await (service as any).findMappingRule(
        'longport',
        'stock-quote',
        '507f1f77bcf86cd799439011'
      );

      expect(result).toEqual(mockMappingRule);
      expect(dataMapperService.findOne).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    it('should find rule by provider and dataType when ID not provided', async () => {
      dataMapperService.findBestMatchingRule.mockResolvedValue(mockMappingRule);

      const result = await (service as any).findMappingRule(
        'longport',
        'stock-quote'
      );

      expect(result).toEqual(mockMappingRule);
      expect(dataMapperService.findBestMatchingRule).toHaveBeenCalledWith('longport', 'stock-quote');
    });

    it('should return null when no rules found', async () => {
      dataMapperService.findBestMatchingRule.mockResolvedValue(null);

      const result = await (service as any).findMappingRule(
        'unknown',
        'unknown-type'
      );

      expect(result).toBeNull();
      expect(dataMapperService.findBestMatchingRule).toHaveBeenCalledWith('unknown', 'unknown-type');
    });
  });
});