import { Module } from "@nestjs/common";

import { CacheService } from "../services/cache.service";

@Module({
  imports: [
    // ❌ 删除 RedisModule - 使用全局注入的 RedisService
  ],
  providers: [CacheService], // RedisService 通过全局模块自动注入
  exports: [CacheService],
})
export class CacheModule {}
