import { Test, TestingModule } from '@nestjs/testing';
import { SymbolMapperController } from '@core/symbol-mapper/controller/symbol-mapper.controller';
import { SymbolMapperService } from '@core/symbol-mapper/services/symbol-mapper.service';
import { CreateSymbolMappingDto } from '@core/symbol-mapper/dto/create-symbol-mapping.dto';
import { SymbolMappingResponseDto } from '@core/symbol-mapper/dto/symbol-mapping-response.dto';
import { TransformSymbolsDto, AddSymbolMappingRuleDto, UpdateSymbolMappingRuleDto } from '@core/symbol-mapper/dto/update-symbol-mapping.dto';
import { SymbolMappingQueryDto } from '@core/symbol-mapper/dto/symbol-mapping-query.dto';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PaginatedDataDto } from '@common/modules/pagination/dto/paginated-data';
import { Reflector } from '@nestjs/core';
import { UnifiedPermissionsGuard } from '../../../../../../src/auth/guards/unified-permissions.guard';
import { PermissionService } from '../../../../../../src/auth/services/permission.service';
import { CacheService } from '../../../../../../src/cache/services/cache.service';
import { RateLimitGuard } from '../../../../../../src/auth/guards/rate-limit.guard';
import { RateLimitService } from '../../../../../../src/auth/services/rate-limit.service';

// Mock the logger
jest.mock('../../../../../../src/common/config/logger.config', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    verbose: jest.fn(),
  })),
  sanitizeLogData: jest.fn((data) => data),
}));

interface TransformSymbolsResponseDto {
  transformedSymbols: Record<string, string>;
  failedSymbols: string[];
  processingTimeMs: number;
  dataSourceName: string;
}

describe('SymbolMapperController', () => {
  let controller: SymbolMapperController;
  let service: jest.Mocked<SymbolMapperService>;

  beforeEach(async () => {
    // Create mock for CacheService
    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SymbolMapperController],
      providers: [
        {
          provide: SymbolMapperService,
          useValue: {
            createDataSourceMapping: jest.fn(),
            mapSymbol: jest.fn(),
            transformSymbols: jest.fn(),
            transformSymbolsById: jest.fn(),
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
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: PermissionService,
          useValue: {
            checkPermissions: jest.fn().mockResolvedValue({ allowed: true }),
            getEffectivePermissions: jest.fn().mockReturnValue([]),
          }
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn().mockReturnValue([]),
          }
        },
        {
          provide: RateLimitService,
          useValue: {
            checkRateLimit: jest.fn().mockResolvedValue({
              allowed: true,
              limit: 100,
              remaining: 99,
              resetTime: new Date().getTime() + 60000,
            }),
          }
        }
      ],
    })
    .overrideGuard(UnifiedPermissionsGuard)
    .useValue({
      canActivate: jest.fn().mockReturnValue(true),
    })
    .overrideGuard(RateLimitGuard)
    .useValue({
      canActivate: jest.fn().mockReturnValue(true),
    })
    .compile();

    controller = module.get<SymbolMapperController>(SymbolMapperController);
    service = module.get(SymbolMapperService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockSymbolMappingResponse: SymbolMappingResponseDto = {
    id: 'some-id',
    dataSourceName: 'longport',
    description: 'LongPort mapping',
    SymbolMappingRule: [],
    isActive: true,
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('createDataSourceMapping', () => {
    const createDto: CreateSymbolMappingDto = {
      dataSourceName: 'longport',
      description: 'LongPort mapping',
      SymbolMappingRule: [],
    };

    it('should create a data source mapping', async () => {
      service.createDataSourceMapping.mockResolvedValue(mockSymbolMappingResponse);
      const result = await controller.createDataSourceMapping(createDto);
      expect(service.createDataSourceMapping).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockSymbolMappingResponse);
    });

    it('should throw error if service fails', async () => {
      service.createDataSourceMapping.mockRejectedValue(new InternalServerErrorException());
      await expect(controller.createDataSourceMapping(createDto)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('mapSymbol', () => {
    it('should map a single symbol', async () => {
      service.mapSymbol.mockResolvedValue('mapped-symbol');
      const result = await controller.mapSymbol({ symbol: 'original', fromProvider: 'A', toProvider: 'B' });
      expect(service.mapSymbol).toHaveBeenCalledWith('original', 'A', 'B');
      expect(result).toEqual({
        originalSymbol: 'original',
        mappedSymbol: 'mapped-symbol',
        fromProvider: 'A',
        toProvider: 'B',
      });
    });
  });

  describe('transformSymbols', () => {
    const transformDto: TransformSymbolsDto = {
      dataSourceName: 'longport',
      symbols: ['AAPL', 'GOOGL'],
    };
    const transformResponse: TransformSymbolsResponseDto = {
      transformedSymbols: { AAPL: 'AAPL.US' },
      failedSymbols: [],
      processingTimeMs: 10,
      dataSourceName: 'longport',
    };

    it('should transform symbols by data source name', async () => {
      service.transformSymbols.mockResolvedValue(transformResponse);
      const result = await controller.transformSymbols(transformDto);
      expect(service.transformSymbols).toHaveBeenCalledWith(transformDto.dataSourceName, transformDto.symbols);
      expect(result).toEqual(transformResponse);
    });

    it('should transform symbols by mapping ID', async () => {
      const dtoWithId = { ...transformDto, mappingInSymbolId: 'map-id' };
      service.transformSymbolsById.mockResolvedValue(transformResponse);
      const result = await controller.transformSymbols(dtoWithId);
      expect(service.transformSymbolsById).toHaveBeenCalledWith(dtoWithId.mappingInSymbolId, dtoWithId.symbols);
      expect(result).toEqual(transformResponse);
    });

    it('should throw error if service fails', async () => {
      service.transformSymbols.mockRejectedValue(new InternalServerErrorException());
      await expect(controller.transformSymbols(transformDto)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('addSymbolMappingRule', () => {
    const addRuleDto: AddSymbolMappingRuleDto = {
      dataSourceName: 'longport',
      symbolMappingRule: { standardSymbol: '700', sdkSymbol: '00700.HK' },
    };

    it('should add a symbol mapping rule', async () => {
      service.addSymbolMappingRule.mockResolvedValue(mockSymbolMappingResponse);
      const result = await controller.addSymbolMappingRule(addRuleDto);
      expect(service.addSymbolMappingRule).toHaveBeenCalledWith(addRuleDto);
      expect(result).toEqual(mockSymbolMappingResponse);
    });

    it('should throw error if service fails', async () => {
      service.addSymbolMappingRule.mockRejectedValue(new InternalServerErrorException());
      await expect(controller.addSymbolMappingRule(addRuleDto)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getMappings', () => {
    const queryDto: SymbolMappingQueryDto = { page: 1, limit: 10 };
    const paginatedResponse = new PaginatedDataDto<SymbolMappingResponseDto>(
      [mockSymbolMappingResponse], 
      {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    );

    it('should get paginated symbol mappings', async () => {
      service.getSymbolMappingsPaginated.mockResolvedValue(paginatedResponse);
      const result = await controller.getMappings(queryDto);
      expect(service.getSymbolMappingsPaginated).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(paginatedResponse);
    });
  });

  describe('getDataSources', () => {
    it('should get all data sources', async () => {
      service.getDataSources.mockResolvedValue(['longport', 'itick']);
      const result = await controller.getDataSources();
      expect(service.getDataSources).toHaveBeenCalled();
      expect(result).toEqual(['longport', 'itick']);
    });
  });

  describe('getMarkets', () => {
    it('should get all markets', async () => {
      service.getMarkets.mockResolvedValue(['HK', 'US']);
      const result = await controller.getMarkets();
      expect(service.getMarkets).toHaveBeenCalled();
      expect(result).toEqual(['HK', 'US']);
    });
  });

  describe('getSymbolTypes', () => {
    it('should get all symbol types', async () => {
      service.getSymbolTypes.mockResolvedValue(['stock', 'future']);
      const result = await controller.getSymbolTypes();
      expect(service.getSymbolTypes).toHaveBeenCalled();
      expect(result).toEqual(['stock', 'future']);
    });
  });

  describe('getSymbolMappingByDataSource', () => {
    it('should get symbol mapping by data source name', async () => {
      service.getSymbolMappingByDataSource.mockResolvedValue(mockSymbolMappingResponse);
      const result = await controller.getSymbolMappingByDataSource('longport');
      expect(service.getSymbolMappingByDataSource).toHaveBeenCalledWith('longport');
      expect(result).toEqual(mockSymbolMappingResponse);
    });
  });

  describe('getAllSymbolMappingRule', () => {
    const mockAllRulesResponse = {
      providers: ['longport'],
      totalProviders: 1,
      totalRules: 5,
      rulesByProvider: { longport: mockSymbolMappingResponse },
      summary: { mostRulesProvider: 'longport', averageRulesPerProvider: 5 },
    };

    it('should get all symbol mapping rules', async () => {
      service.getAllSymbolMappingRule.mockResolvedValue(mockAllRulesResponse);
      const result = await controller.getAllSymbolMappingRule();
      expect(service.getAllSymbolMappingRule).toHaveBeenCalled();
      expect(result).toEqual(mockAllRulesResponse);
    });

    it('should throw error if service fails', async () => {
      service.getAllSymbolMappingRule.mockRejectedValue(new InternalServerErrorException());
      await expect(controller.getAllSymbolMappingRule()).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getSymbolMappingRule', () => {
    it('should get mapping rule by ID', async () => {
      const mockMappingRules = [{ 
        standardSymbol: '700', 
        sdkSymbol: '00700.HK',
        market: 'HK',
        symbolType: 'STOCK',
        isActive: true,
        description: 'Tencent'
      }];
      
      service.getSymbolMappingRule.mockResolvedValue(mockMappingRules);
      const result = await controller.getSymbolMappingRule('some-id');
      expect(service.getSymbolMappingRule).toHaveBeenCalledWith('some-id');
      expect(result).toEqual(mockMappingRules);
    });
  });

  describe('getSymbolMappingById', () => {
    it('should get symbol mapping by ID', async () => {
      service.getSymbolMappingById.mockResolvedValue(mockSymbolMappingResponse);
      const result = await controller.getSymbolMappingById('some-id');
      expect(service.getSymbolMappingById).toHaveBeenCalledWith('some-id');
      expect(result).toEqual(mockSymbolMappingResponse);
    });
  });

  describe('updateSymbolMapping', () => {
    const updateDto = { description: 'Updated description' };
    it('should update a symbol mapping', async () => {
      service.updateSymbolMapping.mockResolvedValue({ ...mockSymbolMappingResponse, ...updateDto });
      const result = await controller.updateSymbolMapping('some-id', updateDto);
      expect(service.updateSymbolMapping).toHaveBeenCalledWith('some-id', updateDto);
      expect(result.description).toBe('Updated description');
    });
  });

  describe('updateSymbolMappingRule', () => {
    const updateRuleDto: UpdateSymbolMappingRuleDto = {
      dataSourceName: 'longport',
      standardSymbol: '700',
      symbolMappingRule: { sdkSymbol: '00700.HK' },
    };

    it('should update a specific symbol mapping rule', async () => {
      service.updateSymbolMappingRule.mockResolvedValue(mockSymbolMappingResponse);
      const result = await controller.updateSymbolMappingRule(
        updateRuleDto.dataSourceName,
        updateRuleDto.standardSymbol,
        updateRuleDto.symbolMappingRule,
      );
      expect(service.updateSymbolMappingRule).toHaveBeenCalledWith(updateRuleDto);
      expect(result).toEqual(mockSymbolMappingResponse);
    });
  });

  describe('deleteSymbolMapping', () => {
    it('should delete a symbol mapping', async () => {
      service.deleteSymbolMapping.mockResolvedValue(mockSymbolMappingResponse);
      const result = await controller.deleteSymbolMapping('some-id');
      expect(service.deleteSymbolMapping).toHaveBeenCalledWith('some-id');
      expect(result).toEqual(mockSymbolMappingResponse);
    });
  });

  describe('deleteSymbolMappingsByDataSource', () => {
    it('should delete all symbol mappings by data source', async () => {
      service.deleteSymbolMappingsByDataSource.mockResolvedValue({ deletedCount: 5 });
      const result = await controller.deleteSymbolMappingsByDataSource('longport');
      expect(service.deleteSymbolMappingsByDataSource).toHaveBeenCalledWith('longport');
      expect(result).toEqual({ deletedCount: 5 });
    });

    it('should throw error if service fails', async () => {
      service.deleteSymbolMappingsByDataSource.mockRejectedValue(new InternalServerErrorException());
      await expect(controller.deleteSymbolMappingsByDataSource('longport')).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('removeSymbolMappingRule', () => {
    it('should remove a specific symbol mapping rule', async () => {
      service.removeSymbolMappingRule.mockResolvedValue(mockSymbolMappingResponse);
      const result = await controller.removeSymbolMappingRule('longport', '700');
      expect(service.removeSymbolMappingRule).toHaveBeenCalledWith('longport', '700');
      expect(result).toEqual(mockSymbolMappingResponse);
    });

    it('should throw error if service fails', async () => {
      service.removeSymbolMappingRule.mockRejectedValue(new InternalServerErrorException());
      await expect(controller.removeSymbolMappingRule('longport', '700')).rejects.toThrow(InternalServerErrorException);
    });
  });
});