import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as mongoose from 'mongoose';
import {
  SymbolMappingRule,
  SymbolMappingRuleSchema,
  SymbolMappingRuleDocument,
  SymbolMappingRuleDocumentSchema,
  SymbolMappingRuleDocumentType,
} from '../../../../../../../src/core/00-prepare/symbol-mapper/schemas/symbol-mapping-rule.schema';

describe('SymbolMappingRuleSchema', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let symbolMappingRuleModel: Model<SymbolMappingRuleDocument>;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    connection = mongoose.createConnection(mongoUri);
    symbolMappingRuleModel = connection.model(
      'SymbolMappingRule',
      SymbolMappingRuleDocumentSchema
    );
  });

  afterAll(async () => {
    await connection.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await symbolMappingRuleModel.deleteMany({});
  });

  describe('SymbolMappingRule schema', () => {
    const validRuleData = {
      standardSymbol: '700.HK',
      sdkSymbol: '00700',
      market: 'HK',
      symbolType: 'stock',
      isActive: true,
      description: 'Tencent Holdings Limited',
    };

    it('should create a SymbolMappingRule with valid data', () => {
      const rule = new SymbolMappingRule();
      Object.assign(rule, validRuleData);

      expect(rule.standardSymbol).toBe('700.HK');
      expect(rule.sdkSymbol).toBe('00700');
      expect(rule.market).toBe('HK');
      expect(rule.symbolType).toBe('stock');
      expect(rule.isActive).toBe(true);
      expect(rule.description).toBe('Tencent Holdings Limited');
    });

    it('should create a SymbolMappingRule with minimal required data', () => {
      const rule = new SymbolMappingRule();
      rule.standardSymbol = '700.HK';
      rule.sdkSymbol = '00700';

      expect(rule.standardSymbol).toBe('700.HK');
      expect(rule.sdkSymbol).toBe('00700');
      expect(rule.market).toBeUndefined();
      expect(rule.symbolType).toBeUndefined();
      expect(rule.isActive).toBeUndefined();
      expect(rule.description).toBeUndefined();
    });

    it('should default isActive to true when not provided', () => {
      const ruleSchema = SymbolMappingRuleSchema;
      const isActiveField = ruleSchema.paths['isActive'];

      expect(isActiveField).toBeDefined();
      expect((isActiveField as any).defaultValue).toBe(true);
    });

    it('should have correct field types', () => {
      const ruleSchema = SymbolMappingRuleSchema;

      expect(ruleSchema.paths['standardSymbol'].instance).toBe('String');
      expect(ruleSchema.paths['sdkSymbol'].instance).toBe('String');
      expect(ruleSchema.paths['market'].instance).toBe('String');
      expect(ruleSchema.paths['symbolType'].instance).toBe('String');
      expect(ruleSchema.paths['isActive'].instance).toBe('Boolean');
      expect(ruleSchema.paths['description'].instance).toBe('String');
    });

    it('should have required fields configured correctly', () => {
      const ruleSchema = SymbolMappingRuleSchema;

      expect(ruleSchema.paths['standardSymbol'].isRequired).toBe(true);
      expect(ruleSchema.paths['sdkSymbol'].isRequired).toBe(true);
      expect(ruleSchema.paths['market'].isRequired).toBe(false);
      expect(ruleSchema.paths['symbolType'].isRequired).toBe(false);
      expect(ruleSchema.paths['isActive'].isRequired).toBe(false);
      expect(ruleSchema.paths['description'].isRequired).toBe(false);
    });

    it('should not have _id field (configured as false)', () => {
      const ruleSchema = SymbolMappingRuleSchema;
      expect((ruleSchema as any).options._id).toBe(false);
    });
  });

  describe('SymbolMappingRuleDocument schema', () => {
    const validDocumentData = {
      dataSourceName: 'longport',
      SymbolMappingRule: [
        {
          standardSymbol: '700.HK',
          sdkSymbol: '00700',
          market: 'HK',
          symbolType: 'stock',
          isActive: true,
          description: 'Tencent Holdings Limited',
        },
        {
          standardSymbol: 'AAPL.US',
          sdkSymbol: 'AAPL',
          market: 'US',
          symbolType: 'stock',
          isActive: true,
          description: 'Apple Inc.',
        },
      ],
      description: 'LongPort symbol mapping configuration',
      version: '1.0.0',
      isActive: true,
      createdBy: 'admin',
    };

    it('should create and save a SymbolMappingRuleDocument with valid data', async () => {
      const document = new symbolMappingRuleModel(validDocumentData);
      const savedDocument = await document.save();

      expect(savedDocument._id).toBeDefined();
      expect(savedDocument.dataSourceName).toBe('longport');
      expect(savedDocument.SymbolMappingRule).toHaveLength(2);
      expect(savedDocument.SymbolMappingRule[0].standardSymbol).toBe('700.HK');
      expect(savedDocument.description).toBe('LongPort symbol mapping configuration');
      expect(savedDocument.version).toBe('1.0.0');
      expect(savedDocument.isActive).toBe(true);
      expect(savedDocument.createdBy).toBe('admin');
      expect((savedDocument as any).createdAt).toBeDefined();
      expect((savedDocument as any).updatedAt).toBeDefined();
    });

    it('should create document with minimal required data', async () => {
      const minimalData = {
        dataSourceName: 'test-provider',
        isActive: true,
      };

      const document = new symbolMappingRuleModel(minimalData);
      const savedDocument = await document.save();

      expect(savedDocument.dataSourceName).toBe('test-provider');
      expect(savedDocument.SymbolMappingRule).toEqual([]);
      expect(savedDocument.isActive).toBe(true);
      expect(savedDocument.description).toBeUndefined();
      expect(savedDocument.version).toBeUndefined();
      expect(savedDocument.createdBy).toBeUndefined();
    });

    it('should enforce unique constraint on dataSourceName', async () => {
      const data1 = { dataSourceName: 'longport', isActive: true };
      const data2 = { dataSourceName: 'longport', isActive: true };

      await new symbolMappingRuleModel(data1).save();

      const duplicateDocument = new symbolMappingRuleModel(data2);

      await expect(duplicateDocument.save()).rejects.toThrow();
    });

    it('should default SymbolMappingRule to empty array', async () => {
      const document = new symbolMappingRuleModel({
        dataSourceName: 'test-provider',
        isActive: true,
      });

      expect(document.SymbolMappingRule).toEqual([]);
    });

    it('should default isActive to true', async () => {
      const document = new symbolMappingRuleModel({
        dataSourceName: 'test-provider',
      });

      expect(document.isActive).toBe(true);
    });

    it('should have timestamps enabled', () => {
      const schema = SymbolMappingRuleDocumentSchema;
      expect((schema as any).options.timestamps).toBe(true);
    });

    it('should use correct collection name', () => {
      const schema = SymbolMappingRuleDocumentSchema;
      expect((schema as any).options.collection).toBe('symbol_mapping_rules');
    });

    it('should validate required fields', async () => {
      const invalidDocument = new symbolMappingRuleModel({});

      await expect(invalidDocument.save()).rejects.toThrow(/validation failed/i);
    });

    it('should validate nested SymbolMappingRule objects', async () => {
      const documentWithInvalidRule = new symbolMappingRuleModel({
        dataSourceName: 'test-provider',
        SymbolMappingRule: [
          {
            standardSymbol: '700.HK',
            // Missing required sdkSymbol
          },
        ],
        isActive: true,
      });

      await expect(documentWithInvalidRule.save()).rejects.toThrow();
    });
  });

  describe('Schema indexes', () => {
    it('should have correct indexes defined', () => {
      const schema = SymbolMappingRuleDocumentSchema;
      const indexes = schema.indexes();

      const indexPaths = indexes.map(index => Object.keys(index[0])[0]);

      expect(indexPaths).toContain('dataSourceName');
      expect(indexPaths).toContain('isActive');
      expect(indexPaths).toContain('SymbolMappingRule.standardSymbol');
      expect(indexPaths).toContain('SymbolMappingRule.market');
      expect(indexPaths).toContain('createdAt');
    });

    it('should have unique index on dataSourceName', () => {
      const schema = SymbolMappingRuleDocumentSchema;
      const dataSourcePath = schema.paths['dataSourceName'];

      expect(dataSourcePath.options.unique).toBe(true);
    });

    it('should have descending index on createdAt for sorting', () => {
      const schema = SymbolMappingRuleDocumentSchema;
      const indexes = schema.indexes();

      const createdAtIndex = indexes.find(index =>
        Object.keys(index[0])[0] === 'createdAt'
      );

      expect(createdAtIndex).toBeDefined();
      expect(createdAtIndex[0].createdAt).toBe(-1);
    });
  });

  describe('Custom JSON serialization', () => {
    it('should customize toJSON output', async () => {
      const document = new symbolMappingRuleModel(validDocumentData);
      const savedDocument = await document.save();

      const jsonOutput = savedDocument.toJSON();

      expect((jsonOutput as any).id).toBeDefined();
      expect((jsonOutput as any)._id).toBeUndefined();
      expect((jsonOutput as any).__v).toBeUndefined();
      expect(jsonOutput.dataSourceName).toBe('longport');
      expect(jsonOutput.SymbolMappingRule).toHaveLength(2);
    });

    it('should convert _id to string in JSON output', async () => {
      const document = new symbolMappingRuleModel(validDocumentData);
      const savedDocument = await document.save();

      const jsonOutput = savedDocument.toJSON();

      expect(typeof (jsonOutput as any).id).toBe('string');
      expect((jsonOutput as any).id).toHaveLength(24); // MongoDB ObjectId string length
    });
  });

  describe('Document type definitions', () => {
    it('should extend Document with timestamps', () => {
      // This test ensures the TypeScript type definition is correct
      const createDocument = (): SymbolMappingRuleDocumentType => {
        const doc = new symbolMappingRuleModel(validDocumentData) as SymbolMappingRuleDocumentType;
        return doc;
      };

      const document = createDocument();
      expect(document).toBeDefined();

      // These properties should be available due to the type definition
      expect(document.dataSourceName).toBeDefined();
      expect(Array.isArray(document.SymbolMappingRule)).toBe(true);
      expect(typeof document.isActive).toBe('boolean');
    });

    it('should include timestamps in type', async () => {
      const document = new symbolMappingRuleModel(validDocumentData);
      const savedDocument = await document.save() as SymbolMappingRuleDocumentType;

      expect(savedDocument.createdAt).toBeInstanceOf(Date);
      expect(savedDocument.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Schema validation edge cases', () => {
    it('should handle empty SymbolMappingRule array', async () => {
      const document = new symbolMappingRuleModel({
        dataSourceName: 'test-provider',
        SymbolMappingRule: [],
        isActive: true,
      });

      const savedDocument = await document.save();
      expect(savedDocument.SymbolMappingRule).toEqual([]);
    });

    it('should handle large number of mapping rules', async () => {
      const largeRuleSet = Array(100).fill(null).map((_, index) => ({
        standardSymbol: `SYMBOL${index}.HK`,
        sdkSymbol: `${index.toString().padStart(5, '0')}`,
        market: 'HK',
        symbolType: 'stock',
        isActive: true,
        description: `Test symbol ${index}`,
      }));

      const document = new symbolMappingRuleModel({
        dataSourceName: 'test-large-provider',
        SymbolMappingRule: largeRuleSet,
        isActive: true,
      });

      const savedDocument = await document.save();
      expect(savedDocument.SymbolMappingRule).toHaveLength(100);
      expect(savedDocument.SymbolMappingRule[0].standardSymbol).toBe('SYMBOL0.HK');
      expect(savedDocument.SymbolMappingRule[99].standardSymbol).toBe('SYMBOL99.HK');
    });

    it('should preserve field order in nested objects', async () => {
      const document = new symbolMappingRuleModel({
        dataSourceName: 'test-provider',
        SymbolMappingRule: [{
          standardSymbol: '700.HK',
          sdkSymbol: '00700',
          market: 'HK',
          symbolType: 'stock',
          isActive: true,
          description: 'Tencent Holdings Limited',
        }],
        isActive: true,
      });

      const savedDocument = await document.save();
      const rule = savedDocument.SymbolMappingRule[0];

      expect(rule.standardSymbol).toBe('700.HK');
      expect(rule.sdkSymbol).toBe('00700');
      expect(rule.market).toBe('HK');
      expect(rule.symbolType).toBe('stock');
      expect(rule.isActive).toBe(true);
      expect(rule.description).toBe('Tencent Holdings Limited');
    });
  });

  const validDocumentData = {
    dataSourceName: 'longport',
    SymbolMappingRule: [
      {
        standardSymbol: '700.HK',
        sdkSymbol: '00700',
        market: 'HK',
        symbolType: 'stock',
        isActive: true,
        description: 'Tencent Holdings Limited',
      },
    ],
    description: 'LongPort symbol mapping configuration',
    version: '1.0.0',
    isActive: true,
    createdBy: 'admin',
  };
});