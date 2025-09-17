import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { EventEmitterModule } from "@nestjs/event-emitter";

import { CacheModule } from "../../cache/module/cache.module";
import { DatabaseModule } from "../../database/database.module"; // 🆕 统一数据库模块
import { GlobalExceptionFilter } from "@common/core/filters/global-exception.filter";
import { ResponseInterceptor } from "@common/core/interceptors/response.interceptor";
import { RequestTrackingInterceptor } from "@common/core/interceptors/request-tracking.interceptor";
import { PermissionModule } from "@common/modules/permission/permission.module";
import authConfig from "../config/auth-configuration";
// 🆕 新的分层配置系统
import { authUnifiedConfig } from "../config/auth-unified.config";
import { AuthConfigCompatibilityWrapper } from "../config/compatibility-wrapper";

import { AuthController } from "../controller/auth.controller";
import { RateLimitExceptionFilter } from "../filters/rate-limit.filter";
import { ApiKeyAuthGuard } from "../guards/apikey-auth.guard";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { RateLimitGuard } from "../guards/rate-limit.guard";

import { UnifiedPermissionsGuard } from "../guards/unified-permissions.guard";
import { SecurityMiddleware } from "../middleware/security.middleware";
import { ApiKeyRepository } from "../repositories/apikey.repository";
import { UserRepository } from "../repositories/user.repository";
// 新架构服务导入
import { AuthFacadeService } from "../services/facade/auth-facade.service";
import { UserAuthenticationService } from "../services/domain/user-authentication.service";
import { SessionManagementService } from "../services/domain/session-management.service";
import { ApiKeyManagementService } from "../services/domain/apikey-management.service";
import { SecurityPolicyService } from "../services/domain/security-policy.service";
import { AuditService } from "../services/domain/audit.service";
import { AuthEventNotificationService } from "../services/domain/notification.service";
import { PasswordService } from "../services/infrastructure/password.service";
import { TokenService } from "../services/infrastructure/token.service";
import { PermissionService } from "../services/infrastructure/permission.service";
import { RateLimitService } from "../services/infrastructure/rate-limit.service";
import { AuthConfigService } from "../services/infrastructure/auth-config.service";
import { ApiKeyStrategy } from "../strategies/apikey.strategy";
import { JwtStrategy } from "../strategies/jwt.strategy";

@Module({
  imports: [
    // 🆕 统一数据库模块 (替代重复的MongooseModule.forFeature)
    DatabaseModule,

    // 配置模块 - 现有配置和新分层配置并存
    ConfigModule.forFeature(authConfig),
    // 🆕 分层配置系统 (与现有配置并存，确保平滑迁移)
    ConfigModule.forFeature(authUnifiedConfig),

    CacheModule,
    // 🆕 权限模块 - 提供权限验证和装饰器验证服务
    PermissionModule,
    // 🆕 事件模块 - 支持GlobalExceptionFilter和ResponseInterceptor
    EventEmitterModule,
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

    // ✅ 使用统一DatabaseModule (AuthDatabaseModule包含User和ApiKey schemas)
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
    AuthEventNotificationService,

    // 基础设施层
    AuthConfigService,
    PasswordService,
    TokenService,
    PermissionService,
    RateLimitService,

    // 🆕 配置系统提供者
    {
      provide: "authUnified",
      useFactory: (configService: ConfigService) => {
        return configService.get("authUnified");
      },
      inject: [ConfigService],
    },

    // 🆕 配置兼容包装器 - 确保现有代码无缝迁移
    AuthConfigCompatibilityWrapper,

    // Passport策略
    JwtStrategy,
    ApiKeyStrategy,

    // 守卫
    JwtAuthGuard,
    ApiKeyAuthGuard,
    UnifiedPermissionsGuard,
    RateLimitGuard,

    // 过滤器 - 🆕 添加通用GlobalExceptionFilter
    GlobalExceptionFilter,
    RateLimitExceptionFilter,

    // 拦截器 - 🆕 添加通用ResponseInterceptor和RequestTrackingInterceptor
    ResponseInterceptor,
    RequestTrackingInterceptor,

    // 中间件
    SecurityMiddleware,

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
    AuthConfigService,
    PermissionService,
    RateLimitService,
    TokenService,

    // 🆕 配置兼容包装器 - 供其他模块使用新配置系统
    AuthConfigCompatibilityWrapper,

    // 守卫 - 需要被AppModule使用
    JwtAuthGuard,
    ApiKeyAuthGuard,
    UnifiedPermissionsGuard,
    RateLimitGuard,

    // 过滤器 - 需要被AppModule使用
    GlobalExceptionFilter,
    RateLimitExceptionFilter,

    // 拦截器 - 需要被AppModule使用
    ResponseInterceptor,
    RequestTrackingInterceptor,

    // 中间件 - 需要被main.ts使用
    SecurityMiddleware,

    // 仓库 - 可能被其他模块使用
    ApiKeyRepository,
    UserRepository,
  ],
})
export class AuthModule {}
