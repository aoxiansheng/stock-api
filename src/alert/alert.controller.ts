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
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam } from "@nestjs/swagger";

import {
  ApiSuccessResponse,
  ApiCreatedResponse,
  JwtAuthResponses,
  ApiPaginatedResponse,
  ApiStandardResponses,
} from "@common/decorators/swagger-responses.decorator";
import { PaginatedDataDto } from "@common/dto/common-response.dto";

import { Auth } from "../auth/decorators/auth.decorator";
import { UserRole } from "../auth/enums/user-role.enum";

import {
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
  AlertQueryDto,
  AcknowledgeAlertDto,
  ResolveAlertDto,
  AlertStatsDto,
  AlertResponseDto,
  TestNotificationChannelDto,
  TriggerAlertDto,
} from "./dto";
import { IAlertRule, IAlert, IAlertStats, IMetricData } from "./interfaces";
import { AlertHistoryService } from "./services/alert-history.service";
import { AlertingService } from "./services/alerting.service";
import { NotificationService } from "./services/notification.service";
import { NotificationType } from "./types/alert.types";

// 使用标准化认证装饰器 - 告警管理需要管理员权限

@ApiTags("告警管理")
@Controller("alerts")
export class AlertController {
  private readonly logger = new Logger(AlertController.name);
  // 简单的内存频率限制（生产环境应使用Redis）
  private readonly triggerRateLimit = new Map<
    string,
    { count: number; lastReset: number }
  >();
  private readonly TRIGGER_RATE_LIMIT = 5; // 每分钟最多5次
  private readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1分钟窗口

  constructor(
    private readonly alertingService: AlertingService,
    private readonly alertHistoryService: AlertHistoryService,
    private readonly notificationService: NotificationService,
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
    schema: {
      example: {
        statusCode: 201,
        message: "告警规则创建成功",
        data: {
          id: "rule_123456",
          name: "CPU使用率过高告警",
          metric: "cpu_usage",
          condition: ">",
          threshold: 80,
          severity: "warning",
          enabled: true,
          createdAt: "2024-01-01T12:00:00.000Z",
        },
        timestamp: "2024-01-01T12:00:00.000Z",
      },
    },
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async createRule(
    @Body() createRuleDto: CreateAlertRuleDto,
  ): Promise<IAlertRule> {
    return await this.alertingService.createRule(createRuleDto);
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
    schema: {
      example: {
        statusCode: 200,
        message: "获取告警规则成功",
        data: [
          {
            id: "rule_123456",
            name: "CPU使用率过高告警",
            metric: "cpu_usage",
            condition: ">",
            threshold: 80,
            severity: "warning",
            enabled: true,
            lastTriggered: "2024-01-01T11:30:00.000Z",
            triggerCount: 5,
          },
        ],
        timestamp: "2024-01-01T12:00:00.000Z",
      },
    },
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getRules(): Promise<IAlertRule[]> {
    return await this.alertingService.getRules();
  }

  @Get("rules/:ruleId")
  @Auth([UserRole.ADMIN])
  @ApiOperation({ summary: "根据ID获取告警规则" })
  @ApiParam({ name: "ruleId", description: "告警规则ID" })
  @ApiSuccessResponse()
  @JwtAuthResponses()
  async getRuleById(
    @Param("ruleId") ruleId: string,
  ): Promise<IAlertRule | null> {
    return await this.alertingService.getRuleById(ruleId);
  }

  @Put("rules/:ruleId")
  @Auth([UserRole.ADMIN])
  @ApiOperation({ summary: "更新告警规则" })
  @ApiParam({ name: "ruleId", description: "告警规则ID" })
  @ApiSuccessResponse()
  @JwtAuthResponses()
  async updateRule(
    @Param("ruleId") ruleId: string,
    @Body() updateRuleDto: UpdateAlertRuleDto,
  ): Promise<IAlertRule | null> {
    return await this.alertingService.updateRule(ruleId, updateRuleDto);
  }

  @Delete("rules/:ruleId")
  @Auth([UserRole.ADMIN])
  @ApiOperation({ summary: "删除告警规则" })
  @ApiParam({ name: "ruleId", description: "告警规则ID" })
  @ApiSuccessResponse()
  @JwtAuthResponses()
  async deleteRule(@Param("ruleId") ruleId: string): Promise<void> {
    await this.alertingService.deleteRule(ruleId);
  }

  @Post("rules/:ruleId/toggle")
  @Auth([UserRole.ADMIN])
  @ApiOperation({ summary: "启用/禁用告警规则" })
  @ApiParam({ name: "ruleId", description: "告警规则ID" })
  @ApiSuccessResponse()
  @JwtAuthResponses()
  async toggleRule(
    @Param("ruleId") ruleId: string,
    @Body() body: { enabled: boolean },
  ): Promise<void> {
    await this.alertingService.toggleRule(ruleId, body.enabled);
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
    type: [AlertResponseDto],
    schema: {
      example: {
        statusCode: 200,
        message: "获取活跃告警成功",
        data: [
          {
            id: "alert_789",
            ruleId: "rule_123456",
            metric: "cpu_usage",
            severity: "warning",
            value: 85.2,
            threshold: 80,
            status: "active",
            startTime: "2024-01-01T11:45:00.000Z",
            duration: 900,
            acknowledged: false,
          },
        ],
        timestamp: "2024-01-01T12:00:00.000Z",
      },
    },
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getActiveAlerts(
    @Query() query?: AlertQueryDto,
  ): Promise<AlertResponseDto[]> {
    // 获取活跃告警，可选择性应用查询过滤
    const alerts = await this.alertHistoryService.getActiveAlerts();
    let filteredAlerts = alerts;

    // 如果提供了查询参数，进行过滤
    if (query) {
      filteredAlerts = alerts.filter((alert) => {
        if (query.ruleId && alert.ruleId !== query.ruleId) return false;
        if (query.severity && alert.severity !== query.severity) return false;
        if (query.metric && !alert.metric.includes(query.metric)) return false;
        return true;
      });
    }

    return filteredAlerts.map(AlertResponseDto.fromEntity);
  }

  @Get("history")
  @Auth([UserRole.ADMIN])
  @ApiOperation({ summary: "查询告警历史" })
  @ApiPaginatedResponse(AlertResponseDto)
  @JwtAuthResponses()
  async getAlertHistory(
    @Query() query: AlertQueryDto,
  ): Promise<PaginatedDataDto<AlertResponseDto>> {
    // 转换字符串日期为 Date 对象
    const convertedQuery = {
      ...query,
      startTime: query.startTime ? new Date(query.startTime) : undefined,
      endTime: query.endTime ? new Date(query.endTime) : undefined,
    };
    const result = await this.alertHistoryService.queryAlerts(convertedQuery);
    const page = query.page || 1;
    const limit = query.limit || 20;

    return new PaginatedDataDto(
      result.alerts.map(AlertResponseDto.fromEntity),
      {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
        hasNext: page * limit < result.total,
        hasPrev: page > 1,
      },
    );
  }

  @Get("stats")
  @Auth([UserRole.ADMIN])
  @ApiOperation({ summary: "获取告警统计" })
  @ApiSuccessResponse({ type: AlertStatsDto })
  @JwtAuthResponses()
  async getAlertStats(): Promise<IAlertStats> {
    return await this.alertingService.getStats();
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
    const alert = await this.alertHistoryService.getAlertById(alertId);
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
    const updatedAlert = await this.alertingService.acknowledgeAlert(
      alertId,
      body.acknowledgedBy,
    );
    return AlertResponseDto.fromEntity(updatedAlert);
  }

  @Post(":alertId/resolve")
  @Auth([UserRole.ADMIN])
  @ApiOperation({ summary: "解决告警" })
  @ApiParam({ name: "alertId", description: "告警ID" })
  @ApiSuccessResponse()
  @JwtAuthResponses()
  async resolveAlert(
    @Param("alertId") alertId: string,
    @Body() body: ResolveAlertDto,
  ): Promise<void> {
    // 先获取告警信息来获取 ruleId
    const alerts = await this.alertHistoryService.queryAlerts({
      page: 1,
      limit: 100,
    });
    const alert = alerts.alerts.find((a: any) => a.id === alertId);
    if (!alert) {
      throw new NotFoundException(`未找到ID为 ${alertId} 的告警`);
    }

    await this.alertingService.resolveAlert(
      alertId,
      body.resolvedBy,
      alert.ruleId,
    );
  }

  // ==================== 通知渠道测试 ====================

  @Post("channels/test")
  @Auth([UserRole.ADMIN])
  @ApiOperation({ summary: "测试通知渠道" })
  @ApiSuccessResponse()
  @JwtAuthResponses()
  async testNotificationChannel(
    @Body()
    testDto: TestNotificationChannelDto & {
      type: NotificationType;
      config: Record<string, any>;
    },
  ): Promise<{ success: boolean }> {
    const success = await this.notificationService.testChannel(
      testDto.type,
      testDto.config,
    );
    return { success };
  }

  // ==================== 手动触发 ====================

  @Post("trigger")
  @Auth([UserRole.ADMIN])
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
          triggeredAt: "2024-01-01T12:00:00.000Z",
          estimatedDuration: "5-10秒",
        },
        timestamp: "2024-01-01T12:00:00.000Z",
      },
    },
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async triggerEvaluation(
    @Body() triggerDto?: TriggerAlertDto,
  ): Promise<{ message: string }> {
    // 频率限制检查
    const clientKey = "admin"; // 在实际应用中应使用用户ID
    const now = Date.now();
    const rateData = this.triggerRateLimit.get(clientKey);

    if (rateData) {
      // 重置窗口检查
      if (now - rateData.lastReset > this.RATE_LIMIT_WINDOW) {
        rateData.count = 0;
        rateData.lastReset = now;
      }

      // 检查是否超过限制
      if (rateData.count >= this.TRIGGER_RATE_LIMIT) {
        throw new BadRequestException("手动触发频率过高，请稍后再试");
      }

      rateData.count++;
    } else {
      this.triggerRateLimit.set(clientKey, { count: 1, lastReset: now });
    }

    // 如果指定了规则ID，验证其存在性
    if (triggerDto?.ruleId) {
      const rule = await this.alertingService.getRuleById(triggerDto.ruleId);
      if (!rule) {
        throw new BadRequestException("指定的告警规则不存在");
      }
    }

    // 准备指标数据：如果提供了metrics则使用，否则使用空数组
    const metricsData: IMetricData[] = triggerDto?.metrics
      ? triggerDto.metrics.map((metric) => ({
          metric: metric.metric,
          value: metric.value,
          timestamp: new Date(metric.timestamp),
          tags: metric.tags,
        }))
      : [];

    // 手动触发告警评估，使用实际的指标数据
    await this.alertingService.processMetrics(metricsData);

    return {
      message: triggerDto?.ruleId
        ? `告警规则 ${triggerDto.ruleId} 评估已触发`
        : triggerDto?.metrics?.length
          ? `告警评估已触发，处理了 ${triggerDto.metrics.length} 个指标`
          : "告警评估已触发",
    };
  }

  // ==================== 批量操作 ====================

  @Post("batch/acknowledge")
  @Auth([UserRole.ADMIN])
  @ApiOperation({ summary: "批量确认告警" })
  @ApiSuccessResponse()
  @JwtAuthResponses()
  async batchAcknowledgeAlerts(
    @Body() body: { alertIds: string[]; acknowledgedBy: string },
  ): Promise<{ succeeded: string[]; failed: string[] }> {
    const succeeded: string[] = [];
    const failed: string[] = [];

    await Promise.all(
      body.alertIds.map(async (alertId) => {
        try {
          await this.alertingService.acknowledgeAlert(
            alertId,
            body.acknowledgedBy,
          );
          succeeded.push(alertId);
        } catch (error) {
          this.logger.error(`批量确认告警失败: ${alertId}`, error.stack);
          failed.push(alertId);
        }
      }),
    );

    return { succeeded, failed };
  }

  @Post("batch/resolve")
  @Auth([UserRole.ADMIN])
  @ApiOperation({ summary: "批量解决告警" })
  @ApiSuccessResponse()
  @JwtAuthResponses()
  async batchResolveAlerts(
    @Body() body: { alertIds: string[]; resolvedBy: string },
  ): Promise<{ succeeded: string[]; failed: string[] }> {
    const succeeded: string[] = [];
    const failed: string[] = [];

    // 获取所有告警信息
    const { alerts } = await this.alertHistoryService.queryAlerts({
      page: 1,
      limit: 1000,
    });
    const alertMap = new Map<string, IAlert>(
      alerts.map((a: IAlert) => [a.id, a]),
    );

    await Promise.all(
      body.alertIds.map(async (alertId) => {
        const alert = alertMap.get(alertId);
        if (!alert) {
          failed.push(alertId);
          return;
        }

        try {
          await this.alertingService.resolveAlert(
            alertId,
            body.resolvedBy,
            alert.ruleId,
          );
          succeeded.push(alertId);
        } catch (error) {
          this.logger.error(`批量解决告警失败: ${alertId}`, error.stack);
          failed.push(alertId);
        }
      }),
    );

    return { succeeded, failed };
  }
}
