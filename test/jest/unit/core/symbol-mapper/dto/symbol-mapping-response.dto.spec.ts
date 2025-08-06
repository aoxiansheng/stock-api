import { SymbolMappingResponseDto } from '@core/symbol-mapper/dto/symbol-mapping-response.dto';
import { SymbolMappingRuleDocumentType } from '@core/symbol-mapper/schemas/symbol-mapping-rule.schema';

describe('SymbolMappingResponseDto', () => {
  // 测试 fromDocument 方法
  describe('fromDocument', () => {
    // 测试当所有字段都有效时的情况
    it('应该正确地从 document 创建 DTO', () => {
      // 创建一个模拟的 document 对象
      const document = {
        _id: 'some-id',
        dataSourceName: 'test-source',
        SymbolMappingRule: [
          {
            standardSymbol: 'AAPL.US',
            sdkSymbol: 'AAPL',
            market: 'US',
            symbolType: 'Stock',
            isActive: true,
            description: 'Apple Inc.',
          },
        ],
        description: 'Test mapping',
        version: '1.0.0',
        isActive: true,
        createdBy: 'test-user',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as SymbolMappingRuleDocumentType;

      // 调用 fromDocument 方法创建 DTO
      const dto = SymbolMappingResponseDto.fromDocument(document);

      // 断言 DTO 的各个字段是否与 document 中的值对应
      expect(dto.id).toBe('some-id');
      expect(dto.dataSourceName).toBe('test-source');
      expect(dto.SymbolMappingRule).toHaveLength(1);
      expect(dto.SymbolMappingRule[0].standardSymbol).toBe('AAPL.US');
      expect(dto.description).toBe('Test mapping');
      expect(dto.version).toBe('1.0.0');
      expect(dto.isActive).toBe(true);
      expect(dto.createdBy).toBe('test-user');
      expect(dto.createdAt).toBe(document.createdAt);
      expect(dto.updatedAt).toBe(document.updatedAt);
    });
  });

  // 测试 fromLeanObject 方法
  describe('fromLeanObject', () => {
    // 测试当所有字段都有效时的情况
    it('应该正确地从 lean object 创建 DTO', () => {
      // 创建一个模拟的 lean object
      const leanObject = {
        _id: 'some-id',
        dataSourceName: 'test-source',
        SymbolMappingRule: [
          {
            standardSymbol: 'AAPL.US',
            sdkSymbol: 'AAPL',
          },
        ],
        description: 'Test mapping',
        version: '1.0.0',
        isActive: true,
        createdBy: 'test-user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 调用 fromLeanObject 方法创建 DTO
      const dto = SymbolMappingResponseDto.fromLeanObject(leanObject);

      // 断言 DTO 的各个字段是否与 lean object 中的值对应
      expect(dto.id).toBe('some-id');
      expect(dto.dataSourceName).toBe('test-source');
      expect(dto.SymbolMappingRule).toHaveLength(1);
      expect(dto.SymbolMappingRule[0].standardSymbol).toBe('AAPL.US');
      expect(dto.description).toBe('Test mapping');
      expect(dto.version).toBe('1.0.0');
      expect(dto.isActive).toBe(true);
      expect(dto.createdBy).toBe('test-user');
      expect(dto.createdAt).toBe(leanObject.createdAt.toISOString());
      expect(dto.updatedAt).toBe(leanObject.updatedAt.toISOString());
    });
  });
});
