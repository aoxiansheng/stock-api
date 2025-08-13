import { Test, TestingModule } from '@nestjs/testing';
import { StringUtil } from '../../../src/core/public/shared/utils/string.util';

describe('StringUtil Integration', () => {
  let stringUtil: StringUtil;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StringUtil],
    }).compile();

    stringUtil = module.get<StringUtil>(StringUtil);
  });

  it('should be defined', () => {
    expect(stringUtil).toBeDefined();
  });
});
