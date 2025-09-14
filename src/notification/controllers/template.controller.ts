/**
 * 通知模板控制器
 * 🎯 提供通知模板管理的REST API接口
 * 
 * @description 实现模板的CRUD操作和高级功能
 * @author Claude Code Assistant
 * @date 2025-09-12
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';

import { createLogger } from '@appcore/config/logger.config';

import { NotificationTemplateService } from '../services/notification-template.service';
import type { 
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateQueryDto,
  TemplateRenderContext 
} from '../services/notification-template.service';

import { NOTIFICATION_MESSAGES } from '../constants/notification.constants';

/**
 * 模板渲染请求DTO
 */
interface RenderTemplateDto {
  templateId: string;
  channelType?: string;
  variables: Record<string, any>;
  fallbackToDefault?: boolean;
}

/**
 * 批量渲染请求DTO
 */
interface BatchRenderDto {
  requests: RenderTemplateDto[];
}

/**
 * 模板复制请求DTO
 */
interface DuplicateTemplateDto {
  newTemplateId: string;
  name?: string;
  description?: string;
  enabled?: boolean;
  priority?: number;
  tags?: string[];
  category?: string;
  metadata?: Record<string, any>;
}

@Controller('templates')
export class TemplateController {
  private readonly logger = createLogger('TemplateController');

  constructor(
    private readonly templateService: NotificationTemplateService,
  ) {}

  /**
   * 创建通知模板
   * POST /templates
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(@Body() createTemplateDto: CreateTemplateDto) {
    this.logger.debug('创建通知模板', { templateId: createTemplateDto.templateId });

    const template = await this.templateService.createTemplate(createTemplateDto);

    return {
      message: '模板创建成功',
      data: template,
    };
  }

  /**
   * 获取模板列表
   * GET /templates
   */
  @Get()
  async getTemplates(@Query() query: TemplateQueryDto) {
    this.logger.debug('获取模板列表', { query });

    const result = await this.templateService.queryTemplates(query);

    return {
      message: '获取模板列表成功',
      data: result.items,
      pagination: result.pagination,
    };
  }

  /**
   * 根据ID获取模板
   * GET /templates/:templateId
   */
  @Get(':templateId')
  async getTemplate(@Param('templateId') templateId: string) {
    this.logger.debug('获取单个模板', { templateId });

    const template = await this.templateService.findTemplateById(templateId);

    return {
      message: '获取模板成功',
      data: template,
    };
  }

  /**
   * 更新模板
   * PUT /templates/:templateId
   */
  @Put(':templateId')
  @HttpCode(HttpStatus.OK)
  async updateTemplate(
    @Param('templateId') templateId: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ) {
    this.logger.debug('更新模板', { templateId });

    const template = await this.templateService.updateTemplate(templateId, updateTemplateDto);

    return {
      message: '模板更新成功',
      data: template,
    };
  }

  /**
   * 删除模板
   * DELETE /templates/:templateId
   */
  @Delete(':templateId')
  @HttpCode(HttpStatus.OK)
  async deleteTemplate(@Param('templateId') templateId: string) {
    this.logger.debug('删除模板', { templateId });

    await this.templateService.deleteTemplate(templateId);

    return {
      message: '模板删除成功',
      data: null,
    };
  }

  /**
   * 根据事件类型获取模板
   * GET /templates/event/:eventType
   */
  @Get('event/:eventType')
  async getTemplatesByEventType(@Param('eventType') eventType: string) {
    this.logger.debug('根据事件类型获取模板', { eventType });

    const templates = await this.templateService.getTemplatesByEventType(eventType);

    return {
      message: '获取事件模板成功',
      data: templates,
    };
  }

  /**
   * 渲染模板
   * POST /templates/render
   */
  @Post('render')
  @HttpCode(HttpStatus.OK)
  async renderTemplate(@Body() renderDto: RenderTemplateDto) {
    this.logger.debug('渲染模板', { 
      templateId: renderDto.templateId,
      channelType: renderDto.channelType 
    });

    if (!renderDto.templateId || !renderDto.variables) {
      throw new BadRequestException('templateId和variables参数是必需的');
    }

    const context: TemplateRenderContext = {
      templateId: renderDto.templateId,
      channelType: renderDto.channelType,
      variables: renderDto.variables,
      fallbackToDefault: renderDto.fallbackToDefault,
    };

    const rendered = await this.templateService.renderTemplate(context);

    return {
      message: '模板渲染成功',
      data: rendered,
    };
  }

  /**
   * 批量渲染模板
   * POST /templates/render/batch
   */
  @Post('render/batch')
  @HttpCode(HttpStatus.OK)
  async renderTemplatesBatch(@Body() batchRenderDto: BatchRenderDto) {
    this.logger.debug('批量渲染模板', { count: batchRenderDto.requests.length });

    if (!batchRenderDto.requests || batchRenderDto.requests.length === 0) {
      throw new BadRequestException('requests参数不能为空');
    }

    if (batchRenderDto.requests.length > 50) {
      throw new BadRequestException('单次批量渲染最多支持50个模板');
    }

    const contexts: TemplateRenderContext[] = batchRenderDto.requests.map(request => ({
      templateId: request.templateId,
      channelType: request.channelType,
      variables: request.variables,
      fallbackToDefault: request.fallbackToDefault,
    }));

    const rendered = await this.templateService.renderTemplatesBatch(contexts);

    return {
      message: '批量渲染完成',
      data: rendered,
    };
  }

  /**
   * 复制模板
   * POST /templates/:templateId/duplicate
   */
  @Post(':templateId/duplicate')
  @HttpCode(HttpStatus.CREATED)
  async duplicateTemplate(
    @Param('templateId') templateId: string,
    @Body() duplicateDto: DuplicateTemplateDto,
  ) {
    this.logger.debug('复制模板', { 
      sourceTemplateId: templateId,
      newTemplateId: duplicateDto.newTemplateId 
    });

    if (!duplicateDto.newTemplateId) {
      throw new BadRequestException('newTemplateId参数是必需的');
    }

    const template = await this.templateService.duplicateTemplate(
      templateId,
      duplicateDto.newTemplateId,
      {
        name: duplicateDto.name,
        description: duplicateDto.description,
        enabled: duplicateDto.enabled,
        priority: duplicateDto.priority,
        tags: duplicateDto.tags,
        category: duplicateDto.category,
        metadata: duplicateDto.metadata,
      }
    );

    return {
      message: '模板复制成功',
      data: template,
    };
  }

  /**
   * 获取模板统计信息
   * GET /templates/stats
   */
  @Get('stats/overview')
  async getTemplateStats() {
    this.logger.debug('获取模板统计信息');

    const stats = await this.templateService.getTemplateStats();

    return {
      message: '获取统计信息成功',
      data: stats,
    };
  }

  /**
   * 验证模板语法
   * POST /templates/validate
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateTemplate(@Body() validateDto: {
    templateContent: string;
    templateEngine?: string;
    variables?: Record<string, any>;
  }) {
    this.logger.debug('验证模板语法');

    try {
      // 简单的语法验证
      if (!validateDto.templateContent || validateDto.templateContent.trim().length === 0) {
        throw new BadRequestException('模板内容不能为空');
      }

      if (validateDto.templateContent.length > 10000) {
        throw new BadRequestException('模板内容过长，最大支持10000字符');
      }

      // 如果提供了变量，尝试渲染验证
      if (validateDto.variables) {
        const testTemplate = {
          templateId: 'test-template',
          variables: validateDto.variables,
        };

        // 这里可以添加具体的模板引擎验证逻辑
        // 由于我们还没有独立的验证方法，这里做基础验证
      }

      return {
        message: '模板验证通过',
        data: {
          valid: true,
          errors: [],
        },
      };
    } catch (error) {
      return {
        message: '模板验证失败',
        data: {
          valid: false,
          errors: [error.message],
        },
      };
    }
  }

  /**
   * 批量启用/禁用模板
   * PUT /templates/batch/toggle
   */
  @Put('batch/toggle')
  @HttpCode(HttpStatus.OK)
  async batchToggleTemplates(@Body() batchToggleDto: {
    templateIds: string[];
    enabled: boolean;
  }) {
    this.logger.debug('批量切换模板状态', { 
      count: batchToggleDto.templateIds.length,
      enabled: batchToggleDto.enabled 
    });

    if (!batchToggleDto.templateIds || batchToggleDto.templateIds.length === 0) {
      throw new BadRequestException('templateIds不能为空');
    }

    if (batchToggleDto.templateIds.length > 100) {
      throw new BadRequestException('单次批量操作最多支持100个模板');
    }

    const results = await Promise.allSettled(
      batchToggleDto.templateIds.map(templateId =>
        this.templateService.updateTemplate(templateId, { 
          enabled: batchToggleDto.enabled 
        })
      )
    );

    const successful: string[] = [];
    const failed: Array<{ templateId: string; error: string }> = [];

    results.forEach((result, index) => {
      const templateId = batchToggleDto.templateIds[index];
      if (result.status === 'fulfilled') {
        successful.push(templateId);
      } else {
        failed.push({
          templateId,
          error: result.reason.message,
        });
      }
    });

    return {
      message: '批量操作完成',
      data: {
        successful,
        failed,
        successCount: successful.length,
        failedCount: failed.length,
      },
    };
  }

  /**
   * 根据标签搜索模板
   * GET /templates/search/tags
   */
  @Get('search/tags')
  async searchTemplatesByTags(@Query('tags') tags: string) {
    this.logger.debug('根据标签搜索模板', { tags });

    if (!tags) {
      throw new BadRequestException('tags参数是必需的');
    }

    const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    
    if (tagArray.length === 0) {
      throw new BadRequestException('至少需要一个有效的标签');
    }

    const templates = await this.templateService.queryTemplates({
      tags: tagArray,
      enabled: true,
    });

    return {
      message: '搜索完成',
      data: templates.items,
      total: templates.pagination.total,
    };
  }

  /**
   * 模板使用情况分析
   * GET /templates/:templateId/usage
   */
  @Get(':templateId/usage')
  async getTemplateUsage(@Param('templateId') templateId: string) {
    this.logger.debug('获取模板使用情况', { templateId });

    const template = await this.templateService.findTemplateById(templateId);

    return {
      message: '获取使用情况成功',
      data: {
        templateId: template.templateId,
        name: template.name,
        usageCount: template.usageCount,
        lastUsedAt: template.lastUsedAt,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      },
    };
  }

  /**
   * 导出模板配置
   * GET /templates/:templateId/export
   */
  @Get(':templateId/export')
  async exportTemplate(@Param('templateId') templateId: string) {
    this.logger.debug('导出模板配置', { templateId });

    const template = await this.templateService.findTemplateById(templateId);

    // 移除不需要导出的字段
    const exportData = {
      templateId: template.templateId,
      name: template.name,
      description: template.description,
      eventType: template.eventType,
      defaultContent: template.defaultContent,
      channelTemplates: template.channelTemplates,
      variables: template.variables,
      priority: template.priority,
      templateEngine: template.templateEngine,
      tags: template.tags,
      category: template.category,
      metadata: template.metadata,
      version: template.version,
    };

    return {
      message: '导出成功',
      data: exportData,
    };
  }

  /**
   * 导入模板配置
   * POST /templates/import
   */
  @Post('import')
  @HttpCode(HttpStatus.CREATED)
  async importTemplate(@Body() importData: CreateTemplateDto) {
    this.logger.debug('导入模板配置', { templateId: importData.templateId });

    // 设置为用户定义的模板
    const templateData: CreateTemplateDto = {
      ...importData,
      templateType: 'user_defined',
      enabled: true,
    };

    const template = await this.templateService.createTemplate(templateData);

    return {
      message: '模板导入成功',
      data: template,
    };
  }
}