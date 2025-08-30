#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * 重复测试文件检测和清理工具
 * 
 * 功能：
 * 1. 检测重复的测试文件
 * 2. 分析文件内容相似度
 * 3. 提供清理建议
 * 4. 可选择自动清理重复文件
 */

import  fs from 'fs';
import  path from 'path';
import  crypto from 'crypto';

interface DuplicateFile {
  path: string;
  size: number;
  hash: string;
  isCorrectLocation: boolean;
  shouldKeep: boolean;
}

interface DuplicateGroup {
  hash: string;
  files: DuplicateFile[];
  baseName: string;
}

class DuplicateFinder {
  private readonly testDir: string;
  private readonly srcDir: string;

  constructor(projectRoot: string = process.cwd()) {
    this.testDir = path.join(projectRoot, 'test/jest');
    this.srcDir = path.join(projectRoot, 'src');
  }

  /**
   * 查找重复文件
   */
  async findDuplicates(): Promise<DuplicateGroup[]> {
    console.log('🔍 开始检测重复测试文件...\n');

    const allTestFiles = this.scanTestFiles();
    const fileGroups = this.groupFilesByContent(allTestFiles);
    const duplicateGroups = fileGroups.filter(group => group.files.length > 1);

    this.printDuplicateReport(duplicateGroups);
    return duplicateGroups;
  }

  /**
   * 扫描所有测试文件
   */
  private scanTestFiles(): Array<{ path: string; relativePath: string }> {
    const files: Array<{ path: string; relativePath: string }> = [];

    const scan = (dirPath: string, basePath: string) => {
      if (!fs.existsSync(dirPath)) return;

      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scan(fullPath, basePath);
        } else if (stat.isFile() && item.endsWith('.ts')) {
          const relativePath = path.relative(basePath, fullPath);
          files.push({ path: fullPath, relativePath });
        }
      }
    };

    scan(this.testDir, this.testDir);
    return files;
  }

  /**
   * 按文件内容分组
   */
  private groupFilesByContent(files: Array<{ path: string; relativePath: string }>): DuplicateGroup[] {
    const hashMap = new Map<string, DuplicateFile[]>();

    for (const { path: filePath, relativePath } of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const hash = this.calculateContentHash(content);
        const size = content.length;
        const baseName = path.basename(filePath);

        const duplicateFile: DuplicateFile = {
          path: filePath,
          size,
          hash,
          isCorrectLocation: this.isCorrectLocation(relativePath),
          shouldKeep: false
        };

        if (!hashMap.has(hash)) {
          hashMap.set(hash, []);
        }
        hashMap.get(hash)!.push(duplicateFile);
      } catch (error) {
        console.warn(`⚠️  无法读取文件: ${filePath}`);
      }
    }

    const groups: DuplicateGroup[] = [];
    for (const [hash, files] of hashMap.entries()) {
      if (files.length > 0) {
        // 标记应该保留的文件
        this.markFilesToKeep(files);
        
        groups.push({
          hash,
          files,
          baseName: path.basename(files[0].path)
        });
      }
    }

    return groups;
  }

  /**
   * 计算文件内容哈希
   */
  private calculateContentHash(content: string): string {
    // 标准化内容以忽略空白符差异
    const normalizedContent = content
      .replace(/\s+/g, ' ')
      .replace(/\r\n/g, '\n')
      .trim();
    
    return crypto.createHash('md5').update(normalizedContent).digest('hex');
  }

  /**
   * 检查文件是否在正确位置
   */
  private isCorrectLocation(relativePath: string): boolean {
    // 检查路径是否符合预期的结构
    const pathParts = relativePath.split(path.sep);
    
    // 应该是: testType/moduleStructure/fileName
    if (pathParts.length < 2) return false;
    
    const testType = pathParts[0];
    if (!['unit', 'integration', 'e2e', 'security'].includes(testType)) return false;

    // 检查是否对应源文件结构
    let srcPath = pathParts.slice(1).join(path.sep);
    srcPath = srcPath.replace(/\.(spec|test|integration|e2e|security)\.ts$/, '.ts');
    
    const fullSrcPath = path.join(this.srcDir, srcPath);
    return fs.existsSync(fullSrcPath);
  }

  /**
   * 标记应该保留的文件
   */
  private markFilesToKeep(files: DuplicateFile[]): void {
    if (files.length <= 1) {
      if (files.length === 1) {
        files[0].shouldKeep = true;
      }
      return;
    }

    // 优先保留在正确位置的文件
    const correctLocationFiles = files.filter(f => f.isCorrectLocation);
    if (correctLocationFiles.length > 0) {
      correctLocationFiles[0].shouldKeep = true;
      return;
    }

    // 如果都不在正确位置，保留路径较深的文件（更可能是正确的）
    const sorted = files.sort((a, b) => {
      const aDepth = a.path.split(path.sep).length;
      const bDepth = b.path.split(path.sep).length;
      return bDepth - aDepth;
    });
    
    sorted[0].shouldKeep = true;
  }

  /**
   * 打印重复文件报告
   */
  private printDuplicateReport(duplicateGroups: DuplicateGroup[]): void {
    console.log('📋 重复文件检测报告');
    console.log('='.repeat(50));

    if (duplicateGroups.length === 0) {
      console.log('✅ 没有发现重复的测试文件');
      return;
    }

    console.log(`⚠️  发现 ${duplicateGroups.length} 组重复文件:\n`);

    duplicateGroups.forEach((group, index) => {
      console.log(`${index + 1}. 📄 ${group.baseName} (${group.files.length} 个副本)`);
      
      group.files.forEach(file => {
        const relativePath = path.relative(this.testDir, file.path);
        const status = file.shouldKeep ? '🟢 保留' : '🔴 删除';
        const location = file.isCorrectLocation ? '✅ 正确位置' : '❌ 错误位置';
        
        console.log(`   ${status} ${relativePath}`);
        console.log(`        ${location} | 大小: ${file.size} 字节 | 哈希: ${file.hash.substring(0, 8)}...`);
      });
      
      console.log('');
    });

    const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.files.length - 1, 0);
    console.log(`📊 统计信息:`);
    console.log(`   - 重复文件组: ${duplicateGroups.length}`);
    console.log(`   - 冗余文件数: ${totalDuplicates}`);
    console.log(`   - 可节省空间: ${this.calculateSavedSpace(duplicateGroups)} KB`);
  }

  /**
   * 计算可节省的空间
   */
  private calculateSavedSpace(duplicateGroups: DuplicateGroup[]): number {
    let savedBytes = 0;
    
    for (const group of duplicateGroups) {
      const filesToDelete = group.files.filter(f => !f.shouldKeep);
      savedBytes += filesToDelete.reduce((sum, file) => sum + file.size, 0);
    }
    
    return Math.round(savedBytes / 1024);
  }

  /**
   * 清理重复文件
   */
  async cleanupDuplicates(duplicateGroups: DuplicateGroup[], dryRun: boolean = true): Promise<void> {
    console.log(`\n🧹 ${dryRun ? '预览' : '执行'}重复文件清理...\n`);

    for (const group of duplicateGroups) {
      const filesToDelete = group.files.filter(f => !f.shouldKeep);
      
      if (filesToDelete.length === 0) {
        console.log(`⚠️  ${group.baseName}: 没有需要删除的文件`);
        continue;
      }

      console.log(`📄 处理文件组: ${group.baseName}`);
      
      for (const file of filesToDelete) {
        const relativePath = path.relative(this.testDir, file.path);
        
        if (!dryRun) {
          try {
            fs.unlinkSync(file.path);
            console.log(`✅ 删除: ${relativePath}`);
          } catch (error) {
            console.log(`❌ 删除失败: ${relativePath} (${error})`);
          }
        } else {
          console.log(`✅ [预览]删除: ${relativePath}`);
        }
      }
      
      const keepFile = group.files.find(f => f.shouldKeep);
      if (keepFile) {
        const relativePath = path.relative(this.testDir, keepFile.path);
        console.log(`🟢 保留: ${relativePath}`);
      }
      
      console.log('');
    }

    console.log(`🎉 清理${dryRun ? '预览' : ''}完成!`);
  }

  /**
   * 生成清理脚本
   */
  generateCleanupScript(duplicateGroups: DuplicateGroup[]): string {
    const scriptLines: string[] = [
      '#!/bin/bash',
      '# 自动生成的重复文件清理脚本',
      '# 执行前请备份测试文件',
      '',
      'echo "开始清理重复测试文件..."',
      ''
    ];

    for (const group of duplicateGroups) {
      const filesToDelete = group.files.filter(f => !f.shouldKeep);
      
      if (filesToDelete.length > 0) {
        scriptLines.push(`echo "处理文件组: ${group.baseName}"`);
        
        for (const file of filesToDelete) {
          scriptLines.push(`echo "删除: ${file.path}"`);
          scriptLines.push(`rm "${file.path}"`);
        }
        
        const keepFile = group.files.find(f => f.shouldKeep);
        if (keepFile) {
          scriptLines.push(`echo "保留: ${keepFile.path}"`);
        }
        
        scriptLines.push('');
      }
    }

    scriptLines.push('echo "重复文件清理完成!"');

    const script = scriptLines.join('\n');
    const scriptPath = path.join(this.testDir, '../utils/cleanup-duplicates.sh');
    
    fs.writeFileSync(scriptPath, script, { mode: 0o755 });
    console.log(`\n📜 清理脚本已生成: ${scriptPath}`);
    
    return scriptPath;
  }
}

// CLI 执行
if (require.main === module) {
  const finder = new DuplicateFinder();
  const shouldCleanup = process.argv.includes('--cleanup') || process.argv.includes('-c');
  const shouldGenerateScript = process.argv.includes('--generate-script') || process.argv.includes('-g');
  const isDryRun = !process.argv.includes('--execute');

  finder.findDuplicates().then(duplicateGroups => {
    if (duplicateGroups.length === 0) {
      console.log('\n🎉 没有发现重复文件，无需清理！');
      return;
    }

    if (shouldCleanup) {
      return finder.cleanupDuplicates(duplicateGroups, isDryRun);
    }

    if (shouldGenerateScript) {
      finder.generateCleanupScript(duplicateGroups);
      return;
    }

    console.log('\n💡 使用选项:');
    console.log('   --cleanup --execute   执行自动清理');
    console.log('   --cleanup             预览清理操作');
    console.log('   --generate-script     生成清理脚本');
  }).catch(error => {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  });
}

export { DuplicateFinder, DuplicateGroup, DuplicateFile };