import { Test, TestingModule } from '@nestjs/testing';
import { ReceiverInternalDto } from '../../../src/core/restapi/receiver/dto/receiver-internal.dto';

describe('ReceiverInternalDto Integration', () => {
  let receiverInternalDto: ReceiverInternalDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReceiverInternalDto],
    }).compile();

    receiverInternalDto = module.get<ReceiverInternalDto>(ReceiverInternalDto);
  });

  it('should be defined', () => {
    expect(receiverInternalDto).toBeDefined();
  });
});
