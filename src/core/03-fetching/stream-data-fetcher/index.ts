// StreamDataFetcher模块统一导出
// 按功能分组的Barrel导出策略

// 公共接口定义
export * from './interfaces';

// 核心服务 - 主要对外API
export * from './services';

// 配置服务
export * from './config/stream-recovery.config';

// 指标服务
//export * from './metrics/stream-recovery.metrics';

// 提供者
export * from './providers/websocket-server.provider';

// NestJS模块
export * from './module/stream-data-fetcher.module';

// 导出规范说明:
// 1. 优先导出接口和公共API
// 2. 按功能分组导出，保持模块清晰
// 3. 不导出内部实现细节
// 4. 遵循NestJS模块设计原则