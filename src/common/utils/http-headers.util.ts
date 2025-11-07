import type { Request, Response } from "express";
import { isIP } from "net";

/**
 * HTTP Headers 处理工具类
 * 提供统一的 header 提取、验证和标准化方法
 */
export class HttpHeadersUtil {
  /**
   * 安全地获取单个 header 值（业务所需）
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
   * 校验 IP 地址（支持 IPv4/IPv6）
   */
  static isValidIP(ip: string): boolean {
    try {
      return isIP(ip) !== 0;
    } catch {
      return false;
    }
  }

  /**
   * 获取用户代理信息
   */
  static getUserAgent(req: Request): string {
    return this.getHeader(req, "user-agent") || "Unknown";
  }
}
