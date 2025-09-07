import { ApiProperty } from "@nestjs/swagger";
import {
  IsDateString,
  IsOptional,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import { MONITORING_SYSTEM_LIMITS } from "../../constants/config/monitoring-system.constants";

@ValidatorConstraint({ name: "DateRangeValidator", async: false })
export class DateRangeValidator implements ValidatorConstraintInterface {
  validate(endDate: string, args: ValidationArguments) {
    const startDate = (args.object as any)[args.constraints[0]];
    if (!startDate || !endDate) {
      return true;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return false;
    }

    // 检查日期顺序和范围（31天限制）
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / MONITORING_SYSTEM_LIMITS.DAY_IN_MS);
    
    return diffDays >= 0 && diffDays <= 31;
  }

  defaultMessage() {
    return "Date range cannot exceed 31 days and end date must be after start date";
  }
}

export class GetDbPerformanceQueryDto {
  @ApiProperty({ required: false, description: "起始日期 (ISO 8601)" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false, description: "结束日期 (ISO 8601)" })
  @IsOptional()
  @IsDateString()
  @Validate(DateRangeValidator, ["startDate"])
  endDate?: string;
}

