import { Test, TestingModule } from '@nestjs/testing';
import { StreamSubscribeDto } from '../../../src/core/stream/stream-receiver/dto/stream-subscribe.dto';

describe('StreamSubscribeDto Security', () => {
  let streamSubscribeDto: StreamSubscribeDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamSubscribeDto],
    }).compile();

    streamSubscribeDto = module.get<StreamSubscribeDto>(StreamSubscribeDto);
  });

  it('should be defined', () => {
    expect(streamSubscribeDto).toBeDefined();
  });
});
