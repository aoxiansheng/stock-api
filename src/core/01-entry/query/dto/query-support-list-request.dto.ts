import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SymbolValidationUtils } from "@common/utils/symbol-validation.util";
import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";
import {
  INFOWAY_SUPPORT_SYMBOL_MAX_LENGTH,
} from "@providersv2/providers/infoway/utils/infoway-support-list.util";
import {
  SUPPORT_LIST_TYPES,
} from "../../../03-fetching/support-list/constants/support-list.constants";

const SUPPORT_LIST_SYMBOL_PATTERN = /^[A-Za-z0-9._:-]+$/;
const SUPPORT_LIST_SYMBOL_MAX_COUNT = 1000;
const SUPPORT_LIST_SINCE_PATTERN = /^\d{14}$/;

function normalizeSymbolsQueryInput(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const rawList = Array.isArray(value) ? value : String(value).split(",");
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const rawItem of rawList) {
    const symbol = SymbolValidationUtils.normalizeSymbol(String(rawItem || ""));
    if (!symbol || seen.has(symbol)) {
      continue;
    }
    seen.add(symbol);
    normalized.push(symbol);
  }

  if (normalized.length === 0) {
    return undefined;
  }

  return normalized;
}

export class QuerySupportListMetaRequestDto {
  @ApiProperty({
    description: "产品类型",
    enum: SUPPORT_LIST_TYPES,
    example: "STOCK_US",
  })
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @IsIn(SUPPORT_LIST_TYPES, {
    message: `type 仅支持以下值: ${SUPPORT_LIST_TYPES.join(", ")}`,
  })
  type: string;
}

export class QuerySupportListRequestDto extends QuerySupportListMetaRequestDto {
  @ApiPropertyOptional({
    description: "历史版本号，用于增量对齐",
    example: "20260309020000",
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @Matches(SUPPORT_LIST_SINCE_PATTERN, {
    message: "since 必须是 14 位数字版本号",
  })
  since?: string;

  @ApiPropertyOptional({
    description: "可选产品代码列表，多个用逗号分隔",
    example: ".DJI.US,.IXIC.US",
  })
  @IsOptional()
  @Transform(({ value }) => normalizeSymbolsQueryInput(value))
  @IsArray()
  @ArrayMaxSize(SUPPORT_LIST_SYMBOL_MAX_COUNT, {
    message: `symbols 数量不能超过 ${SUPPORT_LIST_SYMBOL_MAX_COUNT}`,
  })
  @IsString({ each: true })
  @MaxLength(INFOWAY_SUPPORT_SYMBOL_MAX_LENGTH, {
    each: true,
    message: `symbols 单项长度不能超过 ${INFOWAY_SUPPORT_SYMBOL_MAX_LENGTH}`,
  })
  @Matches(SUPPORT_LIST_SYMBOL_PATTERN, {
    each: true,
    message: "symbols 仅允许字母、数字、点号、下划线、中划线、冒号",
  })
  symbols?: string[];
}
