import * as fs from "fs";
import * as path from "path";

/**
 * 覆盖率质量门禁检查器
 * 自动检查覆盖率是否达到要求，用于CI/CD流水线
 */
export class CoverageGateChecker {
  private config: CoverageGateConfig;
  private violations: GateViolation[] = [];

  constructor(config?: Partial<CoverageGateConfig>) {
    this.config = {
      ...DEFAULT_GATE_CONFIG,
      ...config,
    };
  }

  /**
   * 执行质量门禁检查
   */
  async checkQualityGates(): Promise<GateCheckResult> {
    console.log("🚦 执行覆盖率质量门禁检查...");

    const coverageData = await this.loadCoverageData();
    if (!coverageData) {
      throw new Error("无法加载覆盖率数据");
    }

    // 检查全局阈值
    await this.checkGlobalThresholds(coverageData);

    // 检查模块特定阈值
    await this.checkModuleThresholds(coverageData);

    // 检查文件特定阈值
    await this.checkFileThresholds(coverageData);

    // 检查趋势要求
    await this.checkTrendRequirements(coverageData);

    // 检查增量覆盖率
    await this.checkDeltaCoverage(coverageData);

    const result: GateCheckResult = {
      passed: this.violations.length === 0,
      violations: this.violations,
      summary: this.generateSummary(coverageData),
      recommendations: this.generateRecommendations(),
      exitCode: this.violations.some((v) => v.severity === "blocking") ? 1 : 0,
    };

    await this.saveGateReport(result);
    this.printGateResult(result);

    return result;
  }

  /**
   * 加载覆盖率数据
   */
  private async loadCoverageData(): Promise<CoverageData | null> {
    const reportPaths = [
      "coverage/merged/coverage-final.json",
      "coverage/lcov-report/coverage-final.json",
      "coverage/coverage-final.json",
    ];

    for (const reportPath of reportPaths) {
      if (fs.existsSync(reportPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(reportPath, "utf8"));
          console.log(`✅ 加载覆盖率数据: ${reportPath}`);
          return {
            summary: this.extractSummary(data),
            files: data,
            timestamp: new Date().toISOString(),
          };
        } catch (error) {
          console.warn(`⚠️ 无法解析覆盖率数据: ${reportPath}`);
        }
      }
    }

    console.error("❌ 未找到有效的覆盖率数据");
    return null;
  }

  /**
   * 检查全局阈值
   */
  private async checkGlobalThresholds(data: CoverageData): Promise<void> {
    const { summary } = data;
    const { global } = this.config.thresholds;

    const checks = [
      { metric: "lines", actual: summary.lines.pct, required: global.lines },
      {
        metric: "statements",
        actual: summary.statements.pct,
        required: global.statements,
      },
      {
        metric: "functions",
        actual: summary.functions.pct,
        required: global.functions,
      },
      {
        metric: "branches",
        actual: summary.branches.pct,
        required: global.branches,
      },
    ];

    for (const check of checks) {
      if (check.actual < check.required) {
        this.violations.push({
          type: "global_threshold",
          severity: "blocking",
          metric: check.metric,
          actual: check.actual,
          required: check.required,
          message: `全局${check.metric}覆盖率 ${check.actual.toFixed(1)}% 低于要求的 ${check.required}%`,
          suggestion: `需要提升 ${(check.required - check.actual).toFixed(1)}% 的${check.metric}覆盖率`,
        });
      }
    }
  }

  /**
   * 检查模块特定阈值
   */
  private async checkModuleThresholds(data: CoverageData): Promise<void> {
    const moduleData = this.groupFilesByModule(data.files);

    for (const [modulePath, threshold] of Object.entries(
      this.config.thresholds.modules,
    )) {
      const moduleFiles = moduleData[modulePath];
      if (!moduleFiles || Object.keys(moduleFiles).length === 0) {
        this.violations.push({
          type: "module_missing",
          severity: "warning",
          message: `模块 ${modulePath} 没有找到覆盖率数据`,
          suggestion: "确保模块存在且有对应的测试",
        });
        continue;
      }

      const moduleSummary = this.calculateModuleSummary(moduleFiles);

      const checks = [
        {
          metric: "lines",
          actual: moduleSummary.lines.pct,
          required: threshold.lines,
        },
        {
          metric: "statements",
          actual: moduleSummary.statements.pct,
          required: threshold.statements,
        },
        {
          metric: "functions",
          actual: moduleSummary.functions.pct,
          required: threshold.functions,
        },
        {
          metric: "branches",
          actual: moduleSummary.branches.pct,
          required: threshold.branches,
        },
      ];

      for (const check of checks) {
        if (check.actual < check.required) {
          this.violations.push({
            type: "module_threshold",
            severity: this.getModuleSeverity(modulePath),
            metric: check.metric,
            module: modulePath,
            actual: check.actual,
            required: check.required,
            message: `模块 ${modulePath} 的${check.metric}覆盖率 ${check.actual.toFixed(1)}% 低于要求的 ${check.required}%`,
            suggestion: `重点关注模块 ${modulePath} 的测试覆盖`,
          });
        }
      }
    }
  }

  /**
   * 检查文件特定阈值
   */
  private async checkFileThresholds(data: CoverageData): Promise<void> {
    for (const [filePath, fileData] of Object.entries(data.files)) {
      // 跳过非关键文件
      if (this.shouldSkipFile(filePath)) {
        continue;
      }

      const threshold = this.getFileThreshold(filePath);
      if (!threshold) continue;

      const checks = [
        {
          metric: "lines",
          actual: fileData.lines?.pct || 0,
          required: threshold.lines,
        },
        {
          metric: "statements",
          actual: fileData.statements?.pct || 0,
          required: threshold.statements,
        },
        {
          metric: "functions",
          actual: fileData.functions?.pct || 0,
          required: threshold.functions,
        },
        {
          metric: "branches",
          actual: fileData.branches?.pct || 0,
          required: threshold.branches,
        },
      ];

      for (const check of checks) {
        if (check.actual < check.required) {
          this.violations.push({
            type: "file_threshold",
            severity: this.getFileSeverity(filePath),
            metric: check.metric,
            file: filePath,
            actual: check.actual,
            required: check.required,
            message: `文件 ${filePath} 的${check.metric}覆盖率 ${check.actual.toFixed(1)}% 低于要求的 ${check.required}%`,
            suggestion: `为文件 ${filePath} 增加${check.metric}测试`,
          });
        }
      }
    }
  }

  /**
   * 检查趋势要求
   */
  private async checkTrendRequirements(data: CoverageData): Promise<void> {
    const historicalData = await this.loadHistoricalData();
    if (!historicalData || historicalData.length < 2) {
      return; // 没有足够的历史数据
    }

    const previous = historicalData[historicalData.length - 2];
    const current = data.summary;

    const changes = {
      lines: current.lines.pct - previous.lines.pct,
      statements: current.statements.pct - previous.statements.pct,
      functions: current.functions.pct - previous.functions.pct,
      branches: current.branches.pct - previous.branches.pct,
    };

    // 检查是否有显著下降
    const { maxDecrease } = this.config.trends;
    for (const [metric, change] of Object.entries(changes)) {
      if (change < -maxDecrease) {
        this.violations.push({
          type: "trend_decline",
          severity: "blocking",
          metric,
          actual: change,
          required: -maxDecrease,
          message: `${metric}覆盖率下降 ${Math.abs(change).toFixed(1)}%，超过允许的最大下降 ${maxDecrease}%`,
          suggestion: "检查最近的代码更改，确保新代码有足够的测试覆盖",
        });
      }
    }
  }

  /**
   * 检查增量覆盖率
   */
  private async checkDeltaCoverage(data: CoverageData): Promise<void> {
    // 如果有git信息，检查新增代码的覆盖率
    const changedFiles = await this.getChangedFiles();
    if (changedFiles.length === 0) {
      return;
    }

    const { newCode } = this.config.delta;
    let insufficientCoverageCount = 0;

    for (const file of changedFiles) {
      const fileData = data.files[file];
      if (!fileData?.lines) {
        continue;
      }

      if (fileData.lines.pct < newCode.lines) {
        insufficientCoverageCount++;
        this.violations.push({
          type: "delta_coverage",
          severity: "warning",
          metric: "lines",
          file: file,
          actual: fileData.lines.pct,
          required: newCode.lines,
          message: `新增/修改文件 ${file} 的覆盖率 ${fileData.lines.pct.toFixed(1)}% 低于新代码要求的 ${newCode.lines}%`,
          suggestion: "为新增的代码编写足够的测试",
        });
      }
    }

    // 如果太多文件覆盖率不足，提升为阻塞性问题
    if (insufficientCoverageCount > changedFiles.length * 0.5) {
      this.violations.push({
        type: "delta_coverage_overall",
        severity: "blocking",
        message: `超过50%的变更文件覆盖率不足`,
        suggestion: "提升新代码的整体测试覆盖率",
      });
    }
  }

  /**
   * 提取覆盖率摘要
   */
  private extractSummary(data: any): CoverageSummary {
    // 处理不同格式的覆盖率报告
    if (data.total) {
      // Istanbul格式
      return {
        lines: data.total.lines,
        statements: data.total.statements,
        functions: data.total.functions,
        branches: data.total.branches,
      };
    } else if (data.summary) {
      // 自定义格式
      return data.summary;
    } else {
      // 计算总和
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

      // 计算百分比
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
  }

  /**
   * 按模块分组文件
   */
  private groupFilesByModule(files: any): { [module: string]: any } {
    const modules: { [module: string]: any } = {};

    for (const [filePath, fileData] of Object.entries(files)) {
      let modulePath = "unknown";

      // 提取模块路径
      if (filePath.startsWith("src/")) {
        const parts = filePath.split("/");
        if (parts.length >= 2) {
          modulePath = `src/${parts[1]}`;
        }
      }

      if (!modules[modulePath]) {
        modules[modulePath] = {};
      }
      modules[modulePath][filePath] = fileData;
    }

    return modules;
  }

  /**
   * 计算模块覆盖率摘要
   */
  private calculateModuleSummary(files: any): CoverageSummary {
    const totals = {
      lines: { total: 0, covered: 0, pct: 0 },
      statements: { total: 0, covered: 0, pct: 0 },
      functions: { total: 0, covered: 0, pct: 0 },
      branches: { total: 0, covered: 0, pct: 0 },
    };

    for (const fileData of Object.values(files) as any[]) {
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

  // 其他辅助方法
  private getModuleSeverity(modulePath: string): "blocking" | "warning" {
    const criticalModules = ["src/core", "src/auth"];
    return criticalModules.includes(modulePath) ? "blocking" : "warning";
  }

  private getFileSeverity(filePath: string): "blocking" | "warning" {
    if (filePath.includes("controller") || filePath.includes("service")) {
      return "blocking";
    }
    return "warning";
  }

  private shouldSkipFile(filePath: string): boolean {
    const skipPatterns = [".d.ts", ".interface.ts", ".enum.ts", ".constant.ts"];
    return skipPatterns.some((pattern) => filePath.includes(pattern));
  }

  private getFileThreshold(filePath: string): any {
    // 根据文件类型返回不同的阈值
    if (filePath.includes("controller")) {
      return this.config.thresholds.fileTypes.controllers;
    }
    if (filePath.includes("service")) {
      return this.config.thresholds.fileTypes.services;
    }
    return null;
  }

  private async loadHistoricalData(): Promise<any[]> {
    // 从文件或数据库加载历史覆盖率数据
    try {
      const historyPath = "coverage/history/coverage-history.json";
      if (fs.existsSync(historyPath)) {
        return JSON.parse(fs.readFileSync(historyPath, "utf8"));
      }
    } catch (error) {
      console.warn("无法加载历史覆盖率数据");
    }
    return [];
  }

  private async getChangedFiles(): Promise<string[]> {
    // 获取git变更的文件列表
    // 这里可以集成git命令或使用CI环境变量
    return [];
  }

  private generateSummary(data: CoverageData): string {
    const { summary } = data;
    return `总体覆盖率: Lines ${summary.lines.pct.toFixed(1)}%, Statements ${summary.statements.pct.toFixed(1)}%, Functions ${summary.functions.pct.toFixed(1)}%, Branches ${summary.branches.pct.toFixed(1)}%`;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    const blockingViolations = this.violations.filter(
      (v) => v.severity === "blocking",
    );
    if (blockingViolations.length > 0) {
      recommendations.push("优先解决阻塞性覆盖率问题");

      const moduleIssues = blockingViolations.filter(
        (v) => v.type === "module_threshold",
      );
      if (moduleIssues.length > 0) {
        recommendations.push("重点关注核心模块的测试覆盖率");
      }
    }

    const trendIssues = this.violations.filter(
      (v) => v.type === "trend_decline",
    );
    if (trendIssues.length > 0) {
      recommendations.push("检查最近的代码变更，确保新功能有足够的测试");
    }

    return recommendations;
  }

  private async saveGateReport(result: GateCheckResult): Promise<void> {
    const reportPath = "test-results/coverage-gate-report.json";
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
    console.log(`📄 质量门禁报告已保存: ${reportPath}`);
  }

  private printGateResult(result: GateCheckResult): void {
    console.log("\n🚦 覆盖率质量门禁结果");
    console.log("=".repeat(50));

    if (result.passed) {
      console.log("✅ 所有质量门禁检查通过");
    } else {
      console.log("❌ 质量门禁检查失败");
      console.log(`\n发现 ${result.violations.length} 个违规项:`);

      result.violations.forEach((violation, index) => {
        const icon = violation.severity === "blocking" ? "🚫" : "⚠️";
        console.log(
          `\n${index + 1}. ${icon} [${violation.severity.toUpperCase()}] ${violation.message}`,
        );
        if (violation.suggestion) {
          console.log(`   💡 建议: ${violation.suggestion}`);
        }
      });
    }

    console.log(`\n📊 ${result.summary}`);

    if (result.recommendations.length > 0) {
      console.log("\n💡 改进建议:");
      result.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
  }
}

// 默认配置
const DEFAULT_GATE_CONFIG: CoverageGateConfig = {
  thresholds: {
    global: {
      lines: 80,
      statements: 80,
      functions: 85,
      branches: 75,
    },
    modules: {
      "src/core": { lines: 90, statements: 90, functions: 95, branches: 85 },
      "src/auth": { lines: 90, statements: 90, functions: 95, branches: 85 },
      "src/common": { lines: 80, statements: 80, functions: 85, branches: 75 },
    },
    fileTypes: {
      controllers: { lines: 85, statements: 85, functions: 90, branches: 80 },
      services: { lines: 90, statements: 90, functions: 95, branches: 85 },
    },
  },
  trends: {
    maxDecrease: 2, // 最大允许下降2%
  },
  delta: {
    newCode: { lines: 85, statements: 85, functions: 90, branches: 80 },
  },
};

// 类型定义
export interface FileCoverageDetail {
  lines?: { total: number; covered: number; pct: number };
  statements?: { total: number; covered: number; pct: number };
  functions?: { total: number; covered: number; pct: number };
  branches?: { total: number; covered: number; pct: number };
  [key: string]: any;
}

export interface CoverageGateConfig {
  thresholds: {
    global: CoverageThreshold;
    modules: { [path: string]: CoverageThreshold };
    fileTypes: { [type: string]: CoverageThreshold };
  };
  trends: {
    maxDecrease: number;
  };
  delta: {
    newCode: CoverageThreshold;
  };
}

export interface CoverageThreshold {
  lines: number;
  statements: number;
  functions: number;
  branches: number;
}

export interface CoverageData {
  summary: CoverageSummary;
  files: { [key: string]: FileCoverageDetail };
  timestamp: string;
}

export interface CoverageSummary {
  lines: { total: number; covered: number; pct: number };
  statements: { total: number; covered: number; pct: number };
  functions: { total: number; covered: number; pct: number };
  branches: { total: number; covered: number; pct: number };
}

export interface GateViolation {
  type: string;
  severity: "blocking" | "warning";
  metric?: string;
  module?: string;
  file?: string;
  actual?: number;
  required?: number;
  message: string;
  suggestion?: string;
}

export interface GateCheckResult {
  passed: boolean;
  violations: GateViolation[];
  summary: string;
  recommendations: string[];
  exitCode: number;
}

// 命令行工具
export async function runCoverageGateCheck(): Promise<void> {
  const checker = new CoverageGateChecker();
  const result = await checker.checkQualityGates();

  if (!result.passed) {
    process.exit(result.exitCode);
  }
}
