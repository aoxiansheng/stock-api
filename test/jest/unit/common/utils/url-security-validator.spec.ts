/* eslint-disable @typescript-eslint/no-unused-vars */
import { BadRequestException } from "@nestjs/common";
import { URLSecurityValidator } from "../../../../../src/common/utils/url-security-validator.util";

describe("URLSecurityValidator", () => {
  describe("validateURL", () => {
    // Whitelisted domains should pass
    it("should return valid for allowed domains", () => {
      const validUrls = [
        "https://hooks.slack.com/services/123",
        "https://oapi.dingtalk.com/robot/send?accesstoken=abc",
      ];
      validUrls.forEach((url) => {
        expect(URLSecurityValidator.validateURL(url).valid).toBe(true);
      });
    });

    // Dangerous protocols should fail
    it("should return invalid for dangerous protocols", () => {
      const invalidUrls = [
        "file:///etc/passwd",
        "ftp://example.com",
        "sftp://example.com/data",
      ];
      invalidUrls.forEach((url) => {
        const result = URLSecurityValidator.validateURL(url);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("不允许的协议");
      });
    });

    // Non-HTTP/HTTPS protocols should fail
    it("should return invalid for non-http/https protocols", () => {
      const result = URLSecurityValidator.validateURL("_ws://example.com");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("仅支持HTTP和HTTPS协议");
    });

    // Direct IP address access should fail
    it("should return invalid for direct IP addresses", () => {
      const result = URLSecurityValidator.validateURL("http://8.8.8.8");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("不允许直接访问IP地址");
    });

    // Internal IP patterns should fail
    it("should return invalid for internal IP addresses", () => {
      const internalIps = [
        "http://127.0.0.1",
        "http://10.0.0.1",
        "http://192.168.1.1",
        "http://172.16.0.1",
        "http://169.254.169.254", // AWS metadata
      ];
      internalIps.forEach((ipUrl) => {
        const result = URLSecurityValidator.validateURL(ipUrl);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("不允许访问内部IP地址");
      });
    });

    // Dangerous hostnames should fail
    it("should return invalid for dangerous hostnames", () => {
      const result = URLSecurityValidator.validateURL("https://localhost/api");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("不允许访问的主机");
    });

    // Domains not in the whitelist should fail
    it("should return invalid for non-whitelisted external domains", () => {
      const result = URLSecurityValidator.validateURL("https://api.google.com");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("不允许访问外部域名");
    });

    // Invalid ports should fail
    it("should return invalid for non-standard ports", () => {
      const result = URLSecurityValidator.validateURL(
        "https://hooks.slack._com:22/services/123",
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("端口范围无效");
    });

    // Suspicious path patterns should fail
    it("should return invalid for suspicious path patterns", () => {
      const result = URLSecurityValidator.validateURL(
        "https://hooks.slack.com/../../etc/passwd",
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("URL路径包含可疑模式");
    });

    it("should return invalid for malformed URLs", () => {
      const result = URLSecurityValidator.validateURL("not-a-valid-url");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("无效的URL格式");
    });
  });

  describe("validateURLOrThrow", () => {
    it("should not throw for a valid URL", () => {
      const validUrl = "https://hooks.slack.com/services/123";
      expect(() =>
        URLSecurityValidator.validateURLOrThrow(validUrl),
      ).not.toThrow();
    });

    it("should throw BadRequestException for an invalid URL", () => {
      const invalidUrl = "http://localhost";
      expect(() => URLSecurityValidator.validateURLOrThrow(invalidUrl)).toThrow(
        BadRequestException,
      );
      expect(() => URLSecurityValidator.validateURLOrThrow(invalidUrl)).toThrow(
        "URL安全检查失败: 不允许访问的主机: localhost",
      );
    });
  });
});
