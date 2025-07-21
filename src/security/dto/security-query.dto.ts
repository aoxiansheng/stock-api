
import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsIn,
  IsDateString,
  IsIP,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

const ALLOWED_SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'] as const;
const ALLOWED_VULNERABILITY_TYPES = [
  'authentication',
  'authorization',
  'data_exposure',
  'injection',
  'configuration',
  'encryption',
] as const;
const ALLOWED_OUTCOMES = ['success', 'failure', 'blocked'] as const;

const MAX_DATE_RANGE_DAYS = 90;

@ValidatorConstraint({ name: 'isValidDateRange', async: false })
export class IsValidDateRangeConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const obj = args.object as GetAuditEventsQueryDto;
    const startDate = obj.startDate ? new Date(obj.startDate) : null;
    const endDate = obj.endDate ? new Date(obj.endDate) : null;

    if (!startDate || !endDate) {
      return true; // If one date is missing, skip validation
    }

    if (startDate >= endDate) {
      return false; // Start date must be before end date
    }

    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays <= MAX_DATE_RANGE_DAYS;
  }

  defaultMessage(args: ValidationArguments) {
    const obj = args.object as GetAuditEventsQueryDto;
    const startDate = obj.startDate ? new Date(obj.startDate) : null;
    const endDate = obj.endDate ? new Date(obj.endDate) : null;

    if (startDate && endDate && startDate >= endDate) {
      return 'startDate must be before endDate';
    }

    return `The date range cannot exceed ${MAX_DATE_RANGE_DAYS} days`;
  }
}

export class GetVulnerabilitiesQueryDto {
  @ApiProperty({
    required: false,
    description: '按严重程度过滤',
    enum: ALLOWED_SEVERITIES,
  })
  @IsOptional()
  @IsString()
  @IsIn(ALLOWED_SEVERITIES)
  severity?: typeof ALLOWED_SEVERITIES[number];

  @ApiProperty({
    required: false,
    description: '按类型过滤',
    enum: ALLOWED_VULNERABILITY_TYPES,
  })
  @IsOptional()
  @IsString()
  @IsIn(ALLOWED_VULNERABILITY_TYPES)
  type?: typeof ALLOWED_VULNERABILITY_TYPES[number];
}

export class GetAuditEventsQueryDto {
  @ApiProperty({ required: false, description: '起始日期 (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false, description: '结束日期 (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @Validate(IsValidDateRangeConstraint, {
    message: '无效的时间范围',
  })
  // This is a virtual property to hang the decorator on
  dateRange: null;

  @ApiProperty({ required: false, description: '按事件类型过滤' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  type?: string;

  @ApiProperty({
    required: false,
    description: '按严重程度过滤',
    enum: ALLOWED_SEVERITIES,
  })
  @IsOptional()
  @IsString()
  @IsIn(ALLOWED_SEVERITIES)
  severity?: typeof ALLOWED_SEVERITIES[number];

  @ApiProperty({ required: false, description: '按客户端IP过滤' })
  @IsOptional()
  @IsIP()
  clientIP?: string;

  @ApiProperty({
    required: false,
    description: '按事件结果过滤',
    enum: ALLOWED_OUTCOMES,
  })
  @IsOptional()
  @IsString()
  @IsIn(ALLOWED_OUTCOMES)
  outcome?: typeof ALLOWED_OUTCOMES[number];

  @ApiProperty({ required: false, description: '返回数量限制', default: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  limit: number = 100;

  @ApiProperty({ required: false, description: '偏移量', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset: number = 0;
}

const ALLOWED_EVENT_TYPES = [
  'authentication',
  'authorization',
  'data_access',
  'system',
  'suspicious_activity',
] as const;

export class RecordManualEventDto {
  @ApiProperty({
    description: '事件类型',
    enum: ALLOWED_EVENT_TYPES,
  })
  @IsString()
  @IsIn(ALLOWED_EVENT_TYPES)
  type: typeof ALLOWED_EVENT_TYPES[number];

  @ApiProperty({
    description: '事件严重性',
    enum: ALLOWED_SEVERITIES,
  })
  @IsString()
  @IsIn(ALLOWED_SEVERITIES)
  severity: typeof ALLOWED_SEVERITIES[number];

  @ApiProperty({
    description: '事件动作的简短描述',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiProperty({ description: '触发事件的客户端IP' })
  @IsIP()
  clientIP: string;

  @ApiProperty({ description: '客户端的User-Agent' })
  @IsString()
  @IsNotEmpty()
  userAgent: string;

  @ApiProperty({
    description: '事件结果',
    enum: ALLOWED_OUTCOMES,
  })
  @IsString()
  @IsIn(ALLOWED_OUTCOMES)
  outcome: typeof ALLOWED_OUTCOMES[number];

  @ApiProperty({ required: false, description: '相关的用户ID' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  userId?: string;

  @ApiProperty({ required: false, description: '相关的API Key ID' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  apiKeyId?: string;

  @ApiProperty({ required: false, description: '额外的元数据' })
  @IsOptional()
  details?: Record<string, any>;
} 