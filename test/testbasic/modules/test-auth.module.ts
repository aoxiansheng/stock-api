import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TestInfrastructureModule } from './test-infrastructure.module';
import { TestCacheModule } from './test-cache.module';
import { TestDatabaseModule } from './test-database.module';
import { createMongoModelMock } from '../mocks/mongodb.mock';
import authConfig from '@auth/config/auth-configuration';
import { AuthConfigService } from '@auth/services/infrastructure/auth-config.service';

/**
 * 测试专用认证模块
 * 提供完整的认证相关Mock和配置，用于AuthModule测试
 */
@Module({
  imports: [
    TestInfrastructureModule,
    TestCacheModule,
    TestDatabaseModule,

    // Passport配置
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JWT配置 - 使用测试专用配置
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    // auth配置提供者 (用于AuthConfigService)
    {
      provide: authConfig.KEY,
      useFactory: () => ({
        security: {
          maxPayloadSizeBytes: 10485760, // 10MB
          maxPayloadSizeString: '10MB',
          maxStringLengthSanitize: 1000,
          maxObjectDepthComplexity: 10,
          maxObjectFieldsComplexity: 1000,
          maxStringLengthComplexity: 10000,
          maxRecursionDepth: 100,
          findLongStringThreshold: 50000,
          maxQueryParams: 50,
        },
        rateLimit: {
          globalThrottle: {
            ttl: 60000,
            limit: 100,
          },
          redis: {
            maxRetries: 3,
            connectionTimeout: 5000,
            commandTimeout: 5000,
          },
          ipRateLimit: {
            enabled: true,
            maxRequests: 1000,
            windowMs: 60000,
          },
        },
        strategies: {
          fixedWindow: 'fixed_window' as const,
          slidingWindow: 'sliding_window' as const,
          tokenBucket: 'token_bucket' as const,
          leakyBucket: 'leaky_bucket' as const,
        },
      }),
    },

    // AuthConfigService提供者
    AuthConfigService,

    // 认证统一配置提供者
    {
      provide: 'authUnified',
      useFactory: (configService: ConfigService) => {
        const config = configService.get('authUnified');
        if (!config) {
          throw new Error('authUnified configuration not found in TestInfrastructureModule');
        }
        return config;
      },
      inject: [ConfigService],
    },

    // User模型Mock
    {
      provide: 'UserModel',
      useFactory: () => createMongoModelMock([
        {
          _id: '507f1f77bcf86cd799439011',
          username: 'testuser',
          email: 'test@example.com',
          passwordHash: '$2b$12$hashedpassword',
          role: 'developer',
          status: 'active',
          createdAt: new Date('2024-01-01T10:00:00.000Z'),
          lastAccessedAt: new Date('2024-01-01T11:30:00.000Z'),
        },
      ]),
    },

    // ApiKey模型Mock
    {
      provide: 'ApiKeyModel',
      useFactory: () => createMongoModelMock([
        {
          _id: '507f1f77bcf86cd799439012',
          name: 'Test API Key',
          appKey: 'ak_live_1234567890abcdef',
          keyPrefix: 'ak_live_',
          key: 'ak_live_1234567890abcdef1234567890abcdef',
          userId: '507f1f77bcf86cd799439011',
          permissions: ['data:read'],
          rateLimit: {
            requestsPerMinute: 1000,
            requestsPerDay: 50000,
          },
          status: 'active',
          expiresAt: new Date('2025-01-01T12:00:00.000Z'),
          createdAt: new Date('2024-01-01T10:00:00.000Z'),
        },
      ]),
    },

    // Permission相关Mock
    {
      provide: 'PermissionModel',
      useFactory: () => createMongoModelMock([
        {
          _id: '507f1f77bcf86cd799439013',
          name: 'data:read',
          description: 'Read data permission',
          category: 'data',
          level: 1,
        },
      ]),
    },

    // Session相关Mock
    {
      provide: 'SessionModel',
      useFactory: () => createMongoModelMock([]),
    },
  ],
  exports: [
    TestInfrastructureModule,
    TestCacheModule,  // TestCacheModule已经导出了CacheService
    TestDatabaseModule,
    JwtModule,
    PassportModule,
    authConfig.KEY,
    AuthConfigService,
    'authUnified',
    'UserModel',
    'ApiKeyModel',
    'PermissionModel',
    'SessionModel',
  ],
})
export class TestAuthModule {}