/**
 * 通用验证工具类
 * 🎯 提供编程式验证方法，可在任何地方使用
 * 
 * @description 从 validation.constants.ts 迁移的通用验证工具类
 */

/**
 * 验证工具类
 * ✅ 保留 - 这是真正的通用工具类，不依赖可配置参数
 */
export class ValidationLimitsUtil {
  /**
   * 验证字符串长度
   */
  static validateStringLength(
    value: string,
    maxLength: number,
    fieldName: string = "field",
  ): { valid: boolean; error?: string } {
    if (value.length > maxLength) {
      return {
        valid: false,
        error: `${fieldName} 长度不能超过 ${maxLength} 个字符，当前长度: ${value.length}`,
      };
    }
    return { valid: true };
  }

  /**
   * 验证数值范围
   */
  static validateNumberRange(
    value: number,
    min: number,
    max: number,
    fieldName: string = "field",
  ): { valid: boolean; error?: string } {
    if (value < min || value > max) {
      return {
        valid: false,
        error: `${fieldName} 必须在 ${min} 到 ${max} 之间，当前值: ${value}`,
      };
    }
    return { valid: true };
  }

  /**
   * 验证数组长度
   */
  static validateArrayLength(
    array: any[],
    maxLength: number,
    fieldName: string = "array",
  ): { valid: boolean; error?: string } {
    if (array.length > maxLength) {
      return {
        valid: false,
        error: `${fieldName} 长度不能超过 ${maxLength} 个元素，当前长度: ${array.length}`,
      };
    }
    return { valid: true };
  }

  /**
   * 验证邮箱格式（复用验证器逻辑）
   * 🎯 提供编程式邮箱验证，复用装饰器中的验证逻辑
   */
  static validateEmailFormat(
    email: string,
    fieldName: string = "邮箱"
  ): { valid: boolean; error?: string } {
    if (!email || typeof email !== "string") {
      return {
        valid: false,
        error: `${fieldName} 必须是有效的字符串`,
      };
    }

    // 邮箱格式正则表达式（与 @IsValidEmail 装饰器保持一致）
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    // 基本格式验证
    if (!emailPattern.test(email)) {
      return {
        valid: false,
        error: `${fieldName} 格式不正确: ${email}`,
      };
    }

    // 长度限制 (RFC 5321 标准)
    const EMAIL_MAX_LENGTH = 254;
    if (email.length > EMAIL_MAX_LENGTH) {
      return {
        valid: false,
        error: `${fieldName} 长度不能超过 ${EMAIL_MAX_LENGTH} 个字符，当前长度: ${email.length}`,
      };
    }

    // 本地部分长度限制（@符号前）
    const localPart = email.split("@")[0];
    if (localPart.length > 64) {
      return {
        valid: false,
        error: `${fieldName} 本地部分长度不能超过 64 个字符`,
      };
    }

    return { valid: true };
  }

  /**
   * 验证URL格式（复用验证器逻辑）
   * 🎯 提供编程式URL验证，复用装饰器中的验证逻辑
   */  
  static validateUrlFormat(
    url: string,
    fieldName: string = "URL"
  ): { valid: boolean; error?: string } {
    if (!url || typeof url !== "string") {
      return {
        valid: false,
        error: `${fieldName} 必须是有效的字符串`,
      };
    }

    try {
      const urlObj = new URL(url);

      // 只允许HTTP和HTTPS协议（与 @IsValidUrl 装饰器保持一致）
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        return {
          valid: false,
          error: `${fieldName} 只支持 HTTP 或 HTTPS 协议: ${url}`,
        };
      }

      // 检查主机名
      if (!urlObj.hostname || urlObj.hostname.length === 0) {
        return {
          valid: false,
          error: `${fieldName} 缺少有效主机名: ${url}`,
        };
      }

      // URL长度限制 (常见浏览器限制)
      const URL_MAX_LENGTH = 2083;
      if (url.length > URL_MAX_LENGTH) {
        return {
          valid: false,
          error: `${fieldName} 长度不能超过 ${URL_MAX_LENGTH} 个字符，当前长度: ${url.length}`,
        };
      }

      // 基本格式验证（与 @IsValidUrl 装饰器保持一致）
      const urlPattern = /^https?:\/\/[\w\-]+(\.[\w\-]+)+([\\w\-\.,@?^=%&:\/~\+#]*[\w\-\@?^=%&\/~\+#])?$/;
      if (!urlPattern.test(url)) {
        return {
          valid: false,
          error: `${fieldName} 格式不正确: ${url}`,
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `${fieldName} 格式不正确: ${url}`,
      };
    }
  }
}