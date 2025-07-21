import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../../../../../src/auth/decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
      get: jest.fn(),
      getAll: jest.fn(),
      getAllAndMerge: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get(Reflector);

    mockExecutionContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true for public routes', () => {
      reflector.getAllAndOverride.mockReturnValue(true);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
    });

    it('should call super.canActivate for protected routes', () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      
      const superCanActivateSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate');
      superCanActivateSpy.mockReturnValue(true);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(superCanActivateSpy).toHaveBeenCalledWith(mockExecutionContext);
      
      superCanActivateSpy.mockRestore();
    });

    it('should call super.canActivate when isPublic is undefined', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      
      const superCanActivateSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate');
      superCanActivateSpy.mockReturnValue(true);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(superCanActivateSpy).toHaveBeenCalled();
      
      superCanActivateSpy.mockRestore();
    });

    it('should handle reflector returning null', () => {
      reflector.getAllAndOverride.mockReturnValue(null);
      
      const superCanActivateSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate');
      superCanActivateSpy.mockReturnValue(true);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(superCanActivateSpy).toHaveBeenCalled();
      
      superCanActivateSpy.mockRestore();
    });
  });

  describe('handleRequest', () => {
    it('should return user when authentication is successful', () => {
      const mockUser = { id: '123', username: 'testuser' };

      const result = guard.handleRequest(null, mockUser, null);

      expect(result).toBe(mockUser);
    });

    it('should throw UnauthorizedException when user is null', () => {
      expect(() => {
        guard.handleRequest(null, null, null);
      }).toThrow(UnauthorizedException);
      
      expect(() => {
        guard.handleRequest(null, null, null);
      }).toThrow('JWT认证失败');
    });

    it('should throw UnauthorizedException when user is undefined', () => {
      expect(() => {
        guard.handleRequest(null, undefined, null);
      }).toThrow(UnauthorizedException);
    });

    it('should throw the provided error when err is present', () => {
      const customError = new Error('Custom authentication error');

      expect(() => {
        guard.handleRequest(customError, null, null);
      }).toThrow(customError);
    });

    it('should throw the provided error even with valid user', () => {
      const customError = new Error('Custom error with user');
      const mockUser = { id: '123', username: 'testuser' };

      expect(() => {
        guard.handleRequest(customError, mockUser, null);
      }).toThrow(customError);
    });

    it('should handle falsy user values', () => {
      const falsyValues = [false, 0, '', null, undefined];

      falsyValues.forEach(value => {
        expect(() => {
          guard.handleRequest(null, value, null);
        }).toThrow(UnauthorizedException);
      });
    });

    it('should handle valid user object with different shapes', () => {
      const userVariants = [
        { id: '123' },
        { username: 'test' },
        { id: '123', username: 'test', email: 'test@example.com' },
        { sub: '123', email: 'test@example.com' },
      ];

      userVariants.forEach(user => {
        const result = guard.handleRequest(null, user, null);
        expect(result).toBe(user);
      });
    });

    it('should handle empty object as valid user', () => {
      const emptyUser = {};
      const result = guard.handleRequest(null, emptyUser, null);
      expect(result).toBe(emptyUser);
    });
  });

  describe('edge cases', () => {
    it('should handle execution context with missing handler', () => {
      mockExecutionContext.getHandler.mockReturnValue(undefined);
      reflector.getAllAndOverride.mockReturnValue(false);
      
      const superCanActivateSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate');
      superCanActivateSpy.mockReturnValue(true);

      guard.canActivate(mockExecutionContext);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        undefined,
        mockExecutionContext.getClass(),
      ]);
      
      superCanActivateSpy.mockRestore();
    });

    it('should handle execution context with missing class', () => {
      mockExecutionContext.getClass.mockReturnValue(undefined);
      reflector.getAllAndOverride.mockReturnValue(false);
      
      const superCanActivateSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate');
      superCanActivateSpy.mockReturnValue(true);

      guard.canActivate(mockExecutionContext);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockExecutionContext.getHandler(),
        undefined,
      ]);
      
      superCanActivateSpy.mockRestore();
    });

    it('should handle reflector throwing an error', () => {
      reflector.getAllAndOverride.mockImplementation(() => {
        throw new Error('Reflector error');
      });

      expect(() => {
        guard.canActivate(mockExecutionContext);
      }).toThrow('Reflector error');
    });

    it('should handle super.canActivate returning false', () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      
      const superCanActivateSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate');
      superCanActivateSpy.mockReturnValue(false);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
      
      superCanActivateSpy.mockRestore();
    });

    it('should handle super.canActivate throwing an error', () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      
      const superCanActivateSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate');
      superCanActivateSpy.mockImplementation(() => {
        throw new Error('Super guard error');
      });

      expect(() => {
        guard.canActivate(mockExecutionContext);
      }).toThrow('Super guard error');
      
      superCanActivateSpy.mockRestore();
    });

    it('should handle super.canActivate returning a Promise', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      
      const superCanActivateSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate');
      superCanActivateSpy.mockReturnValue(Promise.resolve(true));

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.toBe(true);
      
      superCanActivateSpy.mockRestore();
    });
  });

  describe('constructor', () => {
    it('should be constructed with reflector', () => {
      expect(guard).toBeInstanceOf(JwtAuthGuard);
    });
  });
});
