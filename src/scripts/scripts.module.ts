/**
 * Scripts模块
 * 🎯 提供系统维护和迁移脚本的依赖注入支持
 *
 * @description 包含缓存迁移、数据维护等脚本服务
 * @author Alert配置合规优化任务
 * @created 2025-09-15
 */

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CacheModule } from "../cache/module/cache.module";
import { CacheKeyMigrationScript } from "./cache-key-migration.script";

@Module({
  imports: [ConfigModule, CacheModule],
  providers: [CacheKeyMigrationScript],
  exports: [CacheKeyMigrationScript],
})
export class ScriptsModule {}
