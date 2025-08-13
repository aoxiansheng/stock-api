/* eslint-disable @typescript-eslint/no-unused-vars */
import { SecurityAuditLogSchema } from '../../../../../src/security/schemas/security-audit-log.schema';

describe('SecurityAuditLog Schema', () => {
  // 测试 schema 是否正确创建
  it('should create a schema with all properties', () => {
    // 获取 schema 的定义
    const schemaDefinition = SecurityAuditLogSchema.obj;
    // 断言 schema 的各个字段是否存在
    expect(schemaDefinition).toHaveProperty('eventId');
    expect(schemaDefinition).toHaveProperty('type');
    expect(schemaDefinition).toHaveProperty('severity');
    expect(schemaDefinition).toHaveProperty('action');
    expect(schemaDefinition).toHaveProperty('userId');
    expect(schemaDefinition).toHaveProperty('apiKeyId');
    expect(schemaDefinition).toHaveProperty('clientIP');
    expect(schemaDefinition).toHaveProperty('userAgent');
    expect(schemaDefinition).toHaveProperty('requestUrl');
    expect(schemaDefinition).toHaveProperty('requestMethod');
    expect(schemaDefinition).toHaveProperty('responseStatus');
    expect(schemaDefinition).toHaveProperty('details');
    expect(schemaDefinition).toHaveProperty('timestamp');
    expect(schemaDefinition).toHaveProperty('source');
    expect(schemaDefinition).toHaveProperty('outcome');
    expect(schemaDefinition).toHaveProperty('riskScore');
    expect(schemaDefinition).toHaveProperty('tags');
  });

  // 测试字段的属性是否正确
  it('should have correct properties for each field', () => {
    // 获取 schema 的定义
    const schemaDefinition = SecurityAuditLogSchema.obj;
    // 断言 eventId 字段的属性是否正确
    expect(schemaDefinition.eventId).toMatchObject({ required: true, index: true });
    // 断言 clientIP 字段的属性是否正确
    expect(schemaDefinition.clientIP).toMatchObject({ required: true, index: true });
    // 断言 riskScore 字段的属性是否正确
    expect(schemaDefinition.riskScore).toMatchObject({ min: 0, max: 100 });
  });
});