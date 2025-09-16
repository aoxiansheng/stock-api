#!/usr/bin/env node
/**
 * Auth配置一致性检查脚本
 * 
 * 功能：
 * 1. 检查配置重叠和冲突
 * 2. 验证环境变量唯一性
 * 3. 分析配置依赖关系
 * 4. 生成一致性报告
 * 
 * Task 3.2: 配置一致性检查脚本
 * 
 * 使用方法:
 * node scripts/auth-config-consistency-check.js
 * node scripts/auth-config-consistency-check.js --verbose
 * node scripts/auth-config-consistency-check.js --fix-issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置文件路径
const CONFIG_PATHS = {
  authUnified: 'src/auth/config/auth-unified.config.ts',
  authCache: 'src/auth/config/auth-cache.config.ts',
  authLimits: 'src/auth/config/auth-limits.config.ts',
  compatibilityWrapper: 'src/auth/config/compatibility-wrapper.ts',
  authConfiguration: 'src/auth/config/auth-configuration.ts',
  securityConfig: 'src/auth/config/security.config.ts'
};

// 常量文件路径
const CONSTANTS_PATHS = {
  // apiSecurity: 'src/auth/constants/api-security.constants.ts', // REMOVED - 已迁移到统一配置
  permissionControl: 'src/auth/constants/permission-control.constants.ts',
  rateLimiting: 'src/auth/constants/rate-limiting.constants.ts',
  userOperations: 'src/auth/constants/user-operations.constants.ts',
  authSemantic: 'src/auth/constants/auth-semantic.constants.ts'
};

// 环境变量定义
const EXPECTED_ENV_VARS = {
  // 缓存配置变量 (5个专用变量替代共享AUTH_CACHE_TTL)
  cache: [
    'AUTH_PERMISSION_CACHE_TTL',
    'AUTH_API_KEY_CACHE_TTL',
    'AUTH_RATE_LIMIT_TTL',
    'AUTH_STATISTICS_CACHE_TTL',
    'AUTH_SESSION_CACHE_TTL'
  ],
  
  // 限制配置变量
  limits: [
    'AUTH_RATE_LIMIT',
    'AUTH_STRING_LIMIT',
    'AUTH_TIMEOUT',
    'AUTH_API_KEY_LENGTH',
    'AUTH_MAX_API_KEYS_PER_USER',
    'AUTH_MAX_LOGIN_ATTEMPTS',
    'AUTH_LOGIN_LOCKOUT_MINUTES'
  ],
  
  // 验证相关变量
  validation: [
    'AUTH_API_KEY_VALIDATE_RATE',
    'AUTH_LOGIN_RATE_LIMIT',
    'AUTH_PASSWORD_MIN_LENGTH',
    'AUTH_PASSWORD_MAX_LENGTH'
  ],
  
  // Redis连接配置
  redis: [
    'AUTH_REDIS_CONNECTION_TIMEOUT',
    'AUTH_REDIS_COMMAND_TIMEOUT'
  ],
  
  // 复杂度限制
  complexity: [
    'AUTH_MAX_OBJECT_DEPTH',
    'AUTH_MAX_OBJECT_FIELDS',
    'AUTH_MAX_PAYLOAD_SIZE'
  ]
};

// 配置重叠检查规则
const OVERLAP_CHECK_RULES = {
  ttlConfigs: {
    description: 'TTL配置重叠检查',
    patterns: [
      /CACHE_TTL/,
      /TTL_SECONDS/,
      /cacheTtl/,
      /_TTL/
    ],
    allowedSources: ['auth-cache.config.ts', 'compatibility-wrapper.ts'],
    maxOccurrences: 2 // 只允许在配置文件和包装器中出现
  },
  
  rateLimits: {
    description: '频率限制配置重叠检查',
    patterns: [
      /RATE_LIMIT/,
      /LIMIT_PER_/,
      /rateLimit/,
      /PER_MINUTE/,
      /PER_SECOND/
    ],
    allowedSources: ['auth-limits.config.ts', 'rate-limiting.constants.ts', 'compatibility-wrapper.ts'],
    maxOccurrences: 3
  },
  
  stringLimits: {
    description: '字符串长度限制重叠检查',
    patterns: [
      /MAX_STRING_LENGTH/,
      /MAX_.*_LENGTH/,
      /STRING_LIMIT/,
      /maxStringLength/
    ],
    allowedSources: ['auth-limits.config.ts', 'compatibility-wrapper.ts'],
    maxOccurrences: 2
  },
  
  timeouts: {
    description: '超时配置重叠检查',
    patterns: [
      /TIMEOUT/,
      /timeout/,
      /_TIMEOUT_/,
      /TimeoutMs/
    ],
    allowedSources: ['auth-limits.config.ts', 'compatibility-wrapper.ts'],
    maxOccurrences: 2
  }
};

class AuthConfigConsistencyChecker {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.fixIssues = options.fixIssues || false;
    this.baseDir = process.cwd();
    this.issues = [];
    this.warnings = [];
    this.suggestions = [];
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (level === 'error') {
      console.error(`${prefix} ${message}`);
    } else if (level === 'warn') {
      console.warn(`${prefix} ${message}`);
    } else if (this.verbose || level === 'info') {
      console.log(`${prefix} ${message}`);
    }
  }

  addIssue(type, description, severity = 'medium', file = null) {
    this.issues.push({
      type,
      description,
      severity,
      file,
      timestamp: new Date().toISOString()
    });
  }

  addWarning(description, file = null) {
    this.warnings.push({
      description,
      file,
      timestamp: new Date().toISOString()
    });
  }

  addSuggestion(description, action = null) {
    this.suggestions.push({
      description,
      action,
      timestamp: new Date().toISOString()
    });
  }

  // 检查文件是否存在
  checkFileExists(filePath) {
    const fullPath = path.join(this.baseDir, filePath);
    if (!fs.existsSync(fullPath)) {
      this.addIssue('missing_file', `配置文件不存在: ${filePath}`, 'high', filePath);
      return false;
    }
    return true;
  }

  // 读取文件内容
  readFileContent(filePath) {
    if (!this.checkFileExists(filePath)) {
      return null;
    }
    
    try {
      const fullPath = path.join(this.baseDir, filePath);
      return fs.readFileSync(fullPath, 'utf8');
    } catch (error) {
      this.addIssue('file_read_error', `无法读取文件: ${filePath}, 错误: ${error.message}`, 'high', filePath);
      return null;
    }
  }

  // 检查环境变量唯一性
  checkEnvironmentVariableUniqueness() {
    this.log('检查环境变量唯一性...');
    
    const allEnvVars = [];
    Object.values(EXPECTED_ENV_VARS).forEach(vars => {
      allEnvVars.push(...vars);
    });
    
    // 检查重复
    const duplicates = allEnvVars.filter((item, index) => allEnvVars.indexOf(item) !== index);
    if (duplicates.length > 0) {
      this.addIssue('env_var_duplicates', `发现重复的环境变量: ${duplicates.join(', ')}`, 'high');
    }
    
    // 检查命名规范
    allEnvVars.forEach(envVar => {
      if (!envVar.startsWith('AUTH_')) {
        this.addIssue('env_var_naming', `环境变量命名不规范: ${envVar} (应以AUTH_开头)`, 'medium');
      }
      
      if (!/^[A-Z_]+$/.test(envVar)) {
        this.addIssue('env_var_format', `环境变量格式不正确: ${envVar} (应为大写字母和下划线)`, 'medium');
      }
    });
    
    // 检查环境变量的职责单一性
    this.checkEnvironmentVariableResponsibility();
    
    this.log(`环境变量唯一性检查完成，共检查 ${allEnvVars.length} 个变量`);
  }

  // 检查环境变量职责单一性
  checkEnvironmentVariableResponsibility() {
    const responsibilityMap = new Map();
    
    Object.entries(EXPECTED_ENV_VARS).forEach(([category, vars]) => {
      vars.forEach(envVar => {
        // 提取职责关键词
        const keywords = envVar.replace('AUTH_', '').split('_');
        keywords.forEach(keyword => {
          if (!responsibilityMap.has(keyword)) {
            responsibilityMap.set(keyword, []);
          }
          responsibilityMap.get(keyword).push({ envVar, category });
        });
      });
    });
    
    // 检查职责重叠
    responsibilityMap.forEach((usage, keyword) => {
      if (usage.length > 1) {
        const categories = [...new Set(usage.map(u => u.category))];
        if (categories.length > 1) {
          this.addWarning(`关键词 "${keyword}" 跨越多个配置类别: ${categories.join(', ')}`);
        }
      }
    });
  }

  // 检查配置重叠
  checkConfigurationOverlap() {
    this.log('检查配置重叠...');
    
    const fileContents = {};
    
    // 读取所有配置文件
    [...Object.values(CONFIG_PATHS), ...Object.values(CONSTANTS_PATHS)].forEach(filePath => {
      const content = this.readFileContent(filePath);
      if (content) {
        fileContents[filePath] = content;
      }
    });
    
    // 按规则检查重叠
    Object.entries(OVERLAP_CHECK_RULES).forEach(([ruleName, rule]) => {
      this.log(`检查规则: ${rule.description}`, 'debug');
      
      const occurrences = new Map();
      
      rule.patterns.forEach(pattern => {
        Object.entries(fileContents).forEach(([filePath, content]) => {
          const matches = content.match(new RegExp(pattern.source, 'g'));
          if (matches) {
            if (!occurrences.has(pattern.source)) {
              occurrences.set(pattern.source, []);
            }
            occurrences.get(pattern.source).push({
              file: filePath,
              count: matches.length,
              matches: matches.slice(0, 5) // 只记录前5个匹配
            });
          }
        });
      });
      
      // 分析重叠
      occurrences.forEach((fileOccurrences, pattern) => {
        if (fileOccurrences.length > rule.maxOccurrences) {
          const files = fileOccurrences.map(occ => path.basename(occ.file));
          this.addIssue(
            'config_overlap',
            `${rule.description}: 模式 "${pattern}" 在 ${fileOccurrences.length} 个文件中出现，超过允许的 ${rule.maxOccurrences} 个。文件: ${files.join(', ')}`,
            'medium'
          );
        }
        
        // 检查是否在不允许的文件中出现
        const unauthorizedFiles = fileOccurrences.filter(occ => {
          const fileName = path.basename(occ.file);
          return !rule.allowedSources.some(allowed => fileName.includes(allowed));
        });
        
        if (unauthorizedFiles.length > 0) {
          const files = unauthorizedFiles.map(occ => path.basename(occ.file));
          this.addIssue(
            'unauthorized_config',
            `${rule.description}: 模式 "${pattern}" 出现在未授权的文件中: ${files.join(', ')}`,
            'high'
          );
        }
      });
    });
    
    this.log('配置重叠检查完成');
  }

  // 检查配置依赖关系
  checkConfigurationDependencies() {
    this.log('检查配置依赖关系...');
    
    // 读取统一配置文件
    const unifiedConfigContent = this.readFileContent(CONFIG_PATHS.authUnified);
    const cacheConfigContent = this.readFileContent(CONFIG_PATHS.authCache);
    const limitsConfigContent = this.readFileContent(CONFIG_PATHS.authLimits);
    const wrapperContent = this.readFileContent(CONFIG_PATHS.compatibilityWrapper);
    
    if (!unifiedConfigContent || !cacheConfigContent || !limitsConfigContent || !wrapperContent) {
      this.addIssue('dependency_check_failed', '无法读取必要的配置文件进行依赖检查', 'high');
      return;
    }
    
    // 检查导入依赖
    this.checkImportDependencies(unifiedConfigContent, 'auth-unified.config.ts');
    this.checkImportDependencies(wrapperContent, 'compatibility-wrapper.ts');
    
    // 检查配置类实例化
    if (!unifiedConfigContent.includes('AuthCacheConfigValidation') || 
        !unifiedConfigContent.includes('AuthLimitsConfigValidation')) {
      this.addIssue('missing_dependency', '统一配置文件缺少必要的配置类导入', 'high', CONFIG_PATHS.authUnified);
    }
    
    // 检查包装器的配置访问
    const expectedWrapperMethods = [
      'API_KEY_OPERATIONS',
      'PERMISSION_CHECK',
      'VALIDATION_LIMITS',
      'USER_LOGIN',
      'RATE_LIMITS',
      'SESSION_CONFIG',
      'SECURITY_CONFIG'
    ];
    
    expectedWrapperMethods.forEach(method => {
      if (!wrapperContent.includes(method)) {
        this.addIssue('missing_wrapper_method', `包装器缺少方法: ${method}`, 'medium', CONFIG_PATHS.compatibilityWrapper);
      }
    });
    
    this.log('配置依赖关系检查完成');
  }

  // 检查导入依赖
  checkImportDependencies(content, fileName) {
    const importLines = content.match(/^import\s+.*$/gm) || [];
    
    importLines.forEach(importLine => {
      // 检查相对路径导入
      const relativeImports = importLine.match(/from\s+['"](\.\.?\/[^'"]+)['"]/);
      if (relativeImports) {
        const importPath = relativeImports[1];
        // 检查导入的文件是否存在
        const fullPath = path.resolve(path.dirname(path.join(this.baseDir, 'src/auth/config', fileName)), importPath);
        if (!fs.existsSync(fullPath + '.ts') && !fs.existsSync(fullPath + '.js') && !fs.existsSync(fullPath)) {
          this.addWarning(`可能的导入路径问题: ${importLine.trim()}`, fileName);
        }
      }
    });
  }

  // 检查TypeScript编译
  checkTypeScriptCompilation() {
    this.log('检查TypeScript编译...');
    
    const configFiles = Object.values(CONFIG_PATHS);
    
    configFiles.forEach(filePath => {
      try {
        // 使用项目自定义的单文件检查命令
        const command = `DISABLE_AUTO_INIT=true npm run typecheck:file -- ${filePath}`;
        const result = execSync(command, { 
          cwd: this.baseDir, 
          encoding: 'utf8',
          stdio: 'pipe'
        });
        
        this.log(`TypeScript编译检查通过: ${filePath}`, 'debug');
      } catch (error) {
        this.addIssue(
          'typescript_error',
          `TypeScript编译错误 in ${filePath}: ${error.message}`,
          'high',
          filePath
        );
      }
    });
    
    this.log('TypeScript编译检查完成');
  }

  // 检查配置值的合理性
  checkConfigurationValues() {
    this.log('检查配置值的合理性...');
    
    // 这里可以添加对配置值范围的检查
    // 由于我们无法在Node.js脚本中直接执行TypeScript，
    // 我们将通过静态分析来检查一些基本的配置值
    
    const cacheConfigContent = this.readFileContent(CONFIG_PATHS.authCache);
    const limitsConfigContent = this.readFileContent(CONFIG_PATHS.authLimits);
    
    if (cacheConfigContent) {
      // 检查TTL值是否合理
      const ttlMatches = cacheConfigContent.match(/(?:TTL|Ttl):\s*(?:process\.env\.[A-Z_]+\s*\?\s*parseInt\([^)]+\)\s*:)?\s*(\d+)/g);
      if (ttlMatches) {
        ttlMatches.forEach(match => {
          const value = parseInt(match.match(/(\d+)$/)?.[1] || '0');
          if (value > 86400) { // 超过1天
            this.addWarning(`TTL值可能过大: ${match}`, CONFIG_PATHS.authCache);
          }
          if (value < 1) {
            this.addIssue('invalid_ttl', `TTL值无效: ${match}`, 'medium', CONFIG_PATHS.authCache);
          }
        });
      }
    }
    
    if (limitsConfigContent) {
      // 检查限制值是否合理
      const limitMatches = limitsConfigContent.match(/(?:Limit|Rate|Max).*:\s*(?:process\.env\.[A-Z_]+\s*\?\s*parseInt\([^)]+\)\s*:)?\s*(\d+)/g);
      if (limitMatches) {
        limitMatches.forEach(match => {
          const value = parseInt(match.match(/(\d+)$/)?.[1] || '0');
          if (value < 1) {
            this.addIssue('invalid_limit', `限制值无效: ${match}`, 'medium', CONFIG_PATHS.authLimits);
          }
        });
      }
    }
    
    this.log('配置值合理性检查完成');
  }

  // 生成配置一致性报告
  generateConsistencyReport() {
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: this.issues.length,
        totalWarnings: this.warnings.length,
        totalSuggestions: this.suggestions.length,
        severityBreakdown: {
          high: this.issues.filter(i => i.severity === 'high').length,
          medium: this.issues.filter(i => i.severity === 'medium').length,
          low: this.issues.filter(i => i.severity === 'low').length
        }
      },
      issues: this.issues,
      warnings: this.warnings,
      suggestions: this.suggestions,
      recommendations: this.generateRecommendations()
    };
    
    // 写入报告文件
    const reportPath = path.join(this.baseDir, 'auth-config-consistency-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    
    // 生成markdown报告
    this.generateMarkdownReport(reportData);
    
    return reportData;
  }

  // 生成建议
  generateRecommendations() {
    const recommendations = [];
    
    if (this.issues.some(i => i.type === 'config_overlap')) {
      recommendations.push({
        priority: 'high',
        action: '消除配置重叠',
        description: '将重复的配置定义合并到统一配置系统中',
        estimatedEffort: '2-4小时'
      });
    }
    
    if (this.issues.some(i => i.type === 'env_var_duplicates')) {
      recommendations.push({
        priority: 'high',
        action: '修复环境变量重复',
        description: '重命名或合并重复的环境变量',
        estimatedEffort: '1-2小时'
      });
    }
    
    if (this.warnings.length > 5) {
      recommendations.push({
        priority: 'medium',
        action: '解决配置警告',
        description: '审查并解决配置相关的警告',
        estimatedEffort: '2-3小时'
      });
    }
    
    if (this.issues.some(i => i.type === 'typescript_error')) {
      recommendations.push({
        priority: 'high',
        action: '修复TypeScript编译错误',
        description: '解决配置文件中的TypeScript编译问题',
        estimatedEffort: '1-3小时'
      });
    }
    
    return recommendations;
  }

  // 生成Markdown报告
  generateMarkdownReport(reportData) {
    const markdownContent = `# Auth配置一致性检查报告

## 概要

- **检查时间**: ${reportData.timestamp}
- **总问题数**: ${reportData.summary.totalIssues}
- **总警告数**: ${reportData.summary.totalWarnings}
- **总建议数**: ${reportData.summary.totalSuggestions}

### 问题严重性分布

- **高严重性**: ${reportData.summary.severityBreakdown.high}
- **中严重性**: ${reportData.summary.severityBreakdown.medium}
- **低严重性**: ${reportData.summary.severityBreakdown.low}

## 发现的问题

${reportData.issues.map(issue => `
### ${issue.type} (${issue.severity})

**描述**: ${issue.description}

${issue.file ? `**文件**: ${issue.file}` : ''}

**时间**: ${issue.timestamp}
`).join('\n')}

## 警告信息

${reportData.warnings.map(warning => `
- ${warning.description} ${warning.file ? `(${warning.file})` : ''}
`).join('\n')}

## 建议改进

${reportData.suggestions.map(suggestion => `
- ${suggestion.description} ${suggestion.action ? `(建议行动: ${suggestion.action})` : ''}
`).join('\n')}

## 推荐行动

${reportData.recommendations.map(rec => `
### ${rec.action} (优先级: ${rec.priority})

**描述**: ${rec.description}

**预估工作量**: ${rec.estimatedEffort}
`).join('\n')}

---

*报告生成时间: ${new Date().toLocaleString()}*
`;

    const markdownPath = path.join(this.baseDir, 'auth-config-consistency-report.md');
    fs.writeFileSync(markdownPath, markdownContent);
    
    this.log(`报告已生成: ${markdownPath}`);
  }

  // 主执行方法
  async run() {
    this.log('开始Auth配置一致性检查...');
    
    try {
      // 执行各项检查
      this.checkEnvironmentVariableUniqueness();
      this.checkConfigurationOverlap();
      this.checkConfigurationDependencies();
      this.checkTypeScriptCompilation();
      this.checkConfigurationValues();
      
      // 生成报告
      const report = this.generateConsistencyReport();
      
      // 输出摘要
      this.log('\n=== 检查完成 ===');
      this.log(`发现 ${report.summary.totalIssues} 个问题`);
      this.log(`发现 ${report.summary.totalWarnings} 个警告`);
      this.log(`生成 ${report.summary.totalSuggestions} 个建议`);
      
      if (report.summary.severityBreakdown.high > 0) {
        this.log(`⚠️  发现 ${report.summary.severityBreakdown.high} 个高严重性问题需要立即处理`, 'warn');
      }
      
      if (report.summary.totalIssues === 0 && report.summary.totalWarnings === 0) {
        this.log('🎉 配置一致性检查通过！', 'info');
      }
      
      return report;
    } catch (error) {
      this.log(`检查过程中发生错误: ${error.message}`, 'error');
      throw error;
    }
  }
}

// 命令行接口
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    fixIssues: args.includes('--fix-issues') || args.includes('-f')
  };
  
  const checker = new AuthConfigConsistencyChecker(options);
  
  checker.run()
    .then(report => {
      const exitCode = report.summary.severityBreakdown.high > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('检查失败:', error.message);
      process.exit(2);
    });
}

module.exports = AuthConfigConsistencyChecker;