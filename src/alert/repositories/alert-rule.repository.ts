import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { createLogger } from "@common/logging/index";
import { DatabaseValidationUtils } from "@common/utils/database.utils";
import { UniversalExceptionFactory, ComponentIdentifier, BusinessErrorCode } from "@common/core/exceptions";
import { ALERT_ERROR_CODES } from "../constants/alert-error-codes.constants";

import { CreateAlertRuleDto, UpdateAlertRuleDto } from "../dto";
import { IAlertRule } from "../interfaces/alert.interface";
import { AlertRule, AlertRuleDocument } from "../schemas";

@Injectable()
export class AlertRuleRepository {
  private readonly logger = createLogger(AlertRuleRepository.name);

  constructor(
    @InjectModel(AlertRule.name)
    private readonly alertRuleModel: Model<AlertRuleDocument>,
  ) {}

  async create(
    createRuleDto: CreateAlertRuleDto & { id: string },
  ): Promise<IAlertRule> {
    const rule = new this.alertRuleModel(createRuleDto);
    const savedRule = await rule.save();
    this.logger.debug(`创建告警规则成功`, { ruleName: savedRule.name });
    return savedRule.toObject();
  }

  async update(
    ruleId: string,
    updateRuleDto: UpdateAlertRuleDto,
  ): Promise<IAlertRule> {
    // 验证ObjectId格式
    DatabaseValidationUtils.validateObjectId(ruleId, "告警规则ID");

    const rule = await this.alertRuleModel
      .findOneAndUpdate(
        { id: ruleId },
        { ...updateRuleDto, updatedAt: new Date() },
        { new: true },
      )
      .lean()
      .exec();

    if (!rule) {
      this.logger.warn(`尝试更新不存在的规则`, { ruleId });
      throw UniversalExceptionFactory.createBusinessException({
        message: 'Alert rule not found for update operation',
        errorCode: BusinessErrorCode.DATA_NOT_FOUND,
        operation: 'updateAlertRule',
        component: ComponentIdentifier.ALERT,
        context: {
          ruleId,
          customErrorCode: ALERT_ERROR_CODES.ALERT_NOT_FOUND,
          reason: 'alert_rule_not_found'
        },
        retryable: false
      });
    }

    this.logger.debug(`更新告警规则成功`, { ruleId });
    return rule;
  }

  async delete(ruleId: string): Promise<boolean> {
    // 验证ObjectId格式
    DatabaseValidationUtils.validateObjectId(ruleId, "告警规则ID");

    const result = await this.alertRuleModel.deleteOne({ id: ruleId }).exec();
    if (result.deletedCount === 0) {
      this.logger.warn(`尝试删除不存在的规则`, { ruleId });
      return false;
    }
    this.logger.debug(`删除告警规则成功`, { ruleId });
    return true;
  }

  async findAll(): Promise<IAlertRule[]> {
    return this.alertRuleModel.find().lean().exec();
  }

  async findAllEnabled(): Promise<IAlertRule[]> {
    return this.alertRuleModel.find({ enabled: true }).lean().exec();
  }

  async findById(ruleId: string): Promise<IAlertRule | null> {
    // 验证ObjectId格式
    DatabaseValidationUtils.validateObjectId(ruleId, "告警规则ID");

    const rule = await this.alertRuleModel
      .findOne({ id: ruleId })
      .lean()
      .exec();
    if (!rule) {
      this.logger.debug(`未找到规则`, { ruleId });
      return null;
    }
    return rule;
  }

  async toggle(ruleId: string, enabled: boolean): Promise<boolean> {
    // 验证ObjectId格式
    DatabaseValidationUtils.validateObjectId(ruleId, "告警规则ID");

    const result = await this.alertRuleModel
      .updateOne({ id: ruleId }, { enabled, updatedAt: new Date() })
      .exec();

    return result.modifiedCount > 0;
  }

  async countAll(): Promise<number> {
    return this.alertRuleModel.countDocuments().exec();
  }

  async countEnabled(): Promise<number> {
    return this.alertRuleModel.countDocuments({ enabled: true }).exec();
  }
}
