import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Model } from 'mongoose';
import {
  DataSourceTemplate,
  DataSourceTemplateSchema,
  DataSourceTemplateDocument,
  ExtractedField,
} from '../../../../../../../src/core/00-prepare/data-mapper/schemas/data-source-template.schema';
import { REFERENCE_DATA } from '@common/constants/domain';

describe('DataSourceTemplate Schema', () => {
  let mongod: MongoMemoryServer;
  let module: TestingModule;
  let model: Model<DataSourceTemplateDocument>;
  let validTemplateData: any;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([
          {
            name: DataSourceTemplate.name,
            schema: DataSourceTemplateSchema,
          },
        ]),
      ],
    }).compile();

    model = module.get<Model<DataSourceTemplateDocument>>(
      getModelToken(DataSourceTemplate.name)
    );
  });

  afterAll(async () => {
    await module.close();
    await mongoose.connection.close();
    await mongod.stop();
  });

  beforeEach(async () => {
    await model.deleteMany({});

    // Initialize validTemplateData for each test
    validTemplateData = {
      name: 'LongPort WebSocket 报价流',
      provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      apiType: 'stream',
      description: 'Template for LongPort WebSocket quote stream',
      sampleData: {
        symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
        last_done: 561,
        volume: 11292534,
      },
      extractedFields: [
        {
          fieldPath: 'last_done',
          fieldName: 'last_done',
          fieldType: 'number',
          sampleValue: 561,
          confidence: 0.85,
          isNested: false,
          nestingLevel: 0,
        },
      ],
      totalFields: 3,
      confidence: 0.82,
    };
  });

  describe('ExtractedField subdocument', () => {
    it('should create extracted field with all required properties', async () => {
      const extractedField: ExtractedField = {
        fieldPath: 'last_done',
        fieldName: 'last_done',
        fieldType: 'number',
        sampleValue: 561,
        confidence: 0.85,
        isNested: false,
        nestingLevel: 0,
      };

      const template = new model({
        name: 'Test Template',
        provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        apiType: 'stream',
        sampleData: { test: 'data' },
        extractedFields: [extractedField],
        confidence: 0.8,
      });

      const savedTemplate = await template.save();
      expect(savedTemplate.extractedFields).toHaveLength(1);
      expect(savedTemplate.extractedFields[0].fieldPath).toBe('last_done');
      expect(savedTemplate.extractedFields[0].confidence).toBe(0.85);
    });

    it('should validate confidence range for extracted fields', async () => {
      const template = new model({
        name: 'Test Template',
        provider: 'test_provider',
        apiType: 'rest',
        sampleData: { test: 'data' },
        extractedFields: [
          {
            fieldPath: 'test_field',
            fieldName: 'test_field',
            fieldType: 'string',
            confidence: 1.5, // Invalid: > 1
          },
        ],
        confidence: 0.8,
      });

      await expect(template.save()).rejects.toThrow();
    });

    it('should set default values for optional fields', async () => {
      const template = new model({
        name: 'Test Template',
        provider: 'test_provider',
        apiType: 'rest',
        sampleData: { test: 'data' },
        extractedFields: [
          {
            fieldPath: 'test_field',
            fieldName: 'test_field',
            fieldType: 'string',
            confidence: 0.8,
            // isNested and nestingLevel not specified
          },
        ],
        confidence: 0.8,
      });

      const savedTemplate = await template.save();
      expect(savedTemplate.extractedFields[0].isNested).toBe(false);
      expect(savedTemplate.extractedFields[0].nestingLevel).toBe(0);
    });

    it('should handle nested fields correctly', async () => {
      const nestedField: ExtractedField = {
        fieldPath: 'secu_quote[0].last_done',
        fieldName: 'last_done',
        fieldType: 'number',
        sampleValue: 561,
        confidence: 0.9,
        isNested: true,
        nestingLevel: 2,
      };

      const template = new model({
        name: 'Nested Field Template',
        provider: 'test_provider',
        apiType: 'rest',
        sampleData: { secu_quote: [{ last_done: 561 }] },
        extractedFields: [nestedField],
        confidence: 0.85,
      });

      const savedTemplate = await template.save();
      expect(savedTemplate.extractedFields[0].isNested).toBe(true);
      expect(savedTemplate.extractedFields[0].nestingLevel).toBe(2);
    });

    it('should handle various field types', async () => {
      const fields: ExtractedField[] = [
        {
          fieldPath: 'price',
          fieldName: 'price',
          fieldType: 'number',
          sampleValue: 100.5,
          confidence: 0.9,
          isNested: false,
          nestingLevel: 0,
        },
        {
          fieldPath: 'symbol',
          fieldName: 'symbol',
          fieldType: 'string',
          sampleValue: '700.HK',
          confidence: 0.95,
          isNested: false,
          nestingLevel: 0,
        },
        {
          fieldPath: 'isActive',
          fieldName: 'isActive',
          fieldType: 'boolean',
          sampleValue: true,
          confidence: 0.8,
          isNested: false,
          nestingLevel: 0,
        },
        {
          fieldPath: 'metadata',
          fieldName: 'metadata',
          fieldType: 'object',
          sampleValue: { source: 'api' },
          confidence: 0.7,
          isNested: false,
          nestingLevel: 0,
        },
      ];

      const template = new model({
        name: 'Multi-Type Template',
        provider: 'test_provider',
        apiType: 'rest',
        sampleData: {
          price: 100.5,
          symbol: '700.HK',
          isActive: true,
          metadata: { source: 'api' },
        },
        extractedFields: fields,
        confidence: 0.85,
      });

      const savedTemplate = await template.save();
      expect(savedTemplate.extractedFields).toHaveLength(4);
      expect(savedTemplate.extractedFields[0].fieldType).toBe('number');
      expect(savedTemplate.extractedFields[1].fieldType).toBe('string');
      expect(savedTemplate.extractedFields[2].fieldType).toBe('boolean');
      expect(savedTemplate.extractedFields[3].fieldType).toBe('object');
    });
  });

  describe('DataSourceTemplate main schema', () => {

    it('should create template with all required fields', async () => {
      const template = new model(validTemplateData);
      const savedTemplate = await template.save();

      expect(savedTemplate.name).toBe(validTemplateData.name);
      expect(savedTemplate.provider).toBe(validTemplateData.provider);
      expect(savedTemplate.apiType).toBe(validTemplateData.apiType);
      expect(savedTemplate.confidence).toBe(validTemplateData.confidence);
      expect(savedTemplate.createdAt).toBeDefined();
      expect(savedTemplate.updatedAt).toBeDefined();
    });

    it('should require essential fields', async () => {
      const incompleteTemplate = new model({
        // Missing required fields
        description: 'Missing required fields',
      });

      await expect(incompleteTemplate.save()).rejects.toThrow();
    });

    it('should validate apiType enum', async () => {
      const invalidTemplate = new model({
        ...validTemplateData,
        apiType: 'invalid_api_type',
      });

      await expect(invalidTemplate.save()).rejects.toThrow();
    });

    it('should accept valid apiType values', async () => {
      const validApiTypes = ['rest', 'stream'];

      for (const apiType of validApiTypes) {
        const template = new model({
          ...validTemplateData,
          apiType,
          name: `Template for ${apiType}`,
        });

        const savedTemplate = await template.save();
        expect(savedTemplate.apiType).toBe(apiType);
      }
    });

    it('should validate confidence range', async () => {
      const invalidConfidenceHigh = new model({
        ...validTemplateData,
        confidence: 1.5,
        name: 'High Confidence Template',
      });

      const invalidConfidenceLow = new model({
        ...validTemplateData,
        confidence: -0.1,
        name: 'Low Confidence Template',
      });

      await expect(invalidConfidenceHigh.save()).rejects.toThrow();
      await expect(invalidConfidenceLow.save()).rejects.toThrow();
    });

    it('should set default values for optional fields', async () => {
      const minimalTemplate = new model({
        name: 'Minimal Template',
        provider: 'test_provider',
        apiType: 'rest',
        sampleData: { test: 'data' },
        confidence: 0.8,
      });

      const savedTemplate = await minimalTemplate.save();
      expect(savedTemplate.extractedFields).toEqual([]);
      expect(savedTemplate.totalFields).toBe(0);
      expect(savedTemplate.isActive).toBe(true);
      expect(savedTemplate.isDefault).toBe(false);
      expect(savedTemplate.isPreset).toBe(false);
      expect(savedTemplate.usageCount).toBe(0);
    });

    it('should handle provider name normalization', async () => {
      const template = new model({
        ...validTemplateData,
        provider: 'LONGPORT', // Uppercase
        name: 'Provider Normalization Test',
      });

      const savedTemplate = await template.save();
      expect(savedTemplate.provider).toBe('longport'); // Should be lowercase
    });

    it('should trim string fields', async () => {
      const template = new model({
        ...validTemplateData,
        name: '  Trimmed Template  ',
        description: '  Trimmed Description  ',
        provider: '  test_provider  ',
      });

      const savedTemplate = await template.save();
      expect(savedTemplate.name).toBe('Trimmed Template');
      expect(savedTemplate.description).toBe('Trimmed Description');
      expect(savedTemplate.provider).toBe('test_provider');
    });

    it('should validate numeric field constraints', async () => {
      const invalidTotalFields = new model({
        ...validTemplateData,
        totalFields: -1, // Negative not allowed
        name: 'Invalid Total Fields',
      });

      const invalidUsageCount = new model({
        ...validTemplateData,
        usageCount: -5, // Negative not allowed
        name: 'Invalid Usage Count',
      });

      await expect(invalidTotalFields.save()).rejects.toThrow();
      await expect(invalidUsageCount.save()).rejects.toThrow();
    });

    it('should handle complex sampleData', async () => {
      const complexSampleData = {
        symbol: '700.HK',
        quotes: [
          { time: '09:30:00', price: 561.5, volume: 1000 },
          { time: '09:31:00', price: 562.0, volume: 1500 },
        ],
        metadata: {
          source: 'websocket',
          latency: 10,
          nested: {
            level: 2,
            data: true,
          },
        },
      };

      const template = new model({
        ...validTemplateData,
        sampleData: complexSampleData,
        name: 'Complex Data Template',
      });

      const savedTemplate = await template.save();
      expect(savedTemplate.sampleData).toEqual(complexSampleData);
    });

    it('should support preset templates', async () => {
      const presetTemplate = new model({
        ...validTemplateData,
        isPreset: true,
        isDefault: true,
        name: 'Preset Template',
      });

      const savedTemplate = await presetTemplate.save();
      expect(savedTemplate.isPreset).toBe(true);
      expect(savedTemplate.isDefault).toBe(true);
    });

    it('should track usage statistics', async () => {
      const template = new model({
        ...validTemplateData,
        usageCount: 100,
        lastUsedAt: new Date('2023-01-01'),
        name: 'Usage Stats Template',
      });

      const savedTemplate = await template.save();
      expect(savedTemplate.usageCount).toBe(100);
      expect(savedTemplate.lastUsedAt).toEqual(new Date('2023-01-01'));
    });
  });

  describe('Schema indexes', () => {
    it('should create proper indexes', async () => {
      const indexes = await model.collection.getIndexes();
      const indexNames = Object.keys(indexes);

      // Check for compound indexes
      expect(indexNames.some(name => name.includes('provider_1_apiType_1'))).toBe(true);
      expect(indexNames.some(name => name.includes('isActive_1_isDefault_1'))).toBe(true);
      expect(indexNames.some(name => name.includes('confidence_-1'))).toBe(true);
      expect(indexNames.some(name => name.includes('usageCount_-1'))).toBe(true);
      expect(indexNames.some(name => name.includes('createdAt_-1'))).toBe(true);
      expect(indexNames.some(name => name.includes('isPreset_1'))).toBe(true);
    });

    it('should support efficient queries with indexes', async () => {
      // Create multiple templates for testing
      const templates = [
        {
          ...validTemplateData,
          name: 'Template 1',
          provider: 'provider1',
          apiType: 'rest',
          confidence: 0.9,
          usageCount: 50,
        },
        {
          ...validTemplateData,
          name: 'Template 2',
          provider: 'provider2',
          apiType: 'stream',
          confidence: 0.8,
          usageCount: 75,
          isDefault: true,
        },
        {
          ...validTemplateData,
          name: 'Template 3',
          provider: 'provider1',
          apiType: 'rest',
          confidence: 0.7,
          usageCount: 25,
          isPreset: true,
        },
      ];

      await model.insertMany(templates);

      // Test compound index query
      const providerApiQuery = await model
        .find({ provider: 'provider1', apiType: 'rest' })
        .explain('executionStats') as any;

      expect(providerApiQuery.executionStats?.executionSuccess).toBe(true);

      // Test confidence sorting
      const confidenceSort = await model
        .find({})
        .sort({ confidence: -1 })
        .explain('executionStats') as any;

      expect(confidenceSort.executionStats?.executionSuccess).toBe(true);

      // Test usage count sorting
      const usageSort = await model
        .find({})
        .sort({ usageCount: -1 })
        .exec();

      expect(usageSort[0].usageCount).toBe(75);
      expect(usageSort[1].usageCount).toBe(50);
      expect(usageSort[2].usageCount).toBe(25);
    });
  });

  describe('Document methods and virtuals', () => {
    it('should handle timestamps correctly', async () => {
      const template = new model(validTemplateData);
      const savedTemplate = await template.save();

      expect(savedTemplate.createdAt).toBeDefined();
      expect(savedTemplate.updatedAt).toBeDefined();
      expect(savedTemplate.createdAt).toEqual(savedTemplate.updatedAt);

      // Update the document
      savedTemplate.description = 'Updated description';
      const updatedTemplate = await savedTemplate.save();

      expect(updatedTemplate.updatedAt).not.toEqual(updatedTemplate.createdAt);
    });

    it('should maintain document integrity across operations', async () => {
      const template = new model(validTemplateData);
      const savedTemplate = await template.save();
      const originalId = savedTemplate._id;

      // Find and update
      const foundTemplate = await model.findById(originalId);
      expect(foundTemplate).toBeTruthy();
      expect(foundTemplate!._id).toEqual(originalId);

      // Update usage count
      foundTemplate!.usageCount += 1;
      foundTemplate!.lastUsedAt = new Date();
      await foundTemplate!.save();

      // Verify update
      const updatedTemplate = await model.findById(originalId);
      expect(updatedTemplate!.usageCount).toBe(1);
      expect(updatedTemplate!.lastUsedAt).toBeDefined();
    });
  });

  describe('Error handling and validation', () => {
    it('should handle validation errors gracefully', async () => {
      const invalidTemplate = new model({
        // All required fields missing
      });

      try {
        await invalidTemplate.save();
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).toBe('ValidationError');
        expect(error.errors).toBeDefined();
      }
    });

    it('should validate extracted fields array', async () => {
      const templateWithInvalidField = new model({
        ...validTemplateData,
        extractedFields: [
          {
            fieldPath: 'test_field',
            fieldName: 'test_field',
            fieldType: 'string',
            confidence: 2.0, // Invalid confidence
          },
        ],
        name: 'Invalid Field Template',
      });

      await expect(templateWithInvalidField.save()).rejects.toThrow();
    });

    it('should handle null and undefined values properly', async () => {
      const templateWithNulls = new model({
        ...validTemplateData,
        description: null,
        lastUsedAt: null,
        name: 'Null Values Template',
      });

      const savedTemplate = await templateWithNulls.save();
      expect(savedTemplate.description).toBeNull();
      expect(savedTemplate.lastUsedAt).toBeNull();
    });
  });
});