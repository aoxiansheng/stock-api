import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { RULE_LIST_TYPE_VALUES } from "../constants/data-mapper.constants";
import type { RuleListType } from "../constants/data-mapper.constants";
import {
  normalizeLowercaseString,
  normalizeTrimmedString,
} from "../utils/string-normalize.util";

export class GenerateRuleFromTemplateDto {
  @ApiProperty({
    description: "映射规则类型",
    enum: RULE_LIST_TYPE_VALUES,
    example: "quote_fields",
  })
  @Transform(({ value }) =>
    typeof value === "string" ? normalizeLowercaseString(value) : value,
  )
  @IsIn([...RULE_LIST_TYPE_VALUES], {
    message: (args) =>
      `不支持的 transDataRuleListType: ${args.value}，可选值: ${RULE_LIST_TYPE_VALUES.join(", ")}`,
  })
  transDataRuleListType: RuleListType;

  @ApiPropertyOptional({
    description: "规则名称（可选）",
    example: "Infoway Quote Auto Rule",
    maxLength: 128,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? normalizeTrimmedString(value) : value,
  )
  @IsString()
  @IsNotEmpty({ message: "ruleName 不能为空白字符" })
  @MaxLength(128)
  ruleName?: string;
}
