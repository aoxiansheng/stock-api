import { Test, TestingModule } from '@nestjs/testing';
import { CapabilityDecorator } from '../../../src/providers/decorators/capability.decorator';

describe('CapabilityDecorator Integration', () => {
  let capabilityDecorator: CapabilityDecorator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CapabilityDecorator],
    }).compile();

    capabilityDecorator = module.get<CapabilityDecorator>(CapabilityDecorator);
  });

  it('should be defined', () => {
    expect(capabilityDecorator).toBeDefined();
  });
});
