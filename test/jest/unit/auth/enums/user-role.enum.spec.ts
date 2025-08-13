import { Test, TestingModule } from '@nestjs/testing';
import { UserRoleEnum } from '../../../src/auth/enums/user-role.enum';

describe('UserRoleEnum', () => {
  let userRoleEnum: UserRoleEnum;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserRoleEnum],
    }).compile();

    userRoleEnum = module.get<UserRoleEnum>(UserRoleEnum);
  });

  it('should be defined', () => {
    expect(userRoleEnum).toBeDefined();
  });
});
