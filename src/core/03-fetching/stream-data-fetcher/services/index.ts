// StreamDataFetcher服务模块统一导出
// 遵循Barrel导出模式，提供清晰的模块边界

// 核心服务
export * from './stream-data-fetcher.service';
export * from './stream-client-state-manager.service';
export * from './stream-recovery-worker.service';
export * from './stream-metrics.service';

// 连接实现
export * from './stream-connection.impl';

// 注意: 内部实现细节不导出，保持模块封装性
// - 不导出私有方法和内部类型
// - 不导出测试专用的实现