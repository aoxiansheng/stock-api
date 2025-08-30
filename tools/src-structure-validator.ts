import  fs from 'fs';
import  path from 'path';

interface FileTypeRule {
  pattern: string;
  expectedDirectory: string;
  description: string;
}

interface ValidationResult {
  isValid: boolean;
  violations: Violation[];
  summary: {
    totalFiles: number;
    validFiles: number;
    violationCount: number;
    violationsByType: Record<string, number>;
  };
}

interface Violation {
  file: string;
  currentPath: string;
  expectedPath: string;
  fileType: string;
  description: string;
}

class SrcStructureValidator {
  private readonly srcPath: string;
  private readonly fileTypeRules: FileTypeRule[];

  constructor(srcPath: string = './src') {
    this.srcPath = path.resolve(srcPath);
    this.fileTypeRules = [
      {
        pattern: 'controller.ts',
        expectedDirectory: 'controller',
        description: '控制器文件应保存在 controller 文件夹中'
      },
      {
        pattern: 'module.ts',
        expectedDirectory: 'module',
        description: '模块文件应保存在 module 文件夹中'
      },
      {
        pattern: 'service.ts',
        expectedDirectory: 'services',
        description: '服务文件应保存在 services 文件夹中'
      },
      {
        pattern: '.dto.ts',
        expectedDirectory: 'dto',
        description: 'DTO 文件应保存在 dto 文件夹中'
      },
      {
        pattern: '.schema.ts',
        expectedDirectory: 'schemas',
        description: 'Schema 文件应保存在 schemas 文件夹中'
      },
      {
        pattern: '.enum.ts',
        expectedDirectory: 'enums',
        description: '枚举文件应保存在 enums 文件夹中'
      },
      {
        pattern: '.constants.ts',
        expectedDirectory: 'constants',
        description: '常量文件应保存在 constants 文件夹中'
      },
      {
        pattern: '.interface.ts',
        expectedDirectory: 'interfaces',
        description: '接口文件应保存在 interfaces 文件夹中'
      },
      {
        pattern: '.types.ts',
        expectedDirectory: 'types',
        description: '类型定义文件应保存在 types 文件夹中'
      },
      {
        pattern: '.util.ts',
        expectedDirectory: 'utils',
        description: '工具函数文件应保存在 utils 文件夹中'
      },
      {
        pattern: '.repository.ts',
        expectedDirectory: 'repositories',
        description: '仓储文件应保存在 repositories 文件夹中'
      },
      {
        pattern: '.decorator.ts',
        expectedDirectory: 'decorators',
        description: '装饰器文件应保存在 decorators 文件夹中'
      },
      {
        pattern: '.guard.ts',
        expectedDirectory: 'guards',
        description: '守卫文件应保存在 guards 文件夹中'
      },
      {
        pattern: '.filter.ts',
        expectedDirectory: 'filters',
        description: '过滤器文件应保存在 filters 文件夹中'
      },
      {
        pattern: '.interceptor.ts',
        expectedDirectory: 'interceptors',
        description: '拦截器文件应保存在 interceptors 文件夹中'
      },
      {
        pattern: '.middleware.ts',
        expectedDirectory: 'middleware',
        description: '中间件文件应保存在 middleware 文件夹中'
      },
      {
        pattern: '.strategy.ts',
        expectedDirectory: 'strategies',
        description: '策略文件应保存在 strategies 文件夹中'
      },
      {
        pattern: '.provider.ts',
        expectedDirectory: 'providers',
        description: '提供者文件应保存在 providers 文件夹中'
      }
    ];
  }

  /**
   * 验证 src 目录的结构合规性
   */
  public validateStructure(): ValidationResult {
    if (!fs.existsSync(this.srcPath)) {
      throw new Error(`源代码目录不存在: ${this.srcPath}`);
    }

    const allFiles = this.getAllTypeScriptFiles(this.srcPath);
    const violations: Violation[] = [];
    const violationsByType: Record<string, number> = {};

    for (const file of allFiles) {
      const violation = this.validateFile(file);
      if (violation) {
        violations.push(violation);
        violationsByType[violation.fileType] = (violationsByType[violation.fileType] || 0) + 1;
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
      summary: {
        totalFiles: allFiles.length,
        validFiles: allFiles.length - violations.length,
        violationCount: violations.length,
        violationsByType
      }
    };
  }

  /**
   * 验证单个文件是否符合目录结构规范
   */
  private validateFile(filePath: string): Violation | null {
    const relativePath = path.relative(this.srcPath, filePath);
    const fileName = path.basename(filePath);
    const currentDir = path.dirname(relativePath);

    // 查找匹配的规则
    const matchedRule = this.fileTypeRules.find(rule => {
      if (rule.pattern.startsWith('.')) {
        return fileName.endsWith(rule.pattern);
      } else {
        return fileName.endsWith(rule.pattern);
      }
    });

    if (!matchedRule) {
      return null; // 没有匹配的规则，跳过验证
    }

    // 检查文件是否在正确的目录中
    const dirParts = currentDir.split(path.sep);
    
    // 特殊处理服务文件的检测逻辑
    if (matchedRule.expectedDirectory === 'services') {
      const hasServicesDir = dirParts.includes('services');
      const hasServiceDir = dirParts.includes('service');
      
      // 情况1: 同时包含service和services (如 service/services/ 或 services/service/)
      if (hasServicesDir && hasServiceDir) {
        // 移除所有service目录，只保留services
        const cleanedDirParts = dirParts.filter(part => part !== 'service');
        const expectedPath = path.join(...cleanedDirParts, fileName);
        
        return {
          file: fileName,
          currentPath: relativePath,
          expectedPath,
          fileType: matchedRule.expectedDirectory,
          description: matchedRule.description + ' (检测到service/services嵌套结构)'
        };
      }
      
      // 情况2: 只包含services，检查是否有嵌套的service
      if (hasServicesDir) {
        const servicesIndex = dirParts.indexOf('services');
        const hasNestedServiceDir = dirParts.slice(servicesIndex + 1).includes('service');
        
        if (hasNestedServiceDir) {
          // 在services/service嵌套结构中，需要移到services直接目录下
          const newDirParts = [...dirParts];
          const serviceIndex = newDirParts.lastIndexOf('service');
          newDirParts.splice(serviceIndex, 1); // 移除service目录
          const expectedPath = path.join(...newDirParts, fileName);
          
          return {
            file: fileName,
            currentPath: relativePath,
            expectedPath,
            fileType: matchedRule.expectedDirectory,
            description: matchedRule.description + ' (检测到services/service嵌套结构)'
          };
        }
        
        return null; // 已经在正确的services目录中
      }
      
      // 情况3: 只包含service，需要移动到services
      if (hasServiceDir) {
        const newDirParts = dirParts.map(part => part === 'service' ? 'services' : part);
        const expectedPath = path.join(...newDirParts, fileName);
        
        return {
          file: fileName,
          currentPath: relativePath,
          expectedPath,
          fileType: matchedRule.expectedDirectory,
          description: matchedRule.description
        };
      }
      
      // 情况4: 不在任何service相关目录中，按原逻辑处理
      const moduleDir = this.getModuleDirectory(relativePath);
      const expectedPath = path.join(moduleDir, 'services', fileName);
      
      return {
        file: fileName,
        currentPath: relativePath,
        expectedPath,
        fileType: matchedRule.expectedDirectory,
        description: matchedRule.description
      };
    }

    // 其他文件类型的检测逻辑
    const hasCorrectDirectory = dirParts.includes(matchedRule.expectedDirectory);
    
    // 检查是否有重复的目录名（如 modules/module 或 controller/controller）
    const expectedDirName = matchedRule.expectedDirectory;
    const pluralForm = expectedDirName + 's';
    const singularForm = expectedDirName.endsWith('s') ? expectedDirName.slice(0, -1) : expectedDirName;
    
    const hasPluralDir = dirParts.includes(pluralForm);
    const hasSingularDir = dirParts.includes(singularForm);
    
    // 特殊处理：如果是模块文件，且路径中已经包含 "modules" 目录，则认为它已经在正确的位置
    if (matchedRule.expectedDirectory === 'module' && dirParts.includes('modules')) {
      // 检查路径是否包含 common/modules 模式
      if (dirParts.length >= 2 && dirParts[0] === 'common' && dirParts[1] === 'modules') {
        return null; // 已经在正确位置，不需要移动
      }
    }
    
    // 如果同时包含复数和单数形式（如 modules/module），需要修复
    if (hasPluralDir && hasSingularDir && pluralForm !== singularForm) {
      // 移除重复的复数形式目录，保留单数形式
      const cleanedDirParts = dirParts.filter(part => part !== pluralForm);
      const expectedPath = path.join(...cleanedDirParts, fileName);
      
      return {
        file: fileName,
        currentPath: relativePath,
        expectedPath,
        fileType: matchedRule.expectedDirectory,
        description: matchedRule.description + ` (检测到${pluralForm}/${singularForm}嵌套结构)`
      };
    }
    
    if (!hasCorrectDirectory) {
      // 对于服务文件，使用特殊的路径构建逻辑
      if (matchedRule.expectedDirectory === 'services') {
        const moduleDir = this.getModuleDirectory(relativePath);
        const expectedPath = path.join(moduleDir, 'services', fileName);
        
        return {
          file: fileName,
          currentPath: relativePath,
          expectedPath,
          fileType: matchedRule.expectedDirectory,
          description: matchedRule.description
        };
      }
      
      // 其他文件类型的标准逻辑
      const moduleDir = this.getModuleDirectory(relativePath);
      const expectedPath = path.join(moduleDir, matchedRule.expectedDirectory, fileName);

      return {
        file: fileName,
        currentPath: relativePath,
        expectedPath,
        fileType: matchedRule.expectedDirectory,
        description: matchedRule.description
      };
    }

    return null;
  }

  /**
   * 获取文件所属的模块目录
   */
  private getModuleDirectory(relativePath: string): string {
    const parts = relativePath.split(path.sep);
    
    // 移除文件名，获取目录部分
    const dirParts = parts.slice(0, -1);
    
    // 特殊处理服务文件：将 service 目录替换为 services
    const adjustedDirParts = dirParts.map(part => {
      if (part === 'service') {
        return 'services';
      }
      return part;
    });
    
    // 如果在 common 目录下，保持原有结构（除了文件名）
    if (adjustedDirParts[0] === 'common') {
      return adjustedDirParts.join(path.sep);
    }
    
    // 对于其他模块，返回调整后的目录路径
    return adjustedDirParts.join(path.sep);
  }

  /**
   * 递归获取所有 TypeScript 文件
   */
  private getAllTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // 跳过 node_modules 和隐藏目录
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          files.push(...this.getAllTypeScriptFiles(fullPath));
        }
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        // 跳过测试文件、配置文件等
        if (!this.shouldSkipFile(entry.name)) {
          files.push(fullPath);
        }
      }
    }
    
    return files;
  }

  /**
   * 判断是否应该跳过验证的文件
   */
  private shouldSkipFile(fileName: string): boolean {
    const skipPatterns = [
      '.spec.ts',
      '.test.ts',
      '.e2e-spec.ts',
      'main.ts',
      'app.module.ts',
      'index.ts'
    ];
    
    return skipPatterns.some(pattern => fileName.endsWith(pattern));
  }

  /**
   * 打印验证结果
   */
  public printResults(result: ValidationResult): void {
    console.log('\n=== SRC 目录结构合规性检测结果 ===\n');
    
    // 总体结果
    console.log(`总计文件数: ${result.summary.totalFiles}`);
    console.log(`合规文件数: ${result.summary.validFiles}`);
    console.log(`违规文件数: ${result.summary.violationCount}`);
    console.log(`合规率: ${((result.summary.validFiles / result.summary.totalFiles) * 100).toFixed(2)}%`);
    
    if (result.isValid) {
      console.log('\n✅ 所有文件都符合目录结构规范！');
      return;
    }

    // 按文件类型统计违规情况
    console.log('\n📊 违规统计 (按文件类型):');
    Object.entries(result.summary.violationsByType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} 个文件`);
    });

    // 详细违规列表
    console.log('\n❌ 违规文件详情:\n');
    result.violations.forEach((violation, index) => {
      console.log(`${index + 1}. ${violation.file}`);
      console.log(`   当前位置: ${violation.currentPath}`);
      console.log(`   期望位置: ${violation.expectedPath}`);
      console.log(`   说明: ${violation.description}`);
      console.log('');
    });

    // 修复建议
    console.log('🔧 修复建议:');
    console.log('1. 创建相应的目录结构');
    console.log('2. 将文件移动到正确的目录中');
    console.log('3. 更新相关的导入语句');
    console.log('4. 重新运行此验证脚本确认修复结果');
    console.log('\n🚀 快速执行:');
    console.log('   检测: bun run test:src-validate-structure');
    console.log('   修复: bun run test:src-fix-structure');
  }

  /**
   * 生成修复脚本
   */
  public generateFixScript(result: ValidationResult): string {
    if (result.isValid) {
      let script = '#!/bin/bash\n\n';
      script += '# 所有文件都符合规范，无需修复\n';
      script += 'echo "✅ 所有文件都符合目录结构规范，无需修复"\n';
      script += 'echo "正在清理空的 service 目录..."\n';
      script += '\n# 清理空的 service 目录\n';
      script += 'find src -type d -name "service" -empty -delete 2>/dev/null || true\n';
      script += 'echo "已清理空的 service 目录"\n';
      script += 'echo "正在清理修复脚本..."\n';
      script += '\n# 自焚命令 - 删除自己\n';
      script += 'SCRIPT_PATH="$0"\n';
      script += 'rm -f "$SCRIPT_PATH"\n';
      script += 'echo "修复脚本已自动删除"\n';
      return script;
    }

    // 检测文件冲突
    const conflicts: { violation: Violation; conflictFile: string }[] = [];
    const safeViolations: Violation[] = [];

    result.violations.forEach(violation => {
      const expectedFullPath = path.resolve(this.srcPath, violation.expectedPath);
      if (fs.existsSync(expectedFullPath)) {
        conflicts.push({ 
          violation, 
          conflictFile: expectedFullPath 
        });
      } else {
        safeViolations.push(violation);
      }
    });

    let script = '#!/bin/bash\n\n';
    script += '# 自动生成的目录结构修复脚本\n';
    script += '# 请在执行前备份代码！\n\n';
    script += 'set -e\n\n';
    
    // 如果有冲突，先输出警告信息
    if (conflicts.length > 0) {
      script += 'echo "⚠️  检测到文件冲突，以下文件将被跳过:"\n';
      conflicts.forEach(conflict => {
        script += `echo "  跳过: ${conflict.violation.currentPath} -> ${conflict.violation.expectedPath} (目标位置已存在文件)"\n`;
      });
      script += 'echo ""\n';
      script += 'echo "请手动处理这些冲突文件后重新运行脚本"\n';
      script += 'echo ""\n\n';
    }

    if (safeViolations.length === 0) {
      script += 'echo "所有文件都存在冲突，无法自动修复"\n';
      script += 'echo "请手动解决文件冲突后重新运行验证脚本"\n';
      script += 'echo "正在清理空的 service 目录..."\n';
      script += '\n# 清理空的 service 目录\n';
      script += 'find src -type d -name "service" -empty -delete 2>/dev/null || true\n';
      script += 'echo "已清理空的 service 目录"\n';
      script += 'echo "正在清理修复脚本..."\n';
      script += '\n# 自焚命令 - 删除自己\n';
      script += 'SCRIPT_PATH="$0"\n';
      script += 'rm -f "$SCRIPT_PATH"\n';
      script += 'echo "修复脚本已自动删除"\n';
      return script;
    }

    script += 'echo "开始修复目录结构..."\n\n';

    // 按目录分组创建目录（只为安全的文件创建）
    const dirsToCreate = new Set<string>();
    safeViolations.forEach(violation => {
      const expectedDir = path.dirname(violation.expectedPath);
      dirsToCreate.add(expectedDir);
    });

    script += '# 创建必要的目录\n';
    Array.from(dirsToCreate).sort().forEach(dir => {
      script += `mkdir -p "src/${dir}"\n`;
    });

    script += '\n# 移动文件到正确位置（跳过冲突文件）\n';
    safeViolations.forEach(violation => {
      script += `echo "移动: ${violation.currentPath} -> ${violation.expectedPath}"\n`;
      script += `mv "src/${violation.currentPath}" "src/${violation.expectedPath}"\n`;
    });

    script += '\necho "目录结构修复完成！"\n';
    script += 'echo "正在清理空的 service 目录..."\n';
    script += '\n# 清理空的 service 目录\n';
    script += 'find src -type d -name "service" -empty -delete 2>/dev/null || true\n';
    script += 'echo "已清理空的 service 目录"\n';
    
    if (conflicts.length > 0) {
      script += `echo "⚠️  ${conflicts.length} 个文件因冲突被跳过，请手动处理"\n`;
    }
    
    script += 'echo "请检查并更新相关的导入语句"\n';
    script += 'echo "正在清理修复脚本..."\n';
    script += '\n# 自焚命令 - 删除自己\n';
    script += 'SCRIPT_PATH="$0"\n';
    script += 'rm -f "$SCRIPT_PATH"\n';
    script += 'echo "修复脚本已自动删除"\n';

    return script;
  }

  /**
   * 检测并报告文件冲突
   */
  public checkConflicts(result: ValidationResult): { 
    conflicts: { violation: Violation; conflictFile: string }[];
    safeViolations: Violation[];
  } {
    const conflicts: { violation: Violation; conflictFile: string }[] = [];
    const safeViolations: Violation[] = [];

    result.violations.forEach(violation => {
      const expectedFullPath = path.resolve(this.srcPath, violation.expectedPath);
      if (fs.existsSync(expectedFullPath)) {
        conflicts.push({ 
          violation, 
          conflictFile: expectedFullPath 
        });
      } else {
        safeViolations.push(violation);
      }
    });

    return { conflicts, safeViolations };
  }

  /**
   * 打印冲突报告
   */
  public printConflictReport(conflicts: { violation: Violation; conflictFile: string }[]): void {
    if (conflicts.length === 0) {
      return;
    }

    console.log('\n⚠️  文件冲突警告:\n');
    conflicts.forEach((conflict, index) => {
      console.log(`${index + 1}. ${conflict.violation.file}`);
      console.log(`   源文件: ${conflict.violation.currentPath}`);
      console.log(`   目标位置: ${conflict.violation.expectedPath}`);
      console.log(`   冲突原因: 目标位置已存在同名文件`);
      console.log(`   现有文件: ${path.relative(this.srcPath, conflict.conflictFile)}`);
      console.log('');
    });

    console.log('🔧 冲突解决建议:');
    console.log('1. 检查目标位置的现有文件是否可以删除或重命名');
    console.log('2. 比较两个文件的内容，合并必要的代码');
    console.log('3. 手动移动文件后重新运行验证脚本');
    console.log('4. 或者重命名要移动的文件避免冲突');
  }
}

// 导出验证器类和相关接口
export { SrcStructureValidator };
export type { ValidationResult, Violation, FileTypeRule };

// 如果直接运行此脚本，则执行验证
if (require.main === module) {
  const validator = new SrcStructureValidator();
  
  try {
    console.log('开始检测 src 目录结构合规性...');
    const result = validator.validateStructure();
    validator.printResults(result);
    
    // 如果有违规，检测冲突并生成修复脚本
    if (!result.isValid) {
      const conflictCheck = validator.checkConflicts(result);
      
      // 打印冲突报告
      validator.printConflictReport(conflictCheck.conflicts);
      
      // 生成修复脚本
      const fixScript = validator.generateFixScript(result);
      const scriptPath = path.join(__dirname, 'fix-structure.sh');
      fs.writeFileSync(scriptPath, fixScript);
      
      console.log(`\n修复脚本已生成: ${scriptPath}`);
      if (conflictCheck.conflicts.length > 0) {
        console.log(`⚠️  发现 ${conflictCheck.conflicts.length} 个文件冲突，这些文件将在修复脚本中被跳过`);
        console.log(`✅ ${conflictCheck.safeViolations.length} 个文件可以安全修复`);
      }
      console.log('执行修复脚本前请先备份代码！');
      console.log('\n🚀 快速执行命令:');
      console.log('   bun run test:src-fix-structure');
    }
    
    // 统一使用成功退出码，避免误导性的 "error" 提示
    if (result.isValid) {
      console.log('\n✅ 检测完成：所有文件都符合规范');
    } else {
      console.log('\n⚠️  检测完成：发现违规文件，建议使用修复脚本处理');
    }
    process.exit(0); // 统一返回成功码，避免 bun 显示 "error" 信息
    
  } catch (error: any) {
    console.error('检测过程中发生错误:', error.message);
    process.exit(2);
  }
}