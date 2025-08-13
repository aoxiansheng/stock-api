import { Test, TestingModule } from '@nestjs/testing';
import { ProviderScanConfig } from '../../../src/providers/config/provider-scan.config';

describe('ProviderScanConfig Integration', () => {
  let providerScanConfig: ProviderScanConfig;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProviderScanConfig],
    }).compile();

    providerScanConfig = module.get<ProviderScanConfig>(ProviderScanConfig);
  });

  it('should be defined', () => {
    expect(providerScanConfig).toBeDefined();
  });
});
