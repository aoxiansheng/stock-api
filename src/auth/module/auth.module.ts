import { RedisModule } from "@liaoliaots/nestjs-redis";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { PassportModule } from "@nestjs/passport";

import { CacheModule } from "../../cache/module/cache.module";
import { MetricsModule } from "../../metrics/module/metrics.module";
import { PerformanceMonitorService } from "../../metrics/services/performance-monitor.service";

import { AuthController } from "../controller/auth.controller";
import { RateLimitExceptionFilter } from "../filters/rate-limit.filter";
import { ApiKeyAuthGuard } from "../guards/apikey-auth.guard";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { RateLimitGuard } from "../guards/rate-limit.guard";

import { UnifiedPermissionsGuard } from "../guards/unified-permissions.guard";
import { ApiKeyRepository } from "../repositories/apikey.repository";
import { UserRepository } from "../repositories/user.repository";
import { ApiKey, ApiKeySchema } from "../schemas/apikey.schema";
import { User, UserSchema } from "../schemas/user.schema";
import { ApiKeyService } from "../services/apikey.service";
import { AuthService } from "../services/auth.service";
import { PasswordService } from "../services/password.service";
import { PermissionService } from "../services/permission.service";
import { RateLimitService } from "../services/rate-limit.service";
import { TokenService } from "../services/token.service";
import { ApiKeyStrategy } from "../strategies/apikey.strategy";
import { JwtStrategy } from "../strategies/jwt.strategy";

@Module({
  imports: [
    CacheModule,
    MetricsModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    RedisModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: configService.get<string>("JWT_EXPIRES_IN") || "24h",
        },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: ApiKey.name, schema: ApiKeySchema },
    ]),
  ],
  providers: [
    AuthService,
    PermissionService,
    RateLimitService,
    ApiKeyService,
    PerformanceMonitorService,
    PasswordService,
    TokenService,
    JwtStrategy,
    ApiKeyStrategy,
    JwtAuthGuard,
    ApiKeyAuthGuard,
    
    UnifiedPermissionsGuard,
    RateLimitGuard,
    RateLimitExceptionFilter,
    ApiKeyRepository,
    UserRepository,
  ],
  controllers: [AuthController],
  exports: [
    AuthService,
    PermissionService,
    RateLimitService,
    ApiKeyService,
    PerformanceMonitorService,
    TokenService,
    JwtAuthGuard,
    ApiKeyAuthGuard,
    
    UnifiedPermissionsGuard,
    RateLimitGuard,
    RateLimitExceptionFilter,
    ApiKeyRepository,
    UserRepository,
  ],
})
export class AuthModule {}
