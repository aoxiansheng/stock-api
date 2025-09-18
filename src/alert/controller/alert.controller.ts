import { REFERENCE_DATA } from "@common/constants/domain";
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  BadRequestException,
  NotFoundException,
  Req,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiTags, ApiOperation, ApiParam } from "@nestjs/swagger";

import { createLogger } from "@common/logging/index";
import { CONSTANTS } from "@common/constants";
import { HttpHeadersUtil } from "@common/utils/http-headers.util";
import {
  BUSINESS_ERROR_MESSAGES,
  HTTP_ERROR_MESSAGES,
} from "@common/constants/semantic/error-messages.constants";

// 使用通用错误消息常量 - 移除自定义频率限制配置
// 现在使用 @Throttle 装饰器和全局 ThrottlerGuard

import {
  ApiSuccessResponse,
  ApiCreatedResponse,
  JwtAuthResponses,
  ApiPaginatedResponse,
  ApiStandardResponses,
} from "@common/core/decorators/swagger-responses.decorator";
import { PaginatedDataDto } from "@common/modules/pagination/dto/paginated-data";
import { PaginationService } from "@common/modules/pagination/services/pagination.service";

import { Auth } from "../../auth/decorators/auth.decorator";
import { UserRole } from "../../auth/enums/user-role.enum";

import {
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
  AlertQueryDto,
  AcknowledgeAlertDto,
  ResolveAlertDto,
  AlertStatsDto,
  AlertResponseDto,
  TriggerAlertDto,
} from "../dto";
import { IAlertRule, IAlert, IAlertStats, IMetricData } from "../interfaces";
// 🆕 New service imports - using orchestrator service as single entry point
import { AlertOrchestratorService } from "../services/alert-orchestrator.service";

// 使用标准化认证装饰器 - 告警管理需要管理员权限

@ApiTags("告警管理")
@Controller("alerts")
export class AlertController {
  private readonly logger = createLogger(AlertController.name);

  constructor(
    // 🆕 New service architecture - single orchestrator service
    private readonly alertOrchestrator: AlertOrchestratorService,
    private readonly paginationService: PaginationService,
  ) {}

  // ==================== 告警规则管理 ====================

  @Post("rules")
  @Auth([UserRole.ADMIN])
  @ApiOperation({
    summary: "🚨 创建告警规则",
    description: `
### 功能说明
创建新的系统告警规则，用于监控系统性能指标和安全事件。

### 权限要求
仅限管理员用户

### 主要特性
- **📊 多指标监控**: 支持CPU、内存、响应时间、错误率等多种指标
- **🎯 灵活阈值**: 可配置不同的告警阈值和条件
- **📡 多渠道通知**: 支持邮件、短信、Webhook等通知方式
- **⏰ 智能频率控制**: 防止告警风暴，支持静默期设置

### 示例请求
\`\`\`json
{
  "name": "CPU使用率过高告警",
  "metric": "cpu_usage",
  "condition": ">",
  "threshold": 80,
  "severity": "warning",
  "enabled": true,
  "silenceWindow": 300,
  "notificationChannels": ["email", "webhook"]
}
\`\`\`
    `,
  })
  @ApiCreatedResponse({
    description: "告警规则创建成功",
    type: CreateAlertRuleDto,
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async createRule(
    @Body() createRuleDto: CreateAlertRuleDto,
  ): Promise<IAlertRule> {
    // 🆕 Use new orchestrator service for rule creation
    return await this.alertOrchestrator.createRule(createRuleDto);
  }

  @Get("rules")
  @Auth([UserRole.ADMIN])
  @ApiOperation({
    summary: "📋 获取所有告警规则",
    description: `
### 功能说明
获取系统中配置的所有告警规则列表，包括启用和禁用的规则。

### 权限要求
仅限管理员用户

### 响应内容
- 告警规则基本信息
- 规则状态和配置
- 最近触发时间
- 统计信息
    `,
  })
  @ApiSuccessResponse({
    description: "获取告警规则成功",
    type: [CreateAlertRuleDto],
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getRules(): Promise<IAlertRule[]> {
    // 🆕 Use new rule service for fetching rules
    return await this.alertOrchestrator.getRules();
  }

  @Get("rules/:ruleId")
  @Auth([UserRole.ADMIN])
  @ApiOperation({ summary: "根据ID获取告警规则" })
  @ApiParam({ name: "ruleId", description: "告警规则ID" })
  @ApiSuccessResponse({
    description: "获取告警规则成功",
    type: CreateAlertRuleDto,
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getRuleById(
    @Param("ruleId") ruleId: string,
  ): Promise<IAlertRule | null> {
    // 🆕 Use new rule service for fetching rule by ID
    return await this.alertOrchestrator.getRuleById(ruleId);
  }

  @Put("rules/:ruleId")
  @Auth([UserRole.ADMIN])
  @ApiOperation({ summary: "更新告警规则" })
  @ApiParam({ name: "ruleId", description: "告警规则ID" })
  @ApiSuccessResponse({
    description: "更新告警规则成功",
    type: CreateAlertRuleDto,
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async updateRule(
    @Param("ruleId") ruleId: string,
    @Body() updateRuleDto: UpdateAlertRuleDto,
  ): Promise<IAlertRule | null> {
    // 🆕 Use new orchestrator service for rule updates
    return await this.alertOrchestrator.updateRule(ruleId, updateRuleDto);
  }

  @Delete("rules/:ruleId")
  @Auth([UserRole.ADMIN])
  @ApiOperation({ summary: "删除告警规则" })
  @ApiParam({ name: "ruleId", description: "告警规则ID" })
  @ApiSuccessResponse({ description: "删除告警规则成功" })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async deleteRule(@Param("ruleId") ruleId: string): Promise<void> {
    // 🆕 Use new orchestrator service for rule deletion (includes cache cleanup)
    // Exception handling moved to service layer
    await this.alertOrchestrator.deleteRule(ruleId);
  }

  @Post("rules/:ruleId/toggle")
  @Auth([UserRole.ADMIN])
  @ApiOperation({ summary: "启用/禁用告警规则" })
  @ApiParam({ name: "ruleId", description: "告警规则ID" })
  @ApiSuccessResponse({
    description: "切换告警规则状态成功",
    type: CreateAlertRuleDto,
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async toggleRule(
    @Param("ruleId") ruleId: string,
    @Body() body: { enabled: boolean },
  ): Promise<void> {
    // 🆕 Use new rule service for toggling rule status
    await this.alertOrchestrator.toggleRule(ruleId, body.enabled);
  }

  // ==================== 告警管理 ====================

  @Get("active")
  @Auth([UserRole.ADMIN])
  @ApiOperation({
    summary: "🔴 获取活跃告警",
    description: `
### 功能说明
获取当前所有活跃状态的告警，包括未确认和已确认但未解决的告警。

### 权限要求
仅限管理员用户

### 查询参数
- ruleId: 按告警规则ID过滤
- severity: 按严重程度过滤（critical, warning, info）
- metric: 按监控指标过滤

### 响应特点
- 实时活跃告警状态
- 告警持续时间
- 确认状态
- 严重程度排序
    `,
  })
  @ApiSuccessResponse({
    description: "获取活跃告警成功",
    type: [AlertResponseDto],
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getActiveAlerts(
    @Query() query?: AlertQueryDto,
  ): Promise<AlertResponseDto[]> {
    // 🆕 Use orchestrator service for fetching active alerts with built-in filtering
    const alerts = await this.alertOrchestrator.getActiveAlerts();

    return alerts.map(AlertResponseDto.fromEntity);
  }

  @Get("history")
  @Auth([UserRole.ADMIN])
  @ApiOperation({ summary: "查询告警历史" })
  @ApiPaginatedResponse(AlertResponseDto)
  @JwtAuthResponses()
  async getAlertHistory(
    @Query() query: AlertQueryDto,
  ): Promise<PaginatedDataDto<AlertResponseDto>> {
    // 🆕 Use pagination service for normalized pagination parameters
    const paginationQuery =
      this.paginationService.normalizePaginationQuery(query);

    // Convert string dates to Date objects
    const convertedQuery = {
      ...query,
      startTime: query.startTime ? new Date(query.startTime) : undefined,
      endTime: query.endTime ? new Date(query.endTime) : undefined,
    };

    const result = await this.alertOrchestrator.queryAlerts(convertedQuery);

    return this.paginationService.createPaginatedResponse(
      result.alerts.map(AlertResponseDto.fromEntity),
      paginationQuery.page,
      paginationQuery.limit,
      result.total,
    );
  }

  @Get("stats")
  @Auth([UserRole.ADMIN])
  @ApiOperation({ summary: "获取告警统计" })
  @ApiSuccessResponse({ type: AlertStatsDto })
  @JwtAuthResponses()
  async getAlertStats(): Promise<IAlertStats> {
    // 🆕 Use orchestrator service for alert statistics
    return await this.alertOrchestrator.getStats();
  }

  @Get(":alertId")
  @Auth([UserRole.ADMIN])
  @ApiOperation({ summary: "根据ID获取告警详情" })
  @ApiParam({ name: "alertId", description: "告警ID" })
  @ApiSuccessResponse({ type: AlertResponseDto })
  @JwtAuthResponses()
  async getAlertById(
    @Param("alertId") alertId: string,
  ): Promise<AlertResponseDto | null> {
    // 🆕 Use orchestrator service for fetching alert by ID
    const alert = await this.alertOrchestrator.getAlertById(alertId);
    return alert ? AlertResponseDto.fromEntity(alert) : null;
  }

  @Post(":alertId/acknowledge")
  @Auth([UserRole.ADMIN])
  @ApiOperation({ summary: "确认告警" })
  @ApiParam({ name: "alertId", description: "告警ID" })
  @ApiSuccessResponse({ type: AlertResponseDto })
  @JwtAuthResponses()
  async acknowledgeAlert(
    @Param("alertId") alertId: string,
    @Body() body: AcknowledgeAlertDto,
  ): Promise<AlertResponseDto> {
    // 🆕 Use orchestrator service for acknowledging alerts
    const alert = await this.alertOrchestrator.acknowledgeAlert(
      alertId,
      body.acknowledgedBy,
      body.note,
    );

    return AlertResponseDto.fromEntity(alert);
  }

  @Post(":alertId/resolve")
  @Auth([UserRole.ADMIN])
  @ApiOperation({ summary: "解决告警" })
  @ApiParam({ name: "alertId", description: "告警ID" })
  @ApiSuccessResponse({ description: "解决告警成功" })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async resolveAlert(
    @Param("alertId") alertId: string,
    @Body() body: ResolveAlertDto,
  ): Promise<void> {
    // 🆕 Use orchestrator service for resolving alerts
    // Exception handling moved to service layer
    const alert = await this.alertOrchestrator.getAlertById(alertId);
    await this.alertOrchestrator.resolveAlert(
      alertId,
      body.resolvedBy,
      alert.ruleId,
      body.solution,
    );
  }

  // ==================== 手动触发 ====================

  @Post("trigger")
  @Auth([UserRole.ADMIN])
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 每分钟最多5次触发
  @ApiOperation({
    summary: "⚡ 手动触发告警评估",
    description: `
### 功能说明
手动触发系统告警评估，立即检查所有配置的告警规则。

### 权限要求
仅限管理员用户

### 频率限制
- 每分钟最多5次触发
- 防止过度触发影响系统性能

### 使用场景
- 系统维护后的状态检查
- 新规则部署后的验证
- 紧急情况下的即时评估
- 调试告警规则配置

### 可选参数
- ruleId: 仅评估指定规则（可选）
    `,
  })
  @ApiSuccessResponse({
    schema: {
      example: {
        statusCode: 200,
        message: "告警评估已触发",
        data: {
          message: "告警评估已触发",
          triggeredAt: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
          estimatedDuration: "5-10秒",
        },
        timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
      },
    },
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async triggerEvaluation(
    @Body() triggerDto?: TriggerAlertDto,
    @Req() req?: any,
  ): Promise<{ message: string }> {
    // 频率限制现在由 @Throttle 装饰器和 ThrottlerGuard 处理

    // Enhanced security: Get secure client identifier for audit logging
    const clientIdentifier = req
      ? HttpHeadersUtil.getSecureClientIdentifier(req)
      : "unknown";
    this.logger.log(`告警评估触发请求来自客户端: ${clientIdentifier}`);

    // Use orchestrator service for evaluation
    if (triggerDto?.ruleId) {
      // Validate rule exists - exception handling moved to service layer
      await this.alertOrchestrator.getRuleById(triggerDto.ruleId);
    }

    // Prepare metric data
    const metricsData: IMetricData[] = triggerDto?.metrics
      ? triggerDto.metrics.map((metric) => ({
          metric: metric.metric,
          value: metric.value,
          timestamp: new Date(metric.timestamp),
          tags: metric.tags,
        }))
      : [];

    // Use orchestrator service for evaluation
    await this.alertOrchestrator.evaluateAllRules(metricsData);

    // 🔧 Simplified message generation - let ResponseInterceptor handle formatting
    const message = this.generateEvaluationMessage(triggerDto);

    return { message };
  }

  /**
   * 生成评估触发消息
   * 简化消息生成逻辑，提高可读性和可维护性
   */
  private generateEvaluationMessage(triggerDto?: TriggerAlertDto): string {
    if (triggerDto?.ruleId) {
      return `告警规则 ${triggerDto.ruleId} 评估已触发`;
    }

    if (triggerDto?.metrics?.length) {
      return `告警评估已触发，处理了 ${triggerDto.metrics.length} 个指标`;
    }

    return "告警评估已触发";
  }

  // ==================== 批量操作 ====================

  @Post("batch/acknowledge")
  @Auth([UserRole.ADMIN])
  @ApiOperation({ summary: "批量确认告警" })
  @ApiSuccessResponse({
    description: "批量确认告警成功",
    schema: {
      type: "object",
      properties: {
        succeeded: { type: "array", items: { type: "string" } },
        failed: { type: "array", items: { type: "string" } },
      },
    },
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async batchAcknowledgeAlerts(
    @Body() body: { alertIds: string[]; acknowledgedBy: string },
  ): Promise<{ succeeded: string[]; failed: string[] }> {
    // Use orchestrator service for batch acknowledgment
    const results = await this.processBatchOperation(
      body.alertIds,
      "acknowledge",
      async (alertId) => {
        await this.alertOrchestrator.acknowledgeAlert(
          alertId,
          body.acknowledgedBy,
        );
      },
    );

    return results;
  }

  @Post("batch/resolve")
  @Auth([UserRole.ADMIN])
  @ApiOperation({ summary: "批量解决告警" })
  @ApiSuccessResponse({
    description: "批量解决告警成功",
    schema: {
      type: "object",
      properties: {
        succeeded: { type: "array", items: { type: "string" } },
        failed: { type: "array", items: { type: "string" } },
      },
    },
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async batchResolveAlerts(
    @Body() body: { alertIds: string[]; resolvedBy: string },
  ): Promise<{ succeeded: string[]; failed: string[] }> {
    // Pre-fetch alert data for batch resolution
    const allAlerts = await this.alertOrchestrator.getActiveAlerts();
    const alertMap = new Map<string, IAlert>(
      allAlerts.map((a: IAlert) => [a.id, a]),
    );

    // Use orchestrator service for batch resolution
    const results = await this.processBatchOperation(
      body.alertIds,
      "resolve",
      async (alertId) => {
        const alert = alertMap.get(alertId);
        if (!alert) {
          throw new NotFoundException(`告警不存在: ${alertId}`);
        }

        await this.alertOrchestrator.resolveAlert(
          alertId,
          body.resolvedBy,
          alert.ruleId,
        );
      },
    );

    return results;
  }

  /**
   * 统一批量操作处理器
   * 标准化错误处理和日志记录，提高代码复用性
   */
  private async processBatchOperation(
    alertIds: string[],
    operationType: "acknowledge" | "resolve",
    operation: (alertId: string) => Promise<void>,
  ): Promise<{ succeeded: string[]; failed: string[] }> {
    const succeeded: string[] = [];
    const failed: string[] = [];

    await Promise.all(
      alertIds.map(async (alertId) => {
        try {
          await operation(alertId);
          succeeded.push(alertId);
        } catch (error) {
          // 标准化错误日志格式
          this.logger.error(
            `批量${operationType === "acknowledge" ? "确认" : "解决"}告警失败`,
            {
              alertId,
              operationType,
              error: error.message,
              stack: error.stack,
            },
          );
          failed.push(alertId);
        }
      }),
    );

    // 记录批量操作结果
    this.logger.log(
      `批量${operationType === "acknowledge" ? "确认" : "解决"}告警完成`,
      {
        total: alertIds.length,
        succeeded: succeeded.length,
        failed: failed.length,
        operationType,
      },
    );

    return { succeeded, failed };
  }
}
