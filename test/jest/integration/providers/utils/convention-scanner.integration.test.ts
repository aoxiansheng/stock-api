import { Test, TestingModule } from '@nestjs/testing';
import { ConventionScanner } from '../../../src/providers/utils/convention-scanner';

describe('ConventionScanner Integration', () => {
  let conventionScanner: ConventionScanner;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConventionScanner],
    }).compile();

    conventionScanner = module.get<ConventionScanner>(ConventionScanner);
  });

  it('should be defined', () => {
    expect(conventionScanner).toBeDefined();
  });
});
