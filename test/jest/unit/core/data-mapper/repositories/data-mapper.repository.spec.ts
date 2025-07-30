import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { DataMappingRepository } from "../../../../../../src/core/data-mapper/repositories/data-mapper.repository";
import { DataMappingRule } from "../../../../../../src/core/data-mapper/schemas/data-mapper.schema";
import { CreateDataMappingDto } from "../../../../../../src/core/data-mapper/dto/create-data-mapping.dto";
import { UpdateDataMappingDto } from "../../../../../../src/core/data-mapper/dto/update-data-mapping.dto";
import { DataMappingQueryDto } from "../../../../../../src/core/data-mapper/dto/data-mapping-query.dto";
import { PaginationService } from "../../../../../../src/common/modules/pagination/services/pagination.service";

describe("DataMappingRepository", () => {
  let repository: DataMappingRepository;
  let model: Model<DataMappingRule>;
  let paginationService: PaginationService;
  let mockQuery;

  const mockDataMappingDocument = {
    _id: "507f1f77bcf86cd799439011",
    name: "LongPort Stock Quote Mapping",
    provider: "longport",
    transDataRuleListType: "quote_fields",
    description: "Maps LongPort stock quote data to standard format",
    sharedDataFieldMappings: [
      {
        sourceField: "last_done",
        targetField: "lastPrice",
      },
    ],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    mockQuery = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    // 创建一个可以作为构造函数的 mock 函数
    const mockModel = jest.fn().mockImplementation((data) => {
      const doc = { ...mockDataMappingDocument, ...data };
      doc.save = jest.fn().mockResolvedValue(doc);
      return doc;
    });

    // 添加静态方法到构造函数
    Object.assign(mockModel, {
      find: jest.fn().mockReturnValue(mockQuery),
      findOne: jest.fn().mockReturnValue(mockQuery),
      findById: jest.fn().mockReturnValue(mockQuery),
      findByIdAndUpdate: jest.fn().mockReturnValue(mockQuery),
      findByIdAndDelete: jest.fn().mockReturnValue(mockQuery),
      create: jest.fn(),
      countDocuments: jest.fn().mockReturnValue({ exec: mockQuery.exec }),
      distinct: jest.fn().mockReturnValue(mockQuery),
    });

    // 创建 PaginationService 的模拟实现
    const mockPaginationService = {
      calculateSkip: jest.fn((page, limit) => (page - 1) * limit),
      normalizePaginationQuery: jest.fn((query) => ({
        page: query.page || 1,
        limit: query.limit || 10,
      })),
      createPagination: jest.fn(),
      createPaginatedResponse: jest.fn(),
      createPaginatedResponseFromQuery: jest.fn(),
      validatePaginationParams: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataMappingRepository,
        {
          provide: getModelToken(DataMappingRule.name),
          useValue: mockModel,
        },
        {
          provide: PaginationService,
          useValue: mockPaginationService,
        },
      ],
    }).compile();

    repository = module.get<DataMappingRepository>(DataMappingRepository);
    model = module.get(getModelToken(DataMappingRule.name));
    paginationService = module.get<PaginationService>(PaginationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a new data mapping rule", async () => {
      const createDto: CreateDataMappingDto = {
        name: "Test Mapping",
        provider: "test-provider",
        transDataRuleListType: "quote_fields",
        description: "Test mapping rule",
        sharedDataFieldMappings: [
          {
            sourceField: "price",
            targetField: "lastPrice",
          },
        ],
      };

      const result = await repository.create(createDto);

      // 验证构造函数是否被正确调用
      expect(model).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createDto,
          isActive: true, // default value
          version: "1.0.0", // default value
        }),
      );

      // 验证返回的结果包含正确的数据
      expect(result).toEqual(
        expect.objectContaining({
          ...createDto,
          isActive: true,
          version: "1.0.0",
        }),
      );
    });

    it("should set isActive to true by default", async () => {
      const createDto: CreateDataMappingDto = {
        name: "Test Mapping",
        provider: "test-provider",
        transDataRuleListType: "quote_fields",
        sharedDataFieldMappings: [],
      };

      await repository.create(createDto);

      expect(model).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
        }),
      );
    });
  });

  describe("findAll", () => {
    it("should find all active data mapping rules", async () => {
      mockQuery.exec.mockResolvedValue([mockDataMappingDocument]);

      const result = await repository.findAll();

      expect(model.find).toHaveBeenCalledWith({ isActive: true });
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual([mockDataMappingDocument]);
    });
  });

  describe("findAllIncludingDeactivated", () => {
    it("should find all data mapping rules including deactivated ones", async () => {
      const deactivatedRule = { ...mockDataMappingDocument, isActive: false };
      mockQuery.exec.mockResolvedValue([
        mockDataMappingDocument,
        deactivatedRule,
      ]);

      const result = await repository.findAllIncludingDeactivated();

      expect(model.find).toHaveBeenCalledWith();
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual([mockDataMappingDocument, deactivatedRule]);
    });
  });

  describe("findByProvider", () => {
    it("should find mapping rules by provider", async () => {
      mockQuery.exec.mockResolvedValue([mockDataMappingDocument]);

      const result = await repository.findByProvider("longport");

      expect(model.find).toHaveBeenCalledWith({
        provider: "longport",
        isActive: true,
      });
      expect(result).toEqual([mockDataMappingDocument]);
    });
  });

  describe("findById", () => {
    it("should find mapping rule by ID", async () => {
      mockQuery.exec.mockResolvedValue(mockDataMappingDocument);

      const result = await repository.findById("507f1f77bcf86cd799439011");

      expect(model.findById).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
      expect(result).toEqual(mockDataMappingDocument);
    });

    it("should return null for non-existent ID", async () => {
      mockQuery.exec.mockResolvedValue(null);

      const result = await repository.findById("nonexistent-id");

      expect(result).toBeNull();
    });
  });

  describe("findPaginated", () => {
    it("should return paginated results with basic query", async () => {
      const query: DataMappingQueryDto = {
        page: 1,
        limit: 10,
      };

      mockQuery.exec
        .mockResolvedValueOnce([mockDataMappingDocument]) // for find
        .mockResolvedValueOnce(1); // for countDocuments

      const result = await repository.findPaginated(query);

      expect(result.items).toEqual([mockDataMappingDocument]);
      expect(result.total).toBe(1);
      expect(model.find).toHaveBeenCalledWith({});
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    it("should apply filters correctly", async () => {
      const query: DataMappingQueryDto = {
        provider: "longport",
        transDataRuleListType: "quote_fields",
        search: "price",
        isActive: true,
      };

      mockQuery.exec.mockResolvedValueOnce([]).mockResolvedValueOnce(0);

      await repository.findPaginated(query);

      expect(model.find).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: { $regex: "longport", $options: "i" },
          transDataRuleListType: "quote_fields",
          isActive: true,
          $or: [
            { name: { $regex: "price", $options: "i" } },
            { description: { $regex: "price", $options: "i" } },
            { provider: { $regex: "price", $options: "i" } },
          ],
        }),
      );
    });

    it("should query inactive rules when specified", async () => {
      const query: DataMappingQueryDto = {
        isActive: false,
      };

      mockQuery.exec.mockResolvedValueOnce([]).mockResolvedValueOnce(0);

      await repository.findPaginated(query);

      expect(model.find).toHaveBeenCalledWith({ isActive: false });
    });
  });

  describe("updateById", () => {
    it("should update mapping rule by ID", async () => {
      const updateDto: UpdateDataMappingDto = {
        description: "Updated description",
      };

      mockQuery.exec.mockResolvedValue(mockDataMappingDocument);

      const result = await repository.updateById(
        "507f1f77bcf86cd799439011",
        updateDto,
      );

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
        updateDto,
        { new: true },
      );
      expect(result).toEqual(mockDataMappingDocument);
    });

    it("should return null for non-existent ID", async () => {
      mockQuery.exec.mockResolvedValue(null);

      const result = await repository.updateById("nonexistent-id", {});

      expect(result).toBeNull();
    });
  });

  describe("activate", () => {
    it("should activate mapping rule", async () => {
      mockQuery.exec.mockResolvedValue(mockDataMappingDocument);

      const result = await repository.activate("507f1f77bcf86cd799439011");

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
        { isActive: true },
        { new: true },
      );
      expect(result).toEqual(mockDataMappingDocument);
    });
  });

  describe("deactivate", () => {
    it("should deactivate mapping rule", async () => {
      mockQuery.exec.mockResolvedValue(mockDataMappingDocument);

      const result = await repository.deactivate("507f1f77bcf86cd799439011");

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
        { isActive: false },
        { new: true },
      );
      expect(result).toEqual(mockDataMappingDocument);
    });
  });

  describe("deleteById", () => {
    it("should delete mapping rule by ID", async () => {
      mockQuery.exec.mockResolvedValue(mockDataMappingDocument);

      const result = await repository.deleteById("507f1f77bcf86cd799439011");

      expect(model.findByIdAndDelete).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
      );
      expect(result).toEqual(mockDataMappingDocument);
    });

    it("should return null for non-existent ID", async () => {
      mockQuery.exec.mockResolvedValue(null);

      const result = await repository.deleteById("nonexistent-id");

      expect(result).toBeNull();
    });
  });

  describe("getProviders", () => {
    it("should return unique providers", async () => {
      mockQuery.exec.mockResolvedValue(["longport", "futu", "itick"]);

      const result = await repository.getProviders();

      expect(model.distinct).toHaveBeenCalledWith("provider");
      expect(result).toEqual(["longport", "futu", "itick"]);
    });
  });

  describe("getRuleListTypes", () => {
    it("should return unique rule types", async () => {
      mockQuery.exec.mockResolvedValue([
        "quote_fields",
        "basic_info_fields",
        "index_fields",
      ]);

      const result = await repository.getRuleListTypes();

      expect(model.distinct).toHaveBeenCalledWith("transDataRuleListType");
      expect(result).toEqual([
        "quote_fields",
        "basic_info_fields",
        "index_fields",
      ]);
    });
  });
});
