import { ApiProperty } from "@nestjs/swagger";

import { SymbolMappingRuleDocumentType } from "../schemas/symbol-mapping-rule.schema";

export class MappingRuleResponseDto {
  @ApiProperty({ description: "系统标准格式代码" })
  standardSymbol: string;

  @ApiProperty({ description: "厂商SDK格式代码" })
  sdkSymbol: string;

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
  SymbolMappingRule: MappingRuleResponseDto[];

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
    document: SymbolMappingRuleDocumentType,
  ): SymbolMappingResponseDto {
    const dto = new SymbolMappingResponseDto();
    dto.id = document._id.toString();
    dto.dataSourceName = document.dataSourceName;
    dto.SymbolMappingRule = document.SymbolMappingRule || [];
    dto.description = document.description;
    dto.version = document.version;
    dto.isActive = document.isActive;
    dto.createdBy = document.createdBy;
    dto.createdAt = document.createdAt;
    dto.updatedAt = document.updatedAt;
    return dto;
  }

  static fromLeanObject(leanObject: any): SymbolMappingResponseDto {
    const dto = new SymbolMappingResponseDto();
    dto.id = leanObject._id?.toString() || leanObject.id;
    dto.dataSourceName = leanObject.dataSourceName;
    dto.description = leanObject.description;
    dto.version = leanObject.version;
    dto.isActive = leanObject.isActive;
    dto.SymbolMappingRule = leanObject.SymbolMappingRule;
    dto.createdBy = leanObject.createdBy;
    dto.createdAt = leanObject.createdAt?.toISOString();
    dto.updatedAt = leanObject.updatedAt?.toISOString();
    return dto;
  }
}

