import { validate } from "class-validator";
import { plainToClass } from "class-transformer";
import {
  CreateFlexibleMappingRuleDto,
  FlexibleFieldMappingDto,
  TransformRuleDto,
  TestFlexibleMappingRuleDto,
  CreateMappingRuleFromSuggestionsDto,
  FlexibleMappingRuleResponseDto,
  FlexibleMappingTestResultDto
} from "../../../../../../src/core/public/data-mapper/dto/flexible-mapping-rule.dto";

describe("FlexibleMappingRuleDto", () => {
  describe("CreateFlexibleMappingRuleDto", () => {
    it("should be valid with correct data", async () => {
      const dto = plainToClass(CreateFlexibleMappingRuleDto, {
        name: "Test Rule",
        provider: "longport",
        apiType: "rest",
        transDataRuleListType: "quote_fields",
        fieldMappings: [
          {
            sourceFieldPath: "last_done",
            targetField: "lastPrice",
            confidence: 0.95
          }
        ]
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should fail validation with missing required fields", async () => {
      const dto = plainToClass(CreateFlexibleMappingRuleDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail validation with invalid apiType", async () => {
      const dto = plainToClass(CreateFlexibleMappingRuleDto, {
        name: "Test Rule",
        provider: "longport",
        apiType: "invalid",
        transDataRuleListType: "quote_fields",
        fieldMappings: []
      });

      const errors = await validate(dto);
      expect(errors.some(error => error.property === "apiType")).toBe(true);
    });

    it("should be valid with optional fields", async () => {
      const dto = plainToClass(CreateFlexibleMappingRuleDto, {
        name: "Test Rule",
        provider: "longport",
        apiType: "stream",
        transDataRuleListType: "quote_fields",
        description: "Test description",
        sourceTemplateId: "507f1f77bcf86cd799439011",
        fieldMappings: [],
        isDefault: true,
        version: "2.0.0"
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.description).toBe("Test description");
      expect(dto.isDefault).toBe(true);
      expect(dto.version).toBe("2.0.0");
    });
  });

  describe("FlexibleFieldMappingDto", () => {
    it("should be valid with minimal required fields", async () => {
      const dto = plainToClass(FlexibleFieldMappingDto, {
        sourceFieldPath: "last_done",
        targetField: "lastPrice",
        confidence: 0.95
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should be valid with transform rules", async () => {
      const dto = plainToClass(FlexibleFieldMappingDto, {
        sourceFieldPath: "last_done",
        targetField: "lastPrice",
        confidence: 0.85,
        transform: {
          type: "multiply",
          value: 100
        }
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should fail validation with missing required fields", async () => {
      const dto = plainToClass(FlexibleFieldMappingDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("TransformRuleDto", () => {
    it("should be valid with multiply transform", async () => {
      const dto = plainToClass(TransformRuleDto, {
        type: "multiply",
        value: 100
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should be valid with divide transform", async () => {
      const dto = plainToClass(TransformRuleDto, {
        type: "divide",
        value: 1000
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should be valid with format transform", async () => {
      const dto = plainToClass(TransformRuleDto, {
        type: "format",
        format: "%.2f"
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should fail validation with invalid transform type", async () => {
      const dto = plainToClass(TransformRuleDto, {
        type: "invalid",
        value: 100
      });

      const errors = await validate(dto);
      expect(errors.some(error => error.property === "type")).toBe(true);
    });
  });

  describe("TestFlexibleMappingRuleDto", () => {
    it("should be valid with test data", async () => {
      const dto = plainToClass(TestFlexibleMappingRuleDto, {
        dataMapperRuleId: "507f1f77bcf86cd799439011",
        testData: {
          last_done: 100.50,
          symbol: "700.HK"
        }
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should fail validation with missing required fields", async () => {
      const dto = plainToClass(TestFlexibleMappingRuleDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("CreateMappingRuleFromSuggestionsDto", () => {
    it("should be valid with suggestions", async () => {
      const dto = plainToClass(CreateMappingRuleFromSuggestionsDto, {
        templateId: "507f1f77bcf86cd799439011",
        name: "Auto Generated Rule",
        selectedSuggestionIndexes: [0],
        description: "Generated from template",
        isDefault: false
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should fail validation with missing required fields", async () => {
      const dto = plainToClass(CreateMappingRuleFromSuggestionsDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("FlexibleMappingRuleResponseDto", () => {
    it("should create response dto correctly", () => {
      const dto = new FlexibleMappingRuleResponseDto();
      dto.id = "507f1f77bcf86cd799439011";
      dto.name = "Test Rule";
      dto.provider = "longport";
      dto.apiType = "rest";
      dto.transDataRuleListType = "quote_fields";
      dto.fieldMappings = [];
      dto.isActive = true;
      dto.version = "1.0.0";
      dto.createdAt = new Date();
      dto.updatedAt = new Date();

      expect(dto.id).toBe("507f1f77bcf86cd799439011");
      expect(dto.name).toBe("Test Rule");
      expect(dto.provider).toBe("longport");
      expect(dto.isActive).toBe(true);
    });
  });

  describe("FlexibleMappingTestResultDto", () => {
    it("should create test result dto correctly", () => {
      const dto = new FlexibleMappingTestResultDto();
      dto.dataMapperRuleId = "507f1f77bcf86cd799439011";
      dto.ruleName = "Test Rule";
      dto.originalData = { last_done: 100.50, symbol: "700.HK" };
      dto.transformedData = { lastPrice: 100.50, symbol: "700.HK" };
      dto.success = true;
      dto.mappingStats = {
        totalMappings: 2,
        successfulMappings: 2,
        failedMappings: 0,
        successRate: 1.0
      };
      dto.executionTime = 15.5;

      expect(dto.success).toBe(true);
      expect(dto.transformedData).toEqual({ lastPrice: 100.50, symbol: "700.HK" });
      expect(dto.mappingStats.totalMappings).toBe(2);
      expect(dto.executionTime).toBe(15.5);
    });
  });
});