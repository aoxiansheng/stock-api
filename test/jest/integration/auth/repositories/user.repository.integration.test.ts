import { Test, TestingModule } from '@nestjs/testing';
import { UserRepository } from '../../../src/auth/repositories/user.repository';

describe('UserRepository Integration', () => {
  let userRepository: UserRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserRepository],
    }).compile();

    userRepository = module.get<UserRepository>(UserRepository);
  });

  it('should be defined', () => {
    expect(userRepository).toBeDefined();
  });
});
