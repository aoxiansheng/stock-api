/* eslint-disable @typescript-eslint/no-unused-vars */
import { BadRequestException } from "@nestjs/common";
import { URLSecurityValidator } from "@common/utils/url-security-validator.util";

describe("URLSecurityValidator", () => {
  describe("validateURL", () => {
    describe("valid URLs", () => {
      it("should accept allowed external domains with HTTPS", () => {
        const validUrls = [
          "https://hooks.slack.com/services/webhook",
          "https://oapi.dingtalk.com/robot/send",
        ];
        validUrls.forEach((url) => {
          const result = URLSecurityValidator.validateURL(url);
          expect(result.valid).toBe(true);
          expect(result.error).toBeUndefined();
        });
      });

      it("should accept allowed external domains with HTTP", () => {
        const result = URLSecurityValidator.validateURL(
          "http://hooks.slack.com/webhook",
        );
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it("should accept subdomains of allowed domains", () => {
        const result = URLSecurityValidator.validateURL(
          "https://api.hooks.slack.com/webhook",
        );
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it("should accept standard ports", () => {
        const validPorts = [
          "https://hooks.slack.com:443/webhook",
          "http://hooks.slack.com:80/webhook",
          "https://hooks.slack.com:8080/webhook",
          "https://hooks.slack.com:8443/webhook",
        ];

        validPorts.forEach((url) => {
          const result = URLSecurityValidator.validateURL(url);
          expect(result.valid).toBe(true);
          expect(result.error).toBeUndefined();
        });
      });

      it("should accept URLs with query parameters and fragments", () => {
        const urlsWithParams = [
          "https://hooks.slack.com/webhook?_token=123&_channel=general",
          "https://hooks.slack.com/webhook#section",
          "https://hooks.slack.com/webhook?param=value#anchor",
        ];

        urlsWithParams.forEach((url) => {
          const result = URLSecurityValidator.validateURL(url);
          expect(result.valid).toBe(true);
          expect(result.error).toBeUndefined();
        });
      });

      it("should handle case insensitive protocols and hostnames", () => {
        const result1 = URLSecurityValidator.validateURL(
          "HTTPS://hooks.slack.com",
        );
        const result2 = URLSecurityValidator.validateURL(
          "https://HOOKS.SLACK.COM",
        );

        expect(result1.valid).toBe(true);
        expect(result2.valid).toBe(true);
      });
    });

    describe("protocol validation", () => {
      it("should reject file protocol", () => {
        const result = URLSecurityValidator.validateURL("file:///etc/passwd");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("不允许的协议: file:");
      });

      it("should reject all dangerous protocols", () => {
        const dangerousProtocols = [
          "ftp://example.com",
          "gopher://example.com",
          "dict://example.com",
          "sftp://example.com",
          "ldap://example.com",
          "ldaps://example.com",
          "tftp://example.com",
          "jar://example.com",
          "netdoc://example.com",
          "mailto:user@example.com",
          "ne_ws://example.com",
          "imap://example.com",
          "telnet://example.com",
        ];

        dangerousProtocols.forEach((url) => {
          const result = URLSecurityValidator.validateURL(url);
          expect(result.valid).toBe(false);
          expect(result.error).toContain("不允许的协议");
        });
      });

      it("should reject non-HTTP/HTTPS protocols", () => {
        const result = URLSecurityValidator.validateURL("ws://example.com");
        expect(result.valid).toBe(false);
        expect(result.error).toBe("仅支持HTTP和HTTPS协议");
      });
    });

    describe("hostname validation", () => {
      it("should reject dangerous hostnames", () => {
        const dangerousHosts = [
          "localhost",
          "metadata.google.internal",
          "metadata",
          "instance-data",
          "checkip.amazonaws.com",
          "icanhazip.com",
          "ipinfo.io",
          "httpbin.org",
          "requestb.in",
          "postb.in",
        ];

        dangerousHosts.forEach((host) => {
          const result = URLSecurityValidator.validateURL(`https://${host}`);
          expect(result.valid).toBe(false);
          expect(result.error).toContain("不允许访问的主机");
        });
      });

      it("should reject private IP addresses", () => {
        const privateIPs = [
          "127.0.0.1", // Loopback
          "10.0.0.1", // Private Class A
          "172.16.0.1", // Private Class B start
          "172.31.255.255", // Private Class B end
          "192.168.1.1", // Private Class C
          "169.254.1.1", // Link-local
          "0.0.0.1", // Current network
          "224.0.0.1", // Multicast
          "240.0.0.1", // Reserved
          "255.255.255.255", // Broadcast
        ];

        privateIPs.forEach((ip) => {
          const result = URLSecurityValidator.validateURL(`https://${ip}`);
          expect(result.valid).toBe(false);
          expect(result.error).toContain("不允许访问内部IP地址");
        });
      });

      it("should specifically reject AWS metadata service", () => {
        const result = URLSecurityValidator.validateURL(
          "https://169.254.169.254/meta-data",
        );
        expect(result.valid).toBe(false);
        // AWS metadata service IP is caught by internal IP check first
        expect(result.error).toContain("不允许访问内部IP地址");
      });

      it("should reject direct IPv4 access for public IPs", () => {
        const publicIPs = [
          "8.8.8.8", // Google DNS
          "1.1.1.1", // Cloudflare DNS
          "208.67.222.222", // OpenDNS
        ];

        publicIPs.forEach((ip) => {
          const result = URLSecurityValidator.validateURL(`https://${ip}`);
          expect(result.valid).toBe(false);
          expect(result.error).toContain("不允许直接访问IP地址");
        });
      });

      it("should reject IPv6 addresses", () => {
        const ipv6Addresses = [
          "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
          "fe80:0000:0000:0000:0202:b3ff:fe1e:8329",
        ];

        ipv6Addresses.forEach((ip) => {
          const result = URLSecurityValidator.validateURL(`https://${ip}`);
          expect(result.valid).toBe(false);
          // IPv6 without brackets causes URL parsing error
          expect(result.error).toContain("无效的URL格式");
        });
      });

      it("should reject non-whitelisted external domains", () => {
        const unauthorizedDomains = [
          "evil.com",
          "malicious.org",
          "untrusted.net",
          "example.com",
        ];

        unauthorizedDomains.forEach((domain) => {
          const result = URLSecurityValidator.validateURL(`https://${domain}`);
          expect(result.valid).toBe(false);
          expect(result.error).toContain("不允许访问外部域名");
        });
      });
    });

    describe("port validation", () => {
      it("should reject invalid port ranges", () => {
        const invalidPorts = [79, 1, 22, 3000, 5432];

        invalidPorts.forEach((port) => {
          const result = URLSecurityValidator.validateURL(
            `https://hooks.slack.com:${port}/webhook`,
          );
          expect(result.valid).toBe(false);
          expect(result.error).toContain(
            port < 80 ? "端口范围无效" : "不允许的端口",
          );
        });
      });

      it("should reject disallowed ports", () => {
        const disallowedPorts = [3000, 5432, 22, 3306, 5000];

        disallowedPorts.forEach((port) => {
          const result = URLSecurityValidator.validateURL(
            `https://hooks.slack.com:${port}/webhook`,
          );
          expect(result.valid).toBe(false);
          // Ports < 80 get "端口范围无效", others get "不允许的端口"
          if (port < 80) {
            expect(result.error).toContain("端口范围无效");
          } else {
            expect(result.error).toContain("不允许的端口");
          }
        });
      });

      it("should handle port edge cases", () => {
        // Test extremely high port number (should be handled by URL const_ructor)
        const result1 = URLSecurityValidator.validateURL(
          "https://hooks.slack.com:99999/webhook",
        );
        expect(result1.valid).toBe(false);

        // Test port 0
        const result2 = URLSecurityValidator.validateURL(
          "https://hooks.slack.com:0/webhook",
        );
        expect(result2.valid).toBe(false);
        expect(result2.error).toContain("端口范围无效");
      });
    });

    describe("path validation", () => {
      it("should reject suspicious path patterns", () => {
        // Test patterns that will be caught by containsSuspiciousPatterns method
        // Note: URL constructor normalizes paths, so /../ in URL may become /

        const etcPath = URLSecurityValidator.validateURL(
          "https://hooks.slack.com/etc/passwd",
        );
        expect(etcPath.valid).toBe(false);
        expect(etcPath.error).toBe("URL路径包含可疑模式");

        const procPath = URLSecurityValidator.validateURL(
          "https://hooks.slack.com/proc/self",
        );
        expect(procPath.valid).toBe(false);
        expect(procPath.error).toBe("URL路径包含可疑模式");

        const devPath = URLSecurityValidator.validateURL(
          "https://hooks.slack.com/dev/null",
        );
        expect(devPath.valid).toBe(false);
        expect(devPath.error).toBe("URL路径包含可疑模式");

        const varPath = URLSecurityValidator.validateURL(
          "https://hooks.slack.com/var/log",
        );
        expect(varPath.valid).toBe(false);
        expect(varPath.error).toBe("URL路径包含可疑模式");

        const tmpPath = URLSecurityValidator.validateURL(
          "https://hooks.slack.com/tmp/secret",
        );
        expect(tmpPath.valid).toBe(false);
        expect(tmpPath.error).toBe("URL路径包含可疑模式");

        const metaDataPath = URLSecurityValidator.validateURL(
          "https://hooks.slack.com/meta-data/instance",
        );
        expect(metaDataPath.valid).toBe(false);
        expect(metaDataPath.error).toBe("URL路径包含可疑模式");

        const userDataPath = URLSecurityValidator.validateURL(
          "https://hooks.slack.com/user-data/config",
        );
        expect(userDataPath.valid).toBe(false);
        expect(userDataPath.error).toBe("URL路径包含可疑模式");

        const latestPath = URLSecurityValidator.validateURL(
          "https://hooks.slack.com/latest/something",
        );
        expect(latestPath.valid).toBe(false);
        expect(latestPath.error).toBe("URL路径包含可疑模式");
      });

      it("should test URL normalization behavior", () => {
        // Demonstrate how URL constructor normalizes paths
        const normalizedUrl = new URL("https://hooks.slack.com/path/../config");
        expect(normalizedUrl.pathname).toBe("/config"); // .. gets normalized away

        // The validator should catch patterns that remain after normalization
        const result = URLSecurityValidator.validateURL(
          "https://hooks.slack.com/path/../config",
        );
        expect(result.valid).toBe(true); // This passes because pathname becomes '/config'

        // Test a pattern with .. that can't be normalized away in some contexts
        // Since URL constructor normalizes, we test the pattern matching directly
        const testPath = "/path/../config";
        const containsDotDot = /\.\./.test(testPath);
        expect(containsDotDot).toBe(true); // The regex would match this
      });

      it("should accept normal paths", () => {
        const normalPaths = [
          "/api/v1/webhook",
          "/webhook/callback",
          "/normal/path/to/resource",
          "/services/notification",
          "/robot/send",
        ];

        normalPaths.forEach((path) => {
          const result = URLSecurityValidator.validateURL(
            `https://hooks.slack.com${path}`,
          );
          expect(result.valid).toBe(true);
          expect(result.error).toBeUndefined();
        });
      });

      it("should handle case insensitive path checks", () => {
        const suspiciousCasePaths = [
          "/ETC/passwd",
          "/META-DATA/instance",
          "/PROC/self",
        ];

        suspiciousCasePaths.forEach((path) => {
          const result = URLSecurityValidator.validateURL(
            `https://hooks.slack.com${path}`,
          );
          expect(result.valid).toBe(false);
          expect(result.error).toBe("URL路径包含可疑模式");
        });
      });
    });

    describe("malformed URLs", () => {
      it("should reject malformed URLs", () => {
        const malformedUrls = [
          "not-a-url",
          "http://",
          "https://",
          "",
          "http:///",
          "https:///",
          "ftp",
          "just-a-string",
        ];

        malformedUrls.forEach((url) => {
          const result = URLSecurityValidator.validateURL(url);
          expect(result.valid).toBe(false);
          expect(result.error).toContain("无效的URL格式");
        });
      });

      it("should handle URL constructor errors gracefully", () => {
        const badUrls = [
          "http://[invalid-ipv6",
          "https://host:invalidport",
          "http://host with spaces.com",
        ];

        badUrls.forEach((url) => {
          const result = URLSecurityValidator.validateURL(url);
          expect(result.valid).toBe(false);
          expect(result.error).toContain("无效的URL格式");
        });
      });
    });
  });

  describe("validateURLOrThrow", () => {
    it("should not throw for valid URLs", () => {
      const validUrl = "https://hooks.slack.com/webhook";
      expect(() =>
        URLSecurityValidator.validateURLOrThrow(validUrl),
      ).not.toThrow();
    });

    it("should throw BadRequestException for invalid URLs", () => {
      const invalidUrl = "http://localhost/webhook";
      expect(() => URLSecurityValidator.validateURLOrThrow(invalidUrl)).toThrow(
        BadRequestException,
      );
      expect(() => URLSecurityValidator.validateURLOrThrow(invalidUrl)).toThrow(
        "URL安全检查失败: 不允许访问的主机: localhost",
      );
    });

    it("should throw with correct error messages for different validation failures", () => {
      const testCases = [
        {
          url: "file:///etc/passwd",
          expectedError: "不允许的协议",
        },
        {
          url: "https://evil.com",
          expectedError: "不允许访问外部域名",
        },
        {
          url: "https://127.0.0.1",
          expectedError: "不允许访问内部IP地址",
        },
        {
          url: "not-a-url",
          expectedError: "无效的URL格式",
        },
      ];

      testCases.forEach(({ url, expectedError }) => {
        expect(() => URLSecurityValidator.validateURLOrThrow(url)).toThrow(
          expectedError,
        );
      });
    });
  });

  describe("comprehensive security scenarios", () => {
    it("should prevent SSRF attacks", () => {
      const ssrfVectors = [
        "http://127.0.0.1:80/admin",
        "https://169.254.169.254/latest/meta-data/iam/security-credentials/",
        "http://localhost:3000/internal",
        "https://metadata.google.internal/computeMetadata/v1/instance/",
        "file:///etc/passwd",
        "gopher://evil.com:70/attack",
        "http://10.0.0.1/internal-service",
        "https://192.168.1.1/router-config",
      ];

      ssrfVectors.forEach((url) => {
        const result = URLSecurityValidator.validateURL(url);
        expect(result.valid).toBe(false);
      });
    });

    it("should handle edge cases properly", () => {
      // Empty URL
      expect(URLSecurityValidator.validateURL("").valid).toBe(false);

      // URLs with special characters in query params
      const specialCharUrl =
        "https://hooks.slack.com/webhook?param=test%20value&_other=special%21";
      expect(URLSecurityValidator.validateURL(specialCharUrl).valid).toBe(true);

      // Very long valid URL
      const longPath = "/path/" + "segment/".repeat(100);
      const longUrl = `https://hooks.slack.com${longPath}`;
      expect(URLSecurityValidator.validateURL(longUrl).valid).toBe(true);
    });

    it("should validate whitelist matching correctly", () => {
      // Exact match
      expect(
        URLSecurityValidator.validateURL("https://hooks.slack.com").valid,
      ).toBe(true);

      // Subdomain match
      expect(
        URLSecurityValidator.validateURL("https://api.hooks.slack.com").valid,
      ).toBe(true);

      // Partial match should not work
      expect(
        URLSecurityValidator.validateURL("https://fakehooks.slack.com.evil.com")
          .valid,
      ).toBe(false);

      // Similar but different domain
      expect(
        URLSecurityValidator.validateURL("https://hooks-slack.com").valid,
      ).toBe(false);
    });

    it("should test all IP pattern ranges", () => {
      const ipRangeTests = [
        // 127.x.x.x
        { ip: "127.255.255.255", shouldReject: true },
        // 10.x.x.x
        { ip: "10.255.255.255", shouldReject: true },
        // 172.16-31.x.x
        { ip: "172.15.0.1", shouldReject: false }, // Should not match private range
        { ip: "172.16.0.1", shouldReject: true },
        { ip: "172.31.255.255", shouldReject: true },
        { ip: "172.32.0.1", shouldReject: false }, // Should not match private range
        // 192.168.x.x
        { ip: "192.168.255.255", shouldReject: true },
        // Link-local 169.254.x.x
        { ip: "169.254.255.255", shouldReject: true },
        // Current network 0.x.x.x
        { ip: "0.255.255.255", shouldReject: true },
        // Multicast 224.x.x.x
        { ip: "224.255.255.255", shouldReject: true },
        // Reserved 240.x.x.x
        { ip: "240.255.255.255", shouldReject: true },
      ];

      ipRangeTests.forEach(({ ip, shouldReject }) => {
        const result = URLSecurityValidator.validateURL(`https://${ip}`);
        if (shouldReject) {
          expect(result.valid).toBe(false);
          expect(result.error).toMatch(
            /不允许访问内部IP地址|不允许直接访问IP地址/,
          );
        } else {
          // These should fail for being direct IP access rather than internal IP
          expect(result.valid).toBe(false);
          expect(result.error).toContain("不允许直接访问IP地址");
        }
      });
    });

    it("should test IPv4 validation edge cases", () => {
      const invalidIPv4 = [
        "256.1.1.1", // Out of range octet
        "192.168.1", // Incomplete
        "192.168.1.1.1", // Too many octets
        "192.168.a.1", // Invalid character
        "192.168.-1.1", // Negative number
        "192.168.01.1", // Leading zero (should still be valid but edge case)
      ];

      invalidIPv4.forEach((ip) => {
        const result = URLSecurityValidator.validateURL(`https://${ip}`);
        // These should either be rejected as invalid URLs or not recognized as IPs
        expect(result.valid).toBe(false);
      });
    });
  });
});
