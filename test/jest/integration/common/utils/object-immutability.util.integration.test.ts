import { Test, TestingModule } from '@nestjs/testing';
import { ObjectImmutabilityUtil } from '../../../src/common/utils/object-immutability.util';

describe('ObjectImmutabilityUtil Integration', () => {
  let objectImmutabilityUtil: ObjectImmutabilityUtil;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ObjectImmutabilityUtil],
    }).compile();

    objectImmutabilityUtil = module.get<ObjectImmutabilityUtil>(ObjectImmutabilityUtil);
  });

  it('should be defined', () => {
    expect(objectImmutabilityUtil).toBeDefined();
  });
});
