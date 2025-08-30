import { RedisModule } from "@nestjs-modules/ioredis";
import { Module } from "@nestjs/common";

import { CacheService } from "../services/cache.service";

@Module({
  imports: [RedisModule],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
