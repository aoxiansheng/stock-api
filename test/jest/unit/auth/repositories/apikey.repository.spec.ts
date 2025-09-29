
import { Model, Types } from 'mongoose';
import { ApiKeyRepository } from '@auth/repositories/apikey.repository';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import { ApiKey, ApiKeyDocument, ApiKeySchema } from '@auth/schemas/apikey.schema';
import { Permission } from '@auth/enums/user-role.enum';
import { OperationStatus } from '@common/types/enums/shared-base.enum';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { UnitTestSetup } from '@test/testbasic/setup/unit-test-setup';
import { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

describe('ApiKeyRepository', () => {
  let repository: ApiKeyRepository;
  let apiKeyModel: Model<ApiKeyDocument>;
  let paginationService: PaginationService;
  let testContext: TestingModule;

  beforeAll(async () => {
    testContext = await UnitTestSetup.createBasicTestModule({
      imports: [
        MongooseModule.forRootAsync({
          useFactory: async (configService: ConfigService) => ({
            uri: configService.get<string>('MONGODB_URI'),
          }),
          inject: [ConfigService],
        }),
        MongooseModule.forFeature([{ name: ApiKey.name, schema: ApiKeySchema }]),
      ],
      providers: [
        ApiKeyRepository,
        PaginationService,
      ],
    });

    await testContext.init();

    repository = await UnitTestSetup.validateServiceInjection<ApiKeyRepository>(
      testContext,
      ApiKeyRepository,
      ApiKeyRepository
    );
    apiKeyModel = UnitTestSetup.getService<Model<ApiKeyDocument>>(
      testContext,
      getModelToken(ApiKey.name)
    );
    paginationService = await UnitTestSetup.validateServiceInjection<PaginationService>(
      testContext,
      PaginationService,
      PaginationService
    );
  });

  afterAll(async () => {
    await UnitTestSetup.cleanupModule(testContext);
  });

  beforeEach(async () => {
    // 清理测试数据
    if (apiKeyModel) {
      await apiKeyModel.deleteMany({});
    }
  });

  describe('create', () => {
    it('should create a new API Key successfully', async () => {
      const testUserId = new Types.ObjectId();
      const apiKeyData: Partial<ApiKey> = {
        userId: testUserId,
        appKey: `app-key-${Date.now()}`,
        accessToken: `access-token-${Date.now()}`,
        name: 'Test API Key',
        permissions: [Permission.DATA_READ],
        status: OperationStatus.ACTIVE,
        rateLimit: {
          requestLimit: 1000,
          window: '1h',
        },
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      };

      const result = await repository.create(apiKeyData);

      expect(result).toBeDefined();
      expect(result.appKey).toBe(apiKeyData.appKey);
      expect(result.accessToken).toBe(apiKeyData.accessToken);
      expect(result.name).toBe(apiKeyData.name);
      expect(result.userId.toString()).toBe(testUserId.toString());
      expect(result.permissions).toEqual([Permission.DATA_READ]);
      expect(result.status).toBe(OperationStatus.ACTIVE);

      // 验证数据库中确实创建了记录
      const foundInDb = await apiKeyModel.findById(result.id);
      expect(foundInDb).toBeDefined();
      expect(foundInDb.appKey).toBe(apiKeyData.appKey);
    });

    it('should create an API Key without a userId', async () => {
      const apiKeyData: Partial<ApiKey> = {
        appKey: `app-key-no-user-${Date.now()}`,
        accessToken: `access-token-no-user-${Date.now()}`,
        name: 'Test API Key No User',
        permissions: [Permission.DATA_READ],
        status: OperationStatus.ACTIVE,
        rateLimit: {
          requestLimit: 1000,
          window: '1h',
        },
      };

      const result = await repository.create(apiKeyData);

      expect(result).toBeDefined();
      expect(result.appKey).toBe(apiKeyData.appKey);
      expect(result.userId).toBeUndefined();

      // 验证数据库中确实创建了记录
      const foundInDb = await apiKeyModel.findById(result.id);
      expect(foundInDb).toBeDefined();
      expect(foundInDb.userId).toBeUndefined();
    });

    it('should throw an error for an invalid userId format', async () => {
      const apiKeyData = {
        userId: 'invalid-id',
        appKey: `app-key-invalid-${Date.now()}`,
        accessToken: `access-token-invalid-${Date.now()}`,
      };

      await expect(repository.create(apiKeyData as any)).rejects.toThrow('无效的用户ID格式');
    });

    it('should create API Key with default values', async () => {
      const apiKeyData: Partial<ApiKey> = {
        appKey: `app-key-defaults-${Date.now()}`,
        accessToken: `access-token-defaults-${Date.now()}`,
        name: 'Test Default Values',
        rateLimit: {
          requestLimit: 1000,
          window: '1h',
        },
      };

      const result = await repository.create(apiKeyData);

      expect(result).toBeDefined();
      expect(result.permissions).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.totalRequestCount).toBe(0);
      expect((result as any).createdAt).toBeDefined();
      expect((result as any).updatedAt).toBeDefined();
    });
  });

  describe('findById', () => {
    let createdApiKey: ApiKeyDocument;

    beforeEach(async () => {
      // 创建测试数据
      const testData = {
        appKey: `test-app-key-${Date.now()}`,
        accessToken: `test-access-token-${Date.now()}`,
        name: 'Test API Key for findById',
        permissions: [Permission.DATA_READ],
        status: OperationStatus.ACTIVE,
        rateLimit: {
          requestLimit: 1000,
          window: '1h',
        },
      };

      createdApiKey = await repository.create(testData);
    });

    it('should find an API Key by ID successfully', async () => {
      const result = await repository.findById(createdApiKey.id);

      expect(result).toBeDefined();
      expect(result.id.toString()).toBe(createdApiKey.id.toString());
      expect(result.appKey).toBe(createdApiKey.appKey);
      expect(result.accessToken).toBe(createdApiKey.accessToken);
      expect(result.name).toBe(createdApiKey.name);
    });

    it('should return null if API Key is not found', async () => {
      const nonExistentId = new Types.ObjectId().toString();
      const result = await repository.findById(nonExistentId);
      expect(result).toBeNull();
    });

    it('should throw an error for an invalid ID format', async () => {
      await expect(repository.findById('invalid-id')).rejects.toThrow('无效的API Key ID格式');
    });

    it('should throw an error for empty ID', async () => {
      await expect(repository.findById('')).rejects.toThrow('无效的API Key ID格式');
    });

    it('should throw an error for null ID', async () => {
      await expect(repository.findById(null as any)).rejects.toThrow('无效的API Key ID格式');
    });
  });

  describe('findByAppKey', () => {
    let testApiKey: ApiKeyDocument;

    beforeEach(async () => {
      testApiKey = await repository.create({
        appKey: `unique-app-key-${Date.now()}`,
        accessToken: `unique-access-token-${Date.now()}`,
        name: 'Test findByAppKey',
        permissions: [Permission.DATA_READ],
        status: OperationStatus.ACTIVE,
        rateLimit: {
          requestLimit: 1000,
          window: '1h',
        },
      });
    });

    it('should find API key by app key', async () => {
      const result = await repository.findByAppKey(testApiKey.appKey);

      expect(result).toBeDefined();
      expect(result.appKey).toBe(testApiKey.appKey);
      expect(result.id.toString()).toBe(testApiKey.id.toString());
    });

    it('should return null for non-existent app key', async () => {
      const result = await repository.findByAppKey('non-existent-app-key');
      expect(result).toBeNull();
    });
  });

  describe('findByAccessToken', () => {
    let testApiKey: ApiKeyDocument;

    beforeEach(async () => {
      testApiKey = await repository.create({
        appKey: `app-key-token-test-${Date.now()}`,
        accessToken: `unique-access-token-${Date.now()}`,
        name: 'Test findByAccessToken',
        permissions: [Permission.DATA_READ],
        status: OperationStatus.ACTIVE,
        rateLimit: {
          requestLimit: 1000,
          window: '1h',
        },
      });
    });

    it('should find API key by access token', async () => {
      const result = await repository.findByAccessToken(testApiKey.accessToken);

      expect(result).toBeDefined();
      expect(result.accessToken).toBe(testApiKey.accessToken);
      expect(result.id.toString()).toBe(testApiKey.id.toString());
    });

    it('should return null for non-existent access token', async () => {
      const result = await repository.findByAccessToken('non-existent-access-token');
      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    let testApiKey: ApiKeyDocument;

    beforeEach(async () => {
      testApiKey = await repository.create({
        appKey: `app-key-status-test-${Date.now()}`,
        accessToken: `access-token-status-test-${Date.now()}`,
        name: 'Test updateStatus',
        status: OperationStatus.ACTIVE,
        rateLimit: {
          requestLimit: 1000,
          window: '1h',
        },
      });
    });

    it('should update API key status', async () => {
      const result = await repository.updateStatus(testApiKey.id.toString(), OperationStatus.DELETED);

      expect(result).toBeDefined();
      expect(result.status).toBe(OperationStatus.DELETED);

      // 验证数据库中的状态也被更新
      const updatedInDb = await apiKeyModel.findById(testApiKey.id);
      expect(updatedInDb.status).toBe(OperationStatus.DELETED);
    });

    it('should throw error for invalid ID', async () => {
      await expect(repository.updateStatus('invalid-id', OperationStatus.DELETED))
        .rejects.toThrow('无效的API Key ID格式');
    });
  });

  describe('softDelete', () => {
    let testApiKey: ApiKeyDocument;

    beforeEach(async () => {
      testApiKey = await repository.create({
        appKey: `app-key-soft-delete-${Date.now()}`,
        accessToken: `access-token-soft-delete-${Date.now()}`,
        name: 'Test softDelete',
        status: OperationStatus.ACTIVE,
        rateLimit: {
          requestLimit: 1000,
          window: '1h',
        },
      });
    });

    it('should soft delete API key', async () => {
      const result = await repository.softDelete(testApiKey.id.toString());

      expect(result).toBeDefined();

      // 验证记录仍然存在但状态已更新
      const deletedInDb = await apiKeyModel.findById(testApiKey.id);
      expect(deletedInDb).toBeDefined();
      expect(deletedInDb.status).toBe(OperationStatus.DELETED);
      expect((deletedInDb as any).deletedAt).toBeDefined();
    });
  });

  describe('hardDelete', () => {
    let testApiKey: ApiKeyDocument;

    beforeEach(async () => {
      testApiKey = await repository.create({
        appKey: `app-key-hard-delete-${Date.now()}`,
        accessToken: `access-token-hard-delete-${Date.now()}`,
        name: 'Test hardDelete',
        status: OperationStatus.DELETED, // 通常只有软删除的记录才能被硬删除
        rateLimit: {
          requestLimit: 1000,
          window: '1h',
        },
      });
    });

    it('should hard delete API key', async () => {
      const originalId = testApiKey.id.toString();
      const result = await repository.hardDelete(originalId);

      expect(result).toBeDefined();

      // 验证记录确实被从数据库中删除
      const deletedInDb = await apiKeyModel.findById(originalId);
      expect(deletedInDb).toBeNull();
    });

    it('should throw error for invalid ID', async () => {
      await expect(repository.hardDelete('invalid-id'))
        .rejects.toThrow('无效的API Key ID格式');
    });
  });
});
