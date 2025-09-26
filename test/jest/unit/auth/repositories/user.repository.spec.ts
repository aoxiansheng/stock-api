
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserRepository } from '@auth/repositories/user.repository';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import { User, UserDocument } from '@auth/schemas/user.schema';
import { OperationStatus } from '@common/types/enums/shared-base.enum';
import { UserRole } from '@auth/enums/user-role.enum';

describe('UserRepository', () => {
  let repository: UserRepository;
  let userModel: jest.Mocked<Model<UserDocument>>;
  let paginationService: jest.Mocked<PaginationService>;

  const mockUser: UserDocument = {
    id: '60f7e2c3e4b2b8001f9b3b3a',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashedpassword',
    role: UserRole.DEVELOPER,
    status: OperationStatus.ACTIVE,
    lastAccessedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(this),
    toJSON: jest.fn().mockReturnValue({
      id: '60f7e2c3e4b2b8001f9b3b3a',
      username: 'testuser',
      email: 'test@example.com',
      role: UserRole.DEVELOPER,
      status: OperationStatus.ACTIVE,
    }),
  } as unknown as UserDocument;

  beforeEach(async () => {
    const mockUserModel = {
      new: jest.fn().mockImplementation(dto => ({ ...dto, save: jest.fn().mockResolvedValue({ ...mockUser, ...dto }) })),
      constructor: jest.fn().mockResolvedValue(mockUser),
      save: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      aggregate: jest.fn(),
    };

    const mockPaginationService = {
      normalizePaginationQuery: jest.fn().mockImplementation((query) => ({ page: query.page || 1, limit: query.limit || 10 })),
      calculateSkip: jest.fn().mockImplementation((page, limit) => (page - 1) * limit),
      createPagination: jest.fn().mockImplementation((page, limit, total) => ({
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: PaginationService,
          useValue: mockPaginationService,
        },
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    userModel = module.get(getModelToken(User.name));
    paginationService = module.get(PaginationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const userDto = {
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        role: UserRole.DEVELOPER,
        status: OperationStatus.ACTIVE,
      };
      const result = await repository.create(userDto);
      expect(result).toBeDefined();
      expect(result.username).toEqual(userDto.username);
    });
  });

  describe('findById', () => {
    it('should find a user by ID successfully', async () => {
      const userId = '60f7e2c3e4b2b8001f9b3b3a';
      (userModel.findById as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(mockUser) });
      const result = await repository.findById(userId);
      expect(result).toEqual(mockUser);
      expect(userModel.findById).toHaveBeenCalledWith(userId);
    });

    it('should throw an error for an invalid ID format', async () => {
      await expect(repository.findById('invalid-id')).rejects.toThrow('用户ID格式无效');
    });
  });

  describe('findByUsernames', () => {
    it('should return an empty array if no users are found', async () => {
        (userModel.find as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
        const result = await repository.findByUsernames(['nonexistent']);
        expect(result).toEqual([]);
    });
  });

  describe('findAllPaginated', () => {
    it('should return paginated users', async () => {
      const page = 1, limit = 10;
      (userModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockUser]),
      });
      (userModel.countDocuments as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(1) });

      const result = await repository.findAllPaginated(page, limit);
      expect(result.users).toEqual([mockUser]);
      expect(result.total).toBe(1);
    });

    it('should return empty paginated users when no users are found', async () => {
        const page = 1, limit = 10;
        (userModel.find as jest.Mock).mockReturnValue({
            select: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue([]),
        });
        (userModel.countDocuments as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });
  
        const result = await repository.findAllPaginated(page, limit);
        expect(result.users).toEqual([]);
        expect(result.total).toBe(0);
      });
  });

  describe('updateLastLoginTime', () => {
    it('should update the last login time for a user', async () => {
      const userId = '60f7e2c3e4b2b8001f9b3b3a';
      (userModel.findByIdAndUpdate as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(mockUser) });
      await repository.updateLastLoginTime(userId);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(userId, { lastAccessedAt: expect.any(Date) });
    });

    it('should throw an error for an invalid user ID format', async () => {
        await expect(repository.updateLastLoginTime('invalid-id')).rejects.toThrow('用户ID格式无效');
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      (userModel.countDocuments as jest.Mock)
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(5) })
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(3) });
      (userModel.aggregate as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue([{ _id: UserRole.DEVELOPER, count: 5 }]) });

      const result = await repository.getUserStats();
      expect(result.totalUsers).toBe(5);
      expect(result.activeUsers).toBe(3);
      expect(result.roleDistribution[UserRole.DEVELOPER]).toBe(5);
    });

    it('should return zero stats when no users exist', async () => {
        (userModel.countDocuments as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });
        (userModel.aggregate as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
  
        const result = await repository.getUserStats();
        expect(result.totalUsers).toBe(0);
        expect(result.activeUsers).toBe(0);
        expect(result.roleDistribution).toEqual({});
      });
  });

  // Add other simple method tests here to ensure full coverage
  ['findByUsername', 'findByUsernameOrEmail'].forEach(method => {
    describe(method, () => {
        it(`should call findOne`, async () => {
            (userModel.findOne as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(mockUser) });
            await (repository as any)[method]('test', 'test@test.com');
            expect(userModel.findOne).toHaveBeenCalled();
        });
    });
  });
});
