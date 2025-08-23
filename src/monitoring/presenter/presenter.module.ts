/**
 * 🎯 展示层模块
 * 
 * 负责对外提供监控API：
 * - RESTful API端点
 * - 数据格式化
 * - 权限控制
 * - 错误处理
 */

import { Module } from '@nestjs/common';
import { AnalyzerModule } from '../analyzer/analyzer.module';
import { PresenterController } from './controllers/presenter.controller';
import { PresenterService } from './services/presenter.service';
import { PresenterErrorHandlerService } from './services/presenter-error-handler.service';

@Module({
  imports: [AnalyzerModule],
  controllers: [PresenterController],
  providers: [
    PresenterService,
    PresenterErrorHandlerService,
  ],
  exports: [
    PresenterService,
    PresenterErrorHandlerService,
  ],
})
export class PresenterModule {}