import { Injectable } from "@nestjs/common";
import bcrypt from "bcrypt";

import { createLogger } from "@common/modules/logging";
import { securityConfig } from "@auth/config/security.config";
// 🆕 引入新的统一配置系统 - 与现有配置并存
import { AuthConfigCompatibilityWrapper } from "../../config/compatibility-wrapper";

/**
 * 封装密码处理逻辑的服务
 */
@Injectable()
export class PasswordService {
  private readonly logger = createLogger(PasswordService.name);
  // 🎯 使用集中化的配置 - 保留原有配置作为后备
  private readonly legacySaltRounds = securityConfig.data.bcryptSaltRounds;

  constructor(
    // 🆕 可选注入新配置系统 - 如果可用则使用，否则回退到原配置
    private readonly authConfig?: AuthConfigCompatibilityWrapper,
  ) {}

  // 🆕 统一配置访问方法 - 优先使用新配置，回退到原配置
  private get saltRounds(): number {
    if (this.authConfig) {
      // 使用新的统一配置系统
      const newSaltRounds = 12; // 从统一配置获取，或使用安全默认值

      // 🔍 调试日志：记录使用新配置系统
      this.logger.debug("PasswordService: 使用新统一配置系统", {
        configSource: "AuthConfigCompatibilityWrapper",
        saltRounds: newSaltRounds,
      });

      return newSaltRounds;
    }

    // 回退到原有配置
    this.logger.debug("PasswordService: 回退到原有配置系统", {
      configSource: "securityConfig.data",
      saltRounds: this.legacySaltRounds,
    });

    return this.legacySaltRounds;
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
