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
      name: 'LongPort REST 股票报价模板',
      provider: 'longport',
      apiType: 'rest' as const,
      isPreset: true,
      isDefault: true,
      description: 'LongPort REST API 股票报价数据模板',
      sampleData: {
        secu_quote: [{
          symbol: '700.HK',
          last_done: 350.5,
          prev_close: 355.0,
          open: 352.0,
          high: 360.0,
          low: 348.0,
          volume: 1000000,
          turnover: 350500000,
        }],
      },
      extractedFields: [
        { fieldPath: 'secu_quote[0].symbol', fieldName: 'symbol', fieldType: 'string' },
        { fieldPath: 'secu_quote[0].last_done', fieldName: 'last_done', fieldType: 'number' },
        { fieldPath: 'secu_quote[0].prev_close', fieldName: 'prev_close', fieldType: 'number' },
        { fieldPath: 'secu_quote[0].open', fieldName: 'open', fieldType: 'number' },
        { fieldPath: 'secu_quote[0].high', fieldName: 'high', fieldType: 'number' },
        { fieldPath: 'secu_quote[0].low', fieldName: 'low', fieldType: 'number' },
        { fieldPath: 'secu_quote[0].volume', fieldName: 'volume', fieldType: 'number' },
        { fieldPath: 'secu_quote[0].turnover', fieldName: 'turnover', fieldType: 'number' },
      ],
      totalFields: 8,
      confidence: 0.95,
      isActive: true,
    },
    {
      name: 'LongPort WebSocket 股票报价流模板',
      provider: 'longport',
      apiType: 'stream' as const,
      isPreset: true,
      isDefault: true,
      description: 'LongPort WebSocket 实时股票报价流数据模板',
      sampleData: {
        symbol: '700.HK',
        last_done: 350.5,
        volume: 1000000,
        timestamp: 1640995200000,
      },
      extractedFields: [
        { fieldPath: 'symbol', fieldName: 'symbol', fieldType: 'string' },
        { fieldPath: 'last_done', fieldName: 'last_done', fieldType: 'number' },
        { fieldPath: 'volume', fieldName: 'volume', fieldType: 'number' },
        { fieldPath: 'timestamp', fieldName: 'timestamp', fieldType: 'number' },
      ],
      totalFields: 4,
      confidence: 0.9,
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