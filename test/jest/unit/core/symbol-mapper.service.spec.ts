import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SymbolMapperService } from '../../../../src/core/symbol-mapper/symbol-mapper.service';
import { SymbolMappingRepository } from '../../../../src/core/symbol-mapper/repositories/symbol-mapping.repository';
import { CreateSymbolMappingDto } from '../../../../src/core/symbol-mapper/dto/create-symbol-mapping.dto';
import { UpdateSymbolMappingDto, AddMappingRuleDto, UpdateMappingRuleDto } from '../../../../src/core/symbol-mapper/dto/update-symbol-mapping.dto';
import { SymbolMappingQueryDto } from '../../../../src/core/symbol-mapper/dto/symbol-mapping-query.dto';
import { MappingRule } from '../../../../src/core/symbol-mapper/schemas/symbol-mapping-rule.schema';
import { SymbolMappingRuleDocument } from '../../../../src/core/symbol-mapper/schemas/symbol-mapping-rule.schema';

describe('SymbolMapperService', () => {
  let service: SymbolMapperService;
  let repository: jest.Mocked<SymbolMappingRepository>;

  const mockSymbolMappingDocument = {
    _id: '507f1f77bcf86cd799439011',
    dataSourceName: 'test-provider',
    isActive: true,
    mappingRules: [
      {
        inputSymbol: 'AAPL',
        outputSymbol: 'AAPL.US',
        market: 'US',
        symbolType: 'stock',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as SymbolMappingRuleDocument;

  beforeEach(async () => {
    const mockRepository = {
      findByDataSource: jest.fn(),
      create: jest.fn(),
      exists: jest.fn(),
      findById: jest.fn(),
      findPaginated: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
      findAllMappingsForSymbols: jest.fn(),
      getDataSources: jest.fn(),
      getMarkets: jest.fn(),
      getSymbolTypes: jest.fn(),
      deleteByDataSource: jest.fn(),
      addMappingRule: jest.fn(),
      updateMappingRule: jest.fn(),
      removeMappingRule: jest.fn(),
      replaceMappingRules: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SymbolMapperService,
        {
          provide: SymbolMappingRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SymbolMapperService>(SymbolMapperService);
    repository = module.get(SymbolMappingRepository);
  });

  describe('mapSymbol', () => {
    it('should map symbol successfully when mapping rule exists', async () => {
      repository.findByDataSource.mockResolvedValue(mockSymbolMappingDocument);

      const result = await service.mapSymbol('AAPL', 'standard', 'test-provider');

      expect(result).toBe('AAPL.US');
      expect(repository.findByDataSource).toHaveBeenCalledWith('test-provider');
    });

    it('should return original symbol when mapping rule not found', async () => {
      repository.findByDataSource.mockResolvedValue(mockSymbolMappingDocument);

      const result = await service.mapSymbol('GOOGL', 'standard', 'test-provider');

      expect(result).toBe('GOOGL');
    });

    it('should return original symbol when mapping config not found', async () => {
      repository.findByDataSource.mockResolvedValue(null);

      const result = await service.mapSymbol('AAPL', 'standard', 'nonexistent-provider');

      expect(result).toBe('AAPL');
    });
  });

  describe('createDataSourceMapping', () => {
    it('should create mapping successfully', async () => {
      const createDto: CreateSymbolMappingDto = {
        dataSourceName: 'new-provider',
        mappingRules: [],
      };

      repository.exists.mockResolvedValue(false);
      repository.create.mockResolvedValue(mockSymbolMappingDocument);

      const result = await service.createDataSourceMapping(createDto);

      expect(result).toBeDefined();
      expect(repository.exists).toHaveBeenCalledWith('new-provider');
      expect(repository.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw ConflictException when mapping already exists', async () => {
      const createDto: CreateSymbolMappingDto = {
        dataSourceName: 'existing-provider',
        mappingRules: [],
      };

      repository.exists.mockResolvedValue(true);

      await expect(service.createDataSourceMapping(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getMappingById', () => {
    it('should return mapping when found', async () => {
      repository.findById.mockResolvedValue(mockSymbolMappingDocument);

      const result = await service.getMappingById('507f1f77bcf86cd799439011');

      expect(result).toBeDefined();
      expect(repository.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    it('should throw NotFoundException when mapping not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getMappingById('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getMappingByDataSource', () => {
    it('should return mapping when found', async () => {
      repository.findByDataSource.mockResolvedValue(mockSymbolMappingDocument);

      const result = await service.getMappingByDataSource('test-provider');

      expect(result).toBeDefined();
      expect(repository.findByDataSource).toHaveBeenCalledWith('test-provider');
    });

    it('should throw NotFoundException when mapping not found', async () => {
      repository.findByDataSource.mockResolvedValue(null);

      await expect(service.getMappingByDataSource('nonexistent-provider')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getMappingsPaginated', () => {
    it('should return paginated results', async () => {
      const query: SymbolMappingQueryDto = {
        page: 1,
        limit: 10,
      };

      const paginatedResult = {
        items: [mockSymbolMappingDocument],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      repository.findPaginated.mockResolvedValue(paginatedResult as any);

      const result = await service.getMappingsPaginated(query);

      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });
  });

  describe('updateMapping', () => {
    it('should update mapping successfully', async () => {
      const updateDto: UpdateSymbolMappingDto = {
        description: 'Updated description',
      };

      repository.updateById.mockResolvedValue(mockSymbolMappingDocument);

      const result = await service.updateMapping(
        '507f1f77bcf86cd799439011',
        updateDto,
      );

      expect(result).toBeDefined();
      expect(repository.updateById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        updateDto,
      );
    });

    it('should throw NotFoundException when mapping not found', async () => {
      const updateDto: UpdateSymbolMappingDto = {
        description: 'Updated description',
      };

      repository.updateById.mockResolvedValue(null);

      await expect(
        service.updateMapping('nonexistent-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteMapping', () => {
    it('should delete mapping successfully', async () => {
      repository.deleteById.mockResolvedValue(mockSymbolMappingDocument);

      const result = await service.deleteMapping('507f1f77bcf86cd799439011');

      expect(result).toBeDefined();
      expect(repository.deleteById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
    });

    it('should throw NotFoundException when mapping not found', async () => {
      repository.deleteById.mockResolvedValue(null);

      await expect(service.deleteMapping('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('transformSymbols', () => {
    it('should transform symbols successfully', async () => {
      const mappingRules = [
        {
          inputSymbol: 'AAPL',
          outputSymbol: 'AAPL.US',
          market: 'US',
          symbolType: 'stock',
          isActive: true,
        },
      ];

      repository.findAllMappingsForSymbols.mockResolvedValue(mappingRules as any);

      const result = await service.transformSymbols('test-provider', [
        'AAPL',
        'GOOGL',
      ]);

      expect(result.transformedSymbols).toEqual({
        AAPL: 'AAPL.US',
        GOOGL: 'GOOGL',
      });
      expect(result.dataSourceName).toBe('test-provider');
      expect(result.processingTimeMs).toBeGreaterThan(0);
    });
  });

  describe('getTransformedSymbolList', () => {
    it('should return transformed symbol list', async () => {
      const mappingRules = [
        {
          inputSymbol: 'AAPL',
          outputSymbol: 'AAPL.US',
          market: 'US',
          symbolType: 'stock',
          isActive: true,
        },
      ];

      repository.findAllMappingsForSymbols.mockResolvedValue(mappingRules as any);

      const result = await service.getTransformedSymbolList('test-provider', [
        'AAPL',
        'GOOGL',
      ]);

      expect(result).toEqual(['AAPL.US', 'GOOGL']);
    });
  });

  describe('getMappingRules', () => {
    it('should return mapping rules when provider exists', async () => {
      repository.findByDataSource.mockResolvedValue(mockSymbolMappingDocument);

      const result = await service.getMappingRules('test-provider');

      expect(result).toEqual(mockSymbolMappingDocument.mappingRules);
    });

    it('should return empty array when provider not found', async () => {
      repository.findByDataSource.mockResolvedValue(null);

      const result = await service.getMappingRules('nonexistent-provider');

      expect(result).toEqual([]);
    });
  });

  describe('addMappingRule', () => {
    it('should add mapping rule successfully', async () => {
      const addDto: AddMappingRuleDto = {
        dataSourceName: 'test-provider',
        mappingRule: {
          inputSymbol: 'GOOGL',
          outputSymbol: 'GOOGL.US',
          market: 'US',
          symbolType: 'stock',
          isActive: true,
        },
      };

      repository.addMappingRule.mockResolvedValue(mockSymbolMappingDocument);

      const result = await service.addMappingRule(addDto);

      expect(result).toBeDefined();
      expect(repository.addMappingRule).toHaveBeenCalledWith(
        'test-provider',
        addDto.mappingRule,
      );
    });

    it('should throw NotFoundException when data source not found', async () => {
      const addDto: AddMappingRuleDto = {
        dataSourceName: 'nonexistent-provider',
        mappingRule: {
          inputSymbol: 'GOOGL',
          outputSymbol: 'GOOGL.US',
          market: 'US',
          symbolType: 'stock',
          isActive: true,
        },
      };

      repository.addMappingRule.mockResolvedValue(null);

      await expect(service.addMappingRule(addDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateMappingRule', () => {
    it('should update mapping rule successfully', async () => {
      const updateDto: UpdateMappingRuleDto = {
        dataSourceName: 'test-provider',
        inputSymbol: 'AAPL',
        mappingRule: {
          outputSymbol: 'AAPL.NASDAQ',
          market: 'US',
          symbolType: 'stock',
          isActive: true,
        },
      };

      repository.updateMappingRule.mockResolvedValue(mockSymbolMappingDocument);

      const result = await service.updateMappingRule(updateDto);

      expect(result).toBeDefined();
      expect(repository.updateMappingRule).toHaveBeenCalledWith(
        'test-provider',
        'AAPL',
        updateDto.mappingRule,
      );
    });

    it('should throw NotFoundException when mapping rule not found', async () => {
      const updateDto: UpdateMappingRuleDto = {
        dataSourceName: 'test-provider',
        inputSymbol: 'NONEXISTENT',
        mappingRule: {
          outputSymbol: 'NONEXISTENT.US',
          market: 'US',
          symbolType: 'stock',
          isActive: true,
        },
      };

      repository.updateMappingRule.mockResolvedValue(null);

      await expect(service.updateMappingRule(updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('removeMappingRule', () => {
    it('should remove mapping rule successfully', async () => {
      repository.removeMappingRule.mockResolvedValue(mockSymbolMappingDocument);

      const result = await service.removeMappingRule('test-provider', 'AAPL');

      expect(result).toBeDefined();
      expect(repository.removeMappingRule).toHaveBeenCalledWith('test-provider', 'AAPL');
    });

    it('should throw NotFoundException when data source not found', async () => {
      repository.removeMappingRule.mockResolvedValue(null);

      await expect(service.removeMappingRule('nonexistent-provider', 'AAPL')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('replaceMappingRules', () => {
    it('should replace mapping rules successfully', async () => {
      const newMappingRules: MappingRule[] = [
        {
          inputSymbol: 'TSLA',
          outputSymbol: 'TSLA.US',
          market: 'US',
          symbolType: 'stock',
          isActive: true,
        },
      ];

      repository.replaceMappingRules.mockResolvedValue(mockSymbolMappingDocument);

      const result = await service.replaceMappingRules('test-provider', newMappingRules);

      expect(result).toBeDefined();
      expect(repository.replaceMappingRules).toHaveBeenCalledWith('test-provider', newMappingRules);
    });

    it('should throw NotFoundException when data source not found', async () => {
      const newMappingRules: MappingRule[] = [];

      repository.replaceMappingRules.mockResolvedValue(null);

      await expect(service.replaceMappingRules('nonexistent-provider', newMappingRules)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getDataSources', () => {
    it('should return data sources', async () => {
      repository.getDataSources.mockResolvedValue(['provider1', 'provider2']);

      const result = await service.getDataSources();

      expect(result).toEqual(['provider1', 'provider2']);
    });
  });

  describe('getMarkets', () => {
    it('should return markets', async () => {
      repository.getMarkets.mockResolvedValue(['US', 'HK']);

      const result = await service.getMarkets();

      expect(result).toEqual(['US', 'HK']);
    });
  });

  describe('getSymbolTypes', () => {
    it('should return symbol types', async () => {
      repository.getSymbolTypes.mockResolvedValue(['stock', 'etf']);

      const result = await service.getSymbolTypes();

      expect(result).toEqual(['stock', 'etf']);
    });
  });

  describe('deleteMappingsByDataSource', () => {
    it('should delete mappings by data source', async () => {
      repository.deleteByDataSource.mockResolvedValue({ deletedCount: 1 });

      const result = await service.deleteMappingsByDataSource('test-provider');

      expect(result.deletedCount).toBe(1);
      expect(repository.deleteByDataSource).toHaveBeenCalledWith('test-provider');
    });
  });

  describe('saveMapping', () => {
    it('should save mapping successfully', async () => {
      const mappingRule = {
        dataSourceName: 'test-provider',
        mappingRules: [],
      };

      repository.exists.mockResolvedValue(false);
      repository.create.mockResolvedValue(mockSymbolMappingDocument);

      await service.saveMapping(mappingRule);

      expect(repository.create).toHaveBeenCalledWith(mappingRule);
    });
  });
});