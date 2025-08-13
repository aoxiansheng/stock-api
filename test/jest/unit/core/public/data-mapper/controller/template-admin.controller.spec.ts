import { Test, TestingModule } from '@nestjs/testing';
import { TemplateAdminController } from '../../../src/core/public/data-mapper/controller/template-admin.controller';

describe('TemplateAdminController', () => {
  let templateAdminController: TemplateAdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplateAdminController],
    }).compile();

    templateAdminController = module.get<TemplateAdminController>(TemplateAdminController);
  });

  it('should be defined', () => {
    expect(templateAdminController).toBeDefined();
  });
});
