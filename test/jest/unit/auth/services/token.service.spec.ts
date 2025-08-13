/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { UnauthorizedException } from "@nestjs/common";
import { createMock } from "@golevelup/ts-jest";
import {
  TokenService,
  JwtPayload,
} from "../../../../../src/auth/services/token.service";
import { UserRepository } from "../../../../../src/auth/repositories/user.repository";
import {
  User,
  UserDocument,
} from "../../../../../src/auth/schemas/user.schema";
import { UserRole } from "../../../../../src/auth/enums/user-role.enum";
import { securityConfig } from "../../../../../src/common/config/security.config";

describe("TokenService", () => {
  let service: TokenService;
  let jwtService: JwtService;
  let userRepository: UserRepository;

  const plainUser: User = {
    id: "user-id-123",
    username: "testuser",
    email: "test@test.com",
    passwordHash: "hash",
    role: UserRole.DEVELOPER,
    isActive: true,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserDocument = {
    ...plainUser,
    toJSON: () => plainUser,
  } as unknown as UserDocument;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: JwtService,
          useValue: createMock<JwtService>(),
        },
        {
          provide: UserRepository,
          useValue: createMock<UserRepository>(),
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    jwtService = module.get<JwtService>(JwtService);
    userRepository = module.get<UserRepository>(UserRepository);

    // Reset mocks for every test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("generateTokens", () => {
    it("should generate access and refresh tokens successfully", async () => {
      const accessToken = "fake-access-token";
      const refreshToken = "fake-refresh-token";

      jest
        .spyOn(jwtService, "signAsync")
        .mockResolvedValueOnce(accessToken)
        .mockResolvedValueOnce(refreshToken);

      const tokens = await service.generateTokens(mockUserDocument);

      expect(tokens).toEqual({ accessToken, refreshToken });
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);

      const payload: JwtPayload = {
        sub: mockUserDocument.id,
        username: mockUserDocument.username,
        role: mockUserDocument.role,
      };
      expect(jwtService.signAsync).toHaveBeenCalledWith(payload);
      expect(jwtService.signAsync).toHaveBeenCalledWith(payload, {
        expiresIn: securityConfig.session.refreshTokenDefaultExpiry,
      });
    });
  });

  describe("validateUserFromPayload", () => {
    const payload: JwtPayload = {
      sub: "user-id-123",
      username: "testuser",
      role: UserRole.DEVELOPER,
    };

    it("should return the user if found and active", async () => {
      jest
        .spyOn(userRepository, "findById")
        .mockResolvedValue(mockUserDocument);

      const result = await service.validateUserFromPayload(payload);

      expect(result).toEqual(plainUser);
      expect(userRepository.findById).toHaveBeenCalledWith(payload.sub);
    });

    it("should throw UnauthorizedException if user is not found", async () => {
      jest.spyOn(userRepository, "findById").mockResolvedValue(null);

      await expect(service.validateUserFromPayload(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException if user is inactive", async () => {
      const inactiveUserDocument = {
        ...mockUserDocument,
        isActive: false,
      } as UserDocument;
      jest
        .spyOn(userRepository, "findById")
        .mockResolvedValue(inactiveUserDocument);

      await expect(service.validateUserFromPayload(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("verifyRefreshToken", () => {
    const token = "valid-refresh-token";
    const payload: JwtPayload = {
      sub: "user-id-123",
      username: "testuser",
      role: UserRole.DEVELOPER,
    };

    it("should return the payload if token is valid", async () => {
      jest.spyOn(jwtService, "verifyAsync").mockResolvedValue(payload);

      const result = await service.verifyRefreshToken(token);
      expect(result).toEqual(payload);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(token);
    });

    it("should throw UnauthorizedException if token is invalid", async () => {
      jest
        .spyOn(jwtService, "verifyAsync")
        .mockRejectedValue(new Error("Invalid token"));

      await expect(service.verifyRefreshToken(token)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
