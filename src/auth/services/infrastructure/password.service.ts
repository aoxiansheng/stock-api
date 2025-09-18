import { Injectable, Inject } from "@nestjs/common";
import bcrypt from "bcrypt";

import { createLogger } from "@common/modules/logging";
// 使用统一配置系统
import type { AuthUnifiedConfigInterface } from "../../config/auth-unified.config";

/**
 * 封装密码处理逻辑的服务
 */
@Injectable()
export class PasswordService {
  private readonly logger = createLogger(PasswordService.name);

  constructor(
    @Inject("authUnified")
    private readonly authConfig: AuthUnifiedConfigInterface,
  ) {}

  // 统一配置访问方法
  private get saltRounds(): number {
    return this.authConfig.limits.bcryptSaltRounds;
  }

  /**
   * 对密码进行哈希处理
   * @param password 明文密码
   * @returns 哈希后的密码
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * 比较明文密码和哈希密码是否匹配
   * @param plain 明文密码
   * @param hash 哈希后的密码
   * @returns 是否匹配
   */
  async comparePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
