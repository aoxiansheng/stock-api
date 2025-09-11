import { Injectable } from "@nestjs/common";
import { ValidationService } from "./validation.service";
import { ValidationResult, ValidationOptions } from "../interfaces/validation.interfaces";

@Injectable()
export class ValidationOrchestratorService {
  constructor(private readonly validationService: ValidationService) {}

  /**
   * 编排验证流程
   */
  async orchestrateValidation(options?: ValidationOptions): Promise<ValidationResult> {
    // 执行完整的配置验证
    const result = await this.validationService.validateAll(options);
    
    // 返回整体验证结果
    return result.overall;
  }

  /**
   * 快速验证编排
   */
  async quickValidation(): Promise<ValidationResult> {
    return this.validationService.validateQuick();
  }

  /**
   * 启动要求验证编排
   */
  async startupValidation(): Promise<ValidationResult> {
    return this.validationService.validateStartupRequirements();
  }
}