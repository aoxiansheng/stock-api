import { Test, TestingModule } from '@nestjs/testing';
import { SymbolMapperService } from '../../../../../../src/core/symbol-mapper/services/symbol-mapper.service';
import { SymbolMappingRepository } from '../../../../../../src/core/symbol-mapper/repositories/symbol-mapping.repository';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreateSymbolMappingDto } from '../../../../../../src/core/symbol-mapper/dto/create-symbol-mapping.dto';
import { SymbolMappingResponseDto } from '../../../../../../src/core/symbol-mapper/dto/symbol-mapping-response.dto';
import { SYMBOL_MAPPER_ERROR_MESSAGES } from '../../../../../../src/core/symbol-mapper/constants/symbol-mapper.constants';
import { UpdateSymbolMappingDto, AddSymbolMappingRuleDto, UpdateSymbolMappingRuleDto } from '../../../../../../src/core/symbol-mapper/dto/update-symbol-mapping.dto';
import { SymbolMappingRule } from '../../../../../../src/core/symbol-mapper/schemas/symbol-mapping-rule.schema';
import { SymbolMappingQueryDto } from '../../../../../../src/core/symbol-mapper/dto/symbol-mapping-query.dto';
import { PaginatedDataDto } from '../../../../../../src/common/modules/pagination/dto/paginated-data';
import { FeatureFlags } from '@common/config/feature-flags.config';
// We'll provide FeatureFlags without importing the real class

// Create a proper mock class for FeatureFlags
class MockFeatureFlags {
  symbolMappingCacheEnabled = true;
  dataTransformCacheEnabled = true;
  batchProcessingEnabled = true;
  objectPoolEnabled = true;
  ruleCompilationEnabled = true;
  dynamicLogLevelEnabled = true;
  metricsLegacyModeEnabled = true;
  symbolCacheMaxSize = 2000;
  symbolCacheTtl = 5 * 60 * 1000;
  ruleCacheMaxSize = 100;
  ruleCacheTtl = 10 * 60 * 1000;
  objectPoolSize = 100;
  batchSizeThreshold = 10;
  batchTimeWindowMs = 1;

  getAllFlags() {
    return {
      symbolMappingCacheEnabled: this.symbolMappingCacheEnabled,
      dataTransformCacheEnabled: this.dataTransformCacheEnabled,
      batchProcessingEnabled: this.batchProcessingEnabled,
      objectPoolEnabled: this.objectPoolEnabled,
      ruleCompilationEnabled: this.ruleCompilationEnabled,
      dynamicLogLevelEnabled: this.dynamicLogLevelEnabled,
      metricsLegacyModeEnabled: this.metricsLegacyModeEnabled,
      symbolCacheMaxSize: this.symbolCacheMaxSize,
      symbolCacheTtl: this.symbolCacheTtl,
      ruleCacheMaxSize: this.ruleCacheMaxSize,
      ruleCacheTtl: this.ruleCacheTtl,
      objectPoolSize: this.objectPoolSize,
      batchSizeThreshold: this.batchSizeThreshold,
      batchTimeWindowMs: this.batchTimeWindowMs,
    };
  }

  isCacheOptimizationEnabled() {
    return true;
  }

  isPerformanceOptimizationEnabled() {
    return true;
  }
}
import { MetricsRegistryService } from '../../../../../../src/monitoring/metrics/services/metrics-registry.service';

const mockSymbolMappingRepository = () => ({
  exists: jest.fn(),
  create: jest.fn(),
  findByDataSource: jest.fn(),
  findById: jest.fn(),
  findPaginated: jest.fn(),
  updateById: jest.fn(),
  deleteById: jest.fn(),
  findAllMappingsForSymbols: jest.fn(),
  getDataSources: jest.fn(),
  getMarkets: jest.fn(),
  getSymbolTypes: jest.fn(),
  deleteByDataSource: jest.fn(),
  addSymbolMappingRule: jest.fn(),
  updateSymbolMappingRule: jest.fn(),
  removeSymbolMappingRule: jest.fn(),
  replaceSymbolMappingRule: jest.fn(),
  findAll: jest.fn(),
});

const mockPaginationService = () => ({
  createPaginatedResponseFromQuery: jest.fn(),
});


describe('SymbolMapperService', () => {
  let service: SymbolMapperService;
  let repository: jest.Mocked<ReturnType<typeof mockSymbolMappingRepository>>;
  let paginationService: jest.Mocked<ReturnType<typeof mockPaginationService>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SymbolMapperService,
        {
          provide: SymbolMappingRepository,
          useFactory: mockSymbolMappingRepository,
        },
        {
          provide: PaginationService,
          useFactory: mockPaginationService,
        },
        {
          provide: FeatureFlags,
          useValue: new MockFeatureFlags(),
        },
        {
          provide: MetricsRegistryService,
          useValue: {
            symbolMapperRequestsTotal: { inc: jest.fn() },
            symbolMapperSuccessTotal: { inc: jest.fn() },
            symbolMapperErrorTotal: { inc: jest.fn() },
            symbolMapperProcessingDuration: { observe: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<SymbolMapperService>(SymbolMapperService);
    repository = module.get(SymbolMappingRepository);
    paginationService = module.get(PaginationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('mapSymbol', () => {
    it('should map a symbol successfully', async () => {
      const originalSymbol = 'AAPL.US';
      const fromProvider = 'standard';
      const toProvider = 'LongPort';
      const mockMappingRule = [
        { standardSymbol: 'AAPL.US', sdkSymbol: '700.HK', isActive: true },
      ];
      repository.findByDataSource.mockResolvedValueOnce({
        dataSourceName: toProvider,
        SymbolMappingRule: mockMappingRule,
      });

      const result = await service.mapSymbol(
        originalSymbol,
        fromProvider,
        toProvider,
      );
      expect(result).toEqual('700.HK');
      expect(repository.findByDataSource).toHaveBeenCalledWith(toProvider);
    });

    it('should return original symbol if mapping config not found', async () => {
      const originalSymbol = 'AAPL.US';
      const fromProvider = 'standard';
      const toProvider = 'LongPort';
      repository.findByDataSource.mockResolvedValueOnce(null);

      const result = await service.mapSymbol(
        originalSymbol,
        fromProvider,
        toProvider,
      );
      expect(result).toEqual(originalSymbol);
    });

    it('should return original symbol if no matching rule found', async () => {
      const originalSymbol = 'GOOG.US';
      const fromProvider = 'standard';
      const toProvider = 'LongPort';
      const mockMappingRule = [
        { standardSymbol: 'AAPL.US', sdkSymbol: '700.HK', isActive: true },
      ];
      repository.findByDataSource.mockResolvedValueOnce({
        dataSourceName: toProvider,
        SymbolMappingRule: mockMappingRule,
      });

      const result = await service.mapSymbol(
        originalSymbol,
        fromProvider,
        toProvider,
      );
      expect(result).toEqual(originalSymbol);
    });

    it('should throw error if repository call fails', async () => {
      const originalSymbol = 'AAPL.US';
      const fromProvider = 'standard';
      const toProvider = 'LongPort';
      repository.findByDataSource.mockRejectedValueOnce(new Error('DB Error'));

      await expect(
        service.mapSymbol(originalSymbol, fromProvider, toProvider),
      ).rejects.toThrow('DB Error');
    });
  });

  describe('createDataSourceMapping', () => {
    const createDto: CreateSymbolMappingDto = {
      dataSourceName: 'TestDataSource',
      SymbolMappingRule: [
        { standardSymbol: 'A', sdkSymbol: 'B', isActive: true },
      ],
    };
    const mockCreatedDoc = {
      _id: 'someId',
      ...createDto,
      SymbolMappingRule: createDto.SymbolMappingRule,
    };

    it('should create a new data source mapping', async () => {
      repository.exists.mockResolvedValueOnce(false);
      repository.create.mockResolvedValueOnce(mockCreatedDoc);

      const result = await service.createDataSourceMapping(createDto);
      expect(result).toBeInstanceOf(SymbolMappingResponseDto);
      expect(result.dataSourceName).toEqual(createDto.dataSourceName);
      expect(repository.exists).toHaveBeenCalledWith(createDto.dataSourceName);
      expect(repository.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw ConflictException if data source already exists', async () => {
      repository.exists.mockResolvedValueOnce(true);

      await expect(
        service.createDataSourceMapping(createDto),
      ).rejects.toThrow(ConflictException);
      expect(repository.exists).toHaveBeenCalledWith(createDto.dataSourceName);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should throw error if repository create fails', async () => {
      repository.exists.mockResolvedValueOnce(false);
      repository.create.mockRejectedValueOnce(new Error('DB Error'));

      await expect(
        service.createDataSourceMapping(createDto),
      ).rejects.toThrow('DB Error');
    });
  });

  describe('saveMapping', () => {
    const mockRuleList = {
      dataSourceName: 'TestSave',
      SymbolMappingRule: [
        { standardSymbol: 'S1', sdkSymbol: 'T1', isActive: true },
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should successfully save a new mapping', async () => {
      repository.exists.mockResolvedValue(false);
      repository.create.mockResolvedValue({
        _id: 'newId',
        ...mockRuleList,
        SymbolMappingRule: mockRuleList.SymbolMappingRule,
      });

      await expect(service.saveMapping(mockRuleList)).resolves.toBeUndefined();
      expect(repository.create).toHaveBeenCalledWith(mockRuleList);
    });

    it('should throw an error if createDataSourceMapping fails', async () => {
      repository.exists.mockResolvedValue(true); // Simulate conflict
      await expect(service.saveMapping(mockRuleList)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getSymbolMappingRule', () => {
    const provider = 'TestProvider';
    const mockMapping = {
      dataSourceName: provider,
      SymbolMappingRule: [
        { standardSymbol: 'A', sdkSymbol: 'B', isActive: true },
      ],
    };

    it('should return symbol mapping rules for a given provider', async () => {
      repository.findByDataSource.mockResolvedValueOnce(mockMapping);

      const result = await service.getSymbolMappingRule(provider);
      expect(result).toEqual(mockMapping.SymbolMappingRule);
      expect(repository.findByDataSource).toHaveBeenCalledWith(provider);
    });

    it('should return empty array if no mapping found for provider', async () => {
      repository.findByDataSource.mockResolvedValueOnce(null);

      const result = await service.getSymbolMappingRule(provider);
      expect(result).toEqual([]);
    });

    it('should throw error if repository call fails', async () => {
      repository.findByDataSource.mockRejectedValueOnce(new Error('DB Error'));

      await expect(service.getSymbolMappingRule(provider)).rejects.toThrow(
        'DB Error',
      );
    });
  });

  describe('getSymbolMappingById', () => {
    const id = 'someId';
    const mockMapping = {
      _id: id,
      dataSourceName: 'TestDataSource',
      SymbolMappingRule: [],
    };

    it('should return symbol mapping by ID', async () => {
      repository.findById.mockResolvedValueOnce(mockMapping);

      const result = await service.getSymbolMappingById(id);
      expect(result).toBeInstanceOf(SymbolMappingResponseDto);
      expect(result.id).toEqual(id);
      expect(repository.findById).toHaveBeenCalledWith(id);
    });

    it('should throw NotFoundException if mapping not found by ID', async () => {
      repository.findById.mockResolvedValueOnce(null);

      await expect(service.getSymbolMappingById(id)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.findById).toHaveBeenCalledWith(id);
    });

    it('should throw error if repository call fails', async () => {
      repository.findById.mockRejectedValueOnce(new Error('DB Error'));

      await expect(service.getSymbolMappingById(id)).rejects.toThrow(
        'DB Error',
      );
    });
  });

  describe('getSymbolMappingByDataSource', () => {
    const dataSourceName = 'TestDataSource';
    const mockMapping = {
      _id: 'someId',
      dataSourceName: dataSourceName,
      SymbolMappingRule: [],
    };

    it('should return symbol mapping by data source name', async () => {
      repository.findByDataSource.mockResolvedValueOnce(mockMapping);

      const result = await service.getSymbolMappingByDataSource(dataSourceName);
      expect(result).toBeInstanceOf(SymbolMappingResponseDto);
      expect(result.dataSourceName).toEqual(dataSourceName);
      expect(repository.findByDataSource).toHaveBeenCalledWith(dataSourceName);
    });

    it('should throw NotFoundException if mapping not found by data source name', async () => {
      repository.findByDataSource.mockResolvedValueOnce(null);

      await expect(
        service.getSymbolMappingByDataSource(dataSourceName),
      ).rejects.toThrow(NotFoundException);
      expect(repository.findByDataSource).toHaveBeenCalledWith(dataSourceName);
    });

    it('should throw error if repository call fails', async () => {
      repository.findByDataSource.mockRejectedValueOnce(new Error('DB Error'));

      await expect(
        service.getSymbolMappingByDataSource(dataSourceName),
      ).rejects.toThrow('DB Error');
    });
  });

  describe('getSymbolMappingsPaginated', () => {
    const query: SymbolMappingQueryDto = {
      page: 1,
      limit: 10,
      dataSourceName: 'Test',
    };
    const mockItems = [
      {
        _id: 'id1',
        dataSourceName: 'Test',
        SymbolMappingRule: [{ standardSymbol: 'A', sdkSymbol: 'B' }],
      },
    ];
    const mockPaginatedResponse: PaginatedDataDto<SymbolMappingResponseDto> = {
      items: [
        SymbolMappingResponseDto.fromLeanObject(mockItems[0] as any),
      ],
      pagination: {
        total: 1,
        totalPages: 1,
        page: 1,
        limit: 10,
        hasNext: false,
        hasPrev: false,
      },
    };

    it('should return paginated symbol mappings', async () => {
      repository.findPaginated.mockResolvedValueOnce({
        items: mockItems,
        total: 1,
      });
      paginationService.createPaginatedResponseFromQuery.mockReturnValueOnce(
        mockPaginatedResponse,
      );

      const result = await service.getSymbolMappingsPaginated(query);
      expect(result).toEqual(mockPaginatedResponse);
      expect(repository.findPaginated).toHaveBeenCalledWith(query);
      expect(
        paginationService.createPaginatedResponseFromQuery,
      ).toHaveBeenCalledWith(
        expect.any(Array),
        query,
        1,
      );
    });

    it('should throw error if repository call fails', async () => {
      repository.findPaginated.mockRejectedValueOnce(new Error('DB Error'));

      await expect(service.getSymbolMappingsPaginated(query)).rejects.toThrow(
        'DB Error',
      );
    });
  });

  describe('updateSymbolMapping', () => {
    const id = 'someId';
    const updateDto: UpdateSymbolMappingDto = {
      dataSourceName: 'UpdatedDataSource',
      SymbolMappingRule: [
        { standardSymbol: 'C', sdkSymbol: 'D', isActive: true },
      ],
    };
    const mockUpdatedDoc = {
      _id: id,
      ...updateDto,
      SymbolMappingRule: updateDto.SymbolMappingRule,
    };

    it('should update a symbol mapping successfully', async () => {
      repository.updateById.mockResolvedValueOnce(mockUpdatedDoc);

      const result = await service.updateSymbolMapping(id, updateDto);
      expect(result).toBeInstanceOf(SymbolMappingResponseDto);
      expect(result.dataSourceName).toEqual(updateDto.dataSourceName);
      expect(repository.updateById).toHaveBeenCalledWith(id, updateDto);
    });

    it('should throw NotFoundException if mapping not found', async () => {
      repository.updateById.mockResolvedValueOnce(null);

      await expect(service.updateSymbolMapping(id, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.updateById).toHaveBeenCalledWith(id, updateDto);
    });

    it('should throw error if repository call fails', async () => {
      repository.updateById.mockRejectedValueOnce(new Error('DB Error'));

      await expect(service.updateSymbolMapping(id, updateDto)).rejects.toThrow(
        'DB Error',
      );
    });
  });

  describe('deleteSymbolMapping', () => {
    const id = 'someId';
    const mockDeletedDoc = {
      _id: id,
      dataSourceName: 'DeletedDataSource',
      SymbolMappingRule: [],
    };

    it('should delete a symbol mapping successfully', async () => {
      repository.deleteById.mockResolvedValueOnce(mockDeletedDoc);

      const result = await service.deleteSymbolMapping(id);
      expect(result).toBeInstanceOf(SymbolMappingResponseDto);
      expect(result.id).toEqual(id);
      expect(repository.deleteById).toHaveBeenCalledWith(id);
    });

    it('should throw NotFoundException if mapping not found', async () => {
      repository.deleteById.mockResolvedValueOnce(null);

      await expect(service.deleteSymbolMapping(id)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.deleteById).toHaveBeenCalledWith(id);
    });

    it('should throw error if repository call fails', async () => {
      repository.deleteById.mockRejectedValueOnce(new Error('DB Error'));

      await expect(service.deleteSymbolMapping(id)).rejects.toThrow(
        'DB Error',
      );
    });
  });

  describe('transformSymbols', () => {
    const dataSourceName = 'TestDataSource';
    const standardSymbols = ['AAPL.US', 'GOOG.US'];
    const mockMappingRules = [
      { standardSymbol: 'AAPL.US', sdkSymbol: 'APPL.US', isActive: true },
      { standardSymbol: 'GOOG.US', sdkSymbol: 'GOOG.US', isActive: true },
    ];
    const mockFindAllMappingsResult = {
      rules: mockMappingRules,
      dataSourceName: dataSourceName,
    };

    it('should transform symbols by data source name', async () => {
      repository.findAllMappingsForSymbols.mockResolvedValueOnce(
        mockFindAllMappingsResult,
      );

      const result = await service.transformSymbols(dataSourceName, standardSymbols);
      expect(result.transformedSymbols['AAPL.US']).toEqual('APPL.US');
      expect(result.transformedSymbols['GOOG.US']).toEqual('GOOG.US');
      expect(result.failedSymbols).toEqual([]);
      expect(repository.findAllMappingsForSymbols).toHaveBeenCalledWith(
        dataSourceName,
        standardSymbols,
      );
    });

    it('should handle untransformed symbols', async () => {
      const partialMappingRules = [
        { standardSymbol: 'AAPL.US', sdkSymbol: 'APPL.US', isActive: true },
      ];
      repository.findAllMappingsForSymbols.mockResolvedValueOnce({
        rules: partialMappingRules,
        dataSourceName: dataSourceName,
      });

      const result = await service.transformSymbols(dataSourceName, standardSymbols);
      expect(result.transformedSymbols['AAPL.US']).toEqual('APPL.US');
      expect(result.transformedSymbols['GOOG.US']).toEqual('GOOG.US'); // Untransformed
      expect(result.failedSymbols).toEqual(['GOOG.US']);
    });

    it('should throw error if repository call fails', async () => {
      repository.findAllMappingsForSymbols.mockRejectedValueOnce(
        new Error('DB Error'),
      );

      await expect(
        service.transformSymbols(dataSourceName, standardSymbols),
      ).rejects.toThrow('DB Error');
    });
  });

  describe('transformSymbolsById', () => {
    const mappingInSymbolId = 'someMappingId';
    const standardSymbols = ['AAPL.US', 'GOOG.US'];
    const mockMappingDoc = {
      _id: mappingInSymbolId,
      dataSourceName: 'TestDataSource',
      isActive: true,
      SymbolMappingRule: [
        { standardSymbol: 'AAPL.US', sdkSymbol: 'APPL.US', isActive: true },
        { standardSymbol: 'GOOG.US', sdkSymbol: 'GOOG.US', isActive: true },
        { standardSymbol: 'MSFT', sdkSymbol: 'MSFT.US', isActive: false }, // Inactive rule
      ],
    };

    it('should transform symbols by mapping ID', async () => {
      repository.findById.mockResolvedValueOnce(mockMappingDoc);

      const result = await service.transformSymbolsById(
        mappingInSymbolId,
        standardSymbols,
      );
      expect(result.transformedSymbols['AAPL.US']).toEqual('APPL.US');
      expect(result.transformedSymbols['GOOG.US']).toEqual('GOOG.US');
      expect(result.failedSymbols).toEqual([]);
      expect(repository.findById).toHaveBeenCalledWith(mappingInSymbolId);
    });

    it('should throw NotFoundException if mapping doc not found', async () => {
      repository.findById.mockResolvedValueOnce(null);

      await expect(
        service.transformSymbolsById(mappingInSymbolId, standardSymbols),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if mapping doc is inactive', async () => {
      repository.findById.mockResolvedValueOnce({
        ...mockMappingDoc,
        isActive: false,
      });

      await expect(
        service.transformSymbolsById(mappingInSymbolId, standardSymbols),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle untransformed symbols and inactive rules', async () => {
      repository.findById.mockResolvedValueOnce({
        ...mockMappingDoc,
        SymbolMappingRule: [
          { standardSymbol: 'AAPL.US', sdkSymbol: 'APPL.US', isActive: true },
          { standardSymbol: 'MSFT', sdkSymbol: 'MSFT.US', isActive: false },
        ],
      });

      const result = await service.transformSymbolsById(
        mappingInSymbolId,
        standardSymbols,
      );
      expect(result.transformedSymbols['AAPL.US']).toEqual('APPL.US');
      expect(result.transformedSymbols['GOOG.US']).toEqual('GOOG.US'); // GOOG not in rules
      expect(result.failedSymbols).toEqual(['GOOG.US']);
    });

    it('should throw error if repository call fails', async () => {
      repository.findById.mockRejectedValueOnce(new Error('DB Error'));

      await expect(
        service.transformSymbolsById(mappingInSymbolId, standardSymbols),
      ).rejects.toThrow('DB Error');
    });
  });

  describe('getTransformedSymbolList', () => {
    const dataSourceName = 'TestDataSource';
    const standardSymbols = ['AAPL', 'GOOG'];
    const mockTransformResult = {
      transformedSymbols: { AAPL: 'APPL.US', GOOG: 'GOOG.US' },
      failedSymbols: [],
      processingTimeMs: 10,
    };

    it('should return a list of transformed symbols', async () => {
      jest
        .spyOn(service, 'transformSymbols' as any)
        .mockResolvedValueOnce(mockTransformResult);

      const result = await service.getTransformedSymbolList(
        dataSourceName,
        standardSymbols,
      );
      expect(result).toEqual(['APPL.US', 'GOOG.US']);
      expect(service['transformSymbols']).toHaveBeenCalledWith(
        dataSourceName,
        standardSymbols,
      );
    });

    it('should return original symbol for untransformed ones', async () => {
      jest.spyOn(service, 'transformSymbols' as any).mockResolvedValueOnce({
        transformedSymbols: { AAPL: 'APPL.US', GOOG: 'GOOG.US' },
        failedSymbols: ['GOOG'],
        processingTimeMs: 10,
      });

      const result = await service.getTransformedSymbolList(
        dataSourceName,
        standardSymbols,
      );
      expect(result).toEqual(['APPL.US', 'GOOG.US']);
    });

    it('should throw error if transformSymbols fails', async () => {
      jest
        .spyOn(service, 'transformSymbols' as any)
        .mockRejectedValueOnce(new Error('Transform Error'));

      await expect(
        service.getTransformedSymbolList(dataSourceName, standardSymbols),
      ).rejects.toThrow('Transform Error');
    });
  });

  describe('getDataSources', () => {
    it('should return a list of data sources', async () => {
      const mockDataSources = ['SourceA', 'SourceB'];
      repository.getDataSources.mockResolvedValueOnce(mockDataSources);

      const result = await service.getDataSources();
      expect(result).toEqual(mockDataSources);
      expect(repository.getDataSources).toHaveBeenCalled();
    });

    it('should throw error if repository call fails', async () => {
      repository.getDataSources.mockRejectedValueOnce(new Error('DB Error'));

      await expect(service.getDataSources()).rejects.toThrow('DB Error');
    });
  });

  describe('getMarkets', () => {
    it('should return a list of markets', async () => {
      const mockMarkets = ['MarketA', 'MarketB'];
      repository.getMarkets.mockResolvedValueOnce(mockMarkets);

      const result = await service.getMarkets();
      expect(result).toEqual(mockMarkets);
      expect(repository.getMarkets).toHaveBeenCalled();
    });

    it('should throw error if repository call fails', async () => {
      repository.getMarkets.mockRejectedValueOnce(new Error('DB Error'));

      await expect(service.getMarkets()).rejects.toThrow('DB Error');
    });
  });

  describe('getSymbolTypes', () => {
    it('should return a list of symbol types', async () => {
      const mockSymbolTypes = ['TypeA', 'TypeB'];
      repository.getSymbolTypes.mockResolvedValueOnce(mockSymbolTypes);

      const result = await service.getSymbolTypes();
      expect(result).toEqual(mockSymbolTypes);
      expect(repository.getSymbolTypes).toHaveBeenCalled();
    });

    it('should throw error if repository call fails', async () => {
      repository.getSymbolTypes.mockRejectedValueOnce(new Error('DB Error'));

      await expect(service.getSymbolTypes()).rejects.toThrow('DB Error');
    });
  });

  describe('deleteSymbolMappingsByDataSource', () => {
    const dataSourceName = 'TestDataSource';
    it('should delete mappings by data source name', async () => {
      repository.deleteByDataSource.mockResolvedValueOnce({ deletedCount: 5 });

      const result = await service.deleteSymbolMappingsByDataSource(
        dataSourceName,
      );
      expect(result).toEqual({ deletedCount: 5 });
      expect(repository.deleteByDataSource).toHaveBeenCalledWith(dataSourceName);
    });

    it('should throw error if repository call fails', async () => {
      repository.deleteByDataSource.mockRejectedValueOnce(
        new Error('DB Error'),
      );

      await expect(
        service.deleteSymbolMappingsByDataSource(dataSourceName),
      ).rejects.toThrow('DB Error');
    });
  });

  describe('addSymbolMappingRule', () => {
    const addDto: AddSymbolMappingRuleDto = {
      dataSourceName: 'TestDataSource',
      symbolMappingRule: { standardSymbol: 'NEW', sdkSymbol: 'NEW_OUT', isActive: true },
    };
    const mockUpdatedDoc = {
      _id: 'someId',
      dataSourceName: addDto.dataSourceName,
      SymbolMappingRule: [addDto.symbolMappingRule],
    };

    it('should add a symbol mapping rule successfully', async () => {
      repository.addSymbolMappingRule.mockResolvedValueOnce(mockUpdatedDoc);

      const result = await service.addSymbolMappingRule(addDto);
      expect(result).toBeInstanceOf(SymbolMappingResponseDto);
      expect(result.dataSourceName).toEqual(addDto.dataSourceName);
      expect(repository.addSymbolMappingRule).toHaveBeenCalledWith(
        addDto.dataSourceName,
        addDto.symbolMappingRule,
      );
    });

    it('should throw NotFoundException if data source not found', async () => {
      repository.addSymbolMappingRule.mockResolvedValueOnce(null);

      await expect(service.addSymbolMappingRule(addDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error if repository call fails', async () => {
      repository.addSymbolMappingRule.mockRejectedValueOnce(
        new Error('DB Error'),
      );

      await expect(service.addSymbolMappingRule(addDto)).rejects.toThrow(
        'DB Error',
      );
    });
  });

  describe('updateSymbolMappingRule', () => {
    const updateDto: UpdateSymbolMappingRuleDto = {
      dataSourceName: 'TestDataSource',
      standardSymbol: 'OLD',
      symbolMappingRule: { standardSymbol: 'OLD', sdkSymbol: 'UPDATED', isActive: true },
    };
    const mockUpdatedDoc = {
      _id: 'someId',
      dataSourceName: updateDto.dataSourceName,
      SymbolMappingRule: [updateDto.symbolMappingRule],
    };

    it('should update a symbol mapping rule successfully', async () => {
      repository.updateSymbolMappingRule.mockResolvedValueOnce(mockUpdatedDoc);

      const result = await service.updateSymbolMappingRule(updateDto);
      expect(result).toBeInstanceOf(SymbolMappingResponseDto);
      expect(result.dataSourceName).toEqual(updateDto.dataSourceName);
      expect(repository.updateSymbolMappingRule).toHaveBeenCalledWith(
        updateDto.dataSourceName,
        updateDto.standardSymbol,
        updateDto.symbolMappingRule,
      );
    });

    it('should throw NotFoundException if rule not found', async () => {
      repository.updateSymbolMappingRule.mockResolvedValueOnce(null);

      await expect(service.updateSymbolMappingRule(updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error if repository call fails', async () => {
      repository.updateSymbolMappingRule.mockRejectedValueOnce(
        new Error('DB Error'),
      );

      await expect(service.updateSymbolMappingRule(updateDto)).rejects.toThrow(
        'DB Error',
      );
    });
  });

  describe('removeSymbolMappingRule', () => {
    const dataSourceName = 'TestDataSource';
    const standardSymbol = 'TO_REMOVE';
    const mockUpdatedDoc = {
      _id: 'someId',
      dataSourceName: dataSourceName,
      SymbolMappingRule: [],
    };

    it('should remove a symbol mapping rule successfully', async () => {
      repository.removeSymbolMappingRule.mockResolvedValueOnce(mockUpdatedDoc);

      const result = await service.removeSymbolMappingRule(
        dataSourceName,
        standardSymbol,
      );
      expect(result).toBeInstanceOf(SymbolMappingResponseDto);
      expect(result.dataSourceName).toEqual(dataSourceName);
      expect(repository.removeSymbolMappingRule).toHaveBeenCalledWith(
        dataSourceName,
        standardSymbol,
      );
    });

    it('should throw NotFoundException if data source not found', async () => {
      repository.removeSymbolMappingRule.mockResolvedValueOnce(null);

      await expect(
        service.removeSymbolMappingRule(dataSourceName, standardSymbol),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if repository call fails', async () => {
      repository.removeSymbolMappingRule.mockRejectedValueOnce(
        new Error('DB Error'),
      );

      await expect(
        service.removeSymbolMappingRule(dataSourceName, standardSymbol),
      ).rejects.toThrow('DB Error');
    });
  });

  describe('replaceSymbolMappingRule', () => {
    const dataSourceName = 'TestDataSource';
    const newRules: SymbolMappingRule[] = [
      { standardSymbol: 'R1', sdkSymbol: 'O1', isActive: true },
    ];
    const mockUpdatedDoc = {
      _id: 'someId',
      dataSourceName: dataSourceName,
      SymbolMappingRule: newRules,
    };

    it('should replace symbol mapping rules successfully', async () => {
      repository.replaceSymbolMappingRule.mockResolvedValueOnce(mockUpdatedDoc);

      const result = await service.replaceSymbolMappingRule(
        dataSourceName,
        newRules,
      );
      expect(result).toBeInstanceOf(SymbolMappingResponseDto);
      expect(result.dataSourceName).toEqual(dataSourceName);
      expect(result.SymbolMappingRule).toEqual(newRules);
      expect(repository.replaceSymbolMappingRule).toHaveBeenCalledWith(
        dataSourceName,
        newRules,
      );
    });

    it('should throw NotFoundException if data source not found', async () => {
      repository.replaceSymbolMappingRule.mockResolvedValueOnce(null);

      await expect(
        service.replaceSymbolMappingRule(dataSourceName, newRules),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if repository call fails', async () => {
      repository.replaceSymbolMappingRule.mockRejectedValueOnce(
        new Error('DB Error'),
      );

      await expect(
        service.replaceSymbolMappingRule(dataSourceName, newRules),
      ).rejects.toThrow('DB Error');
    });
  });

  describe('getAllSymbolMappingRule', () => {
    it('should return all symbol mapping rules grouped by provider', async () => {
      const mockAllMappings = [
        {
          dataSourceName: 'ProviderA',
          description: 'Desc A',
          SymbolMappingRule: [
            { standardSymbol: 'A1', sdkSymbol: 'B1' },
            { standardSymbol: 'A2', sdkSymbol: 'B2' },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          dataSourceName: 'ProviderB',
          description: 'Desc B',
          SymbolMappingRule: [{ standardSymbol: 'B1', sdkSymbol: 'C1' }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          dataSourceName: 'ProviderA', // Same provider as first
          description: 'Desc A',
          SymbolMappingRule: [{ standardSymbol: 'A3', sdkSymbol: 'B3' }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      repository.findAll.mockResolvedValueOnce(mockAllMappings);

      const result = await service.getAllSymbolMappingRule();

      expect(result.totalProviders).toBe(2);
      expect(result.totalRules).toBe(4); // 2 from A1 + 1 from B + 1 from A2
      expect(result.providers).toEqual(expect.arrayContaining(['ProviderA', 'ProviderB']));
      expect(result.rulesByProvider['ProviderA'].SymbolMappingRule).toHaveLength(3);
      expect(result.rulesByProvider['ProviderB'].SymbolMappingRule).toHaveLength(1);
      expect(result.summary.mostRulesProvider).toBe('ProviderA');
      expect(result.summary.averageRulesPerProvider).toBe(2);
    });

    it('should handle no mappings found', async () => {
      repository.findAll.mockResolvedValueOnce([]);

      const result = await service.getAllSymbolMappingRule();
      expect(result.totalProviders).toBe(0);
      expect(result.totalRules).toBe(0);
      expect(result.providers).toEqual([]);
      expect(result.rulesByProvider).toEqual({});
      expect(result.summary.mostRulesProvider).toBeNull();
      expect(result.summary.averageRulesPerProvider).toBe(0);
    });

    it('should throw error if repository call fails', async () => {
      repository.findAll.mockRejectedValueOnce(new Error('DB Error'));

      await expect(service.getAllSymbolMappingRule()).rejects.toThrow('DB Error');
    });
  });
});