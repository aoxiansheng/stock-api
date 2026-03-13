import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { REFERENCE_DATA } from "@common/constants/domain";
import { API_OPERATIONS } from "@common/constants/domain";
import {
  IsArray,
  IsString,
  IsOptional,
  IsBoolean,
  ValidateNested,
  ArrayNotEmpty,
  ArrayMaxSize,
  IsNotEmpty,
  MaxLength,
  IsIn,
  IsInt,
  Max,
  Min,
  Matches,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

import { SUPPORTED_CAPABILITY_TYPES } from "../constants/operations.constants";
import { RECEIVER_VALIDATION_RULES } from "../constants/validation.constants";
import { IsValidSymbolFormat } from "@common/validators/symbol-format.validator";
import { BaseRequestOptionsDto } from "./common/base-request-options.dto";
import { StorageMode, StorageModeUtils } from "../enums/storage-mode.enum";
import {
  YMD_DATE_PATTERN,
  isValidYmdDate,
  validateYmdDateRange,
} from "@core/shared/utils/ymd-date.util";
import { SUPPORTED_MARKETS } from "@core/shared/utils/market-time.util";

export const RECEIVER_ALLOWED_MARKETS = SUPPORTED_MARKETS;

export function normalizeReceiverMarketInput(market: string): string {
  return market.trim().toUpperCase();
}

@ValidatorConstraint({ name: "isYmdDate", async: false })
class IsYmdDateConstraint implements ValidatorConstraintInterface {
  validate(value?: string): boolean {
    if (value === undefined || value === null || value === "") {
      return true;
    }
    return typeof value === "string" && isValidYmdDate(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} 必须是有效日期（YYYYMMDD）`;
  }
}

function IsYmdDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isYmdDate",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsYmdDateConstraint,
    });
  };
}

function IsYmdNotBefore(
  startProperty: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isYmdNotBefore",
      target: object.constructor,
      propertyName,
      constraints: [startProperty],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          if (value === undefined || value === null || value === "") {
            return true;
          }
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as Record<string, unknown>)[
            relatedPropertyName
          ];
          if (
            typeof value !== "string" ||
            typeof relatedValue !== "string" ||
            !isValidYmdDate(value) ||
            !isValidYmdDate(relatedValue)
          ) {
            return true;
          }
          return validateYmdDateRange(relatedValue, value).isValid;
        },
      },
    });
  };
}

export class RequestOptionsDto extends BaseRequestOptionsDto {
  @ApiPropertyOptional({ description: "首选数据提供商" })
  @IsOptional()
  @IsString()
  preferredProvider?: string;

  @ApiPropertyOptional({ description: "是否要求实时数据", default: false })
  @IsOptional()
  @IsBoolean()
  realtime?: boolean;

  @ApiPropertyOptional({ description: "指定返回字段", type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];

  @ApiPropertyOptional({ description: "市场代码", example: "HK" })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? normalizeReceiverMarketInput(value) : value,
  )
  @IsString()
  @IsIn(RECEIVER_ALLOWED_MARKETS, {
    message: `market 仅支持以下值: ${RECEIVER_ALLOWED_MARKETS.join(", ")}`,
  })
  market?: string;

  @ApiPropertyOptional({
    description: "分时回填根数（仅 get-stock-history/get-crypto-history 使用）",
    example: 240,
    minimum: 1,
    maximum: 500,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  klineNum?: number;

  @ApiPropertyOptional({
    description:
      "分时回填截止时间戳（仅 get-stock-history/get-crypto-history 使用，仅支持 10 位秒或 13 位毫秒）",
    example: 1758553860,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  timestamp?: number;

  @ApiPropertyOptional({
    description: "交易日查询起始日（YYYYMMDD，仅 get-trading-days 使用）",
    example: "20260101",
  })
  @IsOptional()
  @IsString()
  @Matches(YMD_DATE_PATTERN, { message: "beginDay 必须为 YYYYMMDD 格式" })
  @IsYmdDate()
  beginDay?: string;

  @ApiPropertyOptional({
    description: "交易日查询结束日（YYYYMMDD，仅 get-trading-days 使用）",
    example: "20260131",
  })
  @IsOptional()
  @IsString()
  @Matches(YMD_DATE_PATTERN, { message: "endDay 必须为 YYYYMMDD 格式" })
  @IsYmdDate()
  @IsYmdNotBefore("beginDay", { message: "beginDay 不能晚于 endDay" })
  endDay?: string;

  @ApiPropertyOptional({
    description: "存储模式：none=不存储，short_ttl=短时效存储，both=双存储",
    enum: StorageModeUtils.getAllModes(),
    default: StorageModeUtils.getDefault(),
  })
  @IsOptional()
  @IsIn(StorageModeUtils.getAllModes(), {
    message: `存储模式必须是以下值之一: ${StorageModeUtils.getAllModes().join(", ")}`,
  })
  storageMode?: StorageMode = StorageModeUtils.getDefault();
}

export class DataRequestDto {
  @ApiProperty({
    description: "股票代码列表",
    example: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, "AAPL.US", "000001.SZ"],
    type: [String],
  })
  @IsArray({ message: "股票代码必须是一个数组" })
  @ArrayNotEmpty({ message: "股票代码列表不能为空" })
  @ArrayMaxSize(RECEIVER_VALIDATION_RULES.MAX_SYMBOLS_COUNT, {
    message: `请求的股票代码数量不能超过 ${RECEIVER_VALIDATION_RULES.MAX_SYMBOLS_COUNT} 个`,
  })
  @IsString({ each: true, message: "每个股票代码都必须是字符串" })
  @IsNotEmpty({ each: true, message: "股票代码不能为空字符串" })
  @MaxLength(RECEIVER_VALIDATION_RULES.MAX_SYMBOL_LENGTH, {
    each: true,
    message: `每个股票代码的长度不能超过 ${RECEIVER_VALIDATION_RULES.MAX_SYMBOL_LENGTH} 个字符`,
  })
  @IsValidSymbolFormat({
    message: "股票代码格式不正确。请使用统一的股票代码验证规则。",
  })
  symbols: string[];

  @ApiProperty({
    description: "能力类型（用于提供商路由和能力匹配）",
    example: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
    enum: SUPPORTED_CAPABILITY_TYPES,
  })
  @IsString({ message: "能力类型必须是字符串" })
  @IsNotEmpty({ message: "能力类型不能为空" })
  @IsIn([...SUPPORTED_CAPABILITY_TYPES], {
    message: (args) =>
      `不支持的能力类型: ${args.value}。支持的类型包括: ${SUPPORTED_CAPABILITY_TYPES.join(", ")}`,
  })
  receiverType: string;

  @ApiPropertyOptional({ description: "请求选项" })
  @IsOptional()
  @ValidateNested()
  @Type(() => RequestOptionsDto)
  options?: RequestOptionsDto;
}
