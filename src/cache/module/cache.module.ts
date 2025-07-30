import { RedisModule } from "@liaoliaots/nestjs-redis";
import { Module } from "@nestjs/common";

import { CacheService } from "../services/cache.service";

@Module({
  imports: [RedisModule],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
