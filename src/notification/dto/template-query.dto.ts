/**
 * 模板查询DTO
 * 🎯 通知模板查询的数据传输对象
 *
 * @description 继承BaseQueryDto，提供标准化的分页查询功能
 * @author Claude Code Assistant
 * @date 2025-09-16
 */

import { ApiPropertyOptional } from "@nestjs/swagger";
import { BaseQueryDto } from "@common/dto/base-query.dto";
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
} from "class-validator";

/**
 * 模板查询DTO
 * 继承BaseQueryDto，自动获得分页参数和验证
 */
export class TemplateQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({
    description: "事件类型",
    example: "alert_fired",
  })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional({
    description: "模板类型",
    enum: ["system", "user_defined"],
    example: "system",
  })
  @IsOptional()
  @IsEnum(["system", "user_defined"])
  templateType?: "system" | "user_defined";

  @ApiPropertyOptional({
    description: "是否启用",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: "标签列表",
    type: [String],
    example: ["urgent", "stock-alert"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: "分类",
    example: "stock",
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: "搜索关键词",
    example: "股价警告",
  })
  @IsOptional()
  @IsString()
  search?: string;

  // 继承自BaseQueryDto的标准分页和排序功能，无需重复定义
  // BaseQueryDto 已提供：page, limit, sortBy, sortOrder
}
