import { validate } from "class-validator";
import { IsString } from "class-validator";
import {
  IsValidUsername,
  IsStrongPassword,
  IsValidApiKey,
  IsValidAccessToken,
  IsValidRoleName,
  IsValidEmail,
} from "./validation.decorator";

// Test DTO classes
class TestUsernameDto {
  @IsString()
  @IsValidUsername()
  username: string;
}

class TestPasswordDto {
  @IsString()
  @IsStrongPassword()
  password: string;
}

class TestApiKeyDto {
  @IsString()
  @IsValidApiKey()
  apiKey: string;
}

class TestAccessTokenDto {
  @IsString()
  @IsValidAccessToken()
  accessToken: string;
}

class TestRoleNameDto {
  @IsString()
  @IsValidRoleName()
  roleName: string;
}

class TestEmailDto {
  @IsValidEmail()
  email: string;
}

describe("Auth Validation Decorators", () => {
  describe("IsValidUsername", () => {
    it("should accept valid usernames", async () => {
      const dto = new TestUsernameDto();
      dto.username = "admin123";
      
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should reject usernames that are too short", async () => {
      const dto = new TestUsernameDto();
      dto.username = "ab";
      
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("username");
    });

    it("should reject usernames that are too long", async () => {
      const dto = new TestUsernameDto();
      dto.username = "a".repeat(35);
      
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("username");
    });

    it("should reject usernames with invalid characters", async () => {
      const dto = new TestUsernameDto();
      dto.username = "admin@123";
      
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("username");
    });

    it("should reject usernames starting with underscore", async () => {
      const dto = new TestUsernameDto();
      dto.username = "_admin";
      
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("username");
    });
  });

  describe("IsStrongPassword", () => {
    it("should accept strong passwords", async () => {
      const dto = new TestPasswordDto();
      dto.password = "Password123!";
      
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should reject weak passwords without uppercase", async () => {
      const dto = new TestPasswordDto();
      dto.password = "password123";
      
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("password");
    });

    it("should reject passwords that are too short", async () => {
      const dto = new TestPasswordDto();
      dto.password = "Pass1!";
      
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("password");
    });

    it("should reject passwords without numbers", async () => {
      const dto = new TestPasswordDto();
      dto.password = "Password!";
      
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("password");
    });
  });

  describe("IsValidApiKey", () => {
    it("should accept valid API keys", async () => {
      const dto = new TestApiKeyDto();
      dto.apiKey = "a1b2c3d4e5f6789012345678abcdef12";
      
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should reject API keys with invalid length", async () => {
      const dto = new TestApiKeyDto();
      dto.apiKey = "abc123";
      
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("apiKey");
    });

    it("should reject API keys with non-hex characters", async () => {
      const dto = new TestApiKeyDto();
      dto.apiKey = "g1b2c3d4e5f6789012345678abcdef12";
      
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("apiKey");
    });
  });

  describe("IsValidAccessToken", () => {
    it("should accept valid access tokens", async () => {
      const dto = new TestAccessTokenDto();
      dto.accessToken = "a1b2c3d4e5f6789012345678abcdef1234567890abcdef1234567890abcdef12";
      
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should reject access tokens with invalid length", async () => {
      const dto = new TestAccessTokenDto();
      dto.accessToken = "abc123";
      
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("accessToken");
    });
  });

  describe("IsValidRoleName", () => {
    it("should accept valid role names", async () => {
      const dto = new TestRoleNameDto();
      dto.roleName = "Admin User";
      
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should reject empty role names", async () => {
      const dto = new TestRoleNameDto();
      dto.roleName = "";
      
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("roleName");
    });

    it("should reject role names with only spaces", async () => {
      const dto = new TestRoleNameDto();
      dto.roleName = "   ";
      
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("roleName");
    });

    it("should reject role names that are too long", async () => {
      const dto = new TestRoleNameDto();
      dto.roleName = "a".repeat(60);
      
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("roleName");
    });
  });

  describe("IsValidEmail", () => {
    it("should accept valid email addresses", async () => {
      const dto = new TestEmailDto();
      dto.email = "admin@example.com";
      
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should reject invalid email addresses", async () => {
      const dto = new TestEmailDto();
      dto.email = "invalid-email";
      
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("email");
    });
  });
});