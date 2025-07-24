import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";

/**
 * 命名规范验证器
 * 验证测试文件命名是否符合规范
 */
export class NamingValidator {
  private violations: NamingViolation[] = [];
  private namingRules: NamingRules;

  constructor() {
    this.namingRules = {
      "test/jest/unit": {
        pattern: /^.*\.spec\.ts$/,
        description: "单元测试文件必须以 .spec.ts 结尾",
        examples: ["auth.service.spec.ts", "data-mapper.util.spec.ts"],
      },
      "test/jest/integration": {
        pattern: /^.*\.integration\.test\.ts$/,
        description: "集成测试文件必须以 .integration.test.ts 结尾",
        examples: ["auth.integration.test.ts", "database.integration.test.ts"],
      },
      "test/jest/e2e": {
        pattern: /^.*\.e2e\.test\.ts$/,
        description: "E2E测试文件必须以 .e2e.test.ts 结尾",
        examples: ["auth-flow.e2e.test.ts", "data-query.e2e.test.ts"],
      },
      "test/jest/security": {
        pattern: /^.*\.security\.test\.ts$/,
        description: "安全测试文件必须以 .security.test.ts 结尾",
        examples: [
          "auth-security.security.test.ts",
          "input-validation.security.test.ts",
        ],
      },
      "test/k6": {
        pattern: /^.*\.perf\.test\.js$/,
        description: "性能测试文件必须以 .perf.test.js 结尾",
        examples: ["auth-load.perf.test.js", "api-stress.perf.test.js"],
      },
    };
  }

  /**
   * 执行命名规范验证
   */
  async validateNaming(): Promise<NamingValidationResult> {
    console.log("🔍 开始验证测试文件命名规范...");

    // 验证各目录下的文件命名
    await this.validateDirectoryNaming();

    // 检查文件名一致性
    await this.validateFileNameConsistency();

    // 检查特殊命名约定
    await this.validateSpecialNamingConventions();

    const result: NamingValidationResult = {
      isValid: this.violations.length === 0,
      violations: this.violations,
      summary: this.generateSummary(),
      fixCommands: this.generateFixCommands(),
      namingGuide: this.generateNamingGuide(),
    };

    this.printValidationResult(result);
    return result;
  }

  /**
   * 验证目录下的文件命名
   */
  private async validateDirectoryNaming(): Promise<void> {
    for (const [dirPattern, rule] of Object.entries(this.namingRules)) {
      const testFiles = await glob(`${dirPattern}/**/*.{ts,js}`);

      for (const file of testFiles) {
        const fileName = path.basename(file);
        const relativePath = path.relative(process.cwd(), file);

        if (!rule.pattern.test(fileName)) {
          const suggestedName = this.generateSuggestedName(
            fileName,
            rule.pattern,
          );

          this.violations.push({
            type: "invalid_file_naming",
            severity: "warning",
            filePath: relativePath,
            fileName: fileName,
            expectedPattern: rule.pattern.toString(),
            description: rule.description,
            suggestedName: suggestedName,
            fixCommand: `mv "${file}" "${path.dirname(file)}/${suggestedName}"`,
          });
        }
      }
    }
  }

  /**
   * 验证文件名一致性
   */
  private async validateFileNameConsistency(): Promise<void> {
    // 检查是否有重复的测试目标但命名不一致
    const filesByTestTarget = new Map<string, string[]>();

    const allTestFiles = await glob("test/**/*.{ts,js}");

    for (const file of allTestFiles) {
      const fileName = path.basename(file);
      const testTarget = this.extractTestTarget(fileName);

      if (testTarget) {
        if (!filesByTestTarget.has(testTarget)) {
          filesByTestTarget.set(testTarget, []);
        }
        filesByTestTarget.get(testTarget)!.push(file);
      }
    }

    // 检查同一测试目标的文件命名一致性
    for (const [testTarget, files] of filesByTestTarget.entries()) {
      if (files.length > 1) {
        const baseNames = files.map((f) =>
          this.getBaseNameWithoutExtension(path.basename(f)),
        );
        const uniqueBaseNames = new Set(baseNames);

        if (uniqueBaseNames.size > 1) {
          this.violations.push({
            type: "inconsistent_naming",
            severity: "info",
            filePath: files.join(", "),
            fileName: files.map((f) => path.basename(f)).join(", "),
            expectedPattern: "一致的基础名称",
            description: `测试目标 "${testTarget}" 的文件命名不一致`,
            suggestedName: `建议统一使用: ${testTarget}.{type}.ts/js`,
            fixCommand: `# 请手动重命名文件以保持一致性`,
          });
        }
      }
    }
  }

  /**
   * 验证特殊命名约定
   */
  private async validateSpecialNamingConventions(): Promise<void> {
    // 检查setup文件命名
    const setupFiles = await glob("test/**/*setup*.{ts,js}");
    for (const file of setupFiles) {
      const fileName = path.basename(file);
      if (
        !fileName.includes("setup") ||
        (!fileName.endsWith(".ts") && !fileName.endsWith(".js"))
      ) {
        this.violations.push({
          type: "invalid_setup_naming",
          severity: "info",
          filePath: path.relative(process.cwd(), file),
          fileName: fileName,
          expectedPattern: "*setup*.{ts,js}",
          description: 'Setup文件应该包含 "setup" 关键字',
          suggestedName: this.generateSetupFileName(fileName),
        });
      }
    }

    // 检查helper文件命名
    const helperFiles = await glob("test/**/*helper*.{ts,js}");
    for (const file of helperFiles) {
      const fileName = path.basename(file);
      if (!fileName.includes("helper") && !fileName.includes("util")) {
        this.violations.push({
          type: "invalid_helper_naming",
          severity: "info",
          filePath: path.relative(process.cwd(), file),
          fileName: fileName,
          expectedPattern: "*helper*.{ts,js} 或 *util*.{ts,js}",
          description: '辅助文件应该包含 "helper" 或 "util" 关键字',
          suggestedName: this.generateHelperFileName(fileName),
        });
      }
    }
  }

  /**
   * 生成建议的文件名
   */
  private generateSuggestedName(fileName: string, pattern: RegExp): string {
    const baseName = this.getBaseNameWithoutExtension(fileName);

    if (pattern.toString().includes(".spec.ts")) {
      return `${baseName}.spec.ts`;
    } else if (pattern.toString().includes(".integration.test.ts")) {
      return `${baseName}.integration.test.ts`;
    } else if (pattern.toString().includes(".e2e.test.ts")) {
      return `${baseName}.e2e.test.ts`;
    } else if (pattern.toString().includes(".security.test.ts")) {
      return `${baseName}.security.test.ts`;
    } else if (pattern.toString().includes(".perf.test.js")) {
      return `${baseName}.perf.test.js`;
    }

    return fileName;
  }

  /**
   * 提取测试目标
   */
  private extractTestTarget(fileName: string): string | null {
    const baseName = this.getBaseNameWithoutExtension(fileName);

    // 移除测试类型后缀
    const cleanName = baseName
      .replace(/\.(spec|test|integration|e2e|security|perf)$/, "")
      .replace(/-(test|spec|integration|e2e|security|perf)$/, "");

    return cleanName || null;
  }

  /**
   * 获取不带扩展名的基础名称
   */
  private getBaseNameWithoutExtension(fileName: string): string {
    return path.basename(fileName, path.extname(fileName));
  }

  /**
   * 生成setup文件名
   */
  private generateSetupFileName(fileName: string): string {
    const baseName = this.getBaseNameWithoutExtension(fileName);
    const extension = path.extname(fileName);

    if (!baseName.includes("setup")) {
      return `${baseName}.setup${extension}`;
    }

    return fileName;
  }

  /**
   * 生成helper文件名
   */
  private generateHelperFileName(fileName: string): string {
    const baseName = this.getBaseNameWithoutExtension(fileName);
    const extension = path.extname(fileName);

    if (!baseName.includes("helper") && !baseName.includes("util")) {
      return `${baseName}.helper${extension}`;
    }

    return fileName;
  }

  /**
   * 生成验证摘要
   */
  private generateSummary(): string {
    const warningCount = this.violations.filter(
      (v) => v.severity === "warning",
    ).length;
    const infoCount = this.violations.filter(
      (v) => v.severity === "info",
    ).length;

    if (this.violations.length === 0) {
      return "所有测试文件命名规范正确";
    }

    let summary = "文件命名验证完成";
    if (warningCount > 0) {
      summary += ` - ${warningCount} 个命名问题`;
    }
    if (infoCount > 0) {
      summary += ` - ${infoCount} 个建议改进`;
    }

    return summary;
  }

  /**
   * 生成修复命令
   */
  private generateFixCommands(): string[] {
    const commands: string[] = [];

    const fixableViolations = this.violations.filter(
      (v) => v.fixCommand && !v.fixCommand.includes("#"),
    );

    if (fixableViolations.length > 0) {
      commands.push("# 自动修复命令:");
      fixableViolations.forEach((v) => {
        if (v.fixCommand) {
          commands.push(v.fixCommand);
        }
      });
    }

    return commands;
  }

  /**
   * 生成命名指南
   */
  private generateNamingGuide(): NamingGuide {
    return {
      rules: Object.entries(this.namingRules).map(([dir, rule]) => ({
        directory: dir,
        pattern: rule.pattern.toString(),
        description: rule.description,
        examples: rule.examples,
      })),
      bestPractices: [
        "使用小写字母和连字符分隔单词",
        "保持文件名简洁但具有描述性",
        "同一功能的不同测试类型使用相同的基础名称",
        "避免使用特殊字符和空格",
        "使用英文命名，保持团队一致性",
      ],
      commonMistakes: [
        "混用 .test.ts 和 .spec.ts",
        "忘记添加测试类型后缀",
        "使用大写字母开头",
        "在文件名中包含路径信息",
        "使用中文或特殊字符",
      ],
    };
  }

  /**
   * 打印验证结果
   */
  private printValidationResult(result: NamingValidationResult): void {
    console.log("\n📝 文件命名规范验证结果");
    console.log("=".repeat(50));

    if (result.isValid) {
      console.log("✅ 所有文件命名规范正确");
    } else {
      console.log("⚠️ 发现文件命名问题");
      console.log(`\n发现 ${result.violations.length} 个命名问题:`);

      result.violations.forEach((violation, index) => {
        const icon = violation.severity === "warning" ? "⚠️" : "ℹ️";
        console.log(
          `\n${index + 1}. ${icon} [${violation.severity.toUpperCase()}] ${violation.description}`,
        );
        console.log(`   文件: ${violation.fileName}`);
        console.log(`   路径: ${violation.filePath}`);
        if (violation.suggestedName) {
          console.log(`   建议: ${violation.suggestedName}`);
        }
      });
    }

    console.log(`\n📊 ${result.summary}`);

    if (result.fixCommands.length > 0) {
      console.log("\n🔧 修复命令:");
      result.fixCommands.forEach((cmd) => {
        console.log(cmd);
      });
    }

    console.log("\n📖 命名规范指南:");
    result.namingGuide.rules.forEach((rule) => {
      console.log(`\n${rule.directory}:`);
      console.log(`  模式: ${rule.pattern}`);
      console.log(`  说明: ${rule.description}`);
      console.log(`  示例: ${rule.examples.join(", ")}`);
    });
  }
}

// 类型定义
interface NamingRules {
  [directory: string]: {
    pattern: RegExp;
    description: string;
    examples: string[];
  };
}

interface NamingViolation {
  type: string;
  severity: "warning" | "info";
  filePath: string;
  fileName: string;
  expectedPattern: string;
  description: string;
  suggestedName?: string;
  fixCommand?: string;
}

interface NamingValidationResult {
  isValid: boolean;
  violations: NamingViolation[];
  summary: string;
  fixCommands: string[];
  namingGuide: NamingGuide;
}

interface NamingGuide {
  rules: Array<{
    directory: string;
    pattern: string;
    description: string;
    examples: string[];
  }>;
  bestPractices: string[];
  commonMistakes: string[];
}

// 命令行工具
export async function runNamingValidation(): Promise<void> {
  const validator = new NamingValidator();
  const result = await validator.validateNaming();

  if (!result.isValid) {
    const warningCount = result.violations.filter(
      (v) => v.severity === "warning",
    ).length;
    process.exit(warningCount > 0 ? 1 : 0);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runNamingValidation().catch(console.error);
}
