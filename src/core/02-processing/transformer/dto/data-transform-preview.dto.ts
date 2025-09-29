import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsNotIn,
  ValidateIf,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from "class-validator";

// 自定义验证器：检测循环引用标记
function NoCircularReference(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'noCircularReference',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return !hasCircularReferenceMarker(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} contains circular reference`;
        },
      },
    });
  };
}

// 辅助函数：检查对象是否包含循环引用标记
function hasCircularReferenceMarker(obj: any): boolean {
  if (typeof obj === 'string' && obj === '[CIRCULAR_REFERENCE_INVALID]') {
    return true;
  }
  
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  if (Array.isArray(obj)) {
    return obj.some(item => hasCircularReferenceMarker(item));
  }
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (hasCircularReferenceMarker(obj[key])) {
        return true;
      }
    }
  }
  
  return false;
}

export class TransformMappingRuleInfoDto {
  @ApiProperty({ description: "映射规则ID" })
  @IsString()
  id: string;

  @ApiProperty({ description: "映射规则名称" })
  @IsString()
  name: string;

  @ApiProperty({ description: "数据提供商" })
  @IsString()
  provider: string;

  @ApiProperty({ description: "规则列表类型" })
  @IsString()
  transDataRuleListType: string;

  @ApiProperty({ description: "字段映射数量" })
  @IsNumber()
  dataFieldMappingsCount: number;
}

export class TransformFieldMappingPreviewDto {
  @ApiProperty({ description: "源字段路径" })
  @IsString()
  sourceField: string;

  @ApiProperty({ description: "目标字段路径" })
  @IsString()
  targetField: string;

  @ApiProperty({ description: "源字段示例值" })
  @IsOptional()
  sampleSourceValue: any;

  @ApiProperty({ description: "预期目标值" })
  @IsOptional()
  expectedTargetValue: any;

  @ApiProperty({ description: "转换类型", required: false })
  @IsOptional()
  @IsString()
  transformType?: string;
}

export class TransformPreviewDto {
  @ApiProperty({
    description: "映射规则信息",
    type: TransformMappingRuleInfoDto,
  })
  @ValidateNested()
  @Type(() => TransformMappingRuleInfoDto)
  @IsObject()
  transformMappingRule: TransformMappingRuleInfoDto;

  @ApiProperty({
    description: "示例输入数据",
  })
  @IsObject()
  @NoCircularReference({ message: 'sampleInput contains circular reference' })
  sampleInput: any;

  @ApiProperty({
    description: "预期输出数据",
  })
  @IsObject()
  @NoCircularReference({ message: 'expectedOutput contains circular reference' })
  expectedOutput: any;

  @ApiProperty({
    description: "字段映射预览列表",
    type: [TransformFieldMappingPreviewDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransformFieldMappingPreviewDto)
  sharedDataFieldMappings: TransformFieldMappingPreviewDto[];
}

export class DataBatchTransformOptionsDto {
  @ApiProperty({
    description: "出错时是否继续处理",
    required: false,
    default: false,
  })
  @ValidateIf((o) => o.continueOnError !== undefined)
  @IsBoolean({ message: 'continueOnError must be a boolean value' })
  @IsNotIn([null], { message: 'continueOnError cannot be null' })
  continueOnError?: boolean;
}
