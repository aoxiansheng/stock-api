/**
 * API Key 工具函数
 * 提供API Key相关的工具方法和辅助函数
 */
import { v4 as uuidv4 } from "uuid";
import {
  API_KEY_FORMAT,
  API_KEY_VALIDATION,
} from "../constants/auth-semantic.constants";
import { StringValidationUtil } from "../../common/utils/string-validation.util";

/**
 * API Key 工具函数类
 * 包含处理API Key的各种实用方法
 */
export class ApiKeyUtil {
  /**
   * 生成应用键
   * @returns 应用键字符串
   */
  static generateAppKey(): string {
    const uuid = uuidv4();
    return `${API_KEY_FORMAT.PREFIX}${uuid}`;
  }

  /**
   * 生成访问令牌
   * @param length 令牌长度
   * @returns 访问令牌字符串
   */
  static generateAccessToken(
    length: number = API_KEY_FORMAT.DEFAULT_LENGTH,
  ): string {
    return StringValidationUtil.generateRandomString({
      length,
      charset: API_KEY_FORMAT.CHARSET,
    });
  }

  /**
   * 验证应用键格式
   * @param appKey 应用键
   * @returns 是否有效
   */
  static isValidAppKey(appKey: string): boolean {
    return StringValidationUtil.matchesPattern(
      appKey,
      API_KEY_FORMAT.APP_KEY_PATTERN,
    );
  }

  /**
   * 验证访问令牌格式
   * @param accessToken 访问令牌
   * @returns 是否有效
   */
  static isValidAccessToken(accessToken: string): boolean {
    return StringValidationUtil.matchesPattern(
      accessToken,
      API_KEY_FORMAT.ACCESS_TOKEN_PATTERN,
    );
  }

  /**
   * 验证API Key名称格式
   * @param name 名称
   * @returns 是否有效
   */
  static isValidName(name: string): boolean {
    return StringValidationUtil.isValidName(name, {
      minLength: API_KEY_VALIDATION.MIN_NAME_LENGTH,
      maxLength: API_KEY_VALIDATION.MAX_NAME_LENGTH,
      pattern: API_KEY_VALIDATION.NAME_PATTERN,
      allowEmpty: false,
      allowNullish: false,
    });
  }

  /**
   * 检查API Key是否过期
   * @param expiresAt 过期时间
   * @returns 是否过期
   */
  static isExpired(expiresAt: Date | null): boolean {
    if (!expiresAt) return false;
    return expiresAt < new Date();
  }

  /**
   * 检查API Key是否即将过期
   * @param expiresAt 过期时间
   * @param warningDays 警告天数
   * @returns 是否即将过期
   */
  static isNearExpiry(
    expiresAt: Date | null,
    warningDays: number = 7, // Default warning period: 7 days
  ): boolean {
    if (!expiresAt) return false;
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + warningDays);
    return expiresAt <= warningDate;
  }

  /**
   * 计算使用率百分比
   * @param current 当前使用量
   * @param limit 限制量
   * @returns 使用率百分比
   */
  static calculateUsagePercentage(current: number, limit: number): number {
    if (limit <= 0) return 0;
    return Math.round((current / limit) * 100);
  }

  /**
   * 生成默认API Key名称
   * @param index 索引
   * @returns 默认名称
   */
  static generateDefaultName(index: number = 1): string {
    return `API Key ${index}`; // Default name prefix
  }

  /**
   * 清理访问令牌（用于日志记录）
   * @param accessToken 访问令牌
   * @returns 清理后的令牌
   */
  static sanitizeAccessToken(accessToken: string): string {
    return StringValidationUtil.sanitizeString(accessToken, 4, 4, "*");
  }
}
