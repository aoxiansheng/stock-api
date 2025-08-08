
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DataMapperService } from '../../../../../../src/core/data-mapper/services/data-mapper.service';
import { DataMappingRepository } from '../../../../../../src/core/data-mapper/repositories/data-mapper.repository';
import { PaginationService } from '../../../../../../src/common/modules/pagination/services/pagination.service';
import { FeatureFlags } from '../../../../../../src/common/config/feature-flags.config';
import { CreateDataMappingDto } from '../../../../../../src/core/data-mapper/dto/create-data-mapping.dto';
import { DataMappingResponseDto } from '../../../../../../src/core/data-mapper/dto/data-mapping-response.dto';
import { Types } from 'mongoose';

// Mock a Mongoose document
const mockDoc = {
  _id: new Types.ObjectId(),
  name: 'Test Rule',
  provider: 'test',
  transDataRuleListType: 'test_type',
  sharedDataFieldMappings: [],
  isActive: true,
  version: '1.0',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock Repository and Services
const mockRepository = {
  create: jest.fn().mockResolvedValue(mockDoc),
  findById: jest.fn().mockResolvedValue(mockDoc),
  updateById: jest.fn().mockResolvedValue(mockDoc),
  deleteById: jest.fn().mockResolvedValue(mockDoc),
  activate: jest.fn().mockResolvedValue(mockDoc),
  deactivate: jest.fn().mockResolvedValue(mockDoc),
  findPaginated: jest.fn().mockResolvedValue({ items: [mockDoc], total: 1 }),
  findAll: jest.fn().mockResolvedValue([mockDoc]),
  findAllIncludingDeactivated: jest.fn().mockResolvedValue([mockDoc]),
  findByProvider: jest.fn().mockResolvedValue([mockDoc]),
  findByProviderAndType: jest.fn().mockResolvedValue([mockDoc]),
  getProviders: jest.fn().mockResolvedValue(['provider1', 'provider2']),
  getRuleListTypes: jest.fn().mockResolvedValue(['type1', 'type2']),
  findBestMatchingRule: jest.fn().mockResolvedValue(mockDoc),
};

const mockPaginationService = {
  createPaginatedResponseFromQuery: jest.fn((items, query, total) => ({
    items: items,
    pagination: { 
      total, 
      page: query.page, 
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
      hasNext: query.page * query.limit < total,
      hasPrev: query.page > 1
    },
  })),
};

const mockFeatureFlags = {
  dataTransformCacheEnabled: true,
  ruleCacheMaxSize: 100,
  ruleCacheTtl: 10 * 60 * 1000,
  objectPoolEnabled: true,
  objectPoolSize: 100,
  ruleCompilationEnabled: true,
};


describe('DataMapperService', () => {
  let service: DataMapperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataMapperService,
        { provide: DataMappingRepository, useValue: mockRepository },
        { provide: PaginationService, useValue: mockPaginationService },
        { provide: FeatureFlags, useValue: mockFeatureFlags },
      ],
    }).compile();

    service = module.get<DataMapperService>(DataMapperService);
    jest.clearAllMocks();
  });

  it('服务应被定义', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('应能成功创建一条映射规则', async () => {
      const createDto = new CreateDataMappingDto();
      const result = await service.create(createDto);
      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      // 修改断言，验证返回值符合DataMappingResponseDto结构
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('provider');
      expect(result).toHaveProperty('transDataRuleListType');
      expect(result).toHaveProperty('sharedDataFieldMappings');
      expect(result.id).toBe(mockDoc._id.toString());
    });
  });

  describe('findOne', () => {
    it('当找到规则时，应返回该规则', async () => {
      const id = mockDoc._id.toString();
      const result = await service.findOne(id);
      expect(mockRepository.findById).toHaveBeenCalledWith(id);
      // 修改断言，验证返回值符合DataMappingResponseDto结构
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('provider');
      expect(result).toHaveProperty('transDataRuleListType');
    });

    it('当找不到规则时，应抛出 NotFoundException', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('应能成功更新一条规则', async () => {
      const id = mockDoc._id.toString();
      const updateDto = { name: 'Updated Name' };
      const result = await service.update(id, updateDto as any);
      expect(mockRepository.updateById).toHaveBeenCalledWith(id, updateDto);
      expect(result.name).toBe(mockDoc.name); // Mock returns original doc
    });
  });

  describe('remove', () => {
    it('应能成功删除一条规则', async () => {
      const id = mockDoc._id.toString();
      await service.remove(id);
      expect(mockRepository.deleteById).toHaveBeenCalledWith(id);
    });
  });

  describe('applyMappingRule', () => {
    it('应能应用规则并转换数据', async () => {
      const rule = {
        ...mockDoc,
        sharedDataFieldMappings: [{ sourceField: 'a', targetField: 'b' }],
      };
      mockRepository.findById.mockResolvedValue(rule);
      const sourceData = { a: 123 };
      const result = await service.applyMappingRule(rule._id.toString(), sourceData);
      expect(result).toEqual([{ b: 123 }]);
    });

    it('应能处理带转换函数的数据', async () => {
        const rule = {
          ...mockDoc,
          sharedDataFieldMappings: [
            { 
              sourceField: 'a', 
              targetField: 'b', 
              transform: { type: 'multiply', value: 2 } 
            }
          ],
        };
        mockRepository.findById.mockResolvedValue(rule);
        const sourceData = { a: 10 };
        const result = await service.applyMappingRule(rule._id.toString(), sourceData);
        expect(result).toEqual([{ b: 20 }]);
      });
  });

  describe('parseJson', () => {
    it('当提供有效 JSON 字符串时应能解析字段', async () => {
      const result = await service.parseJson({ jsonString: '{ "a": { "b": 1 } }' });
      expect(result.fields).toContain('a.b');
    });

    it('当提供有效 JSON 对象时应能解析字段', async () => {
      const result = await service.parseJson({ jsonData: { a: { b: 1 } } });
      expect(result.fields).toContain('a.b');
      expect(result.structure).toEqual({ a: { b: 1 } });
    });

    it('当提供数组时应能解析第一个元素的字段', async () => {
      const result = await service.parseJson({ jsonData: [{ a: 1, b: 2 }] });
      expect(result.fields).toContain('[0].a');
      expect(result.fields).toContain('[0].b');
    });

    it('当提供嵌套数组时应能解析字段', async () => {
      const result = await service.parseJson({ jsonData: { items: [{ id: 1, name: 'test' }] } });
      expect(result.fields).toContain('items');
      expect(result.fields).toContain('items[0].id');
      expect(result.fields).toContain('items[0].name');
    });

    it('当未提供数据时应抛出 BadRequestException', async () => {
      await expect(service.parseJson({})).rejects.toThrow(BadRequestException);
    });

    it('当提供无效 JSON 字符串时应抛出 BadRequestException', async () => {
      await expect(service.parseJson({ jsonString: '{ invalid json' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('mapData', () => {
    it('应能通过接口映射数据', async () => {
      const rule = {
        ...mockDoc,
        sharedDataFieldMappings: [{ sourceField: 'test', targetField: 'mapped' }],
      };
      mockRepository.findById.mockResolvedValue(rule);
      const result = await service.mapData({ test: 'value' }, rule._id.toString());
      expect(result).toEqual([{ mapped: 'value' }]);
    });
  });

  describe('saveMappingRule', () => {
    it('应能通过接口保存映射规则', async () => {
      const createDto = new CreateDataMappingDto();
      await service.saveMappingRule(createDto);
      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('getMappingRule', () => {
    it('应能根据provider和type获取映射规则', async () => {
      mockRepository.findByProviderAndType.mockResolvedValue([mockDoc]);
      const result = await service.getMappingRule('test-provider', 'test-type');
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id');
    });
  });

  describe('findAll', () => {
    it('应能获取所有活跃规则', async () => {
      mockRepository.findAll.mockResolvedValue([mockDoc]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id');
    });
  });

  describe('findAllIncludingDeactivated', () => {
    it('应能获取所有规则包括已停用的', async () => {
      mockRepository.findAllIncludingDeactivated.mockResolvedValue([mockDoc]);
      const result = await service.findAllIncludingDeactivated();
      expect(result).toHaveLength(1);
    });
  });

  describe('findByProvider', () => {
    it('应能根据provider查找规则', async () => {
      mockRepository.findByProvider.mockResolvedValue([mockDoc]);
      const result = await service.findByProvider('test-provider');
      expect(result).toHaveLength(1);
      expect(mockRepository.findByProvider).toHaveBeenCalledWith('test-provider');
    });
  });

  describe('findPaginated', () => {
    it('应能分页查找规则', async () => {
      const query = { page: 1, limit: 10 };
      mockRepository.findPaginated.mockResolvedValue({ items: [mockDoc], total: 1 });
      const result = await service.findPaginated(query);
      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('activate', () => {
    it('应能激活规则', async () => {
      const result = await service.activate(mockDoc._id.toString());
      expect(mockRepository.activate).toHaveBeenCalledWith(mockDoc._id.toString());
      expect(result).toHaveProperty('id');
    });

    it('当规则不存在时应抛出NotFoundException', async () => {
      mockRepository.activate.mockResolvedValue(null);
      await expect(service.activate('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('应能停用规则', async () => {
      const result = await service.deactivate(mockDoc._id.toString());
      expect(mockRepository.deactivate).toHaveBeenCalledWith(mockDoc._id.toString());
      expect(result).toHaveProperty('id');
    });

    it('当规则不存在时应抛出NotFoundException', async () => {
      mockRepository.deactivate.mockResolvedValue(null);
      await expect(service.deactivate('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update - error cases', () => {
    it('当更新不存在的规则时应抛出NotFoundException', async () => {
      mockRepository.updateById.mockResolvedValue(null);
      await expect(service.update('non-existent', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove - error cases', () => {
    it('当删除不存在的规则时应抛出NotFoundException', async () => {
      mockRepository.deleteById.mockResolvedValue(null);
      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFieldSuggestions', () => {
    it('应能获取字段建议', async () => {
      const dto = {
        sourceFields: ['user_name', 'user_id'],
        targetFields: ['userName', 'userId', 'id', 'name']
      };
      const result = await service.getFieldSuggestions(dto);
      expect(result.suggestions).toHaveLength(2);
      expect(result.suggestions[0].sourceField).toBe('user_name');
      expect(result.suggestions[0].suggestions.length).toBeGreaterThan(0);
    });

    it('当没有提供字段时应返回空建议', async () => {
      const result = await service.getFieldSuggestions({ sourceFields: [], targetFields: [] });
      expect(result.suggestions).toHaveLength(0);
    });
  });

  describe('applyMappingRule - advanced scenarios', () => {
    it('应能处理不存在的规则ID', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.applyMappingRule('non-existent', {})).rejects.toThrow(NotFoundException);
    });

    it('应能处理secu_quote数组数据', async () => {
      const rule = {
        ...mockDoc,
        sharedDataFieldMappings: [{ sourceField: 'price', targetField: 'currentPrice' }],
      };
      mockRepository.findById.mockResolvedValue(rule);
      const sourceData = {
        secu_quote: [{ price: 100 }, { price: 200 }]
      };
      const result = await service.applyMappingRule(rule._id.toString(), sourceData);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ currentPrice: 100 });
      expect(result[1]).toEqual({ currentPrice: 200 });
    });

    it('应能处理basic_info数组数据', async () => {
      const rule = {
        ...mockDoc,
        sharedDataFieldMappings: [{ sourceField: 'name', targetField: 'companyName' }],
      };
      mockRepository.findById.mockResolvedValue(rule);
      const sourceData = {
        basic_info: [{ name: 'Company A' }, { name: 'Company B' }]
      };
      const result = await service.applyMappingRule(rule._id.toString(), sourceData);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ companyName: 'Company A' });
    });

    it('应能处理数组表示法的源字段', async () => {
      const rule = {
        ...mockDoc,
        sharedDataFieldMappings: [{ sourceField: 'secu_quote[0].price', targetField: 'currentPrice' }],
      };
      mockRepository.findById.mockResolvedValue(rule);
      const sourceData = {
        secu_quote: [{ price: 150 }],
        other: { price: 999 }
      };
      const result = await service.applyMappingRule(rule._id.toString(), sourceData);
      expect(result[0]).toEqual({ currentPrice: 150 });
    });

    it('应能处理undefined源值', async () => {
      const rule = {
        ...mockDoc,
        sharedDataFieldMappings: [{ sourceField: 'nonexistent', targetField: 'target' }],
      };
      mockRepository.findById.mockResolvedValue(rule);
      const result = await service.applyMappingRule(rule._id.toString(), { other: 'value' });
      expect(result[0]).toEqual({});
    });
  });

  describe('applyTransform', () => {
    it('应能进行乘法转换', async () => {
      const rule = {
        ...mockDoc,
        sharedDataFieldMappings: [{ 
          sourceField: 'value', 
          targetField: 'result',
          transform: { type: 'multiply', value: 3 }
        }],
      };
      mockRepository.findById.mockResolvedValue(rule);
      const result = await service.applyMappingRule(rule._id.toString(), { value: 10 });
      expect(result[0]).toEqual({ result: 30 });
    });

    it('应能进行除法转换', async () => {
      const rule = {
        ...mockDoc,
        sharedDataFieldMappings: [{ 
          sourceField: 'value', 
          targetField: 'result',
          transform: { type: 'divide', value: 2 }
        }],
      };
      mockRepository.findById.mockResolvedValue(rule);
      const result = await service.applyMappingRule(rule._id.toString(), { value: 20 });
      expect(result[0]).toEqual({ result: 10 });
    });

    it('应能进行加法转换', async () => {
      const rule = {
        ...mockDoc,
        sharedDataFieldMappings: [{ 
          sourceField: 'value', 
          targetField: 'result',
          transform: { type: 'add', value: 5 }
        }],
      };
      mockRepository.findById.mockResolvedValue(rule);
      const result = await service.applyMappingRule(rule._id.toString(), { value: 10 });
      expect(result[0]).toEqual({ result: 15 });
    });

    it('应能进行减法转换', async () => {
      const rule = {
        ...mockDoc,
        sharedDataFieldMappings: [{ 
          sourceField: 'value', 
          targetField: 'result',
          transform: { type: 'subtract', value: 3 }
        }],
      };
      mockRepository.findById.mockResolvedValue(rule);
      const result = await service.applyMappingRule(rule._id.toString(), { value: 10 });
      expect(result[0]).toEqual({ result: 7 });
    });

    it('应能进行格式化转换', async () => {
      const rule = {
        ...mockDoc,
        sharedDataFieldMappings: [{ 
          sourceField: 'value', 
          targetField: 'result',
          transform: { type: 'format', value: 'Price: {value}' }
        }],
      };
      mockRepository.findById.mockResolvedValue(rule);
      const result = await service.applyMappingRule(rule._id.toString(), { value: 100 });
      expect(result[0]).toEqual({ result: 'Price: 100' });
    });

    it('应能处理%v占位符的格式化', async () => {
      const rule = {
        ...mockDoc,
        sharedDataFieldMappings: [{ 
          sourceField: 'value', 
          targetField: 'result',
          transform: { type: 'format', value: 'Value: %v USD' }
        }],
      };
      mockRepository.findById.mockResolvedValue(rule);
      const result = await service.applyMappingRule(rule._id.toString(), { value: 100 });
      expect(result[0]).toEqual({ result: 'Value: 100 USD' });
    });

    it('应能处理自定义转换（返回原值）', async () => {
      const rule = {
        ...mockDoc,
        sharedDataFieldMappings: [{ 
          sourceField: 'value', 
          targetField: 'result',
          transform: { type: 'custom', customFunction: 'some_function' }
        }],
      };
      mockRepository.findById.mockResolvedValue(rule);
      const result = await service.applyMappingRule(rule._id.toString(), { value: 100 });
      expect(result[0]).toEqual({ result: 100 });
    });

    it('应能处理未知转换类型', async () => {
      const rule = {
        ...mockDoc,
        sharedDataFieldMappings: [{ 
          sourceField: 'value', 
          targetField: 'result',
          transform: { type: 'unknown' }
        }],
      };
      mockRepository.findById.mockResolvedValue(rule);
      const result = await service.applyMappingRule(rule._id.toString(), { value: 100 });
      expect(result[0]).toEqual({ result: 100 });
    });

    it('当数值转换遇到非数字时应抛出BadRequestException', async () => {
      const rule = {
        ...mockDoc,
        sharedDataFieldMappings: [{ 
          sourceField: 'value', 
          targetField: 'result',
          transform: { type: 'multiply', value: 2 }
        }],
      };
      mockRepository.findById.mockResolvedValue(rule);
      await expect(service.applyMappingRule(rule._id.toString(), { value: 'not_a_number' }))
        .rejects.toThrow(BadRequestException);
    });

    it('应能使用默认转换值', async () => {
      const rule = {
        ...mockDoc,
        sharedDataFieldMappings: [{ 
          sourceField: 'value', 
          targetField: 'result',
          transform: { type: 'multiply' } // 没有提供value，使用默认值
        }],
      };
      mockRepository.findById.mockResolvedValue(rule);
      const result = await service.applyMappingRule(rule._id.toString(), { value: 10 });
      expect(result[0].result).toBeDefined();
    });
  });

  describe('testMappingRule', () => {
    it('应能测试映射规则', async () => {
      const rule = {
        ...mockDoc,
        sharedDataFieldMappings: [{ sourceField: 'input', targetField: 'output' }],
      };
      mockRepository.findById.mockResolvedValue(rule);
      const testDto = {
        ruleId: rule._id.toString(),
        testData: { input: 'test_value' }
      };
      const result = await service.testMappingRule(testDto);
      expect(result.success).toBe(true);
      expect(result.transformedData).toEqual([{ output: 'test_value' }]);
      expect(result.originalData).toEqual({ input: 'test_value' });
    });

    it('当测试失败时应抛出BadRequestException', async () => {
      mockRepository.findById.mockResolvedValueOnce(mockDoc); // for findOne
      mockRepository.findById.mockRejectedValueOnce(new Error('Test error')); // for applyMappingRule
      const testDto = {
        ruleId: mockDoc._id.toString(),
        testData: { input: 'test' }
      };
      await expect(service.testMappingRule(testDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStatistics', () => {
    it('应能获取统计信息', async () => {
      mockRepository.findAllIncludingDeactivated.mockResolvedValue([mockDoc, mockDoc]);
      mockRepository.findAll.mockResolvedValue([mockDoc]);
      mockRepository.getProviders.mockResolvedValue(['provider1', 'provider2']);
      mockRepository.getRuleListTypes.mockResolvedValue(['type1', 'type2']);
      
      const result = await service.getStatistics();
      expect(result.totalRules).toBe(2);
      expect(result.activeRules).toBe(1);
      expect(result.inactiveRules).toBe(1);
      expect(result.providers).toBe(2);
      expect(result.transDataRuleListTypesNum).toBe(2);
      expect(result.providerList).toEqual(['provider1', 'provider2']);
    });
  });

  describe('findBestMatchingRule', () => {
    it('应能找到最佳匹配规则', async () => {
      mockRepository.findBestMatchingRule.mockResolvedValue(mockDoc);
      const result = await service.findBestMatchingRule('test-provider', 'test-type');
      expect(result).toBeDefined();
      expect(result.id).toBe(mockDoc._id.toString());
    });

    it('当没有匹配规则时应返回null', async () => {
      mockRepository.findBestMatchingRule.mockResolvedValue(null);
      const result = await service.findBestMatchingRule('non-existent', 'type');
      expect(result).toBeNull();
    });
  });

  describe('getPresets', () => {
    it('应能获取预设字段定义', async () => {
      const result = await service.getPresets();
      expect(result).toHaveProperty('stockQuote');
      expect(result).toHaveProperty('stockBasicInfo');
      expect(result).toHaveProperty('availablePresets');
      expect(result).toHaveProperty('totalFields');
    });
  });

  describe('performance monitoring', () => {
    it('应能记录慢查询警告', async () => {
      const rule = {
        ...mockDoc,
        sharedDataFieldMappings: [{ sourceField: 'test', targetField: 'result' }],
      };
      mockRepository.findById.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(rule), 1500)) // 模拟慢查询
      );
      
      const loggerWarnSpy = jest.spyOn((service as any).logger, 'warn');
      await service.applyMappingRule(rule._id.toString(), { test: 'value' });
      
      // 检查性能警告日志是否被调用
      expect(loggerWarnSpy).toHaveBeenCalled();
    });
  });

});
