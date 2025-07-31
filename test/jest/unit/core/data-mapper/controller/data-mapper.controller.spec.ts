import { Test, TestingModule } from '@nestjs/testing';
import { DataMapperController } from '@core/data-mapper/controller/data-mapper.controller';
import { DataMapperService } from '@core/data-mapper/services/data-mapper.service';
import { CreateDataMappingDto } from '@core/data-mapper/dto/create-data-mapping.dto';
import { DataMappingResponseDto, ParsedFieldsResponseDto, FieldSuggestionResponseDto } from '@core/data-mapper/dto/data-mapping-response.dto';
import { DataMappingQueryDto } from '@core/data-mapper/dto/data-mapping-query.dto';
import { UpdateDataMappingDto, ParseJsonDto, FieldSuggestionDto, ApplyMappingDto, TestMappingDto } from '@core/data-mapper/dto/update-data-mapping.dto';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PaginatedDataDto } from '@common/modules/pagination/dto/paginated-data';
import { PermissionService } from '../../../../../../src/auth/services/permission.service';
import { Reflector } from '@nestjs/core';
import { UnifiedPermissionsGuard } from '../../../../../../src/auth/guards/unified-permissions.guard';
import { RateLimitGuard } from '../../../../../../src/auth/guards/rate-limit.guard';
import { RateLimitService } from '../../../../../../src/auth/services/rate-limit.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerModule } from '@nestjs/throttler';


describe('DataMapperController', () => {
  let controller: DataMapperController;
  let service: jest.Mocked<DataMapperService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{
          name: 'default',
          ttl: 60000,
          limit: 10,
        }]),
      ],
      controllers: [DataMapperController],
      providers: [
        {
          provide: DataMapperService,
          useValue: {
            create: jest.fn(),
            parseJson: jest.fn(),
            getFieldSuggestions: jest.fn(),
            applyMappingRule: jest.fn(),
            testMappingRule: jest.fn(),
            findPaginated: jest.fn(),
            findAll: jest.fn(),
            findAllIncludingDeactivated: jest.fn(),
            findByProvider: jest.fn(),
            getStatistics: jest.fn(),
            getPresets: jest.fn(),
            findBestMatchingRule: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            activate: jest.fn(),
            deactivate: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: PermissionService,
          useValue: {
            checkPermissions: jest.fn(),
            getEffectivePermissions: jest.fn(),
            combinePermissions: jest.fn(),
            createPermissionContext: jest.fn(),
            invalidateCacheFor: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
            getAll: jest.fn(),
            getAllAndOverride: jest.fn(),
            getAllAndMerge: jest.fn(),
          },
        },
        {
          provide: RateLimitGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: RateLimitService,
          useValue: {
            consume: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: UnifiedPermissionsGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: ThrottlerGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    controller = module.get<DataMapperController>(DataMapperController);
    service = module.get(DataMapperService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockDataMappingResponse: DataMappingResponseDto = {
    id: 'some-id',
    name: 'Test Mapping',
    provider: 'test-provider',
    transDataRuleListType: 'test-type',
    sharedDataFieldMappings: [],
    isActive: true,
    version: '1.0.0', // 添加缺少的version属性
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('create', () => {
    const createDto: CreateDataMappingDto = {
      name: 'New Mapping',
      provider: 'new-provider',
      transDataRuleListType: 'new-type',
      sharedDataFieldMappings: [],
    };

    it('should create a data mapping rule', async () => {
      service.create.mockResolvedValue(mockDataMappingResponse);
      const result = await controller.create(createDto);
      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockDataMappingResponse);
    });

    it('should throw error if service fails', async () => {
      service.create.mockRejectedValue(new InternalServerErrorException());
      await expect(controller.create(createDto)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('parseJson', () => {
    const parseJsonDto: ParseJsonDto = { jsonData: '{ "key": "value" }' };
    const parsedFieldsResponse: ParsedFieldsResponseDto = { fields: ['key'], structure: { key: 'string' } };

    it('should parse JSON and extract fields', async () => {
      service.parseJson.mockResolvedValue(parsedFieldsResponse);
      const result = await controller.parseJson(parseJsonDto);
      expect(service.parseJson).toHaveBeenCalledWith(parseJsonDto);
      expect(result).toEqual(parsedFieldsResponse);
    });

    it('should throw error if service fails', async () => {
      service.parseJson.mockRejectedValue(new InternalServerErrorException());
      await expect(controller.parseJson(parseJsonDto)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getFieldSuggestions', () => {
    const fieldSuggestionDto: FieldSuggestionDto = { sourceFields: ['s1'], targetFields: ['t1'] };
    const fieldSuggestionResponse: FieldSuggestionResponseDto = { 
      suggestions: [{ 
        sourceField: 's1', 
        suggestions: [{ field: 't1', score: 0.9 }]
      }] 
    };

    it('should get field mapping suggestions', async () => {
      service.getFieldSuggestions.mockResolvedValue(fieldSuggestionResponse);
      const result = await controller.getFieldSuggestions(fieldSuggestionDto);
      expect(service.getFieldSuggestions).toHaveBeenCalledWith(fieldSuggestionDto);
      expect(result).toEqual(fieldSuggestionResponse);
    });
  });

  describe('applyMappingRule', () => {
    const applyMappingDto: ApplyMappingDto = { ruleId: 'rule-1', sourceData: { key: 'value' } };

    it('should apply mapping rule to transform data', async () => {
      service.applyMappingRule.mockResolvedValue([{ key: 'transformedValue' }]); // 返回转换后的数据数组
      const result = await controller.applyMappingRule(applyMappingDto);
      expect(service.applyMappingRule).toHaveBeenCalledWith(applyMappingDto.ruleId, applyMappingDto.sourceData);
      expect(result).toEqual([{ key: 'transformedValue' }]);
    });

    it('should throw error if service fails', async () => {
      service.applyMappingRule.mockRejectedValue(new InternalServerErrorException());
      await expect(controller.applyMappingRule(applyMappingDto)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('testMappingRule', () => {
    const testMappingDto: TestMappingDto = { ruleId: 'rule-1', testData: { key: 'value' } };

    it('should test mapping rule', async () => {
      service.testMappingRule.mockResolvedValue({ 
        success: true,
        ruleId: 'rule-1',
        ruleName: 'Test Rule',
        provider: 'test-provider',
        transDataRuleListType: 'test-type',
        originalData: { key: 'value' },
        transformedData: [{ key: 'transformedValue' }],
        message: 'Success'
      });
      const result = await controller.testMappingRule(testMappingDto);
      expect(service.testMappingRule).toHaveBeenCalledWith(testMappingDto);
      expect(result).toEqual({
        success: true,
        ruleId: 'rule-1',
        ruleName: 'Test Rule',
        provider: 'test-provider',
        transDataRuleListType: 'test-type',
        originalData: { key: 'value' },
        transformedData: [{ key: 'transformedValue' }],
        message: 'Success'
      });
    });
  });

  describe('findAll', () => {
    const queryDto: DataMappingQueryDto = { page: 1, limit: 10 };
    const paginatedResponse = new PaginatedDataDto<DataMappingResponseDto>(
      [mockDataMappingResponse], // 数据
      { 
        page: 1, 
        limit: 10,
        total: 1,
        totalPages: 1, 
        hasNext: false, 
        hasPrev: false
      } // 分页信息
    );

    it('should get paginated data mapping rules', async () => {
      service.findPaginated.mockResolvedValue(paginatedResponse);
      const result = await controller.findAll(queryDto);
      expect(service.findPaginated).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(paginatedResponse);
    });
  });

  describe('findAllActive', () => {
    it('should get all active data mapping rules', async () => {
      service.findAll.mockResolvedValue([mockDataMappingResponse]);
      const result = await controller.findAllActive();
      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockDataMappingResponse]);
    });
  });

  describe('findAllIncludingDeactivated', () => {
    it('should get all data mapping rules including deactivated ones', async () => {
      service.findAllIncludingDeactivated.mockResolvedValue([mockDataMappingResponse]);
      const result = await controller.findAllIncludingDeactivated();
      expect(service.findAllIncludingDeactivated).toHaveBeenCalled();
      expect(result).toEqual([mockDataMappingResponse]);
    });
  });

  describe('findByProvider', () => {
    it('should get data mapping rules by provider', async () => {
      service.findByProvider.mockResolvedValue([mockDataMappingResponse]);
      const result = await controller.findByProvider('test-provider');
      expect(service.findByProvider).toHaveBeenCalledWith('test-provider');
      expect(result).toEqual([mockDataMappingResponse]);
    });
  });

  describe('getStatistics', () => {
    it('should get data mapping rules statistics', async () => {
      service.getStatistics.mockResolvedValue({
        totalRules: 1,
        activeRules: 1,
        inactiveRules: 0,
        providers: 1,
        transDataRuleListTypesNum: 1,
        providerList: ['test-provider'],
        transDataRuleListTypeList: ['test-type']
      });
      const result = await controller.getStatistics();
      expect(service.getStatistics).toHaveBeenCalled();
      expect(result).toEqual({
        totalRules: 1,
        activeRules: 1,
        inactiveRules: 0,
        providers: 1,
        transDataRuleListTypesNum: 1,
        providerList: ['test-provider'],
        transDataRuleListTypeList: ['test-type']
      });
    });
  });

  describe('getPresets', () => {
    it('should get preset field mappings', async () => {
      service.getPresets.mockResolvedValue({ stockQuote: {}, stockBasicInfo: {}, availablePresets: [], totalFields: {} });
      const result = await controller.getPresets();
      expect(service.getPresets).toHaveBeenCalled();
      expect(result).toEqual({ stockQuote: {}, stockBasicInfo: {}, availablePresets: [], totalFields: {} });
    });

    it('should throw error if service fails', async () => {
      service.getPresets.mockRejectedValue(new InternalServerErrorException());
      await expect(controller.getPresets()).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findBestMatchingRule', () => {
    it('should find best matching rule', async () => {
      service.findBestMatchingRule.mockResolvedValue(mockDataMappingResponse);
      const result = await controller.findBestMatchingRule('provider', 'type');
      expect(service.findBestMatchingRule).toHaveBeenCalledWith('provider', 'type');
      expect(result).toEqual(mockDataMappingResponse);
    });
  });

  describe('findOne', () => {
    it('should get data mapping rule by ID', async () => {
      service.findOne.mockResolvedValue(mockDataMappingResponse);
      const result = await controller.findOne('some-id');
      expect(service.findOne).toHaveBeenCalledWith('some-id');
      expect(result).toEqual(mockDataMappingResponse);
    });
  });

  describe('update', () => {
    const updateDto: UpdateDataMappingDto = { name: 'Updated Name' };

    it('should update data mapping rule', async () => {
      service.update.mockResolvedValue({ ...mockDataMappingResponse, ...updateDto });
      const result = await controller.update('some-id', updateDto);
      expect(service.update).toHaveBeenCalledWith('some-id', updateDto);
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('activate', () => {
    it('should activate data mapping rule', async () => {
      service.activate.mockResolvedValue({ ...mockDataMappingResponse, isActive: true });
      const result = await controller.activate('some-id');
      expect(service.activate).toHaveBeenCalledWith('some-id');
      expect(result.isActive).toBe(true);
    });

    it('should throw error if service fails', async () => {
      service.activate.mockRejectedValue(new InternalServerErrorException());
      await expect(controller.activate('some-id')).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('deactivate', () => {
    it('should deactivate data mapping rule', async () => {
      service.deactivate.mockResolvedValue({ ...mockDataMappingResponse, isActive: false });
      const result = await controller.deactivate('some-id');
      expect(service.deactivate).toHaveBeenCalledWith('some-id');
      expect(result.isActive).toBe(false);
    });

    it('should throw error if service fails', async () => {
      service.deactivate.mockRejectedValue(new InternalServerErrorException());
      await expect(controller.deactivate('some-id')).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('remove', () => {
    it('should delete data mapping rule', async () => {
      service.remove.mockResolvedValue(mockDataMappingResponse);
      const result = await controller.remove('some-id');
      expect(service.remove).toHaveBeenCalledWith('some-id');
      expect(result).toEqual(mockDataMappingResponse);
    });

    it('should throw error if service fails', async () => {
      service.remove.mockRejectedValue(new InternalServerErrorException());
      await expect(controller.remove('some-id')).rejects.toThrow(InternalServerErrorException);
    });
  });
});