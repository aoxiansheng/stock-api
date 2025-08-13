import { Test, TestingModule } from '@nestjs/testing';
import { SystemPersistenceController } from '../../../src/core/public/data-mapper/controller/system-persistence.controller';

describe('SystemPersistenceController', () => {
  let systemPersistenceController: SystemPersistenceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SystemPersistenceController],
    }).compile();

    systemPersistenceController = module.get<SystemPersistenceController>(SystemPersistenceController);
  });

  it('should be defined', () => {
    expect(systemPersistenceController).toBeDefined();
  });
});
