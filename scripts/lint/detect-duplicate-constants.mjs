#!/usr/bin/env node
/**
 * 重复常量检测工具
 * 
 * 检测项目中是否存在重复定义的常量，帮助保持代码一致性
 * 特别关注枚举值和配置常量的重复定义
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// 配置
const CONFIG = {
  // 扫描路径
  scanPaths: [
    'src/**/*.ts',
    'src/**/*.js'
  ],
  
  // 忽略路径
  ignorePaths: [
    'node_modules/**',
    'dist/**',
    '**/*.spec.ts',
    '**/*.test.ts',
    '**/*.d.ts'
  ],
  
  // 需要检测的重复模式
  duplicatePatterns: [
    // 转换类型相关
    {
      name: 'transformation_types',
      patterns: [
        /"multiply"/g,
        /"divide"/g, 
        /"add"/g,
        /"subtract"/g,
        /"format"/g,
        /"custom"/g,
        /"none"/g
      ],
      message: '检测到重复的转换类型定义，建议使用 TRANSFORMATION_TYPES 常量'
    },
    
    // API类型相关
    {
      name: 'api_types', 
      patterns: [
        /"rest"/g,
        /"stream"/g
      ],
      message: '检测到重复的API类型定义，建议使用 API_TYPES 常量'
    },
    
    // 规则类型相关
    {
      name: 'rule_list_types',
      patterns: [
        /"quote_fields"/g,
        /"basic_info_fields"/g,
        /"index_fields"/g
      ],
      message: '检测到重复的规则类型定义，建议使用 RULE_LIST_TYPES 常量'
    },
    
    // 状态相关
    {
      name: 'status_values',
      patterns: [
        /"active"/g,
        /"inactive"/g,
        /"draft"/g,
        /"testing"/g,
        /"deprecated"/g,
        /"error"/g
      ],
      message: '检测到重复的状态值定义，建议创建统一的状态常量'
    }
  ]
};

class DuplicateConstantsDetector {
  constructor() {
    this.results = {
      duplicates: new Map(),
      totalFiles: 0,
      totalDuplicates: 0
    };
  }

  /**
   * 扫描文件并检测重复常量
   */
  async scan() {
    console.log('🔍 开始扫描重复常量定义...\n');
    
    // 获取所有需要扫描的文件
    const files = await this.getFilesToScan();
    this.results.totalFiles = files.length;
    
    console.log(`📁 扫描文件数量: ${files.length}`);
    
    // 逐文件扫描
    for (const filePath of files) {
      await this.scanFile(filePath);
    }
    
    // 生成报告
    this.generateReport();
  }

  /**
   * 获取需要扫描的文件列表
   */
  async getFilesToScan() {
    const allFiles = [];
    
    for (const pattern of CONFIG.scanPaths) {
      const files = await glob(pattern, {
        ignore: CONFIG.ignorePaths,
        cwd: process.cwd()
      });
      allFiles.push(...files);
    }
    
    return [...new Set(allFiles)]; // 去重
  }

  /**
   * 扫描单个文件
   */
  async scanFile(filePath) {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      
      for (const patternConfig of CONFIG.duplicatePatterns) {
        const matches = this.findMatches(content, patternConfig.patterns);
        
        if (matches.length > 1) {
          // 发现重复定义
          const key = `${patternConfig.name}:${filePath}`;
          
          if (!this.results.duplicates.has(patternConfig.name)) {
            this.results.duplicates.set(patternConfig.name, {
              message: patternConfig.message,
              files: new Map()
            });
          }
          
          this.results.duplicates.get(patternConfig.name).files.set(filePath, {
            matches,
            count: matches.length
          });
          
          this.results.totalDuplicates++;
        }
      }
      
    } catch (error) {
      console.warn(`⚠️  无法读取文件 ${filePath}: ${error.message}`);
    }
  }

  /**
   * 在内容中查找匹配项
   */
  findMatches(content, patterns) {
    const matches = [];
    const lines = content.split('\n');
    
    patterns.forEach(pattern => {
      lines.forEach((line, index) => {
        const match = pattern.exec(line);
        if (match) {
          matches.push({
            line: index + 1,
            content: line.trim(),
            match: match[0]
          });
        }
        pattern.lastIndex = 0; // 重置正则状态
      });
    });
    
    return matches;
  }

  /**
   * 生成检测报告
   */
  generateReport() {
    console.log('\n📊 重复常量检测报告');
    console.log('=' .repeat(50));
    
    if (this.results.duplicates.size === 0) {
      console.log('✅ 没有检测到重复的常量定义');
      return;
    }
    
    console.log(`❌ 检测到 ${this.results.duplicates.size} 种类型的重复常量定义\n`);
    
    for (const [patternName, patternData] of this.results.duplicates) {
      console.log(`🔸 ${patternName.toUpperCase()}`);
      console.log(`   ${patternData.message}\n`);
      
      for (const [filePath, fileData] of patternData.files) {
        console.log(`   📄 ${filePath} (${fileData.count} 个匹配)`);
        
        fileData.matches.slice(0, 3).forEach(match => {
          console.log(`      第${match.line}行: ${match.content}`);
        });
        
        if (fileData.matches.length > 3) {
          console.log(`      ... 还有 ${fileData.matches.length - 3} 个匹配`);
        }
        console.log('');
      }
      console.log('');
    }
    
    // 建议
    console.log('🚀 建议操作:');
    console.log('1. 将重复的常量定义迁移到统一的常量文件中');
    console.log('2. 更新导入语句使用统一常量');
    console.log('3. 运行 ESLint 检查是否有其他硬编码问题');
    console.log('4. 添加 pre-commit 钩子防止未来的重复定义\n');
    
    // 退出码
    process.exit(this.results.duplicates.size > 0 ? 1 : 0);
  }
}

// 主函数
async function main() {
  const detector = new DuplicateConstantsDetector();
  await detector.scan();
}

// 如果直接运行此文件
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(error => {
    console.error('❌ 检测过程中发生错误:', error);
    process.exit(1);
  });
}

export default DuplicateConstantsDetector;