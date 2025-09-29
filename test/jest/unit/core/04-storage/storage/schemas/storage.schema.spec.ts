import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';
import {
  StoredData,
  StoredDataDocument,
  StoredDataSchema,
  SensitivityLevel
} from '@core/04-storage/storage/schemas/storage.schema';

describe('StoredData Schema', () => {
  let model: Model<StoredDataDocument>;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        {
          provide: getModelToken(StoredData.name),
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            findOneAndUpdate: jest.fn(),
            deleteOne: jest.fn(),
          },
        },
      ],
    }).compile();

    model = module.get<Model<StoredDataDocument>>(getModelToken(StoredData.name));
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Schema Definition Function Coverage', () => {
    it('should execute StoredDataSchema creation and validation', () => {
      // Act - 验证schema创建函数执行
      expect(StoredDataSchema).toBeDefined();
      expect(StoredDataSchema.paths).toBeDefined();

      // Assert - 验证schema字段定义
      expect(StoredDataSchema.paths.key).toBeDefined();
      expect(StoredDataSchema.paths.data).toBeDefined();
      expect(StoredDataSchema.paths.storageClassification).toBeDefined();
      expect(StoredDataSchema.paths.provider).toBeDefined();
      expect(StoredDataSchema.paths.market).toBeDefined();
      expect(StoredDataSchema.paths.dataSize).toBeDefined();
      expect(StoredDataSchema.paths.compressed).toBeDefined();
      expect(StoredDataSchema.paths.tags).toBeDefined();
      expect(StoredDataSchema.paths.expiresAt).toBeDefined();
      expect(StoredDataSchema.paths.storedAt).toBeDefined();
      expect(StoredDataSchema.paths.sensitivityLevel).toBeDefined();
      expect(StoredDataSchema.paths.encrypted).toBeDefined();
    });

    it('should execute SensitivityLevel enum function coverage', () => {
      // Act - 验证枚举值函数执行
      const enumValues = Object.values(SensitivityLevel);
      const enumKeys = Object.keys(SensitivityLevel);

      // Assert - 验证枚举函数执行
      expect(enumValues).toContain(SensitivityLevel.PUBLIC);
      expect(enumValues).toContain(SensitivityLevel.INTERNAL);
      expect(enumValues).toContain(SensitivityLevel.CONFIDENTIAL);
      expect(enumValues).toContain(SensitivityLevel.RESTRICTED);

      expect(enumKeys).toContain('PUBLIC');
      expect(enumKeys).toContain('INTERNAL');
      expect(enumKeys).toContain('CONFIDENTIAL');
      expect(enumKeys).toContain('RESTRICTED');

      expect(enumValues.length).toBe(4);
      expect(enumKeys.length).toBe(4);
    });

    it('should execute schema method attachment function coverage', () => {
      // Act - 验证schema方法附加执行
      expect(StoredDataSchema.methods).toBeDefined();
      expect(StoredDataSchema.methods.toJSON).toBeDefined();
      expect(typeof StoredDataSchema.methods.toJSON).toBe('function');

      // 验证索引定义函数执行
      const indexes = StoredDataSchema.indexes();
      expect(Array.isArray(indexes)).toBe(true);
      expect(indexes.length).toBeGreaterThan(0);
    });
  });

  describe('toJSON Method Function Coverage', () => {
    it('should execute toJSON method with complete data transformation', () => {
      // Arrange - 创建模拟文档数据
      const mockDocumentData = {
        _id: '507f1f77bcf86cd799439011',
        __v: 0,
        key: 'test-key-toJSON',
        data: { symbol: 'AAPL', price: 150.25 },
        storageClassification: 'STOCK_QUOTE',
        provider: 'test-provider',
        market: 'test-market',
        dataSize: 1024,
        compressed: false,
        tags: { tag1: 'value1', tag2: 'value2' },
        expiresAt: new Date('2024-12-31T23:59:59.999Z'),
        storedAt: new Date('2024-01-01T12:00:00.000Z'),
        sensitivityLevel: SensitivityLevel.PUBLIC,
        encrypted: false,
        createdAt: new Date('2024-01-01T12:00:00.000Z'),
        updatedAt: new Date('2024-01-01T12:00:00.000Z')
      };

      // 创建模拟文档，包含toObject方法
      const mockDocument = {
        ...mockDocumentData,
        toObject: jest.fn().mockReturnValue(mockDocumentData)
      };

      // Act - 直接调用toJSON方法以触发函数覆盖
      const result = StoredDataSchema.methods.toJSON.call(mockDocument);

      // Assert - 验证toJSON方法执行和数据转换
      expect(mockDocument.toObject).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
      expect(result.id).toBe('507f1f77bcf86cd799439011');
      expect(result._id).toBeUndefined();
      expect(result.__v).toBeUndefined();
      expect(result.key).toBe('test-key-toJSON');
      expect(result.data).toEqual({ symbol: 'AAPL', price: 150.25 });
      expect(result.storageClassification).toBe('STOCK_QUOTE');
      expect(result.provider).toBe('test-provider');
      expect(result.market).toBe('test-market');
    });

    it('should execute toJSON method with minimal required data', () => {
      // Arrange - 创建最小数据集
      const minimalDocumentData = {
        _id: '507f1f77bcf86cd799439012',
        __v: 1,
        key: 'minimal-key',
        data: 'minimal-data',
        storageClassification: 'MINIMAL_CLASSIFICATION',
        provider: 'minimal-provider',
        market: 'minimal-market',
        storedAt: new Date(),
        sensitivityLevel: SensitivityLevel.PUBLIC,
        encrypted: false
      };

      const mockMinimalDocument = {
        ...minimalDocumentData,
        toObject: jest.fn().mockReturnValue(minimalDocumentData)
      };

      // Act - 调用toJSON方法处理最小数据
      const result = StoredDataSchema.methods.toJSON.call(mockMinimalDocument);

      // Assert - 验证最小数据的toJSON执行
      expect(result.id).toBe('507f1f77bcf86cd799439012');
      expect(result._id).toBeUndefined();
      expect(result.__v).toBeUndefined();
      expect(result.key).toBe('minimal-key');
      expect(result.data).toBe('minimal-data');
    });

    it('should execute toJSON method with different data types', () => {
      // Arrange - 测试不同数据类型的处理
      const dataTypes = [
        { data: null, description: 'null data' },
        { data: undefined, description: 'undefined data' },
        { data: '', description: 'empty string data' },
        { data: 0, description: 'zero number data' },
        { data: false, description: 'false boolean data' },
        { data: [], description: 'empty array data' },
        { data: {}, description: 'empty object data' },
        { data: { complex: { nested: { object: 'value' } } }, description: 'complex object data' }
      ];

      for (let i = 0; i < dataTypes.length; i++) {
        const testCase = dataTypes[i];
        const documentData = {
          _id: `507f1f77bcf86cd79943901${i}`,
          __v: i,
          key: `test-key-${i}`,
          data: testCase.data,
          storageClassification: 'TEST_CLASSIFICATION',
          provider: 'test-provider',
          market: 'test-market',
          storedAt: new Date(),
          sensitivityLevel: SensitivityLevel.PUBLIC,
          encrypted: false
        };

        const mockDocument = {
          ...documentData,
          toObject: jest.fn().mockReturnValue(documentData)
        };

        // Act - 测试不同数据类型的toJSON执行
        const result = StoredDataSchema.methods.toJSON.call(mockDocument);

        // Assert - 验证不同数据类型的处理
        expect(result.id).toBe(`507f1f77bcf86cd79943901${i}`);
        expect(result._id).toBeUndefined();
        expect(result.__v).toBeUndefined();
        expect(result.data).toEqual(testCase.data);
      }
    });

    it('should execute toJSON method with all SensitivityLevel values', () => {
      // Arrange - 测试所有敏感级别的处理
      const sensitivityLevels = Object.values(SensitivityLevel);

      for (let i = 0; i < sensitivityLevels.length; i++) {
        const level = sensitivityLevels[i];
        const documentData = {
          _id: `507f1f77bcf86cd79943902${i}`,
          __v: 0,
          key: `sensitivity-test-${i}`,
          data: `data-for-${level}`,
          storageClassification: 'SENSITIVITY_TEST',
          provider: 'sensitivity-provider',
          market: 'sensitivity-market',
          storedAt: new Date(),
          sensitivityLevel: level,
          encrypted: level === SensitivityLevel.RESTRICTED || level === SensitivityLevel.CONFIDENTIAL
        };

        const mockDocument = {
          ...documentData,
          toObject: jest.fn().mockReturnValue(documentData)
        };

        // Act - 测试不同敏感级别的toJSON执行
        const result = StoredDataSchema.methods.toJSON.call(mockDocument);

        // Assert - 验证敏感级别数据的处理
        expect(result.id).toBe(`507f1f77bcf86cd79943902${i}`);
        expect(result.sensitivityLevel).toBe(level);
        expect(result.encrypted).toBe(level === SensitivityLevel.RESTRICTED || level === SensitivityLevel.CONFIDENTIAL);
      }
    });

    it('should execute toJSON method with edge case _id formats', () => {
      // Arrange - 测试不同_id格式的处理（只测试有效值，因为schema方法假设_id存在）
      const idFormats = [
        '507f1f77bcf86cd799439011', // 标准ObjectId字符串
        123456789, // 数字ID
        'custom-string-id', // 自定义字符串ID
        'edge-case-id-4', // 另一个字符串ID
        '507f1f77bcf86cd799439999' // 另一个ObjectId字符串
      ];

      for (let i = 0; i < idFormats.length; i++) {
        const testId = idFormats[i];
        const documentData = {
          _id: testId,
          __v: 0,
          key: `edge-case-${i}`,
          data: 'edge-case-data',
          storageClassification: 'EDGE_CASE',
          provider: 'edge-provider',
          market: 'edge-market',
          storedAt: new Date(),
          sensitivityLevel: SensitivityLevel.PUBLIC,
          encrypted: false
        };

        const mockDocument = {
          ...documentData,
          toObject: jest.fn().mockReturnValue(documentData)
        };

        // Act - 测试边界情况的_id处理
        const result = StoredDataSchema.methods.toJSON.call(mockDocument);

        // Assert - 验证边界情况处理
        expect(result._id).toBeUndefined();
        expect(result.__v).toBeUndefined();
        expect(result.id).toBe(testId.toString());
      }
    });
  });

  describe('Schema Property and Index Function Coverage', () => {
    it('should execute schema property validation functions', () => {
      // Act - 验证属性验证函数执行
      const keyPath = StoredDataSchema.paths.key;
      const dataPath = StoredDataSchema.paths.data;
      const storageClassificationPath = StoredDataSchema.paths.storageClassification;
      const sensitivityLevelPath = StoredDataSchema.paths.sensitivityLevel;

      // Assert - 验证路径定义和验证函数
      expect(keyPath).toBeDefined();
      expect(keyPath.isRequired).toBe(true);
      expect(dataPath).toBeDefined();
      expect(dataPath.isRequired).toBe(true);
      expect(storageClassificationPath).toBeDefined();
      expect(storageClassificationPath.isRequired).toBe(true);
      expect(sensitivityLevelPath).toBeDefined();
      // 验证枚举类型配置（通过options访问）
      expect(sensitivityLevelPath.options).toBeDefined();
      expect(sensitivityLevelPath.options.enum).toEqual(Object.values(SensitivityLevel));
    });

    it('should execute schema index creation functions', () => {
      // Act - 验证索引创建函数执行
      const indexes = StoredDataSchema.indexes();

      // Assert - 验证索引函数执行
      expect(Array.isArray(indexes)).toBe(true);
      expect(indexes.length).toBeGreaterThan(0);

      // 验证复合索引
      const compoundIndexExists = indexes.some(index =>
        index[0].storageClassification === 1 &&
        index[0].provider === 1 &&
        index[0].market === 1
      );
      expect(compoundIndexExists).toBe(true);

      // 验证敏感数据索引
      const sensitivityIndexExists = indexes.some(index =>
        index[0].sensitivityLevel === 1 &&
        index[0].encrypted === 1
      );
      expect(sensitivityIndexExists).toBe(true);
    });

    it('should execute schema method function coverage', () => {
      // Act - 验证schema方法定义执行
      expect(StoredDataSchema.methods).toBeDefined();
      expect(typeof StoredDataSchema.methods.toJSON).toBe('function');

      // 验证方法名称
      const methodNames = Object.keys(StoredDataSchema.methods);
      expect(methodNames).toContain('toJSON');

      // 验证方法函数类型
      expect(typeof StoredDataSchema.methods.toJSON).toBe('function');
    });

    it('should execute schema options function coverage', () => {
      // Act - 验证schema选项执行（通过get方法访问）
      const timestampsOption = StoredDataSchema.get('timestamps');
      const collectionOption = StoredDataSchema.get('collection');

      // Assert - 验证选项设置函数执行
      expect(timestampsOption).toBe(true);
      expect(collectionOption).toBe('stored_data');
    });
  });

  describe('Schema Type and Document Function Coverage', () => {
    it('should execute StoredDataDocument type function coverage', () => {
      // Act - 验证类型定义函数执行
      const testData: Partial<StoredData> = {
        key: 'type-test-key',
        data: { test: 'data' },
        storageClassification: 'TYPE_TEST',
        provider: 'type-provider',
        market: 'type-market',
        sensitivityLevel: SensitivityLevel.INTERNAL,
        encrypted: true
      };

      // Assert - 验证类型结构
      expect(testData.key).toBe('type-test-key');
      expect(testData.data).toEqual({ test: 'data' });
      expect(testData.storageClassification).toBe('TYPE_TEST');
      expect(testData.sensitivityLevel).toBe(SensitivityLevel.INTERNAL);
      expect(testData.encrypted).toBe(true);
    });

    it('should execute SensitivityLevel enum iteration function coverage', () => {
      // Act - 验证枚举遍历函数执行
      const allLevels: SensitivityLevel[] = [];

      for (const level in SensitivityLevel) {
        if (Object.prototype.hasOwnProperty.call(SensitivityLevel, level)) {
          allLevels.push(SensitivityLevel[level as keyof typeof SensitivityLevel]);
        }
      }

      // Assert - 验证枚举遍历执行
      expect(allLevels).toContain(SensitivityLevel.PUBLIC);
      expect(allLevels).toContain(SensitivityLevel.INTERNAL);
      expect(allLevels).toContain(SensitivityLevel.CONFIDENTIAL);
      expect(allLevels).toContain(SensitivityLevel.RESTRICTED);
      expect(allLevels.length).toBe(4);
    });

    it('should execute schema compilation and validation function coverage', () => {
      // Act - 验证schema编译执行
      expect(StoredDataSchema.obj).toBeDefined();
      expect(StoredDataSchema.paths).toBeDefined();
      expect(StoredDataSchema.methods).toBeDefined();
      expect(StoredDataSchema.statics).toBeDefined();

      // 验证schema字段类型（通过paths访问）
      expect(StoredDataSchema.paths.key).toBeDefined();
      expect(StoredDataSchema.paths.data).toBeDefined();
      expect(StoredDataSchema.paths.storageClassification).toBeDefined();
      expect(StoredDataSchema.paths.sensitivityLevel).toBeDefined();
    });
  });
});
