import { Test, TestingModule } from '@nestjs/testing';
import { ObjectUtil } from '../../../src/core/public/shared/utils/object.util';

describe('ObjectUtil', () => {
  let objectUtil: ObjectUtil;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ObjectUtil],
    }).compile();

    objectUtil = module.get<ObjectUtil>(ObjectUtil);
  });

  it('should be defined', () => {
    expect(objectUtil).toBeDefined();
  });
});
