import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { DataMappingRepository } from "../../../../../src/core/data-mapper/repositories/data-mapper.repository";
import { DataMappingRule } from "../../../../../src/core/data-mapper/schemas/data-mapper.schema";
import { CreateDataMappingDto } from "../../../../../src/core/data-mapper/dto/create-data-mapping.dto";

describe("DataMappingRepository", () => {
  let repository: DataMappingRepository;
  let model: Model<DataMappingRule>;
  let mockQuery;

  const mockDataMappingDocument = {
    _id: "507f1f77bcf86cd799439011",
    name: "Test Mapping Rule",
    provider: "test-provider",
    ruleListType: "test-type",
    fieldMappings: [{ sourceField: "source", targetField: "target" }],
    isActive: true,
    version: "1.0.0",
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
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn() }),
      distinct: jest.fn().mockReturnValue(mockQuery),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataMappingRepository,
        {
          provide: getModelToken(DataMappingRule.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    repository = module.get<DataMappingRepository>(DataMappingRepository);
    model = module.get(getModelToken(DataMappingRule.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a new data mapping rule", async () => {
      const createDto: CreateDataMappingDto = {
        name: "Test Mapping",
        provider: "test-provider",
        ruleListType: "quote_fields",
        description: "Test mapping rule",
        fieldMappings: [
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

    it("should use provided isActive and version values", async () => {
      const createDto: CreateDataMappingDto = {
        name: "Test Mapping",
        provider: "test-provider",
        ruleListType: "quote_fields",
        description: "Test mapping rule",
        fieldMappings: [{ sourceField: "price", targetField: "lastPrice" }],
        isActive: false,
        version: "2.0.0",
      };

      const result = await repository.create(createDto);

      expect(model).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
          version: "2.0.0",
        }),
      );
      expect(result.isActive).toBe(false);
      expect(result.version).toBe("2.0.0");
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

  describe("findByProvider", () => {
    it("should find mapping rules by provider", async () => {
      mockQuery.exec.mockResolvedValue([mockDataMappingDocument]);

      const result = await repository.findByProvider("test-provider");

      expect(model.find).toHaveBeenCalledWith({
        provider: "test-provider",
        isActive: true,
      });
      expect(result).toEqual([mockDataMappingDocument]);
    });
  });

  describe("findByProviderAndType", () => {
    it("should find rules by provider and type", async () => {
      mockQuery.exec.mockResolvedValue([mockDataMappingDocument]);

      const result = await repository.findByProviderAndType(
        "test-provider",
        "test-type",
      );

      expect(model.find).toHaveBeenCalledWith({
        provider: "test-provider",
        ruleListType: "test-type",
        isActive: true,
      });
      expect(result).toEqual([mockDataMappingDocument]);
    });
  });

  describe("findBestMatchingRule", () => {
    it("should find the best matching rule", async () => {
      mockQuery.exec.mockResolvedValue(mockDataMappingDocument);

      const result = await repository.findBestMatchingRule(
        "test-provider",
        "test-type",
      );

      expect(model.findOne).toHaveBeenCalledWith({
        provider: "test-provider",
        ruleListType: "test-type",
        isActive: true,
      });
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockDataMappingDocument);
    });

    it("should return null if no matching rule found", async () => {
      mockQuery.exec.mockResolvedValue(null);

      const result = await repository.findBestMatchingRule(
        "nonexistent",
        "nonexistent",
      );

      expect(result).toBeNull();
    });
  });
});
