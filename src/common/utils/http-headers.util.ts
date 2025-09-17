import { Request, Response } from "express";

/**
 * HTTP Headers 处理工具类
 * 提供统一的 header 提取、验证和标准化方法
 */
export class HttpHeadersUtil {
  /**
   * 安全地获取单个 header 值
   * 自动处理大小写、数组形式、空值等情况
   */
  static getHeader(req: Request, headerName: string): string | undefined {
    // 优先使用 Express 的 req.get() 方法（处理大小写和数组）
    if (typeof req.get === "function") {
      const value = req.get(headerName);
      if (!value) {
        return undefined;
      }
      return typeof value === "string" ? value : undefined;
    }

    // 回退到直接访问 headers（用于测试环境或非标准 request 对象）
    const headers = req.headers;
    if (!headers) {
      return undefined;
    }

    // 手动处理大小写不敏感的 header 查找
    const lowerHeaderName = headerName.toLowerCase();
    let value = headers[lowerHeaderName];

    // 如果没找到，尝试查找所有可能的大小写变体
    if (value === undefined) {
      for (const [key, val] of Object.entries(headers)) {
        if (key.toLowerCase() === lowerHeaderName) {
          value = val;
          break;
        }
      }
    }

    if (!value) {
      return undefined;
    }

    // 处理数组形式的 header 值，取第一个非空值（不进行trim）
    if (Array.isArray(value)) {
      const firstValue = value.find(
        (v) => typeof v === "string" && v.length > 0,
      );
      return firstValue || undefined;
    }

    // 处理字符串值（保持原始值，不进行trim）
    if (typeof value === "string") {
      return value.length > 0 ? value : undefined;
    }

    return undefined;
  }

  /**
   * 获取必需的 header 值，如果不存在则抛出错误
   */
  static getRequiredHeader(
    req: Request,
    headerName: string,
    errorMessage?: string,
  ): string {
    const value = this.getHeader(req, headerName);

    if (!value || value.length === 0) {
      throw new Error(errorMessage || `Missing required header: ${headerName}`);
    }

    return value;
  }

  /**
   * 获取多个 header 值（数组形式）
   */
  static getMultipleHeaders(req: Request, headerName: string): string[] {
    const rawValue = req.headers[headerName.toLowerCase()];

    if (!rawValue) {
      return [];
    }

    if (Array.isArray(rawValue)) {
      return rawValue.filter(
        (v) => typeof v === "string" && v.trim().length > 0,
      );
    }

    if (typeof rawValue === "string" && rawValue.trim().length > 0) {
      return [rawValue.trim()];
    }

    return [];
  }

  /**
   * 获取客户端 IP 地址
   * 按优先级顺序检查多个可能的 header
   */
  static getClientIP(req: Request): string {
    // 按优先级顺序检查
    const possibleHeaders = [
      "x-forwarded-for",
      "x-real-ip",
      "x-client-ip",
      "cf-connecting-ip", // Cloudflare
      "x-cluster-client-ip",
      "x-forwarded",
      "forwarded-for",
      "forwarded",
    ];

    for (const header of possibleHeaders) {
      const value = this.getHeader(req, header);
      if (value) {
        // x-forwarded-for 可能包含多个 IP，取第一个
        const ip = value.split(",")[0].trim();
        if (this.isValidIP(ip)) {
          return ip;
        }
      }
    }

    // 回退到连接信息
    return (
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      (req as any).ip ||
      "unknown"
    );
  }

  /**
   * 获取用于速率限制的安全客户端标识符
   * 组合多个特征以防止简单的绕过攻击
   */
  static getSecureClientIdentifier(req: Request): string {
    // 获取真实的连接IP（不依赖代理头部）
    const realIP =
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      (req as any).ip ||
      "unknown";

    // 获取User-Agent作为额外标识
    const userAgent = this.getUserAgent(req);

    // 检查是否在可信代理环境中
    // 支持生产环境或明确启用代理信任的测试环境
    const trustedProxyEnv =
      (process.env.NODE_ENV === "production" &&
        process.env.TRUSTED_PROXY === "true") ||
      process.env.TRUSTED_PROXY === "true" ||
      (process.env.NODE_ENV?.startsWith("test") &&
        process.env.ALLOW_PROXY_HEADERS_IN_TEST === "true");

    let clientIP = realIP;

    // 只在可信环境中使用代理头部
    if (trustedProxyEnv) {
      const forwardedFor = this.getHeader(req, "x-forwarded-for");
      if (forwardedFor) {
        const ip = forwardedFor.split(",")[0].trim();
        if (this.isValidIP(ip) && this.isTrustedIP(realIP)) {
          clientIP = ip;
        }
      }
    }

    // 组合标识符，增加绕过难度
    const identifier = `${clientIP}:${this.hashUserAgent(userAgent)}`;

    return identifier;
  }

  /**
   * 检查IP是否来自可信代理
   */
  private static isTrustedIP(ip: string): boolean {
    // 定义可信代理IP范围（例如：负载均衡器、CDN等）
    const trustedRanges = (process.env.TRUSTED_PROXY_IPS || "")
      .split(",")
      .map((range) => range.trim())
      .filter((range) => range.length > 0);

    if (trustedRanges.length === 0) {
      return false;
    }

    // 简单匹配（生产环境应使用更复杂的IP范围匹配）
    return trustedRanges.some((range) => ip.startsWith(range));
  }

  /**
   * 对User-Agent进行哈希处理
   */
  private static hashUserAgent(userAgent: string): string {
    // 简单哈希（生产环境建议使用更安全的哈希算法）
    let hash = 0;
    for (let i = 0; i < userAgent.length; i++) {
      const char = userAgent.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 获取 API 认证凭证
   */
  static getApiCredentials(req: Request): {
    appKey?: string;
    accessToken?: string;
  } {
    return {
      appKey: this.getHeader(req, "x-app-key"),
      accessToken: this.getHeader(req, "x-access-token"),
    };
  }

  /**
   * 验证 API 认证凭证是否完整且格式正确
   */
  static validateApiCredentials(req: Request): {
    appKey: string;
    accessToken: string;
  } {
    const { appKey, accessToken } = this.getApiCredentials(req);

    if (!appKey || !accessToken) {
      throw new Error("缺少API凭证");
    }

    // 检测API凭证中的空格或其他无效字符
    if (this.hasInvalidCharacters(appKey)) {
      throw new Error("API凭证格式无效：App Key包含空格或无效字符");
    }

    if (this.hasInvalidCharacters(accessToken)) {
      throw new Error("API凭证格式无效：Access Token包含空格或无效字符");
    }

    return { appKey, accessToken };
  }

  /**
   * 检查字符串是否包含无效字符（空格、制表符、换行符等）
   */
  private static hasInvalidCharacters(value: string): boolean {
    // 检查是否包含空白字符（空格、制表符、换行符等）
    return /\s/.test(value);
  }

  /**
   * 检查是否为有效的 IP 地址
   */
  private static isValidIP(ip: string): boolean {
    // 简单的 IP 格式验证
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    return (
      ipv4Regex.test(ip) ||
      ipv6Regex.test(ip) ||
      ip === "::1" ||
      ip === "localhost"
    );
  }

  /**
   * 获取用户代理信息
   */
  static getUserAgent(req: Request): string {
    return this.getHeader(req, "user-agent") || "Unknown";
  }

  /**
   * 获取内容类型
   */
  static getContentType(req: Request): string | undefined {
    return this.getHeader(req, "content-type");
  }

  /**
   * 检查是否为 JSON 内容类型
   */
  static isJsonContent(req: Request): boolean {
    const contentType = this.getContentType(req);
    return contentType?.includes("application/json") || false;
  }

  /**
   * 获取授权 header
   */
  static getAuthorization(req: Request): string | undefined {
    return this.getHeader(req, "authorization");
  }

  /**
   * 获取 Bearer Token
   */
  static getBearerToken(req: Request): string | undefined {
    const auth = this.getAuthorization(req);
    if (auth?.startsWith("Bearer ")) {
      return auth.substring(7).trim();
    }
    return undefined;
  }

  /**
   * 安全地记录 headers（过滤敏感信息）
   */
  static getSafeHeaders(req: Request): Record<string, any> {
    const sensitiveHeaders = [
      "authorization",
      "x-access-token",
      "x-api-key",
      "cookie",
      "set-cookie",
    ];

    const safeHeaders: Record<string, any> = {};

    for (const [key, value] of Object.entries(req.headers)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        safeHeaders[key] = "[FILTERED]";
      } else {
        safeHeaders[key] = value;
      }
    }

    return safeHeaders;
  }

  /**
   * 设置标准的安全响应头
   */
  static setSecurityHeaders(res: Response): void {
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

  /**
   * 获取内容长度
   */
  static getContentLength(req: Request): string | undefined {
    return this.getHeader(req, "content-length");
  }
}
