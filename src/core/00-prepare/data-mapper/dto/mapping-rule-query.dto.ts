import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDefined, IsIn, IsOptional, IsString } from "class-validator";
import { Transform } from "class-transformer";
import { BaseQueryDto } from "@common/dto/base-query.dto";
import {
  API_TYPE_VALUES,
  type ApiType,
  RULE_LIST_TYPE_VALUES,
  type RuleListType,
} from "../constants/data-mapper.constants";
import {
  normalizeLowercaseString,
  normalizeOptionalLowercaseString,
} from "../utils/string-normalize.util";

const TRANS_DATA_RULE_LIST_TYPE_ERROR_MESSAGE = (value: unknown): string =>
  `不支持的 transDataRuleListType: ${String(value)}，可选值: ${RULE_LIST_TYPE_VALUES.join(", ")}`;
const API_TYPE_ERROR_MESSAGE = (value: unknown): string =>
  `不支持的 apiType: ${String(value)}，可选值: ${API_TYPE_VALUES.join(", ")}`;
const normalizeQueryValue = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? normalizeLowercaseString(value) : value;
const normalizeProviderQueryValue = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== "string") {
    return value;
  }
  return normalizeOptionalLowercaseString(value);
};

export class MappingRuleListQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({ description: "提供商", example: "infoway" })
  @IsOptional()
  @Transform(normalizeProviderQueryValue)
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ description: "API 类型", example: "rest", enum: API_TYPE_VALUES })
  @IsOptional()
  @Transform(normalizeQueryValue)
  @IsIn([...API_TYPE_VALUES], {
    message: (args) => API_TYPE_ERROR_MESSAGE(args.value),
  })
  apiType?: ApiType;

  @ApiPropertyOptional({
    description: "规则字段集合类型过滤",
    enum: RULE_LIST_TYPE_VALUES,
    example: "trading_days_fields",
  })
  @IsOptional()
  @Transform(normalizeQueryValue)
  @IsIn([...RULE_LIST_TYPE_VALUES], {
    message: (args) => TRANS_DATA_RULE_LIST_TYPE_ERROR_MESSAGE(args.value),
  })
  transDataRuleListType?: RuleListType;
}

export class PreviewAlignmentQueryDto {
  @ApiProperty({
    description: "规则字段集合类型",
    enum: RULE_LIST_TYPE_VALUES,
    example: "trading_days_fields",
  })
  @IsDefined({ message: "transDataRuleListType 是必填参数" })
  @Transform(normalizeQueryValue)
  @IsIn([...RULE_LIST_TYPE_VALUES], {
    message: (args) => TRANS_DATA_RULE_LIST_TYPE_ERROR_MESSAGE(args.value),
  })
  transDataRuleListType: RuleListType;
}
