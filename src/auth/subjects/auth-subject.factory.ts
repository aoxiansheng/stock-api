import { ForbiddenException } from "@nestjs/common";

import {
  AuthSubject,
  AuthSubjectType,
} from "../interfaces/auth-subject.interface";
import { ApiKey } from "../schemas/apikey.schema";
import { User } from "../schemas/user.schema";

import { ApiKeySubject } from "./api-key.subject";
import { JwtUserSubject } from "./jwt-user.subject";

/**
 * 权限主体工厂类
 *
 * 负责根据认证结果创建相应的权限主体实例。
 * 提供统一的权限主体创建接口，简化权限验证逻辑。
 *
 * @example
 * ```typescript
 * // 从请求中创建权限主体
 * const authSubject = AuthSubjectFactory.createFromRequest(request);
 *
 * // 从JWT用户创建
 * const jwtSubject = AuthSubjectFactory.createJwtUserSubject(user);
 *
 * // 从API Key创建
 * const apiKeySubject = AuthSubjectFactory.createApiKeySubject(apiKey);
 * ```
 */
export class AuthSubjectFactory {
  /**
   * 从请求对象中创建权限主体
   *
   * 根据请求中的用户信息自动判断认证类型并创建相应的权限主体。
   *
   * @param request Express请求对象
   * @returns 权限主体实例
   * @throws ForbiddenException 当无法识别认证类型时
   */
  static createFromRequest(request: any): AuthSubject {
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("请求中缺少认证信息");
    }

    // 判断是JWT用户还是API Key
    if (user.role !== undefined) {
      // JWT用户有role字段
      return this.createJwtUserSubject(user);
    } else if (
      user.permissions !== undefined &&
      Array.isArray(user.permissions)
    ) {
      // API Key有permissions数组字段
      return this.createApiKeySubject(user);
    } else {
      throw new ForbiddenException("无法识别的认证主体类型");
    }
  }

  /**
   * 创建JWT用户权限主体
   *
   * @param user 用户对象
   * @returns JWT用户权限主体
   */
  static createJwtUserSubject(user: User | any): JwtUserSubject {
    try {
      return new JwtUserSubject(user);
    } catch (error) {
      throw new ForbiddenException(`创建JWT用户权限主体失败: ${error.message}`);
    }
  }

  /**
   * 创建API Key权限主体
   *
   * @param apiKey API Key对象
   * @returns API Key权限主体
   */
  static createApiKeySubject(apiKey: ApiKey | any): ApiKeySubject {
    try {
      return new ApiKeySubject(apiKey);
    } catch (error) {
      throw new ForbiddenException(`创建API Key权限主体失败: ${error.message}`);
    }
  }

  /**
   * 检查权限主体是否有效
   *
   * @param subject 权限主体
   * @returns 是否有效
   */
  static isValidSubject(subject: AuthSubject): boolean {
    if (!subject || !subject.id) {
      return false;
    }

    // API Key需要额外检查有效性
    if (
      subject.type === AuthSubjectType.API_KEY &&
      subject instanceof ApiKeySubject
    ) {
      return subject.isValid();
    }

    return true;
  }

  /**
   * 获取权限主体的调试信息
   *
   * @param subject 权限主体
   * @returns 调试信息对象
   */
  static getDebugInfo(subject: AuthSubject): Record<string, any> {
    return {
      type: subject.type,
      id: subject.id,
      displayName: subject.getDisplayName(),
      permissionCount: subject.permissions.length,
      permissions: subject.permissions,
      metadata: subject.metadata,
      isValid: this.isValidSubject(subject),
    };
  }

  /**
   * 比较两个权限主体是否相同
   *
   * @param subject1 权限主体1
   * @param subject2 权限主体2
   * @returns 是否相同
   */
  static areEqual(subject1: AuthSubject, subject2: AuthSubject): boolean {
    return subject1.type === subject2.type && subject1.id === subject2.id;
  }
}
