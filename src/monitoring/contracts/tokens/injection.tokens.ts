import { ICollector } from '../interfaces/collector.interface';

/**
 * 监控系统依赖注入令牌
 * 提供类型安全的依赖注入支持
 * 
 * 使用方式：
 * 1. 在模块中注册：provide: MONITORING_COLLECTOR_TOKEN
 * 2. 在服务中注入：@Inject(MONITORING_COLLECTOR_TOKEN) private readonly collector: ICollector
 */

/**
 * 数据收集器服务令牌
 * 用于注入实现了 ICollector 接口的服务
 * 
 * @example
 * ```typescript
 * // 在模块中注册
 * {
 *   provide: MONITORING_COLLECTOR_TOKEN,
 *   useExisting: CollectorService,
 * }
 * 
 * // 在服务中注入
 * constructor(
 *   @Inject(MONITORING_COLLECTOR_TOKEN) private readonly collector: ICollector
 * ) {}
 * ```
 */
export const MONITORING_COLLECTOR_TOKEN = Symbol('MONITORING_COLLECTOR');

/**
 * Redis客户端令牌（缓存专用）
 * 用于在缓存服务中注入类型安全的Redis客户端
 * 
 * @example
 * ```typescript
 * // 在模块中注册
 * {
 *   provide: CACHE_REDIS_CLIENT_TOKEN,
 *   useFactory: (configService: ConfigService) => new Redis(config),
 *   inject: [ConfigService],
 * }
 * 
 * // 在服务中注入
 * constructor(
 *   @Inject(CACHE_REDIS_CLIENT_TOKEN) private readonly redisClient: Redis
 * ) {}
 * ```
 */
export const CACHE_REDIS_CLIENT_TOKEN = Symbol('CACHE_REDIS_CLIENT');

/**
 * 流缓存配置令牌
 * 用于注入流缓存相关配置
 * 
 * @example
 * ```typescript
 * // 在模块中注册
 * {
 *   provide: STREAM_CACHE_CONFIG_TOKEN,
 *   useValue: streamCacheConfig,
 * }
 * 
 * // 在服务中注入
 * constructor(
 *   @Inject(STREAM_CACHE_CONFIG_TOKEN) private readonly config: StreamCacheConfig
 * ) {}
 * ```
 */
export const STREAM_CACHE_CONFIG_TOKEN = Symbol('STREAM_CACHE_CONFIG');

/**
 * 通用缓存配置令牌
 * 用于注入通用缓存相关配置
 * 
 * @example
 * ```typescript
 * // 在模块中注册
 * {
 *   provide: COMMON_CACHE_CONFIG_TOKEN,
 *   useValue: commonCacheConfig,
 * }
 * 
 * // 在服务中注入
 * constructor(
 *   @Inject(COMMON_CACHE_CONFIG_TOKEN) private readonly config: CommonCacheConfig
 * ) {}
 * ```
 */
export const COMMON_CACHE_CONFIG_TOKEN = Symbol('COMMON_CACHE_CONFIG');