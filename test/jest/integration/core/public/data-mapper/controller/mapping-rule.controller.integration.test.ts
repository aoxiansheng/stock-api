import { Test, TestingModule } from '@nestjs/testing';
import { MappingRuleController } from '../../../src/core/public/data-mapper/controller/mapping-rule.controller';

describe('MappingRuleController Integration', () => {
  let mappingRuleController: MappingRuleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MappingRuleController],
    }).compile();

    mappingRuleController = module.get<MappingRuleController>(MappingRuleController);
  });

  it('should be defined', () => {
    expect(mappingRuleController).toBeDefined();
  });
});
