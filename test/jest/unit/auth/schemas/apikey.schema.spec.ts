import { ApiKey, ApiKeySchema, ApiKeyDocument, RateLimit } from '@auth/schemas/apikey.schema';
import { Permission } from '@auth/enums/user-role.enum';
import { OperationStatus } from '@common/types/enums/shared-base.enum';
import { Schema } from 'mongoose';

describe('ApiKey Schema', () => {
  let apiKeyModel: Schema<ApiKeyDocument>;

  beforeEach(() => {
    apiKeyModel = ApiKeySchema;
  });

  it('应该成功创建ApiKey模型', () => {
    // Assert
    expect(apiKeyModel).toBeDefined();
  });

  it('应该正确定义ApiKey类的属性', () => {
    // Arrange
    const apiKey = new ApiKey();
    
    // Assert
    expect(apiKey).toHaveProperty('appKey');
    expect(apiKey).toHaveProperty('accessToken');
    expect(apiKey).toHaveProperty('name');
    expect(apiKey).toHaveProperty('userId');
    expect(apiKey).toHaveProperty('permissions');
    expect(apiKey).toHaveProperty('rateLimit');
    expect(apiKey).toHaveProperty('status');
    expect(apiKey).toHaveProperty('expiresAt');
    expect(apiKey).toHaveProperty('totalRequestCount');
    expect(apiKey).toHaveProperty('lastAccessedAt');
    expect(apiKey).toHaveProperty('description');
  });

  it('应该正确定义RateLimit类的属性', () => {
    // Arrange
    const rateLimit = new RateLimit();
    
    // Assert
    expect(rateLimit).toHaveProperty('requestLimit');
    expect(rateLimit).toHaveProperty('window');
  });

  it('应该正确定义ApiKeySchema的属性和类型', () => {
    // Arrange
    const schemaPaths = apiKeyModel.paths;
    
    // Assert
    expect(schemaPaths.appKey).toBeDefined();
    expect(schemaPaths.appKey.options.required).toBe(true);
    expect(schemaPaths.appKey.options.unique).toBe(true);
    
    expect(schemaPaths.accessToken).toBeDefined();
    expect(schemaPaths.accessToken.options.required).toBe(true);
    expect(schemaPaths.accessToken.options.unique).toBe(true);
    
    expect(schemaPaths.name).toBeDefined();
    expect(schemaPaths.name.options.required).toBe(true);
    expect(schemaPaths.name.options.trim).toBe(true);
    expect(schemaPaths.name.options.maxlength).toBe(100);
    
    expect(schemaPaths.userId).toBeDefined();
    // 修改期望值，验证userId字段引用了User集合，而不是检查具体的内部结构
    expect(schemaPaths.userId.options.ref).toBe('User');
    
    expect(schemaPaths.permissions).toBeDefined();
    expect(schemaPaths.permissions.options.type[0].enum).toEqual(Object.values(Permission));
    expect(schemaPaths.permissions.options.default).toEqual([
      Permission.DATA_READ,
      Permission.QUERY_EXECUTE,
      Permission.PROVIDERS_READ,
    ]);
    
    expect(schemaPaths.rateLimit).toBeDefined();
    expect(schemaPaths.rateLimit.options.required).toBe(true);
    expect(schemaPaths.rateLimit.options.type).toBeDefined();
    
    expect(schemaPaths.status).toBeDefined();
    expect(schemaPaths.status.options.enum).toEqual(Object.values(OperationStatus));
    expect(schemaPaths.status.options.default).toBe(OperationStatus.ACTIVE);
    
    expect(schemaPaths.expiresAt).toBeDefined();
    expect(schemaPaths.expiresAt.options.index).toBe(true);
    
    expect(schemaPaths.totalRequestCount).toBeDefined();
    expect(schemaPaths.totalRequestCount.options.default).toBe(0);
    
    expect(schemaPaths.description).toBeDefined();
    expect(schemaPaths.description.options.trim).toBe(true);
    expect(schemaPaths.description.options.maxlength).toBe(500);
  });

  it('应该正确创建索引', () => {
    // Arrange
    const indexes = apiKeyModel.indexes();
    
    // Assert
    // appKey和accessToken的唯一索引由@Prop装饰器自动创建
    expect(indexes.some(index => index[0].appKey === 1)).toBe(true);
    expect(indexes.some(index => index[0].accessToken === 1)).toBe(true);

    // userId索引
    expect(indexes.some(index => index[0].userId === 1)).toBe(true);

    // status索引
    expect(indexes.some(index => index[0].status === 1)).toBe(true);

    // createdAt索引（由timestamps自动创建）
    expect(indexes.some(index => index[0].createdAt === 1)).toBe(true);

    // 组合索引用于验证
    expect(indexes.some(index => index[0].appKey === 1 && index[0].accessToken === 1)).toBe(true);
  });

  it('应该正确实现toJSON方法', () => {
    // Arrange
    const apiKeyData = {
      _id: 'apikey123',
      __v: 1,
      appKey: 'app-key',
      accessToken: 'access-token',
      name: 'Test API Key',
      userId: 'user123',
      permissions: [Permission.DATA_READ],
      rateLimit: {
        requestLimit: 1000,
        window: '1h',
      },
      status: OperationStatus.ACTIVE,
      expiresAt: new Date(),
      totalRequestCount: 0,
      lastAccessedAt: new Date(),
      description: 'Test API Key Description',
    };
    
    // 创建一个模拟的文档对象
    const apiKeyDoc = {
      toObject: jest.fn().mockReturnValue(apiKeyData),
    };
    
    // Act
    const result = apiKeyModel.methods.toJSON.call(apiKeyDoc);
    
    // Assert
    expect(result).toEqual({
      id: 'apikey123',
      appKey: 'app-key',
      accessToken: 'access-token',
      name: 'Test API Key',
      userId: 'user123',
      permissions: [Permission.DATA_READ],
      rateLimit: {
        requestLimit: 1000,
        window: '1h',
      },
      status: OperationStatus.ACTIVE,
      expiresAt: apiKeyData.expiresAt,
      totalRequestCount: 0,
      lastAccessedAt: apiKeyData.lastAccessedAt,
      description: 'Test API Key Description',
    });
    expect(result).not.toHaveProperty('_id');
    expect(result).not.toHaveProperty('__v');
  });
});