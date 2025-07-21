/**
 * 数据请求验证结果
 */
export interface IValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}