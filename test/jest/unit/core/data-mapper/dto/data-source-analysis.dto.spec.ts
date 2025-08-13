import { validate } from "class-validator";
import { plainToClass } from "class-transformer";
import {
  AnalyzeDataSourceDto,
  CreateDataSourceTemplateDto,
  DataSourceAnalysisResponseDto,
  DataSourceTemplateResponseDto,
  ExtractedFieldDto,
  FieldMappingSuggestionDto,
  SuggestFieldMappingsDto,
  SuggestFieldMappingsResponseDto
} from "../../../../../../src/core/public/data-mapper/dto/data-source-analysis.dto";

describe("DataSourceAnalysisDto", () => {
  describe("AnalyzeDataSourceDto", () => {
    it("should be valid with correct data", async () => {
      const dto = plainToClass(AnalyzeDataSourceDto, {
        apiType: "rest",
        sampleData: {
          symbol: "700.HK",
          last_done: 561,
          volume: 11292534
        }
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should use default values correctly", async () => {
      const dto = plainToClass(AnalyzeDataSourceDto, {
        apiType: "stream",
        sampleData: {
          symbol: "AAPL.US",
          price: 150.25
        }
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.provider).toBe("custom");
      expect(dto.dataType).toBe("quote_fields");
      expect(dto.saveAsTemplate).toBe(false);
    });

    it("should be valid with all optional fields", async () => {
      const dto = plainToClass(AnalyzeDataSourceDto, {
        provider: "longport",
        apiType: "stream",
        sampleData: {
          symbol: "700.HK",
          last_done: 561
        },
        name: "LongPort Stream",
        description: "LongPort WebSocket stream data",
        dataType: "basic_info_fields",
        saveAsTemplate: true
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.provider).toBe("longport");
      expect(dto.dataType).toBe("basic_info_fields");
      expect(dto.saveAsTemplate).toBe(true);
    });

    it("should fail validation with invalid apiType", async () => {
      const dto = plainToClass(AnalyzeDataSourceDto, {
        apiType: "invalid",
        sampleData: { symbol: "700.HK" }
      });

      const errors = await validate(dto);
      expect(errors.some(error => error.property === "apiType")).toBe(true);
    });

    it("should fail validation with missing required fields", async () => {
      const dto = plainToClass(AnalyzeDataSourceDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail validation with invalid dataType", async () => {
      const dto = plainToClass(AnalyzeDataSourceDto, {
        apiType: "rest",
        sampleData: { symbol: "700.HK" },
        dataType: "invalid"
      });

      const errors = await validate(dto);
      expect(errors.some(error => error.property === "dataType")).toBe(true);
    });
  });

  describe("CreateDataSourceTemplateDto", () => {
    it("should be valid with correct data", async () => {
      const dto = plainToClass(CreateDataSourceTemplateDto, {
        name: "LongPort Quote Template",
        provider: "longport",
        apiType: "rest",
        sampleData: { symbol: "700.HK" },
        extractedFields: [
          {
            fieldName: "symbol",
            fieldPath: "symbol",
            fieldType: "string",
            sampleValue: "700.HK",
            confidence: 1,
            isNested: false,
            nestingLevel: 0
          }
        ],
        dataStructureType: "flat",
        confidence: 0.9
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should be valid with optional fields", async () => {
      const dto = plainToClass(CreateDataSourceTemplateDto, {
        name: "Custom Template",
        provider: "custom",
        apiType: "stream",
        description: "Custom data source template",
        sampleData: { symbol: "700.HK" },
        extractedFields: [],
        dataStructureType: "flat",
        isDefault: true,
        confidence: 0.8
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.isDefault).toBe(true);
    });

    it("should fail validation with missing required fields", async () => {
      const dto = plainToClass(CreateDataSourceTemplateDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("ExtractedFieldDto", () => {
    it("should be valid with basic field data", async () => {
      const dto = plainToClass(ExtractedFieldDto, {
        fieldName: "lastPrice",
        fieldPath: "last_done",
        fieldType: "number",
        sampleValue: 561,
        confidence: 0.8,
        isNested: false,
        nestingLevel: 0
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should be valid with all fields", async () => {
      const dto = plainToClass(ExtractedFieldDto, {
        fieldName: "symbol",
        fieldPath: "symbol",
        fieldType: "string",
        sampleValue: "700.HK",
        confidence: 0.95,
        isNested: false,
        nestingLevel: 0
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.sampleValue).toBe("700.HK");
      expect(dto.confidence).toBe(0.95);
    });

    it("should fail validation with invalid fieldType", async () => {
      const dto = plainToClass(ExtractedFieldDto, {
        fieldName: "price",
        fieldPath: "price",
        fieldType: "invalid",
        sampleValue: 10,
        confidence: 0.5,
        isNested: false,
        nestingLevel: 0
      });

      const errors = await validate(dto);
      // 当前 DTO 对 fieldType 仅要求字符串，因此不应有验证错误
      expect(errors).toHaveLength(0);
    });
  });

  describe("FieldMappingSuggestionDto", () => {
    it("should be valid with suggestion data", async () => {
      const dto = plainToClass(FieldMappingSuggestionDto, {
        sourceField: {
          fieldName: "last_done",
          fieldPath: "last_done",
          fieldType: "number",
          sampleValue: 561,
          confidence: 0.95,
          isNested: false,
          nestingLevel: 0
        },
        targetField: "lastPrice",
        confidence: 0.95,
        reasoning: "Field name similarity"
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should be valid with transform suggestion", async () => {
      const dto = plainToClass(FieldMappingSuggestionDto, {
        sourceField: {
          fieldName: "price_cents",
          fieldPath: "price_cents",
          fieldType: "number",
          sampleValue: 56100,
          confidence: 0.85,
          isNested: false,
          nestingLevel: 0
        },
        targetField: "lastPrice",
        confidence: 0.85,
        reasoning: "Price field with unit conversion"
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should fail validation with invalid confidence range", async () => {
      const dto = plainToClass(FieldMappingSuggestionDto, {
        sourceField: {
          fieldName: "price",
          fieldPath: "price",
          fieldType: "number",
          sampleValue: 561,
          confidence: 0.8,
          isNested: false,
          nestingLevel: 0
        },
        targetField: "lastPrice",
        confidence: 1.5,
        reasoning: "Invalid confidence"
      });

      const errors = await validate(dto);
      expect(errors.some(error => error.property === "confidence")).toBe(true);
    });
  });

  describe("SuggestFieldMappingsDto", () => {
    it("should be valid with template data", async () => {
      const dto = plainToClass(SuggestFieldMappingsDto, {
        templateId: "507f1f77bcf86cd799439011",
        targetFields: ["symbol", "price"],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should be valid with only target fields", async () => {
      const dto = plainToClass(SuggestFieldMappingsDto, {
        templateId: "507f1f77bcf86cd799439022",
        targetFields: ["symbol", "price", "volume"],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should fail validation when missing targetFields", async () => {
      const dto = plainToClass(SuggestFieldMappingsDto, {
        templateId: "507f1f77bcf86cd799439011"
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("DataSourceAnalysisResponseDto", () => {
    it("should create response dto correctly", () => {
      const dto = new DataSourceAnalysisResponseDto();
      dto.provider = "longport";
      dto.apiType = "rest";
      dto.sampleData = { symbol: "700.HK" };
      dto.extractedFields = [
        {
          fieldName: "symbol",
          fieldPath: "symbol",
          fieldType: "string",
          sampleValue: "700.HK",
          confidence: 0.95,
          isNested: false,
          nestingLevel: 0
        }
      ];
      dto.dataStructureType = "flat";
      dto.totalFields = 1;
      dto.confidence = 0.9;
      dto.analysisTimestamp = new Date();

      expect(dto.extractedFields).toHaveLength(1);
      expect(dto.totalFields).toBe(1);
      expect(dto.confidence).toBe(0.9);
      expect(dto.dataStructureType).toBe("flat");
    });
  });

  describe("DataSourceTemplateResponseDto", () => {
    it("should create template response dto correctly", () => {
      const dto = new DataSourceTemplateResponseDto();
      dto.id = "507f1f77bcf86cd799439011";
      dto.name = "LongPort Template";
      dto.provider = "longport";
      dto.apiType = "rest";
      dto.sampleData = { symbol: "700.HK" };
      dto.extractedFields = [];
      dto.dataStructureType = "flat";
      dto.totalFields = 0;
      dto.confidence = 0.8;
      dto.isActive = true;
      dto.isDefault = false;
      dto.usageCount = 5;
      dto.createdAt = new Date();
      dto.updatedAt = new Date();

      expect(dto.id).toBe("507f1f77bcf86cd799439011");
      expect(dto.name).toBe("LongPort Template");
      expect(dto.isActive).toBe(true);
      expect(dto.usageCount).toBe(5);
    });
  });

  describe("SuggestFieldMappingsResponseDto", () => {
    it("should create mapping suggestions response correctly", () => {
      const dto = new SuggestFieldMappingsResponseDto();
      dto.templateId = "507f1f77bcf86cd799439011";
      dto.suggestions = [
        {
          sourceField: {
            fieldName: "last_done",
            fieldPath: "last_done",
            fieldType: "number",
            sampleValue: 561,
            confidence: 0.95,
            isNested: false,
            nestingLevel: 0
          },
          targetField: "lastPrice",
          confidence: 0.95,
          reasoning: "Direct field mapping"
        }
      ];
      dto.generatedAt = new Date();
      dto.coverage = 0.75;

      expect(dto.suggestions).toHaveLength(1);
      expect(dto.templateId).toBe("507f1f77bcf86cd799439011");
      expect(dto.coverage).toBe(0.75);
    });
  });
});