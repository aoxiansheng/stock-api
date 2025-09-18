/**
 * Alert模块常量验证工具类（简化版）
 * 🎯 启动时验证关键常量配置，确保应用能正常运行
 */

import { createLogger } from "@common/logging/index";
import { ALERT_DEFAULTS } from "../constants";

/**
 * 验证结果接口
 */
export interface ValidationResult {
  /** 是否通过验证 */
  isValid: boolean;
  /** 错误信息列表 */
  errors: string[];
  /** 警告信息列表 */
  warnings: string[];
}

/**
 * Alert常量基础验证函数
 */
export class AlertConstantsValidator {
  private static readonly logger = createLogger(AlertConstantsValidator.name);

  /**
   * 验证关键配置项
   * @returns 验证结果
   */
  static validateAll(): ValidationResult {
    this.logger.log("Alert模块常量验证...");

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 2. 验证默认值不为空
      if (!ALERT_DEFAULTS.severity) {
        errors.push("默认告警严重级别不能为空");
      }

      if (!ALERT_DEFAULTS.operator) {
        errors.push("默认比较操作符不能为空");
      }

      // 3. 验证关键数值合理性 - 保持基础验证逻辑
    } catch (error) {
      errors.push(`验证异常: ${error.message}`);
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
    };

    // 记录结果
    if (result.isValid) {
      this.logger.log("常量验证通过 ✅");
      if (warnings.length > 0) {
        this.logger.warn(`发现 ${warnings.length} 个警告`);
      }
    } else {
      this.logger.error(`验证失败，发现 ${errors.length} 个错误`);
      if (process.env.NODE_ENV === "production") {
        throw new Error("生产环境常量验证失败");
      }
    }

    return result;
  }
}
