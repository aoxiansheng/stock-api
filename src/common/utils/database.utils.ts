import { BadRequestException } from "@nestjs/common";
import { Types } from "mongoose";

/**
 * 🎯 数据库验证工具类 - 统一ObjectId验证标准
 *
 * 全新项目优化：提供统一的ObjectId验证，确保数据库查询安全性
 */
export class DatabaseValidationUtils {
  /**
   * 验证单个ObjectId格式
   *
   * @param id 要验证的ID字符串
   * @param fieldName 字段名称（用于错误消息）
   * @throws BadRequestException 当ID格式无效时
   */
  static validateObjectId(id: string, fieldName = "ID"): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        `无效的${fieldName}格式: ${id}`,
        "INVALID_OBJECT_ID",
      );
    }
  }

  /**
   * 批量验证ObjectId格式
   *
   * @param ids 要验证的ID数组
   * @param fieldName 字段名称（用于错误消息）
   * @throws BadRequestException 当任一ID格式无效时
   */
  static validateObjectIds(ids: string[], fieldName = "ID列表"): void {
    const invalidIds = ids.filter((id) => !Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `${fieldName}中包含无效格式: ${invalidIds.join(", ")}`,
        "INVALID_OBJECT_ID_BATCH",
      );
    }
  }

  /**
   * 安全的ObjectId验证（不抛出异常）
   *
   * @param id 要验证的ID字符串
   * @returns 验证结果布尔值
   */
  static isValidObjectId(id: string): boolean {
    return Types.ObjectId.isValid(id);
  }

  /**
   * 验证并转换为ObjectId类型
   *
   * @param id 要验证和转换的ID字符串
   * @param fieldName 字段名称（用于错误消息）
   * @returns Mongoose ObjectId实例
   * @throws BadRequestException 当ID格式无效时
   */
  static validateAndConvertToObjectId(
    id: string,
    fieldName = "ID",
  ): Types.ObjectId {
    this.validateObjectId(id, fieldName);
    return new Types.ObjectId(id);
  }

  /**
   * 批量验证并转换为ObjectId类型
   *
   * @param ids 要验证和转换的ID数组
   * @param fieldName 字段名称（用于错误消息）
   * @returns Mongoose ObjectId实例数组
   * @throws BadRequestException 当任一ID格式无效时
   */
  static validateAndConvertToObjectIds(
    ids: string[],
    fieldName = "ID列表",
  ): Types.ObjectId[] {
    this.validateObjectIds(ids, fieldName);
    return ids.map((id) => new Types.ObjectId(id));
  }
}
