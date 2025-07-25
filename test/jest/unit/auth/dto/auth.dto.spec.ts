import { validate } from "class-validator";
import { plainToClass } from "class-transformer";
import {
  CreateUserDto,
  LoginDto,
  LoginResponseDto,
  RefreshTokenDto,
} from "../../../../../src/auth/dto/auth.dto";
import { UserRole } from "../../../../../src/auth/enums/user-role.enum";

describe("Auth DTOs", () => {
  describe("CreateUserDto", () => {
    it("should validate valid user data", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
        role: UserRole.DEVELOPER,
      };

      const dto = plainToClass(CreateUserDto, userData) as CreateUserDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.username).toBe(userData.username);
      expect(dto.email).toBe(userData.email);
      expect(dto.password).toBe(userData.password);
      expect(dto.role).toBe(userData.role);
    });

    it("should validate user data without optional role", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      };

      const dto = plainToClass(CreateUserDto, userData) as CreateUserDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.role).toBeUndefined();
    });

    it("should reject invalid username - too short", async () => {
      const userData = {
        username: "ab", // Less than 3 characters
        email: "test@example.com",
        password: "password123",
      };

      const dto = plainToClass(CreateUserDto, userData) as CreateUserDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("username");
      expect(errors[0].constraints).toHaveProperty("minLength");
    });

    it("should reject invalid username - too long", async () => {
      const userData = {
        username: "a".repeat(51), // More than 50 characters
        email: "test@example.com",
        password: "password123",
      };

      const dto = plainToClass(CreateUserDto, userData) as CreateUserDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("username");
      expect(errors[0].constraints).toHaveProperty("maxLength");
    });

    it("should reject invalid username - special characters", async () => {
      const userData = {
        username: "test@user!", // Contains invalid characters
        email: "test@example.com",
        password: "password123",
      };

      const dto = plainToClass(CreateUserDto, userData) as CreateUserDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("username");
      expect(errors[0].constraints).toHaveProperty("matches");
      expect(errors[0].constraints.matches).toBe(
        "用户名只能包含字母、数字、下划线和连字符",
      );
    });

    it("should accept valid username patterns", async () => {
      const validUsernames = [
        "test_user",
        "test-user",
        "TestUser123",
        "user123",
      ];

      for (const username of validUsernames) {
        const userData = {
          username,
          email: "test@example.com",
          password: "password123",
        };

        const dto = plainToClass(CreateUserDto, userData) as CreateUserDto;
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      }
    });

    it("should reject empty username", async () => {
      const userData = {
        username: "",
        email: "test@example.com",
        password: "password123",
      };

      const dto = plainToClass(CreateUserDto, userData) as CreateUserDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("username");
      expect(errors[0].constraints).toHaveProperty("isNotEmpty");
    });

    it("should reject invalid email format", async () => {
      const userData = {
        username: "testuser",
        email: "invalid-email",
        password: "password123",
      };

      const dto = plainToClass(CreateUserDto, userData) as CreateUserDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("email");
      expect(errors[0].constraints).toHaveProperty("isEmail");
    });

    it("should reject empty email", async () => {
      const userData = {
        username: "testuser",
        email: "",
        password: "password123",
      };

      const dto = plainToClass(CreateUserDto, userData) as CreateUserDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("email");
      expect(errors[0].constraints).toHaveProperty("isNotEmpty");
    });

    it("should reject password that is too short", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "12345", // Less than 6 characters
      };

      const dto = plainToClass(CreateUserDto, userData) as CreateUserDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("password");
      expect(errors[0].constraints).toHaveProperty("minLength");
    });

    it("should reject empty password", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "",
      };

      const dto = plainToClass(CreateUserDto, userData) as CreateUserDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("password");
      expect(errors[0].constraints).toHaveProperty("isNotEmpty");
    });

    it("should reject invalid role", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
        role: "INVALID_ROLE" as any,
      };

      const dto = plainToClass(CreateUserDto, userData) as CreateUserDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("role");
      expect(errors[0].constraints).toHaveProperty("isEnum");
    });

    it("should accept all valid user roles", async () => {
      const validRoles = Object.values(UserRole);

      for (const role of validRoles) {
        const userData = {
          username: "testuser",
          email: "test@example.com",
          password: "password123",
          role,
        };

        const dto = plainToClass(CreateUserDto, userData) as CreateUserDto;
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
        expect(dto.role).toBe(role);
      }
    });

    it("should reject multiple validation errors", async () => {
      const userData = {
        username: "", // Empty
        email: "invalid-email", // Invalid format
        password: "123", // Too short
        role: "INVALID" as any, // Invalid enum
      };

      const dto = plainToClass(CreateUserDto, userData) as CreateUserDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(4);

      const properties = errors.map((error) => error.property);
      expect(properties).toContain("username");
      expect(properties).toContain("email");
      expect(properties).toContain("password");
      expect(properties).toContain("role");
    });
  });

  describe("LoginDto", () => {
    it("should validate valid login data", async () => {
      const loginData = {
        username: "testuser",
        password: "password123",
      };

      const dto = plainToClass(LoginDto, loginData) as LoginDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.username).toBe(loginData.username);
      expect(dto.password).toBe(loginData.password);
    });

    it("should reject empty username", async () => {
      const loginData = {
        username: "",
        password: "password123",
      };

      const dto = plainToClass(LoginDto, loginData) as LoginDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("username");
      expect(errors[0].constraints).toHaveProperty("isNotEmpty");
    });

    it("should reject empty password", async () => {
      const loginData = {
        username: "testuser",
        password: "",
      };

      const dto = plainToClass(LoginDto, loginData) as LoginDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("password");
      expect(errors[0].constraints).toHaveProperty("isNotEmpty");
    });

    it("should reject non-string username", async () => {
      const loginData = {
        username: 123 as any,
        password: "password123",
      };

      const dto = plainToClass(LoginDto, loginData) as LoginDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("username");
      expect(errors[0].constraints).toHaveProperty("isString");
    });

    it("should reject non-string password", async () => {
      const loginData = {
        username: "testuser",
        password: 123 as any,
      };

      const dto = plainToClass(LoginDto, loginData) as LoginDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("password");
      expect(errors[0].constraints).toHaveProperty("isString");
    });

    it("should reject both empty fields", async () => {
      const loginData = {
        username: "",
        password: "",
      };

      const dto = plainToClass(LoginDto, loginData) as LoginDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(2);

      const properties = errors.map((error) => error.property);
      expect(properties).toContain("username");
      expect(properties).toContain("password");
    });
  });

  describe("RefreshTokenDto", () => {
    it("should validate valid refresh token", async () => {
      const tokenData = {
        refreshToken: "valid-refresh-token-string",
      };

      const dto = plainToClass(RefreshTokenDto, tokenData) as RefreshTokenDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.refreshToken).toBe(tokenData.refreshToken);
    });

    it("should reject empty refresh token", async () => {
      const tokenData = {
        refreshToken: "",
      };

      const dto = plainToClass(RefreshTokenDto, tokenData) as RefreshTokenDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("refreshToken");
      expect(errors[0].constraints).toHaveProperty("isNotEmpty");
    });

    it("should reject non-string refresh token", async () => {
      const tokenData = {
        refreshToken: 123 as any,
      };

      const dto = plainToClass(RefreshTokenDto, tokenData) as RefreshTokenDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("refreshToken");
      expect(errors[0].constraints).toHaveProperty("isString");
    });

    it("should handle missing refresh token property", async () => {
      const tokenData = {}; // Missing refreshToken property

      const dto = plainToClass(RefreshTokenDto, tokenData) as RefreshTokenDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("refreshToken");
      expect(errors[0].constraints).toHaveProperty("isNotEmpty");
    });
  });

  describe("LoginResponseDto", () => {
    it("should create valid login response", () => {
      const responseData = {
        user: {
          id: "123",
          username: "testuser",
          email: "test@example.com",
          role: UserRole.DEVELOPER,
          isActive: true,
          createdAt: new Date(),
        },
        accessToken: "access-token-string",
        refreshToken: "refresh-token-string",
      };

      const dto = plainToClass(
        LoginResponseDto,
        responseData,
      ) as LoginResponseDto;

      expect(dto.user).toEqual(responseData.user);
      expect(dto.accessToken).toBe(responseData.accessToken);
      expect(dto.refreshToken).toBe(responseData.refreshToken);
    });

    it("should handle all user roles in response", () => {
      Object.values(UserRole).forEach((role) => {
        const responseData = {
          user: {
            id: "123",
            username: "testuser",
            email: "test@example.com",
            role,
            isActive: true,
            createdAt: new Date(),
          },
          accessToken: "access-token",
          refreshToken: "refresh-token",
        };

        const dto = plainToClass(
          LoginResponseDto,
          responseData,
        ) as LoginResponseDto;
        expect(dto.user.role).toBe(role);
      });
    });

    it("should preserve date objects in user info", () => {
      const createdAt = new Date("2023-01-01T00:00:00Z");
      const responseData = {
        user: {
          id: "123",
          username: "testuser",
          email: "test@example.com",
          role: UserRole.DEVELOPER,
          isActive: false,
          createdAt,
        },
        accessToken: "access-token",
        refreshToken: "refresh-token",
      };

      const dto = plainToClass(
        LoginResponseDto,
        responseData,
      ) as LoginResponseDto;
      expect(dto.user.createdAt).toEqual(createdAt);
      expect(dto.user.isActive).toBe(false);
    });
  });
});
