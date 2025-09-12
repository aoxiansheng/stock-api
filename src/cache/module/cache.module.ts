import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { CacheService } from "../services/cache.service";
import cacheConfig from "../config/cache.config";

@Module({
  imports: [
    // 注册缓存配置
    ConfigModule.forFeature(cacheConfig),
  ],
  providers: [CacheService], // RedisService 通过全局模块自动注入
  exports: [CacheService],
})
export class CacheModule {}
