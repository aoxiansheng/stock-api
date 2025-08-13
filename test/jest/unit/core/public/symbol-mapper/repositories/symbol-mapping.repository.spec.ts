/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { SymbolMappingRepository } from "../../../../../../../src/core/public/symbol-mapper/repositories/symbol-mapping.repository";
import { CreateSymbolMappingDto } from "../../../../../../../src/core/public/symbol-mapper/dto/create-symbol-mapping.dto";
import { UpdateSymbolMappingDto } from "../../../../../../../src/core/public/symbol-mapper/dto/update-symbol-mapping.dto";
import { SymbolMappingQueryDto } from "../../../../../../../src/core/public/symbol-mapper/dto/symbol-mapping-query.dto";
import {
  SymbolMappingRule,
  SymbolMappingRuleDocument,
} from "../../../../../../../src/core/public/symbol-mapper/schemas/symbol-mapping-rule.schema";
import { PaginationService } from "../../../../../../../src/common/modules/pagination/services/pagination.service";

type MockModel<T = any> = Model<T> & {
  [key: string]: jest.Mock;
};

describe("SymbolMappingRepository", () => {
  let repository: SymbolMappingRepository;
  let model: MockModel<SymbolMappingRule>;
  let paginationService: PaginationService;

  const mockSymbolMappingDocument = {
    id: "507f1f77bcf86cd799439011",
    dataSourceName: "longport",
    description: "LongPort symbol mappings",
    SymbolMappingRule: [
      {
        standardSymbol: "AAPL",
        sdkSymbol: "AAPL.US",
        market: "US",
        symbolType: "stock",
        isActive: true,
      },
    ],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const mockQuery = {
      exec: jest.fn(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
    };

    // Create a mock that can be used both as constructor and has static methods
    const mockModel = Object.assign(
      jest.fn().mockImplementation((dto) => {
        return {
          ...dto,
          save: jest.fn().mockResolvedValue({ ...dto, id: "new-id" }),
        };
      }),
      {
        find: jest.fn().mockReturnValue(mockQuery),
        findOne: jest.fn().mockReturnValue(mockQuery),
        findById: jest.fn().mockReturnValue(mockQuery),
        findByIdAndUpdate: jest.fn().mockReturnValue(mockQuery),
        findByIdAndDelete: jest.fn().mockReturnValue(mockQuery),
        findOneAndUpdate: jest.fn().mockReturnValue(mockQuery),
        create: jest
          .fn()
          .mockImplementation((dto) =>
            Promise.resolve({ ...dto, id: "new-id" }),
          ),
        countDocuments: jest.fn().mockReturnValue({ exec: jest.fn() }),
        updateOne: jest.fn().mockReturnValue(mockQuery),
        delet_eOne: jest.fn().mockResolvedValue({ delet_edCount: 1 }),
        delet_eMany: jest.fn().mockReturnValue({ exec: jest.fn() }),
        _aggregate: jest.fn().mockReturnValue({ exec: jest.fn() }),
        distinct: jest.fn().mockReturnValue(mockQuery),
      },
    );

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
        SymbolMappingRepository,
        {
          provide: getModelToken(SymbolMappingRuleDocument.name),
          useValue: mockModel,
        },
        {
          provide: PaginationService,
          useValue: mockPaginationService,
        },
      ],
    }).compile();

    repository = module.get<SymbolMappingRepository>(SymbolMappingRepository);
    model = module.get(getModelToken(SymbolMappingRuleDocument.name));
    paginationService = module.get<PaginationService>(PaginationService);
  });

  describe("create", () => {
    beforeEach(() => {
      // Clear all mock calls before each test
      jest.clearAllMocks();
    });

    it("should create a new symbol mapping rule", async () => {
      const createDto: CreateSymbolMappingDto = {
        dataSourceName: "test-provider",
        description: "Test mappings",
        SymbolMappingRule: [
          {
            standardSymbol: "GOOGL",
            sdkSymbol: "GOOGL.US",
            market: "US",
            symbolType: "stock",
            isActive: true,
          },
        ],
      };

      const result = await repository.create(createDto);

      // Verify constructor was called with correct data
      expect(model).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createDto,
          isActive: true,
        }),
      );
      expect(result.dataSourceName).toBe(createDto.dataSourceName);
    });

    it("should set isActive to true by default", async () => {
      const createDto: CreateSymbolMappingDto = {
        dataSourceName: "test-provider",
        SymbolMappingRule: [],
      };

      await repository.create(createDto);

      // Verify constructor was called with isActive defaulted to true
      expect(model).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createDto,
          isActive: true,
        }),
      );
    });

    it("should preserve explicit isActive value", async () => {
      const createDto: CreateSymbolMappingDto = {
        dataSourceName: "test-provider",
        SymbolMappingRule: [],
        isActive: false,
      };

      await repository.create(createDto);

      // Verify constructor was called with explicit isActive value
      expect(model).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createDto,
          isActive: false,
        }),
      );
    });
  });

  describe("findById", () => {
    it("should find symbol mapping by ID", async () => {
      (model.findById as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSymbolMappingDocument),
      });

      const result = await repository.findById("507f1f77bcf86cd799439011");

      expect(model.findById).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
      expect(result).toEqual(mockSymbolMappingDocument);
    });

    it("should return null for non-existent ID", async () => {
      (model.findById as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      const result = await repository.findById("nonexistent-id");

      expect(result).toBeNull();
    });
  });

  describe("findByDataSource", () => {
    it("should find symbol mapping by data source name", async () => {
      (model.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSymbolMappingDocument),
      });
      const result = await repository.findByDataSource("longport");

      expect(model.findOne).toHaveBeenCalledWith({
        dataSourceName: "longport",
        isActive: true,
      });
      expect(result).toEqual(mockSymbolMappingDocument);
    });

    it("should return null for non-existent data source", async () => {
      (model.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      const result = await repository.findByDataSource("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("findPaginated", () => {
    it("should return paginated results with basic query", async () => {
      const query: SymbolMappingQueryDto = {
        page: 1,
        limit: 10,
      };

      const findQueryMock = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockSymbolMappingDocument]),
      };
      (model.find as jest.Mock).mockReturnValue(findQueryMock);
      (model.countDocuments as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const result = await repository.findPaginated(query);

      expect(result.items).toEqual([mockSymbolMappingDocument]);
      expect(result.total).toBe(1);
      expect(model.find).toHaveBeenCalledWith({});
      expect(findQueryMock.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(findQueryMock.skip).toHaveBeenCalledWith(0);
      expect(findQueryMock.limit).toHaveBeenCalledWith(10);
    });

    it("should apply filters correctly", async () => {
      const query: SymbolMappingQueryDto = {
        dataSourceName: "longport",
        isActive: true,
        market: "US",
        symbolType: "stock",
        search: "AAPL",
      };

      const findQueryMock = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      (model.find as jest.Mock).mockReturnValue(findQueryMock);
      (model.countDocuments as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await repository.findPaginated(query);

      const expectedFilter = {
        dataSourceName: { $regex: "longport", $options: "i" },
        isActive: true,
        "SymbolMappingRule.market": "US",
        "SymbolMappingRule.symbolType": "stock",
        $or: [
          { dataSourceName: { $regex: "AAPL", $options: "i" } },
          { description: { $regex: "AAPL", $options: "i" } },
          { "SymbolMappingRule.standardSymbol": { $regex: "AAPL", $options: "i" } },
          { "SymbolMappingRule.sdkSymbol": { $regex: "AAPL", $options: "i" } },
        ],
      };
      expect(model.find).toHaveBeenCalledWith(expectedFilter);
      expect(model.countDocuments).toHaveBeenCalledWith(expectedFilter);
    });

    it("should handle pagination correctly", async () => {
      const query: SymbolMappingQueryDto = {
        page: 3,
        limit: 5,
      };

      const findQueryMock = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      (model.find as jest.Mock).mockReturnValue(findQueryMock);
      (model.countDocuments as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(15),
      });

      const result = await repository.findPaginated(query);

      expect(findQueryMock.skip).toHaveBeenCalledWith(10); // (3-1) * 5
      expect(findQueryMock.limit).toHaveBeenCalledWith(5);
      expect(result.total).toBe(15);
    });

    it("should use default pagination values", async () => {
      const query: SymbolMappingQueryDto = {};

      const findQueryMock = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      (model.find as jest.Mock).mockReturnValue(findQueryMock);
      (model.countDocuments as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await repository.findPaginated(query);

      expect(findQueryMock.skip).toHaveBeenCalledWith(0); // (1-1) * 10
      expect(findQueryMock.limit).toHaveBeenCalledWith(10);
    });
  });

  describe("updateById", () => {
    it("should update symbol mapping by ID", async () => {
      const updateDto: UpdateSymbolMappingDto = {
        description: "Updated description",
      };

      (model.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSymbolMappingDocument),
      });
      const result = await repository.updateById(
        "507f1f77bcf86cd799439011",
        updateDto,
      );

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
        updateDto,
        { new: true },
      );
      expect(result).toEqual(mockSymbolMappingDocument);
    });

    it("should return null for non-existent ID", async () => {
      (model.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      const result = await repository.updateById("nonexistent-id", {});

      expect(result).toBeNull();
    });
  });

  describe("deleteById", () => {
    it("should delete symbol mapping by ID", async () => {
      (model.findByIdAndDelete as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSymbolMappingDocument),
      });
      const result = await repository.deleteById("507f1f77bcf86cd799439011");

      expect(model.findByIdAndDelete).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
      );
      expect(result).toEqual(mockSymbolMappingDocument);
    });

    it("should return null for non-existent ID", async () => {
      (model.findByIdAndDelete as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      const result = await repository.deleteById("nonexistent-id");

      expect(result).toBeNull();
    });
  });

  describe("exists", () => {
    it("should return true if mapping exists", async () => {
      (model.countDocuments as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });
      const result = await repository.exists("longport");

      expect(model.countDocuments).toHaveBeenCalledWith({
        dataSourceName: "longport",
      });
      expect(result).toBe(true);
    });

    it("should return false if mapping does not exist", async () => {
      (model.countDocuments as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });
      const result = await repository.exists("nonexistent");

      expect(model.countDocuments).toHaveBeenCalledWith({
        dataSourceName: "nonexistent",
      });
      expect(result).toBe(false);
    });
  });

  describe("findAllMappingsForSymbols", () => {
    it("should find all mappings for given symbols", async () => {
      const symbols = ["AAPL", "GOOGL"];
      const SymbolMappingRule = [
        {
          standardSymbol: "AAPL",
          sdkSymbol: "AAPL.US",
          market: "US",
          symbolType: "stock",
          isActive: true,
        },
      ];

      const expectedPipeline = [
        {
          $match: {
            dataSourceName: "longport",
            isActive: true,
          },
        },
        {
          $unwind: "$SymbolMappingRule",
        },
        {
          $match: {
            "SymbolMappingRule.standardSymbol": { $in: symbols },
            "SymbolMappingRule.isActive": { $ne: false },
          },
        },
        {
          $replaceRoot: { newRoot: "$SymbolMappingRule" },
        },
      ];

      (model.aggregate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(SymbolMappingRule),
      });

      const result = await repository.findAllMappingsForSymbols(
        "longport",
        symbols,
      );

      expect(model.aggregate).toHaveBeenCalledWith(expectedPipeline);
      expect(result).toEqual(SymbolMappingRule);
    });

    it("should return empty array if no mappings found", async () => {
      const symbols = ["AAPL"];
      const expectedPipeline = [
        {
          $match: {
            dataSourceName: "nonexistent",
            isActive: true,
          },
        },
        {
          $unwind: "$SymbolMappingRule",
        },
        {
          $match: {
            "SymbolMappingRule.standardSymbol": { $in: symbols },
            "SymbolMappingRule.isActive": { $ne: false },
          },
        },
        {
          $replaceRoot: { newRoot: "$SymbolMappingRule" },
        },
      ];

      (model.aggregate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await repository.findAllMappingsForSymbols(
        "nonexistent",
        symbols,
      );

      expect(model.aggregate).toHaveBeenCalledWith(expectedPipeline);
      expect(result).toEqual([]);
    });
  });

  describe("getDataSources", () => {
    it("should return unique data source names", async () => {
      (model.distinct as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(["longport", "futu", "itick"]),
      });
      const result = await repository.getDataSources();

      expect(model.distinct).toHaveBeenCalledWith("dataSourceName");
      expect(result).toEqual(["longport", "futu", "itick"]);
    });
  });

  describe("getMarkets", () => {
    it("should return unique markets", async () => {
      (model.distinct as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(["US", "HK", "SZ", "SH"]),
      });
      const result = await repository.getMarkets();

      expect(model.distinct).toHaveBeenCalledWith("SymbolMappingRule.market");
      expect(result).toEqual(["US", "HK", "SZ", "SH"]);
    });
  });

  describe("getSymbolTypes", () => {
    it("should return unique symbol types", async () => {
      (model.distinct as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(["stock", "etf", "index"]),
      });
      const result = await repository.getSymbolTypes();

      expect(model.distinct).toHaveBeenCalledWith("SymbolMappingRule.symbolType");
      expect(result).toEqual(["stock", "etf", "index"]);
    });
  });

  describe("deleteByDataSource", () => {
    it("should delete all mappings for a data source", async () => {
      (model._deleteMany as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue({ delet_edCount: 3 }),
      });

      const result = await repository.deleteByDataSource("longport");

      expect(model.delet_eMany).toHaveBeenCalledWith({
        dataSourceName: "longport",
      });
      expect(result).toEqual({ delet_edCount: 3 });
    });
  });

  describe("addSymbolMappingRule", () => {
    it("should add a mapping rule to existing data source", async () => {
      const newRule = {
        standardSymbol: "TSLA",
        sdkSymbol: "TSLA.US",
        market: "US",
        symbolType: "stock",
        isActive: true,
      };

      (model.findOneAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSymbolMappingDocument),
      });

      const result = await repository.addSymbolMappingRule("longport", newRule);

      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { dataSourceName: "longport" },
        { $_push: { SymbolMappingRule: newRule } },
        { new: true },
      );
      expect(result).toEqual(mockSymbolMappingDocument);
    });
  });

  describe("updateSymbolMappingRule", () => {
    it("should update a specific mapping rule", async () => {
      const updatedRule = {
        sdkSymbol: "AAPL.NASDAQ",
        market: "US",
        symbolType: "stock",
        isActive: true,
      };

      (model.findOneAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSymbolMappingDocument),
      });

      const result = await repository.updateSymbolMappingRule(
        "longport",
        "AAPL",
        updatedRule,
      );

      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        {
          dataSourceName: "longport",
          "SymbolMappingRule.standardSymbol": "AAPL",
        },
        {
          $set: {
            "SymbolMappingRule.$.sdkSymbol": updatedRule.sdkSymbol,
            "SymbolMappingRule.$.market": updatedRule.market,
            "SymbolMappingRule.$.symbolType": updatedRule.symbolType,
            "SymbolMappingRule.$.isActive": updatedRule.isActive,
          },
        },
        { new: true },
      );
      expect(result).toEqual(mockSymbolMappingDocument);
    });
  });

  describe("removeSymbolMappingRule", () => {
    it("should remove a specific mapping rule", async () => {
      (model.findOneAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSymbolMappingDocument),
      });

      const result = await repository.removeSymbolMappingRule("longport", "AAPL");

      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { dataSourceName: "longport" },
        { $_pull: { SymbolMappingRule: { standardSymbol: "AAPL" } } },
        { new: true },
      );
      expect(result).toEqual(mockSymbolMappingDocument);
    });
  });

  describe("replaceSymbolMappingRule", () => {
    it("should replace all mapping rules for a data source", async () => {
      const newRules = [
        {
          standardSymbol: "NVDA",
          sdkSymbol: "NVDA.US",
          market: "US",
          symbolType: "stock",
          isActive: true,
        },
      ];

      (model.findOneAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSymbolMappingDocument),
      });

      const result = await repository.replaceSymbolMappingRule("longport", newRules);

      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { dataSourceName: "longport" },
        { $set: { SymbolMappingRule: newRules } },
        { new: true },
      );
      expect(result).toEqual(mockSymbolMappingDocument);
    });
  });
});
