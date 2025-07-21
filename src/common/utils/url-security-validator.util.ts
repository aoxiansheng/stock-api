import { BadRequestException } from '@nestjs/common';

/**
 * URL安全验证工具类 - SSRF防护
 * 用于验证URL是否安全，防止SSRF攻击
 */
export class URLSecurityValidator {
  // 危险协议黑名单
  private static readonly DANGEROUS_PROTOCOLS = [
    'file:', 'ftp:', 'gopher:', 'dict:', 'sftp:', 'ldap:', 'ldaps:', 'tftp:', 
    'jar:', 'netdoc:', 'mailto:', 'news:', 'imap:', 'telnet:'
  ];

  // 内部IP范围
  private static readonly INTERNAL_IP_PATTERNS = [
    /^127\./,           // 127.0.0.0/8 - Loopback
    /^10\./,            // 10.0.0.0/8 - Private Class A
    /^172\.(1[6-9]|2\d|3[01])\./,  // 172.16.0.0/12 - Private Class B
    /^192\.168\./,      // 192.168.0.0/16 - Private Class C
    /^169\.254\./,      // 169.254.0.0/16 - Link-local
    /^0\./,             // 0.0.0.0/8 - Current network
    /^224\./,           // 224.0.0.0/4 - Multicast
    /^240\./,           // 240.0.0.0/4 - Reserved
    /^255\./,           // 255.0.0.0/8 - Broadcast
  ];

  // 危险主机名
  private static readonly DANGEROUS_HOSTNAMES = [
    'localhost',
    'metadata.google.internal',
    'metadata',
    'instance-data',
    'checkip.amazonaws.com',
    'icanhazip.com',
    'ipinfo.io',
    'httpbin.org',
    'requestb.in',
    'postb.in'
  ];

  // 允许的外部域名白名单（可根据需要配置）
  private static readonly ALLOWED_EXTERNAL_DOMAINS = [
    'hooks.slack.com',
    'oapi.dingtalk.com',
    // 可以根据业务需要添加其他可信域名
  ];

  /**
   * 验证URL是否安全
   * @param url 待验证的URL
   * @returns 验证结果
   */
  static validateURL(url: string): { valid: boolean; error?: string } {
    try {
      const parsedUrl = new URL(url);

      // 检查协议
      if (this.DANGEROUS_PROTOCOLS.some(protocol => 
        parsedUrl.protocol.toLowerCase().startsWith(protocol)
      )) {
        return { valid: false, error: `不允许的协议: ${parsedUrl.protocol}` };
      }

      // 只允许 HTTP(S)
      if (!['http:', 'https:'].includes(parsedUrl.protocol.toLowerCase())) {
        return { valid: false, error: `仅支持HTTP和HTTPS协议` };
      }

      // 检查主机名
      const hostname = parsedUrl.hostname.toLowerCase();
      
      // 检查危险主机名
      if (this.DANGEROUS_HOSTNAMES.includes(hostname)) {
        return { valid: false, error: `不允许访问的主机: ${hostname}` };
      }

      // 检查内部IP
      if (this.INTERNAL_IP_PATTERNS.some(pattern => pattern.test(hostname))) {
        return { valid: false, error: `不允许访问内部IP地址: ${hostname}` };
      }

      // 检查AWS元数据服务
      if (hostname === '169.254.169.254') {
        return { valid: false, error: '不允许访问AWS元数据服务' };
      }

      // 检查是否为IP地址
      if (this.isIPAddress(hostname)) {
        return { valid: false, error: `不允许直接访问IP地址: ${hostname}` };
      }

      // 检查外部域名白名单
      const isAllowedDomain = this.ALLOWED_EXTERNAL_DOMAINS.some(domain => 
        hostname === domain || hostname.endsWith('.' + domain)
      );

      if (!isAllowedDomain) {
        return { valid: false, error: `不允许访问外部域名: ${hostname}` };
      }

      // 检查端口范围（避免端口扫描）
      const port = parsedUrl.port;
      if (port) {
        const portNum = parseInt(port);
        if (portNum < 80 || portNum > 65535) {
          return { valid: false, error: `端口范围无效: ${port}` };
        }
        
        // 只允许标准Web端口
        if (![80, 443, 8080, 8443].includes(portNum)) {
          return { valid: false, error: `不允许的端口: ${port}` };
        }
      }

      // 检查URL路径中的可疑模式
      const path = parsedUrl.pathname;
      if (this.containsSuspiciousPatterns(path)) {
        return { valid: false, error: 'URL路径包含可疑模式' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: `无效的URL格式: ${error.message}` };
    }
  }

  /**
   * 检查是否为IP地址
   * @param hostname 主机名
   * @returns 是否为IP地址
   */
  private static isIPAddress(hostname: string): boolean {
    // IPv4 检查
    const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    if (ipv4Pattern.test(hostname)) {
      const parts = hostname.split('.').map(part => parseInt(part));
      return parts.every(part => part >= 0 && part <= 255);
    }

    // IPv6 检查（简化）
    const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv6Pattern.test(hostname);
  }

  /**
   * 检查URL路径中的可疑模式
   * @param path URL路径
   * @returns 是否包含可疑模式
   */
  private static containsSuspiciousPatterns(path: string): boolean {
    const suspiciousPatterns = [
      /\.\./,           // 路径遍历
      /\/etc\//,        // 系统文件
      /\/proc\//,       // 系统进程
      /\/dev\//,        // 设备文件
      /\/var\//,        // 变量文件
      /\/tmp\//,        // 临时文件
      /meta-data/,      // 元数据服务
      /user-data/,      // 用户数据
      /latest\//,       // AWS元数据路径
    ];

    return suspiciousPatterns.some(pattern => pattern.test(path.toLowerCase()));
  }

  /**
   * 验证URL安全性并在失败时抛出异常
   * @param url 待验证的URL
   * @throws BadRequestException 当URL不安全时抛出异常
   */
  static validateURLOrThrow(url: string): void {
    const result = this.validateURL(url);
    if (!result.valid) {
      throw new BadRequestException(`URL安全检查失败: ${result.error}`);
    }
  }
} 