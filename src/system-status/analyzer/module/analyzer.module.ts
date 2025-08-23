import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// 导入 Collector 模块
import { CollectorModule } from '../../collector/module/collector.module';

// 导入服务
import { AnalyzerService } from '../services/analyzer.service';
import { HealthAnalyzerService } from '../services/health-analyzer.service';
import { TrendAnalyzerService } from '../services/trend-analyzer.service';
import { AnalyzerCacheService } from '../cache/analyzer-cache.service';

// 导入计算器
import { AnalyzerMetricsCalculator } from '../calculators/analyzer-metrics.calculator';
import { AnalyzerHealthScoreCalculator } from '../calculators/analyzer-health-score.calculator';

/**
 * 分析器模块
 * 职责：提供统一的数据分析功能，包括性能分析、健康分析、趋势分析
 * 
 * 设计原则：
 * - 单一职责：每个分析服务专注于特定领域
 * - 依赖注入：使用接口导向的设计模式
 * - 统一缓存：集中管理所有分析相关的缓存
 * - 事件驱动：支持事件发射和监听机制
 * - 层次清晰：Collector → Analyzer → Presenter 单向数据流
 */
@Module({
  imports: [
    ConfigModule,
    EventEmitterModule,
    CollectorModule, // 依赖纯净的 Collector 模块
  ],
  providers: [
    // 缓存服务
    AnalyzerCacheService,
    
    // 计算器服务
    AnalyzerMetricsCalculator,
    AnalyzerHealthScoreCalculator,
    
    // 专业分析服务
    HealthAnalyzerService,
    TrendAnalyzerService,
    
    // 主分析器服务
    AnalyzerService,
    
    // 提供 IAnalyzer 接口
    {
      provide: 'IAnalyzer',
      useClass: AnalyzerService
    },
    
    // 提供缓存服务（供其他模块使用）
    {
      provide: 'ANALYZER_CACHE_SERVICE',
      useClass: AnalyzerCacheService
    }
  ],
  exports: [
    // 导出主要接口
    'IAnalyzer',
    
    // 导出具体服务（用于直接注入的场景）
    AnalyzerService,
    HealthAnalyzerService,
    TrendAnalyzerService,
    AnalyzerCacheService,
    
    // 导出计算器（供其他模块使用）
    AnalyzerMetricsCalculator,
    AnalyzerHealthScoreCalculator,
    
    // 导出缓存服务
    'ANALYZER_CACHE_SERVICE'
  ],
})
export class AnalyzerModule {}