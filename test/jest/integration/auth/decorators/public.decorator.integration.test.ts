import { Test, TestingModule } from '@nestjs/testing';
import { PublicDecorator } from '../../../src/auth/decorators/public.decorator';

describe('PublicDecorator Integration', () => {
  let publicDecorator: PublicDecorator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PublicDecorator],
    }).compile();

    publicDecorator = module.get<PublicDecorator>(PublicDecorator);
  });

  it('should be defined', () => {
    expect(publicDecorator).toBeDefined();
  });
});
