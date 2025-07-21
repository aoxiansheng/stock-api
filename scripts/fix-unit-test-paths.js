#!/usr/bin/env node

/**
 * 修复单元测试文件中的导入路径
 * Fix import paths in unit test files
 */

const fs = require('fs');
const path = require('path');

// 需要修复路径的目录
const testDirs = [
  'test/jest/unit/auth',
  'test/jest/unit/core', 
  'test/jest/unit/monitoring',
  'test/jest/unit/security',
  'test/jest/unit/common'
];

// 路径映射规则
const pathMappings = {
  // 3层到4层的转换
  '../../../src/': '../../../../src/',
  
  // 特定深度的文件可能需要不同的层数
  '../../src/': '../../../src/',      // 2层到3层
  '../../../../src/': '../../../../src/', // 已经正确的路径保持不变
  '../../../../../src/': '../../../../../src/', // 5层的保持不变
};

function fixPathsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // 计算文件的实际深度
    const relativePath = path.relative('test/jest/unit', filePath);
    const depth = relativePath.split(path.sep).length - 1; // 减去文件名
    
    // 根据深度确定正确的路径前缀
    let correctPrefix = '';
    for (let i = 0; i < depth + 3; i++) { // 修复：使用 < 而不是 <=
      correctPrefix += '../';
    }
    correctPrefix += 'src/';
    
    // 查找并替换所有import语句中的路径
    content = content.replace(/from ['"`](\.\.[/\\])+src[/\\]/g, (match) => {
      hasChanges = true;
      return match.replace(/(\.\.[/\\])+src[/\\]/, correctPrefix);
    });
    
    // 查找并替换所有require语句中的路径
    content = content.replace(/require\(['"`](\.\.[/\\])+src[/\\]/g, (match) => {
      hasChanges = true;
      return match.replace(/(\.\.[/\\])+src[/\\]/, correctPrefix);
    });
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ 修复: ${filePath}`);
      return true;
    } else {
      console.log(`⏭️  跳过: ${filePath} (无需修改)`);
      return false;
    }
  } catch (error) {
    console.error(`❌ 错误处理文件 ${filePath}:`, error.message);
    return false;
  }
}

function scanDirectory(dirPath) {
  const fixedFiles = [];
  
  function scan(currentPath) {
    try {
      const items = fs.readdirSync(currentPath, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(currentPath, item.name);
        
        if (item.isDirectory()) {
          scan(itemPath);
        } else if (item.isFile() && (item.name.endsWith('.spec.ts') || item.name.endsWith('.test.ts'))) {
          if (fixPathsInFile(itemPath)) {
            fixedFiles.push(itemPath);
          }
        }
      }
    } catch (error) {
      console.error(`❌ 错误扫描目录 ${currentPath}:`, error.message);
    }
  }
  
  scan(dirPath);
  return fixedFiles;
}

function main() {
  console.log('🔧 开始修复单元测试文件路径...');
  
  const allFixedFiles = [];
  
  for (const testDir of testDirs) {
    const fullPath = path.resolve(testDir);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  目录不存在: ${testDir}`);
      continue;
    }
    
    console.log(`\n📁 处理目录: ${testDir}`);
    const fixedFiles = scanDirectory(fullPath);
    allFixedFiles.push(...fixedFiles);
  }
  
  console.log('\n📊 修复完成:');
  console.log(`✅ 总共修复了 ${allFixedFiles.length} 个文件`);
  
  if (allFixedFiles.length > 0) {
    console.log('\n📝 修复的文件列表:');
    allFixedFiles.forEach(file => {
      console.log(`  - ${file}`);
    });
    
    console.log('\n🧪 建议运行测试验证修复结果:');
    console.log('npm run test:unit');
  } else {
    console.log('\n✨ 所有文件路径都是正确的!');
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { fixPathsInFile, scanDirectory };