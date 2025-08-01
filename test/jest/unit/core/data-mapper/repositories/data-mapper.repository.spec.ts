import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DataMappingRepository } from '../../../../../../src/core/data-mapper/repositories/data-mapper.repository';
import { DataMappingRule, DataMappingRuleDocument } from '../../../../../../src/core/data-mapper/schemas/data-mapper.schema';
import { PaginationService } from '../../../../../../src/common/modules/pagination/services/pagination.service';
import { CreateDataMappingDto } from '../../../../../../src/core/data-mapper/dto/create-data-mapping.dto';
import { UpdateDataMappingDto } from '../../../../../../src/core/data-mapper/dto/update-data-mapping.dto';
import { DataMappingQueryDto } from '../../../../../../src/core/data-mapper/dto/data-mapping-query.dto';

describe('DataMappingRepository', () => {
  let repository: DataMappingRepository;
  let mockDataMappingRuleModel: any;
  let mockPaginationService: any;

  beforeEach(async () => {
    // 创建一个模拟的 Model 构造函数
    const MockModel: any = jest.fn().mockImplementation((data) => {
      return {
        ...data,
        save: jest.fn().mockResolvedValue(data)
      };
    });
    
    // 添加所有静态方法到模拟模型
    MockModel.create = jest.fn();
    MockModel.findById = jest.fn();
    MockModel.find = jest.fn();
    MockModel.findByIdAndUpdate = jest.fn();
    MockModel.findByIdAndDelete = jest.fn();
    MockModel.countDocuments = jest.fn();
    MockModel.distinct = jest.fn();
    MockModel.findOne = jest.fn();
    MockModel.sort = jest.fn();
    MockModel.skip = jest.fn();
    MockModel.limit = jest.fn();
    MockModel.lean = jest.fn();
    MockModel.exec = jest.fn();
    
    mockDataMappingRuleModel = MockModel;

    mockPaginationService = {
      normalizePaginationQuery: jest.fn().mockReturnValue({ page: 1, limit: 10 }),
      calculateSkip: jest.fn().mockReturnValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataMappingRepository,
        {
          provide: getModelToken(DataMappingRule.name),
          useValue: mockDataMappingRuleModel,
        },
        {
          provide: PaginationService,
          useValue: mockPaginationService,
        },
      ],
    }).compile();

    repository = module.get<DataMappingRepository>(DataMappingRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a new data mapping rule', async () => {
      const createDto: CreateDataMappingDto = {
        name: 'Test Rule',
        provider: 'TestProvider',
        transDataRuleListType: 'TestType',
        sharedDataFieldMappings: [],
      };
      
      const mockSavedData = {
        ...createDto,
        isActive: true,
        version: '1.0.0',
        id: '123'
      };
      
      // 模拟 save 方法返回值
      const mockSave = jest.fn().mockResolvedValue(mockSavedData);
      
      // 模拟构造函数实例的 save 方法
      mockDataMappingRuleModel.mockImplementationOnce(() => ({
        save: mockSave
      }));
      
      const result = await repository.create(createDto);
      
      expect(result).toBeDefined();
      expect(mockSave).toHaveBeenCalled();
      expect(mockDataMappingRuleModel).toHaveBeenCalledWith(expect.objectContaining({
        ...createDto,
        isActive: true,
        version: '1.0.0'
      }));
    });

    it('should use provided isActive and version', async () => {
      const createDto: CreateDataMappingDto = {
        name: 'Test Rule',
        provider: 'TestProvider',
        transDataRuleListType: 'TestType',
        isActive: false,
        version: '2.0.0',
        sharedDataFieldMappings: [],
      };
      
      const mockSavedData = {
        ...createDto,
        id: '123'
      };
      
      // 模拟 save 方法返回值
      const mockSave = jest.fn().mockResolvedValue(mockSavedData);
      
      // 模拟构造函数实例的 save 方法
      mockDataMappingRuleModel.mockImplementationOnce(() => ({
        save: mockSave
      }));
      
      const result = await repository.create(createDto);
      
      expect(result).toBeDefined();
      expect(mockSave).toHaveBeenCalled();
      expect(mockDataMappingRuleModel).toHaveBeenCalledWith(expect.objectContaining({
        ...createDto,
        isActive: false,
        version: '2.0.0'
      }));
    });
  });

  describe('findById', () => {
    it('should find a data mapping rule by ID', async () => {
      const mockResult = { _id: '1', name: 'Test' };
      mockDataMappingRuleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockResult)
      });

      const result = await repository.findById('1');
      expect(result).toEqual(mockResult);
      expect(mockDataMappingRuleModel.findById).toHaveBeenCalledWith('1');
    });
  });

  describe('findAll', () => {
    it('should find all active data mapping rules sorted by createdAt', async () => {
      const mockResults = [{ _id: '1' }, { _id: '2' }];
      mockDataMappingRuleModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockResults)
        })
      });

      const result = await repository.findAll();
      expect(result).toEqual(mockResults);
      expect(mockDataMappingRuleModel.find).toHaveBeenCalledWith({ isActive: true });
    });
  });

  describe('findAllIncludingDeactivated', () => {
    it('should find all data mapping rules including deactivated ones', async () => {
      const mockResults = [{ _id: '1' }, { _id: '2' }];
      mockDataMappingRuleModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockResults)
        })
      });

      const result = await repository.findAllIncludingDeactivated();
      expect(result).toEqual(mockResults);
      expect(mockDataMappingRuleModel.find).toHaveBeenCalledWith();
    });
  });

  describe('findByProvider', () => {
    it('should find data mapping rules by provider', async () => {
      const mockResults = [{ _id: '1', provider: 'P1' }];
      mockDataMappingRuleModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockResults)
        })
      });

      const result = await repository.findByProvider('P1');
      expect(result).toEqual(mockResults);
      expect(mockDataMappingRuleModel.find).toHaveBeenCalledWith({ provider: 'P1', isActive: true });
    });
  });

  describe('findByProviderAndType', () => {
    it('should find data mapping rules by provider and type', async () => {
      const mockResults = [{ _id: '1', provider: 'P1', transDataRuleListType: 'T1' }];
      mockDataMappingRuleModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockResults)
        })
      });

      const result = await repository.findByProviderAndType('P1', 'T1');
      expect(result).toEqual(mockResults);
      expect(mockDataMappingRuleModel.find).toHaveBeenCalledWith({ provider: 'P1', transDataRuleListType: 'T1', isActive: true });
    });
  });

  describe('findPaginated', () => {
    it('should return paginated data mapping rules', async () => {
      const query: DataMappingQueryDto = { page: 1, limit: 10, provider: 'Test' };
      const mockItems = [{ _id: '1' }];
      const mockTotal = 1;

      // 模拟链式调用返回
      mockDataMappingRuleModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockItems)
              })
            })
          })
        })
      });
      
      mockDataMappingRuleModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTotal)
      });

      const result = await repository.findPaginated(query);
      expect(result.items).toEqual(mockItems);
      expect(result.total).toEqual(mockTotal);
      expect(mockPaginationService.normalizePaginationQuery).toHaveBeenCalledWith(query);
      expect(mockPaginationService.calculateSkip).toHaveBeenCalledWith(1, 10);
    });

    it('should apply search filter', async () => {
      const query: DataMappingQueryDto = { page: 1, limit: 10, search: 'keyword' };
      const mockItems = [{ _id: '1' }];
      const mockTotal = 1;

      // 模拟链式调用返回
      mockDataMappingRuleModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockItems)
              })
            })
          })
        })
      });
      
      mockDataMappingRuleModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTotal)
      });

      await repository.findPaginated(query);
      expect(mockDataMappingRuleModel.find).toHaveBeenCalled();
    });

    it('should apply isActive filter', async () => {
      const query: DataMappingQueryDto = { page: 1, limit: 10, isActive: false };
      const mockItems = [{ _id: '1' }];
      const mockTotal = 1;

      // 模拟链式调用返回
      mockDataMappingRuleModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockItems)
              })
            })
          })
        })
      });
      
      mockDataMappingRuleModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTotal)
      });

      await repository.findPaginated(query);
      expect(mockDataMappingRuleModel.find).toHaveBeenCalled();
    });
  });

  describe('updateById', () => {
    it('should update a data mapping rule by ID', async () => {
      const updateDto: UpdateDataMappingDto = { name: 'Updated Name' };
      const mockResult = { _id: '1', name: 'Updated Name' };
      mockDataMappingRuleModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockResult)
      });

      const result = await repository.updateById('1', updateDto);
      expect(result).toEqual(mockResult);
      expect(mockDataMappingRuleModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '1',
        updateDto,
        { new: true },
      );
    });
  });

  describe('deleteById', () => {
    it('should delete a data mapping rule by ID', async () => {
      const mockResult = { _id: '1', name: 'Deleted Name' };
      mockDataMappingRuleModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockResult)
      });

      const result = await repository.deleteById('1');
      expect(result).toEqual(mockResult);
      expect(mockDataMappingRuleModel.findByIdAndDelete).toHaveBeenCalledWith('1');
    });
  });

  describe('activate', () => {
    it('should activate a data mapping rule by ID', async () => {
      const mockResult = { _id: '1', isActive: true };
      mockDataMappingRuleModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockResult)
      });

      const result = await repository.activate('1');
      expect(result).toEqual(mockResult);
      expect(mockDataMappingRuleModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '1',
        { isActive: true },
        { new: true },
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate a data mapping rule by ID', async () => {
      const mockResult = { _id: '1', isActive: false };
      mockDataMappingRuleModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockResult)
      });

      const result = await repository.deactivate('1');
      expect(result).toEqual(mockResult);
      expect(mockDataMappingRuleModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '1',
        { isActive: false },
        { new: true },
      );
    });
  });

  describe('getProviders', () => {
    it('should return distinct providers', async () => {
      const mockResults = ['P1', 'P2'];
      mockDataMappingRuleModel.distinct.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockResults)
      });

      const result = await repository.getProviders();
      expect(result).toEqual(mockResults);
      expect(mockDataMappingRuleModel.distinct).toHaveBeenCalledWith('provider');
    });
  });

  describe('getRuleListTypes', () => {
    it('should return distinct rule list types', async () => {
      const mockResults = ['T1', 'T2'];
      mockDataMappingRuleModel.distinct.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockResults)
      });

      const result = await repository.getRuleListTypes();
      expect(result).toEqual(mockResults);
      expect(mockDataMappingRuleModel.distinct).toHaveBeenCalledWith('transDataRuleListType');
    });
  });

  describe('countByProvider', () => {
    it('should count documents by provider', async () => {
      const mockCount = 5;
      mockDataMappingRuleModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCount)
      });

      const result = await repository.countByProvider('P1');
      expect(result).toEqual(mockCount);
      expect(mockDataMappingRuleModel.countDocuments).toHaveBeenCalledWith({ provider: 'P1', isActive: true });
    });
  });

  describe('countByRuleListType', () => {
    it('should count documents by rule list type', async () => {
      const mockCount = 3;
      mockDataMappingRuleModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCount)
      });

      const result = await repository.countByRuleListType('T1');
      expect(result).toEqual(mockCount);
      expect(mockDataMappingRuleModel.countDocuments).toHaveBeenCalledWith({ transDataRuleListType: 'T1', isActive: true });
    });
  });

  describe('findBestMatchingRule', () => {
    it('should find the best matching rule', async () => {
      const mockResult = { _id: '1', provider: 'P1', transDataRuleListType: 'T1' };
      mockDataMappingRuleModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockResult)
        })
      });

      const result = await repository.findBestMatchingRule('P1', 'T1');
      expect(result).toEqual(mockResult);
      expect(mockDataMappingRuleModel.findOne).toHaveBeenCalledWith({ provider: 'P1', transDataRuleListType: 'T1', isActive: true });
    });
  });
});