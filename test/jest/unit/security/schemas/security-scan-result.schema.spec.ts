/* eslint-disable @typescript-eslint/no-unused-vars */
import { SecurityScanResultSchema } from '../../../../../src/security/schemas/security-scan-result.schema';

describe('SecurityScanResult Schema', () => {
  // 测试 schema 是否正确创建
  it('should create a schema with all properties', () => {
    // 获取 schema 的定义
    const schemaDefinition = SecurityScanResultSchema.obj;
    // 断言 schema 的各个字段是否存在
    expect(schemaDefinition).toHaveProperty('scanId');
    expect(schemaDefinition).toHaveProperty('timestamp');
    expect(schemaDefinition).toHaveProperty('duration');
    expect(schemaDefinition).toHaveProperty('totalChecks');
    expect(schemaDefinition).toHaveProperty('vulnerabilities');
    expect(schemaDefinition).toHaveProperty('summary');
    expect(schemaDefinition).toHaveProperty('securityScore');
    expect(schemaDefinition).toHaveProperty('recommendations');
  });

  // 测试字段的属性是否正确
  it('should have correct properties for each field', () => {
    // 获取 schema 的定义
    const schemaDefinition = SecurityScanResultSchema.obj;
    // 断言 scanId 字段的属性是否正确
    expect(schemaDefinition.scanId).toMatchObject({ required: true, index: true });
    // 断言 vulnerabilities 字段的属性是否正确
    expect(schemaDefinition.vulnerabilities).toBeDefined();
    // 断言 summary 字段的属性是否正确
    expect(schemaDefinition.summary).toBeDefined();
  });
});