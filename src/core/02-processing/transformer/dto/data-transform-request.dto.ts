import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

import {
  IsString,
  IsObject,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
  ValidateIf,
} from "class-validator";
import { API_TYPE_VALUES } from "../../../00-prepare/data-mapper/constants/data-mapper.constants";
import type { ApiType } from "../../../00-prepare/data-mapper/constants/data-mapper.constants";

@ValidatorConstraint({ name: 'isNonEmptyObjectOrArray', async: false })
export class IsNonEmptyObjectOrArrayConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (Array.isArray(value)) {
      return true;
    }
    if (typeof value === 'object' && value !== null) {
      return Object.keys(value).length > 0;
    }
    return false;
  }

  defaultMessage(args: ValidationArguments) {
    return 'rawData must be a non-empty object or an array';
  }
}

export function IsNonEmptyObjectOrArray(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsNonEmptyObjectOrArrayConstraint,
    });
  };
}

class TransformOptionsDto {

  @ApiPropertyOptional({
    description: "是否包含转换元数据",
  })
  @ValidateIf((o, v) => v !== undefined)
  @IsBoolean()
  includeMetadata?: boolean;

  @ApiPropertyOptional({ description: "是否包含调试信息" })
  @ValidateIf((o, v) => v !== undefined)
  @IsBoolean()
  includeDebugInfo?: boolean;

}

export class DataTransformRequestDto {
  @ApiProperty({
    description: "数据提供商名称",
    example: "longport",
  })
  @IsString()
  @IsNotEmpty()
  provider: string;

  @ApiProperty({
    description: "API类型",
    example: "rest",
    enum: API_TYPE_VALUES,
  })
  @IsEnum(API_TYPE_VALUES)
  apiType: ApiType;

  @ApiProperty({
    description: "数据映射规则列表类型（用于查找对应的映射规则）",
    example: "quote_fields",
  })
  @IsString()
  @IsNotEmpty()
  transDataRuleListType: string;

  @ApiProperty({ description: "要转换的原始数据" })
  @IsNonEmptyObjectOrArray()
  rawData: any;

  @ApiPropertyOptional({ description: "要使用的特定映射规则ID" })
  @IsOptional()
  @IsString()
  mappingOutRuleId?: string;

  @ApiPropertyOptional({ description: "转换选项" })
  @IsOptional()
  @ValidateNested()
  @Type(() => TransformOptionsDto)
  options?: TransformOptionsDto;
}
