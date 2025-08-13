import { Test, TestingModule } from '@nestjs/testing';
import { ProviderDecorator } from '../../../src/providers/decorators/provider.decorator';

describe('ProviderDecorator Security', () => {
  let providerDecorator: ProviderDecorator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProviderDecorator],
    }).compile();

    providerDecorator = module.get<ProviderDecorator>(ProviderDecorator);
  });

  it('should be defined', () => {
    expect(providerDecorator).toBeDefined();
  });
});
