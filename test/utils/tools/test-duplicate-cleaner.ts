#!/usr/bin/env ts-node
/* eslint-disable @typescript-eslint/no-unused-vars */

import fs from "fs";
import path from "path";

interface DuplicateFile {
  path: string;
  relativePath: string;
  content: string;
}

class TestDuplicateCleaner {
  private testDirectory: string;
  private targetFilePath: string;
  private targetContent: string;
  private duplicateFiles: DuplicateFile[] = [];

  constructor(testDirectory: string, targetFilePath?: string) {
    this.testDirectory = testDirectory;
    this.targetFilePath = targetFilePath || "";
    if (targetFilePath) {
      this.targetContent = this.normalizeContent(
        fs.readFileSync(targetFilePath, "utf-8"),
      );
    } else {
      this.targetContent = "";
    }
  }

  /**
   * 标准化文件内容 - 移除空行和多余空格用于比较
   */
  private normalizeContent(content: string): string {
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n");
  }

  /**
   * 递归遍历目录查找所有.spec.ts文件
   */
  private findAllTestFiles(dir: string): string[] {
    const files: string[] = [];

    try {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          files.push(...this.findAllTestFiles(fullPath));
        } else if (item.endsWith(".spec.ts") || item.endsWith(".test.ts")) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`⚠️  无法读取目录: ${dir}`);
    }

    return files;
  }

  /**
   * 检查文件内容是否与目标文件一致
   */
  private isContentIdentical(filePath: string): boolean {
    try {
      const content = fs.readFileSync(filePath, "utf-8");

      // 检查是否是基本的占位测试文件
      return this.isPlaceholderTestFile(content);
    } catch (error) {
      console.warn(`⚠️  无法读取文件: ${filePath}`);
      return false;
    }
  }

  /**
   * 检查是否是占位测试文件（基本的"should be defined"测试）
   */
  private isPlaceholderTestFile(content: string): boolean {
    const lines = content.split("\n").map((line) => line.trim());

    // 基本模式检查
    const hasImport = lines.some((line) =>
      line.includes("import { Test, TestingModule }"),
    );
    const hasDescribe = lines.some((line) => line.includes("describe("));
    const hasBeforeEach = lines.some((line) => line.includes("beforeEach"));
    const hasBasicTest = lines.some((line) =>
      line.includes("should be defined"),
    );
    const hasTestingModule = lines.some((line) =>
      line.includes("Test.createTestingModule"),
    );
    const hasExpectDefined = lines.some(
      (line) => line.includes("expect(") && line.includes(").toBeDefined()"),
    );

    // E2E 测试特征检查
    const hasINestApplication = lines.some((line) =>
      line.includes("INestApplication"),
    );
    const hasSupertest = lines.some((line) =>
      line.includes("* as request from 'supertest'"),
    );
    const hasAppModule = lines.some((line) => line.includes("AppModule"));
    const hasAfterEach = lines.some((line) => line.includes("afterEach"));
    const hasAppInit = lines.some((line) => line.includes("app.init()"));
    const hasAppClose = lines.some((line) => line.includes("app.close()"));

    // 检查是否是E2E占位模板
    const isE2ETemplate =
      hasINestApplication &&
      hasSupertest &&
      hasAppModule &&
      hasAfterEach &&
      hasAppInit &&
      hasAppClose;

    // 计算非空白行数
    const nonEmptyLines = lines.filter((line) => line.length > 0);

    // 检查是否是简单的占位文件：
    // 1. 有基本的测试结构
    // 2. 只有一个测试用例（should be defined）
    // 3. 文件内容相对简单（适应不同测试类型，E2E模板更长一些）
    const isBasicStructure =
      hasImport &&
      hasDescribe &&
      hasBeforeEach &&
      hasBasicTest &&
      hasTestingModule &&
      hasExpectDefined;
    const isSimpleFile = nonEmptyLines.length <= (isE2ETemplate ? 35 : 30); // E2E模板允许更多行
    // 更精确的测试函数检测 - 避免匹配到 app.init() 等
    const testMatches = content.match(/^\s*it\s*\(/gm); // 只匹配行首的 it(
    const hasSingleTest = testMatches?.length === 1;

    // 额外检查：确保没有复杂的测试逻辑
    const hasComplexLogic = lines.some(
      (line) =>
        line.includes("mock") ||
        line.includes("spy") ||
        line.includes("jest.fn") ||
        (line.includes("expect(") && line.split("expect(").length > 2), // 多个expect调用
    );

    // 对于E2E文件，检查测试的是否是app对象
    if (isE2ETemplate) {
      const testsApp = lines.some((line) =>
        line.includes("expect(app).toBeDefined()"),
      );
      return (
        isBasicStructure &&
        isSimpleFile &&
        hasSingleTest &&
        !hasComplexLogic &&
        testsApp
      );
    }

    return (
      isBasicStructure && isSimpleFile && hasSingleTest && !hasComplexLogic
    );
  }

  /**
   * 扫描所有文件找到占位测试文件
   */
  public scanForDuplicates(): void {
    console.log("🔍 开始扫描占位测试文件...");
    console.log(`📂 目标目录: ${this.testDirectory}`);
    if (this.targetFilePath) {
      console.log(`🎯 参考文件: ${this.targetFilePath}`);
    } else {
      console.log(`🎯 扫描模式: 通用占位文件检测`);
    }
    console.log();

    const allTestFiles = this.findAllTestFiles(this.testDirectory);
    console.log(`📋 找到 ${allTestFiles.length} 个测试文件`);

    let duplicateCount = 0;

    for (const filePath of allTestFiles) {
      // 跳过目标文件本身
      if (filePath === this.targetFilePath) {
        continue;
      }

      if (this.isContentIdentical(filePath)) {
        const relativePath = path.relative(process.cwd(), filePath);
        this.duplicateFiles.push({
          path: filePath,
          relativePath,
          content: fs.readFileSync(filePath, "utf-8"),
        });
        duplicateCount++;

        if (duplicateCount <= 10) {
          console.log(`📄 找到占位文件: ${relativePath}`);
        } else if (duplicateCount === 11) {
          console.log(`   ... 还有更多文件 (总计会在最后显示)`);
        }
      }
    }

    console.log(`\n✅ 扫描完成! 找到 ${duplicateCount} 个占位测试文件\n`);
  }

  /**
   * 生成清理后的文件内容
   */
  private generateCleanedContent(filePath: string): string {
    const fileName = path.basename(filePath);
    const relativePath = path.relative(this.testDirectory, filePath);

    return `// ${fileName} - 测试占位代码\n// 路径: ${relativePath}\n\n// TODO: 实现具体的测试用例\n`;
  }

  /**
   * 清理重复文件
   */
  public cleanDuplicateFiles(dryRun: boolean = true): void {
    if (this.duplicateFiles.length === 0) {
      console.log("ℹ️  没有找到需要清理的重复文件");
      return;
    }

    console.log(`🧹 ${dryRun ? "预览" : "执行"}清理操作...\n`);

    for (const file of this.duplicateFiles) {
      const cleanedContent = this.generateCleanedContent(file.path);

      console.log(`📝 ${dryRun ? "[预览]" : "[执行]"} ${file.relativePath}`);

      if (dryRun) {
        console.log("   清理后内容:");
        console.log("   " + cleanedContent.split("\n").join("\n   "));
        console.log("");
      } else {
        try {
          fs.writeFileSync(file.path, cleanedContent, "utf-8");
          console.log("   ✅ 已清理");
        } catch (error) {
          console.log(`   ❌ 清理失败: ${error}`);
        }
      }
    }

    if (dryRun) {
      console.log(`\n💡 这是预览模式。要执行实际清理，请使用 --execute 参数`);
      console.log(`💡 总计会清理 ${this.duplicateFiles.length} 个文件`);
    } else {
      console.log(`\n✅ 清理完成! 处理了 ${this.duplicateFiles.length} 个文件`);
    }
  }

  /**
   * 生成报告
   */
  public generateReport(): void {
    console.log("📊 占位测试文件分析报告");
    console.log("=".repeat(50));
    console.log(`📂 扫描目录: ${this.testDirectory}`);
    if (this.targetFilePath) {
      console.log(
        `🎯 参考文件: ${path.relative(process.cwd(), this.targetFilePath)}`,
      );
    } else {
      console.log(`🎯 扫描模式: 通用占位文件检测`);
    }
    console.log(`📋 找到占位文件: ${this.duplicateFiles.length} 个\n`);

    if (this.duplicateFiles.length > 0) {
      console.log("📄 占位文件列表:");
      this.duplicateFiles.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.relativePath}`);
      });

      console.log("\n📝 样例清理后内容:");
      if (this.duplicateFiles.length > 0) {
        const sampleContent = this.generateCleanedContent(
          this.duplicateFiles[0].path,
        );
        console.log("   " + sampleContent.split("\n").join("\n   "));
      }
    }

    console.log("\n💡 使用说明:");
    console.log(
      "   - 预览清理: ts-node tools/test-duplicate-cleaner.ts --dry-run",
    );
    console.log(
      "   - 执行清理: ts-node tools/test-duplicate-cleaner.ts --execute",
    );
    console.log(
      "   - 查看报告: ts-node tools/test-duplicate-cleaner.ts --report",
    );
    console.log(
      "   - 通用模式: ts-node tools/test-duplicate-cleaner.ts --universal --execute",
    );
  }
}

// 主函数
function main() {
  const testDirectory =
    "/Users/honor/Documents/code/newstockapi/backend/test/jest";
  const defaultTargetFilePath =
    "/Users/honor/Documents/code/newstockapi/backend/test/jest/unit/providers/longport-sg/module/longport-sg.module.spec.ts";

  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isExecute = args.includes("--execute");
  const isReport = args.includes("--report");
  const isUniversal = args.includes("--universal");

  // 通用模式：不需要参考文件，扫描所有占位测试文件
  const targetFilePath = isUniversal ? undefined : defaultTargetFilePath;
  const cleaner = new TestDuplicateCleaner(testDirectory, targetFilePath);

  // 扫描占位文件
  cleaner.scanForDuplicates();

  if (isReport) {
    cleaner.generateReport();
  } else if (isExecute) {
    cleaner.cleanDuplicateFiles(false);
  } else {
    // 默认为预览模式
    cleaner.cleanDuplicateFiles(true);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

export { TestDuplicateCleaner };
