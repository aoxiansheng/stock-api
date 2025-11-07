import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '@cachev2/cache.service';
import { BusinessException, BusinessErrorCode } from '@common/core/exceptions/business.exception';
import { redisMockFactory, createFailingRedisMock } from '../../../../testbasic/mocks/redis.mock';

describe('cachev2/CacheService', () => {
  describe('happy path with redis mock', () => {
    let module: TestingModule;
    let service: CacheService;
    let redis: any;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        providers: [
          { provide: 'default_IORedisModuleConnectionToken', useFactory: redisMockFactory },
          CacheService,
        ],
      }).compile();

      service = module.get(CacheService);
      redis = module.get('default_IORedisModuleConnectionToken');
    });

    afterEach(async () => {
      await module.close();
      jest.clearAllMocks();
    });

    it('set/get roundtrip', async () => {
      const key = 'cachev2:test:1';
      const value = { foo: 'bar', n: 42 };
      await expect(service.set(key, value, { ttl: 60 })).resolves.toBe(true);
      await expect(service.get<typeof value>(key)).resolves.toEqual(value);
      expect(redis.setex).toHaveBeenCalledWith(key, 60, JSON.stringify(value));
      expect(redis.get).toHaveBeenCalledWith(key);
    });

    it('del removes key', async () => {
      const key = 'cachev2:test:del';
      await service.set(key, { a: 1 });
      const deleted = await service.del(key);
      expect(deleted).toBeGreaterThanOrEqual(1);
      await expect(service.get(key)).resolves.toBeNull();
    });

    it('incr and expire work', async () => {
      const key = 'cachev2:test:counter';
      await expect(service.incr(key)).resolves.toBe(1);
      await expect(service.expire(key, 120)).resolves.toBe(true);
      expect(redis.incr).toHaveBeenCalledWith(key);
      expect(redis.expire).toHaveBeenCalledWith(key, 120);
    });

    it('rejects payload larger than 1MB', async () => {
      const key = 'cachev2:test:large';
      const large = { text: 'a'.repeat(1024 * 1024) }; // ~1MB payload
      await expect(service.set(key, large)).rejects.toThrow(
        expect.objectContaining({
          errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED
        })
      );
    });
  });

  describe('connection failure handling', () => {
    let module: TestingModule;
    let service: CacheService;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        providers: [
          { provide: 'default_IORedisModuleConnectionToken', useFactory: createFailingRedisMock },
          CacheService,
        ],
      }).compile();
      service = module.get(CacheService);
    });

    afterEach(async () => {
      await module.close();
      jest.clearAllMocks();
    });

    it('wraps connection errors for get', async () => {
      await expect(service.get('any')).rejects.toThrow(
        expect.objectContaining({
          errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE
        })
      );
    });

    it('wraps connection errors for set', async () => {
      await expect(service.set('any', { a: 1 })).rejects.toThrow(
        expect.objectContaining({
          errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE
        })
      );
    });
  });
});

