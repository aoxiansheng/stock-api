import { Test, TestingModule } from '@nestjs/testing';
import { ProvidersModule } from '../../../src/providers/module/providers.module';

describe('ProvidersModule Integration', () => {
  let providersModule: ProvidersModule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProvidersModule],
    }).compile();

    providersModule = module.get<ProvidersModule>(ProvidersModule);
  });

  it('should be defined', () => {
    expect(providersModule).toBeDefined();
  });
});
