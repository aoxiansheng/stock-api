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
  UseInterceptors,
  UseFilters,
} from "@nestjs/common";
import { UniversalExceptionFactory, ComponentIdentifier, BusinessErrorCode } from "@common/core/exceptions";
import { NOTIFICATION_ERROR_CODES } from "../constants/notification-error-codes.constants";

import { createLogger } from "@common/logging/index";

// 导入通用组件
import {
  ResponseInterceptor,
  RequestTrackingInterceptor,
} from "@common/core/interceptors";
import { GlobalExceptionFilter } from "@common/core/filters";
import {
  ApiSuccessResponse,
  ApiCreatedResponse,
  ApiPaginatedResponse,
  ApiStandardResponses,
} from "@common/core/decorators/swagger-responses.decorator";

import { NotificationTemplateService } from "../services/notification-template.service";
import type {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateRenderContext,
} from "../services/notification-template.service";
import { TemplateQueryDto } from "../dto/template-query.dto";

import { NOTIFICATION_MESSAGES } from "../constants/notification.constants";

// 现代化验证限制 - 使用合理的默认值替代硬编码常量
const VALIDATION_LIMITS = {
  CONTENT_MAX_LENGTH: 10000,
  TITLE_MAX_LENGTH: 500,
} as const;

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

@Controller("templates")
@UseInterceptors(ResponseInterceptor, RequestTrackingInterceptor)
@UseFilters(GlobalExceptionFilter)
export class TemplateController {
  private readonly logger = createLogger("TemplateController");

  constructor(private readonly templateService: NotificationTemplateService) {}

  /**
   * 创建通知模板
   * POST /templates
   */
  @ApiCreatedResponse()
  @ApiStandardResponses()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(@Body() createTemplateDto: CreateTemplateDto) {
    this.logger.debug("创建通知模板", {
      templateId: createTemplateDto.templateId,
    });

    return await this.templateService.createTemplate(createTemplateDto);
  }

  /**
   * 获取模板列表
   * GET /templates
   */
  @ApiPaginatedResponse()
  @ApiStandardResponses()
  @Get()
  async getTemplates(@Query() query: TemplateQueryDto) {
    this.logger.debug("获取模板列表", { query });

    return await this.templateService.queryTemplates(query);
  }

  /**
   * 根据ID获取模板
   * GET /templates/:templateId
   */
  @ApiSuccessResponse()
  @ApiStandardResponses()
  @Get(":templateId")
  async getTemplate(@Param("templateId") templateId: string) {
    this.logger.debug("获取单个模板", { templateId });

    return await this.templateService.findTemplateById(templateId);
  }

  /**
   * 更新模板
   * PUT /templates/:templateId
   */
  @ApiSuccessResponse()
  @ApiStandardResponses()
  @Put(":templateId")
  @HttpCode(HttpStatus.OK)
  async updateTemplate(
    @Param("templateId") templateId: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ) {
    this.logger.debug("更新模板", { templateId });

    return await this.templateService.updateTemplate(
      templateId,
      updateTemplateDto,
    );
  }

  /**
   * 删除模板
   * DELETE /templates/:templateId
   */
  @ApiSuccessResponse()
  @ApiStandardResponses()
  @Delete(":templateId")
  @HttpCode(HttpStatus.OK)
  async deleteTemplate(@Param("templateId") templateId: string) {
    this.logger.debug("删除模板", { templateId });

    await this.templateService.deleteTemplate(templateId);
    return { message: "模板删除成功" };
  }

  /**
   * 根据事件类型获取模板
   * GET /templates/event/:eventType
   */
  @ApiSuccessResponse()
  @ApiStandardResponses()
  @Get("event/:eventType")
  async getTemplatesByEventType(@Param("eventType") eventType: string) {
    this.logger.debug("根据事件类型获取模板", { eventType });

    return await this.templateService.getTemplatesByEventType(eventType);
  }

  /**
   * 渲染模板
   * POST /templates/render
   */
  @ApiSuccessResponse()
  @ApiStandardResponses()
  @Post("render")
  @HttpCode(HttpStatus.OK)
  async renderTemplate(@Body() renderDto: RenderTemplateDto) {
    this.logger.debug("渲染模板", {
      templateId: renderDto.templateId,
      channelType: renderDto.channelType,
    });

    if (!renderDto.templateId || !renderDto.variables) {
      throw UniversalExceptionFactory.createBusinessException({
        message: "templateId and variables parameters are required",
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'renderTemplate',
        component: ComponentIdentifier.NOTIFICATION,
        context: {
          templateId: renderDto.templateId,
          variables: renderDto.variables,
          customErrorCode: NOTIFICATION_ERROR_CODES.MISSING_REQUIRED_FIELDS,
          reason: 'missing_required_parameters'
        },
        retryable: false
      });
    }

    const context: TemplateRenderContext = {
      templateId: renderDto.templateId,
      channelType: renderDto.channelType,
      variables: renderDto.variables,
      fallbackToDefault: renderDto.fallbackToDefault,
    };

    return await this.templateService.renderTemplate(context);
  }

  /**
   * 批量渲染模板
   * POST /templates/render/batch
   */
  @ApiSuccessResponse()
  @ApiStandardResponses()
  @Post("render/batch")
  @HttpCode(HttpStatus.OK)
  async renderTemplatesBatch(@Body() batchRenderDto: BatchRenderDto) {
    this.logger.debug("批量渲染模板", {
      count: batchRenderDto.requests.length,
    });

    if (!batchRenderDto.requests || batchRenderDto.requests.length === 0) {
      throw UniversalExceptionFactory.createBusinessException({
        message: "requests parameter cannot be empty",
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'renderTemplatesBatch',
        component: ComponentIdentifier.NOTIFICATION,
        context: {
          requestsLength: batchRenderDto.requests?.length || 0,
          customErrorCode: NOTIFICATION_ERROR_CODES.MISSING_REQUIRED_FIELDS,
          reason: 'empty_requests_array'
        },
        retryable: false
      });
    }

    if (batchRenderDto.requests.length > 50) {
      throw UniversalExceptionFactory.createBusinessException({
        message: "Batch rendering supports maximum 50 templates per request",
        errorCode: BusinessErrorCode.BUSINESS_RULE_VIOLATION,
        operation: 'renderTemplatesBatch',
        component: ComponentIdentifier.NOTIFICATION,
        context: {
          requestsLength: batchRenderDto.requests.length,
          maxAllowed: 50,
          customErrorCode: NOTIFICATION_ERROR_CODES.QUEUE_CAPACITY_EXCEEDED,
          reason: 'batch_size_exceeded'
        },
        retryable: false
      });
    }

    const contexts: TemplateRenderContext[] = batchRenderDto.requests.map(
      (request) => ({
        templateId: request.templateId,
        channelType: request.channelType,
        variables: request.variables,
        fallbackToDefault: request.fallbackToDefault,
      }),
    );

    return await this.templateService.renderTemplatesBatch(contexts);
  }

  /**
   * 复制模板
   * POST /templates/:templateId/duplicate
   */
  @ApiCreatedResponse()
  @ApiStandardResponses()
  @Post(":templateId/duplicate")
  @HttpCode(HttpStatus.CREATED)
  async duplicateTemplate(
    @Param("templateId") templateId: string,
    @Body() duplicateDto: DuplicateTemplateDto,
  ) {
    this.logger.debug("复制模板", {
      sourceTemplateId: templateId,
      newTemplateId: duplicateDto.newTemplateId,
    });

    if (!duplicateDto.newTemplateId) {
      throw UniversalExceptionFactory.createBusinessException({
        message: "newTemplateId parameter is required",
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'duplicateTemplate',
        component: ComponentIdentifier.NOTIFICATION,
        context: {
          templateId,
          newTemplateId: duplicateDto.newTemplateId,
          customErrorCode: NOTIFICATION_ERROR_CODES.MISSING_REQUIRED_FIELDS,
          reason: 'missing_new_template_id'
        },
        retryable: false
      });
    }

    return await this.templateService.duplicateTemplate(
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
      },
    );
  }

  /**
   * 获取模板统计信息
   * GET /templates/stats/overview
   */
  @ApiSuccessResponse()
  @ApiStandardResponses()
  @Get("stats/overview")
  async getTemplateStats() {
    this.logger.debug("获取模板统计信息");

    return await this.templateService.getTemplateStats();
  }

  /**
   * 验证模板语法
   * POST /templates/validate
   */
  @ApiSuccessResponse()
  @ApiStandardResponses()
  @Post("validate")
  @HttpCode(HttpStatus.OK)
  async validateTemplate(
    @Body()
    validateDto: {
      templateContent: string;
      templateEngine?: string;
      variables?: Record<string, any>;
    },
  ) {
    this.logger.debug("验证模板语法");

    try {
      // 简单的语法验证
      if (
        !validateDto.templateContent ||
        validateDto.templateContent.trim().length === 0
      ) {
        throw UniversalExceptionFactory.createBusinessException({
          message: "Template content cannot be empty",
          errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
          operation: 'validateTemplate',
          component: ComponentIdentifier.NOTIFICATION,
          context: {
            templateContent: validateDto.templateContent,
            customErrorCode: NOTIFICATION_ERROR_CODES.INVALID_TEMPLATE_DATA,
            reason: 'empty_template_content'
          },
          retryable: false
        });
      }

      if (
        validateDto.templateContent.length >
        VALIDATION_LIMITS.CONTENT_MAX_LENGTH
      ) {
        throw UniversalExceptionFactory.createBusinessException({
          message: `Template content too long, maximum ${VALIDATION_LIMITS.CONTENT_MAX_LENGTH} characters supported`,
          errorCode: BusinessErrorCode.BUSINESS_RULE_VIOLATION,
          operation: 'validateTemplate',
          component: ComponentIdentifier.NOTIFICATION,
          context: {
            contentLength: validateDto.templateContent.length,
            maxLength: VALIDATION_LIMITS.CONTENT_MAX_LENGTH,
            customErrorCode: NOTIFICATION_ERROR_CODES.TEMPLATE_VALIDATION_FAILED,
            reason: 'template_content_too_long'
          },
          retryable: false
        });
      }

      // 如果提供了变量，尝试渲染验证
      if (validateDto.variables) {
        const testTemplate = {
          templateId: "test-template",
          variables: validateDto.variables,
        };

        // 这里可以添加具体的模板引擎验证逻辑
        // 由于我们还没有独立的验证方法，这里做基础验证
      }

      return {
        valid: true,
        errors: [],
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error.message],
      };
    }
  }

  /**
   * 批量启用/禁用模板
   * PUT /templates/batch/toggle
   */
  @ApiSuccessResponse()
  @ApiStandardResponses()
  @Put("batch/toggle")
  @HttpCode(HttpStatus.OK)
  async batchToggleTemplates(
    @Body() batchToggleDto: { templateIds: string[]; enabled: boolean },
  ) {
    this.logger.debug("批量切换模板状态", {
      count: batchToggleDto.templateIds.length,
      enabled: batchToggleDto.enabled,
    });

    if (
      !batchToggleDto.templateIds ||
      batchToggleDto.templateIds.length === 0
    ) {
      throw UniversalExceptionFactory.createBusinessException({
        message: "templateIds cannot be empty",
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'batchToggleTemplates',
        component: ComponentIdentifier.NOTIFICATION,
        context: {
          templateIdsLength: batchToggleDto.templateIds?.length || 0,
          customErrorCode: NOTIFICATION_ERROR_CODES.MISSING_REQUIRED_FIELDS,
          reason: 'empty_template_ids'
        },
        retryable: false
      });
    }

    if (batchToggleDto.templateIds.length > 100) {
      throw UniversalExceptionFactory.createBusinessException({
        message: "Batch operation supports maximum 100 templates per request",
        errorCode: BusinessErrorCode.BUSINESS_RULE_VIOLATION,
        operation: 'batchToggleTemplates',
        component: ComponentIdentifier.NOTIFICATION,
        context: {
          templateIdsLength: batchToggleDto.templateIds.length,
          maxAllowed: 100,
          customErrorCode: NOTIFICATION_ERROR_CODES.QUEUE_CAPACITY_EXCEEDED,
          reason: 'batch_size_exceeded'
        },
        retryable: false
      });
    }

    const results = await Promise.allSettled(
      batchToggleDto.templateIds.map((templateId) =>
        this.templateService.updateTemplate(templateId, {
          enabled: batchToggleDto.enabled,
        }),
      ),
    );

    const successful: string[] = [];
    const failed: Array<{ templateId: string; error: string }> = [];

    results.forEach((result, index) => {
      const templateId = batchToggleDto.templateIds[index];
      if (result.status === "fulfilled") {
        successful.push(templateId);
      } else {
        failed.push({
          templateId,
          error: result.reason.message,
        });
      }
    });

    return {
      successful,
      failed,
      successCount: successful.length,
      failedCount: failed.length,
    };
  }

  /**
   * 根据标签搜索模板
   * GET /templates/search/tags
   */
  @ApiSuccessResponse()
  @ApiStandardResponses()
  @Get("search/tags")
  async searchTemplatesByTags(@Query("tags") tags: string) {
    this.logger.debug("根据标签搜索模板", { tags });

    if (!tags) {
      throw UniversalExceptionFactory.createBusinessException({
        message: "tags parameter is required",
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'searchTemplatesByTags',
        component: ComponentIdentifier.NOTIFICATION,
        context: {
          tags,
          customErrorCode: NOTIFICATION_ERROR_CODES.MISSING_REQUIRED_FIELDS,
          reason: 'missing_tags_parameter'
        },
        retryable: false
      });
    }

    const tagArray = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag);

    if (tagArray.length === 0) {
      throw UniversalExceptionFactory.createBusinessException({
        message: "At least one valid tag is required",
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'searchTemplatesByTags',
        component: ComponentIdentifier.NOTIFICATION,
        context: {
          originalTags: tags,
          parsedTags: tagArray,
          customErrorCode: NOTIFICATION_ERROR_CODES.INVALID_TEMPLATE_DATA,
          reason: 'no_valid_tags'
        },
        retryable: false
      });
    }

    const templates = await this.templateService.queryTemplates({
      tags: tagArray,
      enabled: true,
    });

    return {
      items: templates.items,
      total: templates.pagination.total,
    };
  }

  /**
   * 模板使用情况分析
   * GET /templates/:templateId/usage
   */
  @ApiSuccessResponse()
  @ApiStandardResponses()
  @Get(":templateId/usage")
  async getTemplateUsage(@Param("templateId") templateId: string) {
    this.logger.debug("获取模板使用情况", { templateId });

    const template = await this.templateService.findTemplateById(templateId);

    return {
      templateId: template.templateId,
      name: template.name,
      usageCount: template.usageCount,
      lastUsedAt: template.lastUsedAt,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  /**
   * 导出模板配置
   * GET /templates/:templateId/export
   */
  @ApiSuccessResponse()
  @ApiStandardResponses()
  @Get(":templateId/export")
  async exportTemplate(@Param("templateId") templateId: string) {
    this.logger.debug("导出模板配置", { templateId });

    const template = await this.templateService.findTemplateById(templateId);

    // 移除不需要导出的字段
    return {
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
  }

  /**
   * 导入模板配置
   * POST /templates/import
   */
  @ApiCreatedResponse()
  @ApiStandardResponses()
  @Post("import")
  @HttpCode(HttpStatus.CREATED)
  async importTemplate(@Body() importData: CreateTemplateDto) {
    this.logger.debug("导入模板配置", { templateId: importData.templateId });

    // 设置为用户定义的模板
    const templateData: CreateTemplateDto = {
      ...importData,
      templateType: "user_defined",
      enabled: true,
    };

    return await this.templateService.createTemplate(templateData);
  }
}
