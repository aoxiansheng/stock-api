import { Test, TestingModule } from '@nestjs/testing';
import { PersistedTemplateService } from '../../../src/core/public/data-mapper/services/persisted-template.service';

describe('PersistedTemplateService Integration', () => {
  let persistedTemplateService: PersistedTemplateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PersistedTemplateService],
    }).compile();

    persistedTemplateService = module.get<PersistedTemplateService>(PersistedTemplateService);
  });

  it('should be defined', () => {
    expect(persistedTemplateService).toBeDefined();
  });
});
