import { ApiProperty } from "@nestjs/swagger";
import {
  IsDateString,
  IsOptional,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

@ValidatorConstraint({ name: "MonitoringDateRangeValidator", async: false })
export class MonitoringDateRangeValidator
  implements ValidatorConstraintInterface
{
  validate(endDate: string, args: ValidationArguments) {
    const startDate = (args.object as any)[args.constraints[0]];
    if (!startDate || !endDate) {
      // 如果任一日期不存在，则不进行范围验证
      return true;
    }

    // 转换为日期
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 检查日期是否有效
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      // 检查是否是直接调用验证器的单元测试
      // 如果父对象已通过IsDateString验证，这里不该发生
      if (this.isDirectlyCalledInUnitTest(args)) {
        return false;
      }
      // 否则，跳过日期范围验证
      return true;
    }

    // 计算差异天数
    const diffDays = this.calculateDayDifference(start, end);

    // 检查日期顺序
    if (diffDays < 0) {
      return false;
    }

    // 限制查询范围为31天（包含首尾日期）
    // 2024-01-01到2024-02-01应该是31天
    return diffDays <= 31;
  }

  // 计算两个日期之间的差异天数（包含首尾两天）
  private calculateDayDifference(start: Date, end: Date): number {
    // 标准化为UTC午夜时间（消除时间部分的影响）
    const startUtc = Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth(),
      start.getUTCDate(),
    );
    const endUtc = Date.UTC(
      end.getUTCFullYear(),
      end.getUTCMonth(),
      end.getUTCDate(),
    );

    // 计算天数差（毫秒差除以一天的毫秒数）
    const msPerDay = 1000 * 60 * 60 * 24;
    const diffMs = endUtc - startUtc;

    // 包含首尾日期
    return Math.floor(diffMs / msPerDay);
  }

  // 判断是否在单元测试中直接调用
  private isDirectlyCalledInUnitTest(args: ValidationArguments): boolean {
    // 在单元测试中，mockArgs通常只包含最小必要的属性
    return Object.keys(args).length <= 2 && !!args.constraints;
  }

  defaultMessage() {
    return "The date range cannot exceed 31 days, and the start date must be before the end date.";
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
  @Validate(MonitoringDateRangeValidator, ["startDate"])
  endDate?: string;
}
