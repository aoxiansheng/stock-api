import { Test, TestingModule } from '@nestjs/testing';
import { SharedServicesModule } from '../../../src/core/public/shared/module/shared-services.module';

describe('SharedServicesModule Security', () => {
  let sharedServicesModule: SharedServicesModule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SharedServicesModule],
    }).compile();

    sharedServicesModule = module.get<SharedServicesModule>(SharedServicesModule);
  });

  it('should be defined', () => {
    expect(sharedServicesModule).toBeDefined();
  });
});
