import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BadRequestException } from '@nestjs/common';

import { SymbolMappingRepository } from '../../../../../../../src/core/00-prepare/symbol-mapper/repositories/symbol-mapping.repository';
import {
  SymbolMappingRuleDocument,
  SymbolMappingRuleDocumentType,
  SymbolMappingRule,
} from '../../../../../../../src/core/00-prepare/symbol-mapper/schemas/symbol-mapping-rule.schema';
import { CreateSymbolMappingDto } from '../../../../../../../src/core/00-prepare/symbol-mapper/dto/create-symbol-mapping.dto';
import { SymbolMappingQueryDto } from '../../../../../../../src/core/00-prepare/symbol-mapper/dto/symbol-mapping-query.dto';
import { UpdateSymbolMappingDto } from '../../../../../../../src/core/00-prepare/symbol-mapper/dto/update-symbol-mapping.dto';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';

describe('SymbolMappingRepository', () => {
  let repository: SymbolMappingRepository;
  let mockModel: jest.Mocked<Model<SymbolMappingRuleDocumentType>>;
  let mockPaginationService: jest.Mocked<PaginationService>;

  const mockObjectId = new Types.ObjectId();
  const mockDate = new Date('2023-01-01T00:00:00Z');

  const mockDocumentData = {
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
    save: jest.fn(),
    toObject: jest.fn(),
    toJSON: jest.fn(),
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
    const mockModelValue = {
      new: jest.fn(),
      constructor: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      deleteMany: jest.fn(),
      findOneAndUpdate: jest.fn(),
      distinct: jest.fn(),
      aggregate: jest.fn(),
      watch: jest.fn(),
    };

    // Make the mock model constructor return a mock document
    mockModelValue.new.mockImplementation((data) => ({
      ...mockDocumentData,
      ...data,
      save: jest.fn().mockResolvedValue({ ...mockDocumentData, ...data }),
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SymbolMappingRepository,
        {
          provide: getModelToken(SymbolMappingRuleDocument.name),
          useValue: mockModelValue,
        },
        {
          provide: PaginationService,
          useValue: {
            normalizePaginationQuery: jest.fn(),
            calculateSkip: jest.fn(),
            createPaginatedResponseFromQuery: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<SymbolMappingRepository>(SymbolMappingRepository);
    mockModel = module.get(getModelToken(SymbolMappingRuleDocument.name));
    mockPaginationService = module.get(PaginationService);

    // Setup the model constructor to work with 'new'
    (mockModel as any).mockImplementation((data) => ({
      ...mockDocumentData,
      ...data,
      save: jest.fn().mockResolvedValue({ ...mockDocumentData, ...data }),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new symbol mapping document', async () => {
      const mockSavedDocument = { ...mockDocumentData, ...mockCreateDto };
      const mockDocument = {
        save: jest.fn().mockResolvedValue(mockSavedDocument),
      };

      (mockModel as any).mockReturnValue(mockDocument);

      const result = await repository.create(mockCreateDto);

      expect(mockModel).toHaveBeenCalledWith({
        ...mockCreateDto,
        isActive: true,
      });
      expect(mockDocument.save).toHaveBeenCalled();
      expect(result).toEqual(mockSavedDocument);
    });

    it('should set isActive to true when not provided', async () => {
      const createDtoWithoutIsActive = { ...mockCreateDto };
      delete createDtoWithoutIsActive.isActive;

      const mockDocument = {
        save: jest.fn().mockResolvedValue(mockDocumentData),
      };

      (mockModel as any).mockReturnValue(mockDocument);

      await repository.create(createDtoWithoutIsActive);

      expect(mockModel).toHaveBeenCalledWith({
        ...createDtoWithoutIsActive,
        isActive: true,
      });
    });

    it('should preserve isActive when explicitly set to false', async () => {
      const createDtoWithFalseIsActive = { ...mockCreateDto, isActive: false };

      const mockDocument = {
        save: jest.fn().mockResolvedValue(mockDocumentData),
      };

      (mockModel as any).mockReturnValue(mockDocument);

      await repository.create(createDtoWithFalseIsActive);

      expect(mockModel).toHaveBeenCalledWith(createDtoWithFalseIsActive);
    });
  });

  describe('findById', () => {
    const validObjectId = '507f1f77bcf86cd799439011';

    it('should find document by valid ObjectId', async () => {
      const mockExecChain = {
        exec: jest.fn().mockResolvedValue(mockDocumentData),
      };
      mockModel.findById.mockReturnValue(mockExecChain as any);

      const result = await repository.findById(validObjectId);

      expect(mockModel.findById).toHaveBeenCalledWith(validObjectId);
      expect(result).toEqual(mockDocumentData);
    });

    it('should return null when document not found', async () => {
      const mockExecChain = {
        exec: jest.fn().mockResolvedValue(null),
      };
      mockModel.findById.mockReturnValue(mockExecChain as any);

      const result = await repository.findById(validObjectId);

      expect(result).toBeNull();
    });

    it('should throw BadRequestException for invalid ObjectId', async () => {
      const invalidObjectId = 'invalid-id';

      await expect(repository.findById(invalidObjectId)).rejects.toThrow(
        BadRequestException
      );

      expect(mockModel.findById).not.toHaveBeenCalled();
    });

    it('should validate ObjectId format before querying', async () => {
      const invalidIds = ['', '123', 'not-an-object-id', null, undefined];

      for (const invalidId of invalidIds) {
        await expect(repository.findById(invalidId as string)).rejects.toThrow(
          BadRequestException
        );
      }

      expect(mockModel.findById).not.toHaveBeenCalled();
    });
  });

  describe('findByDataSource', () => {
    const dataSourceName = 'longport';

    it('should find document by data source name', async () => {
      const mockExecChain = {
        exec: jest.fn().mockResolvedValue(mockDocumentData),
      };
      mockModel.findOne.mockReturnValue(mockExecChain as any);

      const result = await repository.findByDataSource(dataSourceName);

      expect(mockModel.findOne).toHaveBeenCalledWith({
        dataSourceName,
        isActive: true,
      });
      expect(result).toEqual(mockDocumentData);
    });

    it('should return null when data source not found', async () => {
      const mockExecChain = {
        exec: jest.fn().mockResolvedValue(null),
      };
      mockModel.findOne.mockReturnValue(mockExecChain as any);

      const result = await repository.findByDataSource('non-existent');

      expect(result).toBeNull();
    });

    it('should only find active data sources', async () => {
      const mockExecChain = {
        exec: jest.fn().mockResolvedValue(null),
      };
      mockModel.findOne.mockReturnValue(mockExecChain as any);

      await repository.findByDataSource(dataSourceName);

      expect(mockModel.findOne).toHaveBeenCalledWith({
        dataSourceName,
        isActive: true,
      });
    });
  });

  describe('findPaginated', () => {
    const mockQuery: SymbolMappingQueryDto = {
      page: 1,
      limit: 10,
      dataSourceName: 'longport',
      market: 'HK',
      symbolType: 'stock',
      isActive: true,
      search: 'test',
    };

    beforeEach(() => {
      mockPaginationService.normalizePaginationQuery.mockReturnValue({
        page: 1,
        limit: 10,
      });
      mockPaginationService.calculateSkip.mockReturnValue(0);
    });

    it('should perform paginated search with all filters', async () => {
      const mockItems = [mockDocumentData];
      const mockTotal = 1;

      const mockFindChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockItems),
      };

      const mockCountChain = {
        exec: jest.fn().mockResolvedValue(mockTotal),
      };

      mockModel.find.mockReturnValue(mockFindChain as any);
      mockModel.countDocuments.mockReturnValue(mockCountChain as any);

      const result = await repository.findPaginated(mockQuery);

      expect(result).toEqual({
        items: mockItems,
        total: mockTotal,
      });

      expect(mockModel.find).toHaveBeenCalledWith({
        dataSourceName: { $regex: 'longport', $options: 'i' },
        isActive: true,
        'SymbolMappingRule.market': 'HK',
        'SymbolMappingRule.symbolType': 'stock',
        $or: [
          { dataSourceName: { $regex: 'test', $options: 'i' } },
          { description: { $regex: 'test', $options: 'i' } },
          { 'SymbolMappingRule.standardSymbol': { $regex: 'test', $options: 'i' } },
          { 'SymbolMappingRule.sdkSymbol': { $regex: 'test', $options: 'i' } },
        ],
      });

      expect(mockFindChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockFindChain.skip).toHaveBeenCalledWith(0);
      expect(mockFindChain.limit).toHaveBeenCalledWith(10);
      expect(mockFindChain.lean).toHaveBeenCalled();
    });

    it('should build filter with minimal query parameters', async () => {
      const minimalQuery: SymbolMappingQueryDto = {
        page: 1,
        limit: 10,
      };

      const mockFindChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      const mockCountChain = {
        exec: jest.fn().mockResolvedValue(0),
      };

      mockModel.find.mockReturnValue(mockFindChain as any);
      mockModel.countDocuments.mockReturnValue(mockCountChain as any);

      await repository.findPaginated(minimalQuery);

      expect(mockModel.find).toHaveBeenCalledWith({});
    });

    it('should handle search filter correctly', async () => {
      const searchQuery: SymbolMappingQueryDto = {
        page: 1,
        limit: 10,
        search: 'AAPL',
      };

      const mockFindChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      const mockCountChain = {
        exec: jest.fn().mockResolvedValue(0),
      };

      mockModel.find.mockReturnValue(mockFindChain as any);
      mockModel.countDocuments.mockReturnValue(mockCountChain as any);

      await repository.findPaginated(searchQuery);

      expect(mockModel.find).toHaveBeenCalledWith({
        $or: [
          { dataSourceName: { $regex: 'AAPL', $options: 'i' } },
          { description: { $regex: 'AAPL', $options: 'i' } },
          { 'SymbolMappingRule.standardSymbol': { $regex: 'AAPL', $options: 'i' } },
          { 'SymbolMappingRule.sdkSymbol': { $regex: 'AAPL', $options: 'i' } },
        ],
      });
    });
  });

  describe('updateById', () => {
    const validObjectId = '507f1f77bcf86cd799439011';
    const updateDto: UpdateSymbolMappingDto = {
      description: 'Updated description',
      version: '1.1.0',
    };

    it('should update document by valid ObjectId', async () => {
      const updatedDocument = { ...mockDocumentData, ...updateDto };
      const mockExecChain = {
        exec: jest.fn().mockResolvedValue(updatedDocument),
      };
      mockModel.findByIdAndUpdate.mockReturnValue(mockExecChain as any);

      const result = await repository.updateById(validObjectId, updateDto);

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        validObjectId,
        updateDto,
        { new: true }
      );
      expect(result).toEqual(updatedDocument);
    });

    it('should return null when document not found', async () => {
      const mockExecChain = {
        exec: jest.fn().mockResolvedValue(null),
      };
      mockModel.findByIdAndUpdate.mockReturnValue(mockExecChain as any);

      const result = await repository.updateById(validObjectId, updateDto);

      expect(result).toBeNull();
    });

    it('should throw BadRequestException for invalid ObjectId', async () => {
      const invalidObjectId = 'invalid-id';

      await expect(
        repository.updateById(invalidObjectId, updateDto)
      ).rejects.toThrow(BadRequestException);

      expect(mockModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('deleteById', () => {
    const validObjectId = '507f1f77bcf86cd799439011';

    it('should delete document by valid ObjectId', async () => {
      const mockExecChain = {
        exec: jest.fn().mockResolvedValue(mockDocumentData),
      };
      mockModel.findByIdAndDelete.mockReturnValue(mockExecChain as any);

      const result = await repository.deleteById(validObjectId);

      expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith(validObjectId);
      expect(result).toEqual(mockDocumentData);
    });

    it('should return null when document not found', async () => {
      const mockExecChain = {
        exec: jest.fn().mockResolvedValue(null),
      };
      mockModel.findByIdAndDelete.mockReturnValue(mockExecChain as any);

      const result = await repository.deleteById(validObjectId);

      expect(result).toBeNull();
    });

    it('should throw BadRequestException for invalid ObjectId', async () => {
      const invalidObjectId = 'invalid-id';

      await expect(repository.deleteById(invalidObjectId)).rejects.toThrow(
        BadRequestException
      );

      expect(mockModel.findByIdAndDelete).not.toHaveBeenCalled();
    });
  });

  describe('exists', () => {
    it('should return true when data source exists and is active', async () => {
      const mockExecChain = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        hint: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ _id: mockObjectId }),
      };
      mockModel.findOne.mockReturnValue(mockExecChain as any);

      const result = await repository.exists('longport');

      expect(result).toBe(true);
      expect(mockModel.findOne).toHaveBeenCalledWith({
        dataSourceName: 'longport',
        isActive: true,
      });
      expect(mockExecChain.select).toHaveBeenCalledWith('_id');
      expect(mockExecChain.lean).toHaveBeenCalled();
      expect(mockExecChain.hint).toHaveBeenCalledWith({
        dataSourceName: 1,
        isActive: 1,
      });
    });

    it('should return false when data source does not exist', async () => {
      const mockExecChain = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        hint: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };
      mockModel.findOne.mockReturnValue(mockExecChain as any);

      const result = await repository.exists('non-existent');

      expect(result).toBe(false);
    });

    it('should return false for empty or whitespace-only data source names', async () => {
      const invalidNames = ['', '   ', '\t', '\n', null, undefined];

      for (const name of invalidNames) {
        const result = await repository.exists(name as string);
        expect(result).toBe(false);
      }

      expect(mockModel.findOne).not.toHaveBeenCalled();
    });

    it('should trim whitespace from data source name', async () => {
      const mockExecChain = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        hint: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };
      mockModel.findOne.mockReturnValue(mockExecChain as any);

      await repository.exists('  longport  ');

      expect(mockModel.findOne).toHaveBeenCalledWith({
        dataSourceName: 'longport',
        isActive: true,
      });
    });
  });

  describe('getDataSources', () => {
    it('should return distinct data source names', async () => {
      const expectedDataSources = ['longport', 'iex_cloud', 'twelve_data'];
      const mockExecChain = {
        exec: jest.fn().mockResolvedValue(expectedDataSources),
      };
      mockModel.distinct.mockReturnValue(mockExecChain as any);

      const result = await repository.getDataSources();

      expect(mockModel.distinct).toHaveBeenCalledWith('dataSourceName');
      expect(result).toEqual(expectedDataSources);
    });

    it('should handle empty result', async () => {
      const mockExecChain = {
        exec: jest.fn().mockResolvedValue([]),
      };
      mockModel.distinct.mockReturnValue(mockExecChain as any);

      const result = await repository.getDataSources();

      expect(result).toEqual([]);
    });
  });

  describe('getMarkets', () => {
    it('should return distinct market names filtered of null values', async () => {
      const dbResults = ['HK', 'US', 'SG', null, 'CN'];
      const expectedMarkets = ['HK', 'US', 'SG', 'CN'];

      const mockExecChain = {
        exec: jest.fn().mockResolvedValue(dbResults),
      };
      mockModel.distinct.mockReturnValue(mockExecChain as any);

      const result = await repository.getMarkets();

      expect(mockModel.distinct).toHaveBeenCalledWith('SymbolMappingRule.market');
      expect(result).toEqual(expectedMarkets);
    });

    it('should handle all null values', async () => {
      const dbResults = [null, null, null];

      const mockExecChain = {
        exec: jest.fn().mockResolvedValue(dbResults),
      };
      mockModel.distinct.mockReturnValue(mockExecChain as any);

      const result = await repository.getMarkets();

      expect(result).toEqual([]);
    });
  });

  describe('getSymbolTypes', () => {
    it('should return distinct symbol types filtered of null values', async () => {
      const dbResults = ['stock', 'etf', 'index', null, 'crypto'];
      const expectedTypes = ['stock', 'etf', 'index', 'crypto'];

      const mockExecChain = {
        exec: jest.fn().mockResolvedValue(dbResults),
      };
      mockModel.distinct.mockReturnValue(mockExecChain as any);

      const result = await repository.getSymbolTypes();

      expect(mockModel.distinct).toHaveBeenCalledWith('SymbolMappingRule.symbolType');
      expect(result).toEqual(expectedTypes);
    });
  });

  describe('findMappingsForSymbols', () => {
    const dataSourceName = 'longport';
    const standardSymbols = ['700.HK', 'AAPL.US'];

    it('should find mappings for specific symbols', async () => {
      const mockResult = {
        SymbolMappingRule: [
          {
            standardSymbol: '700.HK',
            sdkSymbol: '00700',
            market: 'HK',
            symbolType: 'stock',
            isActive: true,
          },
        ],
      };

      const mockExecChain = {
        exec: jest.fn().mockResolvedValue(mockResult),
      };
      mockModel.findOne.mockReturnValue(mockExecChain as any);

      const result = await repository.findMappingsForSymbols(
        dataSourceName,
        standardSymbols
      );

      expect(mockModel.findOne).toHaveBeenCalledWith(
        {
          dataSourceName,
          isActive: true,
          'SymbolMappingRule.standardSymbol': { $in: standardSymbols },
          'SymbolMappingRule.isActive': { $ne: false },
        },
        { 'SymbolMappingRule.$': 1 }
      );
      expect(result).toEqual(mockResult.SymbolMappingRule);
    });

    it('should return empty array when no mappings found', async () => {
      const mockExecChain = {
        exec: jest.fn().mockResolvedValue(null),
      };
      mockModel.findOne.mockReturnValue(mockExecChain as any);

      const result = await repository.findMappingsForSymbols(
        dataSourceName,
        standardSymbols
      );

      expect(result).toEqual([]);
    });

    it('should filter out inactive rules from results', async () => {
      const mockResult = {
        SymbolMappingRule: [
          {
            standardSymbol: '700.HK',
            sdkSymbol: '00700',
            isActive: true,
          },
          {
            standardSymbol: 'AAPL.US',
            sdkSymbol: 'AAPL',
            isActive: false,
          },
        ],
      };

      const mockExecChain = {
        exec: jest.fn().mockResolvedValue(mockResult),
      };
      mockModel.findOne.mockReturnValue(mockExecChain as any);

      const result = await repository.findMappingsForSymbols(
        dataSourceName,
        ['700.HK', 'AAPL.US']
      );

      expect(result).toHaveLength(1);
      expect(result[0].standardSymbol).toBe('700.HK');
    });
  });

  describe('findAllMappingsForSymbols', () => {
    const dataSourceName = 'longport';
    const standardSymbols = ['700.HK', 'AAPL.US'];

    it('should use aggregation pipeline to find all mappings', async () => {
      const mockResults = [
        {
          standardSymbol: '700.HK',
          sdkSymbol: '00700',
          market: 'HK',
          symbolType: 'stock',
          isActive: true,
        },
      ];

      const mockExecChain = {
        exec: jest.fn().mockResolvedValue(mockResults),
      };
      mockModel.aggregate.mockReturnValue(mockExecChain as any);

      const result = await repository.findAllMappingsForSymbols(
        dataSourceName,
        standardSymbols
      );

      expect(mockModel.aggregate).toHaveBeenCalledWith([
        {
          $match: {
            dataSourceName,
            isActive: true,
          },
        },
        {
          $unwind: '$SymbolMappingRule',
        },
        {
          $match: {
            'SymbolMappingRule.standardSymbol': { $in: standardSymbols },
            'SymbolMappingRule.isActive': { $ne: false },
          },
        },
        {
          $replaceRoot: { newRoot: '$SymbolMappingRule' },
        },
      ]);
      expect(result).toEqual(mockResults);
    });
  });

  describe('deleteByDataSource', () => {
    it('should delete all documents for a data source', async () => {
      const mockDeleteResult = { deletedCount: 3 };
      const mockExecChain = {
        exec: jest.fn().mockResolvedValue(mockDeleteResult),
      };
      mockModel.deleteMany.mockReturnValue(mockExecChain as any);

      const result = await repository.deleteByDataSource('longport');

      expect(mockModel.deleteMany).toHaveBeenCalledWith({
        dataSourceName: 'longport',
      });
      expect(result).toEqual({ deletedCount: 3 });
    });

    it('should return zero deleted count when no documents found', async () => {
      const mockDeleteResult = { deletedCount: 0 };
      const mockExecChain = {
        exec: jest.fn().mockResolvedValue(mockDeleteResult),
      };
      mockModel.deleteMany.mockReturnValue(mockExecChain as any);

      const result = await repository.deleteByDataSource('non-existent');

      expect(result).toEqual({ deletedCount: 0 });
    });

    it('should handle undefined deletedCount', async () => {
      const mockDeleteResult = { deletedCount: undefined };
      const mockExecChain = {
        exec: jest.fn().mockResolvedValue(mockDeleteResult),
      };
      mockModel.deleteMany.mockReturnValue(mockExecChain as any);

      const result = await repository.deleteByDataSource('test');

      expect(result).toEqual({ deletedCount: 0 });
    });
  });

  describe('addSymbolMappingRule', () => {
    const dataSourceName = 'longport';
    const newRule: SymbolMappingRule = {
      standardSymbol: '0001.HK',
      sdkSymbol: '00001',
      market: 'HK',
      symbolType: 'stock',
      isActive: true,
      description: 'CKH Holdings Limited',
    };

    it('should add new mapping rule to existing data source', async () => {
      const updatedDocument = {
        ...mockDocumentData,
        SymbolMappingRule: [...mockDocumentData.SymbolMappingRule, newRule],
      };

      const mockExecChain = {
        exec: jest.fn().mockResolvedValue(updatedDocument),
      };
      mockModel.findOneAndUpdate.mockReturnValue(mockExecChain as any);

      const result = await repository.addSymbolMappingRule(dataSourceName, newRule);

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { dataSourceName },
        { $push: { SymbolMappingRule: newRule } },
        { new: true }
      );
      expect(result).toEqual(updatedDocument);
    });

    it('should return null when data source not found', async () => {
      const mockExecChain = {
        exec: jest.fn().mockResolvedValue(null),
      };
      mockModel.findOneAndUpdate.mockReturnValue(mockExecChain as any);

      const result = await repository.addSymbolMappingRule('non-existent', newRule);

      expect(result).toBeNull();
    });
  });

  describe('updateSymbolMappingRule', () => {
    const dataSourceName = 'longport';
    const standardSymbol = '700.HK';
    const updateData = { description: 'Updated description' };

    it('should update specific mapping rule', async () => {
      const updatedDocument = { ...mockDocumentData };
      const mockExecChain = {
        exec: jest.fn().mockResolvedValue(updatedDocument),
      };
      mockModel.findOneAndUpdate.mockReturnValue(mockExecChain as any);

      const result = await repository.updateSymbolMappingRule(
        dataSourceName,
        standardSymbol,
        updateData
      );

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          dataSourceName,
          'SymbolMappingRule.standardSymbol': standardSymbol,
        },
        {
          $set: {
            'SymbolMappingRule.$.description': 'Updated description',
          },
        },
        { new: true }
      );
      expect(result).toEqual(updatedDocument);
    });

    it('should handle multiple update fields', async () => {
      const multipleUpdateData = {
        description: 'Updated description',
        isActive: false,
        market: 'US',
      };

      const updatedDocument = { ...mockDocumentData };
      const mockExecChain = {
        exec: jest.fn().mockResolvedValue(updatedDocument),
      };
      mockModel.findOneAndUpdate.mockReturnValue(mockExecChain as any);

      await repository.updateSymbolMappingRule(
        dataSourceName,
        standardSymbol,
        multipleUpdateData
      );

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          dataSourceName,
          'SymbolMappingRule.standardSymbol': standardSymbol,
        },
        {
          $set: {
            'SymbolMappingRule.$.description': 'Updated description',
            'SymbolMappingRule.$.isActive': false,
            'SymbolMappingRule.$.market': 'US',
          },
        },
        { new: true }
      );
    });
  });

  describe('removeSymbolMappingRule', () => {
    it('should remove specific mapping rule', async () => {
      const updatedDocument = { ...mockDocumentData };
      const mockExecChain = {
        exec: jest.fn().mockResolvedValue(updatedDocument),
      };
      mockModel.findOneAndUpdate.mockReturnValue(mockExecChain as any);

      const result = await repository.removeSymbolMappingRule('longport', '700.HK');

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { dataSourceName: 'longport' },
        { $pull: { SymbolMappingRule: { standardSymbol: '700.HK' } } },
        { new: true }
      );
      expect(result).toEqual(updatedDocument);
    });
  });

  describe('replaceSymbolMappingRule', () => {
    it('should replace all mapping rules for data source', async () => {
      const newRules: SymbolMappingRule[] = [
        {
          standardSymbol: '0001.HK',
          sdkSymbol: '00001',
          market: 'HK',
          symbolType: 'stock',
          isActive: true,
        },
      ];

      const updatedDocument = { ...mockDocumentData };
      const mockExecChain = {
        exec: jest.fn().mockResolvedValue(updatedDocument),
      };
      mockModel.findOneAndUpdate.mockReturnValue(mockExecChain as any);

      const result = await repository.replaceSymbolMappingRule('longport', newRules);

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { dataSourceName: 'longport' },
        { $set: { SymbolMappingRule: newRules } },
        { new: true }
      );
      expect(result).toEqual(updatedDocument);
    });
  });

  describe('findAll', () => {
    it('should find all active documents', async () => {
      const mockDocuments = [mockDocumentData];
      const mockExecChain = {
        exec: jest.fn().mockResolvedValue(mockDocuments),
      };
      mockModel.find.mockReturnValue(mockExecChain as any);

      const result = await repository.findAll();

      expect(mockModel.find).toHaveBeenCalledWith({ isActive: true });
      expect(result).toEqual(mockDocuments);
    });
  });

  describe('watchChanges', () => {
    it('should setup change stream with correct filters', () => {
      const mockChangeStream = { on: jest.fn() };
      mockModel.watch.mockReturnValue(mockChangeStream as any);

      const result = repository.watchChanges();

      expect(mockModel.watch).toHaveBeenCalledWith(
        [
          {
            $match: {
              operationType: { $in: ['insert', 'update', 'delete'] },
            },
          },
        ],
        {
          fullDocument: 'updateLookup',
        }
      );
      expect(result).toBe(mockChangeStream);
    });
  });

  describe('getDataSourceVersions', () => {
    it('should return Map of data source versions', async () => {
      const mockDocuments = [
        { dataSourceName: 'longport', updatedAt: new Date('2023-01-01') },
        { dataSourceName: 'iex_cloud', updatedAt: new Date('2023-01-02') },
        { dataSourceName: 'longport', updatedAt: new Date('2023-01-03') }, // Later version
      ];

      const mockExecChain = {
        exec: jest.fn().mockResolvedValue(mockDocuments),
      };

      const mockSelectChain = {
        select: jest.fn().mockReturnValue(mockExecChain),
      };

      mockModel.find.mockReturnValue(mockSelectChain as any);

      const result = await repository.getDataSourceVersions();

      expect(result).toBeInstanceOf(Map);
      expect(result.get('longport')).toEqual(new Date('2023-01-03')); // Should use latest
      expect(result.get('iex_cloud')).toEqual(new Date('2023-01-02'));
    });

    it('should handle empty result set', async () => {
      const mockExecChain = {
        exec: jest.fn().mockResolvedValue([]),
      };

      const mockSelectChain = {
        select: jest.fn().mockReturnValue(mockExecChain),
      };

      mockModel.find.mockReturnValue(mockSelectChain as any);

      const result = await repository.getDataSourceVersions();

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });
  });
});