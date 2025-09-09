#!/usr/bin/env bun

/**
 * Advanced Remove Unused Constants Tool
 * 
 * 使用 TypeScript AST 安全删除未使用的常量字段的工具
 * 
 * Features:
 * 1. 读取 constants-usage-analysis.md 报告文件
 * 2. 解析报告中标识的未使用常量
 * 3. 使用 TypeScript AST 准确识别和删除常量
 * 4. 保持文件语法正确，自动处理逗号、括号等语法问题
 * 
 * Usage:
 *   bun run tools/remove-unused-constants-advanced.ts
 *   bun run tools/remove-unused-constants-advanced.ts [report-file-path]
 */

import { Project, SyntaxKind, VariableStatement, Node, ObjectLiteralExpression } from 'ts-morph';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Configuration
const CONFIG = {
  DEFAULT_REPORT_PATH: '/Users/honor/Documents/code/newstockapi/backend/docs/constants-usage-analysis.md',
  BACKEND_SRC_DIR: '/Users/honor/Documents/code/newstockapi/backend/src',
  TSCONFIG_PATH: '/Users/honor/Documents/code/newstockapi/backend/tsconfig.json'
};

interface UnusedConstant {
  name: string;
  file: string;
  line: number;
}

/**
 * 解析报告文件，提取未使用的常量信息
 */
function parseUnusedConstants(reportPath: string): UnusedConstant[] {
  const content = readFileSync(reportPath, 'utf-8');
  const unusedConstants: UnusedConstant[] = [];
  
  console.log('🔍 开始解析报告文件...');
  
  // 将内容按行分割
  const lines = content.split('\n');
  let inUnusedSection = false;
  let currentFile = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // 检查是否进入未使用常量部分
    if (trimmedLine.startsWith('## 🚨 Unused Constants')) {
      inUnusedSection = true;
      console.log(`🔍 在行 ${i} 找到未使用常量部分: "${trimmedLine}"`);
      continue;
    }
    
    // 检查是否离开未使用常量部分（但不包括文件标题）
    if (inUnusedSection && trimmedLine.startsWith('##') && !trimmedLine.startsWith('## 🚨') && !trimmedLine.startsWith('### File:')) {
      console.log(`🔍 在行 ${i} 离开未使用常量部分: "${trimmedLine}"`);
      break;
    }
    
    // 处理文件部分
    if (inUnusedSection && trimmedLine.startsWith('### File:')) {
      const fileMatch = trimmedLine.match(/### File: `([^`]+)`/);
      if (fileMatch) {
        currentFile = fileMatch[1];
        console.log(`📁 在行 ${i} 处理文件: ${currentFile}`);
      }
      continue;
    }
    
    // 处理常量条目
    if (inUnusedSection && trimmedLine.startsWith('- **') && currentFile) {
      const constantMatch = trimmedLine.match(/- \*\*([^\*]+)\*\*/);
      if (constantMatch) {
        const name = constantMatch[1];
        
        // 查找下一行中的行号
        let lineNum = 0;
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          const lineMatch = nextLine.match(/- Line: (\d+)/);
          if (lineMatch) {
            lineNum = parseInt(lineMatch[1]);
          }
        }
        
        console.log(`  📦 在行 ${i} 发现常量: ${name} (行: ${lineNum})`);
        
        unusedConstants.push({
          name,
          file: currentFile,
          line: lineNum
        });
      }
    }
  }
  
  console.log(`📊 总共发现 ${unusedConstants.length} 个未使用常量`);
  
  // 显示前5个常量作为示例
  if (unusedConstants.length > 0) {
    console.log('📋 前5个未使用常量:');
    unusedConstants.slice(0, 5).forEach((constant, index) => {
      console.log(`  ${index + 1}. ${constant.name} (${constant.file}:${constant.line})`);
    });
  }
  
  return unusedConstants;
}

/**
 * 安全删除常量
 */
async function removeUnusedConstants(constants: UnusedConstant[]): Promise<void> {
  const project = new Project({
    tsConfigFilePath: CONFIG.TSCONFIG_PATH
  });
  
  const filesToUpdate = new Map<string, string[]>();
  
  // 按文件分组常量
  constants.forEach(constant => {
    if (!filesToUpdate.has(constant.file)) {
      filesToUpdate.set(constant.file, []);
    }
    filesToUpdate.get(constant.file)!.push(constant.name);
  });
  
  // 处理每个文件
  for (const [relativeFilePath, constantNames] of filesToUpdate.entries()) {
    const fullPath = join(CONFIG.BACKEND_SRC_DIR, relativeFilePath);
    
    if (!existsSync(fullPath)) {
      console.warn(`⚠️ 文件不存在: ${fullPath}`);
      continue;
    }
    
    console.log(`\n🔧 处理文件: ${relativeFilePath}`);
    console.log(`  需要删除的常量: ${constantNames.join(', ')}`);
    
    try {
      const sourceFile = project.addSourceFileAtPath(fullPath);
      let modified = false;
      
      // 删除每个指定的常量
      for (const constantName of constantNames) {
        console.log(`    删除常量: ${constantName}`);
        const deleted = removeConstantFromSourceFile(sourceFile, constantName);
        if (deleted) {
          modified = true;
          console.log(`      ✅ 成功删除常量: ${constantName}`);
        } else {
          console.warn(`      ⚠️ 未找到常量: ${constantName}`);
        }
      }
      
      // 如果有修改，保存文件
      if (modified) {
        await sourceFile.save();
        console.log(`  ✅ 成功更新文件: ${relativeFilePath}`);
      } else {
        console.log(`  ℹ️ 文件无变化: ${relativeFilePath}`);
      }
    } catch (error) {
      console.error(`  ❌ 更新文件失败: ${relativeFilePath}`, error);
    }
  }
}

/**
 * 从源文件中删除指定的常量
 */
function removeConstantFromSourceFile(sourceFile: any, constantName: string): boolean {
  let deleted = false;
  
  // 查找并删除 const 声明
  sourceFile.getVariableStatements().forEach((variableStatement: VariableStatement) => {
    variableStatement.getDeclarations().forEach((declaration: any) => {
      if (declaration.getName() === constantName) {
        variableStatement.remove();
        deleted = true;
      }
    });
  });
  
  // 查找并删除对象字面量中的属性
  sourceFile.forEachDescendant((node: Node) => {
    if (Node.isObjectLiteralExpression(node)) {
      const property = node.getProperty(constantName);
      if (property) {
        property.remove();
        deleted = true;
      }
    }
  });
  
  // 查找并删除 export 声明中的常量
  sourceFile.getExportDeclarations().forEach((exportDecl: any) => {
    const namedExports = exportDecl.getNamedExports();
    namedExports.forEach((namedExport: any) => {
      if (namedExport.getName() === constantName) {
        // 如果这是唯一的导出，删除整个导出声明
        if (namedExports.length === 1) {
          exportDecl.remove();
        } else {
          // 否则只删除这个命名导出
          namedExport.remove();
        }
        deleted = true;
      }
    });
  });
  
  // 查找并删除类型导出中的常量
  sourceFile.getExportDeclarations().forEach((exportDecl: any) => {
    if (exportDecl.isTypeOnly()) {
      const namedExports = exportDecl.getNamedExports();
      namedExports.forEach((namedExport: any) => {
        if (namedExport.getName() === constantName) {
          // 如果这是唯一的导出，删除整个导出声明
          if (namedExports.length === 1) {
            exportDecl.remove();
          } else {
            // 否则只删除这个命名导出
            namedExport.remove();
          }
          deleted = true;
        }
      });
    }
  });
  
  return deleted;
}

/**
 * 主执行函数
 */
async function main() {
  const reportPath = process.argv[2] || CONFIG.DEFAULT_REPORT_PATH;
  
  console.log('🚀 高级未使用常量清理工具 v1.0');
  console.log(`📂 报告文件: ${reportPath}`);
  console.log(`📂 源码目录: ${CONFIG.BACKEND_SRC_DIR}`);
  console.log(`📂 TS配置文件: ${CONFIG.TSCONFIG_PATH}`);
  console.log('');
  
  if (!existsSync(reportPath)) {
    console.error(`❌ 报告文件不存在: ${reportPath}`);
    process.exit(1);
  }
  
  try {
    // 解析未使用的常量
    console.log('🔍 解析未使用的常量...');
    const unusedConstants = parseUnusedConstants(reportPath);
    
    if (unusedConstants.length === 0) {
      console.log('✅ 未发现未使用的常量');
      return;
    }
    
    console.log(`📊 发现 ${unusedConstants.length} 个未使用的常量`);
    
    // 显示前10个未使用的常量
    console.log('\n📋 未使用的常量列表 (前10个):');
    unusedConstants.slice(0, 10).forEach((constant, index) => {
      console.log(`  ${index + 1}. ${constant.name} (${constant.file}:${constant.line})`);
    });
    
    if (unusedConstants.length > 10) {
      console.log(`  ... 还有 ${unusedConstants.length - 10} 个`);
    }
    
    // 确认执行
    console.log('\n⚠️  警告: 此操作将永久删除这些常量');
    console.log('   请确保已备份相关文件');
    
    // 为了简化测试，我们直接执行删除而不询问用户
    console.log('\n🔧 开始删除未使用的常量...');
    await removeUnusedConstants(unusedConstants);
    console.log('\n✅ 清理完成!');
    
  } catch (error) {
    console.error('❌ 执行过程中发生错误:', error);
    process.exit(1);
  }
}

// Run the tool
main().catch(console.error);