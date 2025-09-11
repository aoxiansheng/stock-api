import { Injectable } from "@nestjs/common";
import { createLogger } from "@appcore/config/logger.config";
import { EnvironmentValidator } from "../validators/environment.validator";
import { DependenciesValidator } from "../validators/dependencies.validator";
import {
  ValidationResult,
  ValidationOptions,
  ValidationMessage,
  ValidationSeverity,
} from "../interfaces/validation.interfaces";

export interface FullValidationResult {
  overall: ValidationResult;
  environment: ValidationResult;
  dependencies: ValidationResult;
  summary: {
    totalErrors: number;
    totalWarnings: number;
    validationDuration: number;
    recommendedActions: string[];
  };
}

@Injectable()
export class ValidationService {
  private readonly logger = createLogger(ValidationService.name);

  constructor(
    private readonly environmentValidator: EnvironmentValidator,
    private readonly dependenciesValidator: DependenciesValidator,
  ) {}

  /**
   * 执行完整的配置验证
   */
  async validateAll(
    options: ValidationOptions = {},
  ): Promise<FullValidationResult> {
    const startTime = Date.now();

    this.logger.log("Starting comprehensive configuration validation...");

    try {
      // 并行执行环境变量和依赖验证
      const [environmentResult, dependenciesResult] = await Promise.all([
        this.environmentValidator.validateEnvironment(),
        this.dependenciesValidator.validate(),
      ]);

      // 合并结果
      const allErrors = [
        ...environmentResult.errors,
        ...(dependenciesResult.errors || []),
      ];

      const allWarnings = [
        ...environmentResult.warnings,
        ...(dependenciesResult.warnings || []),
      ];

      const overallResult: ValidationResult = {
        isValid: allErrors.length === 0,
        errors: allErrors,
        warnings: allWarnings,
        validatedAt: new Date(),
      };

      // 生成建议操作
      const recommendedActions = this.generateRecommendedActions(
        environmentResult,
        dependenciesResult,
      );

      const validationDuration = Date.now() - startTime;

      const result: FullValidationResult = {
        overall: overallResult,
        environment: environmentResult,
        dependencies: dependenciesResult,
        summary: {
          totalErrors: allErrors.length,
          totalWarnings: allWarnings.length,
          validationDuration,
          recommendedActions,
        },
      };

      this.logValidationSummary(result);

      return result;
    } catch (error) {
      this.logger.error("Configuration validation failed", {
        error: error.message,
      });

      const failedResult: ValidationResult = {
        isValid: false,
        errors: [`Configuration validation failed: ${error.message}`],
        warnings: [],
        validatedAt: new Date(),
      };

      return {
        overall: failedResult,
        environment: failedResult,
        dependencies: failedResult as any,
        summary: {
          totalErrors: 1,
          totalWarnings: 0,
          validationDuration: Date.now() - startTime,
          recommendedActions: ["Fix configuration validation system errors"],
        },
      };
    }
  }

  /**
   * 快速验证（仅环境变量）
   */
  async validateQuick(): Promise<ValidationResult> {
    this.logger.debug("Starting quick validation (environment only)...");
    return this.environmentValidator.validateEnvironment();
  }

  /**
   * 验证启动前必需的配置
   */
  async validateStartupRequirements(): Promise<ValidationResult> {
    this.logger.log("Validating startup requirements...");

    const startupErrors: string[] = [];
    const startupWarnings: string[] = [];

    try {
      // 检查关键环境变量
      const criticalEnvVars = ["NODE_ENV", "MONGODB_URI", "JWT_SECRET"];

      criticalEnvVars.forEach((envVar) => {
        if (!process.env[envVar]) {
          startupErrors.push(
            `Critical environment variable ${envVar} is not set`,
          );
        }
      });

      // 检查端口配置
      const port = process.env.PORT;
      if (port && (isNaN(parseInt(port, 10)) || parseInt(port, 10) <= 0)) {
        startupErrors.push("PORT must be a valid positive integer");
      }

      // 检查生产环境特殊要求
      if (process.env.NODE_ENV === "production") {
        if (process.env.JWT_SECRET === "dev-secret-key") {
          startupErrors.push("Cannot use default JWT_SECRET in production");
        }

        if (!process.env.LONGPORT_APP_KEY || !process.env.LONGPORT_APP_SECRET) {
          startupWarnings.push(
            "LongPort credentials not configured for production",
          );
        }
      }

      return {
        isValid: startupErrors.length === 0,
        errors: startupErrors,
        warnings: startupWarnings,
        validatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error("Startup validation failed", { error: error.message });
      return {
        isValid: false,
        errors: [`Startup validation failed: ${error.message}`],
        warnings: [],
        validatedAt: new Date(),
      };
    }
  }

  /**
   * 生成推荐操作
   */
  private generateRecommendedActions(
    environmentResult: ValidationResult,
    dependenciesResult: ValidationResult,
  ): string[] {
    const actions: string[] = [];

    // 基于错误生成操作建议
    if (environmentResult.errors.length > 0) {
      actions.push("Fix environment variable configuration errors");

      if (environmentResult.errors.some((e) => e.includes("JWT_SECRET"))) {
        actions.push("Generate a strong JWT secret key");
      }

      if (environmentResult.errors.some((e) => e.includes("MONGODB_URI"))) {
        actions.push("Configure valid MongoDB connection string");
      }
    }

    if (dependenciesResult.errors && dependenciesResult.errors.length > 0) {
      actions.push("Ensure all required services are running and accessible");

      if (dependenciesResult.errors.some((e) => e.includes("MongoDB"))) {
        actions.push("Start MongoDB service and verify connectivity");
      }

      if (dependenciesResult.errors.some((e) => e.includes("Redis"))) {
        actions.push("Start Redis service and verify connectivity");
      }
    }

    // 基于警告生成建议
    if (
      (environmentResult.warnings && environmentResult.warnings.length > 0) ||
      (dependenciesResult.warnings && dependenciesResult.warnings.length > 0)
    ) {
      actions.push("Review configuration warnings for optimal setup");
    }

    if (actions.length === 0) {
      actions.push("Configuration is valid and ready for use");
    }

    return actions;
  }

  /**
   * 记录验证摘要
   */
  private logValidationSummary(result: FullValidationResult): void {
    const { overall, summary } = result;

    if (overall.isValid) {
      this.logger.log("Configuration validation completed successfully", {
        duration: summary.validationDuration,
        warnings: summary.totalWarnings,
      });
    } else {
      this.logger.error("Configuration validation failed", {
        errors: summary.totalErrors,
        warnings: summary.totalWarnings,
        duration: summary.validationDuration,
        actions: summary.recommendedActions,
      });
    }

    // 详细日志（debug级别）
    this.logger.debug("Validation details", {
      environment: {
        valid: result.environment.isValid,
        errors: result.environment.errors.length,
        warnings: result.environment.warnings.length,
      },
      dependencies: {
        valid: result.dependencies.isValid,
        errors: result.dependencies.errors ? result.dependencies.errors.length : 0,
        warnings: result.dependencies.warnings ? result.dependencies.warnings.length : 0,
      },
    });
  }
}