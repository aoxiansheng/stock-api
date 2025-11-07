import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';

import { SymbolMapperController } from '../../../../../../../src/core/00-prepare/symbol-mapper/controller/symbol-mapper.controller';
import { SymbolMapperService } from '../../../../../../../src/core/00-prepare/symbol-mapper/services/symbol-mapper.service';
import { CreateSymbolMappingDto, SymbolMappingRuleDto } from '../../../../../../../src/core/00-prepare/symbol-mapper/dto/create-symbol-mapping.dto';
import { SymbolMappingQueryDto } from '../../../../../../../src/core/00-prepare/symbol-mapper/dto/symbol-mapping-query.dto';
import { SymbolMappingResponseDto } from '../../../../../../../src/core/00-prepare/symbol-mapper/dto/symbol-mapping-response.dto';
import { UpdateSymbolMappingDto, AddSymbolMappingRuleDto, UpdateSymbolMappingRuleDto } from '../../../../../../../src/core/00-prepare/symbol-mapper/dto/update-symbol-mapping.dto';
import { PaginatedDataDto } from '@common/modules/pagination/dto/paginated-data';
import { ApiKeyAuthGuard } from '@authv2';
import { fail } from 'assert';

describe('SymbolMapperController', () => {
  let controller: SymbolMapperController;
  let mockService: jest.Mocked<SymbolMapperService>;

  const mockDate = new Date('2023-01-01T00:00:00Z');

  const mockSymbolMappingRule: SymbolMappingRuleDto = {
    standardSymbol: '700.HK',
    sdkSymbol: '00700',
    market: 'HK',
    symbolType: 'stock',
    isActive: true,
    description: 'Tencent Holdings Limited',
  };

  const mockResponseDto: SymbolMappingResponseDto = {
    id: '507f1f77bcf86cd799439011',
    dataSourceName: 'longport',
    SymbolMappingRule: [mockSymbolMappingRule],
    description: 'LongPort symbol mapping configuration',
    version: '1.0.0',
    isActive: true,
    createdBy: 'admin',
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  const mockCreateDto: CreateSymbolMappingDto = {
    dataSourceName: 'longport',
    SymbolMappingRule: [mockSymbolMappingRule],
    description: 'LongPort symbol mapping configuration',
    version: '1.0.0',
    isActive: true,
    createdBy: 'admin',
  };

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

  const mockQueryDto: SymbolMappingQueryDto = {
    page: 1,
    limit: 10,
    dataSourceName: 'longport',
  };

  const mockUpdateDto: UpdateSymbolMappingDto = {
    description: 'Updated description',
    version: '1.1.0',
  };

  const mockUpdateRuleDto: UpdateSymbolMappingRuleDto = {
    dataSourceName: 'longport',
    standardSymbol: '700.HK',
    symbolMappingRule: {
      description: 'Updated Tencent Holdings Limited',
      isActive: false,
    },
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

  const mockAllRulesResult = {
    providers: ['longport', 'iex_cloud'],
    totalProviders: 2,
    totalRules: 50,
    rulesByProvider: {
      longport: {
        dataSourceName: 'longport',
        description: 'LongPort mapping rules',
        totalRules: 30,
        SymbolMappingRule: [],
        createdAt: mockDate,
        updatedAt: mockDate,
      },
    },
    summary: {
      mostRulesProvider: 'longport',
      averageRulesPerProvider: 25,
    },
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
    })
      .overrideGuard(ApiKeyAuthGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    controller = module.get<SymbolMapperController>(SymbolMapperController);
    mockService = module.get(SymbolMapperService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor and Setup', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have all required dependencies injected', () => {
      expect(controller['symbolMapperService']).toBeDefined();
      expect(controller['logger']).toBeDefined();
    });
  });

  describe('POST / - createDataSourceMapping', () => {
    it('should create data source mapping successfully', async () => {
      mockService.createDataSourceMapping.mockResolvedValue(mockResponseDto);

      const result = await controller.createDataSourceMapping(mockCreateDto);

      expect(mockService.createDataSourceMapping).toHaveBeenCalledWith(mockCreateDto);
      expect(result).toEqual(mockResponseDto);
    });

    it('should handle creation errors properly', async () => {
      const error = new Error('Creation failed');
      mockService.createDataSourceMapping.mockRejectedValue(error);

      await expect(controller.createDataSourceMapping(mockCreateDto)).rejects.toThrow('Creation failed');
      expect(mockService.createDataSourceMapping).toHaveBeenCalledWith(mockCreateDto);
    });

    it('should log request and response information', async () => {
      mockService.createDataSourceMapping.mockResolvedValue(mockResponseDto);
      const logSpy = jest.spyOn(controller['logger'], 'log').mockImplementation();

      await controller.createDataSourceMapping(mockCreateDto);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('API请求: 创建数据源映射配置'),
        expect.objectContaining({
          dataSourceName: mockCreateDto.dataSourceName,
          rulesCount: mockCreateDto.SymbolMappingRule.length,
        })
      );

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('API响应: 数据源映射配置创建成功'),
        expect.objectContaining({
          id: mockResponseDto.id,
          dataSourceName: mockResponseDto.dataSourceName,
          rulesCount: mockResponseDto.SymbolMappingRule.length,
        })
      );
    });

    it('should log errors when creation fails', async () => {
      const error = new Error('Database error');
      Object.defineProperty(error, 'constructor', { value: { name: 'DatabaseError' } });
      mockService.createDataSourceMapping.mockRejectedValue(error);
      const errorSpy = jest.spyOn(controller['logger'], 'error').mockImplementation();

      await expect(controller.createDataSourceMapping(mockCreateDto)).rejects.toThrow();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('API错误: 数据源映射配置创建失败'),
        expect.objectContaining({
          dataSourceName: mockCreateDto.dataSourceName,
          error: error.message,
          errorType: 'DatabaseError',
        })
      );
    });
  });

  describe('POST /rules - addSymbolMappingRule', () => {
    it('should add symbol mapping rule successfully', async () => {
      mockService.addSymbolMappingRule.mockResolvedValue(mockResponseDto);

      const result = await controller.addSymbolMappingRule(mockAddRuleDto);

      expect(mockService.addSymbolMappingRule).toHaveBeenCalledWith(mockAddRuleDto);
      expect(result).toEqual(mockResponseDto);
    });

    it('should handle rule addition errors properly', async () => {
      const error = new Error('Rule addition failed');
      mockService.addSymbolMappingRule.mockRejectedValue(error);

      await expect(controller.addSymbolMappingRule(mockAddRuleDto)).rejects.toThrow('Rule addition failed');
      expect(mockService.addSymbolMappingRule).toHaveBeenCalledWith(mockAddRuleDto);
    });

    it('should log request and response information for rule addition', async () => {
      mockService.addSymbolMappingRule.mockResolvedValue(mockResponseDto);
      const logSpy = jest.spyOn(controller['logger'], 'log').mockImplementation();

      await controller.addSymbolMappingRule(mockAddRuleDto);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('API请求: 添加映射规则'),
        expect.objectContaining({
          dataSourceName: mockAddRuleDto.dataSourceName,
          standardSymbol: mockAddRuleDto.symbolMappingRule.standardSymbol,
          sdkSymbol: mockAddRuleDto.symbolMappingRule.sdkSymbol,
        })
      );

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('API响应: 映射规则添加成功'),
        expect.objectContaining({
          dataSourceName: mockAddRuleDto.dataSourceName,
          totalRules: mockResponseDto.SymbolMappingRule.length,
        })
      );
    });
  });

  describe('GET / - getMappings', () => {
    it('should get paginated mappings successfully', async () => {
      mockService.getSymbolMappingsPaginated.mockResolvedValue(mockPaginatedResult);

      const result = await controller.getMappings(mockQueryDto);

      expect(mockService.getSymbolMappingsPaginated).toHaveBeenCalledWith(mockQueryDto);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should handle pagination errors', async () => {
      const error = new Error('Pagination failed');
      mockService.getSymbolMappingsPaginated.mockRejectedValue(error);

      await expect(controller.getMappings(mockQueryDto)).rejects.toThrow('Pagination failed');
    });
  });

  describe('GET /data-sources - getDataSources', () => {
    it('should get all data sources successfully', async () => {
      const mockDataSources = ['longport', 'iex_cloud', 'twelve_data'];
      mockService.getDataSources.mockResolvedValue(mockDataSources);

      const result = await controller.getDataSources();

      expect(mockService.getDataSources).toHaveBeenCalled();
      expect(result).toEqual(mockDataSources);
    });

    it('should handle data source retrieval errors', async () => {
      const error = new Error('Data source retrieval failed');
      mockService.getDataSources.mockRejectedValue(error);

      await expect(controller.getDataSources()).rejects.toThrow('Data source retrieval failed');
    });
  });

  describe('GET /markets - getMarkets', () => {
    it('should get all markets successfully', async () => {
      const mockMarkets = ['HK', 'US', 'SG'];
      mockService.getMarkets.mockResolvedValue(mockMarkets);

      const result = await controller.getMarkets();

      expect(mockService.getMarkets).toHaveBeenCalled();
      expect(result).toEqual(mockMarkets);
    });

    it('should handle market retrieval errors', async () => {
      const error = new Error('Market retrieval failed');
      mockService.getMarkets.mockRejectedValue(error);

      await expect(controller.getMarkets()).rejects.toThrow('Market retrieval failed');
    });
  });

  describe('GET /symbol-types - getSymbolTypes', () => {
    it('should get all symbol types successfully', async () => {
      const mockSymbolTypes = ['stock', 'etf', 'index'];
      mockService.getSymbolTypes.mockResolvedValue(mockSymbolTypes);

      const result = await controller.getSymbolTypes();

      expect(mockService.getSymbolTypes).toHaveBeenCalled();
      expect(result).toEqual(mockSymbolTypes);
    });

    it('should handle symbol type retrieval errors', async () => {
      const error = new Error('Symbol type retrieval failed');
      mockService.getSymbolTypes.mockRejectedValue(error);

      await expect(controller.getSymbolTypes()).rejects.toThrow('Symbol type retrieval failed');
    });
  });

  describe('GET /data-source/:dataSourceName - getSymbolMappingByDataSource', () => {
    it('should get mapping by data source successfully', async () => {
      mockService.getSymbolMappingByDataSource.mockResolvedValue(mockResponseDto);

      const result = await controller.getSymbolMappingByDataSource('longport');

      expect(mockService.getSymbolMappingByDataSource).toHaveBeenCalledWith('longport');
      expect(result).toEqual(mockResponseDto);
    });

    it('should handle data source mapping retrieval errors', async () => {
      const error = new Error('Data source mapping not found');
      mockService.getSymbolMappingByDataSource.mockRejectedValue(error);

      await expect(controller.getSymbolMappingByDataSource('invalid')).rejects.toThrow('Data source mapping not found');
    });
  });

  describe('GET /rules - getAllSymbolMappingRule', () => {
    it('should get all symbol mapping rules successfully', async () => {
      mockService.getAllSymbolMappingRule.mockResolvedValue(mockAllRulesResult);
      const logSpy = jest.spyOn(controller['logger'], 'log').mockImplementation();

      const result = await controller.getAllSymbolMappingRule();

      expect(mockService.getAllSymbolMappingRule).toHaveBeenCalled();
      expect(result).toEqual(mockAllRulesResult);

      expect(logSpy).toHaveBeenCalledWith('API请求: 获取所有符号映射规则');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('API响应: 符号映射规则获取成功'),
        expect.objectContaining({
          totalProviders: mockAllRulesResult.totalProviders,
          totalRules: mockAllRulesResult.totalRules,
          mostRulesProvider: mockAllRulesResult.summary.mostRulesProvider,
        })
      );
    });

    it('should handle all rules retrieval errors', async () => {
      const error = new Error('Rules retrieval failed');
      Object.defineProperty(error, 'constructor', { value: { name: 'DatabaseError' } });
      mockService.getAllSymbolMappingRule.mockRejectedValue(error);
      const errorSpy = jest.spyOn(controller['logger'], 'error').mockImplementation();

      await expect(controller.getAllSymbolMappingRule()).rejects.toThrow('Rules retrieval failed');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('API错误: 获取符号映射规则失败'),
        expect.objectContaining({
          error: error.message,
          errorType: 'DatabaseError',
        })
      );
    });
  });

  describe('GET /rules/:provider - getSymbolMappingRule', () => {
    it('should get mapping rules for specific provider successfully', async () => {
      const mockRules = [mockSymbolMappingRule];
      mockService.getSymbolMappingRule.mockResolvedValue(mockRules);

      const result = await controller.getSymbolMappingRule('longport');

      expect(mockService.getSymbolMappingRule).toHaveBeenCalledWith('longport');
      expect(result).toEqual(mockRules);
    });

    it('should handle provider rules retrieval errors', async () => {
      const error = new Error('Provider rules not found');
      mockService.getSymbolMappingRule.mockRejectedValue(error);

      await expect(controller.getSymbolMappingRule('invalid')).rejects.toThrow('Provider rules not found');
    });
  });

  describe('GET /:id - getSymbolMappingById', () => {
    it('should get mapping by ID successfully', async () => {
      const validId = '507f1f77bcf86cd799439011';
      mockService.getSymbolMappingById.mockResolvedValue(mockResponseDto);

      const result = await controller.getSymbolMappingById(validId);

      expect(mockService.getSymbolMappingById).toHaveBeenCalledWith(validId);
      expect(result).toEqual(mockResponseDto);
    });

    it('should handle mapping by ID retrieval errors', async () => {
      const invalidId = 'invalid-id';
      const error = new Error('Mapping not found');
      mockService.getSymbolMappingById.mockRejectedValue(error);

      await expect(controller.getSymbolMappingById(invalidId)).rejects.toThrow('Mapping not found');
    });
  });

  describe('PATCH /:id - updateSymbolMapping', () => {
    it('should update mapping successfully', async () => {
      const validId = '507f1f77bcf86cd799439011';
      const updatedResponse = { ...mockResponseDto, ...mockUpdateDto };
      mockService.updateSymbolMapping.mockResolvedValue(updatedResponse);

      const result = await controller.updateSymbolMapping(validId, mockUpdateDto);

      expect(mockService.updateSymbolMapping).toHaveBeenCalledWith(validId, mockUpdateDto);
      expect(result).toEqual(updatedResponse);
    });

    it('should handle mapping update errors', async () => {
      const validId = '507f1f77bcf86cd799439011';
      const error = new Error('Update failed');
      mockService.updateSymbolMapping.mockRejectedValue(error);

      await expect(controller.updateSymbolMapping(validId, mockUpdateDto)).rejects.toThrow('Update failed');
    });
  });

  describe('PATCH /rules/:dataSourceName/:standardSymbol - updateSymbolMappingRule', () => {
    it('should update specific mapping rule successfully', async () => {
      const dataSourceName = 'longport';
      const standardSymbol = '700.HK';
      const ruleUpdate = { description: 'Updated description' };

      mockService.updateSymbolMappingRule.mockResolvedValue(mockResponseDto);

      const result = await controller.updateSymbolMappingRule(dataSourceName, standardSymbol, ruleUpdate);

      expect(mockService.updateSymbolMappingRule).toHaveBeenCalledWith({
        dataSourceName,
        standardSymbol,
        symbolMappingRule: ruleUpdate,
      });
      expect(result).toEqual(mockResponseDto);
    });

    it('should handle rule update errors', async () => {
      const dataSourceName = 'longport';
      const standardSymbol = '700.HK';
      const ruleUpdate = { description: 'Updated description' };
      const error = new Error('Rule update failed');

      mockService.updateSymbolMappingRule.mockRejectedValue(error);

      await expect(controller.updateSymbolMappingRule(dataSourceName, standardSymbol, ruleUpdate))
        .rejects.toThrow('Rule update failed');
    });
  });

  describe('DELETE /:id - deleteSymbolMapping', () => {
    it('should delete mapping successfully', async () => {
      const validId = '507f1f77bcf86cd799439011';
      mockService.deleteSymbolMapping.mockResolvedValue(mockResponseDto);

      const result = await controller.deleteSymbolMapping(validId);

      expect(mockService.deleteSymbolMapping).toHaveBeenCalledWith(validId);
      expect(result).toEqual(mockResponseDto);
    });

    it('should handle mapping deletion errors', async () => {
      const validId = '507f1f77bcf86cd799439011';
      const error = new Error('Deletion failed');
      mockService.deleteSymbolMapping.mockRejectedValue(error);

      await expect(controller.deleteSymbolMapping(validId)).rejects.toThrow('Deletion failed');
    });
  });

  describe('DELETE /data-source/:dataSourceName - deleteSymbolMappingsByDataSource', () => {
    it('should delete mappings by data source successfully', async () => {
      const dataSourceName = 'longport';
      const deleteResult = { deletedCount: 3 };
      mockService.deleteSymbolMappingsByDataSource.mockResolvedValue(deleteResult);
      const logSpy = jest.spyOn(controller['logger'], 'log').mockImplementation();

      const result = await controller.deleteSymbolMappingsByDataSource(dataSourceName);

      expect(mockService.deleteSymbolMappingsByDataSource).toHaveBeenCalledWith(dataSourceName);
      expect(result).toEqual(deleteResult);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('API请求: 删除数据源映射'),
        expect.objectContaining({ dataSourceName })
      );

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('API响应: 批量删除成功'),
        expect.objectContaining({
          dataSourceName,
          deletedCount: deleteResult.deletedCount,
        })
      );
    });

    it('should handle batch deletion errors', async () => {
      const dataSourceName = 'longport';
      const error = new Error('Batch deletion failed');
      Object.defineProperty(error, 'constructor', { value: { name: 'DatabaseError' } });
      mockService.deleteSymbolMappingsByDataSource.mockRejectedValue(error);
      const errorSpy = jest.spyOn(controller['logger'], 'error').mockImplementation();

      await expect(controller.deleteSymbolMappingsByDataSource(dataSourceName))
        .rejects.toThrow('Batch deletion failed');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('API错误: 批量删除失败'),
        expect.objectContaining({
          dataSourceName,
          error: error.message,
          errorType: 'DatabaseError',
        })
      );
    });
  });

  describe('DELETE /rules/:dataSourceName/:standardSymbol - removeSymbolMappingRule', () => {
    it('should remove specific mapping rule successfully', async () => {
      const dataSourceName = 'longport';
      const standardSymbol = '700.HK';
      mockService.removeSymbolMappingRule.mockResolvedValue(mockResponseDto);
      const logSpy = jest.spyOn(controller['logger'], 'log').mockImplementation();

      const result = await controller.removeSymbolMappingRule(dataSourceName, standardSymbol);

      expect(mockService.removeSymbolMappingRule).toHaveBeenCalledWith(dataSourceName, standardSymbol);
      expect(result).toEqual(mockResponseDto);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('API请求: 删除映射规则'),
        expect.objectContaining({ dataSourceName, standardSymbol })
      );

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('API响应: 映射规则删除成功'),
        expect.objectContaining({
          dataSourceName,
          standardSymbol,
          remainingRules: mockResponseDto.SymbolMappingRule.length,
        })
      );
    });

    it('should handle rule removal errors', async () => {
      const dataSourceName = 'longport';
      const standardSymbol = '700.HK';
      const error = new Error('Rule removal failed');
      Object.defineProperty(error, 'constructor', { value: { name: 'DatabaseError' } });
      mockService.removeSymbolMappingRule.mockRejectedValue(error);
      const errorSpy = jest.spyOn(controller['logger'], 'error').mockImplementation();

      await expect(controller.removeSymbolMappingRule(dataSourceName, standardSymbol))
        .rejects.toThrow('Rule removal failed');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('API错误: 映射规则删除失败'),
        expect.objectContaining({
          dataSourceName,
          standardSymbol,
          error: error.message,
          errorType: 'DatabaseError',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should properly propagate service errors without modification', async () => {
      const originalError = new Error('Original service error');
      originalError.name = 'ServiceError';
      mockService.createDataSourceMapping.mockRejectedValue(originalError);

      await expect(controller.createDataSourceMapping(mockCreateDto)).rejects.toThrow(originalError);
    });

    it('should handle undefined error types gracefully', async () => {
      const errorWithoutConstructor = Object.create(null);
      errorWithoutConstructor.message = 'Error without constructor';
      mockService.createDataSourceMapping.mockRejectedValue(errorWithoutConstructor);

      const errorSpy = jest.spyOn(controller['logger'], 'error').mockImplementation();

      try {
        await controller.createDataSourceMapping(mockCreateDto);
        // Fail the test if it doesn't throw
        fail('Expected createDataSourceMapping to throw but it did not.');
      } catch (error) {
        expect(error).toBe(errorWithoutConstructor);
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('API错误'),
          expect.objectContaining({
            error: errorWithoutConstructor.message,
            errorType: undefined,
          }),
        );
      }
    });
  });

  describe('Logging Behavior', () => {
    it('should log with consistent format across all endpoints', async () => {
      mockService.createDataSourceMapping.mockResolvedValue(mockResponseDto);
      const logSpy = jest.spyOn(controller['logger'], 'log').mockImplementation();

      await controller.createDataSourceMapping(mockCreateDto);

      const logCalls = logSpy.mock.calls;
      expect(logCalls.some(call => typeof call[0] === 'string' && call[0].includes('API请求:'))).toBe(true);
      expect(logCalls.some(call => typeof call[0] === 'string' && call[0].includes('API响应:'))).toBe(true);
    });

    it('should include relevant context information in logs', async () => {
      mockService.addSymbolMappingRule.mockResolvedValue(mockResponseDto);
      const logSpy = jest.spyOn(controller['logger'], 'log').mockImplementation();

      await controller.addSymbolMappingRule(mockAddRuleDto);

      expect(logSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          dataSourceName: expect.any(String),
          standardSymbol: expect.any(String),
          sdkSymbol: expect.any(String),
        })
      );
    });
  });
});
