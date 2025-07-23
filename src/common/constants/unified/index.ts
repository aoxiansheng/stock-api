/**
 * 统一常量模块导出索引
 *
 * 提供项目中所有统一常量的顶级导出接口。
 * 具体的函数和类型应该直接从相应的子模块导入。
 *
 * 基本用法：
 * ```typescript
 * // 导入顶级常量
 * import { SYSTEM_CONSTANTS, HTTP_CONSTANTS } from '@common/constants/unified';
 *
 * // 导入具体函数或类型（直接从子模块导入）
 * import { isValidLogLevel } from '@common/constants/unified/system.constants';
 * import { isSuccessStatusCode } from '@common/constants/unified/http.constants';
 * ```
 */

// 只导出顶层常量对象
export { SYSTEM_CONSTANTS } from "./system.constants";
export { HTTP_CONSTANTS } from "./http.constants";
export { PERFORMANCE_CONSTANTS } from "./performance.constants";
export { CACHE_CONSTANTS } from "./unified-cache-config.constants";
export { OPERATION_CONSTANTS } from "./operations.constants";

// 统一常量集合
export { UNIFIED_CONSTANTS } from './unified-constants-collection';

// 常量版本信息
export { CONSTANTS_VERSION } from './constants-version';

// 常量元信息
export { CONSTANTS_META } from './constants-meta';
