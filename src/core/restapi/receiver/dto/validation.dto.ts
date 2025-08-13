import { ApiProperty } from "@nestjs/swagger";

export class ValidationResultDto {
  @ApiProperty({ description: "验证是否通过" })
  isValid: boolean;

  @ApiProperty({ description: "错误信息列表", type: [String] })
  errors: string[];

  @ApiProperty({ description: "警告信息列表", type: [String], required: false })
  warnings?: string[];

  constructor(isValid: boolean, errors: string[], warnings?: string[]) {
    this.isValid = isValid;
    this.errors = errors;
    this.warnings = warnings;
  }

  static valid(warnings?: string[]): ValidationResultDto {
    return new ValidationResultDto(true, [], warnings);
  }

  static invalid(errors: string[], warnings?: string[]): ValidationResultDto {
    return new ValidationResultDto(false, errors, warnings);
  }
}
