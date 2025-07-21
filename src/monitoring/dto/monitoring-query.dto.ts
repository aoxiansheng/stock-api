
import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'dateRange', async: false })
export class DateRangeValidator implements ValidatorConstraintInterface {
  validate(endDate: string, args: ValidationArguments) {
    const startDate = (args.object as any)[args.constraints[0]];
    if (!startDate || !endDate) {
      // 如果任一日期不存在，则不进行范围验证
      return true;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return false;
    }
    const diffInDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    // 限制查询范围为31天
    return diffInDays <= 31;
  }

  defaultMessage() {
    return 'The date range cannot exceed 31 days, and the start date must be before the end date.';
  }
}

export class GetDbPerformanceQueryDto {
  @ApiProperty({ required: false, description: '起始日期 (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false, description: '结束日期 (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  @Validate(DateRangeValidator, ['startDate'])
  endDate?: string;
} 