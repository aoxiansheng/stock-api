#!/usr/bin/env ts-node

/**
 * 统一测试报告生成器
 * 整合所有测试类型的报告到一个统一的报告中
 */

import * as fs from 'fs';
import * as path from 'path';

interface ReportSummary {
  type: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  coverage?: {
    lines: number;
    branches: number;
    functions: number;
    statements: number;
  };
  reportPath?: string;
  lastRun: string;
}

class UnifiedReportGenerator {
  private reports: ReportSummary[] = [];

  constructor() {
    this.ensureReportDir();
  }

  private ensureReportDir() {
    const reportDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
  }

  addReport(report: ReportSummary) {
    this.reports.push(report);
  }

  generateUnifiedReport() {
    const html = this.generateHTML();
    const reportPath = path.join(process.cwd(), 'test-results', 'unified-test-report.html');
    
    fs.writeFileSync(reportPath, html, 'utf8');
    
    console.log(`📊 统一测试报告已生成: ${reportPath}`);
    
    // 生成报告摘要
    this.generateSummary();
  }

  private generateSummary() {
    const totalTests = this.reports.reduce((sum, r) => sum + r.totalTests, 0);
    const totalPassed = this.reports.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = this.reports.reduce((sum, r) => sum + r.failed, 0);
    const totalSkipped = this.reports.reduce((sum, r) => sum + r.skipped, 0);
    
    console.log('\n📈 测试执行摘要:');
    console.log(`   总测试数: ${totalTests}`);
    console.log(`   ✅ 通过: ${totalPassed}`);
    console.log(`   ❌ 失败: ${totalFailed}`);
    console.log(`   ⏭️  跳过: ${totalSkipped}`);
    console.log(`   📊 成功率: ${((totalPassed / totalTests) * 100).toFixed(2)}%`);
    
    // 覆盖率摘要
    const coverageReports = this.reports.filter(r => r.coverage);
    if (coverageReports.length > 0) {
      const avgCoverage = {
        lines: coverageReports.reduce((sum, r) => sum + (r.coverage?.lines || 0), 0) / coverageReports.length,
        branches: coverageReports.reduce((sum, r) => sum + (r.coverage?.branches || 0), 0) / coverageReports.length,
        functions: coverageReports.reduce((sum, r) => sum + (r.coverage?.functions || 0), 0) / coverageReports.length,
        statements: coverageReports.reduce((sum, r) => sum + (r.coverage?.statements || 0), 0) / coverageReports.length,
      };
      
      console.log('\n📊 覆盖率摘要:');
      console.log(`   行覆盖率: ${avgCoverage.lines.toFixed(2)}%`);
      console.log(`   分支覆盖率: ${avgCoverage.branches.toFixed(2)}%`);
      console.log(`   函数覆盖率: ${avgCoverage.functions.toFixed(2)}%`);
      console.log(`   语句覆盖率: ${avgCoverage.statements.toFixed(2)}%`);
    }
  }

  private generateHTML(): string {
    const totalTests = this.reports.reduce((sum, r) => sum + r.totalTests, 0);
    const totalPassed = this.reports.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = this.reports.reduce((sum, r) => sum + r.failed, 0);
    const totalSkipped = this.reports.reduce((sum, r) => sum + r.skipped, 0);
    const successRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(2) : '0';

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Stock API - 统一测试报告</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 10px; text-align: center; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 3em; font-weight: 300; }
        .header p { margin: 15px 0 0 0; opacity: 0.9; font-size: 1.2em; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: white; padding: 30px; border-radius: 10px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .summary-number { font-size: 3em; font-weight: bold; margin-bottom: 10px; }
        .summary-label { color: #666; font-size: 1em; text-transform: uppercase; letter-spacing: 1px; }
        .success { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .total { color: #007bff; }
        .reports { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; }
        .report-card { background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .report-header { padding: 20px; background: #f8f9fa; border-bottom: 1px solid #dee2e6; }
        .report-title { font-size: 1.5em; font-weight: 600; margin: 0; color: #333; }
        .report-content { padding: 20px; }
        .test-stats { display: flex; justify-content: space-between; margin-bottom: 15px; }
        .test-stat { text-align: center; }
        .test-stat-number { font-size: 1.5em; font-weight: bold; }
        .test-stat-label { font-size: 0.8em; color: #666; margin-top: 3px; }
        .coverage-bars { margin-top: 15px; }
        .coverage-bar { margin-bottom: 10px; }
        .coverage-label { display: flex; justify-content: space-between; font-size: 0.9em; color: #666; margin-bottom: 3px; }
        .progress-bar { height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #28a745, #20c997); transition: width 0.3s ease; }
        .report-link { display: inline-block; margin-top: 15px; padding: 8px 16px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; font-size: 0.9em; }
        .report-link:hover { background: #0056b3; }
        .footer { text-align: center; margin-top: 40px; padding: 20px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 New Stock API</h1>
            <p>统一测试报告 - 全面质量检测结果</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <div class="summary-number total">${totalTests}</div>
                <div class="summary-label">总测试数</div>
            </div>
            <div class="summary-card">
                <div class="summary-number success">${totalPassed}</div>
                <div class="summary-label">通过测试</div>
            </div>
            <div class="summary-card">
                <div class="summary-number failed">${totalFailed}</div>
                <div class="summary-label">失败测试</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">${successRate}%</div>
                <div class="summary-label">成功率</div>
            </div>
        </div>
        
        <div class="reports">
            ${this.reports.map(report => `
                <div class="report-card">
                    <div class="report-header">
                        <h3 class="report-title">${this.getReportIcon(report.type)} ${report.type}</h3>
                    </div>
                    <div class="report-content">
                        <div class="test-stats">
                            <div class="test-stat">
                                <div class="test-stat-number success">${report.passed}</div>
                                <div class="test-stat-label">通过</div>
                            </div>
                            <div class="test-stat">
                                <div class="test-stat-number failed">${report.failed}</div>
                                <div class="test-stat-label">失败</div>
                            </div>
                            <div class="test-stat">
                                <div class="test-stat-number skipped">${report.skipped}</div>
                                <div class="test-stat-label">跳过</div>
                            </div>
                            <div class="test-stat">
                                <div class="test-stat-number">${report.totalTests}</div>
                                <div class="test-stat-label">总计</div>
                            </div>
                        </div>
                        
                        ${report.coverage ? `
                        <div class="coverage-bars">
                            <div class="coverage-bar">
                                <div class="coverage-label">
                                    <span>行覆盖率</span>
                                    <span>${report.coverage.lines.toFixed(1)}%</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${report.coverage.lines}%"></div>
                                </div>
                            </div>
                            <div class="coverage-bar">
                                <div class="coverage-label">
                                    <span>分支覆盖率</span>
                                    <span>${report.coverage.branches.toFixed(1)}%</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${report.coverage.branches}%"></div>
                                </div>
                            </div>
                            <div class="coverage-bar">
                                <div class="coverage-label">
                                    <span>函数覆盖率</span>
                                    <span>${report.coverage.functions.toFixed(1)}%</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${report.coverage.functions}%"></div>
                                </div>
                            </div>
                        </div>
                        ` : ''}
                        
                        ${report.reportPath ? `<a href="${report.reportPath}" class="report-link">查看详细报告</a>` : ''}
                        
                        <div style="margin-top: 15px; font-size: 0.8em; color: #999;">
                            最后运行: ${new Date(report.lastRun).toLocaleString('zh-CN')}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="footer">
            <p>报告生成时间: ${new Date().toLocaleString('zh-CN')} | New Stock API 测试质量报告</p>
        </div>
    </div>
</body>
</html>`;
  }

  private getReportIcon(type: string): string {
    const icons: { [key: string]: string } = {
      '单元测试': '🧪',
      '集成测试': '🔗',
      'E2E测试': '🌐',
      '安全测试': '🛡️',
      '性能测试': '⚡',
      '测试工具': '🔧',
      '覆盖率': '📊'
    };
    return icons[type] || '📋';
  }
}

// 示例用法
if (require.main === module) {
  const generator = new UnifiedReportGenerator();
  
  // 示例报告数据
  generator.addReport({
    type: '单元测试',
    totalTests: 150,
    passed: 145,
    failed: 5,
    skipped: 0,
    coverage: { lines: 88.5, branches: 85.2, functions: 92.1, statements: 87.8 },
    reportPath: './unit-test-report.html',
    lastRun: new Date().toISOString()
  });
  
  generator.addReport({
    type: '集成测试',
    totalTests: 85,
    passed: 80,
    failed: 3,
    skipped: 2,
    coverage: { lines: 75.2, branches: 72.8, functions: 78.5, statements: 76.1 },
    reportPath: './integration-test-report.html',
    lastRun: new Date().toISOString()
  });
  
  generator.addReport({
    type: 'E2E测试',
    totalTests: 45,
    passed: 42,
    failed: 2,
    skipped: 1,
    coverage: { lines: 65.8, branches: 62.3, functions: 68.9, statements: 64.2 },
    reportPath: './e2e-test-report.html',
    lastRun: new Date().toISOString()
  });
  
  generator.addReport({
    type: '安全测试',
    totalTests: 35,
    passed: 33,
    failed: 1,
    skipped: 1,
    coverage: { lines: 82.1, branches: 78.5, functions: 85.3, statements: 80.7 },
    reportPath: './security-test-report.html',
    lastRun: new Date().toISOString()
  });
  
  generator.generateUnifiedReport();
}

export { UnifiedReportGenerator };