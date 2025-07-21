import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DataMapperService } from '../../../../src/core/data-mapper/data-mapper.service';
import { DataMappingRepository } from '../../../../src/core/data-mapper/repositories/data-mapper.repository';
import { CreateDataMappingDto } from '../../../../src/core/data-mapper/dto/create-data-mapping.dto';
import { UpdateDataMappingDto, ParseJsonDto, FieldSuggestionDto } from '../../../../src/core/data-mapper/dto/update-data-mapping.dto';
import { DataMappingQueryDto } from '../../../../src/core/data-mapper/dto/data-mapping-query.dto';

describe('DataMapperService', () => {
  let service: DataMapperService;
  let repository: jest.Mocked<DataMappingRepository>;

  const mockDataMappingDocument = {
    _id: '507f1f77bcf86cd799439011',
    name: 'LongPort Stock Quote Mapping',
    provider: 'longport',
    ruleListType: 'quote_fields',
    description: 'Maps LongPort stock quote data to standard format',
    fieldMappings: [
      {
        sourceField: 'last_done',
        targetField: 'lastPrice',
        description: 'Last traded price',
      },
      {
        sourceField: 'volume',
        targetField: 'volume',
        description: 'Trading volume',
      },
    ],
    isActive: true,
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findAllIncludingDeactivated: jest.fn(),
      findByProvider: jest.fn(),
      findPaginated: jest.fn(),
      findById: jest.fn(),
      findByProviderAndType: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn(),
      activateById: jest.fn(),
      deactivateById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataMapperService,
        {
          provide: DataMappingRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<DataMapperService>(DataMapperService);
    repository = module.get(DataMappingRepository);
  });

  describe('create', () => {
    it('should create mapping rule successfully', async () => {
      const createDto: CreateDataMappingDto = {
        name: 'Test Mapping',
        provider: 'test-provider',
        ruleListType: 'quote_fields',
        description: 'Test mapping rule',
        fieldMappings: [
          {
            sourceField: 'price',
            targetField: 'lastPrice',
          },
        ],
      };

      repository.create.mockResolvedValue(mockDataMappingDocument);

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(repository.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return all active mapping rules', async () => {
      repository.findAll.mockResolvedValue([mockDataMappingDocument]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toBeDefined();
      expect(repository.findAll).toHaveBeenCalled();
    });
  });

  describe('findAllIncludingDeactivated', () => {
    it('should return all mapping rules including deactivated ones', async () => {
      const deactivatedRule = { ...mockDataMappingDocument, isActive: false };
      repository.findAllIncludingDeactivated.mockResolvedValue([
        mockDataMappingDocument,
        deactivatedRule,
      ]);

      const result = await service.findAllIncludingDeactivated();

      expect(result).toHaveLength(2);
      expect(repository.findAllIncludingDeactivated).toHaveBeenCalled();
    });
  });

  describe('findByProvider', () => {
    it('should return mapping rules for specific provider', async () => {
      repository.findByProvider.mockResolvedValue([mockDataMappingDocument]);

      const result = await service.findByProvider('longport');

      expect(result).toHaveLength(1);
      expect(repository.findByProvider).toHaveBeenCalledWith('longport');
    });
  });

  describe('findPaginated', () => {
    it('should return paginated mapping rules', async () => {
      const query: DataMappingQueryDto = {
        page: 1,
        limit: 10,
        provider: 'longport',
      };

      repository.findPaginated.mockResolvedValue({
        items: [mockDataMappingDocument],
        total: 1,
      });

      const result = await service.findPaginated(query);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('findOne', () => {
    it('should return mapping rule when found', async () => {
      repository.findById.mockResolvedValue(mockDataMappingDocument);

      const result = await service.findOne('507f1f77bcf86cd799439011');

      expect(result).toBeDefined();
      expect(repository.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    it('should throw NotFoundException when mapping rule not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getMappingRules', () => {
    it('should return mapping rules for provider and data type', async () => {
      repository.findByProviderAndType.mockResolvedValue([mockDataMappingDocument]);

      const result = await service.getMappingRules('longport', 'get-stock-quote');

      expect(result).toHaveLength(1);
      expect(repository.findByProviderAndType).toHaveBeenCalledWith('longport', 'get-stock-quote');
    });
  });

  describe('parseJson', () => {
    it('should parse valid JSON string successfully', async () => {
      const parseDto: ParseJsonDto = {
        jsonString: '{"price": 100.50, "volume": 1000, "nested": {"value": "test"}}',
      };

      const result = await service.parseJson(parseDto);

      expect(result.fields).toContain('price');
      expect(result.fields).toContain('volume');
      expect(result.fields).toContain('nested.value');
      expect(result.structure).toEqual({
        price: 100.50,
        volume: 1000,
        nested: { value: 'test' },
      });
    });

    it('should parse valid JSON data successfully', async () => {
      const parseDto: ParseJsonDto = {
        jsonData: {
          price: 100.50,
          volume: 1000,
          nested: { value: 'test' },
        },
      };

      const result = await service.parseJson(parseDto);

      expect(result.fields).toContain('price');
      expect(result.fields).toContain('volume');
      expect(result.fields).toContain('nested.value');
    });

    it('should handle invalid JSON string', async () => {
      const parseDto: ParseJsonDto = {
        jsonString: '{"invalid": json}',
      };

      await expect(service.parseJson(parseDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should handle missing both jsonData and jsonString', async () => {
      const parseDto: ParseJsonDto = {};

      await expect(service.parseJson(parseDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('update', () => {
    it('should update mapping rule successfully', async () => {
      const updateDto: UpdateDataMappingDto = {
        description: 'Updated description',
      };

      repository.updateById.mockResolvedValue(mockDataMappingDocument);

      const result = await service.update('507f1f77bcf86cd799439011', updateDto);

      expect(result).toBeDefined();
      expect(repository.updateById).toHaveBeenCalledWith('507f1f77bcf86cd799439011', updateDto);
    });

    it('should throw NotFoundException when mapping rule not found', async () => {
      const updateDto: UpdateDataMappingDto = {
        description: 'Updated description',
      };

      repository.updateById.mockResolvedValue(null);

      await expect(service.update('nonexistent-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('activate', () => {
    it('should activate mapping rule successfully', async () => {
      repository.activate.mockResolvedValue(mockDataMappingDocument);

      const result = await service.activate('507f1f77bcf86cd799439011');

      expect(result).toBeDefined();
      expect(repository.activate).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });
  });

  describe('deactivate', () => {
    it('should deactivate mapping rule successfully', async () => {
      repository.deactivate.mockResolvedValue(mockDataMappingDocument);

      const result = await service.deactivate('507f1f77bcf86cd799439011');

      expect(result).toBeDefined();
      expect(repository.deactivate).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });
  });

  describe('remove', () => {
    it('should remove mapping rule successfully', async () => {
      repository.deleteById.mockResolvedValue(mockDataMappingDocument);

      const result = await service.remove('507f1f77bcf86cd799439011');

      expect(result).toBeDefined();
      expect(repository.deleteById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    it('should throw NotFoundException when mapping rule not found', async () => {
      repository.deleteById.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('applyMappingRule', () => {
    beforeEach(() => {
      repository.findById.mockResolvedValue(mockDataMappingDocument);
    });

    it('should apply mapping rule to transform secu_quote array data', async () => {
      const rawData = {
        secu_quote: [
          {
            last_done: 150.75,
            volume: 5000,
            extra_field: 'ignored',
          },
        ],
      };

      const result = await service.applyMappingRule('507f1f77bcf86cd799439011', rawData);

      expect(result).toEqual([
        {
          lastPrice: 150.75,
          volume: 5000,
        },
      ]);
    });

    it('should apply mapping rule to transform basic_info array data', async () => {
      const rawData = {
        basic_info: [
          {
            last_done: 150.75,
            volume: 5000,
          },
        ],
      };

      const result = await service.applyMappingRule('507f1f77bcf86cd799439011', rawData);

      expect(result).toEqual([
        {
          lastPrice: 150.75,
          volume: 5000,
        },
      ]);
    });

    it('should handle single object data transformation', async () => {
      const rawData = {
        last_done: 150.75,
        volume: 5000,
        extra_field: 'ignored',
      };

      const result = await service.applyMappingRule('507f1f77bcf86cd799439011', rawData);

      // For single object, the service returns an array with one item
      expect(result).toEqual([{
        lastPrice: 150.75,
        volume: 5000,
      }]);
    });

    it('should handle invalid mapping rule ID', async () => {
      repository.findById.mockResolvedValue(null);

      const rawData = { test: 'data' };

      await expect(
        service.applyMappingRule('invalid-id', rawData)
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle missing source fields gracefully', async () => {
      const rawData = {
        volume: 5000,
        // missing last_done
      };

      const result = await service.applyMappingRule('507f1f77bcf86cd799439011', rawData);

      // For single object, the service returns an array with one item
      expect(result).toEqual([{
        volume: 5000,
        // lastPrice should be undefined/missing since source field is missing
      }]);
    });
  });

  describe('testMappingRule', () => {
    it('should test mapping rule by applying it to test data', async () => {
      const testDto = {
        ruleId: '507f1f77bcf86cd799439011',
        testData: {
          last_done: 100.50,
          volume: 1000,
        },
      };

      // Mock findOne method to return rule
      repository.findById.mockResolvedValue(mockDataMappingDocument);

      const result = await service.testMappingRule(testDto);

      expect(result.ruleId).toBe('507f1f77bcf86cd799439011');
      expect(result.ruleName).toBe('LongPort Stock Quote Mapping');
      expect(result).toHaveProperty('transformedData');
      expect(result.success).toBe(true);
      expect(result.message).toBe('映射规则测试成功');
    });
  });

  describe('mapData', () => {
    it('should apply mapping using interface method', async () => {
      repository.findById.mockResolvedValue(mockDataMappingDocument);

      const rawData = {
        last_done: 150.75,
        volume: 5000,
      };

      const result = await service.mapData(rawData, '507f1f77bcf86cd799439011');

      // mapData 方法实际上是调用 applyMappingRule，返回的是数组
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        lastPrice: 150.75,
        volume: 5000,
      });
    });
  });

  describe('saveMappingRule', () => {
    it('should save mapping rule using interface method', async () => {
      const rule = {
        name: 'Test Rule',
        provider: 'test',
        ruleListType: 'quote_fields',
        fieldMappings: [],
      };

      repository.create.mockResolvedValue(mockDataMappingDocument);

      await service.saveMappingRule(rule);

      expect(repository.create).toHaveBeenCalledWith(rule);
    });
  });

  describe('private helper methods', () => {
    describe('extractFields', () => {
      it('should extract nested field paths correctly', () => {
        const data = {
          simple: 'value',
          nested: {
            level1: 'value1',
            level2: {
              deep: 'deepValue',
            },
          },
          array: [{ item: 'arrayValue' }],
        };

        const paths = (service as any).extractFields(data);

        expect(paths).toContain('simple');
        expect(paths).toContain('nested.level1');
        expect(paths).toContain('nested.level2.deep');
        expect(paths).toContain('array[0].item');
      });
    });

    // Note: 私有方法 getValueFromPath 的功能已经通过公共方法测试得到验证
    // 如 applyMappingRule、testMappingRule 等测试都在正常工作
    // 按照最佳实践，不应该直接测试私有方法
  });
});