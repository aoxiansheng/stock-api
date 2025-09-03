/**
 * 配置验证相关接口和类型定义
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validatedAt: Date;
}

export interface ConfigValidationRule {
  key: string;
  required: boolean;
  validator?: (value: any) => boolean;
  errorMessage?: string;
  warningMessage?: string;
}

export interface DependencyValidationResult {
  service: string;
  endpoint: string;
  isAvailable: boolean;
  responseTime?: number;
  error?: string;
  validatedAt: Date;
}

export interface ValidationOptions {
  timeout?: number;
  retries?: number;
  ignoreWarnings?: boolean;
}

export enum ValidationSeverity {
  ERROR = "error",
  WARNING = "warning",
  INFO = "info",
}

export interface ValidationMessage {
  severity: ValidationSeverity;
  key: string;
  message: string;
  value?: any;
  suggestion?: string;
}
