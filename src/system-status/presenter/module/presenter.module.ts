import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// 导入 Analyzer 模块
import { AnalyzerModule } from '../../analyzer/module/analyzer.module';

// 导入控制器和服务
import { PresenterController } from '../controller/presenter.controller';
import { PresenterService } from '../services/presenter.service';

// 导入错误处理器
import { SystemStatusErrorHandler } from '../services/system-status-error-handler.service';

/**
 * 展示器模块
 * 职责：提供HTTP路由层和业务服务层，实现关注点分离
 * 
 * 架构层次：
 * - Controller层：纯HTTP路由，只负责请求转发
 * - Service层：业务逻辑处理，错误处理和日志记录
 * - 依赖倒置：依赖抽象接口而非具体实现
 * 
 * 设计原则：
 * - 薄控制器：Controller只做路由转发
 * - 厚服务：Service处理所有业务逻辑
 * - 统一错误处理：Service层集中处理错误
 * - 响应标准化：依赖全局ResponseInterceptor进行响应包装
 */
@Module({
  imports: [
    ConfigModule,
    EventEmitterModule,
    AnalyzerModule, // 依赖分析器模块
  ],
  providers: [
    // 业务服务
    PresenterService,
    
    // 错误处理器
    SystemStatusErrorHandler,
    
    // 提供 ISystemStatusErrorHandler 接口
    {
      provide: 'ISystemStatusErrorHandler',
      useClass: SystemStatusErrorHandler
    }
  ],
  controllers: [
    PresenterController
  ],
  exports: [
    // 导出错误处理器供其他模块使用
    SystemStatusErrorHandler,
    'ISystemStatusErrorHandler'
  ],
})
export class PresenterModule {}