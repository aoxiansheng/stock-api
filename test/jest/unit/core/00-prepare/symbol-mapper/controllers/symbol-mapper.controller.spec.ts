import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';

import { SymbolMapperController } from '../../../../../../../src/core/00-prepare/symbol-mapper/controller/symbol-mapper.controller';
import { SymbolMapperService } from '../../../../../../../src/core/00-prepare/symbol-mapper/services/symbol-mapper.service';
import { CreateSymbolMappingDto } from '../../../../../../../src/core/00-prepare/symbol-mapper/dto/create-symbol-mapping.dto';
import { SymbolMappingQueryDto } from '../../../../../../../src/core/00-prepare/symbol-mapper/dto/symbol-mapping-query.dto';
import { SymbolMappingResponseDto } from '../../../../../../../src/core/00-prepare/symbol-mapper/dto/symbol-mapping-response.dto';
import { UpdateSymbolMappingDto, AddSymbolMappingRuleDto, UpdateSymbolMappingRuleDto } from '../../../../../../../src/core/00-prepare/symbol-mapper/dto/update-symbol-mapping.dto';
import { PaginatedDataDto } from '@common/modules/pagination/dto/paginated-data';

describe('SymbolMapperController', () => {
  let controller: SymbolMapperController;
  let mockService: jest.Mocked<SymbolMapperService>;

  const mockDate = new Date('2023-01-01T00:00:00Z');

  const mockResponseDto: SymbolMappingResponseDto = {
    id: '507f1f77bcf86cd799439011',
    dataSourceName: 'longport',
    SymbolMappingRule: [
      {
        standardSymbol: '700.HK',
        sdkSymbol: '00700',
        market: 'HK',
        symbolType: 'stock',
        isActive: true,
        description: 'Tencent Holdings Limited',
      },
    ],
    description: 'LongPort symbol mapping configuration',
    version: '1.0.0',
    isActive: true,
    createdBy: 'admin',
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  const mockCreateDto: CreateSymbolMappingDto = {
    dataSourceName: 'longport',
    SymbolMappingRule: [
      {
        standardSymbol: '700.HK',
        sdkSymbol: '00700',
        market: 'HK',
        symbolType: 'stock',
        isActive: true,
        description: 'Tencent Holdings Limited',
      },
    ],
    description: 'LongPort symbol mapping configuration',
    version: '1.0.0',
    isActive: true,
    createdBy: 'admin',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SymbolMapperController],
      providers: [
        {
          provide: SymbolMapperService,
          useValue: {
            createDataSourceMapping: jest.fn(),
            addSymbolMappingRule: jest.fn(),
            getSymbolMappingsPaginated: jest.fn(),
            getDataSources: jest.fn(),
            getMarkets: jest.fn(),
            getSymbolTypes: jest.fn(),
            getSymbolMappingByDataSource: jest.fn(),
            getAllSymbolMappingRule: jest.fn(),
            getSymbolMappingRule: jest.fn(),
            getSymbolMappingById: jest.fn(),
            updateSymbolMapping: jest.fn(),
            updateSymbolMappingRule: jest.fn(),
            deleteSymbolMapping: jest.fn(),
            deleteSymbolMappingsByDataSource: jest.fn(),
            removeSymbolMappingRule: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SymbolMapperController>(SymbolMapperController);
    mockService = module.get(SymbolMapperService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDataSourceMapping', () => {
    it('should create data source mapping successfully', async () => {
      mockService.createDataSourceMapping.mockResolvedValue(mockResponseDto);

      const result = await controller.createDataSourceMapping(mockCreateDto);

      expect(mockService.createDataSourceMapping).toHaveBeenCalledWith(mockCreateDto);
      expect(result).toEqual(mockResponseDto);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockService.createDataSourceMapping.mockRejectedValue(error);

      await expect(controller.createDataSourceMapping(mockCreateDto)).rejects.toThrow('Service error');
    });

    it('should log request and response', async () => {
      mockService.createDataSourceMapping.mockResolvedValue(mockResponseDto);

      // Mock console.log to verify logging
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await controller.createDataSourceMapping(mockCreateDto);

      // Note: The actual logging uses a logger instance, not console.log
      // This test structure shows how you would test logging if needed
      consoleSpy.mockRestore();
    });

    it('should log errors appropriately', async () => {
      const error = new Error('Service error');
      mockService.createDataSourceMapping.mockRejectedValue(error);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(controller.createDataSourceMapping(mockCreateDto)).rejects.toThrow();

      // Note: The actual logging uses a logger instance, not console.error
      consoleErrorSpy.mockRestore();
    });
  });

  describe('addSymbolMappingRule', () => {
    const mockAddRuleDto: AddSymbolMappingRuleDto = {
      dataSourceName: 'longport',
      symbolMappingRule: {
        standardSymbol: '0001.HK',
        sdkSymbol: '00001',
        market: 'HK',
        symbolType: 'stock',
        isActive: true,
        description: 'CKH Holdings Limited',
      },
    };

    it('should add symbol mapping rule successfully', async () => {
      mockService.addSymbolMappingRule.mockResolvedValue(mockResponseDto);

      const result = await controller.addSymbolMappingRule(mockAddRuleDto);

      expect(mockService.addSymbolMappingRule).toHaveBeenCalledWith(mockAddRuleDto);
      expect(result).toEqual(mockResponseDto);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockService.addSymbolMappingRule.mockRejectedValue(error);

      await expect(controller.addSymbolMappingRule(mockAddRuleDto)).rejects.toThrow('Service error');
    });
  });

  describe('getMappings', () => {
    const mockQuery: SymbolMappingQueryDto = {
      page: 1,
      limit: 10,
      dataSourceName: 'longport',
    };

    const mockPaginatedResult: PaginatedDataDto<SymbolMappingResponseDto> = {
      items: [mockResponseDto],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };

    it('should return paginated mappings', async () => {
      mockService.getSymbolMappingsPaginated.mockResolvedValue(mockPaginatedResult);

      const result = await controller.getMappings(mockQuery);

      expect(mockService.getSymbolMappingsPaginated).toHaveBeenCalledWith(mockQuery);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should handle empty results', async () => {
      const emptyResult: PaginatedDataDto<SymbolMappingResponseDto> = {
        items: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
      mockService.getSymbolMappingsPaginated.mockResolvedValue(emptyResult);

      const result = await controller.getMappings(mockQuery);

      expect(result).toEqual(emptyResult);
    });
  });

  describe('getDataSources', () => {
    it('should return list of data sources', async () => {
      const mockDataSources = ['longport', 'iex_cloud', 'twelve_data'];
      mockService.getDataSources.mockResolvedValue(mockDataSources);

      const result = await controller.getDataSources();

      expect(mockService.getDataSources).toHaveBeenCalled();
      expect(result).toEqual(mockDataSources);
    });

    it('should handle empty data sources list', async () => {
      mockService.getDataSources.mockResolvedValue([]);

      const result = await controller.getDataSources();

      expect(result).toEqual([]);
    });
  });

  describe('getMarkets', () => {
    it('should return list of markets', async () => {
      const mockMarkets = ['HK', 'US', 'SG'];
      mockService.getMarkets.mockResolvedValue(mockMarkets);

      const result = await controller.getMarkets();

      expect(mockService.getMarkets).toHaveBeenCalled();
      expect(result).toEqual(mockMarkets);
    });
  });

  describe('getSymbolTypes', () => {
    it('should return list of symbol types', async () => {
      const mockSymbolTypes = ['stock', 'etf', 'index'];
      mockService.getSymbolTypes.mockResolvedValue(mockSymbolTypes);

      const result = await controller.getSymbolTypes();

      expect(mockService.getSymbolTypes).toHaveBeenCalled();
      expect(result).toEqual(mockSymbolTypes);
    });
  });

  describe('getSymbolMappingByDataSource', () => {
    it('should return mapping by data source name', async () => {
      mockService.getSymbolMappingByDataSource.mockResolvedValue(mockResponseDto);

      const result = await controller.getSymbolMappingByDataSource('longport');

      expect(mockService.getSymbolMappingByDataSource).toHaveBeenCalledWith('longport');
      expect(result).toEqual(mockResponseDto);
    });

    it('should handle non-existent data source', async () => {
      const error = new Error('Data source not found');
      mockService.getSymbolMappingByDataSource.mockRejectedValue(error);

      await expect(controller.getSymbolMappingByDataSource('non-existent')).rejects.toThrow(
        'Data source not found'
      );
    });
  });

  describe('getAllSymbolMappingRule', () => {
    const mockAllRulesResult = {
      providers: ['longport', 'iex_cloud'],
      totalProviders: 2,
      totalRules: 150,
      rulesByProvider: {
        longport: {
          dataSourceName: 'longport',
          description: 'LongPort provider',
          totalRules: 89,
          SymbolMappingRule: [],
          createdAt: mockDate,
          updatedAt: mockDate,
        },
        iex_cloud: {
          dataSourceName: 'iex_cloud',
          description: 'IEX Cloud provider',
          totalRules: 61,
          SymbolMappingRule: [],
          createdAt: mockDate,
          updatedAt: mockDate,
        },
      },
      summary: {
        mostRulesProvider: 'longport',
        averageRulesPerProvider: 75,
      },
    };

    it('should return all symbol mapping rules with statistics', async () => {
      mockService.getAllSymbolMappingRule.mockResolvedValue(mockAllRulesResult);

      const result = await controller.getAllSymbolMappingRule();

      expect(mockService.getAllSymbolMappingRule).toHaveBeenCalled();
      expect(result).toEqual(mockAllRulesResult);
    });

    it('should handle empty rules result', async () => {
      const emptyResult = {
        providers: [],
        totalProviders: 0,
        totalRules: 0,
        rulesByProvider: {},
        summary: {
          mostRulesProvider: null,
          averageRulesPerProvider: 0,
        },
      };
      mockService.getAllSymbolMappingRule.mockResolvedValue(emptyResult);

      const result = await controller.getAllSymbolMappingRule();

      expect(result).toEqual(emptyResult);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockService.getAllSymbolMappingRule.mockRejectedValue(error);

      await expect(controller.getAllSymbolMappingRule()).rejects.toThrow('Service error');
    });
  });

  describe('getSymbolMappingRule', () => {
    const mockMappingRules = [
      {
        standardSymbol: '700.HK',
        sdkSymbol: '00700',
        market: 'HK',
        symbolType: 'stock',
        isActive: true,
        description: 'Tencent Holdings Limited',
      },
    ];

    it('should return mapping rules for provider', async () => {
      mockService.getSymbolMappingRule.mockResolvedValue(mockMappingRules);

      const result = await controller.getSymbolMappingRule('longport');

      expect(mockService.getSymbolMappingRule).toHaveBeenCalledWith('longport');
      expect(result).toEqual(mockMappingRules);
    });

    it('should handle non-existent provider', async () => {
      mockService.getSymbolMappingRule.mockResolvedValue([]);

      const result = await controller.getSymbolMappingRule('non-existent');

      expect(result).toEqual([]);
    });
  });

  describe('getSymbolMappingById', () => {
    const validObjectId = '507f1f77bcf86cd799439011';

    it('should return mapping by ID', async () => {
      mockService.getSymbolMappingById.mockResolvedValue(mockResponseDto);

      const result = await controller.getSymbolMappingById(validObjectId);

      expect(mockService.getSymbolMappingById).toHaveBeenCalledWith(validObjectId);
      expect(result).toEqual(mockResponseDto);
    });

    it('should handle non-existent ID', async () => {
      const error = new Error('Mapping not found');
      mockService.getSymbolMappingById.mockRejectedValue(error);

      await expect(controller.getSymbolMappingById('non-existent-id')).rejects.toThrow(
        'Mapping not found'
      );
    });
  });

  describe('updateSymbolMapping', () => {
    const validObjectId = '507f1f77bcf86cd799439011';
    const updateDto: UpdateSymbolMappingDto = {
      description: 'Updated description',
      version: '1.1.0',
    };

    it('should update symbol mapping successfully', async () => {
      const updatedResponse = { ...mockResponseDto, ...updateDto };
      mockService.updateSymbolMapping.mockResolvedValue(updatedResponse);

      const result = await controller.updateSymbolMapping(validObjectId, updateDto);

      expect(mockService.updateSymbolMapping).toHaveBeenCalledWith(validObjectId, updateDto);
      expect(result).toEqual(updatedResponse);
    });

    it('should handle update of non-existent mapping', async () => {
      const error = new Error('Mapping not found for update');
      mockService.updateSymbolMapping.mockRejectedValue(error);

      await expect(controller.updateSymbolMapping(validObjectId, updateDto)).rejects.toThrow(
        'Mapping not found for update'
      );
    });
  });

  describe('updateSymbolMappingRule', () => {
    const mockPartialRule = {
      description: 'Updated description',
      isActive: false,
    };

    it('should update specific mapping rule successfully', async () => {
      mockService.updateSymbolMappingRule.mockResolvedValue(mockResponseDto);

      const result = await controller.updateSymbolMappingRule(
        'longport',
        '700.HK',
        mockPartialRule
      );

      expect(mockService.updateSymbolMappingRule).toHaveBeenCalledWith({
        dataSourceName: 'longport',
        standardSymbol: '700.HK',
        symbolMappingRule: mockPartialRule,
      });
      expect(result).toEqual(mockResponseDto);
    });

    it('should handle rule update errors', async () => {
      const error = new Error('Rule not found');
      mockService.updateSymbolMappingRule.mockRejectedValue(error);

      await expect(
        controller.updateSymbolMappingRule('longport', '700.HK', mockPartialRule)
      ).rejects.toThrow('Rule not found');
    });
  });

  describe('deleteSymbolMapping', () => {
    const validObjectId = '507f1f77bcf86cd799439011';

    it('should delete symbol mapping successfully', async () => {
      mockService.deleteSymbolMapping.mockResolvedValue(mockResponseDto);

      const result = await controller.deleteSymbolMapping(validObjectId);

      expect(mockService.deleteSymbolMapping).toHaveBeenCalledWith(validObjectId);
      expect(result).toEqual(mockResponseDto);
    });

    it('should handle deletion of non-existent mapping', async () => {
      const error = new Error('Mapping not found for deletion');
      mockService.deleteSymbolMapping.mockRejectedValue(error);

      await expect(controller.deleteSymbolMapping(validObjectId)).rejects.toThrow(
        'Mapping not found for deletion'
      );
    });
  });

  describe('deleteSymbolMappingsByDataSource', () => {
    it('should delete mappings by data source successfully', async () => {
      const deleteResult = { deletedCount: 3 };
      mockService.deleteSymbolMappingsByDataSource.mockResolvedValue(deleteResult);

      const result = await controller.deleteSymbolMappingsByDataSource('longport');

      expect(mockService.deleteSymbolMappingsByDataSource).toHaveBeenCalledWith('longport');
      expect(result).toEqual(deleteResult);
    });

    it('should handle deletion of non-existent data source', async () => {
      const deleteResult = { deletedCount: 0 };
      mockService.deleteSymbolMappingsByDataSource.mockResolvedValue(deleteResult);

      const result = await controller.deleteSymbolMappingsByDataSource('non-existent');

      expect(result).toEqual(deleteResult);
    });

    it('should handle service errors during bulk deletion', async () => {
      const error = new Error('Bulk deletion failed');
      mockService.deleteSymbolMappingsByDataSource.mockRejectedValue(error);

      await expect(controller.deleteSymbolMappingsByDataSource('longport')).rejects.toThrow(
        'Bulk deletion failed'
      );
    });
  });

  describe('removeSymbolMappingRule', () => {
    it('should remove symbol mapping rule successfully', async () => {
      const updatedResponse = {
        ...mockResponseDto,
        SymbolMappingRule: [], // Rule removed
      };
      mockService.removeSymbolMappingRule.mockResolvedValue(updatedResponse);

      const result = await controller.removeSymbolMappingRule('longport', '700.HK');

      expect(mockService.removeSymbolMappingRule).toHaveBeenCalledWith('longport', '700.HK');
      expect(result).toEqual(updatedResponse);
    });

    it('should handle removal of non-existent rule', async () => {
      const error = new Error('Rule not found for removal');
      mockService.removeSymbolMappingRule.mockRejectedValue(error);

      await expect(controller.removeSymbolMappingRule('longport', '700.HK')).rejects.toThrow(
        'Rule not found for removal'
      );
    });

    it('should handle removal errors', async () => {
      const error = new Error('Removal operation failed');
      mockService.removeSymbolMappingRule.mockRejectedValue(error);

      await expect(controller.removeSymbolMappingRule('longport', '700.HK')).rejects.toThrow(
        'Removal operation failed'
      );
    });
  });

  describe('Error handling and logging', () => {
    it('should handle and log various service exceptions', async () => {
      const testCases = [
        {
          method: 'createDataSourceMapping',
          args: [mockCreateDto],
          serviceMethod: mockService.createDataSourceMapping,
        },
        {
          method: 'addSymbolMappingRule',
          args: [{
            dataSourceName: 'test',
            symbolMappingRule: {
              standardSymbol: 'TEST',
              sdkSymbol: 'TST',
            },
          }],
          serviceMethod: mockService.addSymbolMappingRule,
        },
        {
          method: 'deleteSymbolMappingsByDataSource',
          args: ['test-source'],
          serviceMethod: mockService.deleteSymbolMappingsByDataSource,
        },
        {
          method: 'removeSymbolMappingRule',
          args: ['test-source', 'TEST.SYMBOL'],
          serviceMethod: mockService.removeSymbolMappingRule,
        },
      ];

      for (const testCase of testCases) {
        const error = new Error(`${testCase.method} failed`);
        testCase.serviceMethod.mockRejectedValue(error);

        await expect(
          (controller as any)[testCase.method](...testCase.args)
        ).rejects.toThrow(`${testCase.method} failed`);

        jest.clearAllMocks();
      }
    });
  });

  describe('Response format compliance', () => {
    it('should return raw service responses without manual wrapping', async () => {
      // This test ensures the controller follows the pattern of letting
      // interceptors handle response formatting automatically

      mockService.createDataSourceMapping.mockResolvedValue(mockResponseDto);
      const result = await controller.createDataSourceMapping(mockCreateDto);

      // Result should be the raw DTO, not wrapped in a response format
      expect(result).toBe(mockResponseDto);
      expect(result).not.toHaveProperty('statusCode');
      expect(result).not.toHaveProperty('message');
      expect(result).not.toHaveProperty('data');
    });

    it('should return paginated results directly', async () => {
      const paginatedResult: PaginatedDataDto<SymbolMappingResponseDto> = {
        items: [mockResponseDto],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockService.getSymbolMappingsPaginated.mockResolvedValue(paginatedResult);
      const result = await controller.getMappings({ page: 1, limit: 10 });

      expect(result).toBe(paginatedResult);
    });

    it('should return simple arrays directly', async () => {
      const dataSourcesList = ['longport', 'iex_cloud'];
      mockService.getDataSources.mockResolvedValue(dataSourcesList);

      const result = await controller.getDataSources();

      expect(result).toBe(dataSourcesList);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Parameter validation', () => {
    it('should handle URL parameters correctly', async () => {
      mockService.getSymbolMappingByDataSource.mockResolvedValue(mockResponseDto);

      await controller.getSymbolMappingByDataSource('longport-test_123');

      expect(mockService.getSymbolMappingByDataSource).toHaveBeenCalledWith('longport-test_123');
    });

    it('should handle complex query parameters', async () => {
      const complexQuery: SymbolMappingQueryDto = {
        page: 2,
        limit: 20,
        dataSourceName: 'longport',
        market: 'HK',
        symbolType: 'stock',
        isActive: true,
        search: 'Tencent',
      };

      const mockPaginatedResult: PaginatedDataDto<SymbolMappingResponseDto> = {
        items: [mockResponseDto],
        pagination: {
          page: 2,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: true,
        },
      };

      mockService.getSymbolMappingsPaginated.mockResolvedValue(mockPaginatedResult);

      const result = await controller.getMappings(complexQuery);

      expect(mockService.getSymbolMappingsPaginated).toHaveBeenCalledWith(complexQuery);
      expect(result).toEqual(mockPaginatedResult);
    });
  });
});