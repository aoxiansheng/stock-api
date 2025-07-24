import * as fs from "fs";
import * as path from "path";

/**
 * 覆盖率趋势检查器
 * 分析覆盖率历史趋势和变化
 */
export class CoverageTrendChecker {
  private historyFile: string;
  private alertThresholds: AlertThresholds;

  constructor(config?: TrendCheckerConfig) {
    this.historyFile =
      config?.historyFile || "coverage/history/coverage-history.json";
    this.alertThresholds = {
      decline: {
        warning: 2, // 下降2%触发警告
        error: 5, // 下降5%触发错误
        critical: 10, // 下降10%触发严重警告
      },
      improvement: {
        notable: 3, // 提升3%值得注意
        significant: 5, // 提升5%显著改进
      },
      ...config?.alertThresholds,
    };
  }

  /**
   * 执行趋势检查
   */
  async checkTrends(): Promise<TrendCheckResult> {
    console.log("📈 开始检查覆盖率趋势...");

    const historyData = await this.loadHistoryData();
    const currentCoverage = await this.loadCurrentCoverage();

    if (!currentCoverage) {
      throw new Error("无法加载当前覆盖率数据");
    }

    // 更新历史数据
    await this.updateHistoryData(historyData, currentCoverage);

    const result: TrendCheckResult = {
      currentCoverage,
      historyData,
      trends: this.analyzeTrends(historyData),
      alerts: this.generateAlerts(historyData),
      recommendations: this.generateRecommendations(historyData),
      summary: "",
    };

    result.summary = this.generateSummary(result);

    await this.saveTrendReport(result);
    this.printTrendResult(result);

    return result;
  }

  /**
   * 加载历史数据
   */
  private async loadHistoryData(): Promise<CoverageHistoryEntry[]> {
    if (!fs.existsSync(this.historyFile)) {
      console.log("📝 创建新的覆盖率历史文件");
      await this.ensureHistoryDirectory();
      return [];
    }

    try {
      const data = fs.readFileSync(this.historyFile, "utf8");
      const history = JSON.parse(data);
      console.log(`📊 加载了 ${history.length} 条历史记录`);
      return history;
    } catch (error) {
      console.warn("⚠️ 无法解析历史数据文件，创建新的历史记录");
      return [];
    }
  }

  /**
   * 加载当前覆盖率
   */
  private async loadCurrentCoverage(): Promise<CoverageSummary | null> {
    const coveragePaths = [
      "coverage/merged/coverage-summary.json",
      "coverage/coverage-summary.json",
      "coverage/lcov-report/coverage-summary.json",
    ];

    for (const coveragePath of coveragePaths) {
      if (fs.existsSync(coveragePath)) {
        try {
          const data = fs.readFileSync(coveragePath, "utf8");
          const coverage = JSON.parse(data);

          // 转换为标准格式
          return this.normalizeCoverageData(coverage);
        } catch (error) {
          console.warn(`⚠️ 无法解析覆盖率文件: ${coveragePath}`);
        }
      }
    }

    return null;
  }

  /**
   * 标准化覆盖率数据
   */
  private normalizeCoverageData(rawData: any): CoverageSummary {
    // 处理不同格式的覆盖率数据
    if (rawData.total) {
      // Istanbul格式
      return {
        lines: rawData.total.lines.pct,
        statements: rawData.total.statements.pct,
        functions: rawData.total.functions.pct,
        branches: rawData.total.branches.pct,
        timestamp: new Date().toISOString(),
      };
    } else if (rawData.lines !== undefined) {
      // 自定义格式
      return {
        lines: rawData.lines,
        statements: rawData.statements,
        functions: rawData.functions,
        branches: rawData.branches,
        timestamp: new Date().toISOString(),
      };
    } else {
      throw new Error("无法识别的覆盖率数据格式");
    }
  }

  /**
   * 更新历史数据
   */
  private async updateHistoryData(
    history: CoverageHistoryEntry[],
    current: CoverageSummary,
  ): Promise<void> {
    const newEntry: CoverageHistoryEntry = {
      timestamp: current.timestamp,
      coverage: current,
      commit: await this.getCurrentCommit(),
      environment: process.env.NODE_ENV || "development",
    };

    // 避免重复添加相同时间戳的数据
    const existingIndex = history.findIndex(
      (h) =>
        Math.abs(
          new Date(h.timestamp).getTime() -
            new Date(newEntry.timestamp).getTime(),
        ) < 60000, // 1分钟内
    );

    if (existingIndex >= 0) {
      history[existingIndex] = newEntry;
    } else {
      history.push(newEntry);
    }

    // 保持最近100条记录
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }

    // 按时间排序
    history.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    // 保存更新后的历史数据
    await this.ensureHistoryDirectory();
    fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));
  }

  /**
   * 分析趋势
   */
  private analyzeTrends(history: CoverageHistoryEntry[]): TrendAnalysis {
    if (history.length < 2) {
      return {
        shortTerm: { direction: "stable", change: 0, period: "无足够数据" },
        longTerm: { direction: "stable", change: 0, period: "无足够数据" },
        volatility: "low",
        prediction: "需要更多数据进行预测",
      };
    }

    const shortTermTrend = this.calculateTrend(history, 5); // 最近5次
    const longTermTrend = this.calculateTrend(
      history,
      Math.min(20, history.length),
    ); // 最近20次或全部

    return {
      shortTerm: shortTermTrend,
      longTerm: longTermTrend,
      volatility: this.calculateVolatility(history),
      prediction: this.generatePrediction(shortTermTrend, longTermTrend),
    };
  }

  /**
   * 计算趋势
   */
  private calculateTrend(
    history: CoverageHistoryEntry[],
    period: number,
  ): TrendDetail {
    const recentHistory = history.slice(-period);

    if (recentHistory.length < 2) {
      return {
        direction: "stable",
        change: 0,
        period: `${recentHistory.length} 条记录`,
      };
    }

    const first = recentHistory[0].coverage;
    const last = recentHistory[recentHistory.length - 1].coverage;

    const avgChange =
      (last.lines -
        first.lines +
        (last.statements - first.statements) +
        (last.functions - first.functions) +
        (last.branches - first.branches)) /
      4;

    let direction: "improving" | "declining" | "stable" = "stable";
    if (avgChange > 1) {
      direction = "improving";
    } else if (avgChange < -1) {
      direction = "declining";
    }

    return {
      direction,
      change: Number(avgChange.toFixed(2)),
      period: `${recentHistory.length} 条记录`,
    };
  }

  /**
   * 计算波动性
   */
  private calculateVolatility(
    history: CoverageHistoryEntry[],
  ): "low" | "medium" | "high" {
    if (history.length < 3) {
      return "low";
    }

    const changes: number[] = [];
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1].coverage;
      const curr = history[i].coverage;

      const avgChange =
        (Math.abs(curr.lines - prev.lines) +
          Math.abs(curr.statements - prev.statements) +
          Math.abs(curr.functions - prev.functions) +
          Math.abs(curr.branches - prev.branches)) /
        4;

      changes.push(avgChange);
    }

    const avgVolatility =
      changes.reduce((sum, change) => sum + change, 0) / changes.length;

    if (avgVolatility > 3) {
      return "high";
    } else if (avgVolatility > 1) {
      return "medium";
    } else {
      return "low";
    }
  }

  /**
   * 生成预测
   */
  private generatePrediction(
    shortTerm: TrendDetail,
    longTerm: TrendDetail,
  ): string {
    if (
      shortTerm.direction === "improving" &&
      longTerm.direction === "improving"
    ) {
      return "覆盖率持续改善，预计将继续提升";
    } else if (
      shortTerm.direction === "declining" &&
      longTerm.direction === "declining"
    ) {
      return "覆盖率持续下降，需要立即关注";
    } else if (
      shortTerm.direction === "improving" &&
      longTerm.direction === "stable"
    ) {
      return "短期改善明显，长期保持稳定";
    } else if (
      shortTerm.direction === "declining" &&
      longTerm.direction === "stable"
    ) {
      return "短期有所下降，但长期趋势稳定";
    } else {
      return "覆盖率趋势稳定，建议持续监控";
    }
  }

  /**
   * 生成告警
   */
  private generateAlerts(history: CoverageHistoryEntry[]): TrendAlert[] {
    const alerts: TrendAlert[] = [];

    if (history.length < 2) {
      return alerts;
    }

    const latest = history[history.length - 1].coverage;
    const previous = history[history.length - 2].coverage;

    // 检查各项指标的变化
    const metrics = ["lines", "statements", "functions", "branches"] as const;

    for (const metric of metrics) {
      const change = latest[metric] - previous[metric];

      if (change <= -this.alertThresholds.decline.critical) {
        alerts.push({
          type: "critical_decline",
          severity: "critical",
          metric,
          change,
          message: `${metric}覆盖率严重下降 ${Math.abs(change).toFixed(1)}%`,
          recommendation: "立即检查最近的代码变更并补充测试",
        });
      } else if (change <= -this.alertThresholds.decline.error) {
        alerts.push({
          type: "significant_decline",
          severity: "error",
          metric,
          change,
          message: `${metric}覆盖率显著下降 ${Math.abs(change).toFixed(1)}%`,
          recommendation: "检查相关模块的测试覆盖情况",
        });
      } else if (change <= -this.alertThresholds.decline.warning) {
        alerts.push({
          type: "minor_decline",
          severity: "warning",
          metric,
          change,
          message: `${metric}覆盖率下降 ${Math.abs(change).toFixed(1)}%`,
          recommendation: "关注相关测试的完整性",
        });
      } else if (change >= this.alertThresholds.improvement.significant) {
        alerts.push({
          type: "significant_improvement",
          severity: "info",
          metric,
          change,
          message: `${metric}覆盖率显著提升 ${change.toFixed(1)}%`,
          recommendation: "保持良好的测试实践",
        });
      } else if (change >= this.alertThresholds.improvement.notable) {
        alerts.push({
          type: "notable_improvement",
          severity: "info",
          metric,
          change,
          message: `${metric}覆盖率有所提升 ${change.toFixed(1)}%`,
          recommendation: "继续加强测试覆盖",
        });
      }
    }

    return alerts;
  }

  /**
   * 生成建议
   */
  private generateRecommendations(history: CoverageHistoryEntry[]): string[] {
    const recommendations: string[] = [];

    if (history.length < 5) {
      recommendations.push("建议积累更多历史数据以进行准确的趋势分析");
    }

    const trends = this.analyzeTrends(history);

    if (trends.shortTerm.direction === "declining") {
      recommendations.push("短期覆盖率下降，建议review最近的代码变更");
      recommendations.push("检查是否有新增代码缺少测试覆盖");
    }

    if (trends.volatility === "high") {
      recommendations.push("覆盖率波动较大，建议建立稳定的测试流程");
      recommendations.push("考虑在CI/CD中加入覆盖率质量门禁");
    }

    if (
      trends.longTerm.direction === "stable" &&
      trends.longTerm.change === 0
    ) {
      recommendations.push("覆盖率长期稳定，可以考虑设置更高的目标");
    }

    return recommendations;
  }

  /**
   * 生成摘要
   */
  private generateSummary(result: TrendCheckResult): string {
    let summary = "覆盖率趋势分析完成";

    const criticalAlerts = result.alerts.filter(
      (a) => a.severity === "critical",
    ).length;
    const errorAlerts = result.alerts.filter(
      (a) => a.severity === "error",
    ).length;
    const warningAlerts = result.alerts.filter(
      (a) => a.severity === "warning",
    ).length;

    if (criticalAlerts > 0) {
      summary += ` - 发现 ${criticalAlerts} 个严重问题`;
    }
    if (errorAlerts > 0) {
      summary += ` - 发现 ${errorAlerts} 个错误`;
    }
    if (warningAlerts > 0) {
      summary += ` - 发现 ${warningAlerts} 个警告`;
    }

    if (result.alerts.length === 0) {
      summary += " - 趋势良好，无异常发现";
    }

    return summary;
  }

  /**
   * 获取当前commit
   */
  private async getCurrentCommit(): Promise<string> {
    try {
      const { execSync } = require("child_process");
      return execSync("git rev-parse --short HEAD", {
        encoding: "utf8",
      }).trim();
    } catch {
      return "unknown";
    }
  }

  /**
   * 确保历史目录存在
   */
  private async ensureHistoryDirectory(): Promise<void> {
    const historyDir = path.dirname(this.historyFile);
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }
  }

  /**
   * 保存趋势报告
   */
  private async saveTrendReport(result: TrendCheckResult): Promise<void> {
    const reportPath = "test-results/coverage-trend-report.json";
    const reportDir = path.dirname(reportPath);

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
    console.log(`📄 趋势报告已保存: ${reportPath}`);
  }

  /**
   * 打印趋势结果
   */
  private printTrendResult(result: TrendCheckResult): void {
    console.log("\n📈 覆盖率趋势检查结果");
    console.log("=".repeat(50));

    console.log(`\n📊 当前覆盖率:`);
    console.log(`Lines: ${result.currentCoverage.lines.toFixed(1)}%`);
    console.log(`Statements: ${result.currentCoverage.statements.toFixed(1)}%`);
    console.log(`Functions: ${result.currentCoverage.functions.toFixed(1)}%`);
    console.log(`Branches: ${result.currentCoverage.branches.toFixed(1)}%`);

    console.log(`\n📈 趋势分析:`);
    console.log(
      `短期趋势: ${result.trends.shortTerm.direction} (${result.trends.shortTerm.change > 0 ? "+" : ""}${result.trends.shortTerm.change}%)`,
    );
    console.log(
      `长期趋势: ${result.trends.longTerm.direction} (${result.trends.longTerm.change > 0 ? "+" : ""}${result.trends.longTerm.change}%)`,
    );
    console.log(`波动性: ${result.trends.volatility}`);
    console.log(`预测: ${result.trends.prediction}`);

    if (result.alerts.length > 0) {
      console.log(`\n🚨 告警信息:`);
      result.alerts.forEach((alert, index) => {
        const icon =
          alert.severity === "critical"
            ? "🚫"
            : alert.severity === "error"
              ? "❌"
              : alert.severity === "warning"
                ? "⚠️"
                : "ℹ️";
        console.log(
          `\n${index + 1}. ${icon} [${alert.severity.toUpperCase()}] ${alert.message}`,
        );
        console.log(`   建议: ${alert.recommendation}`);
      });
    }

    if (result.recommendations.length > 0) {
      console.log(`\n💡 改进建议:`);
      result.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    console.log(`\n📋 ${result.summary}`);
  }
}

// 类型定义
interface TrendCheckerConfig {
  historyFile?: string;
  alertThresholds?: Partial<AlertThresholds>;
}

interface AlertThresholds {
  decline: {
    warning: number;
    error: number;
    critical: number;
  };
  improvement: {
    notable: number;
    significant: number;
  };
}

interface CoverageSummary {
  lines: number;
  statements: number;
  functions: number;
  branches: number;
  timestamp: string;
}

interface CoverageHistoryEntry {
  timestamp: string;
  coverage: CoverageSummary;
  commit: string;
  environment: string;
}

interface TrendDetail {
  direction: "improving" | "declining" | "stable";
  change: number;
  period: string;
}

interface TrendAnalysis {
  shortTerm: TrendDetail;
  longTerm: TrendDetail;
  volatility: "low" | "medium" | "high";
  prediction: string;
}

interface TrendAlert {
  type: string;
  severity: "critical" | "error" | "warning" | "info";
  metric: string;
  change: number;
  message: string;
  recommendation: string;
}

interface TrendCheckResult {
  currentCoverage: CoverageSummary;
  historyData: CoverageHistoryEntry[];
  trends: TrendAnalysis;
  alerts: TrendAlert[];
  recommendations: string[];
  summary: string;
}

// 命令行工具
export async function runCoverageTrendCheck(): Promise<void> {
  const checker = new CoverageTrendChecker();
  const result = await checker.checkTrends();

  const criticalAlerts = result.alerts.filter(
    (a) => a.severity === "critical",
  ).length;
  if (criticalAlerts > 0) {
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runCoverageTrendCheck().catch(console.error);
}
