import { Test, TestingModule } from '@nestjs/testing';
import { CapabilityInterface } from '../../../src/providers/interfaces/capability.interface';

describe('CapabilityInterface', () => {
  let capabilityInterface: CapabilityInterface;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CapabilityInterface],
    }).compile();

    capabilityInterface = module.get<CapabilityInterface>(CapabilityInterface);
  });

  it('should be defined', () => {
    expect(capabilityInterface).toBeDefined();
  });
});
