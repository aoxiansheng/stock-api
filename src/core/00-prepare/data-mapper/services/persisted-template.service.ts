import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { createLogger } from "@common/logging/index";

import { REFERENCE_DATA } from "@common/constants/domain";
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { UniversalExceptionFactory, ComponentIdentifier, BusinessErrorCode } from '@common/core/exceptions';
import { DATA_MAPPER_ERROR_CODES } from '../constants/data-mapper-error-codes.constants';

import {
  DataSourceTemplate,
  DataSourceTemplateDocument,
} from "../schemas/data-source-template.schema";
import {
  FlexibleMappingRule,
  FlexibleMappingRuleDocument,
} from "../schemas/flexible-mapping-rule.schema";
import { RuleAlignmentService } from "./rule-alignment.service";


/**
 * 🏗️ 简化的持久化模板服务
 * 专注于模板的持久化存储和基本管理
 */
@Injectable()
export class PersistedTemplateService {
  private readonly logger = createLogger(PersistedTemplateService.name);

  constructor(
    @InjectModel(DataSourceTemplate.name)
    private readonly templateModel: Model<DataSourceTemplateDocument>,
    @InjectModel(FlexibleMappingRule.name)
    private readonly ruleModel: Model<FlexibleMappingRuleDocument>,
    private readonly ruleAlignmentService: RuleAlignmentService,
  ) {}

  

  /**
   * 预设模板的硬编码原始配置
   * 为了在“单条”和“批量”重置时复用，提升为类属性
   */
  private readonly BASIC_PRESET_TEMPLATES = [
    {
      name: "LongPort REST 股票报价通用模板（港股/A股个股和指数）",
      provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      apiType: "rest" as const,
      isPreset: true,
      isDefault: true,
      description:
        "LongPort REST API 股票报价数据通用模板(适用所有市场基础字段)",
      sampleData: {
        symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
        high: "662.000",
        lastDone: "645.000",
        low: "641.000",
        open: "662.000",
        prevClose: "649.500",
        volume: 9648131,
        turnover: "6251069378.000",
        timestamp: "2025-11-11T06:37:08+00:00",
        tradeStatus: "Normal",
        overnightQuote: null,
        postMarketQuote: null,
        preMarketQuote: null,
      },
      extractedFields: [
        {
          fieldPath: "symbol",
          fieldName: "symbol",
          fieldType: "string",
          confidence: 0.95,
        },
        {
          fieldPath: "high",
          fieldName: "high",
          fieldType: "string",
          confidence: 0.95,
        },
        {
          fieldPath: "lastDone",
          fieldName: "lastDone",
          fieldType: "string",
          confidence: 0.95,
        },
        {
          fieldPath: "low",
          fieldName: "low",
          fieldType: "string",
          confidence: 0.95,
        },
        {
          fieldPath: "open",
          fieldName: "open",
          fieldType: "string",
          confidence: 0.95,
        },
        {
          fieldPath: "prevClose",
          fieldName: "prevClose",
          fieldType: "string",
          confidence: 0.95,
        },
        {
          fieldPath: "volume",
          fieldName: "volume",
          fieldType: "number",
          confidence: 0.95,
        },
        {
          fieldPath: "turnover",
          fieldName: "turnover",
          fieldType: "string",
          confidence: 0.95,
        },
        {
          fieldPath: "timestamp",
          fieldName: "timestamp",
          fieldType: "string",
          confidence: 0.95,
        },
        {
          fieldPath: "tradeStatus",
          fieldName: "tradeStatus",
          fieldType: "string",
          confidence: 0.95,
        },
        {
          fieldPath: "overnightQuote",
          fieldName: "overnightQuote",
          fieldType: "object",
          confidence: 0.95,
        },
        {
          fieldPath: "postMarketQuote",
          fieldName: "postMarketQuote",
          fieldType: "object",
          confidence: 0.95,
        },
        {
          fieldPath: "preMarketQuote",
          fieldName: "preMarketQuote",
          fieldType: "object",
          confidence: 0.95,
        },
      ],
      totalFields: 13,
      confidence: 0.95,
      isActive: true,
    },
    {
      name: "LongPort REST 美股专用报价模板(含盘前盘后)",
      provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      apiType: "rest" as const,
      isPreset: true,
      isDefault: false,
      description: "LongPort REST API 美股报价数据模板(包含盘前盘后完整数据)",
      sampleData: {
        symbol: "AAPL.US",
        high: "229.560",
        lastDone: "228.330",
        low: "224.762",
        open: "227.840",
        prevClose: "229.090",
        volume: 34873322,
        turnover: "7925585994.156",
        timestamp: "2025-08-11T17:19:37+00:00",
        tradeStatus: "Normal",
        overnightQuote: {
          high: "228.750",
          lastDone: "227.950",
          low: "226.100",
          prevClose: "228.330",
          timestamp: "2025-08-08T02:00:00+00:00",
          turnover: "512345678.000",
          volume: 1523641,
        },
        postMarketQuote: {
          high: "230.070",
          lastDone: "229.990",
          low: "229.230",
          prevClose: "229.350",
          timestamp: "2025-08-08T23:59:58+00:00",
          turnover: "976683886.092",
          volume: 4257914,
        },
        preMarketQuote: {
          high: "229.152",
          lastDone: "228.000",
          low: "226.420",
          prevClose: "229.090",
          timestamp: "2025-08-11T13:30:00+00:00",
          turnover: "118232121.473",
          volume: 518946,
        },
      },
      extractedFields: [
        // 基础报价字段
        {
          fieldPath: "symbol",
          fieldName: "symbol",
          fieldType: "string",
          confidence: 0.92,
        },
        {
          fieldPath: "high",
          fieldName: "high",
          fieldType: "string",
          confidence: 0.92,
        },
        {
          fieldPath: "lastDone",
          fieldName: "lastDone",
          fieldType: "string",
          confidence: 0.92,
        },
        {
          fieldPath: "low",
          fieldName: "low",
          fieldType: "string",
          confidence: 0.92,
        },
        {
          fieldPath: "open",
          fieldName: "open",
          fieldType: "string",
          confidence: 0.92,
        },
        {
          fieldPath: "prevClose",
          fieldName: "prevClose",
          fieldType: "string",
          confidence: 0.92,
        },
        {
          fieldPath: "volume",
          fieldName: "volume",
          fieldType: "number",
          confidence: 0.92,
        },
        {
          fieldPath: "turnover",
          fieldName: "turnover",
          fieldType: "string",
          confidence: 0.92,
        },
        {
          fieldPath: "timestamp",
          fieldName: "timestamp",
          fieldType: "string",
          confidence: 0.92,
        },
        {
          fieldPath: "tradeStatus",
          fieldName: "tradeStatus",
          fieldType: "string",
          confidence: 0.92,
        },
        // 隔夜报价字段
        {
          fieldPath: "overnightQuote.high",
          fieldName: "overnightHigh",
          fieldType: "string",
          confidence: 0.92,
        },
        {
          fieldPath: "overnightQuote.lastDone",
          fieldName: "overnightLastDone",
          fieldType: "string",
          confidence: 0.92,
        },
        {
          fieldPath: "overnightQuote.low",
          fieldName: "overnightLow",
          fieldType: "string",
          confidence: 0.92,
        },
        {
          fieldPath: "overnightQuote.prevClose",
          fieldName: "overnightPrevClose",
          fieldType: "string",
          confidence: 0.92,
        },
        {
          fieldPath: "overnightQuote.volume",
          fieldName: "overnightVolume",
          fieldType: "number",
          confidence: 0.92,
        },
        {
          fieldPath: "overnightQuote.turnover",
          fieldName: "overnightTurnover",
          fieldType: "string",
          confidence: 0.92,
        },
        {
          fieldPath: "overnightQuote.timestamp",
          fieldName: "overnightTimestamp",
          fieldType: "string",
          confidence: 0.92,
        },
        // 盘后报价字段
        {
          fieldPath: "postMarketQuote.high",
          fieldName: "postMarketHigh",
          fieldType: "string",
          confidence: 0.92,
        },
        {
          fieldPath: "postMarketQuote.lastDone",
          fieldName: "postMarketLastDone",
          fieldType: "string",
          confidence: 0.92,
        },
        {
          fieldPath: "postMarketQuote.low",
          fieldName: "postMarketLow",
          fieldType: "string",
          confidence: 0.92,
        },
        {
          fieldPath: "postMarketQuote.prevClose",
          fieldName: "postMarketPrevClose",
          fieldType: "string",
          confidence: 0.92,
        },
        {
          fieldPath: "postMarketQuote.volume",
          fieldName: "postMarketVolume",
          fieldType: "number",
          confidence: 0.92,
        },
        {
          fieldPath: "postMarketQuote.turnover",
          fieldName: "postMarketTurnover",
          fieldType: "string",
          confidence: 0.92,
        },
        {
          fieldPath: "postMarketQuote.timestamp",
          fieldName: "postMarketTimestamp",
          fieldType: "string",
          confidence: 0.92,
        },
        // 盘前报价字段
        {
          fieldPath: "preMarketQuote.high",
          fieldName: "preMarketHigh",
          fieldType: "string",
          confidence: 0.92,
        },
        {
          fieldPath: "preMarketQuote.lastDone",
          fieldName: "preMarketLastDone",
          fieldType: "string",
          confidence: 0.92,
        },
        {
          fieldPath: "preMarketQuote.low",
          fieldName: "preMarketLow",
          fieldType: "string",
          confidence: 0.92,
        },
        {
          fieldPath: "preMarketQuote.prevClose",
          fieldName: "preMarketPrevClose",
          fieldType: "string",
          confidence: 0.92,
        },
        {
          fieldPath: "preMarketQuote.volume",
          fieldName: "preMarketVolume",
          fieldType: "number",
          confidence: 0.92,
        },
        {
          fieldPath: "preMarketQuote.turnover",
          fieldName: "preMarketTurnover",
          fieldType: "string",
          confidence: 0.92,
        },
        {
          fieldPath: "preMarketQuote.timestamp",
          fieldName: "preMarketTimestamp",
          fieldType: "string",
          confidence: 0.92,
        },
      ],
      totalFields: 31,
      confidence: 0.92,
      isActive: true,
    },
    {
      name: "LongPort WebSocket 报价流通用模板(适用于港股/A股/美股所有市场的个股与指数报价)",
      provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      apiType: "stream" as const,
      isPreset: true,
      isDefault: true,
      description: "LongPort WebSocket 实时报价流通用数据模板",
      sampleData: {
        symbol: "AMD.US",
        lastDone: "243.930",
        open: "242.250",
        high: "248.900",
        low: "240.500",
        volume: 26141830,
        turnover: "6390001329.208",
        timestamp: "2025-11-10T17:26:17+00:00",
        tradeStatus: "Normal",
        tradeSession: "Intraday",
        currentVolume: 216,
        currentTurnover: "52691.090",
      },
      extractedFields: [
        {
          fieldPath: "symbol",
          fieldName: "symbol",
          fieldType: "string",
          confidence: 0.9,
        },
        {
          fieldPath: "high",
          fieldName: "high",
          fieldType: "string",
          confidence: 0.9,
        },
        {
          fieldPath: "lastDone",
          fieldName: "lastDone",
          fieldType: "string",
          confidence: 0.9,
        },
        {
          fieldPath: "low",
          fieldName: "low",
          fieldType: "string",
          confidence: 0.9,
        },
        {
          fieldPath: "open",
          fieldName: "open",
          fieldType: "string",
          confidence: 0.9,
        },
        {
          fieldPath: "volume",
          fieldName: "volume",
          fieldType: "number",
          confidence: 0.9,
        },
        {
          fieldPath: "turnover",
          fieldName: "turnover",
          fieldType: "string",
          confidence: 0.9,
        },
        {
          fieldPath: "timestamp",
          fieldName: "timestamp",
          fieldType: "string",
          confidence: 0.9,
        },
        {
          fieldPath: "tradeStatus",
          fieldName: "tradeStatus",
          fieldType: "string",
          confidence: 0.9,
        },
        {
          fieldPath: "tradeSession",
          fieldName: "tradeSession",
          fieldType: "string",
          confidence: 0.9,
        },
        {
          fieldPath: "currentTurnover",
          fieldName: "currentTurnover",
          fieldType: "string",
          confidence: 0.9,
        },
        {
          fieldPath: "currentVolume",
          fieldName: "currentVolume",
          fieldType: "number",
          confidence: 0.9,
        },
      ],
      totalFields: 12,
      confidence: 0.9,
      isActive: true,
    },
    {
      name: "JvQuant WebSocket 报价流模板(港股/美股/沪深个股)",
      provider: REFERENCE_DATA.PROVIDER_IDS.JVQUANT,
      apiType: "stream" as const,
      isPreset: true,
      isDefault: true,
      description: "JvQuant WebSocket 行情模板（已标准化字段）",
      sampleData: {
        symbol: "AAPL.US",
        lastPrice: 228.33,
        previousClose: null,
        openPrice: null,
        highPrice: null,
        lowPrice: null,
        volume: 34873322,
        turnover: 7925585994.156,
        timestamp: "2025-11-11T09:30:00+08:00",
        tradeStatus: "Normal",
      },
      extractedFields: [
        {
          fieldPath: "symbol",
          fieldName: "symbol",
          fieldType: "string",
          confidence: 0.95,
        },
        {
          fieldPath: "lastPrice",
          fieldName: "lastPrice",
          fieldType: "number",
          confidence: 0.95,
        },
        {
          fieldPath: "previousClose",
          fieldName: "previousClose",
          fieldType: "number",
          confidence: 0.9,
        },
        {
          fieldPath: "openPrice",
          fieldName: "openPrice",
          fieldType: "number",
          confidence: 0.9,
        },
        {
          fieldPath: "highPrice",
          fieldName: "highPrice",
          fieldType: "number",
          confidence: 0.9,
        },
        {
          fieldPath: "lowPrice",
          fieldName: "lowPrice",
          fieldType: "number",
          confidence: 0.9,
        },
        {
          fieldPath: "volume",
          fieldName: "volume",
          fieldType: "number",
          confidence: 0.95,
        },
        {
          fieldPath: "turnover",
          fieldName: "turnover",
          fieldType: "number",
          confidence: 0.95,
        },
        {
          fieldPath: "timestamp",
          fieldName: "timestamp",
          fieldType: "string",
          confidence: 0.95,
        },
        {
          fieldPath: "tradeStatus",
          fieldName: "tradeStatus",
          fieldType: "string",
          confidence: 0.9,
        },
      ],
      totalFields: 10,
      confidence: 0.95,
      isActive: true,
    },
    {
      name: "LongPort REST 股票基础信息通用模板(适用于港股/A股/美股所有市场的个股与指数报价)",
      provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      apiType: "rest" as const,
      isPreset: true,
      isDefault: false,
      description:
        "LongPort REST API 股票基础信息通用数据模板(适用于港股/美股/A股所有市场的个股基础信息)",
      sampleData: {
        symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
        board: "HKEquity",
        bps: "123.1693466433353942",
        circulatingShares: 9153739354,
        currency: "HKD",
        dividendYield: "4.5173433935422933",
        eps: "22.8947987810339394",
        epsTtm: "23.6766691995996831",
        exchange: "SEHK",
        hkShares: 9153739354,
        lotSize: 100,
        nameCn: "腾讯控股",
        nameEn: "TENCENT",
        nameHk: "騰訊控股",
        stockDerivatives: ["Warrant"],
        totalShares: 9153739354,
      },
      extractedFields: [
        {
          fieldPath: "symbol",
          fieldName: "symbol",
          fieldType: "string",
          confidence: 0.95,
        },
        {
          fieldPath: "board",
          fieldName: "board",
          fieldType: "string",
          confidence: 0.95,
        },
        {
          fieldPath: "bps",
          fieldName: "bps",
          fieldType: "string",
          confidence: 0.95,
        },
        {
          fieldPath: "circulatingShares",
          fieldName: "circulatingShares",
          fieldType: "number",
          confidence: 0.95,
        },
        {
          fieldPath: "currency",
          fieldName: "currency",
          fieldType: "string",
          confidence: 0.95,
        },
        {
          fieldPath: "dividendYield",
          fieldName: "dividendYield",
          fieldType: "string",
          confidence: 0.95,
        },
        {
          fieldPath: "eps",
          fieldName: "eps",
          fieldType: "string",
          confidence: 0.95,
        },
        {
          fieldPath: "epsTtm",
          fieldName: "epsTtm",
          fieldType: "string",
          confidence: 0.95,
        },
        {
          fieldPath: "exchange",
          fieldName: "exchange",
          fieldType: "string",
          confidence: 0.95,
        },
        {
          fieldPath: "hkShares",
          fieldName: "hkShares",
          fieldType: "number",
          confidence: 0.95,
        },
        {
          fieldPath: "lotSize",
          fieldName: "lotSize",
          fieldType: "number",
          confidence: 0.95,
        },
        {
          fieldPath: "nameCn",
          fieldName: "nameCn",
          fieldType: "string",
          confidence: 0.95,
        },
        {
          fieldPath: "nameEn",
          fieldName: "nameEn",
          fieldType: "string",
          confidence: 0.95,
        },
        {
          fieldPath: "nameHk",
          fieldName: "nameHk",
          fieldType: "string",
          confidence: 0.95,
        },
        {
          fieldPath: "stockDerivatives",
          fieldName: "stockDerivatives",
          fieldType: "array",
          confidence: 0.95,
        },
        {
          fieldPath: "totalShares",
          fieldName: "totalShares",
          fieldType: "number",
          confidence: 0.95,
        },
      ],
      totalFields: 16,
      confidence: 0.95,
      isActive: true,
    },
  ];

  /**
   * 🚀 持久化基础预设模板
   */
  async persistPresetTemplates(): Promise<{
    created: number;
    updated: number;
    skipped: number;
    details: string[];
  }> {
    this.logger.log("开始持久化基础预设模板");

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const details: string[] = [];

    // 使用类级别常量
    const basicPresetTemplates = this.BASIC_PRESET_TEMPLATES;

    // 持久化每个预设模板
    for (const templateConfig of basicPresetTemplates) {
      try {
        const existing = await this.templateModel.findOne({
          name: templateConfig.name,
          provider: templateConfig.provider,
          apiType: templateConfig.apiType,
          isPreset: true,
        });

        if (existing) {
          // 更新现有模板
          await this.templateModel.findByIdAndUpdate(
            existing._id,
            templateConfig,
          );
          updated++;
          details.push(`已更新: ${templateConfig.name}`);
          this.logger.debug(`更新预设模板: ${templateConfig.name}`);
        } else {
          // 创建新模板
          const newTemplate = new this.templateModel({
            ...templateConfig,
            usageCount: 0,
            lastUsedAt: new Date(),
          });
          await newTemplate.save();
          created++;
          details.push(`已创建: ${templateConfig.name}`);
          this.logger.debug(`创建预设模板: ${templateConfig.name}`);
        }
      } catch (error) {
        skipped++;
        details.push(`跳过 ${templateConfig.name}: ${error.message}`);
        this.logger.warn(`跳过模板 ${templateConfig.name}`, {
          error: error.message,
        });
      }
    }

    const summary = { created, updated, skipped, details };
    this.logger.log("预设模板持久化完成", summary);
    return summary;
  }

  /**
   * 📋 获取所有持久化模板
   */
  async getAllPersistedTemplates(): Promise<DataSourceTemplateDocument[]> {
    return await this.templateModel
      .find()
      .sort({ isPreset: -1, isDefault: -1, usageCount: -1 })
      .exec();
  }

  /**
   * 🔍 根据ID获取持久化模板
   */
  async getPersistedTemplateById(
    id: string,
  ): Promise<DataSourceTemplateDocument> {
    // 验证ObjectId格式
    if (!Types.ObjectId.isValid(id)) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'getPersistedTemplateById',
        message: `Invalid template ID format: ${id}`,
        context: {
          templateId: id,
          errorType: DATA_MAPPER_ERROR_CODES.INVALID_RULE_ID_FORMAT
        },
        retryable: false
      });
    }

    let template;
    try {
      template = await this.templateModel.findById(id);
    } catch {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'getPersistedTemplateById',
        message: `Invalid template ID: ${id}`,
        context: {
          templateId: id,
          errorType: DATA_MAPPER_ERROR_CODES.INVALID_RULE_ID_FORMAT
        },
        retryable: false
      });
    }

    if (!template) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER,
        errorCode: BusinessErrorCode.DATA_NOT_FOUND,
        operation: 'getPersistedTemplateById',
        message: `Persisted template not found: ${id}`,
        context: {
          templateId: id,
          errorType: DATA_MAPPER_ERROR_CODES.TEMPLATE_NOT_FOUND
        },
        retryable: false
      });
    }

    return template;
  }

  /**
   * ✏️ 更新持久化模板
   */
  async updatePersistedTemplate(
    id: string,
    updateData: Partial<any>,
  ): Promise<DataSourceTemplateDocument> {
    const template = await this.templateModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true },
    );

    if (!template) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER,
        errorCode: BusinessErrorCode.DATA_NOT_FOUND,
        operation: 'updatePersistedTemplate',
        message: `Persisted template not found: ${id}`,
        context: {
          templateId: id,
          errorType: DATA_MAPPER_ERROR_CODES.TEMPLATE_NOT_FOUND
        },
        retryable: false
      });
    }

    this.logger.log(`持久化模板更新成功: ${id}`);
    return template;
  }

  /**
   * 🗑️ 删除持久化模板
   */
  async deletePersistedTemplate(id: string): Promise<void> {
    const template = await this.templateModel.findById(id);

    if (!template) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER,
        errorCode: BusinessErrorCode.DATA_NOT_FOUND,
        operation: 'deletePersistedTemplate',
        message: `Persisted template not found: ${id}`,
        context: {
          templateId: id,
          errorType: DATA_MAPPER_ERROR_CODES.TEMPLATE_NOT_FOUND
        },
        retryable: false
      });
    }

    // 不允许删除预设模板
    if (template.isPreset) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER,
        errorCode: BusinessErrorCode.BUSINESS_RULE_VIOLATION,
        operation: 'deletePersistedTemplate',
        message: 'Cannot delete preset template',
        context: {
          templateId: id,
          isPreset: template.isPreset,
          errorType: DATA_MAPPER_ERROR_CODES.RULE_APPLICATION_FAILED
        },
        retryable: false
      });
    }

    await this.templateModel.findByIdAndDelete(id);
    this.logger.log(`持久化模板删除成功: ${id}`);
  }

  /**
   * 重置单个预设模板为原始硬编码配置
   */
  async resetPresetTemplateById(
    id: string,
  ): Promise<DataSourceTemplateDocument> {
    // 验证ObjectId格式
    if (!Types.ObjectId.isValid(id)) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'resetPresetTemplateById',
        message: `Invalid template ID format: ${id}`,
        context: {
          templateId: id,
          errorType: DATA_MAPPER_ERROR_CODES.INVALID_RULE_ID_FORMAT
        },
        retryable: false
      });
    }

    let template;
    try {
      template = await this.templateModel.findById(id);
    } catch {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'resetPresetTemplateById',
        message: `Invalid template ID: ${id}`,
        context: {
          templateId: id,
          errorType: DATA_MAPPER_ERROR_CODES.INVALID_RULE_ID_FORMAT
        },
        retryable: false
      });
    }

    if (!template) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER,
        errorCode: BusinessErrorCode.DATA_NOT_FOUND,
        operation: 'resetPresetTemplateById',
        message: `Persisted template not found: ${id}`,
        context: {
          templateId: id,
          errorType: DATA_MAPPER_ERROR_CODES.TEMPLATE_NOT_FOUND
        },
        retryable: false
      });
    }

    if (!template.isPreset) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER,
        errorCode: BusinessErrorCode.BUSINESS_RULE_VIOLATION,
        operation: 'resetPresetTemplateById',
        message: 'This template is not a preset template and cannot be reset',
        context: {
          templateId: id,
          isPreset: template.isPreset,
          errorType: DATA_MAPPER_ERROR_CODES.RULE_APPLICATION_FAILED
        },
        retryable: false
      });
    }

    // 找到对应原始配置
    const originalConfig = this.BASIC_PRESET_TEMPLATES.find(
      (p) =>
        p.name === template.name &&
        p.provider === template.provider &&
        p.apiType === template.apiType,
    );

    if (!originalConfig) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER,
        errorCode: BusinessErrorCode.DATA_NOT_FOUND,
        operation: 'resetPresetTemplateById',
        message: 'Corresponding preset template configuration not found',
        context: {
          templateId: id,
          templateName: template.name,
          provider: template.provider,
          apiType: template.apiType,
          errorType: DATA_MAPPER_ERROR_CODES.TEMPLATE_NOT_FOUND
        },
        retryable: false
      });
    }

    await this.templateModel.findByIdAndUpdate(id, {
      ...originalConfig,
    });

    this.logger.log(`预设模板已重置: ${id}`);
    return await this.templateModel.findById(id);
  }

  /**
   * 批量重置多个预设模板
   */
  async resetPresetTemplatesBulk(ids: string[]): Promise<{
    reset: number;
    failed: number;
    details: string[];
  }> {
    let reset = 0;
    let failed = 0;
    const details: string[] = [];

    for (const id of ids) {
      try {
        await this.resetPresetTemplateById(id);
        reset++;
        details.push(`已重置: ${id}`);
      } catch (error) {
        failed++;
        details.push(`失败 ${id}: ${error.message}`);
      }
    }

    return { reset, failed, details };
  }

  /**
   * 全量重置：删除所有预设模板并重新写入
   */
  async resetPresetTemplates(): Promise<{
    deleted: number;
    recreated: number;
    message: string;
  }> {
    this.logger.log("开始重置预设模板到初始配置");

    // 删除所有预设模板
    const deleteResult = await this.templateModel.deleteMany({
      isPreset: true,
    });

    // 重新创建
    const createResult = await this.persistPresetTemplates();

    const summary = {
      deleted: deleteResult.deletedCount || 0,
      recreated: createResult.created + createResult.updated, // 在reset场景中，created + updated 都算作重新创建
      message: `删除了 ${deleteResult.deletedCount} 个旧预设模板，重新创建了 ${createResult.created + createResult.updated} 个预设模板`,
    };

    this.logger.log("预设模板重置完成", summary);
    return summary;
  }

  /**
   * 🚀 自动生成预设映射规则
   * 基于四个预设模板生成对应的映射规则
   */
  async initializePresetMappingRules(): Promise<{
    created: number;
    skipped: number;
    failed: number;
    details: string[];
  }> {
    const startTime = Date.now();
    this.logger.log("开始初始化预设映射规则");

    let created = 0;
    let skipped = 0;
    let failed = 0;
    const details: string[] = [];

    try {
      // 获取所有预设模板
      const presetTemplates = await this.templateModel
        .find({ isPreset: true })
        .exec();

      if (presetTemplates.length === 0) {
        this.logger.warn("未找到预设模板，跳过映射规则初始化");
        details.push("未找到预设模板，建议先执行预设模板持久化");
        return { created: 0, skipped: 0, failed: 0, details };
      }

      // 为每个模板生成映射规则
      for (const template of presetTemplates) {
        const templateStartTime = Date.now();

        try {
          const transDataRuleListType = this.determineRuleType(template);
          const ruleName = this.generateRuleName(
            template,
            transDataRuleListType,
          );

          // 检查规则是否已存在（双重保险：名称 + 核心字段）
          const existingRule = await this.ruleModel
            .findOne({
              name: ruleName,
              provider: template.provider,
              apiType: template.apiType,
              transDataRuleListType: transDataRuleListType,
            })
            .exec();

        if (existingRule) {
          try {
            const realignResult =
              await this.ruleAlignmentService.realignExistingRule(
                existingRule._id.toString(),
              );
            skipped++;
            details.push(
              `已对齐 ${template.name}: ${ruleName} (${realignResult.changes.added.length} added, ${realignResult.changes.removed.length} removed, ${realignResult.changes.modified.length} modified)`
            );
            this.logger.log(`已重新对齐映射规则: ${ruleName}`, {
              templateId: template._id,
              ruleId: existingRule._id,
            });
          } catch (realignError) {
            failed++;
            details.push(
              `重新对齐失败 ${template.name}: ${realignError.message}`,
            );
            this.logger.error(`映射规则重新对齐失败: ${template.name}`, {
              templateId: template._id,
              ruleId: existingRule._id,
              error: realignError.message,
              stack: realignError.stack,
            });
          }
          continue;
        }

          // 使用智能对齐服务生成规则
          const { rule } =
            await this.ruleAlignmentService.generateRuleFromTemplate(
              template._id.toString(),
              transDataRuleListType,
              ruleName,
            );

          created++;
          details.push(`已创建 ${template.name}: ${rule.name}`);
          this.logger.log(`成功创建映射规则: ${rule.name}`, {
            templateId: template._id,
            ruleId: rule._id,
            provider: template.provider,
            apiType: template.apiType,
            transDataRuleListType,
          });
        } catch (error) {
          failed++;
          details.push(`失败 ${template.name}: ${error.message}`);
          this.logger.error(`映射规则创建失败: ${template.name}`, {
            templateId: template._id,
            error: error.message,
            stack: error.stack,
          });
        }
      }

      const summary = { created, skipped, failed, details };

      this.logger.log("预设映射规则初始化完成", summary);
      return summary;
    } catch (error) {
      this.logger.error("预设映射规则初始化过程发生错误", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 🧠 启发式规则类型判断
   * 基于模板名称和提取字段智能判断规则类型
   */
  private determineRuleType(
    template: DataSourceTemplateDocument,
  ): "quote_fields" | "basic_info_fields" {
    const templateName = template.name.toLowerCase();
    const extractedFieldNames = template.extractedFields.map((field) =>
      field.fieldName.toLowerCase(),
    );

    // 基于模板名称的启发式判断
    if (
      templateName.includes("基础信息") ||
      templateName.includes("基本信息") ||
      templateName.includes("basic_info")
    ) {
      return "basic_info_fields";
    }

    if (templateName.includes("报价") || templateName.includes("quote")) {
      return "quote_fields";
    }

    // 基于字段内容的启发式判断
    const basicInfoIndicators = [
      "namecn",
      "nameen",
      "exchange",
      "currency",
      "lotsize",
      "totalshares",
      "eps",
      "bps",
    ];
    const quoteIndicators = [
      "lastdone",
      "high",
      "low",
      "open",
      "volume",
      "turnover",
      "timestamp",
    ];

    const basicInfoMatches = basicInfoIndicators.filter((indicator) =>
      extractedFieldNames.some((field) => field.includes(indicator)),
    ).length;

    const quoteMatches = quoteIndicators.filter((indicator) =>
      extractedFieldNames.some((field) => field.includes(indicator)),
    ).length;

    // 根据匹配数量判断类型
    if (basicInfoMatches > quoteMatches) {
      return "basic_info_fields";
    }

    // 默认返回报价字段类型（更常用）
    return "quote_fields";
  }

  /**
   * 🏷️ 健壮的规则名称生成
   * 基于模板信息生成唯一且描述性的规则名称
   */
  private generateRuleName(
    template: DataSourceTemplateDocument,
    transDataRuleListType: "quote_fields" | "basic_info_fields",
  ): string {
    const provider = template.provider;
    const apiType = template.apiType.toUpperCase();
    const transDataRuleListTypeLabel =
      transDataRuleListType === "quote_fields" ? "报价数据" : "基础信息";

    // 基于模板名称简化
    let templateNameSimplified = template.name
      .replace(/LongPort\s*/gi, "")
      .replace(/REST\s*/gi, "")
      .replace(/WebSocket\s*/gi, "")
      .replace(/通用模板.*$/gi, "")
      .replace(/模板.*$/gi, "")
      .trim();

    // 如果简化后名称太短，使用原始名称的关键部分
    if (templateNameSimplified.length < 5) {
      if (template.name.includes("美股")) {
        templateNameSimplified = "美股专用";
      } else if (template.name.includes("港股")) {
        templateNameSimplified = "港股";
      } else if (template.name.includes("A股")) {
        templateNameSimplified = "A股";
      } else {
        templateNameSimplified = "通用";
      }
    }

    return `${provider}_${apiType}_${templateNameSimplified}_${transDataRuleListTypeLabel}_规则`;
  }
}
