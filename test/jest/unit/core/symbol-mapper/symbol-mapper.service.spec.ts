import { Test, TestingModule } from "@nestjs/testing";
import { SymbolMapperService } from "../../../../../src/core/symbol-mapper/symbol-mapper.service";
import { SymbolMappingRepository } from "../../../../../src/core/symbol-mapper/repositories/symbol-mapping.repository";
import { CreateSymbolMappingDto } from "../../../../../src/core/symbol-mapper/dto/create-symbol-mapping.dto";
import {
  MappingRule,
} from "../../../../../src/core/symbol-mapper/schemas/symbol-mapping-rule.schema";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { UpdateMappingRuleDto } from "../../../../../src/core/symbol-mapper/dto/update-symbol-mapping.dto";

describe("SymbolMapperService", () => {
  let service: SymbolMapperService;
  let mockRepository: jest.Mocked<SymbolMappingRepository>;

  const mockMappingRule: MappingRule = {
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
    mappingRules: [mockMappingRule],
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
            addMappingRule: jest.fn(),
            updateMappingRule: jest.fn(),
            removeMappingRule: jest.fn(),
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

  describe("getMappingRules", () => {
    it("should get mapping rules for a provider", async () => {
      mockRepository.findByDataSource.mockResolvedValue(mockSymbolMapping);
      const result = await service.getMappingRules("longport");
      expect(result).toEqual([mockMappingRule]);
      expect(mockRepository.findByDataSource).toHaveBeenCalledWith("longport");
    });
  });

  describe("createDataSourceMapping", () => {
    it("should create new data source mapping", async () => {
      const createDto: CreateSymbolMappingDto = {
        dataSourceName: "new-provider",
        mappingRules: [],
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
        mappingRules: [],
      };
      mockRepository.exists.mockResolvedValue(true);
      await expect(service.createDataSourceMapping(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("updateMappingRule", () => {
    it("should update a mapping rule", async () => {
      const updateDto: UpdateMappingRuleDto = {
        dataSourceName: "longport",
        inputSymbol: "700.HK",
        mappingRule: { outputSymbol: "TCEHY" },
      };
      mockRepository.updateMappingRule.mockResolvedValue(mockSymbolMapping);

      const result = await service.updateMappingRule(updateDto);
      expect(result.dataSourceName).toEqual("longport");
      expect(mockRepository.updateMappingRule).toHaveBeenCalledWith(
        "longport",
        "700.HK",
        { outputSymbol: "TCEHY" },
      );
    });

    it("should throw NotFoundException if rule does not exist", async () => {
      const updateDto: UpdateMappingRuleDto = {
        dataSourceName: "longport",
        inputSymbol: "NONEXISTENT.HK",
        mappingRule: { outputSymbol: "TCEHY" },
      };
      mockRepository.updateMappingRule.mockResolvedValue(null);
      await expect(service.updateMappingRule(updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("deleteMapping", () => {
    it("should delete a mapping by ID", async () => {
      mockRepository.deleteById.mockResolvedValue(mockSymbolMapping);
      const result = await service.deleteMapping("mapping-id");
      expect(result.id).toBe("mapping-id");
      expect(mockRepository.deleteById).toHaveBeenCalledWith("mapping-id");
    });

    it("should throw NotFoundException if mapping ID does not exist", async () => {
      mockRepository.deleteById.mockResolvedValue(null);
      await expect(service.deleteMapping("non-existent-id")).rejects.toThrow(
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
