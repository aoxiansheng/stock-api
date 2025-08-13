import { Test, TestingModule } from '@nestjs/testing';
import { FormatUtil } from '../../../src/metrics/utils/format.util';

describe('FormatUtil Security', () => {
  let formatUtil: FormatUtil;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FormatUtil],
    }).compile();

    formatUtil = module.get<FormatUtil>(FormatUtil);
  });

  it('should be defined', () => {
    expect(formatUtil).toBeDefined();
  });
});
