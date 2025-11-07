import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { SymbolMapperService } from '../../../../../../../src/core/00-prepare/symbol-mapper/services/symbol-mapper.service';
import { SymbolMappingRepository } from '../../../../../../../src/core/00-prepare/symbol-mapper/repositories/symbol-mapping.repository';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import { CreateSymbolMappingDto } from '../../../../../../../src/core/00-prepare/symbol-mapper/dto/create-symbol-mapping.dto';
import { SymbolMappingQueryDto } from '../../../../../../../src/core/00-prepare/symbol-mapper/dto/symbol-mapping-query.dto';
import { UpdateSymbolMappingDto, AddSymbolMappingRuleDto, UpdateSymbolMappingRuleDto } from '../../../../../../../src/core/00-prepare/symbol-mapper/dto/update-symbol-mapping.dto';
import { SymbolMappingResponseDto } from '../../../../../../../src/core/00-prepare/symbol-mapper/dto/symbol-mapping-response.dto';
import { SymbolMappingRuleDocumentType, SymbolMappingRule } from '../../../../../../../src/core/00-prepare/symbol-mapper/schemas/symbol-mapping-rule.schema';
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from '@common/core/exceptions';
// 去监控化：不再依赖事件总线/特性开关/缓存服务



describe('SymbolMapperService', () => {
  let service: SymbolMapperService;
  let mockRepository: jest.Mocked<SymbolMappingRepository>;
  let mockPaginationService: jest.Mocked<PaginationService>;
  // 去监控化：移除 FeatureFlags/EventEmitter/Cache Service 依赖

  const mockObjectId = new Types.ObjectId();
  const mockDate = new Date('2023-01-01T00:00:00Z');

  const mockDocumentData: Partial<SymbolMappingRuleDocumentType> = {
    _id: mockObjectId,
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
      providers: [
        SymbolMapperService,
        {
          provide: SymbolMappingRepository,
          useValue: {
            create: jest.fn(),
            exists: jest.fn(),
            findById: jest.fn(),
            findByDataSource: jest.fn(),
            findPaginated: jest.fn(),
            updateById: jest.fn(),
            deleteById: jest.fn(),
            getDataSources: jest.fn(),
            getMarkets: jest.fn(),
            getSymbolTypes: jest.fn(),
            deleteByDataSource: jest.fn(),
            addSymbolMappingRule: jest.fn(),
            updateSymbolMappingRule: jest.fn(),
            removeSymbolMappingRule: jest.fn(),
            replaceSymbolMappingRule: jest.fn(),
            findAll: jest.fn(),
            findMappingsForSymbols: jest.fn(),
            findAllMappingsForSymbols: jest.fn(),
            watchChanges: jest.fn(),
            getDataSourceVersions: jest.fn(),
          },
        },
        {
          provide: PaginationService,
          useValue: {
            createPaginatedResponseFromQuery: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SymbolMapperService>(SymbolMapperService);
    mockRepository = module.get(SymbolMappingRepository);
    mockPaginationService = module.get(PaginationService);
    // 去监控化：无额外默认行为
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // 去监控化：移除 onModuleInit 相关测试

  describe('createDataSourceMapping', () => {
    it('should create new data source mapping successfully', async () => {
      mockRepository.exists.mockResolvedValue(false);
      mockRepository.create.mockResolvedValue(mockDocumentData as SymbolMappingRuleDocumentType);

      const result = await service.createDataSourceMapping(mockCreateDto);

      expect(mockRepository.exists).toHaveBeenCalledWith('longport');
      expect(mockRepository.create).toHaveBeenCalledWith(mockCreateDto);
      expect(result).toBeInstanceOf(SymbolMappingResponseDto);
      expect(result.dataSourceName).toBe('longport');
      // 去监控化：不再校验事件发射
    });

    it('should throw exception when data source already exists', async () => {
      mockRepository.exists.mockResolvedValue(true);

      await expect(service.createDataSourceMapping(mockCreateDto)).rejects.toThrow();

      expect(mockRepository.create).not.toHaveBeenCalled();
      // 去监控化：不再校验事件发射
    });

    it('should emit failure event on error', async () => {
      mockRepository.exists.mockResolvedValue(false);
      mockRepository.create.mockRejectedValue(new Error('Database error'));

      await expect(service.createDataSourceMapping(mockCreateDto)).rejects.toThrow('Database error');

      // 去监控化：不再校验事件发射
    });
  });

  describe('saveMapping', () => {
    it('should delegate to createDataSourceMapping', async () => {
      mockRepository.exists.mockResolvedValue(false);
      mockRepository.create.mockResolvedValue(mockDocumentData as SymbolMappingRuleDocumentType);

      const payload = {
        ...mockCreateDto,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await service.saveMapping(payload);

      expect(mockRepository.exists).toHaveBeenCalledWith('longport');
      // 修正断言，只检查核心字段，忽略测试中添加的额外字段
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining(mockCreateDto)
      );
    });

    it('should handle errors gracefully', async () => {
      mockRepository.exists.mockRejectedValue(new Error('Database error'));

      await expect(service.saveMapping({
        ...mockCreateDto,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })).rejects.toThrow('Database error');
    });
  });

  describe('getSymbolMappingRule', () => {
    it('should return mapping rules for provider', async () => {
      const mockMapping = {
        SymbolMappingRule: mockDocumentData.SymbolMappingRule,
      };
      mockRepository.findByDataSource.mockResolvedValue(mockMapping as any);

      const result = await service.getSymbolMappingRule('longport');

      expect(mockRepository.findByDataSource).toHaveBeenCalledWith('longport');
      expect(result).toEqual(mockDocumentData.SymbolMappingRule);
    });

    it('should return empty array when provider not found', async () => {
      mockRepository.findByDataSource.mockResolvedValue(null);

      const result = await service.getSymbolMappingRule('non-existent');

      expect(result).toEqual([]);
    });

    it('should handle null SymbolMappingRule field', async () => {
      const mockMapping = {
        SymbolMappingRule: null,
      };
      mockRepository.findByDataSource.mockResolvedValue(mockMapping as any);

      const result = await service.getSymbolMappingRule('longport');

      expect(result).toEqual([]);
    });
  });

  describe('getSymbolMappingById', () => {
    const validObjectId = '507f1f77bcf86cd799439011';

    it('should return mapping by ID', async () => {
      mockRepository.findById.mockResolvedValue(mockDocumentData as SymbolMappingRuleDocumentType);

      const result = await service.getSymbolMappingById(validObjectId);

      expect(mockRepository.findById).toHaveBeenCalledWith(validObjectId);
      expect(result).toBeInstanceOf(SymbolMappingResponseDto);
      expect(result.dataSourceName).toBe('longport');
    });

    it('should throw exception when mapping not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getSymbolMappingById(validObjectId)).rejects.toThrow();
    });
  });

  describe('getSymbolMappingByDataSource', () => {
    it('should return mapping by data source name', async () => {
      mockRepository.findByDataSource.mockResolvedValue(mockDocumentData as SymbolMappingRuleDocumentType);

      const result = await service.getSymbolMappingByDataSource('longport');

      expect(mockRepository.findByDataSource).toHaveBeenCalledWith('longport');
      expect(result).toBeInstanceOf(SymbolMappingResponseDto);
      expect(result.dataSourceName).toBe('longport');
      // 去监控化：不再校验事件发射
    });

    it('should throw exception and emit event when mapping not found', async () => {
      mockRepository.findByDataSource.mockResolvedValue(null);

      await expect(service.getSymbolMappingByDataSource('non-existent')).rejects.toThrow();
      // 去监控化：不再校验事件发射
    });

    it('should propagate database error', async () => {
      mockRepository.findByDataSource.mockRejectedValue(new Error('Database error'));

      await expect(service.getSymbolMappingByDataSource('longport')).rejects.toThrow('Database error');
    });
  });

  describe('getSymbolMappingsPaginated', () => {
    const mockQuery: SymbolMappingQueryDto = {
      page: 1,
      limit: 10,
      dataSourceName: 'longport',
    };

    it('should return paginated results', async () => {
      const mockItems = [mockDocumentData];
      const mockPaginatedResult = {
        items: [SymbolMappingResponseDto.fromLeanObject(mockDocumentData)],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockRepository.findPaginated.mockResolvedValue({
        items: mockItems,
        total: 1,
      });
      mockPaginationService.createPaginatedResponseFromQuery.mockReturnValue(mockPaginatedResult as any);

      const result = await service.getSymbolMappingsPaginated(mockQuery);

      expect(mockRepository.findPaginated).toHaveBeenCalledWith(mockQuery);
      expect(mockPaginationService.createPaginatedResponseFromQuery).toHaveBeenCalled();
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should handle errors gracefully', async () => {
      mockRepository.findPaginated.mockRejectedValue(new Error('Database error'));

      await expect(service.getSymbolMappingsPaginated(mockQuery)).rejects.toThrow('Database error');
    });
  });

  describe('updateSymbolMapping', () => {
    const validObjectId = '507f1f77bcf86cd799439011';
    const updateDto: UpdateSymbolMappingDto = {
      description: 'Updated description',
      version: '1.1.0',
    };

    it('should update mapping successfully', async () => {
      const updatedDocument = { ...mockDocumentData, ...updateDto };
      mockRepository.updateById.mockResolvedValue(updatedDocument as SymbolMappingRuleDocumentType);

      const result = await service.updateSymbolMapping(validObjectId, updateDto);

      expect(mockRepository.updateById).toHaveBeenCalledWith(validObjectId, updateDto);
      expect(result).toBeInstanceOf(SymbolMappingResponseDto);
    });

    it('should throw exception when mapping not found', async () => {
      mockRepository.updateById.mockResolvedValue(null);

      await expect(service.updateSymbolMapping(validObjectId, updateDto)).rejects.toThrow();
    });
  });

  describe('deleteSymbolMapping', () => {
    const validObjectId = '507f1f77bcf86cd799439011';

    it('should delete mapping successfully', async () => {
      mockRepository.deleteById.mockResolvedValue(mockDocumentData as SymbolMappingRuleDocumentType);

      const result = await service.deleteSymbolMapping(validObjectId);

      expect(mockRepository.deleteById).toHaveBeenCalledWith(validObjectId);
      expect(result).toBeInstanceOf(SymbolMappingResponseDto);
      // 去监控化：不再校验事件发射
    });

    it('should throw exception and emit event when mapping not found', async () => {
      mockRepository.deleteById.mockResolvedValue(null);

      await expect(service.deleteSymbolMapping(validObjectId)).rejects.toThrow();
      // 去监控化：不再校验事件发射
    });

    it('should emit failure event on error', async () => {
      mockRepository.deleteById.mockRejectedValue(new Error('Database error'));

      await expect(service.deleteSymbolMapping(validObjectId)).rejects.toThrow('Database error');
      // 去监控化：不再校验事件发射
    });
  });

  describe('getDataSources', () => {
    it('should return list of data sources', async () => {
      const mockDataSources = ['longport', 'iex_cloud', 'twelve_data'];
      mockRepository.getDataSources.mockResolvedValue(mockDataSources);

      const result = await service.getDataSources();

      expect(mockRepository.getDataSources).toHaveBeenCalled();
      expect(result).toEqual(mockDataSources);
    });

    it('should handle errors gracefully', async () => {
      mockRepository.getDataSources.mockRejectedValue(new Error('Database error'));

      await expect(service.getDataSources()).rejects.toThrow('Database error');
    });
  });

  describe('getMarkets', () => {
    it('should return list of markets', async () => {
      const mockMarkets = ['HK', 'US', 'SG'];
      mockRepository.getMarkets.mockResolvedValue(mockMarkets);

      const result = await service.getMarkets();

      expect(mockRepository.getMarkets).toHaveBeenCalled();
      expect(result).toEqual(mockMarkets);
    });
  });

  describe('getSymbolTypes', () => {
    it('should return list of symbol types', async () => {
      const mockSymbolTypes = ['stock', 'etf', 'index'];
      mockRepository.getSymbolTypes.mockResolvedValue(mockSymbolTypes);

      const result = await service.getSymbolTypes();

      expect(mockRepository.getSymbolTypes).toHaveBeenCalled();
      expect(result).toEqual(mockSymbolTypes);
    });
  });

  describe('deleteSymbolMappingsByDataSource', () => {
    it('should delete all mappings for data source', async () => {
      const mockResult = { deletedCount: 3 };
      mockRepository.deleteByDataSource.mockResolvedValue(mockResult);

      const result = await service.deleteSymbolMappingsByDataSource('longport');

      expect(mockRepository.deleteByDataSource).toHaveBeenCalledWith('longport');
      expect(result).toEqual(mockResult);
    });
  });

  describe('addSymbolMappingRule', () => {
    const mockAddDto: AddSymbolMappingRuleDto = {
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

    it('should add mapping rule successfully', async () => {
      mockRepository.addSymbolMappingRule.mockResolvedValue(mockDocumentData as SymbolMappingRuleDocumentType);

      const result = await service.addSymbolMappingRule(mockAddDto);

      expect(mockRepository.addSymbolMappingRule).toHaveBeenCalledWith(
        'longport',
        mockAddDto.symbolMappingRule
      );
      expect(result).toBeInstanceOf(SymbolMappingResponseDto);
      // 去监控化：不再校验事件发射
    });

    it('should throw exception and emit event when data source not found', async () => {
      mockRepository.addSymbolMappingRule.mockResolvedValue(null);

      await expect(service.addSymbolMappingRule(mockAddDto)).rejects.toThrow();
      // 去监控化：不再校验事件发射
    });

    it('should emit failure event on error', async () => {
      mockRepository.addSymbolMappingRule.mockRejectedValue(new Error('Database error'));

      await expect(service.addSymbolMappingRule(mockAddDto)).rejects.toThrow('Database error');
      // 去监控化：不再校验事件发射
    });
  });

  describe('updateSymbolMappingRule', () => {
    const mockUpdateRuleDto: UpdateSymbolMappingRuleDto = {
      dataSourceName: 'longport',
      standardSymbol: '700.HK',
      symbolMappingRule: {
        description: 'Updated Tencent Holdings Limited',
        isActive: false,
      },
    };

    it('should update mapping rule successfully', async () => {
      mockRepository.updateSymbolMappingRule.mockResolvedValue(mockDocumentData as SymbolMappingRuleDocumentType);

      const result = await service.updateSymbolMappingRule(mockUpdateRuleDto);

      expect(mockRepository.updateSymbolMappingRule).toHaveBeenCalledWith(
        'longport',
        '700.HK',
        mockUpdateRuleDto.symbolMappingRule
      );
      expect(result).toBeInstanceOf(SymbolMappingResponseDto);
    });

    it('should throw exception when rule not found', async () => {
      mockRepository.updateSymbolMappingRule.mockResolvedValue(null);

      await expect(service.updateSymbolMappingRule(mockUpdateRuleDto)).rejects.toThrow();
    });
  });

  describe('removeSymbolMappingRule', () => {
    it('should remove mapping rule successfully', async () => {
      mockRepository.removeSymbolMappingRule.mockResolvedValue(mockDocumentData as SymbolMappingRuleDocumentType);

      const result = await service.removeSymbolMappingRule('longport', '700.HK');

      expect(mockRepository.removeSymbolMappingRule).toHaveBeenCalledWith('longport', '700.HK');
      expect(result).toBeInstanceOf(SymbolMappingResponseDto);
    });

    it('should throw exception when data source not found', async () => {
      mockRepository.removeSymbolMappingRule.mockResolvedValue(null);

      await expect(service.removeSymbolMappingRule('non-existent', '700.HK')).rejects.toThrow();
    });
  });

  describe('replaceSymbolMappingRule', () => {
    const newRules: SymbolMappingRule[] = [
      {
        standardSymbol: '0001.HK',
        sdkSymbol: '00001',
        market: 'HK',
        symbolType: 'stock',
        isActive: true,
      },
    ];

    it('should replace mapping rules successfully', async () => {
      mockRepository.replaceSymbolMappingRule.mockResolvedValue(mockDocumentData as SymbolMappingRuleDocumentType);

      const result = await service.replaceSymbolMappingRule('longport', newRules);

      expect(mockRepository.replaceSymbolMappingRule).toHaveBeenCalledWith('longport', newRules);
      expect(result).toBeInstanceOf(SymbolMappingResponseDto);
    });

    it('should throw exception when data source not found', async () => {
      mockRepository.replaceSymbolMappingRule.mockResolvedValue(null);

      await expect(service.replaceSymbolMappingRule('non-existent', newRules)).rejects.toThrow();
    });
  });

  describe('getAllSymbolMappingRule', () => {
    it('should return aggregated mapping rules data', async () => {
      const mockAllMappings = [
        {
          dataSourceName: 'longport',
          SymbolMappingRule: [
            {
              standardSymbol: '700.HK',
              sdkSymbol: '00700',
            },
          ],
          description: 'LongPort provider',
          createdAt: mockDate,
          updatedAt: mockDate,
        },
        {
          dataSourceName: 'iex_cloud',
          SymbolMappingRule: [
            {
              standardSymbol: 'AAPL.US',
              sdkSymbol: 'AAPL',
            },
          ],
          description: 'IEX Cloud provider',
          createdAt: mockDate,
          updatedAt: mockDate,
        },
      ];

      mockRepository.findAll.mockResolvedValue(mockAllMappings as any);

      const result = await service.getAllSymbolMappingRule();

      expect(result).toMatchObject({
        providers: ['longport', 'iex_cloud'],
        totalProviders: 2,
        totalRules: 2,
        rulesByProvider: expect.any(Object),
        summary: expect.objectContaining({
          mostRulesProvider: expect.any(String),
          averageRulesPerProvider: expect.any(Number),
        }),
      });

      expect(mockRepository.findAll).toHaveBeenCalled();
    });

    it('should handle empty mapping rules', async () => {
      mockRepository.findAll.mockResolvedValue([]);

      const result = await service.getAllSymbolMappingRule();

      expect(result).toMatchObject({
        providers: [],
        totalProviders: 0,
        totalRules: 0,
        rulesByProvider: {},
        summary: expect.objectContaining({
          mostRulesProvider: null,
          averageRulesPerProvider: 0,
        }),
      });
    });

    it('should handle errors gracefully', async () => {
      mockRepository.findAll.mockRejectedValue(new Error('Database error'));

      await expect(service.getAllSymbolMappingRule()).rejects.toThrow('Database error');
    });
  });

  // 去监控化：清理缓存能力由缓存模块负责，服务不再暴露 clearCache

  // 去监控化：移除事件清洗/分类/性能监控相关测试
});
