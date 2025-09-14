/**
 * 通知模板服务
 * 🎯 提供通知模板的CRUD操作和渲染功能
 * 
 * @description 替代常量文件中的静态模板，实现动态模板管理
 * @author Claude Code Assistant
 * @date 2025-09-12
 */

import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import Handlebars from 'handlebars';
import { createLogger } from '@appcore/config/logger.config';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import { PaginatedDataDto } from '@common/modules/pagination/dto/paginated-data';

import { 
  NotificationTemplate, 
  NotificationTemplateDocument, 
  TemplateContent, 
  TemplateVariable,
  TemplateEngine
} from '../schemas/notification-template.schema';

import { NOTIFICATION_OPERATIONS } from '../constants/notification.constants';

/**
 * 模板创建DTO
 */
export interface CreateTemplateDto {
  templateId: string;
  name: string;
  description?: string;
  eventType: string;
  templateType?: 'system' | 'user_defined';
  defaultContent: TemplateContent;
  channelTemplates?: Array<{
    channelType: string;
    template: TemplateContent;
    variables?: TemplateVariable[];
  }>;
  variables?: TemplateVariable[];
  enabled?: boolean;
  priority?: number;
  templateEngine?: TemplateEngine;
  tags?: string[];
  category?: string;
  createdBy?: string;
  metadata?: Record<string, any>;
}

/**
 * 模板更新DTO
 */
export interface UpdateTemplateDto {
  name?: string;
  description?: string;
  defaultContent?: TemplateContent;
  channelTemplates?: Array<{
    channelType: string;
    template: TemplateContent;
    variables?: TemplateVariable[];
  }>;
  variables?: TemplateVariable[];
  enabled?: boolean;
  priority?: number;
  tags?: string[];
  category?: string;
  updatedBy?: string;
  metadata?: Record<string, any>;
}

/**
 * 模板查询DTO
 */
export interface TemplateQueryDto {
  eventType?: string;
  templateType?: string;
  enabled?: boolean;
  tags?: string[];
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 模板渲染结果
 */
export interface RenderedTemplate {
  subject?: string;
  body: string;
  format: string;
  variables: Record<string, any>;
  templateId: string;
  channelType?: string;
}

/**
 * 模板渲染上下文
 */
export interface TemplateRenderContext {
  templateId: string;
  channelType?: string;
  variables: Record<string, any>;
  fallbackToDefault?: boolean;
}

@Injectable()
export class NotificationTemplateService {
  private readonly logger = createLogger('NotificationTemplateService');
  private readonly handlebarsCache = new Map<string, HandlebarsTemplateDelegate>();

  constructor(
    @InjectModel(NotificationTemplate.name)
    private readonly templateModel: Model<NotificationTemplateDocument>,
    private readonly paginationService: PaginationService,
  ) {
    this.registerHandlebarsHelpers();
  }

  /**
   * 创建通知模板
   */
  async createTemplate(createTemplateDto: CreateTemplateDto): Promise<NotificationTemplateDocument> {
    this.logger.debug('创建通知模板', { 
      operation: NOTIFICATION_OPERATIONS.CREATE_TEMPLATE,
      templateId: createTemplateDto.templateId 
    });

    try {
      // 检查模板ID是否已存在
      const existingTemplate = await this.templateModel.findOne({ 
        templateId: createTemplateDto.templateId 
      });

      if (existingTemplate) {
        throw new ConflictException(`模板ID已存在: ${createTemplateDto.templateId}`);
      }

      // 验证模板内容
      this.validateTemplateContent(createTemplateDto.defaultContent);
      
      if (createTemplateDto.channelTemplates) {
        for (const channelTemplate of createTemplateDto.channelTemplates) {
          this.validateTemplateContent(channelTemplate.template);
        }
      }

      // 创建模板
      const template = new this.templateModel(createTemplateDto);
      const savedTemplate = await template.save();

      this.logger.log('通知模板创建成功', {
        operation: NOTIFICATION_OPERATIONS.CREATE_TEMPLATE,
        templateId: savedTemplate.templateId,
        eventType: savedTemplate.eventType,
      });

      return savedTemplate;
    } catch (error) {
      this.logger.error('创建通知模板失败', {
        operation: NOTIFICATION_OPERATIONS.CREATE_TEMPLATE,
        templateId: createTemplateDto.templateId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 更新通知模板
   */
  async updateTemplate(
    templateId: string, 
    updateTemplateDto: UpdateTemplateDto
  ): Promise<NotificationTemplateDocument> {
    this.logger.debug('更新通知模板', { 
      operation: NOTIFICATION_OPERATIONS.UPDATE_TEMPLATE,
      templateId 
    });

    try {
      const template = await this.findTemplateById(templateId);

      // 验证更新的模板内容
      if (updateTemplateDto.defaultContent) {
        this.validateTemplateContent(updateTemplateDto.defaultContent);
      }

      if (updateTemplateDto.channelTemplates) {
        for (const channelTemplate of updateTemplateDto.channelTemplates) {
          this.validateTemplateContent(channelTemplate.template);
        }
      }

      // 更新模板
      Object.assign(template, updateTemplateDto);
      const updatedTemplate = await template.save();

      // 清理缓存
      this.clearTemplateCache(templateId);

      this.logger.log('通知模板更新成功', {
        operation: NOTIFICATION_OPERATIONS.UPDATE_TEMPLATE,
        templateId,
      });

      return updatedTemplate;
    } catch (error) {
      this.logger.error('更新通知模板失败', {
        operation: NOTIFICATION_OPERATIONS.UPDATE_TEMPLATE,
        templateId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 删除通知模板
   */
  async deleteTemplate(templateId: string): Promise<void> {
    this.logger.debug('删除通知模板', { 
      operation: NOTIFICATION_OPERATIONS.DELETE_TEMPLATE,
      templateId 
    });

    try {
      const template = await this.findTemplateById(templateId);
      
      if (template.templateType === 'system') {
        throw new BadRequestException('不能删除系统模板');
      }

      await this.templateModel.deleteOne({ templateId });
      
      // 清理缓存
      this.clearTemplateCache(templateId);

      this.logger.log('通知模板删除成功', {
        operation: NOTIFICATION_OPERATIONS.DELETE_TEMPLATE,
        templateId,
      });
    } catch (error) {
      this.logger.error('删除通知模板失败', {
        operation: NOTIFICATION_OPERATIONS.DELETE_TEMPLATE,
        templateId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 根据ID获取模板
   */
  async findTemplateById(templateId: string): Promise<NotificationTemplateDocument> {
    const template = await this.templateModel.findOne({ templateId });
    
    if (!template) {
      throw new NotFoundException(`模板未找到: ${templateId}`);
    }
    
    return template;
  }

  /**
   * 查询模板列表
   */
  async queryTemplates(queryDto: TemplateQueryDto): Promise<PaginatedDataDto<NotificationTemplateDocument>> {
    const { sortBy = 'createdAt', sortOrder = 'desc', ...filters } = queryDto;

    // 构建查询条件
    const query: any = {};
    
    if (filters.eventType) {
      query.eventType = filters.eventType;
    }
    
    if (filters.templateType) {
      query.templateType = filters.templateType;
    }
    
    if (filters.enabled !== undefined) {
      query.enabled = filters.enabled;
    }
    
    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }
    
    if (filters.category) {
      query.category = filters.category;
    }
    
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { tags: { $in: [new RegExp(filters.search, 'i')] } }
      ];
    }

    // 使用通用分页器标准化分页参数
    const { page, limit } = this.paginationService.normalizePaginationQuery(queryDto);
    const skip = this.paginationService.calculateSkip(page, limit);

    // 执行查询
    const [templates, total] = await Promise.all([
      this.templateModel
        .find(query)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.templateModel.countDocuments(query)
    ]);

    // 使用通用分页器创建标准分页响应
    return this.paginationService.createPaginatedResponse(
      templates,
      page,
      limit,
      total
    );
  }

  /**
   * 根据事件类型获取模板
   */
  async getTemplatesByEventType(eventType: string): Promise<NotificationTemplateDocument[]> {
    return this.templateModel.find({ eventType, enabled: true })
      .sort({ priority: -1, createdAt: -1 })
      .exec();
  }

  /**
   * 渲染模板
   */
  async renderTemplate(context: TemplateRenderContext): Promise<RenderedTemplate> {
    this.logger.debug('渲染模板', {
      operation: NOTIFICATION_OPERATIONS.RENDER_TEMPLATE,
      templateId: context.templateId,
      channelType: context.channelType,
    });

    try {
      const template = await this.findTemplateById(context.templateId);
      
      // 验证变量
      const validation = template.validateVariables(context.variables);
      if (!validation.valid) {
        throw new BadRequestException(`模板变量验证失败: ${validation.errors.join(', ')}`);
      }

      // 获取渲染内容
      const content = context.channelType 
        ? template.getChannelTemplate(context.channelType)
        : template.defaultContent;

      if (!content && context.channelType && !context.fallbackToDefault) {
        throw new NotFoundException(`未找到渠道 ${context.channelType} 的模板`);
      }

      const templateContent = content || template.defaultContent;

      // 渲染模板
      const renderedContent = this.renderTemplateContent(
        templateContent,
        context.variables,
        template.templateEngine
      );

      // 更新使用统计
      await template.incrementUsage();

      this.logger.debug('模板渲染成功', {
        operation: NOTIFICATION_OPERATIONS.RENDER_TEMPLATE,
        templateId: context.templateId,
        channelType: context.channelType,
      });

      return {
        subject: renderedContent.subject,
        body: renderedContent.body,
        format: renderedContent.format,
        variables: context.variables,
        templateId: context.templateId,
        channelType: context.channelType,
      };
    } catch (error) {
      this.logger.error('模板渲染失败', {
        operation: NOTIFICATION_OPERATIONS.RENDER_TEMPLATE,
        templateId: context.templateId,
        channelType: context.channelType,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 批量渲染模板
   */
  async renderTemplatesBatch(contexts: TemplateRenderContext[]): Promise<RenderedTemplate[]> {
    this.logger.debug('批量渲染模板', {
      operation: NOTIFICATION_OPERATIONS.RENDER_TEMPLATES_BATCH,
      count: contexts.length,
    });

    const results = await Promise.allSettled(
      contexts.map(context => this.renderTemplate(context))
    );

    const renderedTemplates: RenderedTemplate[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        renderedTemplates.push(result.value);
      } else {
        errors.push(`模板 ${contexts[index].templateId} 渲染失败: ${result.reason.message}`);
      }
    });

    if (errors.length > 0) {
      this.logger.warn('部分模板渲染失败', {
        operation: NOTIFICATION_OPERATIONS.RENDER_TEMPLATES_BATCH,
        errors,
      });
    }

    return renderedTemplates;
  }

  /**
   * 复制模板
   */
  async duplicateTemplate(templateId: string, newTemplateId: string, updates?: Partial<UpdateTemplateDto>): Promise<NotificationTemplateDocument> {
    const sourceTemplate = await this.findTemplateById(templateId);
    
    const duplicateDto: CreateTemplateDto = {
      templateId: newTemplateId,
      name: updates?.name || `${sourceTemplate.name} (副本)`,
      description: updates?.description || sourceTemplate.description,
      eventType: sourceTemplate.eventType,
      templateType: 'user_defined',
      defaultContent: sourceTemplate.defaultContent,
      channelTemplates: sourceTemplate.channelTemplates,
      variables: sourceTemplate.variables,
      enabled: updates?.enabled ?? true,
      priority: updates?.priority ?? sourceTemplate.priority,
      templateEngine: sourceTemplate.templateEngine,
      tags: updates?.tags || sourceTemplate.tags,
      category: updates?.category || sourceTemplate.category,
      createdBy: updates?.updatedBy,
      metadata: { ...sourceTemplate.metadata, ...updates?.metadata },
    };

    return this.createTemplate(duplicateDto);
  }

  /**
   * 获取模板统计信息
   */
  async getTemplateStats(): Promise<{
    total: number;
    byEventType: Record<string, number>;
    byTemplateType: Record<string, number>;
    byStatus: Record<string, number>;
    topUsed: Array<{ templateId: string; name: string; usageCount: number }>;
  }> {
    const [
      total,
      byEventType,
      byTemplateType,
      byStatus,
      topUsed
    ] = await Promise.all([
      this.templateModel.countDocuments(),
      this.templateModel.aggregate([
        { $group: { _id: '$eventType', count: { $sum: 1 } } }
      ]),
      this.templateModel.aggregate([
        { $group: { _id: '$templateType', count: { $sum: 1 } } }
      ]),
      this.templateModel.aggregate([
        { $group: { _id: '$enabled', count: { $sum: 1 } } }
      ]),
      this.templateModel.find()
        .sort({ usageCount: -1 })
        .limit(10)
        .select('templateId name usageCount')
        .exec()
    ]);

    return {
      total,
      byEventType: byEventType.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
      byTemplateType: byTemplateType.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
      byStatus: byStatus.reduce((acc, item) => ({ ...acc, [item._id ? 'enabled' : 'disabled']: item.count }), {}),
      topUsed: topUsed.map(template => ({
        templateId: template.templateId,
        name: template.name,
        usageCount: template.usageCount
      }))
    };
  }

  /**
   * 验证模板内容
   */
  private validateTemplateContent(content: TemplateContent): void {
    if (!content.body || content.body.trim().length === 0) {
      throw new BadRequestException('模板内容不能为空');
    }

    if (content.body.length > 10000) {
      throw new BadRequestException('模板内容过长，最大支持10000字符');
    }

    if (content.subject && content.subject.length > 200) {
      throw new BadRequestException('模板主题过长，最大支持200字符');
    }
  }

  /**
   * 渲染模板内容
   */
  private renderTemplateContent(
    content: TemplateContent,
    variables: Record<string, any>,
    engine: TemplateEngine = 'handlebars'
  ): TemplateContent {
    switch (engine) {
      case 'handlebars':
        return this.renderWithHandlebars(content, variables);
      case 'plain':
        return content;
      default:
        throw new BadRequestException(`不支持的模板引擎: ${engine}`);
    }
  }

  /**
   * 使用Handlebars渲染模板
   */
  private renderWithHandlebars(content: TemplateContent, variables: Record<string, any>): TemplateContent {
    const safeVariables = this.sanitizeVariables(variables);

    const renderedContent: TemplateContent = {
      body: this.compileAndRender(content.body, safeVariables),
      format: content.format,
    };

    if (content.subject) {
      renderedContent.subject = this.compileAndRender(content.subject, safeVariables);
    }

    return renderedContent;
  }

  /**
   * 编译和渲染Handlebars模板
   */
  private compileAndRender(template: string, variables: Record<string, any>): string {
    const cacheKey = this.hashString(template);
    
    let compiledTemplate = this.handlebarsCache.get(cacheKey);
    if (!compiledTemplate) {
      compiledTemplate = Handlebars.compile(template);
      this.handlebarsCache.set(cacheKey, compiledTemplate);
    }

    return compiledTemplate(variables);
  }

  /**
   * 清理模板变量，防止XSS攻击
   */
  private sanitizeVariables(variables: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(variables)) {
      if (typeof value === 'string') {
        sanitized[key] = value.replace(/[<>&"']/g, (char) => {
          const entities: Record<string, string> = {
            '<': '&lt;',
            '>': '&gt;',
            '&': '&amp;',
            '"': '&quot;',
            "'": '&#x27;'
          };
          return entities[char];
        });
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * 字符串哈希函数
   */
  private hashString(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return hash.toString();
  }

  /**
   * 清理模板缓存
   */
  private clearTemplateCache(templateId?: string): void {
    if (templateId) {
      // 清理特定模板的缓存
      for (const key of this.handlebarsCache.keys()) {
        if (key.includes(templateId)) {
          this.handlebarsCache.delete(key);
        }
      }
    } else {
      // 清理所有缓存
      this.handlebarsCache.clear();
    }
  }

  /**
   * 注册Handlebars助手函数
   */
  private registerHandlebarsHelpers(): void {
    // 日期格式化助手
    Handlebars.registerHelper('formatDate', (date: Date, format?: string) => {
      if (!date) return '';
      
      const d = new Date(date);
      if (isNaN(d.getTime())) return date.toString();
      
      switch (format) {
        case 'short':
          return d.toLocaleDateString('zh-CN');
        case 'time':
          return d.toLocaleTimeString('zh-CN');
        case 'datetime':
        default:
          return d.toLocaleString('zh-CN');
      }
    });

    // 数字格式化助手
    Handlebars.registerHelper('formatNumber', (number: number, decimals?: number) => {
      if (typeof number !== 'number') return number;
      return number.toFixed(decimals || 2);
    });

    // 条件助手
    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    Handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    Handlebars.registerHelper('gt', (a: number, b: number) => a > b);
    Handlebars.registerHelper('lt', (a: number, b: number) => a < b);

    // 字符串助手
    Handlebars.registerHelper('upper', (str: string) => str ? str.toUpperCase() : '');
    Handlebars.registerHelper('lower', (str: string) => str ? str.toLowerCase() : '');
    Handlebars.registerHelper('truncate', (str: string, length: number) => {
      if (!str || str.length <= length) return str;
      return str.substring(0, length) + '...';
    });
  }
}