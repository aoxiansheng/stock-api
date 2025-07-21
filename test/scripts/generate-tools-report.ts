#!/usr/bin/env ts-node

/**
 * 测试工具执行报告生成器
 * 为测试工具命令生成统一的HTML报告
 */

import * as fs from 'fs';
import * as path from 'path';

interface ToolResult {
  name: string;
  status: 'success' | 'failed' | 'skipped';
  message?: string;
  duration?: number;
  timestamp: string;
}

class ToolsReportGenerator {
  private results: ToolResult[] = [];
  private startTime = Date.now();

  constructor() {
    this.ensureReportDir();
  }

  private ensureReportDir() {
    const reportDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
  }

  addResult(name: string, status: 'success' | 'failed' | 'skipped', message?: string, duration?: number) {
    this.results.push({
      name,
      status,
      message,
      duration,
      timestamp: new Date().toISOString()
    });
  }

  generateReport() {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;
    
    const html = this.generateHTML(totalDuration);
    const reportPath = path.join(process.cwd(), 'test-results', 'tools-execution-report.html');
    
    fs.writeFileSync(reportPath, html, 'utf8');
    
    console.log(`📊 测试工具执行报告已生成: ${reportPath}`);
    console.log(`⏱️  总执行时间: ${totalDuration}ms`);
    console.log(`✅ 成功: ${this.results.filter(r => r.status === 'success').length}个`);
    console.log(`❌ 失败: ${this.results.filter(r => r.status === 'failed').length}个`);
    console.log(`⏭️  跳过: ${this.results.filter(r => r.status === 'skipped').length}个`);
  }

  private generateHTML(totalDuration: number): string {
    const successCount = this.results.filter(r => r.status === 'success').length;
    const failedCount = this.results.filter(r => r.status === 'failed').length;
    const skippedCount = this.results.filter(r => r.status === 'skipped').length;

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测试工具执行报告</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 2.5em; font-weight: 300; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .stats { display: flex; justify-content: space-around; padding: 30px; background: #f8f9fa; }
        .stat { text-align: center; }
        .stat-number { font-size: 2.5em; font-weight: bold; margin-bottom: 5px; }
        .stat-label { color: #666; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px; }
        .success { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .results { padding: 30px; }
        .result-item { display: flex; align-items: center; padding: 15px; margin-bottom: 10px; border-radius: 6px; border-left: 4px solid #ddd; }
        .result-item.success { background: #f8fff9; border-left-color: #28a745; }
        .result-item.failed { background: #fff8f8; border-left-color: #dc3545; }
        .result-item.skipped { background: #fffbf0; border-left-color: #ffc107; }
        .result-icon { font-size: 1.5em; margin-right: 15px; width: 30px; }
        .result-content { flex: 1; }
        .result-name { font-weight: 600; margin-bottom: 5px; }
        .result-message { color: #666; font-size: 0.9em; }
        .result-meta { color: #999; font-size: 0.8em; margin-left: auto; text-align: right; }
        .footer { padding: 20px; background: #f8f9fa; text-align: center; color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔧 测试工具执行报告</h1>
            <p>New Stock API - 测试工具执行结果统计</p>
        </div>
        
        <div class="stats">
            <div class="stat">
                <div class="stat-number success">${successCount}</div>
                <div class="stat-label">成功执行</div>
            </div>
            <div class="stat">
                <div class="stat-number failed">${failedCount}</div>
                <div class="stat-label">执行失败</div>
            </div>
            <div class="stat">
                <div class="stat-number skipped">${skippedCount}</div>
                <div class="stat-label">跳过执行</div>
            </div>
            <div class="stat">
                <div class="stat-number">${totalDuration}ms</div>
                <div class="stat-label">总耗时</div>
            </div>
        </div>
        
        <div class="results">
            <h2>执行详情</h2>
            ${this.results.map(result => `
                <div class="result-item ${result.status}">
                    <div class="result-icon">
                        ${result.status === 'success' ? '✅' : result.status === 'failed' ? '❌' : '⏭️'}
                    </div>
                    <div class="result-content">
                        <div class="result-name">${result.name}</div>
                        ${result.message ? `<div class="result-message">${result.message}</div>` : ''}
                    </div>
                    <div class="result-meta">
                        <div>${new Date(result.timestamp).toLocaleString('zh-CN')}</div>
                        ${result.duration ? `<div>${result.duration}ms</div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="footer">
            <p>报告生成时间: ${new Date().toLocaleString('zh-CN')} | New Stock API 测试工具执行报告</p>
        </div>
    </div>
</body>
</html>`;
  }
}

// 示例用法 - 可以被其他脚本调用
if (require.main === module) {
  const generator = new ToolsReportGenerator();
  
  // 示例工具执行结果
  generator.addResult('API响应助手', 'success', 'API响应格式化工具执行成功', 150);
  generator.addResult('异步测试助手', 'success', '异步测试辅助工具执行成功', 200);
  generator.addResult('批量请求助手', 'success', '批量请求测试工具执行成功', 300);
  generator.addResult('并发请求助手', 'success', '并发请求测试工具执行成功', 250);
  generator.addResult('监控测试助手', 'success', '监控测试辅助工具执行成功', 180);
  generator.addResult('测试数据管理器', 'success', '测试数据管理工具执行成功', 120);
  generator.addResult('JS结构验证器', 'success', 'JavaScript结构验证工具执行成功', 100);
  
  generator.generateReport();
}

export { ToolsReportGenerator };