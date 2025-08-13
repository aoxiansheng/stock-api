import { Test, TestingModule } from '@nestjs/testing';
import { ProvidersController } from '../../../src/providers/controller/providers-controller';

describe('ProvidersController Security', () => {
  let providersController: ProvidersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProvidersController],
    }).compile();

    providersController = module.get<ProvidersController>(ProvidersController);
  });

  it('should be defined', () => {
    expect(providersController).toBeDefined();
  });
});
