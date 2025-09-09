#!/usr/bin/env bun

/**
 * Constants Usage Analysis Tool - Dual Language Version
 * 
 * Comprehensive tool that analyzes constant files usage patterns and generates reports in both English and Chinese.
 * 
 * Features:
 * 1. Scans all .ts files in the constants directory and identifies exports/imports
 * 2. Uses TypeScript AST parsing to analyze imports/exports accurately
 * 3. Searches the entire backend/src directory for constant usage
 * 4. Identifies single-reference vs multi-reference constants
 * 5. Tracks exact file paths that import each constant
 * 6. Generates comprehensive markdown reports in both English and Chinese
 * 
 * Usage:
 *   bun run tools/constants-usage-analyzer.ts [output-dir]
 * 
 * Dependencies: ts-morph (already in package.json)
 */

import { Project, Node, SyntaxKind, ExportDeclaration, VariableDeclaration } from 'ts-morph';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, relative, dirname, basename } from 'path';

// Configuration
const CONFIG = {
  CONSTANTS_DIR: '/Users/honor/Documents/code/newstockapi/backend/src/common/constants',
  BACKEND_SRC_DIR: '/Users/honor/Documents/code/newstockapi/backend/src',
  OUTPUT_DIR: process.argv[2] || '/Users/honor/Documents/code/newstockapi/backend/docs',
  OUTPUT_FILE_EN: 'constants-usage-analysis.md',
  OUTPUT_FILE_CN: '常量使用分析报告.md',
  IGNORE_PATTERNS: [
    'node_modules',
    '.git',
    'dist',
    'coverage',
    '.next',
    '__tests__',
    '.test.',
    '.spec.',
    'test/',
    'tests/'
  ],
  // Include internal constants usage within the constants system itself
  INCLUDE_INTERNAL_USAGE: true,
  // Generate both language reports
  GENERATE_DUAL_LANGUAGE: true
};

// Types
interface ConstantInfo {
  name: string;
  value?: any;
  type?: string;
  exportType: 'named' | 'default' | 'namespace';
  sourceFile: string;
  lineNumber: number;
  isExported: boolean;
  comment?: string;
}

interface UsageInfo {
  filePath: string;
  lineNumber: number;
  importType: 'named' | 'default' | 'namespace' | 'direct' | 'internal';
  importStatement: string;
  usageContext: string;
  isInternalReference?: boolean;
}

interface ConstantUsageStats {
  constant: ConstantInfo;
  usages: UsageInfo[];
  usageCount: number;
  referencingFiles: string[];
  isSingleUse: boolean;
  isUnused: boolean;
}

interface FileAnalysis {
  filePath: string;
  exports: ConstantInfo[];
  imports: { source: string; imports: string[] }[];
  totalExports: number;
  totalImports: number;
}

interface AnalysisResults {
  constantFiles: FileAnalysis[];
  constantsStats: ConstantUsageStats[];
  summary: {
    totalConstants: number;
    totalUsages: number;
    singleUseConstants: number;
    unusedConstants: number;
    multiUseConstants: number;
    averageUsagePerConstant: number;
    mostUsedConstants: ConstantUsageStats[];
    leastUsedConstants: ConstantUsageStats[];
    redundantConstants: ConstantUsageStats[];
  };
  recommendations: string[];
  recommendationsCN: string[];
  fileStats: {
    totalConstantFiles: number;
    totalSourceFiles: number;
    filesWithConstants: number;
    filesWithoutConstants: number;
  };
}

/**
 * Main analyzer class
 */
class ConstantsUsageAnalyzer {
  private project: Project;
  private constantsMap = new Map<string, ConstantInfo>();
  private usagesMap = new Map<string, UsageInfo[]>();

  constructor() {
    this.project = new Project({
      tsConfigFilePath: '/Users/honor/Documents/code/newstockapi/backend/tsconfig.json'
    });
  }

  /**
   * Main analysis entry point
   */
  async analyze(): Promise<AnalysisResults> {
    console.log('🔍 Starting constants usage analysis...');
    
    // Step 1: Discover and parse constant files
    console.log('📂 Discovering constant files...');
    const constantFiles = await this.discoverConstantFiles();
    
    // Step 2: Parse constants from files
    console.log('📋 Parsing constants...');
    const fileAnalyses: FileAnalysis[] = [];
    for (const file of constantFiles) {
      const analysis = await this.analyzeConstantFile(file);
      fileAnalyses.push(analysis);
    }
    
    // Step 3: Discover source files to analyze
    console.log('🔎 Discovering source files...');
    const sourceFiles = await this.discoverSourceFiles();
    
    // Step 4: Analyze usage in source files
    console.log('🔬 Analyzing usage patterns...');
    for (const file of sourceFiles) {
      await this.analyzeUsageInFile(file);
    }
    
    // Step 5: Generate analysis results
    console.log('📊 Generating statistics...');
    const results = this.generateAnalysisResults(fileAnalyses);
    
    console.log('✅ Analysis completed!');
    return results;
  }

  /**
   * Discover all constant files
   */
  private async discoverConstantFiles(): Promise<string[]> {
    const files: string[] = [];
    
    const scanDirectory = (dir: string) => {
      const items = readdirSync(dir);
      
      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory() && !this.isIgnored(fullPath)) {
          scanDirectory(fullPath);
        } else if (stat.isFile() && item.endsWith('.ts') && !item.endsWith('.spec.ts')) {
          files.push(fullPath);
        }
      }
    };
    
    scanDirectory(CONFIG.CONSTANTS_DIR);
    return files;
  }

  /**
   * Discover all source files to analyze
   */
  private async discoverSourceFiles(): Promise<string[]> {
    const files: string[] = [];
    
    const scanDirectory = (dir: string) => {
      const items = readdirSync(dir);
      
      for (const item of items) {
        const fullPath = join(dir, item);
        
        if (this.isIgnored(fullPath)) {
          continue;
        }
        
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (stat.isFile() && item.endsWith('.ts') && !item.endsWith('.spec.ts')) {
          files.push(fullPath);
        }
      }
    };

    scanDirectory(CONFIG.BACKEND_SRC_DIR);
    // Include constant files when INCLUDE_INTERNAL_USAGE is true
    if (CONFIG.INCLUDE_INTERNAL_USAGE) {
      return files; // Include all files, including constants themselves
    }
    return files.filter(f => !f.includes('/constants/')); // Exclude constant files themselves
  }

  /**
   * Check if path should be ignored
   */
  private isIgnored(path: string): boolean {
    return CONFIG.IGNORE_PATTERNS.some(pattern => path.includes(pattern));
  }

  /**
   * Analyze a single constant file for exports
   */
  private async analyzeConstantFile(filePath: string): Promise<FileAnalysis> {
    console.log(`  📄 Analyzing: ${relative(CONFIG.BACKEND_SRC_DIR, filePath)}`);
    
    const sourceFile = this.project.addSourceFileAtPath(filePath);
    const exports: ConstantInfo[] = [];
    const imports: { source: string; imports: string[] }[] = [];

    // Analyze imports
    sourceFile.getImportDeclarations().forEach(importDecl => {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      const importedItems: string[] = [];

      // Named imports
      const namedImports = importDecl.getNamedImports();
      namedImports.forEach(namedImport => {
        importedItems.push(namedImport.getName());
      });

      // Default import
      const defaultImport = importDecl.getDefaultImport();
      if (defaultImport) {
        importedItems.push(`default as ${defaultImport.getText()}`);
      }

      // Namespace import
      const namespaceImport = importDecl.getNamespaceImport();
      if (namespaceImport) {
        importedItems.push(`* as ${namespaceImport.getText()}`);
      }

      if (importedItems.length > 0) {
        imports.push({ source: moduleSpecifier, imports: importedItems });
      }
    });

    // Analyze exports
    this.extractExportsFromFile(sourceFile, filePath, exports);

    // Store constants in global map
    exports.forEach(constant => {
      this.constantsMap.set(constant.name, constant);
      if (!this.usagesMap.has(constant.name)) {
        this.usagesMap.set(constant.name, []);
      }
    });

    return {
      filePath,
      exports,
      imports,
      totalExports: exports.length,
      totalImports: imports.reduce((sum, imp) => sum + imp.imports.length, 0)
    };
  }

  /**
   * Extract exports from a source file using TypeScript AST
   */
  private extractExportsFromFile(sourceFile: any, filePath: string, exports: ConstantInfo[]): void {
    // Named exports
    sourceFile.getExportDeclarations().forEach((exportDecl: ExportDeclaration) => {
      exportDecl.getNamedExports().forEach((namedExport: any) => {
        const name = namedExport.getName();
        exports.push({
          name,
          exportType: 'named',
          sourceFile: filePath,
          lineNumber: namedExport.getStartLineNumber(),
          isExported: true
        });
      });
    });

    // Variable declarations with export
    sourceFile.getVariableStatements().forEach((varStatement: any) => {
      if (varStatement.hasExportKeyword()) {
        varStatement.getDeclarations().forEach((declaration: VariableDeclaration) => {
          const name = declaration.getName();
          const initializer = declaration.getInitializer();
          let value: any = undefined;
          let type: string | undefined = undefined;
          
          if (initializer) {
            type = initializer.getKindName();
            if (Node.isNumericLiteral(initializer) || Node.isStringLiteral(initializer)) {
              value = initializer.getLiteralValue();
            } else if (Node.isObjectLiteralExpression(initializer)) {
              value = this.extractObjectLiteralPreview(initializer);
            }
          }
          
          exports.push({
            name,
            value,
            type,
            exportType: 'named',
            sourceFile: filePath,
            lineNumber: declaration.getStartLineNumber(),
            isExported: true
          });
        });
      }
    });

    // Export assignments (export default)
    const defaultExportSymbol = sourceFile.getDefaultExportSymbol();
    if (defaultExportSymbol) {
      exports.push({
        name: 'default',
        exportType: 'default',
        sourceFile: filePath,
        lineNumber: 1,
        isExported: true
      });
    }
  }

  /**
   * Extract a preview of object literal values
   */
  private extractObjectLiteralPreview(obj: any): string {
    try {
      const properties: string[] = [];
      obj.getProperties().forEach((prop: any) => {
        if (Node.isPropertyAssignment(prop)) {
          const name = prop.getName();
          const initializer = prop.getInitializer();
          if (initializer) {
            properties.push(`${name}: ${initializer.getText()}`);
          }
        }
      });
      return `{ ${properties.slice(0, 3).join(', ')}${properties.length > 3 ? ', ...' : ''} }`;
    } catch (error) {
      return '{ ... }';
    }
  }

  /**
   * Analyze usage of constants in a source file
   */
  private async analyzeUsageInFile(filePath: string): Promise<void> {
    try {
      const sourceFile = this.project.addSourceFileAtPath(filePath);
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // Track imports from constants
      const constantImports = new Set<string>();
      
      sourceFile.getImportDeclarations().forEach(importDecl => {
        const moduleSpecifier = importDecl.getModuleSpecifierValue();
        
        // Check if importing from constants directory
        if (moduleSpecifier.includes('/constants') || moduleSpecifier.includes('@common/constants')) {
          // Named imports
          importDecl.getNamedImports().forEach(namedImport => {
            const importName = namedImport.getName();
            constantImports.add(importName);
            
            this.recordUsage(importName, {
              filePath,
              lineNumber: importDecl.getStartLineNumber(),
              importType: 'named',
              importStatement: importDecl.getText(),
              usageContext: 'import'
            });
          });

          // Default import
          const defaultImport = importDecl.getDefaultImport();
          if (defaultImport) {
            const importName = defaultImport.getText();
            constantImports.add(importName);
            
            this.recordUsage(importName, {
              filePath,
              lineNumber: importDecl.getStartLineNumber(),
              importType: 'default',
              importStatement: importDecl.getText(),
              usageContext: 'import'
            });
          }
        }
      });

      // Find usage of constants in the file content
      this.constantsMap.forEach((constant, constantName) => {
        const regex = new RegExp(`\\b${constantName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
        let match: RegExpExecArray | null;
        
        while ((match = regex.exec(content)) !== null) {
          const lineNumber = content.substring(0, match.index).split('\n').length;
          const line = lines[lineNumber - 1];
          
          // Skip if this is the definition line in a constants file
          if (filePath === constant.sourceFile && lineNumber === constant.lineNumber) {
            continue;
          }
          
          // Skip imports (already tracked above)
          if (line.trim().startsWith('import') || line.trim().startsWith('export')) {
            continue;
          }
          
          // Check if this is an internal reference (constant file using another constant)
          // Internal reference means the using file is also within the constants system
          const isInternalRef = filePath.includes('/constants/') && filePath.startsWith(CONFIG.CONSTANTS_DIR);
          
          this.recordUsage(constantName, {
            filePath,
            lineNumber,
            importType: isInternalRef ? 'internal' : (constantImports.has(constantName) ? 'direct' : 'direct'),
            importStatement: line.trim(),
            usageContext: this.getUsageContext(line),
            isInternalReference: isInternalRef
          });
        }
      });
    } catch (error) {
      console.warn(`  ⚠️ Warning: Could not analyze ${relative(CONFIG.BACKEND_SRC_DIR, filePath)}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Record a usage of a constant
   */
  private recordUsage(constantName: string, usage: UsageInfo): void {
    if (!this.usagesMap.has(constantName)) {
      this.usagesMap.set(constantName, []);
    }
    
    const usages = this.usagesMap.get(constantName)!;
    
    // Avoid duplicate entries
    const exists = usages.some(existing => 
      existing.filePath === usage.filePath && 
      existing.lineNumber === usage.lineNumber &&
      existing.usageContext === usage.usageContext
    );
    
    if (!exists) {
      usages.push(usage);
    }
  }

  /**
   * Get usage context from the line content
   */
  private getUsageContext(line: string): string {
    const trimmedLine = line.trim();
    
    if (trimmedLine.includes('=')) {
      return 'assignment';
    } else if (trimmedLine.includes('(')) {
      return 'function-call';
    } else if (trimmedLine.includes(':')) {
      return 'property-value';
    } else if (trimmedLine.includes('return')) {
      return 'return-statement';
    } else {
      return 'reference';
    }
  }

  /**
   * Generate comprehensive analysis results
   */
  private generateAnalysisResults(constantFiles: FileAnalysis[]): AnalysisResults {
    const constantsStats: ConstantUsageStats[] = [];
    
    // Generate stats for each constant
    this.constantsMap.forEach((constant, constantName) => {
      const usages = this.usagesMap.get(constantName) || [];
      const referencingFiles = [...new Set(usages.map(u => u.filePath))];
      
      constantsStats.push({
        constant,
        usages,
        usageCount: usages.length,
        referencingFiles,
        isSingleUse: referencingFiles.length === 1 && usages.length <= 2,
        isUnused: usages.length === 0
      });
    });

    // Sort by usage count
    constantsStats.sort((a, b) => b.usageCount - a.usageCount);

    // Generate summary
    const summary = {
      totalConstants: constantsStats.length,
      totalUsages: constantsStats.reduce((sum, stat) => sum + stat.usageCount, 0),
      singleUseConstants: constantsStats.filter(s => s.isSingleUse && !s.isUnused).length,
      unusedConstants: constantsStats.filter(s => s.isUnused).length,
      multiUseConstants: constantsStats.filter(s => !s.isSingleUse && !s.isUnused).length,
      averageUsagePerConstant: constantsStats.length > 0 
        ? constantsStats.reduce((sum, stat) => sum + stat.usageCount, 0) / constantsStats.length 
        : 0,
      mostUsedConstants: constantsStats.slice(0, 10),
      leastUsedConstants: constantsStats.filter(s => !s.isUnused).slice(-10),
      redundantConstants: constantsStats.filter(s => s.isUnused || s.isSingleUse)
    };

    // Generate recommendations in both languages
    const recommendations = this.generateRecommendations(constantsStats);
    const recommendationsCN = this.generateRecommendationsCN(constantsStats);

    // File statistics
    const allSourceFiles = new Set<string>();
    constantsStats.forEach(stat => {
      stat.referencingFiles.forEach(file => allSourceFiles.add(file));
    });

    const fileStats = {
      totalConstantFiles: constantFiles.length,
      totalSourceFiles: allSourceFiles.size,
      filesWithConstants: new Set(constantsStats.flatMap(s => s.referencingFiles)).size,
      filesWithoutConstants: 0 // Will be calculated based on total files scanned
    };

    fileStats.filesWithoutConstants = fileStats.totalSourceFiles - fileStats.filesWithConstants;

    return {
      constantFiles,
      constantsStats,
      summary,
      recommendations,
      recommendationsCN,
      fileStats
    };
  }

  /**
   * Generate recommendations based on analysis (English)
   */
  private generateRecommendations(constantsStats: ConstantUsageStats[]): string[] {
    const recommendations: string[] = [];

    // Unused constants
    const unusedCount = constantsStats.filter(s => s.isUnused).length;
    if (unusedCount > 0) {
      recommendations.push(`🗑️ **Remove ${unusedCount} unused constants** to reduce codebase bloat`);
      
      const topUnused = constantsStats.filter(s => s.isUnused).slice(0, 5);
      if (topUnused.length > 0) {
        recommendations.push(`   - Consider removing: ${topUnused.map(s => s.constant.name).join(', ')}`);
      }
    }

    // Single-use constants
    const singleUseCount = constantsStats.filter(s => s.isSingleUse && !s.isUnused).length;
    if (singleUseCount > 0) {
      recommendations.push(`⚡ **Review ${singleUseCount} single-use constants** for potential inlining or consolidation`);
      
      const topSingleUse = constantsStats.filter(s => s.isSingleUse && !s.isUnused).slice(0, 5);
      if (topSingleUse.length > 0) {
        recommendations.push(`   - Single-use: ${topSingleUse.map(s => s.constant.name).join(', ')}`);
      }
    }

    // Most used constants (good practices)
    const heavilyUsed = constantsStats.filter(s => s.usageCount >= 10);
    if (heavilyUsed.length > 0) {
      recommendations.push(`✅ **${heavilyUsed.length} constants are heavily used (10+ references)** - good centralization`);
    }

    // File organization
    const fileGroups = new Map<string, ConstantInfo[]>();
    constantsStats.forEach(stat => {
      const dir = dirname(relative(CONFIG.CONSTANTS_DIR, stat.constant.sourceFile));
      if (!fileGroups.has(dir)) {
        fileGroups.set(dir, []);
      }
      fileGroups.get(dir)!.push(stat.constant);
    });

    if (fileGroups.size > 1) {
      recommendations.push(`📁 **Constants are spread across ${fileGroups.size} subdirectories** - consider reorganization if needed`);
    }

    return recommendations;
  }

  /**
   * Generate recommendations based on analysis (Chinese)
   */
  private generateRecommendationsCN(constantsStats: ConstantUsageStats[]): string[] {
    const recommendations: string[] = [];

    // 未使用的常量
    const unusedCount = constantsStats.filter(s => s.isUnused).length;
    if (unusedCount > 0) {
      recommendations.push(`🗑️ **删除 ${unusedCount} 个未使用的常量** 以减少代码库冗余`);
      
      const topUnused = constantsStats.filter(s => s.isUnused).slice(0, 5);
      if (topUnused.length > 0) {
        recommendations.push(`   - 建议删除: ${topUnused.map(s => s.constant.name).join(', ')}`);
      }
    }

    // 单一引用常量
    const singleUseCount = constantsStats.filter(s => s.isSingleUse && !s.isUnused).length;
    if (singleUseCount > 0) {
      recommendations.push(`⚡ **审查 ${singleUseCount} 个单一引用常量** 考虑内联或合并`);
      
      const topSingleUse = constantsStats.filter(s => s.isSingleUse && !s.isUnused).slice(0, 5);
      if (topSingleUse.length > 0) {
        recommendations.push(`   - 单一引用: ${topSingleUse.map(s => s.constant.name).join(', ')}`);
      }
    }

    // 高频使用常量（良好实践）
    const heavilyUsed = constantsStats.filter(s => s.usageCount >= 10);
    if (heavilyUsed.length > 0) {
      recommendations.push(`✅ **${heavilyUsed.length} 个常量被高频使用（10次以上引用）** - 良好的集中化管理`);
    }

    // 文件组织
    const fileGroups = new Map<string, ConstantInfo[]>();
    constantsStats.forEach(stat => {
      const dir = dirname(relative(CONFIG.CONSTANTS_DIR, stat.constant.sourceFile));
      if (!fileGroups.has(dir)) {
        fileGroups.set(dir, []);
      }
      fileGroups.get(dir)!.push(stat.constant);
    });

    if (fileGroups.size > 1) {
      recommendations.push(`📁 **常量分布在 ${fileGroups.size} 个子目录中** - 如需要可考虑重新组织`);
    }

    return recommendations;
  }

  /**
   * Generate markdown report (English)
   */
  generateMarkdownReport(results: AnalysisResults): string {
    const timestamp = new Date().toISOString();
    const internalRefCount = results.constantsStats.reduce((sum, s) => sum + s.usages.filter(u => u.isInternalReference).length, 0);
    const externalRefCount = results.constantsStats.reduce((sum, s) => sum + s.usages.filter(u => !u.isInternalReference).length, 0);
    
    return `# Constants Usage Analysis Report

Generated: ${timestamp}

## 📊 Executive Summary

| Metric | Value |
|--------|-------|
| **Total Constants** | ${results.summary.totalConstants} |
| **Total Usages** | ${results.summary.totalUsages} |
| **Internal References** | ${internalRefCount} |
| **External References** | ${externalRefCount} |
| **Multi-use Constants** | ${results.summary.multiUseConstants} |
| **Single-use Constants** | ${results.summary.singleUseConstants} |
| **Unused Constants** | ${results.summary.unusedConstants} |
| **Average Usage per Constant** | ${results.summary.averageUsagePerConstant.toFixed(2)} |

### File Statistics
- **Constant Files**: ${results.fileStats.totalConstantFiles}
- **Source Files Analyzed**: ${results.fileStats.totalSourceFiles}
- **Files Using Constants**: ${results.fileStats.filesWithConstants}
- **Files Without Constants**: ${results.fileStats.filesWithoutConstants}

## 🎯 Key Recommendations

${results.recommendations.map(rec => `${rec}`).join('\n\n')}

## 📈 Most Used Constants (Top 10)

${results.summary.mostUsedConstants.map((stat, index) => `
### ${index + 1}. \`${stat.constant.name}\` (${stat.usageCount} usages)
- **Source**: \`${relative(CONFIG.BACKEND_SRC_DIR, stat.constant.sourceFile)}\`
- **Referenced by**: ${stat.referencingFiles.length} files
- **Internal references**: ${stat.usages.filter(u => u.isInternalReference).length}
- **External references**: ${stat.usages.filter(u => !u.isInternalReference).length}
`).join('')}

## 🚨 Unused Constants (${results.summary.unusedConstants} total)

${(() => {
  const unusedConstants = results.constantsStats.filter(s => s.isUnused);
  const groupedByFile = new Map<string, ConstantUsageStats[]>();
  
  unusedConstants.forEach(stat => {
    const file = relative(CONFIG.BACKEND_SRC_DIR, stat.constant.sourceFile);
    if (!groupedByFile.has(file)) {
      groupedByFile.set(file, []);
    }
    groupedByFile.get(file)!.push(stat);
  });
  
  return Array.from(groupedByFile.entries()).map(([file, constants]) => `
### File: \`${file}\`
${constants.map(stat => `- **${stat.constant.name}**
  - Line: ${stat.constant.lineNumber}
  - Type: ${stat.constant.type || 'unknown'}
  - Export: ${stat.constant.exportType}`).join('\n')}
`).join('');
})()}

## ⚠️ Single-use Constants (${results.summary.singleUseConstants} total)

${(() => {
  const singleUseConstants = results.constantsStats.filter(s => s.isSingleUse && !s.isUnused);
  return singleUseConstants.map(stat => {
    const usageFile = stat.referencingFiles[0];
    const isInternal = stat.usages[0]?.isInternalReference || false;
    
    return `
### \`${stat.constant.name}\`
- **Defined in**: \`${relative(CONFIG.BACKEND_SRC_DIR, stat.constant.sourceFile)}\`
- **Used in**: \`${relative(CONFIG.BACKEND_SRC_DIR, usageFile)}\`
- **Usage type**: ${isInternal ? 'Internal (within constants system)' : 'External'}
- **Line**: ${stat.constant.lineNumber}
`;
  }).join('');
})()}

## 🔗 Internal Dependencies Analysis

### Constants Referenced Within Constants System
${(() => {
  const internalRefs = results.constantsStats.filter(s => 
    s.usages.some(u => u.isInternalReference)
  );
  
  return internalRefs.slice(0, 20).map(stat => {
    const internalUsages = stat.usages.filter(u => u.isInternalReference);
    const internalFiles = [...new Set(internalUsages.map(u => relative(CONFIG.BACKEND_SRC_DIR, u.filePath)))];
    
    return `
#### \`${stat.constant.name}\`
- **Defined in**: \`${relative(CONFIG.BACKEND_SRC_DIR, stat.constant.sourceFile)}\`
- **Referenced by ${internalFiles.length} internal file(s)**:
${internalFiles.slice(0, 5).map(f => `  - \`${f}\``).join('\n')}${internalFiles.length > 5 ? `\n  - ... and ${internalFiles.length - 5} more files` : ''}
- **Total internal references**: ${internalUsages.length}
`;
  }).join('');
})()}

### External Components Referencing Constants System
${(() => {
  const externalRefs = results.constantsStats.filter(s => 
    s.usages.some(u => !u.isInternalReference)
  );
  
  return externalRefs.slice(0, 20).map(stat => {
    const externalUsages = stat.usages.filter(u => !u.isInternalReference);
    const externalFiles = [...new Set(externalUsages.map(u => relative(CONFIG.BACKEND_SRC_DIR, u.filePath)))];
    
    return `
#### \`${stat.constant.name}\`
- **Defined in**: \`${relative(CONFIG.BACKEND_SRC_DIR, stat.constant.sourceFile)}\`
- **Referenced by ${externalFiles.length} external component(s)**:
${externalFiles.slice(0, 5).map(f => `  - \`${f}\``).join('\n')}${externalFiles.length > 5 ? `\n  - ... and ${externalFiles.length - 5} more files` : ''}
- **Total external references**: ${externalUsages.length}
`;
  }).join('');
})()}

## 📊 Detailed Usage Statistics

### Usage Distribution
- **Heavily Used** (10+ usages): ${results.constantsStats.filter(s => s.usageCount >= 10).length} constants
- **Moderately Used** (3-9 usages): ${results.constantsStats.filter(s => s.usageCount >= 3 && s.usageCount < 10).length} constants
- **Lightly Used** (1-2 usages): ${results.constantsStats.filter(s => s.usageCount >= 1 && s.usageCount < 3).length} constants
- **Unused**: ${results.constantsStats.filter(s => s.usageCount === 0).length} constants

### File Distribution
- **Single File Usage**: ${results.constantsStats.filter(s => s.referencingFiles.length === 1).length} constants
- **Multiple Files Usage**: ${results.constantsStats.filter(s => s.referencingFiles.length > 1).length} constants
- **Widely Used** (5+ files): ${results.constantsStats.filter(s => s.referencingFiles.length >= 5).length} constants

## 📋 Action Items

### Immediate Actions
1. **Remove unused constants** - ${results.summary.unusedConstants} constants can be safely removed
2. **Review single-use constants** - Consider inlining ${results.summary.singleUseConstants} constants
3. **Document heavily used constants** - Ensure proper documentation

### Medium-term Improvements
1. **Consolidate duplicate values** - Review constants with similar purposes
2. **Organize by domain** - Group related constants together
3. **Add JSDoc comments** - Document purpose and usage

### Long-term Strategy
1. **Establish naming conventions** - Standardize constant naming patterns
2. **Implement linting rules** - Prevent constant duplication
3. **Regular audits** - Schedule periodic reviews

---

*Analysis completed on ${timestamp}*
*Tool: Constants Usage Analyzer v1.0*`;
  }

  /**
   * Generate markdown report (Chinese)
   */
  generateMarkdownReportCN(results: AnalysisResults): string {
    const timestamp = new Date().toISOString();
    const internalRefCount = results.constantsStats.reduce((sum, s) => sum + s.usages.filter(u => u.isInternalReference).length, 0);
    const externalRefCount = results.constantsStats.reduce((sum, s) => sum + s.usages.filter(u => !u.isInternalReference).length, 0);
    
    return `# 常量使用分析报告

生成时间: ${timestamp}

## 📊 执行摘要

| 指标 | 数值 | 说明 |
|------|------|------|
| **常量总数** | ${results.summary.totalConstants} | 系统中定义的所有常量 |
| **总引用次数** | ${results.summary.totalUsages} | 所有常量被引用的总次数 |
| **内部引用** | ${internalRefCount} (${results.summary.totalUsages > 0 ? ((internalRefCount / results.summary.totalUsages) * 100).toFixed(1) : 0}%) | 常量系统内部的相互引用 |
| **外部引用** | ${externalRefCount} (${results.summary.totalUsages > 0 ? ((externalRefCount / results.summary.totalUsages) * 100).toFixed(1) : 0}%) | 外部代码对常量的引用 |
| **多引用常量** | ${results.summary.multiUseConstants} | 被多个文件引用的常量 |
| **单引用常量** | ${results.summary.singleUseConstants} | 仅被一个文件引用的常量 |
| **未使用常量** | ${results.summary.unusedConstants} | 完全没有被引用的常量 |
| **平均引用次数** | ${results.summary.averageUsagePerConstant.toFixed(2)} | 每个常量的平均使用次数 |

### 文件统计
- **常量文件数**: ${results.fileStats.totalConstantFiles}
- **分析的源文件数**: ${results.fileStats.totalSourceFiles}
- **使用常量的文件数**: ${results.fileStats.filesWithConstants}
- **未使用常量的文件数**: ${results.fileStats.filesWithoutConstants}

## 🎯 关键建议

${results.recommendationsCN.map(rec => `${rec}`).join('\n\n')}

## 📈 最常用的常量（前10个）

${results.summary.mostUsedConstants.map((stat, index) => `
### ${index + 1}. \`${stat.constant.name}\` (${stat.usageCount} 次使用)
- **定义位置**: \`${relative(CONFIG.BACKEND_SRC_DIR, stat.constant.sourceFile)}\`
- **被引用文件数**: ${stat.referencingFiles.length} 个文件
- **内部引用**: ${stat.usages.filter(u => u.isInternalReference).length} 次
- **外部引用**: ${stat.usages.filter(u => !u.isInternalReference).length} 次
`).join('')}

## 🚨 未使用的常量（共 ${results.summary.unusedConstants} 个）

${(() => {
  const unusedConstants = results.constantsStats.filter(s => s.isUnused);
  const groupedByFile = new Map<string, ConstantUsageStats[]>();
  
  unusedConstants.forEach(stat => {
    const file = relative(CONFIG.BACKEND_SRC_DIR, stat.constant.sourceFile);
    if (!groupedByFile.has(file)) {
      groupedByFile.set(file, []);
    }
    groupedByFile.get(file)!.push(stat);
  });
  
  return Array.from(groupedByFile.entries()).map(([file, constants]) => `
### 文件: \`${file}\`
${constants.map(stat => `- **${stat.constant.name}**
  - 行号: ${stat.constant.lineNumber}
  - 类型: ${stat.constant.type || '未知'}
  - 导出方式: ${stat.constant.exportType}`).join('\n')}
`).join('');
})()}

## ⚠️ 单一引用常量（共 ${results.summary.singleUseConstants} 个）

${(() => {
  const singleUseConstants = results.constantsStats.filter(s => s.isSingleUse && !s.isUnused);
  return singleUseConstants.map(stat => {
    const usageFile = stat.referencingFiles[0];
    const isInternal = stat.usages[0]?.isInternalReference || false;
    
    return `
### \`${stat.constant.name}\`
- **定义位置**: \`${relative(CONFIG.BACKEND_SRC_DIR, stat.constant.sourceFile)}\`
- **使用位置**: \`${relative(CONFIG.BACKEND_SRC_DIR, usageFile)}\`
- **使用类型**: ${isInternal ? '内部引用（常量系统内）' : '外部引用'}
- **定义行号**: ${stat.constant.lineNumber}
`;
  }).join('');
})()}

## 🔗 内部依赖分析

### 常量系统内部引用关系
${(() => {
  const internalRefs = results.constantsStats.filter(s => 
    s.usages.some(u => u.isInternalReference)
  );
  
  return internalRefs.slice(0, 20).map(stat => {
    const internalUsages = stat.usages.filter(u => u.isInternalReference);
    const internalFiles = [...new Set(internalUsages.map(u => relative(CONFIG.BACKEND_SRC_DIR, u.filePath)))];
    
    return `
#### \`${stat.constant.name}\`
- **定义在**: \`${relative(CONFIG.BACKEND_SRC_DIR, stat.constant.sourceFile)}\`
- **被 ${internalFiles.length} 个内部文件引用**:
${internalFiles.slice(0, 5).map(f => `  - \`${f}\``).join('\n')}${internalFiles.length > 5 ? `\n  - ... 还有 ${internalFiles.length - 5} 个文件` : ''}
- **内部引用总次数**: ${internalUsages.length}
`;
  }).join('');
})()}

### 外部组件引用常量系统的引用关系
${(() => {
  const externalRefs = results.constantsStats.filter(s => 
    s.usages.some(u => !u.isInternalReference)
  );
  
  return externalRefs.slice(0, 20).map(stat => {
    const externalUsages = stat.usages.filter(u => !u.isInternalReference);
    const externalFiles = [...new Set(externalUsages.map(u => relative(CONFIG.BACKEND_SRC_DIR, u.filePath)))];
    
    return `
#### \`${stat.constant.name}\`
- **定义在**: \`${relative(CONFIG.BACKEND_SRC_DIR, stat.constant.sourceFile)}\`
- **被 ${externalFiles.length} 个外部组件引用**:
${externalFiles.slice(0, 5).map(f => `  - \`${f}\``).join('\n')}${externalFiles.length > 5 ? `\n  - ... 还有 ${externalFiles.length - 5} 个文件` : ''}
- **外部引用总次数**: ${externalUsages.length}
`;
  }).join('');
})()}

## 🎯 基于四个定义的分析

### 1. 通用常量（被多个系统组件使用）
${(() => {
  const commonConstants = results.constantsStats.filter(s => s.referencingFiles.length >= 5 && !s.isUnused);
  return commonConstants.slice(0, 10).map(stat => 
    `- \`${stat.constant.name}\`: ${stat.usageCount}次使用，${stat.referencingFiles.length}个文件
  - 定义在: \`${relative(CONFIG.BACKEND_SRC_DIR, stat.constant.sourceFile)}\``
  ).join('\n');
})()}

### 2. 组内常量（仅被组件内部使用）
${(() => {
  const internalConstants = results.constantsStats.filter(s => 
    s.usages.length > 0 && s.usages.every(u => u.isInternalReference)
  );
  return internalConstants.slice(0, 10).map(stat => 
    `- \`${stat.constant.name}\`: 仅在常量系统内部使用，${stat.usageCount}次引用
  - 定义在: \`${relative(CONFIG.BACKEND_SRC_DIR, stat.constant.sourceFile)}\``
  ).join('\n');
})()}

### 3. 被引用常量文件分析
${(() => {
  const fileUsageMap = new Map<string, { count: number; constants: string[] }>();
  results.constantsStats.forEach(stat => {
    const file = relative(CONFIG.BACKEND_SRC_DIR, stat.constant.sourceFile);
    if (!fileUsageMap.has(file)) {
      fileUsageMap.set(file, { count: 0, constants: [] });
    }
    const data = fileUsageMap.get(file)!;
    data.count += stat.usageCount;
    data.constants.push(stat.constant.name);
  });
  
  const sortedFiles = Array.from(fileUsageMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);
  
  return sortedFiles.map(([file, data]) => 
    `- \`${file}\`
  - 被引用 ${data.count} 次
  - 包含 ${data.constants.length} 个常量`
  ).join('\n');
})()}

### 4. 引用文件分析（最依赖常量的文件）
${(() => {
  const fileReferenceMap = new Map<string, Set<string>>();
  results.constantsStats.forEach(stat => {
    stat.referencingFiles.forEach(file => {
      if (!fileReferenceMap.has(file)) {
        fileReferenceMap.set(file, new Set());
      }
      fileReferenceMap.get(file)!.add(stat.constant.name);
    });
  });
  
  const sortedReferences = Array.from(fileReferenceMap.entries())
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 10);
  
  return sortedReferences.map(([file, constants]) => {
    const filePath = relative(CONFIG.BACKEND_SRC_DIR, file);
    const topConstants = Array.from(constants).slice(0, 3);
    return `- \`${filePath}\`
  - 引用了 ${constants.size} 个常量
  - 主要引用: ${topConstants.map(c => `\`${c}\``).join(', ')}`;
  }).join('\n');
})()}

## 📊 详细使用统计

### 使用频率分布
- **高频使用** (10+次): ${results.constantsStats.filter(s => s.usageCount >= 10).length} 个常量
- **中频使用** (3-9次): ${results.constantsStats.filter(s => s.usageCount >= 3 && s.usageCount < 10).length} 个常量
- **低频使用** (1-2次): ${results.constantsStats.filter(s => s.usageCount >= 1 && s.usageCount < 3).length} 个常量
- **未使用**: ${results.constantsStats.filter(s => s.usageCount === 0).length} 个常量

### 文件分布情况
- **单文件使用**: ${results.constantsStats.filter(s => s.referencingFiles.length === 1).length} 个常量
- **多文件使用**: ${results.constantsStats.filter(s => s.referencingFiles.length > 1).length} 个常量
- **广泛使用** (5+文件): ${results.constantsStats.filter(s => s.referencingFiles.length >= 5).length} 个常量

## 📋 行动项

### 立即行动
1. **删除未使用的常量** - ${results.summary.unusedConstants} 个常量可以安全删除
2. **审查单一引用常量** - 考虑内联 ${results.summary.singleUseConstants} 个常量
3. **文档化高频使用常量** - 确保适当的文档说明

### 中期改进
1. **建立常量分类标准** - 区分通用常量、组内常量和私有常量
2. **实施命名规范** - 统一常量命名模式
3. **添加使用文档** - 为高频使用常量添加JSDoc注释

### 长期策略
1. **建立常量审查机制** - 定期运行分析工具
2. **实施自动化检查** - 在CI/CD中集成常量检查
3. **制定常量治理规则** - 规范常量的创建、修改和删除流程

---

*分析完成时间: ${timestamp}*
*工具版本: Constants Usage Analyzer v1.0*`;
  }
}

/**
 * Main execution
 */
async function main() {
  const outputDir = CONFIG.OUTPUT_DIR;
  const outputFileEn = join(outputDir, CONFIG.OUTPUT_FILE_EN);
  const outputFileCn = join(outputDir, CONFIG.OUTPUT_FILE_CN);

  console.log('🚀 Constants Usage Analyzer v1.0');
  console.log(`📂 Analyzing constants in: ${CONFIG.CONSTANTS_DIR}`);
  console.log(`🔍 Searching usage in: ${CONFIG.BACKEND_SRC_DIR}`);
  console.log(`📄 Output directory: ${outputDir}`);
  console.log(`📝 Generating dual language reports...`);
  console.log('');

  try {
    const analyzer = new ConstantsUsageAnalyzer();
    const results = await analyzer.analyze();
    
    // Generate and save English report
    const reportEn = analyzer.generateMarkdownReport(results);
    writeFileSync(outputFileEn, reportEn);
    console.log(`\n✅ English report saved to: ${outputFileEn}`);
    
    // Generate and save Chinese report
    const reportCn = analyzer.generateMarkdownReportCN(results);
    writeFileSync(outputFileCn, reportCn);
    console.log(`✅ Chinese report saved to: ${outputFileCn}`);
    
    // Print summary
    console.log('\n📊 Analysis Results:');
    console.log(`   - Total Constants: ${results.summary.totalConstants}`);
    console.log(`   - Total Usages: ${results.summary.totalUsages}`);
    console.log(`   - Unused Constants: ${results.summary.unusedConstants}`);
    console.log(`   - Single-use Constants: ${results.summary.singleUseConstants}`);
    console.log(`   - Multi-use Constants: ${results.summary.multiUseConstants}`);
    console.log(`   - Average Usage: ${results.summary.averageUsagePerConstant.toFixed(2)}`);
    
    // Print key recommendations
    console.log('\n🎯 Key Recommendations:');
    results.recommendations.slice(0, 4).forEach(rec => {
      console.log(`   ${rec}`);
    });
    
  } catch (error) {
    console.error('❌ Error during analysis:', error);
    process.exit(1);
  }
}

// Run the analyzer
main().catch(console.error);