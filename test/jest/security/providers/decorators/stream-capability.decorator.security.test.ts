import { Test, TestingModule } from '@nestjs/testing';
import { StreamCapabilityDecorator } from '../../../src/providers/decorators/stream-capability.decorator';

describe('StreamCapabilityDecorator Security', () => {
  let streamCapabilityDecorator: StreamCapabilityDecorator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamCapabilityDecorator],
    }).compile();

    streamCapabilityDecorator = module.get<StreamCapabilityDecorator>(StreamCapabilityDecorator);
  });

  it('should be defined', () => {
    expect(streamCapabilityDecorator).toBeDefined();
  });
});
