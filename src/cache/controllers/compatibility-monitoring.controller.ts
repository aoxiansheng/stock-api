/**
 * Compatibility Monitoring Controller
 * 🎯 提供v3.0.0迁移监控的REST API接口
 * 
 * @description 暴露兼容性监控和迁移进度的HTTP接口
 * @author Cache Module Team
 * @date 2025-09-17
 */

import { Controller, Get, Post, Query, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { Public } from "@auth/decorators/public.decorator";

import { CompatibilityMonitoringService, CompatibilityMonitoringReport, CompatibilityAlert } from "../services/compatibility-monitoring.service";
import { MigrationRecommendation } from "../utils/compatibility-usage-tracker";

/**
 * 监控状态响应DTO
 */
export class MonitoringStatusDto {
  totalComponents: number;
  readyForMigration: number;
  activeAlerts: number;
  lastReportDate?: Date;
  migrationProgress: number;
}

/**
 * 迁移准备度响应DTO
 */
export class MigrationReadinessDto {
  readyComponents: string[];
  blockedComponents: string[];
  recommendations: MigrationRecommendation[];
}

@ApiTags('Cache Compatibility Monitoring')
@Controller('api/v1/cache/compatibility')
export class CompatibilityMonitoringController {
  constructor(
    private readonly monitoringService: CompatibilityMonitoringService,
  ) {}

  /**
   * 获取当前监控状态
   */
  @Get('status')
  @Public()
  @ApiOperation({ 
    summary: '获取兼容性监控状态',
    description: '返回当前迁移进度、组件状态和告警信息'
  })
  @ApiResponse({ 
    status: 200, 
    description: '监控状态获取成功',
    type: MonitoringStatusDto
  })
  getCurrentStatus(): MonitoringStatusDto {
    const status = this.monitoringService.getCurrentMonitoringStatus();
    return {
      totalComponents: status.totalComponents,
      readyForMigration: status.readyForMigration,
      activeAlerts: status.activeAlerts,
      lastReportDate: status.lastReportDate,
      migrationProgress: status.migrationProgress,
    };
  }

  /**
   * 获取迁移建议
   */
  @Get('recommendations')
  @Public()
  @ApiOperation({ 
    summary: '获取迁移建议',
    description: '返回按优先级排序的组件迁移建议'
  })
  @ApiResponse({ 
    status: 200, 
    description: '迁移建议获取成功'
  })
  getMigrationRecommendations(): MigrationRecommendation[] {
    return this.monitoringService.getMigrationRecommendations();
  }

  /**
   * 获取活跃告警
   */
  @Get('alerts')
  @Public()
  @ApiOperation({ 
    summary: '获取活跃告警',
    description: '返回最近72小时内的兼容性告警'
  })
  @ApiQuery({ 
    name: 'level', 
    required: false, 
    description: '告警级别过滤 (INFO, WARNING, ERROR, CRITICAL)',
    enum: ['INFO', 'WARNING', 'ERROR', 'CRITICAL']
  })
  @ApiResponse({ 
    status: 200, 
    description: '告警信息获取成功'
  })
  getActiveAlerts(
    @Query('level') level?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  ): CompatibilityAlert[] {
    const alerts = this.monitoringService.getActiveAlerts();
    
    if (level) {
      return alerts.filter(alert => alert.level === level);
    }
    
    return alerts;
  }

  /**
   * 检查迁移准备度
   */
  @Get('migration-readiness')
  @Public()
  @ApiOperation({ 
    summary: '检查迁移准备度',
    description: '分析各组件的迁移准备状态'
  })
  @ApiResponse({ 
    status: 200, 
    description: '迁移准备度分析完成',
    type: MigrationReadinessDto
  })
  checkMigrationReadiness(): MigrationReadinessDto {
    return this.monitoringService.checkMigrationReadiness();
  }

  /**
   * 生成即时监控报告
   */
  @Post('report')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: '生成即时监控报告',
    description: '手动触发监控报告生成'
  })
  @ApiResponse({ 
    status: 200, 
    description: '监控报告生成成功'
  })
  async generateReport(): Promise<CompatibilityMonitoringReport> {
    return await this.monitoringService.generateDailyReport();
  }

  /**
   * 获取监控仪表板数据
   */
  @Get('dashboard')
  @Public()
  @ApiOperation({ 
    summary: '获取监控仪表板数据',
    description: '返回用于监控仪表板的综合数据'
  })
  @ApiResponse({ 
    status: 200, 
    description: '仪表板数据获取成功'
  })
  getDashboardData(): {
    status: MonitoringStatusDto;
    recommendations: MigrationRecommendation[];
    alerts: CompatibilityAlert[];
    readiness: MigrationReadinessDto;
  } {
    return {
      status: this.getCurrentStatus(),
      recommendations: this.getMigrationRecommendations(),
      alerts: this.getActiveAlerts(),
      readiness: this.checkMigrationReadiness(),
    };
  }

  /**
   * 获取组件级别的详细信息
   */
  @Get('component-details')
  @Public()
  @ApiOperation({ 
    summary: '获取组件级别详细信息',
    description: '返回特定组件的使用模式和迁移状态'
  })
  @ApiQuery({ 
    name: 'component', 
    required: true, 
    description: '组件名称',
    example: 'AlertCacheService'
  })
  @ApiResponse({ 
    status: 200, 
    description: '组件详细信息获取成功'
  })
  getComponentDetails(@Query('component') component: string): {
    component: string;
    isReadyForMigration: boolean;
    usagePattern: any[];
    recommendation?: MigrationRecommendation;
  } {
    const usagePattern = this.monitoringService['usageTracker'].getComponentUsagePattern(component);
    const isReadyForMigration = this.monitoringService['usageTracker'].isComponentReadyForMigration(component);
    const recommendations = this.getMigrationRecommendations();
    const recommendation = recommendations.find(r => r.component === component);

    return {
      component,
      isReadyForMigration,
      usagePattern: usagePattern.map(event => ({
        operation: event.operation,
        timestamp: event.timestamp,
        migrationPriority: event.migrationPriority,
        deprecatedPattern: event.deprecatedPattern,
        modernAlternative: event.modernAlternative,
      })),
      recommendation,
    };
  }

  /**
   * 健康检查接口
   */
  @Get('health')
  @Public()
  @ApiOperation({ 
    summary: '兼容性监控健康检查',
    description: '检查监控服务的健康状态'
  })
  @ApiResponse({ 
    status: 200, 
    description: '健康检查通过'
  })
  healthCheck(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: Date;
    details: {
      trackingEnabled: boolean;
      monitoringEnabled: boolean;
      lastReportAge?: string;
    };
  } {
    const status = this.getCurrentStatus();
    const lastReportAge = status.lastReportDate 
      ? `${Math.round((Date.now() - status.lastReportDate.getTime()) / (1000 * 60 * 60))} hours ago`
      : undefined;

    let healthStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    // 简单的健康状态判断
    if (!status.lastReportDate) {
      healthStatus = 'degraded';
    } else if (status.activeAlerts > 10) {
      healthStatus = 'degraded';
    }

    return {
      status: healthStatus,
      timestamp: new Date(),
      details: {
        trackingEnabled: true, // 从配置服务获取
        monitoringEnabled: true, // 从配置服务获取
        lastReportAge,
      },
    };
  }
}