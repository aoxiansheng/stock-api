import { Test, TestingModule } from "@nestjs/testing";
import { SymbolMapperService } from "../../../../../src/core/symbol-mapper/service/symbol-mapper.service";
import { SymbolMappingRepository } from "../../../../../src/core/symbol-mapper/repositories/symbol-mapping.repository";
import { CreateSymbolMappingDto } from "../../../../../src/core/symbol-mapper/dto/create-symbol-mapping.dto";
import { SymbolMappingRule } from "../../../../../src/core/symbol-mapper/schemas/symbol-mapping-rule.schema";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { UpdateSymbolMappingRuleDto } from "../../../../../src/core/symbol-mapper/dto/update-symbol-mapping.dto";

describe("SymbolMapperService", () => {
  let service: SymbolMapperService;
  let mockRepository: jest.Mocked<SymbolMappingRepository>;

  const mockMappingRule: SymbolMappingRule = {
    inputSymbol: "700.HK",
    outputSymbol: "00700",
    market: "HK",
    symbolType: "Stock",
    isActive: true,
  };

  const mockSymbolMapping = {
    _id: "mapping-id",
    dataSourceName: "longport",
    description: "LongPort Mapping",
    SymbolMappingRule: [mockMappingRule],
    isActive: true,
  } as unknown as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SymbolMapperService,
        {
          provide: SymbolMappingRepository,
          useFactory: () => ({
            findAllMappingsForSymbols: jest.fn(),
            findByDataSource: jest.fn(),
            findById: jest.fn(),
            exists: jest.fn(),
            create: jest.fn(),
            updateById: jest.fn(),
            deleteById: jest.fn(),
            getDataSources: jest.fn(),
            addSymbolMappingRule: jest.fn(),
            updateSymbolMappingRule: jest.fn(),
            removeSymbolMappingRule: jest.fn(),
            deleteByDataSource: jest.fn(),
          }),
        },
      ],
    }).compile();

    service = module.get<SymbolMapperService>(SymbolMapperService);
    mockRepository = module.get(SymbolMappingRepository);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("transformSymbols", () => {
    it("should transform symbols using provider mapping", async () => {
      mockRepository.findAllMappingsForSymbols.mockResolvedValue([
        mockMappingRule,
      ]);
      const result = await service.transformSymbols("longport", [
        "700.HK",
        "AAPL",
      ]);
      expect(result.transformedSymbols["700.HK"]).toEqual("00700");
      expect(result.transformedSymbols["AAPL"]).toEqual("AAPL"); // No rule, returns original
      expect(result.failedSymbols).toContain("AAPL");
    });

    it("should handle symbols when no mapping config exists", async () => {
      mockRepository.findAllMappingsForSymbols.mockResolvedValue([]);
      const result = await service.transformSymbols("unknown-provider", [
        "BABA",
      ]);
      expect(result.transformedSymbols["BABA"]).toEqual("BABA");
      expect(result.failedSymbols).toEqual(["BABA"]);
    });

    it("should handle empty symbols array", async () => {
      mockRepository.findAllMappingsForSymbols.mockResolvedValue([]);
      const result = await service.transformSymbols("longport", []);
      expect(result.transformedSymbols).toEqual({});
      expect(result.failedSymbols).toEqual([]);
    });
  });

  describe("getSymbolMappingRule", () => {
    it("should get mapping rules for a provider", async () => {
      mockRepository.findByDataSource.mockResolvedValue(mockSymbolMapping);
      const result = await service.getSymbolMappingRule("longport");
      expect(result).toEqual([mockMappingRule]);
      expect(mockRepository.findByDataSource).toHaveBeenCalledWith("longport");
    });
  });

  describe("createDataSourceMapping", () => {
    it("should create new data source mapping", async () => {
      const createDto: CreateSymbolMappingDto = {
        dataSourceName: "new-provider",
        SymbolMappingRule: [],
      };
      mockRepository.exists.mockResolvedValue(false);
      mockRepository.create.mockResolvedValue(mockSymbolMapping);

      const result = await service.createDataSourceMapping(createDto);
      expect(result.dataSourceName).toBe("longport");
      expect(mockRepository.exists).toHaveBeenCalledWith("new-provider");
      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
    });

    it("should throw ConflictException if mapping config exists", async () => {
      const createDto: CreateSymbolMappingDto = {
        dataSourceName: "existing-provider",
        SymbolMappingRule: [],
      };
      mockRepository.exists.mockResolvedValue(true);
      await expect(service.createDataSourceMapping(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("updateSymbolMappingRule", () => {
    it("should update a mapping rule", async () => {
      const updateDto: UpdateSymbolMappingRuleDto = {
        dataSourceName: "longport",
        inputSymbol: "700.HK",
        symbolMappingRule: { outputSymbol: "TCEHY" },
      };
      mockRepository.updateSymbolMappingRule.mockResolvedValue(mockSymbolMapping);

      const result = await service.updateSymbolMappingRule(updateDto);
      expect(result.dataSourceName).toEqual("longport");
      expect(mockRepository.updateSymbolMappingRule).toHaveBeenCalledWith(
        "longport",
        "700.HK",
        { outputSymbol: "TCEHY" },
      );
    });

    it("should throw NotFoundException if rule does not exist", async () => {
      const updateDto: UpdateSymbolMappingRuleDto = {
        dataSourceName: "longport",
        inputSymbol: "NONEXISTENT.HK",
        symbolMappingRule: { outputSymbol: "TCEHY" },
      };
      mockRepository.updateSymbolMappingRule.mockResolvedValue(null);
      await expect(service.updateSymbolMappingRule(updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("deleteSymbolMapping", () => {
    it("should delete a mapping by ID", async () => {
      mockRepository.deleteById.mockResolvedValue(mockSymbolMapping);
      const result = await service.deleteSymbolMapping("mapping-id");
      expect(result.id).toBe("mapping-id");
      expect(mockRepository.deleteById).toHaveBeenCalledWith("mapping-id");
    });

    it("should throw NotFoundException if mapping ID does not exist", async () => {
      mockRepository.deleteById.mockResolvedValue(null);
      await expect(service.deleteSymbolMapping("non-existent-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getDataSources", () => {
    it("should get a list of data sources", async () => {
      mockRepository.getDataSources.mockResolvedValue(["longport", "ibkr"]);
      const result = await service.getDataSources();
      expect(result).toEqual(["longport", "ibkr"]);
      expect(mockRepository.getDataSources).toHaveBeenCalled();
    });
  });
});
