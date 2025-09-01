/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * PasswordService 单元测试
 * 测试密码哈希和验证服务的核心逻辑
 */

import { Test, TestingModule } from "@nestjs/testing";
import bcrypt from "bcrypt";

import { PasswordService } from "../../../../../src/auth/services/password.service";

describe("PasswordService", () => {
  let service: PasswordService;
  let bcryptHashSpy: jest.SpyInstance;
  let bcryptCompareSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();

    service = module.get<PasswordService>(PasswordService);

    // Setup spies
    bcryptHashSpy = jest.spyOn(bcrypt, "hash");
    bcryptCompareSpy = jest.spyOn(bcrypt, "compare");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("hashPassword", () => {
    it("should hash password successfully", async () => {
      // Arrange
      const plainPassword = "mySecurePassword123";
      const hashedPassword =
        "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Mf.z1R2PfQgIaVXAu";
      bcryptHashSpy.mockResolvedValue(hashedPassword);

      // Act
      const result = await service.hashPassword(plainPassword);

      // Assert
      expect(bcryptHashSpy).toHaveBeenCalledWith(
        plainPassword,
        expect.any(Number),
      );
      expect(result).toBe(hashedPassword);
    });

    it("should use correct salt rounds", async () => {
      // Arrange
      const plainPassword = "password123";
      const hashedPassword = "hashed_password";
      bcryptHashSpy.mockResolvedValue(hashedPassword);

      // Act
      await service.hashPassword(plainPassword);

      // Assert
      expect(bcryptHashSpy).toHaveBeenCalledWith(plainPassword, 12);
    });

    it("should handle empty password", async () => {
      // Arrange
      const emptyPassword = "";
      const hashedPassword = "hashed_empty";
      bcryptHashSpy.mockResolvedValue(hashedPassword);

      // Act
      const result = await service.hashPassword(emptyPassword);

      // Assert
      expect(bcryptHashSpy).toHaveBeenCalledWith(emptyPassword, 12);
      expect(result).toBe(hashedPassword);
    });

    it("should handle very long passwords", async () => {
      // Arrange
      const longPassword = "a".repeat(1000);
      const hashedPassword = "hashed_long";
      bcryptHashSpy.mockResolvedValue(hashedPassword);

      // Act
      const result = await service.hashPassword(longPassword);

      // Assert
      expect(bcryptHashSpy).toHaveBeenCalledWith(longPassword, 12);
      expect(result).toBe(hashedPassword);
    });

    it("should handle special characters in password", async () => {
      // Arrange
      const specialPassword = "!@#$%^&*()_+-=[]{}|;:,.<>?";
      const hashedPassword = "hashed_special";
      bcryptHashSpy.mockResolvedValue(hashedPassword);

      // Act
      const result = await service.hashPassword(specialPassword);

      // Assert
      expect(bcryptHashSpy).toHaveBeenCalledWith(specialPassword, 12);
      expect(result).toBe(hashedPassword);
    });

    it("should handle bcrypt errors", async () => {
      // Arrange
      const plainPassword = "password123";
      const error = new Error("Bcrypt hashing failed");
      bcryptHashSpy.mockRejectedValue(error);

      // Act & Assert
      await expect(service.hashPassword(plainPassword)).rejects.toThrow(
        "Bcrypt hashing failed",
      );
    });
  });

  describe("comparePassword", () => {
    it("should return true for matching passwords", async () => {
      // Arrange
      const plainPassword = "mySecurePassword123";
      const hashedPassword =
        "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Mf.z1R2PfQgIaVXAu";
      bcryptCompareSpy.mockResolvedValue(true);

      // Act
      const result = await service.comparePassword(
        plainPassword,
        hashedPassword,
      );

      // Assert
      expect(bcryptCompareSpy).toHaveBeenCalledWith(
        plainPassword,
        hashedPassword,
      );
      expect(result).toBe(true);
    });

    it("should return false for non-matching passwords", async () => {
      // Arrange
      const plainPassword = "wrongPassword";
      const hashedPassword =
        "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Mf.z1R2PfQgIaVXAu";
      bcryptCompareSpy.mockResolvedValue(false);

      // Act
      const result = await service.comparePassword(
        plainPassword,
        hashedPassword,
      );

      // Assert
      expect(bcryptCompareSpy).toHaveBeenCalledWith(
        plainPassword,
        hashedPassword,
      );
      expect(result).toBe(false);
    });

    it("should handle empty plain password", async () => {
      // Arrange
      const emptyPassword = "";
      const hashedPassword = "$2b$12$someHashedPassword";
      bcryptCompareSpy.mockResolvedValue(false);

      // Act
      const result = await service.comparePassword(
        emptyPassword,
        hashedPassword,
      );

      // Assert
      expect(bcryptCompareSpy).toHaveBeenCalledWith(
        emptyPassword,
        hashedPassword,
      );
      expect(result).toBe(false);
    });

    it("should handle empty hash", async () => {
      // Arrange
      const plainPassword = "password123";
      const emptyHash = "";
      bcryptCompareSpy.mockResolvedValue(false);

      // Act
      const result = await service.comparePassword(plainPassword, emptyHash);

      // Assert
      expect(bcryptCompareSpy).toHaveBeenCalledWith(plainPassword, emptyHash);
      expect(result).toBe(false);
    });

    it("should handle invalid hash format", async () => {
      // Arrange
      const plainPassword = "password123";
      const invalidHash = "not_a_valid_bcrypt_hash";
      const error = new Error("Invalid hash format");
      bcryptCompareSpy.mockRejectedValue(error);

      // Act & Assert
      await expect(
        service.comparePassword(plainPassword, invalidHash),
      ).rejects.toThrow("Invalid hash format");
    });

    it("should handle bcrypt comparison errors", async () => {
      // Arrange
      const plainPassword = "password123";
      const hashedPassword = "$2b$12$validHashFormat";
      const error = new Error("Bcrypt comparison failed");
      bcryptCompareSpy.mockRejectedValue(error);

      // Act & Assert
      await expect(
        service.comparePassword(plainPassword, hashedPassword),
      ).rejects.toThrow("Bcrypt comparison failed");
    });

    it("should handle concurrent password comparisons", async () => {
      // Arrange
      const passwords = ["password1", "password2", "password3"];
      const hash = "$2b$12$testHash";

      bcryptCompareSpy
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      // Act
      const results = await Promise.all(
        passwords.map((pwd) => service.comparePassword(pwd, hash)),
      );

      // Assert
      expect(results).toEqual([true, false, true]);
      expect(bcryptCompareSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe("integration scenarios", () => {
    it("should handle hash and compare workflow", async () => {
      // Arrange
      const originalPassword = "testPassword123";
      const hashedPassword = "$2b$12$hashedValue";

      bcryptHashSpy.mockResolvedValue(hashedPassword);
      bcryptCompareSpy.mockResolvedValue(true);

      // Act
      const hash = await service.hashPassword(originalPassword);
      const isValid = await service.comparePassword(originalPassword, hash);

      // Assert
      expect(hash).toBe(hashedPassword);
      expect(isValid).toBe(true);
      expect(bcryptHashSpy).toHaveBeenCalledWith(originalPassword, 12);
      expect(bcryptCompareSpy).toHaveBeenCalledWith(
        originalPassword,
        hashedPassword,
      );
    });

    it("should handle multiple hash operations", async () => {
      // Arrange
      const passwords = ["pwd1", "pwd2", "pwd3"];
      const hashes = ["hash1", "hash2", "hash3"];

      bcryptHashSpy
        .mockResolvedValueOnce(hashes[0])
        .mockResolvedValueOnce(hashes[1])
        .mockResolvedValueOnce(hashes[2]);

      // Act
      const results = await Promise.all(
        passwords.map((pwd) => service.hashPassword(pwd)),
      );

      // Assert
      expect(results).toEqual(hashes);
      expect(bcryptHashSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe("edge cases and security", () => {
    it("should handle null password gracefully", async () => {
      // Arrange
      const nullPassword = null as any;
      bcryptHashSpy.mockRejectedValue(new Error("Invalid input"));

      // Act & Assert
      await expect(service.hashPassword(nullPassword)).rejects.toThrow();
    });

    it("should handle undefined password gracefully", async () => {
      // Arrange
      const undefinedPassword = undefined as any;
      bcryptHashSpy.mockRejectedValue(new Error("Invalid input"));

      // Act & Assert
      await expect(service.hashPassword(undefinedPassword)).rejects.toThrow();
    });

    it("should handle unicode passwords", async () => {
      // Arrange
      const unicodePassword = "密码测试🔐";
      const hashedPassword = "hashed_unicode";
      bcryptHashSpy.mockResolvedValue(hashedPassword);

      // Act
      const result = await service.hashPassword(unicodePassword);

      // Assert
      expect(bcryptHashSpy).toHaveBeenCalledWith(unicodePassword, 12);
      expect(result).toBe(hashedPassword);
    });

    it("should handle passwords with newlines and tabs", async () => {
      // Arrange
      const passwordWithWhitespace = "password\n\t\r";
      const hashedPassword = "hashed_whitespace";
      bcryptHashSpy.mockResolvedValue(hashedPassword);

      // Act
      const result = await service.hashPassword(passwordWithWhitespace);

      // Assert
      expect(bcryptHashSpy).toHaveBeenCalledWith(passwordWithWhitespace, 12);
      expect(result).toBe(hashedPassword);
    });
  });
});
