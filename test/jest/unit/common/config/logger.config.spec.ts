/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  CustomLogger,
  sanitizeLogData,
} from "../../../../../src/app/config/logger.config";
import pino from "pino";

// Create a stable mock object that can be referenced across tests
const pino_Mock = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
};

// Mock the entire pino library to handle ES Module default export
jest.mock("pino", () => ({
  esModule: true, // This is important for ES Module mocks
  default: jest.fn(() => pino_Mock),
}));

describe("LoggerConfig", () => {
  let logger: CustomLogger;

  beforeEach(() => {
    // Clear the mock function calls before each test
    Object.values( pino_Mock).forEach((mockFn) => mockFn.mockClear());
    // @ts-expect-error - Type checking suppressed - This is a valid mock but TS compiler struggles with the type
    (pino as jest.Mock).mockClear();
  });

  describe("CustomLogger Initialization", () => {
    it("should create pino logger for development environment with debug level", () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODEENV = "development";
      delete process.env.LOG_LEVEL; // Ensure LOG_LEVEL doesn't override

      logger = new CustomLogger();
      expect(pino).toHaveBeenCalledWith(
        expect.objectContaining({ level: "debug" }),
      );

      process.env.NODE_ENV = originalNodeEnv;
    });

    it("should create pino logger for production environment with info level", () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      delete process.env.LOG_LEVEL; // Ensure LOG_LEVEL doesn't override

      logger = new CustomLogger();
      expect(pino).toHaveBeenCalledWith(
        expect.objectContaining({ level: "info" }),
      );

      process.env.NODE_ENV = originalNodeEnv;
    });

    it("should respect LOG_LEVEL environment variable", () => {
      process.env.LOGLEVEL = "warn";
      logger = new CustomLogger();
      expect(pino).toHaveBeenCalledWith(
        expect.objectContaining({ level: "warn" }),
      );
      process.env.LOG_LEVEL = ""; // Reset env var
    });
  });

  describe("Log formatting and sanitization", () => {
    beforeEach(() => {
      logger = new CustomLogger();
    });

    it("should handle circular references in log messages", () => {
      const circularObj: any = { a: 1 };
      circularObj.b = circularObj;

      logger.log(circularObj);
      expect( pino_Mock.info).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "Application",
          error: "Failed to format log message",
        }),
        "[Log Format Error] [object Object]",
      );
    });

    it("should sanitize sensitive data", () => {
      const sensitiveData = {
        password: "my-secret-password",
        token: "my-secret-token",
        other: "value",
      };
      const sanitized = sanitizeLogData(sensitiveData);
      expect(sanitized.password).toBe("my****rd");
      expect(sanitized.token).toBe("my****en");
      expect(sanitized.other).toBe("value");
    });

    it("should mask short sensitive values", () => {
      const sensitiveData = { authorization: "123" };
      const sanitized = sanitizeLogData(sensitiveData);
      expect(sanitized.authorization).toBe("****");
    });
  });

  describe("Log methods", () => {
    beforeEach(() => {
      logger = new CustomLogger("TestContext");
    });

    it("should log a simple message", () => {
      logger.log("test message");
      expect( pino_Mock.info).toHaveBeenCalledWith(
        expect.objectContaining({ context: "TestContext" }),
        "test message",
      );
    });

    it("should handle non-string context", () => {
      logger.log("message", { custom: "context" });
      expect( pino_Mock.info).toHaveBeenCalledWith(
        expect.objectContaining({ context: "TestContext", custom: "context" }),
        "message",
      );
    });
  });
});
