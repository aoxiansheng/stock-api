import { Test, TestingModule } from '@nestjs/testing';
import { CapabilityRegistryService } from '../../../src/providers/services/capability-registry.service';

describe('CapabilityRegistryService Security', () => {
  let capabilityRegistryService: CapabilityRegistryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CapabilityRegistryService],
    }).compile();

    capabilityRegistryService = module.get<CapabilityRegistryService>(CapabilityRegistryService);
  });

  it('should be defined', () => {
    expect(capabilityRegistryService).toBeDefined();
  });
});
