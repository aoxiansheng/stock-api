import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { getModelToken } from "@nestjs/mongoose";
import { Model } from "mongoose";

import {
  getAutoInitConfig,
  PRESET_FIELD_DEFINITIONS,
  SAMPLE_SYMBOL_MAPPINGS,
} from "@common/config/auto-init.config";
import { createLogger } from "@common/config/logger.config";

import {
  DataMappingRule,
  DataMappingRuleDocument,
} from "../core/data-mapper/schemas/data-mapper.schema";
import {
  SymbolMappingRule,
  SymbolMappingRuleDocument,
} from "../core/symbol-mapper/schemas/symbol-mapping-rule.schema";

// 🎯 复用 common 模块的日志配置

/**
 * 启动时自动初始化服务
 *
 * 在应用启动时自动检查并初始化必要的数据：
 * 1. 预设字段映射配置
 * 2. 基础数据配置
 * 3. 其他必要的初始化数据
 *
 * 对于已存在的数据会自动跳过，确保幂等性
 */
@Injectable()
export class AutoInitOnStartupService implements OnApplicationBootstrap {
  // 🎯 使用 common 模块的日志配置
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
        presetFields: this.config.presetFields,
        sampleData: this.config.sampleData,
        logLevel: this.config.options.logLevel,
      },
    });

    try {
      // 延迟获取 Model，确保 MongoDB 连接已建立
      await this.delay(1000);

      const dataMapperModel = this.moduleRef.get<
        Model<DataMappingRuleDocument>
      >(getModelToken(DataMappingRule.name), { strict: false });

      const symbolMapperModel = this.moduleRef.get<
        Model<SymbolMappingRuleDocument>
      >(getModelToken(SymbolMappingRule.name), { strict: false });

      // 1. 初始化股票报价预设字段（根据配置）
      if (this.config.presetFields.stockQuote) {
        await this.initStockQuotePresetFields(dataMapperModel);
      }

      // 2. 初始化股票基本信息预设字段（根据配置）
      if (this.config.presetFields.stockBasicInfo) {
        await this.initStockBasicInfoPresetFields(dataMapperModel);
      }

      // 3. 初始化示例符号映射（根据配置）
      if (this.config.sampleData.symbolMappings) {
        await this.initSampleSymbolMappings(symbolMapperModel);
      }

      this.logger.log("✅ 启动时自动初始化完成！");
    } catch (error) {
      this.logger.error("❌ 启动时自动初始化失败:", error);
      // 不抛出错误，避免影响应用启动
    }
  }

  /**
   * 初始化股票报价预设字段
   */
  private async initStockQuotePresetFields(
    dataMapperModel: Model<DataMappingRuleDocument>,
  ) {
    const stockQuoteConfig = PRESET_FIELD_DEFINITIONS.stockQuote;
    const configId = {
      provider: stockQuoteConfig.provider,
      ruleListType: stockQuoteConfig.ruleListType,
    };

    try {
      const existing = await dataMapperModel.findOne(configId);
      if (existing && this.config.options.skipExisting) {
        this.logger.debug("⏭️ 股票报价预设字段已存在，跳过初始化");
        return;
      }

      this.logger.log("📊 初始化股票报价预设字段...");

      const stockQuotePresetConfig = {
        name: stockQuoteConfig.name,
        description: stockQuoteConfig.description,
        provider: stockQuoteConfig.provider,
        ruleListType: stockQuoteConfig.ruleListType,
        version: "1.0.0",
        createdBy: "auto-init",
        isActive: true,
        metadata: {
          source: "LongPort API secu_quote response",
          dataTypeFilter: "stock-quote",
          usage: "target_field_suggestions",
          autoCreated: true,
          lastUpdated: new Date().toISOString(),
        },
        fieldMappings: stockQuoteConfig.fields.map((field) => ({
          sourceField: field.source,
          targetField: field.target,
          description: field.desc,
          ...(field.transform && { transform: field.transform }),
        })),
      };

      await dataMapperModel.create(stockQuotePresetConfig);
      this.logger.log(
        `✅ 股票报价预设字段初始化完成 (${stockQuoteConfig.fields.length}个字段)`,
      );
    } catch (error) {
      this.logger.warn("⚠️ 股票报价预设字段初始化失败:", error.message);
    }
  }

  /**
   * 初始化股票基本信息预设字段
   */
  private async initStockBasicInfoPresetFields(
    dataMapperModel: Model<DataMappingRuleDocument>,
  ) {
    const stockBasicInfoConfig = PRESET_FIELD_DEFINITIONS.stockBasicInfo;
    const configId = {
      provider: stockBasicInfoConfig.provider,
      ruleListType: stockBasicInfoConfig.ruleListType,
    };

    try {
      const existing = await dataMapperModel.findOne(configId);
      if (existing && this.config.options.skipExisting) {
        this.logger.debug("⏭️ 股票基本信息预设字段已存在，跳过初始化");
        return;
      }

      this.logger.log("📋 初始化股票基本信息预设字段...");

      const stockBasicInfoPresetConfig = {
        name: stockBasicInfoConfig.name,
        description: stockBasicInfoConfig.description,
        provider: stockBasicInfoConfig.provider,
        ruleListType: stockBasicInfoConfig.ruleListType,
        version: "1.0.0",
        createdBy: "auto-init",
        isActive: true,
        metadata: {
          source: "LongPort API secu_static_info response",
          dataTypeFilter: "stock-basic-info",
          usage: "target_field_suggestions",
          autoCreated: true,
          lastUpdated: new Date().toISOString(),
        },
        fieldMappings: stockBasicInfoConfig.fields.map((field) => ({
          sourceField: field.source,
          targetField: field.target,
          description: field.desc,
          ...(field.transform && { transform: field.transform }),
        })),
      };

      await dataMapperModel.create(stockBasicInfoPresetConfig);
      this.logger.log(
        `✅ 股票基本信息预设字段初始化完成 (${stockBasicInfoConfig.fields.length}个字段)`,
      );
    } catch (error) {
      this.logger.warn("⚠️ 股票基本信息预设字段初始化失败:", error.message);
    }
  }

  /**
   * 初始化示例符号映射（可选）
   */
  private async initSampleSymbolMappings(
    symbolMapperModel: Model<SymbolMappingRuleDocument>,
  ) {
    for (const mapping of SAMPLE_SYMBOL_MAPPINGS) {
      try {
        const existing = await symbolMapperModel.findOne({
          dataSourceName: mapping.dataSourceName,
        });
        if (existing && this.config.options.skipExisting) {
          this.logger.debug(
            `⏭️ 符号映射 ${mapping.dataSourceName} 已存在，跳过初始化`,
          );
          continue;
        }

        await symbolMapperModel.create({
          ...mapping,
          createdBy: "auto-init",
        });

        this.logger.log(`✅ 符号映射 ${mapping.dataSourceName} 初始化完成`);
      } catch (error) {
        this.logger.warn(
          `⚠️ 符号映射 ${mapping.dataSourceName} 初始化失败:`,
          error.message,
        );
      }
    }
  }

  /**
   * 延迟工具函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
