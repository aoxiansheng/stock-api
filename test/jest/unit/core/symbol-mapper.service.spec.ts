import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { SymbolMapperService } from "../../../../src/core/symbol-mapper/service/symbol-mapper.service";
import { SymbolMappingRepository } from "../../../../src/core/symbol-mapper/repositories/symbol-mapping.repository";
import { CreateSymbolMappingDto } from "../../../../src/core/symbol-mapper/dto/create-symbol-mapping.dto";
import {
  UpdateSymbolMappingDto,
  AddSymbolMappingRuleDto,
  UpdateSymbolMappingRuleDto,
} from "../../../../src/core/symbol-mapper/dto/update-symbol-mapping.dto";
import { SymbolMappingQueryDto } from "../../../../src/core/symbol-mapper/dto/symbol-mapping-query.dto";
import { SymbolMappingRule } from "../../../../src/core/symbol-mapper/schemas/symbol-mapping-rule.schema";
import { SymbolMappingRuleDocumentType } from "../../../../src/core/symbol-mapper/schemas/symbol-mapping-rule.schema";
import { ISymbolMappingRuleList } from "../../../../src/core/symbol-mapper/interfaces/symbol-mapping.interface";

describe("SymbolMapperService", () => {
  let service: SymbolMapperService;
  let repository: jest.Mocked<SymbolMappingRepository>;

  // 修改为正确的类型
  const mockSymbolMappingDocument = {
    _id: "507f1f77bcf86cd799439011",
    dataSourceName: "test-provider",
    isActive: true,
    SymbolMappingRule: [
      {
        inputSymbol: "AAPL",
        outputSymbol: "AAPL.US",
        market: "US",
        symbolType: "stock",
        isActive: true,
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    // 添加Document类型所需的方法
    $assertPopulated: jest.fn(),
    $clone: jest.fn(),
    $getAllSubdocs: jest.fn(),
    $ignore: jest.fn(),
    $isDefault: jest.fn(),
    $isDeleted: jest.fn(),
    $isEmpty: jest.fn(),
    $isValid: jest.fn(),
    $locals: {},
    $markValid: jest.fn(),
    $session: jest.fn(),
    $set: jest.fn(),
    get: jest.fn(),
    id: "507f1f77bcf86cd799439011",
    equals: jest.fn(),
    isModified: jest.fn(),
    isDirectModified: jest.fn(),
    isNew: false,
    isSelected: jest.fn(),
    markModified: jest.fn(),
    modifiedPaths: jest.fn(),
    populate: jest.fn(),
    populated: jest.fn(),
    toJSON: jest.fn(),
    toObject: jest.fn().mockReturnValue({
      _id: "507f1f77bcf86cd799439011",
      dataSourceName: "test-provider",
      isActive: true,
      SymbolMappingRule: [
        {
          inputSymbol: "AAPL",
          outputSymbol: "AAPL.US",
          market: "US",
          symbolType: "stock",
          isActive: true,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    validate: jest.fn(),
    save: jest.fn(),
  } as unknown as SymbolMappingRuleDocumentType;

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
      addSymbolMappingRule: jest.fn(),
      updateSymbolMappingRule: jest.fn(),
      removeSymbolMappingRule: jest.fn(),
      replaceSymbolMappingRule: jest.fn(),
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

  describe("mapSymbol", () => {
    it("should map symbol successfully when mapping rule exists", async () => {
      repository.findByDataSource.mockResolvedValue(mockSymbolMappingDocument);

      const result = await service.mapSymbol(
        "AAPL",
        "standard",
        "test-provider",
      );

      expect(result).toBe("AAPL.US");
      expect(repository.findByDataSource).toHaveBeenCalledWith("test-provider");
    });

    it("should return original symbol when mapping rule not found", async () => {
      repository.findByDataSource.mockResolvedValue(mockSymbolMappingDocument);

      const result = await service.mapSymbol(
        "GOOGL",
        "standard",
        "test-provider",
      );

      expect(result).toBe("GOOGL");
    });

    it("should return original symbol when mapping config not found", async () => {
      repository.findByDataSource.mockResolvedValue(null);

      const result = await service.mapSymbol(
        "AAPL",
        "standard",
        "nonexistent-provider",
      );

      expect(result).toBe("AAPL");
    });
  });

  describe("createDataSourceMapping", () => {
    it("should create mapping successfully", async () => {
      const createDto: CreateSymbolMappingDto = {
        dataSourceName: "new-provider",
        SymbolMappingRule: [],
      };

      repository.exists.mockResolvedValue(false);
      repository.create.mockResolvedValue(mockSymbolMappingDocument);

      const result = await service.createDataSourceMapping(createDto);

      expect(result).toBeDefined();
      expect(repository.exists).toHaveBeenCalledWith("new-provider");
      expect(repository.create).toHaveBeenCalledWith(createDto);
    });

    it("should throw ConflictException when mapping already exists", async () => {
      const createDto: CreateSymbolMappingDto = {
        dataSourceName: "existing-provider",
        SymbolMappingRule: [],
      };

      repository.exists.mockResolvedValue(true);

      await expect(service.createDataSourceMapping(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("getSymbolMappingById", () => {
    it("should return mapping when found", async () => {
      repository.findById.mockResolvedValue(mockSymbolMappingDocument);

      const result = await service.getSymbolMappingById("507f1f77bcf86cd799439011");

      expect(result).toBeDefined();
      expect(repository.findById).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
      );
    });

    it("should throw NotFoundException when mapping not found", async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getSymbolMappingById("nonexistent-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getSymbolMappingByDataSource", () => {
    it("should return mapping when found", async () => {
      repository.findByDataSource.mockResolvedValue(mockSymbolMappingDocument);

      const result = await service.getSymbolMappingByDataSource("test-provider");

      expect(result).toBeDefined();
      expect(repository.findByDataSource).toHaveBeenCalledWith("test-provider");
    });

    it("should throw NotFoundException when mapping not found", async () => {
      repository.findByDataSource.mockResolvedValue(null);

      await expect(
        service.getSymbolMappingByDataSource("nonexistent-provider"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getSymbolMappingsPaginated", () => {
    it("should return paginated results", async () => {
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

      const result = await service.getSymbolMappingsPaginated(query);

      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });
  });

  describe("updateSymbolMapping", () => {
    it("should update mapping successfully", async () => {
      const updateDto: UpdateSymbolMappingDto = {
        description: "Updated description",
      };

      repository.updateById.mockResolvedValue(mockSymbolMappingDocument);

      const result = await service.updateSymbolMapping(
        "507f1f77bcf86cd799439011",
        updateDto,
      );

      expect(result).toBeDefined();
      expect(repository.updateById).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
        updateDto,
      );
    });

    it("should throw NotFoundException when mapping not found", async () => {
      const updateDto: UpdateSymbolMappingDto = {
        description: "Updated description",
      };

      repository.updateById.mockResolvedValue(null);

      await expect(
        service.updateSymbolMapping("nonexistent-id", updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("deleteSymbolMapping", () => {
    it("should delete mapping successfully", async () => {
      repository.deleteById.mockResolvedValue(mockSymbolMappingDocument);

      const result = await service.deleteSymbolMapping("507f1f77bcf86cd799439011");

      expect(result).toBeDefined();
      expect(repository.deleteById).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
      );
    });

    it("should throw NotFoundException when mapping not found", async () => {
      repository.deleteById.mockResolvedValue(null);

      await expect(service.deleteSymbolMapping("nonexistent-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("transformSymbols", () => {
    it("should transform symbols successfully", async () => {
      const SymbolMappingRule = [
        {
          inputSymbol: "AAPL",
          outputSymbol: "AAPL.US",
          market: "US",
          symbolType: "stock",
          isActive: true,
        },
      ];

      repository.findAllMappingsForSymbols.mockResolvedValue(
        SymbolMappingRule as any,
      );

      const result = await service.transformSymbols("test-provider", [
        "AAPL",
        "GOOGL",
      ]);

      expect(result.transformedSymbols).toEqual({
        AAPL: "AAPL.US",
        GOOGL: "GOOGL",
      });
      expect(result.dataSourceName).toBe("test-provider");
      expect(result.processingTimeMs).toBeGreaterThan(0);
    });
  });

  describe("getTransformedSymbolList", () => {
    it("should return transformed symbol list", async () => {
      const SymbolMappingRule = [
        {
          inputSymbol: "AAPL",
          outputSymbol: "AAPL.US",
          market: "US",
          symbolType: "stock",
          isActive: true,
        },
      ];

      repository.findAllMappingsForSymbols.mockResolvedValue(
        SymbolMappingRule as any,
      );

      const result = await service.getTransformedSymbolList("test-provider", [
        "AAPL",
        "GOOGL",
      ]);

      expect(result).toEqual(["AAPL.US", "GOOGL"]);
    });
  });

  describe("getSymbolMappingRule", () => {
    it("should return mapping rules when provider exists", async () => {
      repository.findByDataSource.mockResolvedValue(mockSymbolMappingDocument);

      const result = await service.getSymbolMappingRule("test-provider");

      expect(result).toEqual(mockSymbolMappingDocument.SymbolMappingRule);
    });

    it("should return empty array when provider not found", async () => {
      repository.findByDataSource.mockResolvedValue(null);

      const result = await service.getSymbolMappingRule("nonexistent-provider");

      expect(result).toEqual([]);
    });
  });

  describe("addSymbolMappingRule", () => {
    it("should add mapping rule successfully", async () => {
      const addDto: AddSymbolMappingRuleDto = {
        dataSourceName: "test-provider",
        symbolMappingRule: {
          inputSymbol: "GOOGL",
          outputSymbol: "GOOGL.US",
          market: "US",
          symbolType: "stock",
          isActive: true,
        },
      };

      repository.addSymbolMappingRule.mockResolvedValue(mockSymbolMappingDocument);

      const result = await service.addSymbolMappingRule(addDto);

      expect(result).toBeDefined();
      expect(repository.addSymbolMappingRule).toHaveBeenCalledWith(
        "test-provider",
        addDto.symbolMappingRule,
      );
    });

    it("should throw NotFoundException when data source not found", async () => {
      const addDto: AddSymbolMappingRuleDto = {
        dataSourceName: "nonexistent-provider",
        symbolMappingRule: {
          inputSymbol: "GOOGL",
          outputSymbol: "GOOGL.US",
          market: "US",
          symbolType: "stock",
          isActive: true,
        },
      };

      repository.addSymbolMappingRule.mockResolvedValue(null);

      await expect(service.addSymbolMappingRule(addDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("updateSymbolMappingRule", () => {
    it("should update mapping rule successfully", async () => {
      const updateDto: UpdateSymbolMappingRuleDto = {
        dataSourceName: "test-provider",
        inputSymbol: "AAPL",
        symbolMappingRule: {
          outputSymbol: "AAPL.NASDAQ",
          market: "US",
          symbolType: "stock",
          isActive: true,
        },
      };

      repository.updateSymbolMappingRule.mockResolvedValue(mockSymbolMappingDocument);

      const result = await service.updateSymbolMappingRule(updateDto);

      expect(result).toBeDefined();
      expect(repository.updateSymbolMappingRule).toHaveBeenCalledWith(
        "test-provider",
        "AAPL",
        updateDto.symbolMappingRule,
      );
    });

    it("should throw NotFoundException when mapping rule not found", async () => {
      const updateDto: UpdateSymbolMappingRuleDto = {
        dataSourceName: "test-provider",
        inputSymbol: "NONEXISTENT",
        symbolMappingRule: {
          outputSymbol: "NONEXISTENT.US",
          market: "US",
          symbolType: "stock",
          isActive: true,
        },
      };

      repository.updateSymbolMappingRule.mockResolvedValue(null);

      await expect(service.updateSymbolMappingRule(updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("removeSymbolMappingRule", () => {
    it("should remove mapping rule successfully", async () => {
      repository.removeSymbolMappingRule.mockResolvedValue(mockSymbolMappingDocument);

      const result = await service.removeSymbolMappingRule("test-provider", "AAPL");

      expect(result).toBeDefined();
      expect(repository.removeSymbolMappingRule).toHaveBeenCalledWith(
        "test-provider",
        "AAPL",
      );
    });

    it("should throw NotFoundException when data source not found", async () => {
      repository.removeSymbolMappingRule.mockResolvedValue(null);

      await expect(
        service.removeSymbolMappingRule("nonexistent-provider", "AAPL"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("replaceSymbolMappingRule", () => {
    it("should replace mapping rules successfully", async () => {
      const newMappingRule: SymbolMappingRule[] = [
        {
          inputSymbol: "TSLA",
          outputSymbol: "TSLA.US",
          market: "US",
          symbolType: "stock",
          isActive: true,
        },
      ];

      repository.replaceSymbolMappingRule.mockResolvedValue(
        mockSymbolMappingDocument,
      );

      const result = await service.replaceSymbolMappingRule(
        "test-provider",
        newMappingRule,
      );

      expect(result).toBeDefined();
      expect(repository.replaceSymbolMappingRule).toHaveBeenCalledWith(
        "test-provider",
        newMappingRule,
      );
    });

    it("should throw NotFoundException when data source not found", async () => {
      const newMappingRule: SymbolMappingRule[] = [];

      repository.replaceSymbolMappingRule.mockResolvedValue(null);

      await expect(
        service.replaceSymbolMappingRule("nonexistent-provider", newMappingRule),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getDataSources", () => {
    it("should return data sources", async () => {
      repository.getDataSources.mockResolvedValue(["provider1", "provider2"]);

      const result = await service.getDataSources();

      expect(result).toEqual(["provider1", "provider2"]);
    });
  });

  describe("getMarkets", () => {
    it("should return markets", async () => {
      repository.getMarkets.mockResolvedValue(["US", "HK"]);

      const result = await service.getMarkets();

      expect(result).toEqual(["US", "HK"]);
    });
  });

  describe("getSymbolTypes", () => {
    it("should return symbol types", async () => {
      repository.getSymbolTypes.mockResolvedValue(["stock", "etf"]);

      const result = await service.getSymbolTypes();

      expect(result).toEqual(["stock", "etf"]);
    });
  });

  describe("deleteSymbolMappingsByDataSource", () => {
    it("should delete mappings by data source", async () => {
      repository.deleteByDataSource.mockResolvedValue({ deletedCount: 1 });

      const result = await service.deleteSymbolMappingsByDataSource("test-provider");

      expect(result.deletedCount).toBe(1);
      expect(repository.deleteByDataSource).toHaveBeenCalledWith(
        "test-provider",
      );
    });
  });

  describe("saveMapping", () => {
    it("should save mapping successfully", async () => {
      const mappingSymbolRule: ISymbolMappingRuleList = {
        dataSourceName: "test-provider",
        SymbolMappingRule: [],
        // 添加缺失的必要属性
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      repository.exists.mockResolvedValue(false);
      repository.create.mockResolvedValue(mockSymbolMappingDocument);

      await service.saveMapping(mappingSymbolRule);

      expect(repository.create).toHaveBeenCalledWith(mappingSymbolRule);
    });
  });
});
