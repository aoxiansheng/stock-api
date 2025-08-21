// StreamDataFetcher接口统一导出
// 提供类型安全的公共接口

// 核心接口
export * from './stream-data-fetcher.interface';

// 重连协议接口
export * from './reconnection-protocol.interface';

// 接口导出规范:
// 1. 只导出公共接口，不导出内部类型
// 2. 按功能域分组
// 3. 保持接口命名一致性
// 4. 提供完整的TypeScript类型支持