import { Test, TestingModule } from '@nestjs/testing';
import { Main } from '../../../src/main';

describe('Main Integration', () => {
  let main: Main;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Main],
    }).compile();

    main = module.get<Main>(Main);
  });

  it('should be defined', () => {
    expect(main).toBeDefined();
  });
});
