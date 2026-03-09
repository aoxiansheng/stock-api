import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
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
  INFOWAY_SUPPORT_LIST_TYPES,
  INFOWAY_SUPPORT_SYMBOL_MAX_LENGTH,
} from "@providersv2/providers/infoway/utils/infoway-support-list.util";

const SUPPORT_LIST_SYMBOL_PATTERN = /^[A-Za-z0-9._:-]+$/;
const SUPPORT_LIST_SYMBOL_MAX_COUNT = 1000;

function normalizeSymbolsQueryInput(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const rawList = Array.isArray(value) ? value : String(value).split(",");
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const rawItem of rawList) {
    const symbol = String(rawItem || "").trim().toUpperCase();
    if (!symbol) {
      continue;
    }
    if (seen.has(symbol)) {
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

export class SupportListRequestDto {
  @ApiProperty({
    description: "产品类型",
    enum: INFOWAY_SUPPORT_LIST_TYPES,
    example: "STOCK_US",
  })
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @IsIn(INFOWAY_SUPPORT_LIST_TYPES, {
    message: `type 仅支持以下值: ${INFOWAY_SUPPORT_LIST_TYPES.join(", ")}`,
  })
  type: string;

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

  @ApiPropertyOptional({
    description: "首选数据提供商（默认自动选择）",
    example: "infoway",
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  preferredProvider?: string;
}
