import { Test, TestingModule } from '@nestjs/testing';
import { RedisUtil } from '../../../src/core/public/storage/utils/redis.util';

describe('RedisUtil Security', () => {
  let redisUtil: RedisUtil;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisUtil],
    }).compile();

    redisUtil = module.get<RedisUtil>(RedisUtil);
  });

  it('should be defined', () => {
    expect(redisUtil).toBeDefined();
  });
});
