#!/usr/bin/env node

/**
 * ProcessingTime废弃字段监控脚本
 * 提供实时的迁移状态监控和团队进度跟踪
 *
 * 使用方法:
 * - node scripts/monitor-deprecation-status.js
 * - npm run monitor:deprecation-status
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置项
const CONFIG = {
  sourceDir: './src',
  reportDir: './reports/deprecation',
  teamConfig: './docs/migration/team-config.json',
  excludePatterns: [
    'node_modules',
    'test',
    'migration',
    'legacy',
    '*.spec.ts',
    '*.test.ts'
  ],
  targets: {
    deprecated: 'processingTime',
    standard: 'processingTimeMs'
  }
};

class DeprecationMonitor {
  constructor() {
    this.results = {
      summary: {},
      teamProgress: {},
      riskAssessment: {},
      recommendations: []
    };

    this.teamConfig = this.loadTeamConfig();
  }

  /**
   * 加载团队配置
   */
  loadTeamConfig() {
    const defaultConfig = {
      teams: {
        'core-services': {
          name: '核心服务团队',
          priority: 'high',
          components: ['receiver', 'stream-receiver', 'query'],
          lead: 'TBD',
          deadline: '2 weeks'
        },
        'data-processing': {
          name: '数据处理团队',
          priority: 'high',
          components: ['data-fetcher', 'transformer', 'symbol-mapper'],
          lead: 'TBD',
          deadline: '2 weeks'
        },
        'infrastructure': {
          name: '基础设施团队',
          priority: 'medium',
          components: ['cache', 'storage', 'shared'],
          lead: 'TBD',
          deadline: '3 weeks'
        },
        'monitoring': {
          name: '监控团队',
          priority: 'medium',
          components: ['monitoring', 'alert', 'notification'],
          lead: 'TBD',
          deadline: '4 weeks'
        }
      }
    };

    try {
      if (fs.existsSync(CONFIG.teamConfig)) {
        return JSON.parse(fs.readFileSync(CONFIG.teamConfig, 'utf8'));
      }
    } catch (error) {
      console.warn('⚠️ 无法加载团队配置，使用默认配置');
    }

    return defaultConfig;
  }

  /**
   * 执行全面监控检查
   */
  async monitor() {
    console.log('🔍 开始ProcessingTime废弃字段状态监控...\n');

    try {
      // 1. 基础统计分析
      await this.analyzeBasicStats();

      // 2. 团队进度分析
      await this.analyzeTeamProgress();

      // 3. ESLint警告分析
      await this.analyzeESLintWarnings();

      // 4. @deprecated标记覆盖分析
      await this.analyzeDeprecatedCoverage();

      // 5. 风险评估
      await this.assessRisks();

      // 6. 生成建议
      await this.generateRecommendations();

      // 7. 输出报告
      await this.generateReport();

    } catch (error) {
      console.error('❌ 监控过程中发生错误:', error.message);
      process.exit(1);
    }
  }

  /**
   * 基础统计分析
   */
  async analyzeBasicStats() {
    console.log('📊 分析基础统计信息...');

    const excludePattern = CONFIG.excludePatterns.map(p => `--exclude-dir=${p}`).join(' ');

    try {
      // 统计废弃字段使用
      const deprecatedUsage = execSync(
        `grep -r --include='*.ts' ${excludePattern} '${CONFIG.targets.deprecated}' ${CONFIG.sourceDir} | wc -l`,
        { encoding: 'utf8' }
      ).trim();

      // 统计标准字段使用
      const standardUsage = execSync(
        `grep -r --include='*.ts' ${excludePattern} '${CONFIG.targets.standard}' ${CONFIG.sourceDir} | wc -l`,
        { encoding: 'utf8' }
      ).trim();

      // 统计涉及文件
      const affectedFiles = execSync(
        `grep -r --include='*.ts' ${excludePattern} -l '${CONFIG.targets.deprecated}' ${CONFIG.sourceDir} | wc -l`,
        { encoding: 'utf8' }
      ).trim();

      const migratedFiles = execSync(
        `grep -r --include='*.ts' ${excludePattern} -l '${CONFIG.targets.standard}' ${CONFIG.sourceDir} | wc -l`,
        { encoding: 'utf8' }
      ).trim();

      // 计算迁移进度
      const totalUsage = parseInt(deprecatedUsage) + parseInt(standardUsage);
      const migrationProgress = totalUsage > 0 ?
        Math.round((parseInt(standardUsage) / totalUsage) * 100) : 100;

      this.results.summary = {
        deprecatedUsage: parseInt(deprecatedUsage),
        standardUsage: parseInt(standardUsage),
        affectedFiles: parseInt(affectedFiles),
        migratedFiles: parseInt(migratedFiles),
        migrationProgress: migrationProgress,
        timestamp: new Date().toISOString()
      };

      console.log(`   ✅ 废弃字段使用: ${deprecatedUsage} 次`);
      console.log(`   ✅ 标准字段使用: ${standardUsage} 次`);
      console.log(`   ✅ 迁移进度: ${migrationProgress}%\n`);

    } catch (error) {
      console.warn('⚠️ 基础统计分析部分失败:', error.message);
    }
  }

  /**
   * 团队进度分析
   */
  async analyzeTeamProgress() {
    console.log('👥 分析团队迁移进度...');

    for (const [teamId, team] of Object.entries(this.teamConfig.teams)) {
      const teamProgress = {
        name: team.name,
        priority: team.priority,
        deadline: team.deadline,
        components: {},
        overallProgress: 0,
        status: 'pending',
        issues: []
      };

      let totalUsage = 0;
      let migratedUsage = 0;

      // 分析每个组件
      for (const component of team.components) {
        const componentPath = path.join(CONFIG.sourceDir, 'core', '**', component);

        try {
          // 检查组件中的废弃字段使用
          const deprecatedInComponent = execSync(
            `find ${CONFIG.sourceDir} -path "*${component}*" -name "*.ts" -exec grep -l "${CONFIG.targets.deprecated}" {} \\; 2>/dev/null | wc -l`,
            { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
          ).trim();

          const standardInComponent = execSync(
            `find ${CONFIG.sourceDir} -path "*${component}*" -name "*.ts" -exec grep -l "${CONFIG.targets.standard}" {} \\; 2>/dev/null | wc -l`,
            { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
          ).trim();

          const componentTotal = parseInt(deprecatedInComponent) + parseInt(standardInComponent);
          const componentProgress = componentTotal > 0 ?
            Math.round((parseInt(standardInComponent) / componentTotal) * 100) : 100;

          teamProgress.components[component] = {
            deprecated: parseInt(deprecatedInComponent),
            standard: parseInt(standardInComponent),
            progress: componentProgress
          };

          totalUsage += componentTotal;
          migratedUsage += parseInt(standardInComponent);

        } catch (error) {
          teamProgress.issues.push(`组件 ${component} 分析失败: ${error.message}`);
        }
      }

      // 计算团队整体进度
      teamProgress.overallProgress = totalUsage > 0 ?
        Math.round((migratedUsage / totalUsage) * 100) : 100;

      // 确定状态
      if (teamProgress.overallProgress >= 90) {
        teamProgress.status = 'completed';
      } else if (teamProgress.overallProgress >= 50) {
        teamProgress.status = 'in-progress';
      } else {
        teamProgress.status = 'pending';
      }

      this.results.teamProgress[teamId] = teamProgress;

      console.log(`   ${this.getStatusIcon(teamProgress.status)} ${team.name}: ${teamProgress.overallProgress}%`);
    }

    console.log('');
  }

  /**
   * ESLint警告分析
   */
  async analyzeESLintWarnings() {
    console.log('🔧 分析ESLint警告状态...');

    try {
      // 检查@deprecated标记的覆盖情况
      const deprecatedWarnings = execSync(
        `grep -r --include='*.ts' --exclude-dir=node_modules '@deprecated.*processingTime' ${CONFIG.sourceDir} | wc -l`,
        { encoding: 'utf8' }
      ).trim();

      this.results.eslintStatus = {
        deprecatedMarkings: parseInt(deprecatedWarnings),
        configStatus: fs.existsSync('./eslint.config.mts') ? 'configured' : 'missing',
        timestamp: new Date().toISOString()
      };

      console.log(`   ✅ @deprecated标记: ${deprecatedWarnings} 个`);
      console.log(`   ✅ ESLint配置: ${this.results.eslintStatus.configStatus}\n`);

    } catch (error) {
      console.warn('⚠️ ESLint分析部分失败:', error.message);
    }
  }

  /**
   * @deprecated标记覆盖分析
   */
  async analyzeDeprecatedCoverage() {
    console.log('📝 分析@deprecated标记覆盖情况...');

    try {
      // 查找所有定义processingTime字段但没有@deprecated标记的文件
      const fieldsWithoutDeprecated = execSync(
        `grep -r --include='*.ts' --exclude-dir=node_modules 'processingTime:' ${CONFIG.sourceDir} | grep -v '@deprecated' | wc -l`,
        { encoding: 'utf8' }
      ).trim();

      this.results.deprecatedCoverage = {
        unmarkedFields: parseInt(fieldsWithoutDeprecated),
        coverageStatus: parseInt(fieldsWithoutDeprecated) === 0 ? 'complete' : 'partial'
      };

      console.log(`   📊 未标记废弃的字段定义: ${fieldsWithoutDeprecated} 个`);
      console.log(`   📊 覆盖状态: ${this.results.deprecatedCoverage.coverageStatus}\n`);

    } catch (error) {
      console.warn('⚠️ @deprecated覆盖分析失败:', error.message);
    }
  }

  /**
   * 风险评估
   */
  async assessRisks() {
    console.log('⚠️ 进行风险评估...');

    const risks = [];

    // 进度风险
    if (this.results.summary.migrationProgress < 50) {
      risks.push({
        type: 'progress',
        level: 'high',
        message: '迁移进度低于50%，可能影响阶段3时间计划'
      });
    }

    // 团队进度风险
    const highPriorityTeams = Object.values(this.results.teamProgress)
      .filter(team => team.priority === 'high' && team.overallProgress < 70);

    if (highPriorityTeams.length > 0) {
      risks.push({
        type: 'team',
        level: 'medium',
        message: `${highPriorityTeams.length} 个高优先级团队进度滞后`
      });
    }

    // @deprecated覆盖风险
    if (this.results.deprecatedCoverage?.unmarkedFields > 0) {
      risks.push({
        type: 'coverage',
        level: 'low',
        message: `${this.results.deprecatedCoverage.unmarkedFields} 个字段未添加@deprecated标记`
      });
    }

    this.results.riskAssessment = {
      totalRisks: risks.length,
      risks: risks,
      overallRiskLevel: this.calculateOverallRisk(risks)
    };

    console.log(`   📊 识别风险: ${risks.length} 个`);
    console.log(`   📊 整体风险级别: ${this.results.riskAssessment.overallRiskLevel}\n`);
  }

  /**
   * 生成建议
   */
  async generateRecommendations() {
    console.log('💡 生成改进建议...');

    const recommendations = [];

    // 基于进度的建议
    if (this.results.summary.migrationProgress < 80) {
      recommendations.push({
        priority: 'high',
        category: 'migration',
        action: '加速核心组件迁移',
        details: '重点关注receiver和stream-receiver组件的字段迁移'
      });
    }

    // 基于团队进度的建议
    for (const [teamId, team] of Object.entries(this.results.teamProgress)) {
      if (team.status === 'pending' && team.priority === 'high') {
        recommendations.push({
          priority: 'high',
          category: 'team',
          action: `协助${team.name}启动迁移`,
          details: `${team.name}尚未开始迁移，需要技术支持和时间计划`
        });
      }
    }

    // 基于覆盖的建议
    if (this.results.deprecatedCoverage?.unmarkedFields > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'coverage',
        action: '完善@deprecated标记',
        details: '为剩余字段定义添加@deprecated警告标记'
      });
    }

    this.results.recommendations = recommendations;
    console.log(`   ✅ 生成建议: ${recommendations.length} 条\n`);
  }

  /**
   * 生成监控报告
   */
  async generateReport() {
    console.log('📄 生成监控报告...');

    // 确保报告目录存在
    if (!fs.existsSync(CONFIG.reportDir)) {
      fs.mkdirSync(CONFIG.reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(CONFIG.reportDir, `deprecation-monitor-${timestamp}.json`);
    const summaryFile = path.join(CONFIG.reportDir, 'latest-monitor-summary.md');

    // 保存详细JSON报告
    fs.writeFileSync(reportFile, JSON.stringify(this.results, null, 2));

    // 生成Markdown摘要
    const markdownSummary = this.generateMarkdownSummary();
    fs.writeFileSync(summaryFile, markdownSummary);

    console.log(`   ✅ 详细报告: ${reportFile}`);
    console.log(`   ✅ 摘要报告: ${summaryFile}\n`);

    // 输出控制台摘要
    this.displayConsoleSummary();
  }

  /**
   * 生成Markdown摘要
   */
  generateMarkdownSummary() {
    const { summary, teamProgress, riskAssessment, recommendations } = this.results;

    return `# ProcessingTime废弃字段监控报告

## 📊 迁移进度概览

- **整体进度**: ${summary.migrationProgress}%
- **废弃字段使用**: ${summary.deprecatedUsage} 次
- **标准字段使用**: ${summary.standardUsage} 次
- **涉及文件**: ${summary.affectedFiles} 个

## 👥 团队进度状态

${Object.entries(teamProgress).map(([teamId, team]) => `
### ${team.name} (${team.priority}优先级)
- **进度**: ${team.overallProgress}%
- **状态**: ${this.getStatusIcon(team.status)} ${team.status}
- **截止时间**: ${team.deadline}
- **组件进度**: ${Object.entries(team.components).map(([comp, data]) =>
  `\n  - ${comp}: ${data.progress}%`).join('')}
${team.issues.length > 0 ? `- **问题**: ${team.issues.join(', ')}` : ''}
`).join('')}

## ⚠️ 风险评估

**整体风险级别**: ${riskAssessment.overallRiskLevel}

${riskAssessment.risks.map(risk => `
- **${risk.level}**: ${risk.message}
`).join('')}

## 💡 改进建议

${recommendations.map((rec, index) => `
${index + 1}. **${rec.category}** (${rec.priority}优先级)
   - 行动: ${rec.action}
   - 详情: ${rec.details}
`).join('')}

---
**生成时间**: ${new Date().toLocaleString('zh-CN')}
**报告版本**: v1.0
`;
  }

  /**
   * 显示控制台摘要
   */
  displayConsoleSummary() {
    console.log('====================================================');
    console.log('📈 ProcessingTime废弃字段监控摘要');
    console.log('====================================================');
    console.log(`🎯 整体迁移进度: ${this.results.summary.migrationProgress}%`);
    console.log(`📊 风险级别: ${this.results.riskAssessment.overallRiskLevel}`);
    console.log(`💡 改进建议: ${this.results.recommendations.length} 条`);
    console.log('');

    // 显示高优先级建议
    const highPriorityRecs = this.results.recommendations
      .filter(rec => rec.priority === 'high')
      .slice(0, 3);

    if (highPriorityRecs.length > 0) {
      console.log('🔥 高优先级建议:');
      highPriorityRecs.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec.action}`);
      });
      console.log('');
    }

    console.log('✅ 监控完成！详细报告已保存到 reports/deprecation/ 目录');
  }

  /**
   * 获取状态图标
   */
  getStatusIcon(status) {
    const icons = {
      'completed': '✅',
      'in-progress': '🔄',
      'pending': '⏳'
    };
    return icons[status] || '❓';
  }

  /**
   * 计算整体风险级别
   */
  calculateOverallRisk(risks) {
    if (risks.some(r => r.level === 'high')) return 'high';
    if (risks.some(r => r.level === 'medium')) return 'medium';
    if (risks.length > 0) return 'low';
    return 'minimal';
  }
}

// 主函数
async function main() {
  const monitor = new DeprecationMonitor();
  await monitor.monitor();
}

// 运行监控
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 监控失败:', error);
    process.exit(1);
  });
}

module.exports = { DeprecationMonitor };