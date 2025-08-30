/**
 * 应用核心模块
 * 🎯 整合应用级功能，提供统一的应用层抽象
 */

import { Module } from "@nestjs/common";
import { ConfigModule } from '@nestjs/config';

import { createAppConfig, createStartupConfig } from '../config';
import { GlobalServicesModule } from './global-services.module';
import { StartupModule } from '../startup/startup.module';

/**
 * 应用核心模块，整合应用级配置和服务
 *
 * @remarks
 * 此模块作为应用层的入口点，整合：
 * - 应用级配置 (app.config, startup.config)
 * - 全局应用服务 (GlobalServicesModule)
 * - 启动管理系统 (StartupModule)
 * 
 * 在主 app.module.ts 中导入此模块以获得完整的应用级功能
 */
@Module({
  imports: [
    // 配置管理
    ConfigModule.forRoot({
      load: [createAppConfig, createStartupConfig],
      isGlobal: true,
    }),
    
    // 全局应用服务
    GlobalServicesModule,
    
    // 启动管理
    StartupModule,
  ],
  exports: [
    GlobalServicesModule,
    StartupModule,
  ],
})
export class AppCoreModule {}