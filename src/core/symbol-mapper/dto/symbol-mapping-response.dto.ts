import { ApiProperty } from "@nestjs/swagger";

import { SymbolMappingRuleDocument } from "../schemas/symbol-mapping-rule.schema";

export class MappingRuleResponseDto {
  @ApiProperty({ description: "输入股票代码" })
  inputSymbol: string;

  @ApiProperty({ description: "输出股票代码" })
  outputSymbol: string;

  @ApiProperty({ description: "市场标识" })
  market?: string;

  @ApiProperty({ description: "股票类型" })
  symbolType?: string;

  @ApiProperty({ description: "是否启用" })
  isActive?: boolean;

  @ApiProperty({ description: "映射描述" })
  description?: string;
}

export class SymbolMappingResponseDto {
  @ApiProperty({ description: "ID" })
  id: string;

  @ApiProperty({ description: "数据源名称" })
  dataSourceName: string;

  @ApiProperty({ description: "映射规则列表", type: [MappingRuleResponseDto] })
  mappingRules: MappingRuleResponseDto[];

  @ApiProperty({ description: "数据源映射描述" })
  description?: string;

  @ApiProperty({ description: "版本号" })
  version?: string;

  @ApiProperty({ description: "是否启用" })
  isActive: boolean;

  @ApiProperty({ description: "创建者" })
  createdBy?: string;

  @ApiProperty({ description: "创建时间" })
  createdAt: Date;

  @ApiProperty({ description: "更新时间" })
  updatedAt: Date;

  static fromDocument(
    document: SymbolMappingRuleDocument,
  ): SymbolMappingResponseDto {
    return {
      id: document._id.toString(),
      dataSourceName: document.dataSourceName,
      mappingRules: document.mappingRules || [],
      description: document.description,
      version: document.version,
      isActive: document.isActive,
      createdBy: document.createdBy,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  static fromLeanObject(leanObject: any): SymbolMappingResponseDto {
    const dto = new SymbolMappingResponseDto();
    dto.id = leanObject._id?.toString() || leanObject.id;
    dto.dataSourceName = leanObject.dataSourceName;
    dto.description = leanObject.description;
    dto.version = leanObject.version;
    dto.isActive = leanObject.isActive;
    dto.mappingRules = leanObject.mappingRules;
    dto.createdBy = leanObject.createdBy;
    dto.createdAt = leanObject.createdAt?.toISOString();
    dto.updatedAt = leanObject.updatedAt?.toISOString();
    return dto;
  }
}

export class PaginatedResultDto<T> {
  @ApiProperty({ description: "数据列表" })
  items: T[];

  @ApiProperty({ description: "总数量" })
  total: number;

  @ApiProperty({ description: "当前页码" })
  page: number;

  @ApiProperty({ description: "每页数量" })
  limit: number;

  @ApiProperty({ description: "总页数" })
  totalPages: number;

  constructor(items: T[], total: number, page: number, limit: number) {
    this.items = items;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(total / limit);
  }
}
