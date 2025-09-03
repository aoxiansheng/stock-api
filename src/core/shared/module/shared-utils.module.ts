/**
 * 共享工具模块
 * 🎯 提供纯工具类，无依赖注入，专注于静态功能
 */

import { Module } from "@nestjs/common";
import { StringUtils } from "../utils/string.util";
import { ObjectUtils } from "../utils/object.util";

/**
 * 纯工具类模块，不使用@Global()装饰器
 * 包含零依赖的静态工具函数
 *
 * @remarks
 * 此模块只包含纯工具类，遵循"零依赖工具"原则：
 * - StringUtils: 字符串处理工具
 * - ObjectUtils: 对象处理工具
 *
 * 需要使用时应在具体模块中显式导入，避免全局污染
 */
@Module({
  providers: [StringUtils, ObjectUtils],
  exports: [StringUtils, ObjectUtils],
})
export class SharedUtilsModule {}
