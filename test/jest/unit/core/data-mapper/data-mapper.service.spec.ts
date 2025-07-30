import { Test, TestingModule } from "@nestjs/testing";
import { DataMapperService } from "../../../../../src/core/data-mapper/service/data-mapper.service";
import { DataMappingRepository } from "../../../../../src/core/data-mapper/repositories/data-mapper.repository";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { TRANSFORMATION_TYPES } from "../../../../../src/core/data-mapper/constants/data-mapper.constants";
import { ObjectUtils } from "../../../../../src/core/shared/utils/object.util";
import { StringUtils } from "../../../../../src/core/shared/utils/string.util";
import { CreateDataMappingDto } from "../../../../../src/core/data-mapper/dto/create-data-mapping.dto";
import { UpdateDataMappingDto } from "../../../../../src/core/data-mapper/dto/update-data-mapping.dto";
import { DataMappingQueryDto } from "../../../../../src/core/data-mapper/dto/data-mapping-query.dto";
import { PaginationService } from "../../../../../src/common/modules/pagination/services/pagination.service";
import { PaginatedDataDto } from "../../../../../src/common/modules/pagination/dto/paginated-data";

describe("DataMapperService", () => {
  let service: DataMapperService;
  let repository: DataMappingRepository;
  let paginationService: PaginationService;

  // 使用 as any 类型断言绕过 DataMappingRuleDocument 的严格类型检查
  const mockRule = {
    _id: "rule-id",
    name: "Test Rule",
    provider: "test-provider",
    transDataRuleListType: "test-type",
    sharedDataFieldMappings: [{ sourceField: "a", targetField: "b" }],
    isActive: true,
    version: "1",
    severity: "medium",
    save: jest.fn().mockResolvedValue(this),
  } as any;

  const mockRepository = {
    create: jest.fn().mockResolvedValue(mockRule),
    findAll: jest.fn().mockResolvedValue([mockRule]),
    findAllIncludingDeactivated: jest
      .fn()
      .mockResolvedValue([mockRule, { ...mockRule, isActive: false }]),
    findById: jest.fn().mockResolvedValue(mockRule),
    updateById: jest.fn().mockResolvedValue(mockRule),
    findByProvider: jest.fn().mockResolvedValue([mockRule]),
    findByProviderAndType: jest.fn().mockResolvedValue([mockRule]),
    findPaginated: jest.fn().mockResolvedValue({
      items: [{ ...mockRule }] as any,
      total: 1,
    }),
    activate: jest.fn().mockResolvedValue(mockRule),
    deactivate: jest.fn().mockResolvedValue(mockRule),
    deleteById: jest.fn().mockResolvedValue(mockRule),
    findBestMatchingRule: jest.fn().mockResolvedValue(mockRule),
    getProviders: jest.fn().mockResolvedValue(["test-provider"]),
    getRuleListTypes: jest.fn().mockResolvedValue(["test-type"]),
  };

  const mockPaginationService = {
    calculateSkip: jest.fn(),
    normalizePaginationQuery: jest.fn(),
    createPagination: jest.fn(),
    createPaginatedResponse: jest.fn((data, total, query) => {
      const page = query?.page || 1;
      const limit = query?.limit || 10;
      const totalPages = Math.ceil(total / limit);
      
      return {
        items: data,
        pagination: {
          page: page,
          limit: limit,
          total: total,
          totalPages: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      } as PaginatedDataDto<any>;
    }),
    createPaginatedResponseFromQuery: jest.fn((items, query, total) => {
      const page = query?.page || 1;
      const limit = query?.limit || 10;
      const totalPages = Math.ceil(total / limit);
      
      return {
        items: items,
        pagination: {
          page: page,
          limit: limit,
          total: total,
          totalPages: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      } as PaginatedDataDto<any>;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataMapperService,
        {
          provide: DataMappingRepository,
          useValue: mockRepository,
        },
        {
          provide: PaginationService,
          useValue: mockPaginationService,
        },
      ],
    }).compile();

    service = module.get<DataMapperService>(DataMapperService);
    repository = module.get<DataMappingRepository>(DataMappingRepository);
    paginationService = module.get<PaginationService>(PaginationService);

    // 模拟 ObjectUtils 和 StringUtils
    jest
      .spyOn(ObjectUtils, "getValueFromPath")
      .mockImplementation((obj, path) => {
        if (path === "a") return obj.a;
        if (path === "c") return obj.c;
        if (path === "secu_quote[0].s") return "mockValue";
        return undefined;
      });

    jest
      .spyOn(StringUtils, "calculateSimilarity")
      .mockImplementation(() => 0.5);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // 接口实现方法测试
  describe("Interface implementation methods", () => {
    it("mapData should call applyMappingRule", async () => {
      const spy = jest.spyOn(service, "applyMappingRule");
      await service.mapData({ a: 1 }, "rule-id");
      expect(spy).toHaveBeenCalledWith("rule-id", { a: 1 });
    });

    it("saveMappingRule should call create", async () => {
      const spy = jest.spyOn(service, "create");
      const createDto = {
        name: "Test Rule",
        provider: "test-provider",
        transDataRuleListType: "test-type",
        sharedDataFieldMappings: [],
      };
      await service.saveMappingRule(createDto);
      expect(spy).toHaveBeenCalledWith(createDto);
    });

    it("getMappingRule should return rules", async () => {
      const result = await service.getMappingRule(
        "test-provider",
        "test-type",
      );
      expect(repository.findByProviderAndType).toHaveBeenCalledWith(
        "test-provider",
        "test-type",
      );
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Test Rule");
    });
  });

  // 基本方法测试
  describe("Basic repository methods", () => {
    it("findAll should return all active rules", async () => {
      const result = await service.findAll();
      expect(repository.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it("findAllIncludingDeactivated should return all rules", async () => {
      const result = await service.findAllIncludingDeactivated();
      expect(repository.findAllIncludingDeactivated).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it("findByProvider should return provider rules", async () => {
      const result = await service.findByProvider("test-provider");
      expect(repository.findByProvider).toHaveBeenCalledWith("test-provider");
      expect(result).toHaveLength(1);
    });

    it("findPaginated should return paginated results", async () => {
      const query = { page: 1, limit: 10 };
      const result = await service.findPaginated(query);
      expect(repository.findPaginated).toHaveBeenCalledWith(query);
      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });
  });

  describe("Error Handling for repository methods", () => {
    it("findOne should throw NotFoundException if rule not found", async () => {
      jest.spyOn(repository, "findById").mockResolvedValueOnce(null);
      await expect(service.findOne("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("update should throw NotFoundException if rule not found", async () => {
      jest.spyOn(repository, "updateById").mockResolvedValueOnce(null);
      await expect(service.update("non-existent", {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it("activate should throw NotFoundException if rule not found", async () => {
      jest.spyOn(repository, "activate").mockResolvedValueOnce(null);
      await expect(service.activate("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("deactivate should throw NotFoundException if rule not found", async () => {
      jest.spyOn(repository, "deactivate").mockResolvedValueOnce(null);
      await expect(service.deactivate("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("remove should throw NotFoundException if rule not found", async () => {
      jest.spyOn(repository, "deleteById").mockResolvedValueOnce(null);
      await expect(service.remove("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("applyMappingRule should throw NotFoundException if rule not found", async () => {
      jest.spyOn(repository, "findById").mockResolvedValueOnce(null);
      await expect(
        service.applyMappingRule("non-existent", {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("parseJson", () => {
    it("should parse from jsonString", async () => {
      const result = await service.parseJson({ jsonString: '{"a": 1}' });
      expect(result.fields).toContain("a");
    });

    it("should parse from jsonData", async () => {
      const result = await service.parseJson({ jsonData: { a: 1 } });
      expect(result.fields).toContain("a");
    });

    it("should throw BadRequestException if no data provided", async () => {
      await expect(service.parseJson({})).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for invalid JSON string", async () => {
      await expect(
        service.parseJson({ jsonString: "invalid-json" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should extract nested fields", async () => {
      const result = await service.parseJson({ jsonData: { a: { b: 1 } } });
      expect(result.fields).toContain("a");
      expect(result.fields).toContain("a.b");
    });

    it("should extract array fields", async () => {
      const result = await service.parseJson({
        jsonData: { arr: [{ item: 1 }] },
      });
      expect(result.fields).toContain("arr");
      expect(result.fields).toContain("arr[0].item");
    });
  });

  describe("extractFields", () => {
    it("should handle empty array", () => {
      const fields = (service as any).extractFields([]);
      expect(fields).toEqual([]);
    });

    it("should handle non-object", () => {
      const fields = (service as any).extractFields(null);
      expect(fields).toEqual([]);
    });

    it("should extract fields from nested object", () => {
      const fields = (service as any).extractFields({ a: { b: { c: 1 } } });
      expect(fields).toContain("a");
      expect(fields).toContain("a.b");
      expect(fields).toContain("a.b.c");
    });

    it("should extract fields from object with array", () => {
      const fields = (service as any).extractFields({ a: [{ b: 1 }] });
      expect(fields).toContain("a");
      expect(fields).toContain("a[0].b");
    });
  });

  describe("getFieldSuggestions", () => {
    it("should return empty suggestions if no fields provided", async () => {
      const result = await service.getFieldSuggestions({
        sourceFields: [],
        targetFields: [],
      });
      expect(result.suggestions).toEqual([]);
    });

    it("should return suggestions with similarity scores", async () => {
      const sourceFields = ["price"];
      const targetFields = ["cost", "value", "priceValue"];

      const result = await service.getFieldSuggestions({
        sourceFields,
        targetFields,
      });

      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].sourceField).toBe("price");
      expect(result.suggestions[0].suggestions).toHaveLength(3);
      expect(result.suggestions[0].suggestions[0].score).toBe(0.5);
    });

    it("should find best matches for fields", async () => {
      const findBestMatches = (service as any).findBestMatches.bind(service);
      const result = findBestMatches("sourceField", [
        "targetField1",
        "targetField2",
      ]);

      expect(result).toHaveLength(2);
      expect(result[0].field).toBe("targetField1");
      expect(result[0].score).toBe(0.5);
    });
  });

  describe("applyMappingRule", () => {
    it("should handle single object transformation", async () => {
      const singleObjectRule = {
        ...mockRule,
        sharedDataFieldMappings: [{ sourceField: "a", targetField: "b" }],
      };
      jest
        .spyOn(repository, "findById")
        .mockResolvedValueOnce(singleObjectRule as any);
      const result = await service.applyMappingRule("rule-id", { a: 123 });
      expect(result).toEqual([{ b: 123 }]);
    });

    it("should log a warning for slow mappings", async () => {
      const loggerSpy = jest.spyOn((service as any).logger, "warn");
      const originalThreshold = jest.requireActual(
        "../../../../../src/core/data-mapper/constants/data-mapper.constants",
      ).DATA_MAPPER_PERFORMANCE_THRESHOLDS.SLOW_MAPPING_MS;

      // Temporarily set a low threshold to trigger the warning
      jest
        .spyOn(Date, "now")
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(originalThreshold + 1);

      await service.applyMappingRule("rule-id", { secu_quote: [{ a: 1 }] });
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining("数据集较大，可能影响性能"),
      );
    });

    it("should handle secu_quote array data", async () => {
      const arrayRule = { ...mockRule };
      jest
        .spyOn(repository, "findById")
        .mockResolvedValueOnce(arrayRule as any);

      const result = await service.applyMappingRule("rule-id", {
        secu_quote: [{ a: 1 }, { a: 2 }],
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ b: 1 });
      expect(result[1]).toEqual({ b: 2 });
    });

    it("should handle basic_info array data", async () => {
      const arrayRule = { ...mockRule };
      jest
        .spyOn(repository, "findById")
        .mockResolvedValueOnce(arrayRule as any);

      const result = await service.applyMappingRule("rule-id", {
        basic_info: [{ a: 1 }, { a: 2 }],
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ b: 1 });
      expect(result[1]).toEqual({ b: 2 });
    });

    it("should apply transformations during mapping", async () => {
      const ruleWithTransform = {
        ...mockRule,
        sharedDataFieldMappings: [
          {
            sourceField: "a",
            targetField: "b",
            transform: {
              type: TRANSFORMATION_TYPES.MULTIPLY,
              value: 2,
            },
          },
        ],
      };

      jest
        .spyOn(repository, "findById")
        .mockResolvedValueOnce(ruleWithTransform as any);
      const result = await service.applyMappingRule("rule-id", { a: 10 });
      expect(result).toEqual([{ b: 20 }]);
    });

    it("should transform array elements with transformations", async () => {
      const ruleWithTransform = {
        ...mockRule,
        sharedDataFieldMappings: [
          {
            sourceField: "a",
            targetField: "b",
            transform: {
              type: TRANSFORMATION_TYPES.MULTIPLY,
              value: 2,
            },
          },
        ],
      };

      jest
        .spyOn(repository, "findById")
        .mockResolvedValueOnce(ruleWithTransform as any);

      const result = await service.applyMappingRule("rule-id", {
        secu_quote: [{ a: 10 }, { a: 20 }],
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ b: 20 });
      expect(result[1]).toEqual({ b: 40 });
    });

    it("should handle special path patterns", async () => {
      const ruleWithSpecialPath = {
        ...mockRule,
        sharedDataFieldMappings: [
          {
            sourceField: "secu_quote[0].s",
            targetField: "symbol",
          },
        ],
      };

      jest
        .spyOn(repository, "findById")
        .mockResolvedValueOnce(ruleWithSpecialPath as any);

      const result = await service.applyMappingRule("rule-id", {
        secu_quote: [{ s: "AAPL" }],
      });

      expect(result).toEqual([{ symbol: "mockValue" }]);
    });
  });

  // 对变换功能进行间接测试
  describe("Transform functionality", () => {
    // 由于applyTransform是私有方法，我们通过公共方法applyMappingRule来测试
    it("should apply MULTIPLY transformation", async () => {
      const ruleWithMultiply = {
        ...mockRule,
        sharedDataFieldMappings: [
          {
            sourceField: "a",
            targetField: "b",
            transform: {
              type: TRANSFORMATION_TYPES.MULTIPLY,
              value: 3,
            },
          },
        ],
      };

      jest
        .spyOn(repository, "findById")
        .mockResolvedValueOnce(ruleWithMultiply as any);
      const result = await service.applyMappingRule("rule-id", { a: 10 });
      expect(result).toEqual([{ b: 30 }]);
    });

    it("should apply DIVIDE transformation", async () => {
      const ruleWithDivide = {
        ...mockRule,
        sharedDataFieldMappings: [
          {
            sourceField: "a",
            targetField: "b",
            transform: {
              type: TRANSFORMATION_TYPES.DIVIDE,
              value: 2,
            },
          },
        ],
      };

      jest
        .spyOn(repository, "findById")
        .mockResolvedValueOnce(ruleWithDivide as any);
      const result = await service.applyMappingRule("rule-id", { a: 10 });
      expect(result).toEqual([{ b: 5 }]);
    });

    it("should apply ADD transformation", async () => {
      const ruleWithAdd = {
        ...mockRule,
        sharedDataFieldMappings: [
          {
            sourceField: "a",
            targetField: "b",
            transform: {
              type: TRANSFORMATION_TYPES.ADD,
              value: 5,
            },
          },
        ],
      };

      jest
        .spyOn(repository, "findById")
        .mockResolvedValueOnce(ruleWithAdd as any);
      const result = await service.applyMappingRule("rule-id", { a: 10 });
      expect(result).toEqual([{ b: 15 }]);
    });

    it("should apply SUBTRACT transformation", async () => {
      const ruleWithSubtract = {
        ...mockRule,
        sharedDataFieldMappings: [
          {
            sourceField: "a",
            targetField: "b",
            transform: {
              type: TRANSFORMATION_TYPES.SUBTRACT,
              value: 3,
            },
          },
        ],
      };

      jest
        .spyOn(repository, "findById")
        .mockResolvedValueOnce(ruleWithSubtract as any);
      const result = await service.applyMappingRule("rule-id", { a: 10 });
      expect(result).toEqual([{ b: 7 }]);
    });

    it("should apply FORMAT transformation", async () => {
      const ruleWithFormat = {
        ...mockRule,
        sharedDataFieldMappings: [
          {
            sourceField: "a",
            targetField: "b",
            transform: {
              type: TRANSFORMATION_TYPES.FORMAT,
              value: "Hello, %v!",
            },
          },
        ],
      };

      jest
        .spyOn(repository, "findById")
        .mockResolvedValueOnce(ruleWithFormat as any);
      const result = await service.applyMappingRule("rule-id", { a: "world" });
      expect(result).toEqual([{ b: "Hello, world!" }]);
    });

    it("should handle CUSTOM transformation and log warning", async () => {
      const ruleWithCustom = {
        ...mockRule,
        sharedDataFieldMappings: [
          {
            sourceField: "a",
            targetField: "b",
            transform: {
              type: TRANSFORMATION_TYPES.CUSTOM,
              customFunction: "x => x * 2",
            },
          },
        ],
      };

      const loggerSpy = jest.spyOn((service as any).logger, "warn");
      jest
        .spyOn(repository, "findById")
        .mockResolvedValueOnce(ruleWithCustom as any);

      const result = await service.applyMappingRule("rule-id", { a: "test" });
      expect(loggerSpy).toHaveBeenCalled();
      expect(result).toEqual([{ b: "test" }]);
    });

    it("should handle unknown transformation type", async () => {
      const ruleWithUnknown = {
        ...mockRule,
        sharedDataFieldMappings: [
          {
            sourceField: "a",
            targetField: "b",
            transform: {
              type: "UNKNOWN_TYPE" as any,
            },
          },
        ],
      };

      jest
        .spyOn(repository, "findById")
        .mockResolvedValueOnce(ruleWithUnknown as any);
      const result = await service.applyMappingRule("rule-id", { a: 123 });
      expect(result).toEqual([{ b: 123 }]);
    });

    it("should throw BadRequestException on transformation failure", async () => {
      const ruleWithMultiply = {
        ...mockRule,
        sharedDataFieldMappings: [
          {
            sourceField: "a",
            targetField: "b",
            transform: {
              type: TRANSFORMATION_TYPES.MULTIPLY,
              value: 2,
            },
          },
        ],
      };

      jest
        .spyOn(repository, "findById")
        .mockResolvedValueOnce(ruleWithMultiply as any);
      await expect(
        service.applyMappingRule("rule-id", { a: "not-a-number" }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("testMappingRule", () => {
    it("should return success result for a valid test", async () => {
      const result = await service.testMappingRule({
        ruleId: "rule-id",
        testData: { a: 1 },
      });
      expect(result.success).toBe(true);
      expect(result.transformedData).toEqual([{ b: 1 }]);
    });

    it("should throw BadRequestException if mapping test fails", async () => {
      jest
        .spyOn(service, "applyMappingRule")
        .mockRejectedValueOnce(new Error("Test Fail"));
      await expect(
        service.testMappingRule({ ruleId: "rule-id", testData: {} }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should include rule details in the response", async () => {
      const result = await service.testMappingRule({
        ruleId: "rule-id",
        testData: { a: 1 },
      });
      expect(result).toMatchObject({
        ruleId: "rule-id",
        ruleName: "Test Rule",
        provider: "test-provider",
        transDataRuleListType: "test-type",
      });
    });

    it("should include original data in the response", async () => {
      const testData = { a: 123, extraField: "value" };
      const result = await service.testMappingRule({
        ruleId: "rule-id",
        testData,
      });
      expect(result.originalData).toEqual(testData);
    });

    it("should include success message in the response", async () => {
      const result = await service.testMappingRule({
        ruleId: "rule-id",
        testData: { a: 1 },
      });
      expect(result.message).toBeTruthy();
    });
  });

  describe("findBestMatchingRule", () => {
    it("should return null if no matching rule found", async () => {
      jest
        .spyOn(repository, "findBestMatchingRule")
        .mockResolvedValueOnce(null);
      const result = await service.findBestMatchingRule("provider", "type");
      expect(result).toBeNull();
    });

    it("should return matching rule if found", async () => {
      const result = await service.findBestMatchingRule(
        "test-provider",
        "test-type",
      );
      expect(result).toBeDefined();
      expect(result.name).toBe("Test Rule");
    });
  });

  describe("getStatistics", () => {
    it("should collect statistics from repository", async () => {
      const result = await service.getStatistics();

      expect(result.totalRules).toBe(2);
      expect(result.activeRules).toBe(1);
      expect(result.inactiveRules).toBe(1);
      expect(result.providers).toBe(1);
      expect(result.transDataRuleListTypesNum).toBe(1);
      expect(result.providerList).toContain("test-provider");
      expect(result.transDataRuleListTypeList).toContain("test-type");
    });

    it("should calculate inactive rules correctly", async () => {
      jest
        .spyOn(repository, "findAllIncludingDeactivated")
        .mockResolvedValueOnce([
          mockRule,
          { ...mockRule, isActive: false },
          { ...mockRule, isActive: false },
        ]);

      const result = await service.getStatistics();
      expect(result.totalRules).toBe(3);
      expect(result.activeRules).toBe(1);
      expect(result.inactiveRules).toBe(2);
    });
  });

  describe("Array and object transformations", () => {
    // 通过applyMappingRule间接测试私有方法的功能
    it("should transform each item in array", async () => {
      const rule = {
        ...mockRule,
        sharedDataFieldMappings: [{ sourceField: "a", targetField: "b" }],
      };

      jest.spyOn(repository, "findById").mockResolvedValueOnce(rule as any);

      const result = await service.applyMappingRule("rule-id", {
        secu_quote: [{ a: 1 }, { a: 2 }, { a: 3 }],
      });

      expect(result).toHaveLength(3);
      expect(result).toEqual([{ b: 1 }, { b: 2 }, { b: 3 }]);
    });

    it("should transform multiple fields according to mappings", async () => {
      const multiFieldRule = {
        ...mockRule,
        sharedDataFieldMappings: [
          { sourceField: "a", targetField: "b" },
          { sourceField: "c", targetField: "d" },
        ],
      };

      jest
        .spyOn(repository, "findById")
        .mockResolvedValueOnce(multiFieldRule as any);

      const result = await service.applyMappingRule("rule-id", {
        a: 1,
        c: 2,
        e: 3,
      });
      expect(result[0]).toEqual({ b: 1, d: 2 });
      expect(result[0].e).toBeUndefined();
    });

    it("should ignore undefined source values", async () => {
      const nonexistentRule = {
        ...mockRule,
        sharedDataFieldMappings: [{ sourceField: "nonexistent", targetField: "target" }],
      };

      jest
        .spyOn(repository, "findById")
        .mockResolvedValueOnce(nonexistentRule as any);

      const result = await service.applyMappingRule("rule-id", { a: 1 });
      expect(result).toEqual([{}]);
    });
  });
});
