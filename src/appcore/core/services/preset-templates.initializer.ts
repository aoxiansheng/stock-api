import { Injectable, OnModuleInit } from "@nestjs/common";
import { createLogger } from "@common/logging/index";
import { PersistedTemplateService } from "@core/00-prepare/data-mapper/services/persisted-template.service";

/**
 * 预设模板启动初始化器
 * - 在模块初始化时持久化已内置的预设模板（BASIC_PRESET_TEMPLATES）
 * - 仅插入/更新模板，不生成映射规则
 * - 幂等：已存在则更新，不重复创建无意义数据
 */
@Injectable()
export class PresetTemplatesInitializer implements OnModuleInit {
  private readonly logger = createLogger(PresetTemplatesInitializer.name);

  constructor(
    private readonly persistedTemplateService: PersistedTemplateService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const summary = await this.persistedTemplateService.persistPresetTemplates();
      this.logger.log("预设模板持久化完成(启动阶段)", summary);

      // 在模板持久化后，初始化系统预设的映射规则（幂等：已存在则跳过）
      try {
        const ruleInit = await this.persistedTemplateService.initializePresetMappingRules();
        this.logger.log("预设映射规则初始化完成(启动阶段)", ruleInit);
      } catch (e: any) {
        this.logger.warn("预设映射规则初始化失败(启动阶段) — 将继续启动", { error: e?.message });
      }
    } catch (error: any) {
      this.logger.warn("预设模板持久化失败(启动阶段)，将继续启动流程", {
        error: error?.message,
      });
    }
  }
}
