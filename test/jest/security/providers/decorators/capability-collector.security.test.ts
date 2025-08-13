import { Test, TestingModule } from '@nestjs/testing';
import { CapabilityCollector } from '../../../src/providers/decorators/capability-collector';

describe('CapabilityCollector Security', () => {
  let capabilityCollector: CapabilityCollector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CapabilityCollector],
    }).compile();

    capabilityCollector = module.get<CapabilityCollector>(CapabilityCollector);
  });

  it('should be defined', () => {
    expect(capabilityCollector).toBeDefined();
  });
});
