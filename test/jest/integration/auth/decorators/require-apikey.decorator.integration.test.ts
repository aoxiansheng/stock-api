import { Test, TestingModule } from '@nestjs/testing';
import { RequireApikeyDecorator } from '../../../src/auth/decorators/require-apikey.decorator';

describe('RequireApikeyDecorator Integration', () => {
  let requireApikeyDecorator: RequireApikeyDecorator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequireApikeyDecorator],
    }).compile();

    requireApikeyDecorator = module.get<RequireApikeyDecorator>(RequireApikeyDecorator);
  });

  it('should be defined', () => {
    expect(requireApikeyDecorator).toBeDefined();
  });
});
