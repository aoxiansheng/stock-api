import * as fs from "fs";
import * as path from "path";
import * as nyc from "nyc";

/**
 * 覆盖率合并工具
 * 将不同测试类型的覆盖率报告合并成统一的报告
 */
export class CoverageMerger {
  private coverageData: Map<string, any> = new Map();
  private config: CoverageMergerConfig;

  constructor(config?: Partial<CoverageMergerConfig>) {
    this.config = {
      ...DEFAULT_MERGER_CONFIG,
      ...config,
    };
  }

  /**
   * 执行覆盖率合并
   */
  async mergeCoverage(): Promise<MergeResult> {
    console.log("🔗 开始合并覆盖率报告...");

    // 1. 加载所有覆盖率报告
    await this.loadCoverageReports();

    // 2. 验证数据完整性
    this.validateCoverageData();

    // 3. 合并覆盖率数据
    const mergedData = await this.performMerge();

    // 4. 生成合并后的报告
    await this.generateMergedReports(mergedData);

    // 5. 生成对比报告
    const comparisonReport = await this.generateComparisonReport();

    const result: MergeResult = {
      success: true,
      mergedFiles: Object.keys(mergedData.files).length,
      testTypes: Array.from(this.coverageData.keys()),
      outputPaths: {
        json: this.config.output.json,
        html: this.config.output.html,
        lcov: this.config.output.lcov,
      },
      summary: this.calculateMergedSummary(mergedData),
      comparison: comparisonReport,
    };

    console.log("✅ 覆盖率合并完成");
    return result;
  }

  /**
   * 加载覆盖率报告
   */
  private async loadCoverageReports(): Promise<void> {
    const reportSources = [
      { type: "unit", path: "coverage/unit/coverage-final.json" },
      { type: "integration", path: "coverage/integration/coverage-final.json" },
      { type: "e2e", path: "coverage/e2e/coverage-final.json" },
    ];

    for (const source of reportSources) {
      if (fs.existsSync(source.path)) {
        try {
          const data = JSON.parse(fs.readFileSync(source.path, "utf8"));
          this.coverageData.set(source.type, data);
          console.log(`✅ 加载 ${source.type} 覆盖率: ${source.path}`);
        } catch (error) {
          console.warn(`⚠️ 无法加载 ${source.type} 覆盖率: ${error.message}`);
        }
      } else {
        console.warn(`⚠️ 未找到 ${source.type} 覆盖率文件: ${source.path}`);
      }
    }

    if (this.coverageData.size === 0) {
      throw new Error("没有找到任何有效的覆盖率报告");
    }
  }

  /**
   * 验证覆盖率数据
   */
  private validateCoverageData(): void {
    console.log("🔍 验证覆盖率数据完整性...");

    for (const [testType, data] of this.coverageData.entries()) {
      // 检查数据结构
      if (!data || typeof data !== "object") {
        throw new Error(`${testType} 覆盖率数据格式无效`);
      }

      // 检查必要的字段
      const fileCount = Object.keys(data).length;
      if (fileCount === 0) {
        console.warn(`⚠️ ${testType} 覆盖率报告为空`);
      } else {
        console.log(`✅ ${testType} 覆盖率包含 ${fileCount} 个文件`);
      }
    }
  }

  /**
   * 执行覆盖率合并
   */
  private async performMerge(): Promise<MergedCoverageData> {
    console.log("🔀 执行覆盖率数据合并...");

    const mergedData: MergedCoverageData = {
      files: {},
      timestamp: new Date().toISOString(),
      sources: Array.from(this.coverageData.keys()),
      mergeStrategy: this.config.mergeStrategy,
    };

    // 收集所有文件
    const allFiles = new Set<string>();
    for (const data of this.coverageData.values()) {
      Object.keys(data).forEach((file) => allFiles.add(file));
    }

    // 合并每个文件的覆盖率
    for (const filePath of allFiles) {
      const fileCoverageData: FileCoverageData[] = [];

      // 收集该文件在各个测试类型中的覆盖率
      for (const [testType, data] of this.coverageData.entries()) {
        if (data[filePath]) {
          fileCoverageData.push({
            testType,
            coverage: data[filePath],
          });
        }
      }

      // 合并文件覆盖率
      mergedData.files[filePath] = this.mergeFileCoverage(fileCoverageData);
    }

    return mergedData;
  }

  /**
   * 合并单个文件的覆盖率
   */
  private mergeFileCoverage(fileCoverageData: FileCoverageData[]): any {
    if (fileCoverageData.length === 0) {
      return null;
    }

    if (fileCoverageData.length === 1) {
      return {
        ...fileCoverageData[0].coverage,
        testTypes: [fileCoverageData[0].testType],
      };
    }

    // 根据策略合并
    switch (this.config.mergeStrategy) {
      case "union":
        return this.mergeUnion(fileCoverageData);
      case "intersection":
        return this.mergeIntersection(fileCoverageData);
      case "maximum":
        return this.mergeMaximum(fileCoverageData);
      default:
        return this.mergeUnion(fileCoverageData);
    }
  }

  /**
   * 联合合并策略 - 取所有测试的覆盖率并集
   */
  private mergeUnion(fileCoverageData: FileCoverageData[]): any {
    const result = {
      ...fileCoverageData[0].coverage,
      testTypes: fileCoverageData.map((f) => f.testType),
    };

    // 合并行覆盖率
    const allCoveredLines = new Set<number>();
    const allExecutableLines = new Set<number>();

    for (const { coverage } of fileCoverageData) {
      // 处理行覆盖率数组
      if (coverage.s) {
        // 语句覆盖率
        Object.keys(coverage.s).forEach((key) => {
          if (coverage.s[key] > 0) {
            allCoveredLines.add(parseInt(key));
          }
          allExecutableLines.add(parseInt(key));
        });
      }

      // 处理分支覆盖率
      if (coverage.b) {
        // 合并分支覆盖率
      }

      // 处理函数覆盖率
      if (coverage.f) {
        // 合并函数覆盖率
      }
    }

    // 重新计算合并后的指标
    result.lines = {
      total: allExecutableLines.size,
      covered: allCoveredLines.size,
      pct:
        allExecutableLines.size > 0
          ? (allCoveredLines.size / allExecutableLines.size) * 100
          : 0,
    };

    return result;
  }

  /**
   * 交集合并策略 - 只计算所有测试都覆盖的部分
   */
  private mergeIntersection(fileCoverageData: FileCoverageData[]): any {
    // 实现交集合并逻辑
    return this.mergeUnion(fileCoverageData); // 简化实现
  }

  /**
   * 最大值合并策略 - 取各项指标的最大值
   */
  private mergeMaximum(fileCoverageData: FileCoverageData[]): any {
    const result = {
      ...fileCoverageData[0].coverage,
      testTypes: fileCoverageData.map((f) => f.testType),
    };

    // 取每项指标的最大值
    const metrics = ["lines", "statements", "functions", "branches"];

    for (const metric of metrics) {
      let maxTotal = 0;
      let maxCovered = 0;
      let maxPct = 0;

      for (const { coverage } of fileCoverageData) {
        if (coverage[metric]) {
          maxTotal = Math.max(maxTotal, coverage[metric].total || 0);
          maxCovered = Math.max(maxCovered, coverage[metric].covered || 0);
          maxPct = Math.max(maxPct, coverage[metric].pct || 0);
        }
      }

      result[metric] = {
        total: maxTotal,
        covered: maxCovered,
        pct: maxPct,
      };
    }

    return result;
  }

  /**
   * 生成合并后的报告
   */
  private async generateMergedReports(
    mergedData: MergedCoverageData,
  ): Promise<void> {
    console.log("📄 生成合并后的覆盖率报告...");

    // 确保输出目录存在
    this.ensureDirectoryExists(path.dirname(this.config.output.json));

    // 生成JSON报告
    fs.writeFileSync(
      this.config.output.json,
      JSON.stringify(mergedData.files, null, 2),
    );
    console.log(`✅ JSON报告: ${this.config.output.json}`);

    // 生成LCOV报告
    await this.generateLcovReport(mergedData);

    // 生成HTML报告
    await this.generateHtmlReport(mergedData);
  }

  /**
   * 生成LCOV报告
   */
  private async generateLcovReport(
    mergedData: MergedCoverageData,
  ): Promise<void> {
    try {
      // 使用nyc生成LCOV报告
      const nycInstance = new nyc({
        cwd: process.cwd(),
        reportDir: path.dirname(this.config.output.lcov),
        reporter: ["lcov"],
      });

      // 这里需要将合并后的数据转换为nyc可以处理的格式
      // 简化实现：直接写入基本的LCOV格式
      const lcovContent = this.generateLcovContent(mergedData);
      fs.writeFileSync(this.config.output.lcov, lcovContent);
      console.log(`✅ LCOV报告: ${this.config.output.lcov}`);
    } catch (error) {
      console.warn(`⚠️ 生成LCOV报告失败: ${error.message}`);
    }
  }

  /**
   * 生成HTML报告
   */
  private async generateHtmlReport(
    mergedData: MergedCoverageData,
  ): Promise<void> {
    try {
      // 生成简单的HTML报告
      const htmlContent = this.generateHtmlContent(mergedData);
      fs.writeFileSync(this.config.output.html, htmlContent);
      console.log(`✅ HTML报告: ${this.config.output.html}`);
    } catch (error) {
      console.warn(`⚠️ 生成HTML报告失败: ${error.message}`);
    }
  }

  /**
   * 生成对比报告
   */
  private async generateComparisonReport(): Promise<ComparisonReport> {
    const comparison: ComparisonReport = {
      testTypes: {},
      differences: [],
      recommendations: [],
    };

    // 比较各测试类型的覆盖率
    for (const [testType, data] of this.coverageData.entries()) {
      const summary = this.calculateSummary(data);
      comparison.testTypes[testType] = summary;
    }

    // 识别差异
    comparison.differences = this.identifyDifferences();

    // 生成建议
    comparison.recommendations = this.generateMergeRecommendations(comparison);

    return comparison;
  }

  /**
   * 计算覆盖率摘要
   */
  private calculateSummary(data: any): any {
    const totals = {
      lines: { total: 0, covered: 0, pct: 0 },
      statements: { total: 0, covered: 0, pct: 0 },
      functions: { total: 0, covered: 0, pct: 0 },
      branches: { total: 0, covered: 0, pct: 0 },
    };

    for (const fileData of Object.values(data) as any[]) {
      if (fileData.lines) {
        totals.lines.total += fileData.lines.total;
        totals.lines.covered += fileData.lines.covered;
        totals.statements.total += fileData.statements.total;
        totals.statements.covered += fileData.statements.covered;
        totals.functions.total += fileData.functions.total;
        totals.functions.covered += fileData.functions.covered;
        totals.branches.total += fileData.branches.total;
        totals.branches.covered += fileData.branches.covered;
      }
    }

    totals.lines.pct =
      totals.lines.total > 0
        ? (totals.lines.covered / totals.lines.total) * 100
        : 0;
    totals.statements.pct =
      totals.statements.total > 0
        ? (totals.statements.covered / totals.statements.total) * 100
        : 0;
    totals.functions.pct =
      totals.functions.total > 0
        ? (totals.functions.covered / totals.functions.total) * 100
        : 0;
    totals.branches.pct =
      totals.branches.total > 0
        ? (totals.branches.covered / totals.branches.total) * 100
        : 0;

    return totals;
  }

  private calculateMergedSummary(mergedData: MergedCoverageData): any {
    return this.calculateSummary(mergedData.files);
  }

  private identifyDifferences(): any[] {
    // 识别各测试类型之间的差异
    return [];
  }

  private generateMergeRecommendations(comparison: ComparisonReport): string[] {
    const recommendations: string[] = [];

    // 基于对比结果生成建议
    const testTypes = Object.keys(comparison.testTypes);
    if (testTypes.length > 1) {
      recommendations.push("建议定期检查不同测试类型的覆盖率一致性");
    }

    return recommendations;
  }

  private generateLcovContent(mergedData: MergedCoverageData): string {
    // 生成基本的LCOV格式内容
    let content = "";

    for (const [filePath, fileData] of Object.entries(mergedData.files)) {
      content += `SF:${filePath}\n`;

      if (fileData.lines) {
        content += `LF:${fileData.lines.total}\n`;
        content += `LH:${fileData.lines.covered}\n`;
      }

      content += "end_of_record\n";
    }

    return content;
  }

  private generateHtmlContent(mergedData: MergedCoverageData): string {
    const summary = this.calculateMergedSummary(mergedData);

    return `
<!DOCTYPE html>
<html>
<head>
    <title>合并覆盖率报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: white; border-radius: 3px; }
    </style>
</head>
<body>
    <h1>合并覆盖率报告</h1>
    <div class="summary">
        <h2>总体覆盖率</h2>
        <div class="metric">
            <strong>Lines:</strong> ${summary.lines.pct.toFixed(1)}% (${summary.lines.covered}/${summary.lines.total})
        </div>
        <div class="metric">
            <strong>Statements:</strong> ${summary.statements.pct.toFixed(1)}% (${summary.statements.covered}/${summary.statements.total})
        </div>
        <div class="metric">
            <strong>Functions:</strong> ${summary.functions.pct.toFixed(1)}% (${summary.functions.covered}/${summary.functions.total})
        </div>
        <div class="metric">
            <strong>Branches:</strong> ${summary.branches.pct.toFixed(1)}% (${summary.branches.covered}/${summary.branches.total})
        </div>
    </div>
    <p>生成时间: ${mergedData.timestamp}</p>
    <p>合并来源: ${mergedData.sources.join(", ")}</p>
</body>
</html>`;
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}

// 默认配置
const DEFAULT_MERGER_CONFIG: CoverageMergerConfig = {
  mergeStrategy: "union",
  output: {
    json: "coverage/merged/coverage-final.json",
    html: "coverage/merged/index.html",
    lcov: "coverage/merged/lcov.info",
  },
  includeComparison: true,
};

// 类型定义
export interface CoverageMergerConfig {
  mergeStrategy: "union" | "intersection" | "maximum";
  output: {
    json: string;
    html: string;
    lcov: string;
  };
  includeComparison: boolean;
}

export interface FileCoverageData {
  testType: string;
  coverage: any;
}

export interface MergedCoverageData {
  files: { [path: string]: any };
  timestamp: string;
  sources: string[];
  mergeStrategy: string;
}

export interface MergeResult {
  success: boolean;
  mergedFiles: number;
  testTypes: string[];
  outputPaths: {
    json: string;
    html: string;
    lcov: string;
  };
  summary: any;
  comparison: ComparisonReport;
}

export interface ComparisonReport {
  testTypes: { [testType: string]: any };
  differences: any[];
  recommendations: string[];
}

// 命令行工具
export async function runCoverageMerge(): Promise<void> {
  const merger = new CoverageMerger();
  const result = await merger.mergeCoverage();

  console.log("\n📊 合并结果:");
  console.log(`✅ 成功合并 ${result.mergedFiles} 个文件`);
  console.log(`📁 输出路径: ${Object.values(result.outputPaths).join(", ")}`);

  if (result.comparison.recommendations.length > 0) {
    console.log("\n💡 建议:");
    result.comparison.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  }
}
