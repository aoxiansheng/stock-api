/**
 * 共享组件入口
 * 提供共享服务、工具类和类型定义的统一导出
 */

// 业务服务模块 (包含核心业务逻辑)
export * from './module/shared-services.module';

// 纯工具模块 (零依赖工具类)
export * from './module/shared-utils.module';

// 工具类
export * from './utils/string.util';
export * from './utils/object.util';

// 业务服务
export * from './services/data-change-detector.service';
export * from './services/market-status.service';
export * from './services/field-mapping.service';
export * from './services/base-fetcher.service';

// 类型定义
export * from './types/field-naming.types';

// 配置
export * from './config/shared.config';