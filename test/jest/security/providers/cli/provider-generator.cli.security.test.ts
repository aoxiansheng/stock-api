import { Test, TestingModule } from '@nestjs/testing';
import { ProviderGeneratorCli } from '../../../src/providers/cli/provider-generator.cli';

describe('ProviderGeneratorCli Security', () => {
  let providerGeneratorCli: ProviderGeneratorCli;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProviderGeneratorCli],
    }).compile();

    providerGeneratorCli = module.get<ProviderGeneratorCli>(ProviderGeneratorCli);
  });

  it('should be defined', () => {
    expect(providerGeneratorCli).toBeDefined();
  });
});
