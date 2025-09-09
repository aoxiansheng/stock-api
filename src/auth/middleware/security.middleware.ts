import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

import { createLogger } from "@app/config/logger.config";
import { CONSTANTS } from "@common/constants";
import { HTTP_METHOD_ARRAYS } from "@common/constants/semantic";
import { SECURITY_LIMITS } from "@auth/constants/rate-limit";

// Extract rate limit and security constants for backward compatibility
// const RATE_LIMIT_CONFIG = CONSTANTS.DOMAIN.RATE_LIMIT;
import { RATE_LIMIT_CONFIG } from "../constants/rate-limit";
// 修复IP_RATE_LIMIT_CONFIG引用，提供默认值
const IP_RATE_LIMIT_CONFIG = {
  ENABLED: process.env.IP_RATE_LIMIT_ENABLED !== 'false', // 默认启用
  MAX_REQUESTS: parseInt(process.env.IP_RATE_LIMIT_MAX_REQUESTS) || 1000, // 默认每分钟1000次
  WINDOW_MS: parseInt(process.env.IP_RATE_LIMIT_WINDOW_MS) || 60000, // 默认1分钟窗口
};
import { HttpHeadersUtil } from "@common/utils/http-headers.util";
import { HTTP_STATUS_CODES } from "../constants/http-status.constants";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const xss = require("xss");

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = createLogger(SecurityMiddleware.name);
  
  // 修复SECURITY_LIMITS引用
  private readonly enabled = IP_RATE_LIMIT_CONFIG.ENABLED;
  private readonly maxRequests = IP_RATE_LIMIT_CONFIG.MAX_REQUESTS;
  private readonly windowMs = IP_RATE_LIMIT_CONFIG.WINDOW_MS;

  use(req: Request, res: Response, next: NextFunction) {
    try {
      // 检查请求体大小（在解析之前进行初步检查）
      if (this.isRequestTooLarge(req)) {
        this.logger.warn(`请求体过大被拒绝: ${req.method} ${req.url}`, {
          contentLength: req.get("content-length"),
          maxAllowed: SECURITY_LIMITS.MAX_PAYLOAD_SIZE_STRING,
        });

        res.status(HTTP_STATUS_CODES.PAYLOAD_TOO_LARGE).json({
          statusCode: HTTP_STATUS_CODES.PAYLOAD_TOO_LARGE,
          message: `请求体过大，最大允许${SECURITY_LIMITS.MAX_PAYLOAD_SIZE_STRING}`,
          error: "Payload Too Large",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // 内容类型安全检查
      const contentTypeResult = this.validateContentTypeSecurity(req);
      if (!contentTypeResult.isValid) {
        this.logger.warn(`不安全的内容类型被拒绝: ${req.method} ${req.url}`, {
          contentType: req.get("content-type"),
          reason: contentTypeResult.reason,
        });

        res.status(HTTP_STATUS_CODES.UNSUPPORTED_MEDIA_TYPE).json({
          statusCode: HTTP_STATUS_CODES.UNSUPPORTED_MEDIA_TYPE,
          message: "不支持的媒体类型",
          error: "Unsupported Media Type",
          details: {
            type: "CONTENT_TYPE_SECURITY_VIOLATION",
            reason: contentTypeResult.reason,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // 增强的输入验证检查
      const validationResult = this.validateAdvancedInputSecurity(req);
      if (!validationResult.isValid) {
        this.logger.warn(`恶意输入被拒绝: ${req.method} ${req.url}`, {
          reason: validationResult.reason,
          details: validationResult.details,
        });

        res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
          statusCode: HTTP_STATUS_CODES.BAD_REQUEST,
          message: "请求包含不安全的内容",
          error: "Bad Request",
          details: {
            type: "INPUT_SECURITY_VIOLATION",
            reason: validationResult.reason,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // 记录安全相关的请求信息
      this.logSecurityInfo(req);

      // 清理和验证输入
      this.sanitizeInput(req);

      // 设置安全响应头
      this.setSecurityHeaders(res);

      next();
    } catch (error: any) {
      this.logger.error(`安全中间件处理失败: ${error.message}`, {
        url: req.url,
        method: req.method,
        error: error.stack,
      });

      res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        statusCode: HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
        message: "内部服务器错误",
        timestamp: new Date().toISOString(),
      });
    }
  }

  private isRequestTooLarge(req: Request): boolean {
    const contentLength = req.get("content-length");
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength, 10);
      const maxSizeInBytes = SECURITY_LIMITS.MAX_PAYLOAD_SIZE_BYTES;
      return sizeInBytes > maxSizeInBytes;
    }
    return false;
  }

  private logSecurityInfo(req: Request) {
    const clientIP = HttpHeadersUtil.getClientIP(req);
    const userAgent = HttpHeadersUtil.getUserAgent(req);
    const method = req.method;
    const url = req.originalUrl;

    // 记录可疑的请求模式
    if (this.isSuspiciousRequest(req)) {
      this.logger.warn(`可疑请求检测: ${method} ${url} from ${clientIP}`, {
        userAgent,
        headers: HttpHeadersUtil.getSafeHeaders(req),
        body: this.sanitizeLogData(req.body),
      });
    }
  }

  private sanitizeInput(req: Request) {
    try {
      // 清理查询参数
      if (req.query && typeof req.query === "object") {
        const sanitizedQuery = this.sanitizeObject(req.query);
        // 使用 Object.assign 而不是直接赋值避免只读问题
        Object.keys(req.query).forEach((key) => delete req.query[key]);
        Object.assign(req.query, sanitizedQuery);
      }

      // 清理请求体
      if (req.body && typeof req.body === "object") {
        req.body = this.sanitizeObject(req.body);
      }

      // 清理路径参数
      if (req.params && typeof req.params === "object") {
        const sanitizedParams = this.sanitizeObject(req.params);
        Object.keys(req.params).forEach((key) => delete req.params[key]);
        Object.assign(req.params, sanitizedParams);
      }
    } catch (error) {
      // 如果清理过程出错，记录但不阻止请求
      this.logger.warn("输入清理过程中遇到错误，跳过清理", {
        error: error.message,
      });
    }
  }

  private sanitizeObject(obj: any): any {
    if (typeof obj !== "object" || obj === null) {
      return this.sanitizeValue(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // 清理键名
      const cleanKey = this.sanitizeKey(key);
      if (cleanKey) {
        sanitized[cleanKey] = this.sanitizeObject(value);
      }
    }

    return sanitized;
  }

  private sanitizeValue(value: any): any {
    if (typeof value === "string") {
      // XSS 防护
      let cleaned = xss(value, {
        whiteList: {}, // 不允许任何HTML标签
        stripIgnoreTag: true,
        stripIgnoreTagBody: ["script"],
      });

      // NoSQL 注入防护
      cleaned = this.preventNoSQLInjection(cleaned);

      // 清理特殊字符
      cleaned = this.sanitizeSpecialCharacters(cleaned);

      return cleaned;
    }

    return value;
  }

  private sanitizeKey(key: string): string {
    // 防止原型污染
    if (["__proto__", "constructor", "prototype"].includes(key)) {
      this.logger.warn(`检测到潜在的原型污染尝试: ${key}`);
      return null;
    }

    // 清理键名中的特殊字符
    return key.replace(/[^a-zA-Z0-9_-]/g, "");
  }

  private preventNoSQLInjection(value: string): string {
    // 防止NoSQL注入攻击
    const dangerous = [
      "$where",
      "$ne",
      "$in",
      "$nin",
      "$not",
      "$or",
      "$and",
      "$nor",
      "$exists",
      "$type",
      "$mod",
      "$regex",
      "$text",
      "$search",
      "javascript:",
      "eval(",
      "function(",
      "=>",
    ];

    let cleaned = value;
    dangerous.forEach((pattern) => {
      const regex = new RegExp(
        pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "gi",
      );
      if (regex.test(cleaned)) {
        this.logger.warn(`检测到NoSQL注入尝试: ${pattern} in ${value}`);
        cleaned = cleaned.replace(regex, "");
      }
    });

    return cleaned;
  }

  private sanitizeSpecialCharacters(value: string): string {
    // 移除或转义危险字符
    return value
      .replace(/[<>\"'%;()&+]/g, "") // 移除潜在的危险字符
      .trim() // 去除首尾空格
      .substring(0, SECURITY_LIMITS.MAX_STRING_LENGTH_SANITIZE); // 限制长度防止DoS攻击
  }

  private setSecurityHeaders(res: Response) {
    // 内容安全策略
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self'; " +
        "connect-src 'self'; " +
        "frame-ancestors 'none';",
    );

    // 防止点击劫持
    res.setHeader("X-Frame-Options", "DENY");

    // 防止MIME类型嗅探
    res.setHeader("X-Content-Type-Options", "nosniff");

    // XSS保护
    res.setHeader("X-XSS-Protection", "1; mode=block");

    // 强制HTTPS (生产环境)
    if (process.env.NODE_ENV === "production") {
      res.setHeader(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload",
      );
    }

    // 隐藏服务器信息
    res.removeHeader("X-Powered-By");
    res.setHeader("Server", "API Gateway");

    // 防止信息泄露
    res.setHeader("X-Download-Options", "noopen");
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

    // 权限策略
    res.setHeader(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()",
    );
  }

  private isSuspiciousRequest(req: Request): boolean {
    const suspiciousPatterns = [
      // SQL注入模式
      /(\bunion\b|\bselect\b|\binsert\b|\bdelete\b|\bdrop\b|\bupdate\b)/i,
      // XSS模式
      /<script|javascript:|data:text\/html|vbscript:|onload|onerror/i,
      // 路径遍历
      /\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\\|%252e%252e%252f/i,
      // NoSQL注入
      /\$where|\$ne|\$in|\$nin|\$regex/i,
      // 命令注入
      /;|\||&|`|\$\(|>\||<\||>|<|&&/,
    ];

    const url = req.originalUrl;
    const body = JSON.stringify(req.body);
    const query = JSON.stringify(req.query);

    return suspiciousPatterns.some(
      (pattern) =>
        pattern.test(url) || pattern.test(body) || pattern.test(query),
    );
  }

  private sanitizeLogData(data: any): any {
    if (!data) return data;

    const sanitized = JSON.parse(JSON.stringify(data));

    // 隐藏敏感字段
    const sensitiveFields = ["password", "token", "secret", "key", "auth"];

    const hideValue = (obj: any) => {
      if (typeof obj === "object" && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
          if (
            sensitiveFields.some((field) => key.toLowerCase().includes(field))
          ) {
            obj[key] = "***HIDDEN***";
          } else if (typeof value === "object") {
            hideValue(value);
          }
        }
      }
    };

    hideValue(sanitized);
    return sanitized;
  }

  /**
   * 内容类型安全验证
   */
  private validateContentTypeSecurity(req: Request): {
    isValid: boolean;
    reason?: string;
    details?: any;
  } {
    // 跳过GET、DELETE等没有请求体的方法
    if (HTTP_METHOD_ARRAYS.NO_BODY_METHODS.includes(req.method as any)) {
      return { isValid: true };
    }

    const contentType = req.get("content-type");

    if (!contentType) {
      // POST、PUT、PATCH等方法应该有Content-Type
      return {
        isValid: false,
        reason: "MISSING_CONTENT_TYPE",
        details: { method: req.method },
      };
    }

    // 检查危险的内容类型
    const dangerousContentTypes = [
      // 脚本内容类型
      "text/javascript",
      "application/javascript",
      "application/x-javascript",
      "text/ecmascript",
      "application/ecmascript",

      // HTML内容类型
      "text/html",
      "application/xhtml+xml",

      // 二进制内容类型（在API中通常不需要）
      "application/octet-stream",
      "application/x-msdownload",
      "application/x-executable",

      // XML内容类型（如果不需要的话）
      "text/xml",
      "application/xml",

      // 其他潜在危险的类型
      "image/svg+xml", // SVG可能包含脚本
    ];

    const normalizedContentType = contentType
      .toLowerCase()
      .split(";")[0]
      .trim();

    if (dangerousContentTypes.includes(normalizedContentType)) {
      return {
        isValid: false,
        reason: "DANGEROUS_CONTENT_TYPE",
        details: { contentType: normalizedContentType },
      };
    }

    // 检查危险的字符集
    if (contentType.includes("charset=")) {
      const dangerousCharsets = [
        "utf-7", // 可能绕过XSS过滤器
        "utf-32", // 可能导致解析问题
        "utf-1", // 过时且不安全
        "cesu-8", // 可能导致安全问题
      ];

      const charset = contentType
        .split("charset=")[1]
        ?.split(";")[0]
        ?.trim()
        .toLowerCase();
      if (charset && dangerousCharsets.includes(charset)) {
        return {
          isValid: false,
          reason: "DANGEROUS_CHARSET",
          details: { charset },
        };
      }
    }

    // 检查过长的Content-Type头（可能是DoS攻击）
    if (contentType.length > 200) {
      return {
        isValid: false,
        reason: "EXCESSIVE_CONTENT_TYPE_LENGTH",
        details: { length: contentType.length },
      };
    }

    return { isValid: true };
  }

  /**
   * 高级输入安全验证
   */
  private validateAdvancedInputSecurity(req: Request): {
    isValid: boolean;
    reason?: string;
    details?: any;
  } {
    try {
      // 检查URL中的恶意模式
      const urlCheck = this.checkMaliciousUrl(req.originalUrl);
      if (!urlCheck.isValid) {
        return urlCheck;
      }

      // 检查请求体复杂度
      if (req.body) {
        const bodyCheck = this.checkRequestBodyComplexity(req.body);
        if (!bodyCheck.isValid) {
          return bodyCheck;
        }

        // 检查Unicode安全问题
        const unicodeCheck = this.checkUnicodeSecurity(req.body);
        if (!unicodeCheck.isValid) {
          return unicodeCheck;
        }
      }

      // 检查查询参数
      if (req.query) {
        const queryCheck = this.checkQueryComplexity(req.query);
        if (!queryCheck.isValid) {
          return queryCheck;
        }
      }

      return { isValid: true };
    } catch (error) {
      // 如果验证过程本身出错，可能是复杂度攻击
      return {
        isValid: false,
        reason: "VALIDATION_COMPLEXITY_ATTACK",
        details: { error: error.message },
      };
    }
  }

  /**
   * 检查恶意URL模式
   */
  private checkMaliciousUrl(url: string): {
    isValid: boolean;
    reason?: string;
    details?: any;
  } {
    const maliciousPatterns = [
      // 路径遍历
      /\.\.[\/\\]/,
      /\.\.\\/,
      /\.\.%2f/i,
      /\.\.%5c/i,

      // 命令注入
      /;\s*cat\s/i,
      /;\s*ls\s/i,
      /\|\s*cat\s/i,
      /&\s*cat\s/i,

      // 过长的URL片段
      /[a-zA-Z0-9+\/=]{10000,}/, // 超长base64等
    ];

    for (const pattern of maliciousPatterns) {
      if (pattern.test(url)) {
        return {
          isValid: false,
          reason: "MALICIOUS_URL_PATTERN",
          details: { pattern: pattern.toString() },
        };
      }
    }

    return { isValid: true };
  }

  /**
   * 检查请求体复杂度
   */
  private checkRequestBodyComplexity(body: any): {
    isValid: boolean;
    reason?: string;
    details?: any;
  } {
    // 检查对象深度
    const maxDepth = SECURITY_LIMITS.MAX_OBJECT_DEPTH_COMPLEXITY; // 允许的最大嵌套深度
    const actualDepth = this.getObjectDepth(body);
    if (actualDepth > maxDepth) {
      return {
        isValid: false,
        reason: "EXCESSIVE_NESTING",
        details: { actualDepth, maxDepth },
      };
    }

    // 检查对象字段数量
    const maxFields = SECURITY_LIMITS.MAX_OBJECT_FIELDS_COMPLEXITY; // 允许的最大字段数
    const actualFields = this.countObjectFields(body);
    if (actualFields > maxFields) {
      return {
        isValid: false,
        reason: "JSON_BOMB",
        details: { actualFields, maxFields },
      };
    }

    // 检查字符串长度
    const maxStringLength = SECURITY_LIMITS.MAX_STRING_LENGTH_COMPLEXITY; // 单个字符串最大长度
    const longString = this.findLongString(body);
    if (longString && longString.length > maxStringLength) {
      return {
        isValid: false,
        reason: "EXCESSIVE_STRING_LENGTH",
        details: { length: longString.length, maxLength: maxStringLength },
      };
    }

    return { isValid: true };
  }

  /**
   * 检查Unicode安全问题
   */
  private checkUnicodeSecurity(obj: any): {
    isValid: boolean;
    reason?: string;
    details?: any;
  } {
    const dangerousUnicodePatterns = [
      // 空字节和控制字符
      /[\u0000-\u001F]/,
      // 零宽字符
      /[\u200B-\u200F\uFEFF]/,
      // 双向文本字符
      /[\u202A-\u202E\u2066-\u2069]/,
      // 私用区字符
      /[\uE000-\uF8FF]/,
      // 替换字符
      /[\uFFFD\uFFFE\uFFFF]/,
    ];

    const checkString = (str: string): boolean => {
      return dangerousUnicodePatterns.some((pattern) => pattern.test(str));
    };

    const checkValue = (value: any): boolean => {
      if (typeof value === "string") {
        return checkString(value);
      } else if (typeof value === "object" && value !== null) {
        if (Array.isArray(value)) {
          return value.some((item) => checkValue(item));
        } else {
          return Object.entries(value).some(
            ([key, val]) => checkString(key) || checkValue(val),
          );
        }
      }
      return false;
    };

    if (checkValue(obj)) {
      return {
        isValid: false,
        reason: "DANGEROUS_UNICODE_CHARACTERS",
        details: {
          patterns: dangerousUnicodePatterns.map((p) => p.toString()),
        },
      };
    }

    return { isValid: true };
  }

  /**
   * 检查查询参数复杂度
   */
  private checkQueryComplexity(query: any): {
    isValid: boolean;
    reason?: string;
    details?: any;
  } {
    const maxQueryParams = SECURITY_LIMITS.MAX_QUERY_PARAMS;
    const paramCount = Object.keys(query).length;

    if (paramCount > maxQueryParams) {
      return {
        isValid: false,
        reason: "EXCESSIVE_QUERY_PARAMETERS",
        details: { count: paramCount, maxAllowed: maxQueryParams },
      };
    }

    return { isValid: true };
  }

  /**
   * 计算对象嵌套深度
   */
  private getObjectDepth(obj: any, currentDepth: number = 0): number {
    if (currentDepth > SECURITY_LIMITS.MAX_RECURSION_DEPTH) {
      // 防止无限递归
      return currentDepth;
    }

    if (typeof obj !== "object" || obj === null) {
      return currentDepth;
    }

    if (Array.isArray(obj)) {
      return Math.max(
        currentDepth,
        ...obj.map((item) => this.getObjectDepth(item, currentDepth + 1)),
      );
    }

    const depths = Object.values(obj).map((value) =>
      this.getObjectDepth(value, currentDepth + 1),
    );
    return depths.length > 0 ? Math.max(...depths) : currentDepth;
  }

  /**
   * 计算对象字段总数
   */
  private countObjectFields(obj: any, visited: Set<any> = new Set()): number {
    if (typeof obj !== "object" || obj === null || visited.has(obj)) {
      return 0;
    }

    visited.add(obj);
    let count = 0;

    if (Array.isArray(obj)) {
      count = obj.length;
      for (const item of obj) {
        count += this.countObjectFields(item, visited);
      }
    } else {
      count = Object.keys(obj).length;
      for (const value of Object.values(obj)) {
        count += this.countObjectFields(value, visited);
      }
    }

    return count;
  }

  /**
   * 查找过长的字符串
   */
  private findLongString(
    obj: any,
    visited: Set<any> = new Set(),
  ): string | null {
    if (typeof obj === "string") {
      return obj;
    }

    if (typeof obj !== "object" || obj === null || visited.has(obj)) {
      return null;
    }

    visited.add(obj);

    const values = Array.isArray(obj) ? obj : Object.values(obj);
    for (const value of values) {
      const longString = this.findLongString(value, visited);
      if (
        longString &&
        longString.length > SECURITY_LIMITS.FIND_LONG_STRING_THRESHOLD
      ) {
        // 临时阈值
        return longString;
      }
    }

    return null;
  }
}

@Injectable()
export class CSRFMiddleware implements NestMiddleware {
  private readonly logger = createLogger(CSRFMiddleware.name);
  private readonly allowedOrigins: string[];

  constructor() {
    // 从环境变量加载允许的Origin
    this.allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",");
  }

  use(req: Request, res: Response, next: NextFunction) {
    // 检查是否禁用了CSRF保护
    if (process.env.DISABLE_CSRF === "true") {
      this.logger.debug("CSRF保护已禁用，跳过检查");
      next();
      return;
    }

    // 对于状态改变的操作检查CSRF
    if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
      // 检查Origin或Referer头
      if (!this.validateOrigin(req)) {
        this.logger.warn(`CSRF攻击检测: ${req.method} ${req.originalUrl}`, {
          origin: HttpHeadersUtil.getHeader(req, "Origin"),
          referer: HttpHeadersUtil.getHeader(req, "Referer"),
          userAgent: HttpHeadersUtil.getUserAgent(req),
        });

        res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
          statusCode: HTTP_STATUS_CODES.FORBIDDEN,
          message: "请求被拒绝: CSRF保护",
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    next();
  }

  private validateOrigin(req: Request): boolean {
    const origin = HttpHeadersUtil.getHeader(req, "Origin");
    const referer = HttpHeadersUtil.getHeader(req, "Referer");
    const host = HttpHeadersUtil.getHeader(req, "Host");

    // 如果是API Key认证的请求，跳过CSRF检查
    const { appKey, accessToken } = HttpHeadersUtil.getApiCredentials(req);
    if (appKey && accessToken) {
      return true;
    }

    // 检查Origin头
    if (origin) {
      try {
        const originUrl = new URL(origin);
        return originUrl.host === host;
      } catch {
        return false;
      }
    }

    // 检查Referer头
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        return refererUrl.host === host;
      } catch {
        return false;
      }
    }

    // 如果没有Origin和Referer头，拒绝请求
    return false;
  }
}

@Injectable()
export class RateLimitByIPMiddleware implements NestMiddleware {
  private readonly logger = createLogger(RateLimitByIPMiddleware.name);
  private readonly ipRequestCounts = new Map<
    string,
    { count: number; resetTime: number }
  >();

  // 支持环境变量配置的IP级别限速
  private readonly enabled = IP_RATE_LIMIT_CONFIG.ENABLED;
  private readonly maxRequestsPerMinute =
    IP_RATE_LIMIT_CONFIG.MAX_REQUESTS;
  private readonly windowMs = IP_RATE_LIMIT_CONFIG.WINDOW_MS;

  use(req: Request, res: Response, next: NextFunction) {
    // 如果IP级别限速被禁用，直接跳过
    if (!this.enabled) {
      this.logger.debug("IP级别频率限制已禁用，跳过检查");
      next();
      return;
    }

    // 使用安全的客户端标识符，防止绕过攻击
    const clientIdentifier = HttpHeadersUtil.getSecureClientIdentifier(req);
    const clientIP = HttpHeadersUtil.getClientIP(req); // 仅用于日志记录
    const now = Date.now();

    // 清理过期的记录
    this.cleanupExpiredRecords(now);

    // 获取或创建客户端记录（使用安全标识符）
    let clientRecord = this.ipRequestCounts.get(clientIdentifier);

    if (!clientRecord) {
      clientRecord = { count: 0, resetTime: now + this.windowMs };
      this.ipRequestCounts.set(clientIdentifier, clientRecord);
    }

    // 检查是否需要重置计数器
    if (now > clientRecord.resetTime) {
      clientRecord.count = 0;
      clientRecord.resetTime = now + this.windowMs;
    }

    // 增加请求计数
    clientRecord.count++;

    // 设置IP级别的专用响应头
    res.setHeader("X-IP-RateLimit-Limit", this.maxRequestsPerMinute);
    res.setHeader(
      "X-IP-RateLimit-Remaining",
      Math.max(0, this.maxRequestsPerMinute - clientRecord.count),
    );
    res.setHeader(
      "X-IP-RateLimit-Reset",
      Math.ceil(clientRecord.resetTime / 1000),
    );

    // 检查是否超过限制
    if (clientRecord.count > this.maxRequestsPerMinute) {
      this.logger.warn(
        `IP频率限制触发: ${clientIP}, 请求数: ${clientRecord.count}/${this.maxRequestsPerMinute}`,
        {
          ip: clientIP,
          clientIdentifier: clientIdentifier,
          requestCount: clientRecord.count,
          limit: this.maxRequestsPerMinute,
          userAgent: HttpHeadersUtil.getUserAgent(req),
          endpoint: req.originalUrl,
          suspiciousHeaders: this.checkSuspiciousHeaders(req),
        },
      );

      res.status(429).json({
        statusCode: 429,
        message: "请求过于频繁，请稍后重试",
        error: "Too Many Requests",
        details: {
          type: "IP_RATE_LIMIT",
          limit: this.maxRequestsPerMinute,
          current: clientRecord.count,
          remaining: 0,
          resetTime: clientRecord.resetTime,
          retryAfter: Math.ceil((clientRecord.resetTime - now) / 1000),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    this.logger.debug(
      `IP频率限制检查通过: ${clientIP}, 请求数: ${clientRecord.count}/${this.maxRequestsPerMinute}`,
    );

    next();
  }

  /**
   * 检查是否存在可疑的绕过头部
   */
  private checkSuspiciousHeaders(req: Request): string[] {
    const suspiciousHeaders = [];
    const bypassHeaders = [
      "x-forwarded-for",
      "x-real-ip",
      "x-originating-ip",
      "cf-connecting-ip",
      "x-cluster-client-ip",
    ];

    for (const header of bypassHeaders) {
      if (req.headers[header]) {
        suspiciousHeaders.push(header);
      }
    }

    return suspiciousHeaders;
  }

  private cleanupExpiredRecords(now: number) {
    for (const [clientIdentifier, record] of this.ipRequestCounts.entries()) {
      if (now > record.resetTime + this.windowMs) {
        this.ipRequestCounts.delete(clientIdentifier);
      }
    }
  }
}
