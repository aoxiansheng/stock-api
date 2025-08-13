import { Test, TestingModule } from '@nestjs/testing';
import { ProviderInterface } from '../../../src/providers/interfaces/provider.interface';

describe('ProviderInterface', () => {
  let providerInterface: ProviderInterface;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProviderInterface],
    }).compile();

    providerInterface = module.get<ProviderInterface>(ProviderInterface);
  });

  it('should be defined', () => {
    expect(providerInterface).toBeDefined();
  });
});
