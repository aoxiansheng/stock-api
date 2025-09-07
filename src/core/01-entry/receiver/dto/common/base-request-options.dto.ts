import { IsOptional, IsBoolean } from 'class-validator';

export class BaseRequestOptionsDto {
  @IsOptional()
  @IsBoolean()
  skipCache?: boolean;

  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;
}