/* eslint-disable @typescript-eslint/no-unused-vars */
import mongoose from "mongoose";
import { validate } from "class-validator";
import { plainToClass } from "class-transformer";
import { getModelToken } from "@nestjs/mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  DataSourceTemplate,
  DataSourceTemplateSchema,
  ExtractedField,
  ExtractedFieldSchema
} from "../../../../../../../src/core/public/data-mapper/schemas/data-source-template.schema";

describe("DataSourceTemplateSchema", () => {
  let mongod: MongoMemoryServer;
  let model: mongoose.Model<DataSourceTemplate>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    
    model = mongoose.model<DataSourceTemplate>('DataSourceTemplate', DataSourceTemplateSchema);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    await model.deleteMany({});
  });

  describe("DataSourceTemplate Model", () => {
    it("should create a valid data source template", async () => {
      const templateData = {
        name: "LongPort WebSocket Quote Stream",
        provider: "longport",
        apiType: "stream",
        description: "Real-time stock quote stream from LongPort",
        sampleData: {
          symbol: "700.HK",
          last_done: 561,
          volume: 11292534
        },
        extractedFields: [
          {
            fieldPath: "symbol",
            fieldName: "symbol",
            fieldType: "string",
            sampleValue: "700.HK",
            confidence: 1.0,
            isNested: false,
            nestingLevel: 0
          }
        ],
        
        totalFields: 3,
        confidence: 0.95
      };

      const template = new model(templateData);
      const savedTemplate = await template.save();

      expect(savedTemplate._id).toBeDefined();
      expect(savedTemplate.name).toBe("LongPort WebSocket Quote Stream");
      expect(savedTemplate.provider).toBe("longport");
      expect(savedTemplate.apiType).toBe("stream");
      expect(savedTemplate.confidence).toBe(0.95);
      expect(savedTemplate.isActive).toBe(true); // default value
      expect(savedTemplate.isDefault).toBe(false); // default value
      expect(savedTemplate.usageCount).toBe(0); // default value
    });

    it("should fail validation with missing required fields", async () => {
      const template = new model({});
      
      let error;
      try {
        await template.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error._errors).toBeDefined();
    });

    it("should fail validation with invalid apiType", async () => {
      const templateData = {
        name: "Test Template",
        provider: "longport",
        apiType: "invalid",
        sampleData: { symbol: "700.HK" },
        
        confidence: 0.5
      };

      const template = new model(templateData);
      
      let error;
      try {
        await template.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.apiType).toBeDefined();
    });



    it("should fail validation with confidence out of range", async () => {
      const templateData = {
        name: "Test Template",
        provider: "longport",
        apiType: "rest",
        sampleData: { symbol: "700.HK" },
        
        confidence: 1.5 // Invalid: > 1
      };

      const template = new model(templateData);
      
      let error;
      try {
        await template.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.confidence).toBeDefined();
    });

    it("should create template with nested extracted fields", async () => {
      const templateData = {
        name: "Nested Data Template",
        provider: "custom",
        apiType: "rest",
        sampleData: {
          quote: {
            symbol: "AAPL.US",
            price: 150.25
          }
        },
        extractedFields: [
          {
            fieldPath: "quote.symbol",
            fieldName: "symbol",
            fieldType: "string",
            sampleValue: "AAPL.US",
            confidence: 0.9,
            isNested: true,
            nestingLevel: 1
          },
          {
            fieldPath: "quote.price",
            fieldName: "price",
            fieldType: "number",
            sampleValue: 150.25,
            confidence: 0.95,
            isNested: true,
            nestingLevel: 1
          }
        ],
        
        totalFields: 2,
        confidence: 0.92
      };

      const template = new model(templateData);
      const savedTemplate = await template.save();

      expect(savedTemplate.extractedFields).toHaveLength(2);
      expect(savedTemplate.extractedFields[0].isNested).toBe(true);
      expect(savedTemplate.extractedFields[0].nestingLevel).toBe(1);
      
    });

    it("should handle optional fields correctly", async () => {
      const templateData = {
        name: "Minimal Template",
        provider: "test",
        apiType: "rest",
        sampleData: { test: true },
        
        confidence: 0.8,
        isDefault: true,
        isPreset: true,
        usageCount: 10
      };

      const template = new model(templateData);
      const savedTemplate = await template.save();

      expect(savedTemplate.isDefault).toBe(true);
      expect(savedTemplate.isPreset).toBe(true);
      expect(savedTemplate.usageCount).toBe(10);
      expect(savedTemplate.description).toBeUndefined();
      expect(savedTemplate.lastUsedAt).toBeUndefined();
    });

    it("should auto-generate timestamps", async () => {
      const templateData = {
        name: "Timestamp Test",
        provider: "test",
        apiType: "rest",
        sampleData: { test: true },
        
        confidence: 0.5
      };

      const template = new model(templateData);
      const savedTemplate = await template.save();

      expect(savedTemplate.createdAt).toBeDefined();
      expect(savedTemplate.updatedAt).toBeDefined();
      expect(savedTemplate.createdAt).toBeInstanceOf(Date);
      expect(savedTemplate.updatedAt).toBeInstanceOf(Date);
    });

    it("should update timestamps on modification", async () => {
      const templateData = {
        name: "Update Test",
        provider: "test",
        apiType: "rest",
        sampleData: { test: true },
        
        confidence: 0.5
      };

      const template = new model(templateData);
      const savedTemplate = await template.save();
      const originalUpdatedAt = savedTemplate.updatedAt;

      // Wait a moment and update
      await new Promise(resolve => setTimeout(resolve, 10));
      savedTemplate.usageCount = 1;
      const updatedTemplate = await savedTemplate.save();

      expect(updatedTemplate.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe("ExtractedField Schema", () => {
    it("should handle nested field properties", () => {
      const field = new ExtractedField();
      field.fieldPath = "quote.data[0].price";
      field.fieldName = "price";
      field.fieldType = "number";
      field.sampleValue = 100.50;
      field.confidence = 0.85;
      field.isNested = true;
      field.nestingLevel = 2;

      expect(field.fieldPath).toBe("quote.data[0].price");
      expect(field.isNested).toBe(true);
      expect(field.nestingLevel).toBe(2);
      expect(field.sampleValue).toBe(100.50);
    });

    it("should be embedded in template correctly", async () => {
      const templateData = {
        name: "Field Test Template",
        provider: "test",
        apiType: "rest",
        sampleData: { field1: "value1", field2: 123 },
        extractedFields: [
          {
            fieldPath: "field1",
            fieldName: "field1",
            fieldType: "string",
            sampleValue: "value1",
            confidence: 1.0,
            isNested: false,
            nestingLevel: 0
          },
          {
            fieldPath: "field2",
            fieldName: "field2", 
            fieldType: "number",
            sampleValue: 123,
            confidence: 0.9,
            isNested: false,
            nestingLevel: 0
          }
        ],
        
        totalFields: 2,
        confidence: 0.95
      };

      const template = new model(templateData);
      const savedTemplate = await template.save();

      expect(savedTemplate.extractedFields).toHaveLength(2);
      expect(savedTemplate.extractedFields[0].fieldPath).toBe("field1");
      expect(savedTemplate.extractedFields[1].fieldPath).toBe("field2");
      expect(savedTemplate.extractedFields[0].fieldType).toBe("string");
      expect(savedTemplate.extractedFields[1].fieldType).toBe("number");
    });
  });
});