import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";

/**
 * 覆盖率分析器
 * 分析、合并和报告测试覆盖率
 */
export class CoverageAnalyzer {
  private coverageData: Map<string, CoverageReport> = new Map();
  private historicalData: CoverageHistory[] = [];

  constructor(private _config: CoverageAnalyzerConfig = {}) {
    // 设置默认配置
    this._config = {
      outputDir: "coverage/analysis",
      historyFile: "coverage-history.json",
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 70,
      },
      ...this._config,
    };
  }

  /**
   * 运行完整的覆盖率分析
   */
  async runFullAnalysis(): Promise<CoverageAnalysisReport> {
    console.log("📊 开始覆盖率分析...");

    await this.loadCoverageReports();
    const mergedReport = await this.mergeCoverageReports();
    const qualityAnalysis = await this.analyzeCoverageQuality(mergedReport);
    const trendAnalysis = await this.analyzeCoverageTrends();
    const gapAnalysis = await this.analyzeUncoveredCode();

    const report: CoverageAnalysisReport = {
      summary: this.generateSummary(mergedReport),
      qualityAnalysis,
      trendAnalysis,
      gapAnalysis,
      recommendations: this.generateRecommendations(
        qualityAnalysis,
        gapAnalysis,
      ),
      details: mergedReport,
    };

    await this.saveReport(report);
    await this.updateHistory(mergedReport);

    return report;
  }

  /**
   * 加载所有覆盖率报告
   */
  private async loadCoverageReports(): Promise<void> {
    const reportPaths = [
      "coverage/unit/coverage-final.json",
      "coverage/integration/coverage-final.json",
      "coverage/e2e/coverage-final.json",
    ];

    for (const reportPath of reportPaths) {
      if (fs.existsSync(reportPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(reportPath, "utf8"));
          const testType = this.extractTestType(reportPath);
          this.coverageData.set(testType, data);
          console.log(`✅ 加载 ${testType} 覆盖率报告`);
        } catch (error) {
          console.warn(`⚠️ 无法加载覆盖率报告: ${reportPath}`, error);
        }
      }
    }
  }

  /**
   * 合并覆盖率报告
   */
  private async mergeCoverageReports(): Promise<CoverageReport> {
    console.log("🔄 合并覆盖率报告...");

    const mergedReport: CoverageReport = {
      timestamp: new Date().toISOString(),
      files: {},
      summary: {
        lines: { total: 0, covered: 0, pct: 0 },
        statements: { total: 0, covered: 0, pct: 0 },
        functions: { total: 0, covered: 0, pct: 0 },
        branches: { total: 0, covered: 0, pct: 0 },
      },
    };

    // 合并文件级别的覆盖率
    for (const [testType, report] of this.coverageData.entries()) {
      for (const [filePath, fileData] of Object.entries(report.files || {})) {
        if (!mergedReport.files[filePath]) {
          mergedReport.files[filePath] = {
            ...fileData,
            testTypes: [testType],
          };
        } else {
          // 合并覆盖率数据
          mergedReport.files[filePath] = this.mergeFileCoverage(
            mergedReport.files[filePath],
            fileData,
            testType,
          );
        }
      }
    }

    // 计算总体覆盖率
    mergedReport.summary = this.calculateOverallCoverage(mergedReport.files);

    return mergedReport;
  }

  /**
   * 分析覆盖率质量
   */
  private async analyzeCoverageQuality(
    report: CoverageReport,
  ): Promise<QualityAnalysis> {
    console.log("🔍 分析覆盖率质量...");

    const analysis: QualityAnalysis = {
      overallGrade: "unknown",
      moduleGrades: {},
      criticalIssues: [],
      recommendations: [],
      qualityScore: 0,
    };

    // 计算总体评级
    analysis.overallGrade = this.calculateGrade(report.summary);
    analysis.qualityScore = this.calculateQualityScore(report.summary);

    // 按模块分析
    const moduleGroups = this.groupFilesByModule(report.files);
    for (const [module, files] of Object.entries(moduleGroups)) {
      const moduleSummary = this.calculateModuleCoverage(files);
      analysis.moduleGrades[module] = {
        grade: this.calculateGrade(moduleSummary),
        coverage: moduleSummary,
        fileCount: Object.keys(files).length,
      };
    }

    // 识别关键问题
    analysis.criticalIssues = this.identifyCriticalIssues(
      report,
      analysis.moduleGrades,
    );

    return analysis;
  }

  /**
   * 分析覆盖率趋势
   */
  private async analyzeCoverageTrends(): Promise<TrendAnalysis> {
    console.log("📈 分析覆盖率趋势...");

    await this.loadHistoricalData();

    const trends: TrendAnalysis = {
      direction: "stable",
      changePercent: 0,
      trendData: this.historicalData,
      alerts: [],
    };

    if (this.historicalData.length >= 2) {
      const latest = this.historicalData[this.historicalData.length - 1];
      const previous = this.historicalData[this.historicalData.length - 2];

      trends.changePercent =
        latest.summary.lines.pct - previous.summary.lines.pct;

      if (trends.changePercent > 2) {
        trends.direction = "improving";
      } else if (trends.changePercent < -2) {
        trends.direction = "declining";
        trends.alerts.push({
          type: "decline",
          severity: "warning",
          message: `覆盖率下降 ${Math.abs(trends.changePercent).toFixed(1)}%`,
        });
      }

      // 检查长期趋势
      if (this.historicalData.length >= 5) {
        const longTermTrend = this.calculateLongTermTrend();
        if (longTermTrend < -5) {
          trends.alerts.push({
            type: "long_term_decline",
            severity: "error",
            message: "长期覆盖率下降趋势",
          });
        }
      }
    }

    return trends;
  }

  /**
   * 分析未覆盖代码
   */
  private async analyzeUncoveredCode(): Promise<GapAnalysis> {
    console.log("🔍 分析未覆盖代码...");

    const analysis: GapAnalysis = {
      uncoveredFiles: [],
      criticalUncovered: [],
      easilyTestable: [],
      suggestions: [],
    };

    const sourceFiles = await this.findAllSourceFiles();
    const coverageData = Array.from(this.coverageData.values())[0]; // 使用第一个报告

    for (const file of sourceFiles) {
      const relativePath = path.relative(process.cwd(), file);
      const fileData = coverageData?.files?.[relativePath];

      if (!fileData) {
        // 完全未覆盖的文件
        analysis.uncoveredFiles.push({
          path: relativePath,
          reason: "no_tests",
          priority: this.calculateFilePriority(relativePath),
        });
      } else if (fileData.lines.pct < 50) {
        // 覆盖率极低的文件
        analysis.criticalUncovered.push({
          path: relativePath,
          coverage: fileData.lines.pct,
          uncoveredLines: fileData.lines.total - fileData.lines.covered,
          priority: this.calculateFilePriority(relativePath),
        });
      } else if (
        fileData.lines.pct < 80 &&
        this.isEasilyTestable(relativePath)
      ) {
        // 容易测试但覆盖率不足的文件
        analysis.easilyTestable.push({
          path: relativePath,
          coverage: fileData.lines.pct,
          testComplexity: "low",
          estimatedEffort: "small",
        });
      }
    }

    // 生成改进建议
    analysis.suggestions = this.generateCoverageImprovement(analysis);

    return analysis;
  }

  /**
   * 合并文件覆盖率数据
   */
  private mergeFileCoverage(
    existing: any,
    newData: any,
    testType: string,
  ): any {
    // 使用联合覆盖率（取最大值）
    return {
      ...existing,
      testTypes: [...(existing.testTypes || []), testType],
      lines: {
        total: Math.max(existing.lines.total, newData.lines.total),
        covered: Math.max(existing.lines.covered, newData.lines.covered),
        pct: Math.max(existing.lines.pct, newData.lines.pct),
      },
      statements: {
        total: Math.max(existing.statements.total, newData.statements.total),
        covered: Math.max(
          existing.statements.covered,
          newData.statements.covered,
        ),
        pct: Math.max(existing.statements.pct, newData.statements.pct),
      },
      functions: {
        total: Math.max(existing.functions.total, newData.functions.total),
        covered: Math.max(
          existing.functions.covered,
          newData.functions.covered,
        ),
        pct: Math.max(existing.functions.pct, newData.functions.pct),
      },
      branches: {
        total: Math.max(existing.branches.total, newData.branches.total),
        covered: Math.max(existing.branches.covered, newData.branches.covered),
        pct: Math.max(existing.branches.pct, newData.branches.pct),
      },
    };
  }

  /**
   * 计算总体覆盖率
   */
  private calculateOverallCoverage(files: any): CoverageSummary {
    const totals = {
      lines: { total: 0, covered: 0, pct: 0 },
      statements: { total: 0, covered: 0, pct: 0 },
      functions: { total: 0, covered: 0, pct: 0 },
      branches: { total: 0, covered: 0, pct: 0 },
    };

    for (const fileData of Object.values(files) as any[]) {
      totals.lines.total += fileData.lines.total;
      totals.lines.covered += fileData.lines.covered;
      totals.statements.total += fileData.statements.total;
      totals.statements.covered += fileData.statements.covered;
      totals.functions.total += fileData.functions.total;
      totals.functions.covered += fileData.functions.covered;
      totals.branches.total += fileData.branches.total;
      totals.branches.covered += fileData.branches.covered;
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

  /**
   * 计算质量评级
   */
  private calculateGrade(summary: CoverageSummary): QualityGrade {
    const avgCoverage =
      (summary.lines.pct +
        summary.statements.pct +
        summary.functions.pct +
        summary.branches.pct) /
      4;

    if (avgCoverage >= 90) return "A";
    if (avgCoverage >= 80) return "B";
    if (avgCoverage >= 70) return "C";
    if (avgCoverage >= 60) return "D";
    return "F";
  }

  /**
   * 计算质量分数
   */
  private calculateQualityScore(summary: CoverageSummary): number {
    // 加权平均分数
    const weights = {
      lines: 0.3,
      statements: 0.3,
      functions: 0.2,
      branches: 0.2,
    };
    return (
      summary.lines.pct * weights.lines +
      summary.statements.pct * weights.statements +
      summary.functions.pct * weights.functions +
      summary.branches.pct * weights.branches
    );
  }

  /**
   * 按模块分组文件
   */
  private groupFilesByModule(files: any): { [module: string]: any } {
    const modules: { [module: string]: any } = {};

    for (const [filePath, fileData] of Object.entries(files)) {
      const module = this.extractModuleName(filePath);
      if (!modules[module]) {
        modules[module] = {};
      }
      modules[module][filePath] = fileData;
    }

    return modules;
  }

  /**
   * 提取模块名称
   */
  private extractModuleName(filePath: string): string {
    const parts = filePath.split("/");
    if (parts.includes("src")) {
      const srcIndex = parts.indexOf("src");
      return parts[srcIndex + 1] || "root";
    }
    return "unknown";
  }

  /**
   * 提取测试类型
   */
  private extractTestType(reportPath: string): string {
    if (reportPath.includes("unit")) return "unit";
    if (reportPath.includes("integration")) return "integration";
    if (reportPath.includes("e2e")) return "e2e";
    return "unknown";
  }

  /**
   * 查找所有源文件
   */
  private async findAllSourceFiles(): Promise<string[]> {
    return glob("src/**/*.ts", {
      ignore: [
        "src/**/*.spec.ts",
        "src/**/*.test.ts",
        "src/**/*.d.ts",
        "src/**/*.interface.ts",
        "src/**/*.enum.ts",
      ],
    });
  }

  /**
   * 计算文件优先级
   */
  private calculateFilePriority(filePath: string): "high" | "medium" | "low" {
    if (filePath.includes("core/") || filePath.includes("auth/")) return "high";
    if (filePath.includes("common/") || filePath.includes("controllers/"))
      return "medium";
    return "low";
  }

  /**
   * 判断文件是否容易测试
   */
  private isEasilyTestable(filePath: string): boolean {
    return (
      filePath.includes("service") ||
      filePath.includes("util") ||
      filePath.includes("helper")
    );
  }

  /**
   * 识别关键问题
   */
  private identifyCriticalIssues(
    report: CoverageReport,
    moduleGrades: any,
  ): CriticalIssue[] {
    const issues: CriticalIssue[] = [];

    // 检查总体覆盖率
    if (report.summary.lines.pct < 70) {
      issues.push({
        type: "low_overall_coverage",
        severity: "high",
        description: `总体覆盖率过低: ${report.summary.lines.pct.toFixed(1)}%`,
        suggestion: "增加单元测试和集成测试",
      });
    }

    // 检查核心模块
    if (moduleGrades.core && moduleGrades.core.grade === "F") {
      issues.push({
        type: "critical_module_uncovered",
        severity: "critical",
        description: "核心模块覆盖率极低",
        suggestion: "优先为核心业务逻辑编写测试",
      });
    }

    return issues;
  }

  /**
   * 生成改进建议
   */
  private generateCoverageImprovement(analysis: GapAnalysis): string[] {
    const suggestions: string[] = [];

    if (analysis.uncoveredFiles.length > 0) {
      suggestions.push(
        `发现 ${analysis.uncoveredFiles.length} 个未覆盖文件，建议优先为高优先级文件编写测试`,
      );
    }

    if (analysis.criticalUncovered.length > 0) {
      suggestions.push(
        `${analysis.criticalUncovered.length} 个文件覆盖率极低，需要补充测试用例`,
      );
    }

    if (analysis.easilyTestable.length > 0) {
      suggestions.push(
        `${analysis.easilyTestable.length} 个文件容易测试但覆盖率不足，可以快速提升覆盖率`,
      );
    }

    return suggestions;
  }

  // 其他辅助方法...
  private generateSummary(_report: CoverageReport): any {
    return {};
  }
  private generateRecommendations(
    _quality: QualityAnalysis,
    _gaps: GapAnalysis,
  ): string[] {
    return [];
  }
  private saveReport(_report: CoverageAnalysisReport): Promise<void> {
    return Promise.resolve();
  }
  private updateHistory(_report: CoverageReport): Promise<void> {
    return Promise.resolve();
  }
  private loadHistoricalData(): Promise<void> {
    return Promise.resolve();
  }
  private calculateLongTermTrend(): number {
    return 0;
  }
  private calculateModuleCoverage(_files: any): CoverageSummary {
    return {} as any;
  }
}

// 类型定义
export interface CoverageAnalyzerConfig {
  outputDir?: string;
  historyFile?: string;
  thresholds?: any;
}

export interface CoverageReport {
  timestamp: string;
  files: { [path: string]: any };
  summary: CoverageSummary;
}

export interface CoverageSummary {
  lines: { total: number; covered: number; pct: number };
  statements: { total: number; covered: number; pct: number };
  functions: { total: number; covered: number; pct: number };
  branches: { total: number; covered: number; pct: number };
}

export interface CoverageAnalysisReport {
  summary: any;
  qualityAnalysis: QualityAnalysis;
  trendAnalysis: TrendAnalysis;
  gapAnalysis: GapAnalysis;
  recommendations: string[];
  details: CoverageReport;
}

export interface QualityAnalysis {
  overallGrade: QualityGrade;
  moduleGrades: { [module: string]: any };
  criticalIssues: CriticalIssue[];
  recommendations: string[];
  qualityScore: number;
}

export interface TrendAnalysis {
  direction: "improving" | "declining" | "stable";
  changePercent: number;
  trendData: CoverageHistory[];
  alerts: any[];
}

export interface GapAnalysis {
  uncoveredFiles: any[];
  criticalUncovered: any[];
  easilyTestable: any[];
  suggestions: string[];
}

export interface CriticalIssue {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  suggestion: string;
}

export interface CoverageHistory {
  timestamp: string;
  summary: CoverageSummary;
  testCount: number;
}

export type QualityGrade = "A" | "B" | "C" | "D" | "F" | "unknown";
