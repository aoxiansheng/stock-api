import { Test, TestingModule } from '@nestjs/testing';
import { StreamUnsubscribeDto } from '../../../src/core/stream/stream-receiver/dto/stream-unsubscribe.dto';

describe('StreamUnsubscribeDto Security', () => {
  let streamUnsubscribeDto: StreamUnsubscribeDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamUnsubscribeDto],
    }).compile();

    streamUnsubscribeDto = module.get<StreamUnsubscribeDto>(StreamUnsubscribeDto);
  });

  it('should be defined', () => {
    expect(streamUnsubscribeDto).toBeDefined();
  });
});
