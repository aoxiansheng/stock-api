
import { DataMappingResponseDto } from '../../../../../../src/core/data-mapper/dto/data-mapping-response.dto';
import { Types } from 'mongoose';

describe('DataMappingResponseDto', () => {

  // 创建一个模拟的 Mongoose 文档对象
  const mockDocument = {
    _id: new Types.ObjectId(),
    name: 'Test Rule',
    provider: 'test-provider',
    transDataRuleListType: 'quote_fields',
    description: 'A test rule',
    sharedDataFieldMappings: [
      {
        sourceField: 'a',
        targetField: 'b',
      },
    ],
    sampleData: { a: 1 },
    isActive: true,
    version: '1.0.0',
    createdBy: 'tester',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // 创建一个模拟的 Mongoose lean 对象
  const mockLeanObject = {
    ...mockDocument,
    _id: new Types.ObjectId(), // lean 对象也有 _id
  };

  describe('fromDocument', () => {
    it('应能正确地从 Mongoose 文档创建 DTO', () => {
      const dto = DataMappingResponseDto.fromDocument(mockDocument as any);

      expect(dto.id).toBe(mockDocument._id.toString());
      expect(dto.name).toBe(mockDocument.name);
      expect(dto.provider).toBe(mockDocument.provider);
      expect(dto.transDataRuleListType).toBe(mockDocument.transDataRuleListType);
      expect(dto.description).toBe(mockDocument.description);
      expect(dto.sharedDataFieldMappings).toEqual(mockDocument.sharedDataFieldMappings);
      expect(dto.sampleData).toEqual(mockDocument.sampleData);
      expect(dto.isActive).toBe(mockDocument.isActive);
      expect(dto.version).toBe(mockDocument.version);
      expect(dto.createdBy).toBe(mockDocument.createdBy);
      expect(dto.createdAt).toBe(mockDocument.createdAt);
      expect(dto.updatedAt).toBe(mockDocument.updatedAt);
    });

    it('当可选字段缺失时，应能正常处理', () => {
        const partialDocument = { ...mockDocument };
        delete partialDocument.description;
        delete partialDocument.createdBy;

        const dto = DataMappingResponseDto.fromDocument(partialDocument as any);
        expect(dto.description).toBeUndefined();
        expect(dto.createdBy).toBeUndefined();
    });
  });

  describe('fromLeanObject', () => {
    it('应能正确地从 lean 对象创建 DTO', () => {
      const dto = DataMappingResponseDto.fromLeanObject(mockLeanObject);

      expect(dto.id).toBe(mockLeanObject._id.toString());
      expect(dto.name).toBe(mockLeanObject.name);
      // ... 其余字段的断言与 fromDocument 类似
      expect(dto.isActive).toBe(mockLeanObject.isActive);
    });
  });

});
