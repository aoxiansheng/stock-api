import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { CacheModule } from "../../cache/module/cache.module";
import { DatabaseModule } from "../../database/database.module"; // 🆕 统一数据库模块

import { AuthController } from "../controller/auth.controller";
import { RateLimitExceptionFilter } from "../filters/rate-limit.filter";
import { ApiKeyAuthGuard } from "../guards/apikey-auth.guard";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { RateLimitGuard } from "../guards/rate-limit.guard";

import { UnifiedPermissionsGuard } from "../guards/unified-permissions.guard";
import { ApiKeyRepository } from "../repositories/apikey.repository";
import { UserRepository } from "../repositories/user.repository";
// 新架构服务导入
import { AuthFacadeService } from "../services/facade/auth-facade.service";
import { UserAuthenticationService } from "../services/domain/user-authentication.service";
import { SessionManagementService } from "../services/domain/session-management.service";
import { ApiKeyManagementService } from "../services/domain/apikey-management.service";
import { SecurityPolicyService } from "../services/domain/security-policy.service";
import { AuditService } from "../services/domain/audit.service";
import { NotificationService } from "../services/domain/notification.service";
import { PasswordService } from "../services/infrastructure/password.service";
import { TokenService } from "../services/infrastructure/token.service";
import { PermissionService } from "../services/infrastructure/permission.service";
import { RateLimitService } from "../services/infrastructure/rate-limit.service";
import { ApiKeyStrategy } from "../strategies/apikey.strategy";
import { JwtStrategy } from "../strategies/jwt.strategy";

@Module({
  imports: [
    // 🆕 统一数据库模块 (替代重复的MongooseModule.forFeature)
    DatabaseModule,

    CacheModule,
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
    // 门面层
    AuthFacadeService,
    
    // 领域层
    UserAuthenticationService,
    SessionManagementService,
    ApiKeyManagementService,
    SecurityPolicyService,
    AuditService,
    NotificationService,
    
    // 基础设施层
    PasswordService,
    TokenService,
    PermissionService,
    RateLimitService,
    
    // Passport策略
    JwtStrategy,
    ApiKeyStrategy,
    
    // 守卫
    JwtAuthGuard,
    ApiKeyAuthGuard,
    UnifiedPermissionsGuard,
    RateLimitGuard,
    
    // 过滤器
    RateLimitExceptionFilter,
    
    // 仓库
    ApiKeyRepository,
    UserRepository,
  ],
  controllers: [AuthController],
  exports: [
    // 门面层 - 主要对外接口
    AuthFacadeService,
    
    // 领域层 - 可能被其他模块使用的核心服务
    UserAuthenticationService,
    SessionManagementService,
    ApiKeyManagementService,
    
    // 基础设施层 - 可能被其他模块使用的技术服务
    PermissionService,
    RateLimitService,
    TokenService,
    
    // 守卫 - 需要被AppModule使用
    JwtAuthGuard,
    ApiKeyAuthGuard,
    UnifiedPermissionsGuard,
    RateLimitGuard,
    
    // 过滤器 - 需要被AppModule使用
    RateLimitExceptionFilter,
    
    // 仓库 - 可能被其他模块使用
    ApiKeyRepository,
    UserRepository,
  ],
})
export class AuthModule {}
