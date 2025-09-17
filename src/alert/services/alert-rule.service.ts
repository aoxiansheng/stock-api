/**
 * Alert规则管理服务
 * 🎯 专门负责告警规则的CRUD操作和验证
 *
 * @description 单一职责：规则管理，不涉及评估和执行逻辑
 * @author Claude Code Assistant
 * @date 2025-09-10
 */

import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";

import { createLogger } from "@common/logging/index";
import {
  BUSINESS_ERROR_MESSAGES,
  VALIDATION_MESSAGES,
} from "@common/constants/semantic/error-messages.constants";
import { DatabaseValidationUtils } from "@common/utils/database.utils";
import { AlertRuleRepository } from "../repositories/alert-rule.repository";
import { CreateAlertRuleDto, UpdateAlertRuleDto } from "../dto";
import { IAlertRule } from "../interfaces";
import { AlertRuleValidator } from "../validators/alert-rule.validator";

@Injectable()
export class AlertRuleService {
  private readonly logger = createLogger("AlertRuleService");

  constructor(
    private readonly alertRuleRepository: AlertRuleRepository,
    private readonly ruleValidator: AlertRuleValidator,
  ) {}

  /**
   * 创建告警规则
   */
  async createRule(createRuleDto: CreateAlertRuleDto): Promise<IAlertRule> {
    const operation = "CREATE_RULE";

    this.logger.debug("创建告警规则", {
      operation,
      ruleName: createRuleDto.name,
    });

    // 验证规则配置
    const tempRuleForValidation: IAlertRule = {
      ...createRuleDto,
      id: "temp",
      channels:
        createRuleDto.channels?.map((channel) => ({
          ...channel,
          type: channel.type as any, // Type conversion for validation
        })) || [],
    } as IAlertRule;

    const validation = this.ruleValidator.validateRule(tempRuleForValidation);

    if (!validation.valid) {
      const errorMsg = `规则验证失败: ${validation.errors.join(", ")}`;
      this.logger.warn(errorMsg, { operation, errors: validation.errors });
      throw new BadRequestException(
        errorMsg || VALIDATION_MESSAGES.VALIDATION_FAILED,
      );
    }

    try {
      // Convert DTO to internal format
      const ruleData = {
        ...createRuleDto,
        id: this.generateRuleId(),
        // Convert AlertNotificationChannelDto to internal format
        channels:
          createRuleDto.channels?.map((channel) => ({
            ...channel,
            type: channel.type, // Alert domain channel type
          })) || [],
      };

      const savedRule = await this.alertRuleRepository.create(ruleData as any);

      this.logger.log("告警规则创建成功", {
        operation,
        ruleId: savedRule.id,
        ruleName: createRuleDto.name,
      });

      return savedRule;
    } catch (error) {
      this.logger.error("告警规则创建失败", {
        operation,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 更新告警规则
   */
  async updateRule(
    ruleId: string,
    updateRuleDto: UpdateAlertRuleDto,
  ): Promise<IAlertRule> {
    const operation = "UPDATE_RULE";

    // 验证规则ID格式
    DatabaseValidationUtils.validateObjectId(ruleId, "告警规则ID");

    this.logger.debug("更新告警规则", {
      operation,
      ruleId,
      updateFields: Object.keys(updateRuleDto),
    });

    try {
      // 获取现有规则进行验证
      const existingRule = await this.alertRuleRepository.findById(ruleId);
      if (!existingRule) {
        throw new NotFoundException(BUSINESS_ERROR_MESSAGES.RESOURCE_NOT_FOUND);
      }

      // 如果有需要验证的字段，进行验证
      if (this.needsValidation(updateRuleDto)) {
        const mergedRule = {
          ...existingRule,
          ...updateRuleDto,
          // Handle channel type conversion if channels are being updated
          channels: updateRuleDto.channels
            ? updateRuleDto.channels.map((channel) => ({
                ...channel,
                type: channel.type as any,
              }))
            : existingRule.channels,
        };
        const validation = this.ruleValidator.validateRule(
          mergedRule as IAlertRule,
        );

        if (!validation.valid) {
          const errorMsg = `规则验证失败: ${validation.errors.join(", ")}`;
          this.logger.warn(errorMsg, { operation, errors: validation.errors });
          throw new BadRequestException(
            errorMsg || VALIDATION_MESSAGES.VALIDATION_FAILED,
          );
        }
      }

      const updatedRule = await this.alertRuleRepository.update(
        ruleId,
        updateRuleDto,
      );

      this.logger.log("告警规则更新成功", {
        operation,
        ruleId,
        ruleName: updatedRule.name,
      });

      return updatedRule;
    } catch (error) {
      this.logger.error("告警规则更新失败", {
        operation,
        ruleId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 删除告警规则
   */
  async deleteRule(ruleId: string): Promise<boolean> {
    const operation = "DELETE_RULE";

    // 验证规则ID格式
    DatabaseValidationUtils.validateObjectId(ruleId, "告警规则ID");

    this.logger.debug("删除告警规则", {
      operation,
      ruleId,
    });

    try {
      const result = await this.alertRuleRepository.delete(ruleId);

      this.logger.log("告警规则删除成功", {
        operation,
        ruleId,
      });

      return result;
    } catch (error) {
      this.logger.error("告警规则删除失败", {
        operation,
        ruleId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 获取所有告警规则
   */
  async getAllRules(): Promise<IAlertRule[]> {
    const operation = "GET_ALL_RULES";

    try {
      const rules = await this.alertRuleRepository.findAll();

      this.logger.debug("获取所有告警规则完成", {
        operation,
        count: rules.length,
      });

      return rules;
    } catch (error) {
      this.logger.error("获取所有告警规则失败", {
        operation,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 获取启用的告警规则
   */
  async getEnabledRules(): Promise<IAlertRule[]> {
    const operation = "GET_ENABLED_RULES";

    try {
      const rules = await this.alertRuleRepository.findAllEnabled();

      this.logger.debug("获取启用告警规则完成", {
        operation,
        count: rules.length,
      });

      return rules;
    } catch (error) {
      this.logger.error("获取启用告警规则失败", {
        operation,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 根据ID获取告警规则
   */
  async getRuleById(ruleId: string): Promise<IAlertRule> {
    const operation = "GET_RULE_BY_ID";

    // 验证规则ID格式
    DatabaseValidationUtils.validateObjectId(ruleId, "告警规则ID");

    try {
      const rule = await this.alertRuleRepository.findById(ruleId);

      if (!rule) {
        throw new NotFoundException(BUSINESS_ERROR_MESSAGES.RESOURCE_NOT_FOUND);
      }

      this.logger.debug("获取告警规则成功", {
        operation,
        ruleId,
        ruleName: rule.name,
      });

      return rule;
    } catch (error) {
      this.logger.error("获取告警规则失败", {
        operation,
        ruleId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 启用/禁用告警规则
   */
  async toggleRule(ruleId: string, enabled: boolean): Promise<boolean> {
    const operation = "TOGGLE_RULE";

    // 验证规则ID格式
    DatabaseValidationUtils.validateObjectId(ruleId, "告警规则ID");

    try {
      const success = await this.alertRuleRepository.toggle(ruleId, enabled);

      if (success) {
        this.logger.log("告警规则状态切换成功", {
          operation,
          ruleId,
          enabled,
        });
      } else {
        this.logger.warn("告警规则状态未改变", {
          operation,
          ruleId,
          enabled,
        });
      }

      return success;
    } catch (error) {
      this.logger.error("告警规则状态切换失败", {
        operation,
        ruleId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 批量启用/禁用规则
   */
  async batchToggleRules(
    ruleIds: string[],
    enabled: boolean,
  ): Promise<{
    successCount: number;
    failedCount: number;
    errors: string[];
  }> {
    const operation = "BATCH_TOGGLE_RULES";

    // 验证所有规则ID格式
    DatabaseValidationUtils.validateObjectIds(ruleIds, "告警规则ID列表");

    this.logger.log("批量切换规则状态", {
      operation,
      ruleCount: ruleIds.length,
      enabled,
    });

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    const results = await Promise.allSettled(
      ruleIds.map(async (ruleId) => {
        try {
          await this.toggleRule(ruleId, enabled);
          successCount++;
        } catch (error) {
          failedCount++;
          errors.push(`${ruleId}: ${error.message}`);
        }
      }),
    );

    this.logger.log("批量切换规则状态完成", {
      operation,
      successCount,
      failedCount,
      total: ruleIds.length,
    });

    return { successCount, failedCount, errors };
  }

  /**
   * 获取规则统计信息
   */
  async getRuleStats(): Promise<{
    totalRules: number;
    enabledRules: number;
    disabledRules: number;
  }> {
    const operation = "GET_RULE_STATS";

    try {
      const [totalRules, enabledRules] = await Promise.all([
        this.alertRuleRepository.countAll(),
        this.alertRuleRepository.countEnabled(),
      ]);

      const stats = {
        totalRules,
        enabledRules,
        disabledRules: totalRules - enabledRules,
      };

      this.logger.debug("获取规则统计完成", {
        operation,
        ...stats,
      });

      return stats;
    } catch (error) {
      this.logger.error("获取规则统计失败", {
        operation,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 验证规则配置
   */
  validateRule(rule: IAlertRule): { valid: boolean; errors: string[] } {
    return this.ruleValidator.validateRule(rule);
  }

  /**
   * 生成规则ID
   */
  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * 检查更新数据是否需要验证
   */
  private needsValidation(updateData: UpdateAlertRuleDto): boolean {
    const validationFields = [
      "metric",
      "operator",
      "threshold",
      "duration",
      "cooldown",
      "channels",
    ];
    return validationFields.some((field) => field in updateData);
  }
}
