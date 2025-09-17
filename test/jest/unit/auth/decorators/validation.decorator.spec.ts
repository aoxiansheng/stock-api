import { validate, ValidationError } from "class-validator";
import { 
  IsValidUsername,
  IsStrongPassword,
  IsValidApiKey,
  IsValidAccessToken,
  IsValidRoleName,
  IsUsernameLength,
  IsPasswordLength,
  IsValidSessionTimeout,
  AUTH_VALIDATION_CONSTANTS
} from "../../../../../src/auth/decorators/validation.decorator";

/**
 * Test DTOs for validation decorators
 */

class UsernameTestDto {
  @IsValidUsername()
  username: string;

  @IsUsernameLength()
  usernameLength: string;
}

class PasswordTestDto {
  @IsStrongPassword()
  password: string;

  @IsPasswordLength()
  passwordLength: string;
}

class ApiKeyTestDto {
  @IsValidApiKey()
  apiKey: string;
}

class AccessTokenTestDto {
  @IsValidAccessToken()
  accessToken: string;
}

class RoleTestDto {
  @IsValidRoleName()
  roleName: string;
}

class SessionTestDto {
  @IsValidSessionTimeout()
  timeout: number;
}

describe("Auth Validation Decorators", () => {
  describe("AUTH_VALIDATION_CONSTANTS", () => {
    it("should have correct validation constants", () => {
      expect(AUTH_VALIDATION_CONSTANTS.USERNAME_MIN_LENGTH).toBe(3);
      expect(AUTH_VALIDATION_CONSTANTS.USERNAME_MAX_LENGTH).toBe(32);
      expect(AUTH_VALIDATION_CONSTANTS.PASSWORD_MIN_LENGTH).toBe(8);
      expect(AUTH_VALIDATION_CONSTANTS.PASSWORD_MAX_LENGTH).toBe(128);
      expect(AUTH_VALIDATION_CONSTANTS.API_KEY_LENGTH).toBe(32);
      expect(AUTH_VALIDATION_CONSTANTS.ACCESS_TOKEN_LENGTH).toBe(64);
      expect(AUTH_VALIDATION_CONSTANTS.SESSION_TIMEOUT_MIN).toBe(300);
      expect(AUTH_VALIDATION_CONSTANTS.SESSION_TIMEOUT_MAX).toBe(86400);
    });

    it("should be frozen (immutable)", () => {
      expect(Object.isFrozen(AUTH_VALIDATION_CONSTANTS)).toBe(true);
    });
  });

  describe("@IsValidUsername", () => {
    it("should accept valid usernames", async () => {
      const validUsernames = [
        "user123",
        "test_user",
        "my-username",
        "user_123",
        "username123",
        "abc",
        "a".repeat(32), // Max length
      ];

      for (const username of validUsernames) {
        const dto = new UsernameTestDto();
        dto.username = username;

        const errors = await validate(dto);
        const usernameErrors = errors.filter(error => error.property === 'username');
        
        expect(usernameErrors).toHaveLength(0);
      }
    });

    it("should reject invalid usernames", async () => {
      const invalidUsernames = [
        // Too short
        "ab",
        "",
        // Too long  
        "a".repeat(33),
        // Invalid characters
        "user@name",
        "user name", // Space
        "user.name", // Dot
        "user!name", // Special character
        "用户名", // Chinese characters
        // Invalid start/end
        "_username",
        "-username", 
        "username_",
        "username-",
        // Non-string
        123,
        null,
        undefined,
      ];

      for (const username of invalidUsernames) {
        const dto = new UsernameTestDto();
        dto.username = username as any;

        const errors = await validate(dto);
        const usernameErrors = errors.filter(error => error.property === 'username');
        
        expect(usernameErrors.length).toBeGreaterThan(0);
      }
    });
  });

  describe("@IsStrongPassword", () => {
    it("should accept strong passwords", async () => {
      const strongPasswords = [
        "Password123!",
        "MyStr0ngP@ss",
        "Test123@",
        "ComplexP@ssw0rd",
        "Aa1!".repeat(2), // Min length with all types
        "P@ssword123",
      ];

      for (const password of strongPasswords) {
        const dto = new PasswordTestDto();
        dto.password = password;

        const errors = await validate(dto);
        const passwordErrors = errors.filter(error => error.property === 'password');
        
        expect(passwordErrors).toHaveLength(0);
      }
    });

    it("should reject weak passwords", async () => {
      const weakPasswords = [
        // Too short
        "Pass1!",
        "Ab1!",
        // Too long
        "A".repeat(129),
        // Missing character types
        "password123", // No uppercase
        "PASSWORD123", // No lowercase
        "Password", // No numbers
        "password", // Only lowercase
        "PASSWORD", // Only uppercase
        "12345678", // Only numbers
        "!@#$%^&*", // Only special chars
        // Only two types
        "password!", // lowercase + special
        "PASSWORD!", // uppercase + special
        "Password1", // uppercase + lowercase + number (only 3 types, need at least 3)
        // Non-string
        123456789,
        null,
        undefined,
      ];

      for (const password of weakPasswords) {
        const dto = new PasswordTestDto();
        dto.password = password as any;

        const errors = await validate(dto);
        const passwordErrors = errors.filter(error => error.property === 'password');
        
        expect(passwordErrors.length).toBeGreaterThan(0);
      }
    });
  });

  describe("@IsValidApiKey", () => {
    it("should accept valid API keys", async () => {
      const validApiKeys = [
        "a".repeat(32),
        "1".repeat(32),
        "0123456789abcdef0123456789abcdef",
        "ABCDEF0123456789abcdef0123456789",
        "f".repeat(32).toUpperCase(),
      ];

      for (const apiKey of validApiKeys) {
        const dto = new ApiKeyTestDto();
        dto.apiKey = apiKey;

        const errors = await validate(dto);
        const apiKeyErrors = errors.filter(error => error.property === 'apiKey');
        
        expect(apiKeyErrors).toHaveLength(0);
      }
    });

    it("should reject invalid API keys", async () => {
      const invalidApiKeys = [
        // Wrong length
        "a".repeat(31),
        "a".repeat(33),
        "",
        // Invalid characters
        "g".repeat(32), // 'g' is not hex
        "0123456789abcdefg123456789abcdef", // Contains 'g'
        "0123456789abcdef!123456789abcdef", // Contains '!'
        "用户名".repeat(11), // Chinese characters
        // Non-string
        123,
        null,
        undefined,
      ];

      for (const apiKey of invalidApiKeys) {
        const dto = new ApiKeyTestDto();
        dto.apiKey = apiKey as any;

        const errors = await validate(dto);
        const apiKeyErrors = errors.filter(error => error.property === 'apiKey');
        
        expect(apiKeyErrors.length).toBeGreaterThan(0);
      }
    });
  });

  describe("@IsValidAccessToken", () => {
    it("should accept valid access tokens", async () => {
      const validTokens = [
        "a".repeat(64),
        "1".repeat(64),
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "ABCDEF0123456789abcdef0123456789ABCDEF0123456789abcdef0123456789",
        "f".repeat(64).toUpperCase(),
      ];

      for (const token of validTokens) {
        const dto = new AccessTokenTestDto();
        dto.accessToken = token;

        const errors = await validate(dto);
        const tokenErrors = errors.filter(error => error.property === 'accessToken');
        
        expect(tokenErrors).toHaveLength(0);
      }
    });

    it("should reject invalid access tokens", async () => {
      const invalidTokens = [
        // Wrong length
        "a".repeat(63),
        "a".repeat(65),
        "",
        // Invalid characters
        "g".repeat(64), // 'g' is not hex
        "0123456789abcdefg123456789abcdef0123456789abcdef0123456789abcdef", // Contains 'g'
        "0123456789abcdef!123456789abcdef0123456789abcdef0123456789abcdef", // Contains '!'
        // Non-string
        123,
        null,
        undefined,
      ];

      for (const token of invalidTokens) {
        const dto = new AccessTokenTestDto();
        dto.accessToken = token as any;

        const errors = await validate(dto);
        const tokenErrors = errors.filter(error => error.property === 'accessToken');
        
        expect(tokenErrors.length).toBeGreaterThan(0);
      }
    });
  });

  describe("@IsValidRoleName", () => {
    it("should accept valid role names", async () => {
      const validRoles = [
        "admin",
        "user",
        "super_admin",
        "power-user",
        "role name with spaces",
        "Role123",
        "test_role_123",
        "admin-role",
        "a", // Min length
        "x".repeat(50), // Max length
      ];

      for (const roleName of validRoles) {
        const dto = new RoleTestDto();
        dto.roleName = roleName;

        const errors = await validate(dto);
        const roleErrors = errors.filter(error => error.property === 'roleName');
        
        expect(roleErrors).toHaveLength(0);
      }
    });

    it("should reject invalid role names", async () => {
      const invalidRoles = [
        // Too long
        "x".repeat(51),
        // Empty or only spaces
        "",
        "   ",
        "\t\n",
        // Invalid characters
        "role@name",
        "role.name",
        "role!name",
        "role%name",
        "角色名", // Chinese characters
        // Non-string
        123,
        null,
        undefined,
      ];

      for (const roleName of invalidRoles) {
        const dto = new RoleTestDto();
        dto.roleName = roleName as any;

        const errors = await validate(dto);
        const roleErrors = errors.filter(error => error.property === 'roleName');
        
        expect(roleErrors.length).toBeGreaterThan(0);
      }
    });
  });

  describe("@IsUsernameLength", () => {
    it("should accept usernames with valid length", async () => {
      const validUsernames = [
        "abc", // Min length
        "user123",
        "a".repeat(32), // Max length
      ];

      for (const username of validUsernames) {
        const dto = new UsernameTestDto();
        dto.usernameLength = username;

        const errors = await validate(dto);
        const usernameErrors = errors.filter(error => error.property === 'usernameLength');
        
        expect(usernameErrors).toHaveLength(0);
      }
    });

    it("should reject usernames with invalid length", async () => {
      const invalidUsernames = [
        "ab", // Too short
        "a".repeat(33), // Too long
        "", // Empty
      ];

      for (const username of invalidUsernames) {
        const dto = new UsernameTestDto();
        dto.usernameLength = username;

        const errors = await validate(dto);
        const usernameErrors = errors.filter(error => error.property === 'usernameLength');
        
        expect(usernameErrors.length).toBeGreaterThan(0);
      }
    });
  });

  describe("@IsPasswordLength", () => {
    it("should accept passwords with valid length", async () => {
      const validPasswords = [
        "a".repeat(8), // Min length
        "password123",
        "a".repeat(128), // Max length
      ];

      for (const password of validPasswords) {
        const dto = new PasswordTestDto();
        dto.passwordLength = password;

        const errors = await validate(dto);
        const passwordErrors = errors.filter(error => error.property === 'passwordLength');
        
        expect(passwordErrors).toHaveLength(0);
      }
    });

    it("should reject passwords with invalid length", async () => {
      const invalidPasswords = [
        "pass", // Too short
        "a".repeat(129), // Too long
        "", // Empty
      ];

      for (const password of invalidPasswords) {
        const dto = new PasswordTestDto();
        dto.passwordLength = password;

        const errors = await validate(dto);
        const passwordErrors = errors.filter(error => error.property === 'passwordLength');
        
        expect(passwordErrors.length).toBeGreaterThan(0);
      }
    });
  });

  describe("@IsValidSessionTimeout", () => {
    it("should accept valid session timeouts", async () => {
      const validTimeouts = [
        300, // Min value
        1800, // 30 minutes
        3600, // 1 hour
        86400, // Max value (24 hours)
      ];

      for (const timeout of validTimeouts) {
        const dto = new SessionTestDto();
        dto.timeout = timeout;

        const errors = await validate(dto);
        const timeoutErrors = errors.filter(error => error.property === 'timeout');
        
        expect(timeoutErrors).toHaveLength(0);
      }
    });

    it("should reject invalid session timeouts", async () => {
      const invalidTimeouts = [
        299, // Too small
        86401, // Too large
        -1, // Negative
        0, // Zero
        3.14, // Float
        "300" as any, // String
        null,
        undefined,
      ];

      for (const timeout of invalidTimeouts) {
        const dto = new SessionTestDto();
        dto.timeout = timeout as any;

        const errors = await validate(dto);
        const timeoutErrors = errors.filter(error => error.property === 'timeout');
        
        expect(timeoutErrors.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Integration Tests", () => {
    it("should validate multiple fields correctly", async () => {
      class MultiFieldDto {
        @IsValidUsername()
        username: string;

        @IsStrongPassword()
        password: string;

        @IsValidApiKey()
        apiKey: string;

        @IsValidRoleName()
        role: string;
      }

      const validDto = new MultiFieldDto();
      validDto.username = "validuser";
      validDto.password = "StrongP@ss123";
      validDto.apiKey = "a".repeat(32);
      validDto.role = "admin";

      const errors = await validate(validDto);
      expect(errors).toHaveLength(0);
    });

    it("should report multiple validation errors", async () => {
      class MultiFieldDto {
        @IsValidUsername()
        username: string;

        @IsStrongPassword()
        password: string;

        @IsValidApiKey()
        apiKey: string;
      }

      const invalidDto = new MultiFieldDto();
      invalidDto.username = "a"; // Too short
      invalidDto.password = "weak"; // Too weak
      invalidDto.apiKey = "invalid"; // Invalid format

      const errors = await validate(invalidDto);
      expect(errors).toHaveLength(3);
      
      const errorProperties = errors.map(error => error.property).sort();
      expect(errorProperties).toEqual(['apiKey', 'password', 'username']);
    });
  });
});