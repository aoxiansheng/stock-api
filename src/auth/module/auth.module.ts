import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { CacheModule } from "../../cache/module/cache.module";
import { CollectorModule } from "../../monitoring/collector/collector.module";
import { DatabaseModule } from "../../database/database.module"; // 🆕 统一数据库模块

import { AuthController } from "../controller/auth.controller";
import { RateLimitExceptionFilter } from "../filters/rate-limit.filter";
import { ApiKeyAuthGuard } from "../guards/apikey-auth.guard";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { RateLimitGuard } from "../guards/rate-limit.guard";

import { UnifiedPermissionsGuard } from "../guards/unified-permissions.guard";
import { ApiKeyRepository } from "../repositories/apikey.repository";
import { UserRepository } from "../repositories/user.repository";
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
    // 🆕 统一数据库模块 (替代重复的MongooseModule.forFeature)
    DatabaseModule,
    
    CacheModule,
    CollectorModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    // ❌ 删除 RedisModule - 使用全局注入的 RedisService
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
    
    // 🔄 移除重复的MongooseModule.forFeature (改用DatabaseModule中的AuthDatabaseModule)
    // MongooseModule.forFeature([
    //   { name: User.name, schema: UserSchema },
    //   { name: ApiKey.name, schema: ApiKeySchema },
    // ]),
  ],
  providers: [
    AuthService,
    PermissionService,
    RateLimitService,
    ApiKeyService,
    PasswordService,
    TokenService,
    JwtStrategy,
    ApiKeyStrategy,
    JwtAuthGuard,
    ApiKeyAuthGuard,
    
    UnifiedPermissionsGuard,
    RateLimitGuard, // 需要在providers中提供以便导出
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
    TokenService,
    JwtAuthGuard,
    ApiKeyAuthGuard,
    
    UnifiedPermissionsGuard,
    RateLimitGuard, // 需要导出以供AppModule的APP_GUARD使用
    RateLimitExceptionFilter,
    ApiKeyRepository,
    UserRepository,
  ],
})
export class AuthModule {}
