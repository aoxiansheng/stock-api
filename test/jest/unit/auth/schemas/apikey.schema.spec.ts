import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { 
  ApiKey, 
  ApiKeyDocument, 
  ApiKeySchema,
  RateLimit
} from '../../../../../src/auth/schemas/apikey.schema';
import { Permission } from '../../../../../src/auth/enums/user-role.enum';

describe('ApiKey Schema', () => {
  let mongoServer: MongoMemoryServer;
  let apiKeyModel: Model<ApiKeyDocument>;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([{ name: ApiKey.name, schema: ApiKeySchema }])
      ],
    }).compile();

    apiKeyModel = moduleRef.get<Model<ApiKeyDocument>>(getModelToken(ApiKey.name));
  });

  afterAll(async () => {
    await moduleRef.close();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await apiKeyModel.deleteMany({});
  });

  it('应该成功创建API Key', async () => {
    const rateLimit: RateLimit = {
      requests: 1000,
      window: '1h'
    };

    const apiKeyData = {
      appKey: 'ak_test_123456789abcdef',
      accessToken: 'sk_test_secret_token_123',
      name: 'Test API Key',
      permissions: [Permission.DATA_READ, Permission.QUERY_EXECUTE],
      rateLimit,
      isActive: true,
      expiresAt: new Date('2024-12-31T23:59:59Z'),
      description: '测试用API密钥'
    };

    const apiKey = new apiKeyModel(apiKeyData);
    const savedApiKey = await apiKey.save();

    expect(savedApiKey.appKey).toBe(apiKeyData.appKey);
    expect(savedApiKey.accessToken).toBe(apiKeyData.accessToken);
    expect(savedApiKey.name).toBe(apiKeyData.name);
    expect(savedApiKey.permissions).toEqual(apiKeyData.permissions);
    expect(savedApiKey.rateLimit.requests).toBe(rateLimit.requests);
    expect(savedApiKey.rateLimit.window).toBe(rateLimit.window);
    expect(savedApiKey.isActive).toBe(true);
    expect(savedApiKey.expiresAt).toEqual(apiKeyData.expiresAt);
    expect(savedApiKey.usageCount).toBe(0); // 默认值
    expect(savedApiKey.description).toBe(apiKeyData.description);
    expect(savedApiKey.createdAt).toBeDefined();
    expect(savedApiKey.updatedAt).toBeDefined();
  });

  it('应该正确应用默认值', async () => {
    const minimalApiKeyData = {
      appKey: 'ak_minimal_123',
      accessToken: 'sk_minimal_456',
      name: 'Minimal Key',
      rateLimit: {
        requests: 500,
        window: '1d'
      }
    };

    const apiKey = new apiKeyModel(minimalApiKeyData);
    const savedApiKey = await apiKey.save();

    expect(savedApiKey.permissions).toEqual([
      Permission.DATA_READ,
      Permission.QUERY_EXECUTE,
      Permission.PROVIDERS_READ
    ]); // 默认权限
    expect(savedApiKey.isActive).toBe(true); // 默认值
    expect(savedApiKey.usageCount).toBe(0); // 默认值
    expect(savedApiKey.createdAt).toBeDefined();
    expect(savedApiKey.updatedAt).toBeDefined();
  });

  it('应该正确序列化对象（toJSON方法）', async () => {
    const apiKeyData = {
      appKey: 'ak_json_test_123',
      accessToken: 'sk_json_test_456',
      name: 'JSON Test Key',
      rateLimit: {
        requests: 2000,
        window: '1h'
      },
      permissions: [Permission.DATA_READ]
    };

    const apiKey = new apiKeyModel(apiKeyData);
    const savedApiKey = await apiKey.save();
    const jsonApiKey = savedApiKey.toJSON();

    expect(jsonApiKey.id).toBeDefined();
    expect(jsonApiKey._id).toBeUndefined(); // 被移除
    expect(jsonApiKey.__v).toBeUndefined(); // 被移除
    expect(jsonApiKey.appKey).toBe(apiKeyData.appKey);
    expect(jsonApiKey.accessToken).toBe(apiKeyData.accessToken);
    expect(jsonApiKey.name).toBe(apiKeyData.name);
  });

  it('应该验证必填字段', async () => {
    const incompleteApiKey = new apiKeyModel({});

    try {
      await incompleteApiKey.validate();
      fail('应该抛出验证错误');
    } catch (error) {
      expect(error.errors.appKey).toBeDefined();
      expect(error.errors.accessToken).toBeDefined();
      expect(error.errors.name).toBeDefined();
      expect(error.errors.rateLimit).toBeDefined();
    }
  });

  it('应该验证RateLimit的必填字段', async () => {
    const apiKeyWithIncompleteRateLimit = new apiKeyModel({
      appKey: 'ak_incomplete_rate_limit',
      accessToken: 'sk_incomplete_rate_limit',
      name: 'Incomplete Rate Limit Key',
      rateLimit: {
        // 缺少必填字段
      }
    });

    try {
      await apiKeyWithIncompleteRateLimit.validate();
      fail('应该抛出RateLimit验证错误');
    } catch (error) {
      expect(error.errors['rateLimit.requests']).toBeDefined();
      expect(error.errors['rateLimit.window']).toBeDefined();
    }
  });

  it('应该验证RateLimit的requests最小值', async () => {
    const apiKeyWithInvalidRateLimit = new apiKeyModel({
      appKey: 'ak_invalid_rate_limit',
      accessToken: 'sk_invalid_rate_limit',
      name: 'Invalid Rate Limit Key',
      rateLimit: {
        requests: 0, // 小于最小值1
        window: '1h'
      }
    });

    try {
      await apiKeyWithInvalidRateLimit.validate();
      fail('应该抛出RateLimit.requests验证错误');
    } catch (error) {
      expect(error.errors['rateLimit.requests']).toBeDefined();
    }
  });

  it('应该支持所有权限枚举值', async () => {
    const permissions = Object.values(Permission);
    
    const apiKeyData = {
      appKey: 'ak_all_permissions_test',
      accessToken: 'sk_all_permissions_test',
      name: 'All Permissions Key',
      permissions: permissions,
      rateLimit: {
        requests: 5000,
        window: '1d'
      }
    };

    const apiKey = new apiKeyModel(apiKeyData);
    const savedApiKey = await apiKey.save();
    
    expect(savedApiKey.permissions).toEqual(permissions);
    expect(savedApiKey.permissions).toContain(Permission.DATA_READ);
    expect(savedApiKey.permissions).toContain(Permission.QUERY_EXECUTE);
    expect(savedApiKey.permissions).toContain(Permission.PROVIDERS_READ);
  });

  it('应该支持不同的速率限制窗口', async () => {
    const windowTypes = ['1m', '5m', '15m', '1h', '6h', '12h', '1d', '7d'];
    
    for (let i = 0; i < windowTypes.length; i++) {
      const window = windowTypes[i];
      const apiKeyData = {
        appKey: `ak_window_${window}_${i}`,
        accessToken: `sk_window_${window}_${i}`,
        name: `${window} Window Key`,
        rateLimit: {
          requests: 1000 * (i + 1),
          window: window
        }
      };

      const apiKey = new apiKeyModel(apiKeyData);
      const savedApiKey = await apiKey.save();
      
      expect(savedApiKey.rateLimit.window).toBe(window);
      expect(savedApiKey.rateLimit.requests).toBe(1000 * (i + 1));
    }
  });

  it('应该支持完整的API Key生命周期', async () => {
    const creationTime = new Date('2024-01-01T10:00:00Z');
    const expirationTime = new Date('2024-12-31T23:59:59Z');
    const lastUsedTime = new Date('2024-06-15T14:30:00Z');

    const apiKeyData = {
      appKey: 'ak_lifecycle_test_12345',
      accessToken: 'sk_lifecycle_test_67890',
      name: 'Lifecycle Test Key',
      permissions: [Permission.DATA_READ, Permission.QUERY_EXECUTE, Permission.PROVIDERS_READ],
      rateLimit: {
        requests: 10000,
        window: '1d'
      },
      isActive: true,
      expiresAt: expirationTime,
      usageCount: 5000,
      lastUsedAt: lastUsedTime,
      description: '完整生命周期测试的API密钥，包含所有可能的字段和状态',
      createdAt: creationTime,
      updatedAt: creationTime
    };

    const apiKey = new apiKeyModel(apiKeyData);
    const savedApiKey = await apiKey.save();

    expect(savedApiKey.appKey).toBe(apiKeyData.appKey);
    expect(savedApiKey.accessToken).toBe(apiKeyData.accessToken);
    expect(savedApiKey.name).toBe(apiKeyData.name);
    expect(savedApiKey.permissions).toEqual(apiKeyData.permissions);
    expect(savedApiKey.rateLimit.requests).toBe(apiKeyData.rateLimit.requests);
    expect(savedApiKey.rateLimit.window).toBe(apiKeyData.rateLimit.window);
    expect(savedApiKey.isActive).toBe(apiKeyData.isActive);
    expect(savedApiKey.expiresAt).toEqual(apiKeyData.expiresAt);
    expect(savedApiKey.usageCount).toBe(apiKeyData.usageCount);
    expect(savedApiKey.lastUsedAt).toEqual(apiKeyData.lastUsedAt);
    expect(savedApiKey.description).toBe(apiKeyData.description);

    // 更新使用统计
    savedApiKey.usageCount += 1;
    savedApiKey.lastUsedAt = new Date();
    const updatedApiKey = await savedApiKey.save();

    expect(updatedApiKey.usageCount).toBe(5001);
    expect(updatedApiKey.lastUsedAt?.getTime()).toBeGreaterThan(lastUsedTime.getTime());
  });

  it('应该创建索引', async () => {
    // 先创建一些数据以确保索引被建立
    const apiKey = new apiKeyModel({
      appKey: 'ak_index_test_123',
      accessToken: 'sk_index_test_456',
      name: 'Index Test Key',
      rateLimit: {
        requests: 1000,
        window: '1h'
      }
    });
    await apiKey.save();

    const indexes = await apiKeyModel.collection.indexes();
    
    // 查找appKey的唯一索引
    const appKeyIndex = indexes.find(index => 
      index.key && Object.keys(index.key).includes('appKey') && index.unique);
    expect(appKeyIndex).toBeDefined();
    
    // 查找accessToken的唯一索引
    const accessTokenIndex = indexes.find(index => 
      index.key && Object.keys(index.key).includes('accessToken') && index.unique);
    expect(accessTokenIndex).toBeDefined();
    
    // 查找userId索引
    const userIdIndex = indexes.find(index => 
      index.key && Object.keys(index.key).includes('userId'));
    expect(userIdIndex).toBeDefined();
    
    // 查找isActive索引
    const isActiveIndex = indexes.find(index => 
      index.key && Object.keys(index.key).includes('isActive'));
    expect(isActiveIndex).toBeDefined();
    
    // 查找createdAt索引
    const createdAtIndex = indexes.find(index => 
      index.key && Object.keys(index.key).includes('createdAt'));
    expect(createdAtIndex).toBeDefined();
    
    // 查找expiresAt索引
    const expiresAtIndex = indexes.find(index => 
      index.key && Object.keys(index.key).includes('expiresAt'));
    expect(expiresAtIndex).toBeDefined();
    
    // 查找复合索引 (appKey, accessToken)
    const compoundIndex = indexes.find(index => 
      index.key && 
      Object.keys(index.key).includes('appKey') && 
      Object.keys(index.key).includes('accessToken') &&
      !index.unique); // 复合索引不是唯一的
    expect(compoundIndex).toBeDefined();
  });

  it('应该验证appKey的唯一性', async () => {
    const duplicateAppKey = 'ak_duplicate_test_123';
    
    const firstApiKey = new apiKeyModel({
      appKey: duplicateAppKey,
      accessToken: 'sk_first_unique_token',
      name: 'First API Key',
      rateLimit: {
        requests: 1000,
        window: '1h'
      }
    });
    await firstApiKey.save();

    // 尝试创建具有相同appKey的API Key
    const duplicateApiKey = new apiKeyModel({
      appKey: duplicateAppKey, // 重复的appKey
      accessToken: 'sk_second_unique_token',
      name: 'Second API Key',
      rateLimit: {
        requests: 2000,
        window: '1d'
      }
    });

    try {
      await duplicateApiKey.save();
      fail('应该抛出appKey唯一性验证错误');
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.code).toBe(11000); // MongoDB 唯一性约束错误代码
    }
  });

  it('应该验证accessToken的唯一性', async () => {
    const duplicateAccessToken = 'sk_duplicate_token_123';
    
    const firstApiKey = new apiKeyModel({
      appKey: 'ak_first_unique_key',
      accessToken: duplicateAccessToken,
      name: 'First API Key',
      rateLimit: {
        requests: 1000,
        window: '1h'
      }
    });
    await firstApiKey.save();

    // 尝试创建具有相同accessToken的API Key
    const duplicateApiKey = new apiKeyModel({
      appKey: 'ak_second_unique_key',
      accessToken: duplicateAccessToken, // 重复的accessToken
      name: 'Second API Key',
      rateLimit: {
        requests: 2000,
        window: '1d'
      }
    });

    try {
      await duplicateApiKey.save();
      fail('应该抛出accessToken唯一性验证错误');
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.code).toBe(11000); // MongoDB 唯一性约束错误代码
    }
  });

  it('应该验证name的最大长度', async () => {
    const longName = 'A'.repeat(101); // 超过最大长度100

    const apiKeyWithLongName = new apiKeyModel({
      appKey: 'ak_long_name_test',
      accessToken: 'sk_long_name_test',
      name: longName,
      rateLimit: {
        requests: 1000,
        window: '1h'
      }
    });

    try {
      await apiKeyWithLongName.validate();
      fail('应该抛出name长度验证错误');
    } catch (error) {
      expect(error.errors.name).toBeDefined();
    }
  });

  it('应该验证description的最大长度', async () => {
    const longDescription = 'D'.repeat(501); // 超过最大长度500

    const apiKeyWithLongDescription = new apiKeyModel({
      appKey: 'ak_long_desc_test',
      accessToken: 'sk_long_desc_test',
      name: 'Long Description Test',
      description: longDescription,
      rateLimit: {
        requests: 1000,
        window: '1h'
      }
    });

    try {
      await apiKeyWithLongDescription.validate();
      fail('应该抛出description长度验证错误');
    } catch (error) {
      expect(error.errors.description).toBeDefined();
    }
  });

  it('应该支持权限的动态更新', async () => {
    const apiKeyData = {
      appKey: 'ak_permission_update_test',
      accessToken: 'sk_permission_update_test',
      name: 'Permission Update Test',
      permissions: [Permission.DATA_READ],
      rateLimit: {
        requests: 1000,
        window: '1h'
      }
    };

    const apiKey = new apiKeyModel(apiKeyData);
    const savedApiKey = await apiKey.save();

    // 更新权限
    savedApiKey.permissions = [
      Permission.DATA_READ,
      Permission.QUERY_EXECUTE,
      Permission.PROVIDERS_READ
    ];

    const updatedApiKey = await savedApiKey.save();

    expect(updatedApiKey.permissions).toHaveLength(3);
    expect(updatedApiKey.permissions).toContain(Permission.DATA_READ);
    expect(updatedApiKey.permissions).toContain(Permission.QUERY_EXECUTE);
    expect(updatedApiKey.permissions).toContain(Permission.PROVIDERS_READ);
  });
});