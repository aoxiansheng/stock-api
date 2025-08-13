import { Test, TestingModule } from '@nestjs/testing';
import { UserSchema } from '../../../src/auth/schemas/user.schema';

describe('UserSchema Security', () => {
  let userSchema: UserSchema;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserSchema],
    }).compile();

    userSchema = module.get<UserSchema>(UserSchema);
  });

  it('should be defined', () => {
    expect(userSchema).toBeDefined();
  });
});
