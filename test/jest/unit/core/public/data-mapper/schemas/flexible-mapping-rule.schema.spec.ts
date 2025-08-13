import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  FlexibleMappingRule,
  FlexibleMappingRuleSchema,
  FlexibleFieldMapping,
  FlexibleFieldMappingSchema,
  TransformRule,
  TransformRuleSchema
} from "../../../../../../src/core/data-mapper/schemas/flexible-mapping-rule.schema";

describe("FlexibleMappingRuleSchema", () => {
  let mongod: MongoMemoryServer;
  let model: mongoose.Model<FlexibleMappingRule>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    
    model = mongoose.model<FlexibleMappingRule>('FlexibleMappingRule', FlexibleMappingRuleSchema);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    await model.deleteMany({});
  });

  describe("FlexibleMappingRule Model", () => {
    it("should create a valid mapping rule", async () => {
      const ruleData = {
        name: "LongPort Quote Mapping",
        provider: "longport",
        apiType: "rest",
        transDataRuleListType: "quote_fields",
        description: "Maps LongPort quote fields to standard format",
        fieldMappings: [
          {
            sourceFieldPath: "last_done",
            targetField: "lastPrice",
            confidence: 0.95
          }
        ]
      };

      const rule = new model(ruleData);
      const savedRule = await rule.save();

      expect(savedRule._id).toBeDefined();
      expect(savedRule.name).toBe("LongPort Quote Mapping");
      expect(savedRule.provider).toBe("longport");
      expect(savedRule.apiType).toBe("rest");
      expect(savedRule.isActive).toBe(true); // default value
      expect(savedRule.isDefault).toBe(false); // default value
      expect(savedRule.version).toBe("1.0.0"); // default value
      expect(savedRule.overallConfidence).toBe(0.5); // default value
      expect(savedRule.usageCount).toBe(0); // default value
      expect(savedRule.successfulTransformations).toBe(0); // default value
      expect(savedRule.failedTransformations).toBe(0); // default value
    });

    it("should fail validation with missing required fields", async () => {
      const rule = new model({});
      
      let error;
      try {
        await rule.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors).toBeDefined();
    });

    it("should fail validation with invalid apiType", async () => {
      const ruleData = {
        name: "Test Rule",
        provider: "longport",
        apiType: "invalid",
        transDataRuleListType: "quote_fields"
      };

      const rule = new model(ruleData);
      
      let error;
      try {
        await rule.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.apiType).toBeDefined();
    });

    it("should fail validation with overallConfidence out of range", async () => {
      const ruleData = {
        name: "Test Rule",
        provider: "longport",
        apiType: "rest",
        transDataRuleListType: "quote_fields",
        overallConfidence: 1.5 // Invalid: > 1
      };

      const rule = new model(ruleData);
      
      let error;
      try {
        await rule.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.overallConfidence).toBeDefined();
    });

    it("should create rule with complex field mappings", async () => {
      const ruleData = {
        name: "Complex Mapping Rule",
        provider: "longport",
        apiType: "stream",
        transDataRuleListType: "quote_fields",
        fieldMappings: [
          {
            sourceFieldPath: "last_done",
            targetField: "lastPrice",
            confidence: 0.95,
            transform: {
              type: "multiply",
              value: 1.0
            }
          },
          {
            sourceFieldPath: "volume",
            targetField: "volume",
            confidence: 0.98,
            isRequired: true
          },
          {
            sourceFieldPath: "timestamp",
            targetField: "timestamp",
            confidence: 0.99,
            transform: {
              type: "format",
              format: "ISO8601"
            }
          }
        ],
        overallConfidence: 0.94,
        version: "2.0.0"
      };

      const rule = new model(ruleData);
      const savedRule = await rule.save();

      expect(savedRule.fieldMappings).toHaveLength(3);
      expect(savedRule.fieldMappings[0].sourceFieldPath).toBe("last_done");
      expect(savedRule.fieldMappings[0].transform.type).toBe("multiply");
      expect(savedRule.fieldMappings[1].isRequired).toBe(true);
      expect(savedRule.fieldMappings[2].transform.format).toBe("ISO8601");
      expect(savedRule.overallConfidence).toBe(0.94);
      expect(savedRule.version).toBe("2.0.0");
    });

    it("should handle optional fields correctly", async () => {
      const ruleData = {
        name: "Optional Fields Test",
        provider: "test",
        apiType: "rest",
        transDataRuleListType: "basic_info_fields",
        sourceTemplateId: "507f1f77bcf86cd799439011",
        isDefault: true,
        usageCount: 5,
        successfulTransformations: 100,
        failedTransformations: 2,
        lastUsedAt: new Date(),
        lastValidatedAt: new Date()
      };

      const rule = new model(ruleData);
      const savedRule = await rule.save();

      expect(savedRule.sourceTemplateId).toBe("507f1f77bcf86cd799439011");
      expect(savedRule.isDefault).toBe(true);
      expect(savedRule.usageCount).toBe(5);
      expect(savedRule.successfulTransformations).toBe(100);
      expect(savedRule.failedTransformations).toBe(2);
      expect(savedRule.lastUsedAt).toBeInstanceOf(Date);
      expect(savedRule.lastValidatedAt).toBeInstanceOf(Date);
    });

    it("should auto-generate timestamps", async () => {
      const ruleData = {
        name: "Timestamp Test",
        provider: "test",
        apiType: "rest",
        transDataRuleListType: "quote_fields"
      };

      const rule = new model(ruleData);
      const savedRule = await rule.save();

      expect(savedRule.createdAt).toBeDefined();
      expect(savedRule.updatedAt).toBeDefined();
      expect(savedRule.createdAt).toBeInstanceOf(Date);
      expect(savedRule.updatedAt).toBeInstanceOf(Date);
    });

    it("should update timestamps on modification", async () => {
      const ruleData = {
        name: "Update Test",
        provider: "test",
        apiType: "rest",
        transDataRuleListType: "quote_fields"
      };

      const rule = new model(ruleData);
      const savedRule = await rule.save();
      const originalUpdatedAt = savedRule.updatedAt;

      // Wait a moment and update
      await new Promise(resolve => setTimeout(resolve, 10));
      savedRule.usageCount = 1;
      const updatedRule = await savedRule.save();

      expect(updatedRule.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it("should calculate success rate virtual field", async () => {
      const ruleData = {
        name: "Success Rate Test",
        provider: "test",
        apiType: "rest",
        transDataRuleListType: "quote_fields",
        successfulTransformations: 80,
        failedTransformations: 20
      };

      const rule = new model(ruleData);
      const savedRule = await rule.save();

      // Test virtual field calculation
      expect(savedRule.successRate).toBe(0.8); // 80 / (80 + 20) = 0.8
    });

    it("should handle zero transformations for success rate", async () => {
      const ruleData = {
        name: "Zero Success Rate Test",
        provider: "test",
        apiType: "rest",
        transDataRuleListType: "quote_fields",
        successfulTransformations: 0,
        failedTransformations: 0
      };

      const rule = new model(ruleData);
      const savedRule = await rule.save();

      expect(savedRule.successRate).toBe(0);
    });
  });

  describe("FlexibleFieldMapping Schema", () => {
    it("should validate field mapping with correct data and default values", async () => {
      const ruleData = {
        name: "Field Mapping Default Values Test",
        provider: "test",
        apiType: "rest",
        transDataRuleListType: "quote_fields",
        fieldMappings: [
          {
            sourceFieldPath: "last_done",
            targetField: "lastPrice",
            confidence: 0.95
            // isRequired 未设置，应该使用默认值 false
          }
        ]
      };

      const rule = new model(ruleData);
      const savedRule = await rule.save();

      const mapping = savedRule.fieldMappings[0];
      expect(mapping.sourceFieldPath).toBe("last_done");
      expect(mapping.targetField).toBe("lastPrice");
      expect(mapping.confidence).toBe(0.95);
      expect(mapping.isRequired).toBe(false); // 验证默认值
      expect(mapping.isActive).toBe(true); // 验证另一个默认值
    });

    it("should handle mapping with transform rules through model", async () => {
      const ruleData = {
        name: "Transform Rules Test",
        provider: "test",
        apiType: "rest",
        transDataRuleListType: "quote_fields",
        fieldMappings: [
          {
            sourceFieldPath: "price_cents",
            targetField: "lastPrice",
            confidence: 0.85,
            transform: {
              type: "divide",
              value: 100,
              description: "Convert cents to dollars"
            }
          }
        ]
      };

      const rule = new model(ruleData);
      const savedRule = await rule.save();

      const mapping = savedRule.fieldMappings[0];
      expect(mapping.transform.type).toBe("divide");
      expect(mapping.transform.value).toBe(100);
      expect(mapping.transform.description).toBe("Convert cents to dollars");
    });

    it("should be embedded in mapping rule correctly", async () => {
      const ruleData = {
        name: "Field Mapping Test",
        provider: "test",
        apiType: "rest",
        transDataRuleListType: "quote_fields",
        fieldMappings: [
          {
            sourceFieldPath: "field1",
            targetField: "targetField1",
            confidence: 0.9,
            isRequired: true
          },
          {
            sourceFieldPath: "field2",
            targetField: "targetField2", 
            confidence: 0.8,
            description: "Optional field mapping"
          }
        ]
      };

      const rule = new model(ruleData);
      const savedRule = await rule.save();

      expect(savedRule.fieldMappings).toHaveLength(2);
      expect(savedRule.fieldMappings[0].sourceFieldPath).toBe("field1");
      expect(savedRule.fieldMappings[0].isRequired).toBe(true);
      expect(savedRule.fieldMappings[1].description).toBe("Optional field mapping");
    });
  });

  describe("TransformRule Schema", () => {
    it("should validate transform rule with multiply type through model", async () => {
      const ruleData = {
        name: "Transform Multiply Test",
        provider: "test",
        apiType: "rest",
        transDataRuleListType: "quote_fields",
        fieldMappings: [
          {
            sourceFieldPath: "price",
            targetField: "lastPrice",
            confidence: 0.9,
            transform: {
              type: "multiply",
              value: 100,
              description: "Multiply by 100"
            }
          }
        ]
      };

      const rule = new model(ruleData);
      const savedRule = await rule.save();

      const transform = savedRule.fieldMappings[0].transform;
      expect(transform.type).toBe("multiply");
      expect(transform.value).toBe(100);
      expect(transform.description).toBe("Multiply by 100");
    });

    it("should validate transform rule with format type through model", async () => {
      const ruleData = {
        name: "Transform Format Test",
        provider: "test",
        apiType: "rest",
        transDataRuleListType: "quote_fields",
        fieldMappings: [
          {
            sourceFieldPath: "price",
            targetField: "lastPrice",
            confidence: 0.9,
            transform: {
              type: "format",
              format: "%.2f",
              description: "Format to 2 decimal places"
            }
          }
        ]
      };

      const rule = new model(ruleData);
      const savedRule = await rule.save();

      const transform = savedRule.fieldMappings[0].transform;
      expect(transform.type).toBe("format");
      expect(transform.format).toBe("%.2f");
      expect(transform.description).toBe("Format to 2 decimal places");
    });

    it("should be embedded in field mapping correctly", async () => {
      const ruleData = {
        name: "Transform Test",
        provider: "test",
        apiType: "rest",
        transDataRuleListType: "quote_fields",
        fieldMappings: [
          {
            sourceFieldPath: "price_cents",
            targetField: "lastPrice",
            confidence: 0.9,
            transform: {
              type: "divide",
              value: 100,
              description: "Convert cents to dollars"
            }
          }
        ]
      };

      const rule = new model(ruleData);
      const savedRule = await rule.save();

      expect(savedRule.fieldMappings[0].transform).toBeDefined();
      expect(savedRule.fieldMappings[0].transform.type).toBe("divide");
      expect(savedRule.fieldMappings[0].transform.value).toBe(100);
      expect(savedRule.fieldMappings[0].transform.description).toBe("Convert cents to dollars");
    });
  });
});