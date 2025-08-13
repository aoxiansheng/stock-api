import { Test, TestingModule } from '@nestjs/testing';
import { SmartCacheRequestDto } from '../../../src/core/public/storage/dto/smart-cache-request.dto';

describe('SmartCacheRequestDto Security', () => {
  let smartCacheRequestDto: SmartCacheRequestDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SmartCacheRequestDto],
    }).compile();

    smartCacheRequestDto = module.get<SmartCacheRequestDto>(SmartCacheRequestDto);
  });

  it('should be defined', () => {
    expect(smartCacheRequestDto).toBeDefined();
  });
});
