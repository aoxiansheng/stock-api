import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";

/**
 * 测试结构验证器
 * 验证测试目录结构是否符合规范
 */
export class TestStructureValidator {
  private violations: StructureViolation[] = [];
  private expectedStructure: ExpectedStructure;

  constructor() {
    this.expectedStructure = {
      baseDir: "test",
      requiredDirs: [
        "test/jest/unit",
        "test/jest/integration",
        "test/jest/e2e",
        "test/jest/security",
        "test/k6/load",
        "test/k6/stress",
        "test/k6/spike",
        "test/config",
        "test/utils",
        "test/fixtures",
      ],
      requiredFiles: [
        "test/config/jest.unit.config.js",
        "test/config/jest.integration.config.js",
        "test/config/jest.e2e.config.js",
        "test/config/jest.security.config.js",
        "test/config/k6.config.js",
      ],
      moduleDirs: {
        "test/jest/unit": ["auth", "core", "common", "monitoring"],
        "test/jest/integration": ["auth", "core", "common", "monitoring"],
        "test/jest/e2e": ["auth", "core", "monitoring"],
        "test/jest/security": ["auth", "core", "common"],
      },
    };
  }

  /**
   * 执行结构验证
   */
  async validateStructure(): Promise<ValidationResult> {
    console.log("🔍 开始验证测试目录结构...");

    // 检查基础目录
    await this.validateBaseDirs();

    // 检查必需文件
    await this.validateRequiredFiles();

    // 检查模块目录
    await this.validateModuleDirs();

    // 检查文件命名规范
    await this.validateFileNaming();

    // 检查配置文件有效性
    await this.validateConfigFiles();

    const result: ValidationResult = {
      isValid: this.violations.length === 0,
      violations: this.violations,
      summary: this.generateSummary(),
      recommendations: this.generateRecommendations(),
    };

    this.printValidationResult(result);
    return result;
  }

  /**
   * 验证基础目录
   */
  private async validateBaseDirs(): Promise<void> {
    for (const dir of this.expectedStructure.requiredDirs) {
      if (!fs.existsSync(dir)) {
        this.violations.push({
          type: "missing_directory",
          severity: "error",
          path: dir,
          message: `缺少必需的目录: ${dir}`,
          suggestion: `创建目录: mkdir -p ${dir}`,
        });
      } else if (!fs.statSync(dir).isDirectory()) {
        this.violations.push({
          type: "invalid_directory",
          severity: "error",
          path: dir,
          message: `路径不是目录: ${dir}`,
          suggestion: `删除文件并创建目录: rm ${dir} && mkdir -p ${dir}`,
        });
      }
    }
  }

  /**
   * 验证必需文件
   */
  private async validateRequiredFiles(): Promise<void> {
    for (const file of this.expectedStructure.requiredFiles) {
      if (!fs.existsSync(file)) {
        this.violations.push({
          type: "missing_file",
          severity: "error",
          path: file,
          message: `缺少必需的配置文件: ${file}`,
          suggestion: `创建配置文件: ${file}`,
        });
      } else if (!fs.statSync(file).isFile()) {
        this.violations.push({
          type: "invalid_file",
          severity: "error",
          path: file,
          message: `路径不是文件: ${file}`,
          suggestion: `删除目录并创建文件: rm -rf ${file} && touch ${file}`,
        });
      }
    }
  }

  /**
   * 验证模块目录
   */
  private async validateModuleDirs(): Promise<void> {
    for (const [baseDir, modules] of Object.entries(
      this.expectedStructure.moduleDirs,
    )) {
      if (!fs.existsSync(baseDir)) {
        continue; // 基础目录检查已经覆盖
      }

      for (const module of modules) {
        const modulePath = path.join(baseDir, module);

        if (!fs.existsSync(modulePath)) {
          this.violations.push({
            type: "missing_module_directory",
            severity: "warning",
            path: modulePath,
            message: `缺少模块目录: ${modulePath}`,
            suggestion: `创建模块目录: mkdir -p ${modulePath}`,
          });
        }

        // 检查模块目录中是否有测试文件
        if (fs.existsSync(modulePath)) {
          const testFiles = await this.findTestFiles(modulePath);
          if (testFiles.length === 0) {
            this.violations.push({
              type: "empty_module_directory",
              severity: "info",
              path: modulePath,
              message: `模块目录为空: ${modulePath}`,
              suggestion: `添加测试文件到目录: ${modulePath}`,
            });
          }
        }
      }
    }
  }

  /**
   * 验证文件命名规范
   */
  private async validateFileNaming(): Promise<void> {
    const namingRules = {
      "test/jest/unit": /^.*\.spec\.ts$/,
      "test/jest/integration": /^.*\.integration\.test\.ts$/,
      "test/jest/e2e": /^.*\.e2e\.test\.ts$/,
      "test/jest/security": /^.*\.security\.test\.ts$/,
      "test/k6": /^.*\.perf\.test\.js$/,
    };

    for (const [dirPattern, filePattern] of Object.entries(namingRules)) {
      const testFiles = await glob(`${dirPattern}/**/*.{ts,js}`);

      for (const file of testFiles) {
        const fileName = path.basename(file);

        if (!filePattern.test(fileName)) {
          this.violations.push({
            type: "invalid_file_naming",
            severity: "warning",
            path: file,
            message: `文件命名不符合规范: ${fileName}`,
            suggestion: `重命名文件以匹配模式: ${filePattern.toString()}`,
          });
        }
      }
    }
  }

  /**
   * 验证配置文件有效性
   */
  private async validateConfigFiles(): Promise<void> {
    for (const configFile of this.expectedStructure.requiredFiles) {
      if (!fs.existsSync(configFile)) {
        continue; // 文件存在性检查已经覆盖
      }

      try {
        if (configFile.endsWith(".js")) {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require(path.resolve(configFile));
        } else if (configFile.endsWith(".json")) {
          JSON.parse(fs.readFileSync(configFile, "utf8"));
        }
      } catch (error) {
        this.violations.push({
          type: "invalid_config_syntax",
          severity: "error",
          path: configFile,
          message: `配置文件语法错误: ${error.message}`,
          suggestion: "检查配置文件语法并修复错误",
        });
      }
    }
  }

  /**
   * 查找测试文件
   */
  private async findTestFiles(dirPath: string): Promise<string[]> {
    try {
      return await glob(`${dirPath}/**/*.{ts,js}`);
    } catch {
      return [];
    }
  }

  /**
   * 生成验证摘要
   */
  private generateSummary(): string {
    const errorCount = this.violations.filter(
      (v) => v.severity === "error",
    ).length;
    const warningCount = this.violations.filter(
      (v) => v.severity === "warning",
    ).length;
    const infoCount = this.violations.filter(
      (v) => v.severity === "info",
    ).length;

    let summary = "测试结构验证完成";

    if (errorCount > 0) {
      summary += ` - 发现 ${errorCount} 个错误`;
    }
    if (warningCount > 0) {
      summary += ` - 发现 ${warningCount} 个警告`;
    }
    if (infoCount > 0) {
      summary += ` - 发现 ${infoCount} 个信息`;
    }

    if (this.violations.length === 0) {
      summary += " - 结构完全符合规范";
    }

    return summary;
  }

  /**
   * 生成修复建议
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    const errorViolations = this.violations.filter(
      (v) => v.severity === "error",
    );
    if (errorViolations.length > 0) {
      recommendations.push("优先修复所有错误级别的结构问题");

      const missingDirs = errorViolations.filter(
        (v) => v.type === "missing_directory",
      );
      if (missingDirs.length > 0) {
        const dirs = missingDirs.map((v) => v.path).join(" ");
        recommendations.push(`批量创建缺失目录: mkdir -p ${dirs}`);
      }
    }

    const warningViolations = this.violations.filter(
      (v) => v.severity === "warning",
    );
    if (warningViolations.length > 0) {
      recommendations.push("修复文件命名规范问题");
      recommendations.push("确保所有模块都有对应的测试文件");
    }

    if (this.violations.length === 0) {
      recommendations.push("测试结构完全符合规范，可以开始编写测试");
    }

    return recommendations;
  }

  /**
   * 打印验证结果
   */
  private printValidationResult(result: ValidationResult): void {
    console.log("\n📋 测试结构验证结果");
    console.log("=".repeat(50));

    if (result.isValid) {
      console.log("✅ 测试结构验证通过");
    } else {
      console.log("❌ 测试结构验证失败");
      console.log(`\n发现 ${result.violations.length} 个问题:`);

      result.violations.forEach((violation, index) => {
        const icon =
          violation.severity === "error"
            ? "🚫"
            : violation.severity === "warning"
              ? "⚠️"
              : "ℹ️";
        console.log(
          `\n${index + 1}. ${icon} [${violation.severity.toUpperCase()}] ${violation.message}`,
        );
        console.log(`   路径: ${violation.path}`);
        if (violation.suggestion) {
          console.log(`   建议: ${violation.suggestion}`);
        }
      });
    }

    console.log(`\n📊 ${result.summary}`);

    if (result.recommendations.length > 0) {
      console.log("\n💡 修复建议:");
      result.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
  }
}

// 类型定义
interface ExpectedStructure {
  baseDir: string;
  requiredDirs: string[];
  requiredFiles: string[];
  moduleDirs: { [dir: string]: string[] };
}

interface StructureViolation {
  type: string;
  severity: "error" | "warning" | "info";
  path: string;
  message: string;
  suggestion?: string;
}

interface ValidationResult {
  isValid: boolean;
  violations: StructureViolation[];
  summary: string;
  recommendations: string[];
}

// 命令行工具
export async function runStructureValidation(): Promise<void> {
  const validator = new TestStructureValidator();
  const result = await validator.validateStructure();

  if (!result.isValid) {
    const errorCount = result.violations.filter(
      (v) => v.severity === "error",
    ).length;
    process.exit(errorCount > 0 ? 1 : 0);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runStructureValidation().catch(console.error);
}
