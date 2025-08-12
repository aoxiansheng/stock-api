import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { createLogger } from '@common/config/logger.config';

import { DataSourceTemplate, DataSourceTemplateDocument } from '../schemas/data-source-template.schema';

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
  ) {}
  
  /**
   * 预设模板的硬编码原始配置
   * 为了在“单条”和“批量”重置时复用，提升为类属性
   */
  private readonly BASIC_PRESET_TEMPLATES = [
    {
      name: 'LongPort REST 股票报价通用模板（港股/A股个股和指数）',
      provider: 'longport',
      apiType: 'rest' as const,
      isPreset: true,
      isDefault: true,
      description: 'LongPort REST API 股票报价数据通用模板(适用所有市场基础字段)',
      sampleData: {
        symbol: '700.HK',
        high: '562.500',
        lastDone: '561.000',
        low: '553.500',
        open: '561.000',
        prevClose: '561.000',
        volume: 11790350,
        turnover: '6586953996.000',
        timestamp: '2025-08-11T08:08:18+00:00',
        tradeStatus: 'Normal',
        overnightQuote: null,
        postMarketQuote: null,
        preMarketQuote: null,
      },
      extractedFields: [
        { fieldPath: 'symbol', fieldName: 'symbol', fieldType: 'string' },
        { fieldPath: 'high', fieldName: 'high', fieldType: 'string' },
        { fieldPath: 'lastDone', fieldName: 'lastDone', fieldType: 'string' },
        { fieldPath: 'low', fieldName: 'low', fieldType: 'string' },
        { fieldPath: 'open', fieldName: 'open', fieldType: 'string' },
        { fieldPath: 'prevClose', fieldName: 'prevClose', fieldType: 'string' },
        { fieldPath: 'volume', fieldName: 'volume', fieldType: 'number' },
        { fieldPath: 'turnover', fieldName: 'turnover', fieldType: 'string' },
        { fieldPath: 'timestamp', fieldName: 'timestamp', fieldType: 'string' },
        { fieldPath: 'tradeStatus', fieldName: 'tradeStatus', fieldType: 'string' },
        { fieldPath: 'overnightQuote', fieldName: 'overnightQuote', fieldType: 'object' },
        { fieldPath: 'postMarketQuote', fieldName: 'postMarketQuote', fieldType: 'object' },
        { fieldPath: 'preMarketQuote', fieldName: 'preMarketQuote', fieldType: 'object' },
      ],
      totalFields: 13,
      confidence: 0.95,
      isActive: true,
    },
    {
      name: 'LongPort REST 美股专用报价模板(含盘前盘后)',
      provider: 'longport',
      apiType: 'rest' as const,
      isPreset: true,
      isDefault: false,
      description: 'LongPort REST API 美股报价数据模板(包含盘前盘后完整数据)',
      sampleData: {
        symbol: 'AAPL.US',
        high: '229.560',
        lastDone: '228.330',
        low: '224.762',
        open: '227.840',
        prevClose: '229.090',
        volume: 34873322,
        turnover: '7925585994.156',
        timestamp: '2025-08-11T17:19:37+00:00',
        tradeStatus: 'Normal',
        overnightQuote: null,
        postMarketQuote: {
          high: '230.070',
          lastDone: '229.990',
          low: '229.230',
          prevClose: '229.350',
          timestamp: '2025-08-08T23:59:58+00:00',
          turnover: '976683886.092',
          volume: 4257914,
        },
        preMarketQuote: {
          high: '229.152',
          lastDone: '228.000',
          low: '226.420',
          prevClose: '229.090',
          timestamp: '2025-08-11T13:30:00+00:00',
          turnover: '118232121.473',
          volume: 518946,
        },
      },
      extractedFields: [
        // 基础报价字段
        { fieldPath: 'symbol', fieldName: 'symbol', fieldType: 'string' },
        { fieldPath: 'high', fieldName: 'high', fieldType: 'string' },
        { fieldPath: 'lastDone', fieldName: 'lastDone', fieldType: 'string' },
        { fieldPath: 'low', fieldName: 'low', fieldType: 'string' },
        { fieldPath: 'open', fieldName: 'open', fieldType: 'string' },
        { fieldPath: 'prevClose', fieldName: 'prevClose', fieldType: 'string' },
        { fieldPath: 'volume', fieldName: 'volume', fieldType: 'number' },
        { fieldPath: 'turnover', fieldName: 'turnover', fieldType: 'string' },
        { fieldPath: 'timestamp', fieldName: 'timestamp', fieldType: 'string' },
        { fieldPath: 'tradeStatus', fieldName: 'tradeStatus', fieldType: 'string' },
        // 盘后报价字段
        { fieldPath: 'postMarketQuote.high', fieldName: 'postMarketHigh', fieldType: 'string' },
        { fieldPath: 'postMarketQuote.lastDone', fieldName: 'postMarketLastDone', fieldType: 'string' },
        { fieldPath: 'postMarketQuote.low', fieldName: 'postMarketLow', fieldType: 'string' },
        { fieldPath: 'postMarketQuote.prevClose', fieldName: 'postMarketPrevClose', fieldType: 'string' },
        { fieldPath: 'postMarketQuote.volume', fieldName: 'postMarketVolume', fieldType: 'number' },
        { fieldPath: 'postMarketQuote.turnover', fieldName: 'postMarketTurnover', fieldType: 'string' },
        { fieldPath: 'postMarketQuote.timestamp', fieldName: 'postMarketTimestamp', fieldType: 'string' },
        // 盘前报价字段
        { fieldPath: 'preMarketQuote.high', fieldName: 'preMarketHigh', fieldType: 'string' },
        { fieldPath: 'preMarketQuote.lastDone', fieldName: 'preMarketLastDone', fieldType: 'string' },
        { fieldPath: 'preMarketQuote.low', fieldName: 'preMarketLow', fieldType: 'string' },
        { fieldPath: 'preMarketQuote.prevClose', fieldName: 'preMarketPrevClose', fieldType: 'string' },
        { fieldPath: 'preMarketQuote.volume', fieldName: 'preMarketVolume', fieldType: 'number' },
        { fieldPath: 'preMarketQuote.turnover', fieldName: 'preMarketTurnover', fieldType: 'string' },
        { fieldPath: 'preMarketQuote.timestamp', fieldName: 'preMarketTimestamp', fieldType: 'string' },
      ],
      totalFields: 24,
      confidence: 0.92,
      isActive: true,
    },
    {
      name: 'LongPort WebSocket 报价流通用模板(适用于港股/A股/美股所有市场的个股与指数报价)',
      provider: 'longport',
      apiType: 'stream' as const,
      isPreset: true,
      isDefault: true,
      description: 'LongPort WebSocket 实时报价流通用数据模板',
      sampleData: {
        symbol: '700.HK',  // 示例可以是任何市场：700.HK, AAPL.US, 000001.SZ, 688273.SH
        data: {
          currentTurnover: '614350.000',
          currentVolume: 1100,
          high: '561.000',
          lastDone: '558.500',
          low: '557.500',
          open: '557.500',
          timestamp: '2025-08-12T01:38:36+00:00',
          tradeSession: 'Normal',
          tradeStatus: 'Normal',
          turnover: '554719628.000',
          volume: 991631,
        },
      },
      extractedFields: [
        { fieldPath: 'symbol', fieldName: 'symbol', fieldType: 'string' },
        { fieldPath: 'data.high', fieldName: 'high', fieldType: 'string' },
        { fieldPath: 'data.lastDone', fieldName: 'lastDone', fieldType: 'string' },
        { fieldPath: 'data.low', fieldName: 'low', fieldType: 'string' },
        { fieldPath: 'data.open', fieldName: 'open', fieldType: 'string' },
        { fieldPath: 'data.volume', fieldName: 'volume', fieldType: 'number' },
        { fieldPath: 'data.turnover', fieldName: 'turnover', fieldType: 'string' },
        { fieldPath: 'data.timestamp', fieldName: 'timestamp', fieldType: 'string' },
        { fieldPath: 'data.tradeStatus', fieldName: 'tradeStatus', fieldType: 'string' },
        { fieldPath: 'data.tradeSession', fieldName: 'tradeSession', fieldType: 'string' },
        { fieldPath: 'data.currentTurnover', fieldName: 'currentTurnover', fieldType: 'string' },
        { fieldPath: 'data.currentVolume', fieldName: 'currentVolume', fieldType: 'number' },
      ],
      totalFields: 12,
      confidence: 0.9,
      isActive: true,
    },
    {
      name: 'LongPort REST 股票基础信息通用模板(适用于港股/A股/美股所有市场的个股与指数报价)',
      provider: 'longport',
      apiType: 'rest' as const,
      isPreset: true,
      isDefault: false,
      description: 'LongPort REST API 股票基础信息通用数据模板(适用于港股/美股/A股所有市场的个股基础信息)',
      sampleData: {
        symbol: '700.HK',
        board: 'HKEquity',
        bps: '123.1693466433353942',
        circulatingShares: 9153739354,
        currency: 'HKD',
        dividendYield: '4.5173433935422933',
        eps: '22.8947987810339394',
        epsTtm: '23.6766691995996831',
        exchange: 'SEHK',
        hkShares: 9153739354,
        lotSize: 100,
        nameCn: '腾讯控股',
        nameEn: 'TENCENT',
        nameHk: '騰訊控股',
        stockDerivatives: ['Warrant'],
        totalShares: 9153739354,
      },
      extractedFields: [
        { fieldPath: 'symbol', fieldName: 'symbol', fieldType: 'string' },
        { fieldPath: 'board', fieldName: 'board', fieldType: 'string' },
        { fieldPath: 'bps', fieldName: 'bps', fieldType: 'string' },
        { fieldPath: 'circulatingShares', fieldName: 'circulatingShares', fieldType: 'number' },
        { fieldPath: 'currency', fieldName: 'currency', fieldType: 'string' },
        { fieldPath: 'dividendYield', fieldName: 'dividendYield', fieldType: 'string' },
        { fieldPath: 'eps', fieldName: 'eps', fieldType: 'string' },
        { fieldPath: 'epsTtm', fieldName: 'epsTtm', fieldType: 'string' },
        { fieldPath: 'exchange', fieldName: 'exchange', fieldType: 'string' },
        { fieldPath: 'hkShares', fieldName: 'hkShares', fieldType: 'number' },
        { fieldPath: 'lotSize', fieldName: 'lotSize', fieldType: 'number' },
        { fieldPath: 'nameCn', fieldName: 'nameCn', fieldType: 'string' },
        { fieldPath: 'nameEn', fieldName: 'nameEn', fieldType: 'string' },
        { fieldPath: 'nameHk', fieldName: 'nameHk', fieldType: 'string' },
        { fieldPath: 'stockDerivatives', fieldName: 'stockDerivatives', fieldType: 'array' },
        { fieldPath: 'totalShares', fieldName: 'totalShares', fieldType: 'number' },
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
    this.logger.log('开始持久化基础预设模板');
    
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
          isPreset: true
        });

        if (existing) {
          // 更新现有模板
          await this.templateModel.findByIdAndUpdate(existing._id, templateConfig);
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
        this.logger.warn(`跳过模板 ${templateConfig.name}`, { error: error.message });
      }
    }

    const summary = { created, updated, skipped, details };
    this.logger.log('预设模板持久化完成', summary);
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
  async getPersistedTemplateById(id: string): Promise<DataSourceTemplateDocument> {
    // 验证ObjectId格式
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`无效的模板ID格式: ${id}`);
    }

    let template;
    try {
      template = await this.templateModel.findById(id);
    } catch (error) {
      throw new BadRequestException(`无效的模板ID: ${id}`);
    }
    
    if (!template) {
      throw new NotFoundException(`持久化模板未找到: ${id}`);
    }

    return template;
  }

  /**
   * ✏️ 更新持久化模板
   */
  async updatePersistedTemplate(
    id: string,
    updateData: Partial<any>
  ): Promise<DataSourceTemplateDocument> {
    const template = await this.templateModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!template) {
      throw new NotFoundException(`持久化模板未找到: ${id}`);
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
      throw new NotFoundException(`持久化模板未找到: ${id}`);
    }

    // 不允许删除预设模板
    if (template.isPreset) {
      throw new BadRequestException('不能删除预设模板');
    }

    await this.templateModel.findByIdAndDelete(id);
    this.logger.log(`持久化模板删除成功: ${id}`);
  }

  /**
   * 重置单个预设模板为原始硬编码配置
   */
  async resetPresetTemplateById(id: string): Promise<DataSourceTemplateDocument> {
    // 验证ObjectId格式
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`无效的模板ID格式: ${id}`);
    }

    let template;
    try {
      template = await this.templateModel.findById(id);
    } catch (error) {
      throw new BadRequestException(`无效的模板ID: ${id}`);
    }

    if (!template) {
      throw new NotFoundException(`持久化模板未找到: ${id}`);
    }

    if (!template.isPreset) {
      throw new BadRequestException('该模板不是预设模板，无法重置');
    }

    // 找到对应原始配置
    const originalConfig = this.BASIC_PRESET_TEMPLATES.find(
      (p) =>
        p.name === template.name &&
        p.provider === template.provider &&
        p.apiType === template.apiType,
    );

    if (!originalConfig) {
      throw new BadRequestException('未找到对应的预设模板配置');
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
    this.logger.log('开始重置预设模板到初始配置');
    
    // 删除所有预设模板
    const deleteResult = await this.templateModel.deleteMany({ isPreset: true });
    
    // 重新创建
    const createResult = await this.persistPresetTemplates();
    
    const summary = {
      deleted: deleteResult.deletedCount || 0,
      recreated: createResult.created + createResult.updated, // 在reset场景中，created + updated 都算作重新创建
      message: `删除了 ${deleteResult.deletedCount} 个旧预设模板，重新创建了 ${createResult.created + createResult.updated} 个预设模板`
    };
    
    this.logger.log('预设模板重置完成', summary);
    return summary;
  }
}