#!/usr/bin/env bun

/**
 * Data Mapper 监控告警部署脚本
 * 
 * 功能：
 * 1. 检查现有监控组件状态
 * 2. 部署 Data Mapper 专用监控指标
 * 3. 配置告警规则和阈值
 * 4. 集成到现有监控仪表盘
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AlertingService } from '../src/alert/services/alerting.service';
import { PresenterService } from '@monitoring/presenter/presenter.service';
import { Logger } from '@nestjs/common';
import { NotificationChannelType, AlertSeverity } from '../src/alert/types/alert.types';

interface MonitoringConfig {
  dataMapperMetrics: {
    // 数据库查询性能监控
    databaseQueryThresholds: {
      updateRuleStatsMaxDuration: number; // ms
      batchUpdateMaxDuration: number;     // ms
      queryFailureRate: number;           // percentage
    };
    
    // Redis 缓存性能监控
    cachePerformanceThresholds: {
      scanOperationMaxDuration: number;   // ms
      keysPatternComplexity: number;      // pattern length limit
      batchDeleteMaxSize: number;         // keys count
    };
    
    // 业务逻辑监控
    businessLogicThresholds: {
      mappingRuleSuccessRate: number;     // percentage
      transformationFailureRate: number; // percentage  
      taskLimiterQueueDepth: number;      // pending tasks
    };
  };
  
  alertingRules: {
    criticalErrors: string[];
    warningThresholds: Record<string, number>;
    notificationChannels: string[];
  };
}

class DataMapperMonitoringDeployer {
  private readonly logger = new Logger(DataMapperMonitoringDeployer.name);
  private app: any;
  private alertingService: AlertingService;
  private presenterService: PresenterService;

  async deploy(): Promise<void> {
    try {
      this.logger.log('🚀 开始部署 Data Mapper 监控告警系统...');
      
      // 1. 初始化 NestJS 应用
      await this.initializeApp();
      
      // 2. 验证现有监控组件
      await this.validateExistingComponents();
      
      // 3. 部署监控指标配置
      await this.deployMonitoringMetrics();
      
      // 4. 配置告警规则
      await this.configureAlertingRules();
      
      // 5. 集成监控仪表盘
      await this.integrateMonitoringDashboard();
      
      // 6. 运行健康检查
      await this.runHealthChecks();
      
      this.logger.log('✅ Data Mapper 监控告警系统部署完成');
      
    } catch (error) {
      this.logger.error('❌ 监控系统部署失败:', error);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }

  private async initializeApp(): Promise<void> {
    this.logger.log('🔧 初始化应用程序...');
    this.app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });
    
    this.alertingService = this.app.get(AlertingService);
    this.presenterService = this.app.get(PresenterService);
  }

  private async validateExistingComponents(): Promise<void> {
    this.logger.log('🔍 验证现有监控组件状态...');
    
    // 检查 AlertingService 可用性
    if (!this.alertingService) {
      throw new Error('AlertingService 未找到，请检查告警模块配置');
    }
    
    // 检查 PresenterService 可用性
    if (!this.presenterService) {
      throw new Error('PresenterService 未找到，请检查监控展示模块配置');
    }
    
    this.logger.log('✅ 现有监控组件验证通过');
  }

  private async deployMonitoringMetrics(): Promise<void> {
    this.logger.log('📊 部署监控指标配置...');
    
    const monitoringConfig: MonitoringConfig = {
      dataMapperMetrics: {
        databaseQueryThresholds: {
          updateRuleStatsMaxDuration: 500,  // 500ms
          batchUpdateMaxDuration: 2000,     // 2s
          queryFailureRate: 5,              // 5%
        },
        cachePerformanceThresholds: {
          scanOperationMaxDuration: 1000,   // 1s
          keysPatternComplexity: 50,        // 50字符
          batchDeleteMaxSize: 1000,         // 1000 keys
        },
        businessLogicThresholds: {
          mappingRuleSuccessRate: 95,       // 95%
          transformationFailureRate: 5,    // 5%
          taskLimiterQueueDepth: 100,       // 100 pending
        },
      },
      alertingRules: {
        criticalErrors: [
          'data_mapper_database_connection_lost',
          'data_mapper_cache_service_unavailable',
          'data_mapper_transformation_complete_failure',
        ],
        warningThresholds: {
          'database_query_duration_high': 500,
          'cache_operation_slow': 1000,
          'mapping_success_rate_low': 95,
          'task_queue_depth_high': 50,
        },
        notificationChannels: ['email', 'slack', 'webhook'],
      },
    };

    // 使用现有 PresenterService 注册监控指标
    await this.presenterService.registerCustomMetrics('data-mapper', monitoringConfig);
    
    this.logger.log('✅ 监控指标配置部署完成');
  }

  private async configureAlertingRules(): Promise<void> {
    this.logger.log('🚨 配置告警规则...');
    
    // 数据库性能告警规则
    await this.alertingService.createRule({
      name: 'data-mapper-database-performance',
      description: 'Data Mapper 数据库性能监控',
      metric: 'database_query_duration',
      operator: 'gt',
      threshold: 500,
      duration: 60,
      severity: AlertSeverity.WARNING,
      channels: [
        {
          name: 'email-alert',
          type: NotificationChannelType.EMAIL,
          config: { to: 'admin@example.com', subject: 'Data Mapper Alert' },
          enabled: true
        },
        {
          name: 'slack-alert',
          type: NotificationChannelType.SLACK,
          config: { webhook_url: 'https://hooks.slack.com/...', channel: '#alerts' },
          enabled: true
        }
      ],
      enabled: true,
      cooldown: 300,
      tags: {
        'data-mapper': 'true',
        'database': 'true',
        'performance': 'true'
      }
    });
    
    // Redis 缓存性能告警规则
    await this.alertingService.createRule({
      name: 'data-mapper-cache-performance',
      description: 'Data Mapper 缓存性能监控',
      metric: 'cache_scan_duration',
      operator: 'gt',
      threshold: 1000,
      duration: 60,
      severity: AlertSeverity.WARNING,
      channels: [
        {
          name: 'email-alert',
          type: NotificationChannelType.EMAIL,
          config: { to: 'admin@example.com', subject: 'Data Mapper Cache Alert' },
          enabled: true
        },
        {
          name: 'slack-alert',
          type: NotificationChannelType.SLACK,
          config: { webhook_url: 'https://hooks.slack.com/...', channel: '#alerts' },
          enabled: true
        }
      ],
      enabled: true,
      cooldown: 300,
      tags: {
        'data-mapper': 'true',
        'cache': 'true', 
        'performance': 'true'
      }
    });
    
    // 业务逻辑告警规则
    await this.alertingService.createRule({
      name: 'data-mapper-business-logic',
      description: 'Data Mapper 业务逻辑监控', 
      metric: 'mapping_success_rate',
      operator: 'lt',
      threshold: 95,
      duration: 300,
      severity: AlertSeverity.CRITICAL,
      channels: [
        {
          name: 'email-alert',
          type: NotificationChannelType.EMAIL,
          config: { to: 'admin@example.com', subject: 'Data Mapper Critical Alert' },
          enabled: true
        },
        {
          name: 'slack-alert',
          type: NotificationChannelType.SLACK,
          config: { webhook_url: 'https://hooks.slack.com/...', channel: '#alerts' },
          enabled: true
        },
        {
          name: 'webhook-alert',
          type: NotificationChannelType.WEBHOOK,
          config: { url: 'https://webhook.example.com/alerts', method: 'POST' },
          enabled: true
        }
      ],
      enabled: true,
      cooldown: 600,
      tags: {
        'data-mapper': 'true',
        'business-logic': 'true',
        'critical': 'true'
      }
    });
    
    this.logger.log('✅ 告警规则配置完成');
  }

  private async integrateMonitoringDashboard(): Promise<void> {
    this.logger.log('📈 集成监控仪表盘...');
    
    // 创建 Data Mapper 专用仪表盘面板
    const dashboardConfig = {
      title: 'Data Mapper Component Monitoring',
      panels: [
        {
          title: 'Database Query Performance',
          type: 'graph',
          metrics: [
            'data_mapper_database_query_duration',
            'data_mapper_database_query_success_rate',
          ],
          thresholds: { warning: 500, critical: 1000 },
        },
        {
          title: 'Cache Performance',
          type: 'graph', 
          metrics: [
            'data_mapper_cache_operation_duration',
            'data_mapper_cache_hit_rate',
          ],
          thresholds: { warning: 1000, critical: 5000 },
        },
        {
          title: 'Business Logic Health',
          type: 'stat',
          metrics: [
            'data_mapper_mapping_success_rate',
            'data_mapper_transformation_success_rate',
          ],
          thresholds: { warning: 95, critical: 90 },
        },
        {
          title: 'Task Queue Status',
          type: 'gauge',
          metrics: [
            'data_mapper_task_limiter_pending_count',
            'data_mapper_task_limiter_utilization',
          ],
          thresholds: { warning: 50, critical: 80 },
        },
      ],
    };
    
    // 通过 PresenterService 创建仪表盘
    await this.presenterService.createDashboard('data-mapper-monitoring', dashboardConfig);
    
    this.logger.log('✅ 监控仪表盘集成完成');
  }

  private async runHealthChecks(): Promise<void> {
    this.logger.log('🏥 运行健康检查...');
    
    // 验证告警规则是否正常工作
    try {
      const rule = await this.alertingService.getRuleById('data-mapper-database-performance');
      if (rule) {
        this.logger.log('✅ 数据库性能告警规则测试通过');
      } else {
        this.logger.warn('⚠️  未找到数据库性能告警规则');
      }
    } catch (error) {
      this.logger.warn('⚠️  数据库性能告警规则测试失败:', error.message);
    }
    
    // 验证监控指标是否正常收集
    try {
      const metrics = await this.presenterService.getMetrics('data-mapper');
      if (metrics && metrics.length > 0) {
        this.logger.log('✅ 监控指标收集正常');
      } else {
        this.logger.warn('⚠️  未找到 Data Mapper 监控指标');
      }
    } catch (error) {
      this.logger.warn('⚠️  监控指标检查失败:', error.message);
    }
    
    this.logger.log('✅ 健康检查完成');
  }

  private async cleanup(): Promise<void> {
    if (this.app) {
      await this.app.close();
      this.logger.log('🧹 应用程序资源清理完成');
    }
  }
}

// 主执行函数
async function main(): Promise<void> {
  const deployer = new DataMapperMonitoringDeployer();
  await deployer.deploy();
}

// 脚本执行入口
if (require.main === module) {
  main().catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
}

export { DataMapperMonitoringDeployer };