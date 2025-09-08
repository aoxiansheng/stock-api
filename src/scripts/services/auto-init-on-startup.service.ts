import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";

import { getAutoInitConfig } from "@config/auto-init.config";
import { createLogger } from "@app/config/logger.config";
import { PersistedTemplateService } from "../../core/00-prepare/data-mapper/services/persisted-template.service";
import { AlertConstantsValidator } from "../../alert/utils/constants-validator.util";

/**
 * 简化的启动时自动初始化服务
 *
 * 在应用启动时自动检查并初始化必要的数据：
 * 1. 基础预设模板
 * 2. 其他必要的初始化数据
 *
 * 对于已存在的数据会自动跳过，确保幂等性
 */
@Injectable()
export class AutoInitOnStartupService implements OnApplicationBootstrap {
  private readonly logger = createLogger(AutoInitOnStartupService.name);
  private readonly config = getAutoInitConfig();

  constructor(private readonly moduleRef: ModuleRef) {}

  async onApplicationBootstrap() {
    // 检查是否在测试环境或禁用了自动初始化
    if (
      !this.config.enabled ||
      process.env.DISABLE_AUTO_INIT === "true" ||
      process.env.NODE_ENV === "test"
    ) {
      this.logger.log("⏭️ 自动初始化已禁用，跳过启动初始化");
      return;
    }

    this.logger.log("🚀 开始启动时自动初始化...", {
      config: {
        enabled: this.config.enabled,
      },
    });

    try {
      // 验证常量定义
      await this.validateConstants();

      // 初始化预设模板
      await this.initializePresetTemplates();

      // 初始化预设映射规则
      await this.initializePresetMappingRules();

      this.logger.log("✅ 启动时自动初始化完成");
    } catch (error) {
      this.logger.error("❌ 启动时自动初始化失败", {
        error: error.message,
        stack: error.stack,
      });

      // 不抛出异常，避免影响应用启动
    }
  }

  /**
   * 🚀 初始化预设模板
   */
  private async initializePresetTemplates(): Promise<void> {
    try {
      this.logger.log("📋 开始初始化预设模板...");

      const persistedTemplateService = this.moduleRef.get(
        PersistedTemplateService,
        { strict: false },
      );

      if (!persistedTemplateService) {
        this.logger.warn(
          "⚠️ PersistedTemplateService 未找到，跳过预设模板初始化",
        );
        return;
      }

      const result = await persistedTemplateService.persistPresetTemplates();

      this.logger.log("✅ 预设模板初始化完成", {
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        details: result.details.slice(0, 5), // 只显示前5个详情，避免日志过长
      });
    } catch (error) {
      this.logger.error("❌ 预设模板初始化失败", {
        error: error.message,
        operation: "initializePresetTemplates",
      });
    }
  }

  /**
   * 🎯 初始化预设映射规则
   */
  private async initializePresetMappingRules(): Promise<void> {
    try {
      this.logger.log("🎯 开始初始化预设映射规则...");

      const persistedTemplateService = this.moduleRef.get(
        PersistedTemplateService,
        { strict: false },
      );

      if (!persistedTemplateService) {
        this.logger.warn(
          "⚠️ PersistedTemplateService 未找到，跳过预设映射规则初始化",
        );
        return;
      }

      const result =
        await persistedTemplateService.initializePresetMappingRules();

      this.logger.log("✅ 预设映射规则初始化完成", {
        created: result.created,
        skipped: result.skipped,
        failed: result.failed,
        details: result.details.slice(0, 5), // 只显示前5个详情，避免日志过长
      });
    } catch (error) {
      this.logger.error("❌ 预设映射规则初始化失败", {
        error: error.message,
        operation: "initializePresetMappingRules",
      });
    }
  }

  /**
   * 🔍 验证常量定义
   * 在应用启动时检查常量重复和一致性
   */
  private async validateConstants(): Promise<void> {
    try {
      this.logger.log("🔍 开始验证常量定义...");
      
      const validationResult = AlertConstantsValidator.validateAll();
      
      if (validationResult.isValid) {
        this.logger.log("✅ 常量验证通过", {
          errors: validationResult.errors.length,
          warnings: validationResult.warnings.length
        });
      } else {
        this.logger.warn("⚠️ 常量验证发现问题", {
          errors: validationResult.errors.length,
          warnings: validationResult.warnings.length
        });
        
        // 记录错误和警告
        validationResult.errors.forEach(error => {
          this.logger.error(`❌ 常量错误: ${error}`);
        });
        
        validationResult.warnings.forEach(warning => {
          this.logger.warn(`⚠️ 常量警告: ${warning}`);
        });
      }
      
    } catch (error) {
      this.logger.error("❌ 常量验证失败", {
        error: error.message,
        operation: "validateConstants",
      });
    }
  }

  /**
   * 💡 获取初始化状态信息（供调试使用）
   */
  async getInitializationStatus(): Promise<{
    autoInitEnabled: boolean;
    environment: string;
    services: {
      persistedTemplateService: boolean;
    };
  }> {
    return {
      autoInitEnabled: this.config.enabled,
      environment: process.env.NODE_ENV || "development",
      services: {
        persistedTemplateService: !!this.moduleRef.get(
          PersistedTemplateService,
          { strict: false },
        ),
      },
    };
  }
}
