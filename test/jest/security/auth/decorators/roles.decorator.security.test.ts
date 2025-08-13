import { Test, TestingModule } from '@nestjs/testing';
import { RolesDecorator } from '../../../src/auth/decorators/roles.decorator';

describe('RolesDecorator Security', () => {
  let rolesDecorator: RolesDecorator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesDecorator],
    }).compile();

    rolesDecorator = module.get<RolesDecorator>(RolesDecorator);
  });

  it('should be defined', () => {
    expect(rolesDecorator).toBeDefined();
  });
});
