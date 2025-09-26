#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 命令行参数处理
const args = process.argv.slice(2);
const autoDelete = args.includes('--auto-delete') || args.includes('-a');
const dryRun = args.includes('--dry-run') || args.includes('-d');
const limit = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : 10;

console.log('Running knip to find unused files...');
let output = '';
try {
  output = execSync('npx knip --include files', { encoding: 'utf8' });
} catch (error) {
  // Knip 在发现问题时会返回错误码，但我们仍然需要它的输出
  if (error.stdout) {
    output = error.stdout;
  } else {
    console.error('Error running knip:', error.message);
    process.exit(1);
  }
}

const lines = output.split('\n');

// 提取文件路径 - 更宽松的匹配
const unusedFiles = lines
  .filter(line => {
    // 匹配包含 src/ 路径且以 .ts 或 .js 结尾的行
    return line.includes('src/') && (line.includes('.ts') || line.includes('.js'));
  })
  .map(line => {
    // 提取文件路径部分 - 更精确的提取
    const match = line.match(/(src\/[^\s]+?\.(ts|js))/);
    return match ? match[1] : null;
  })
  .filter(Boolean);

console.log(`Found ${unusedFiles.length} unused files:`);
unusedFiles.slice(0, limit).forEach(file => console.log(`  - ${file}`));
if (unusedFiles.length > limit) {
  console.log(`  ... and ${unusedFiles.length - limit} more`);
}

// 确认删除
if (unusedFiles.length > 0) {
  console.log('\nChecking if files are really unused...');
  
  const filesToDelete = [];
  
  // 处理指定数量的文件或全部文件
  const filesToCheck = limit > 0 ? unusedFiles.slice(0, limit) : unusedFiles;
  
  for (const file of filesToCheck) {
    const fullPath = path.join(process.cwd(), file);
    
    // 检查文件是否存在
    if (fs.existsSync(fullPath)) {
      // 获取文件名（不含扩展名）并尝试推断类名
      const fileName = path.basename(file, path.extname(file));
      // 简单处理文件名到类名的转换
      let className = fileName;
      if (fileName.includes('-')) {
        className = fileName.split('-')
          .map((part, index) => {
            if (index === 0) return part;
            return part.charAt(0).toUpperCase() + part.slice(1);
          })
          .join('');
      }
      // 首字母大写
      className = className.charAt(0).toUpperCase() + className.slice(1);
      
      // 特殊处理一些常见的命名模式
      if (file.includes('config') && !className.includes('Config')) {
        className += 'Config';
      }
      if (file.includes('service') && !className.includes('Service')) {
        className += 'Service';
      }
      if (file.includes('dto') && !className.includes('Dto')) {
        className += 'Dto';
      }
      if (file.includes('constants') && !className.includes('Constants')) {
        className += 'Constants';
      }
      
      console.log(`\nChecking references for ${file} (potential class name: ${className})...`);
      
      // 检查文件中导出的类或变量是否在其他地方被引用
      try {
        const grepCommand = `grep -r "${className}" src/ --exclude-dir=node_modules --exclude="${file}" || true`;
        const grepOutput = execSync(grepCommand, { encoding: 'utf8' });
        
        if (grepOutput.trim() === '') {
          console.log(`✓ ${file} appears to be safe to delete (no references to ${className} found)`);
          filesToDelete.push({ path: fullPath, file: file, className: className });
        } else {
          console.log(`✗ ${file} has references to ${className} and should not be deleted`);
        }
      } catch (error) {
        console.log(`? ${file} - error checking references:`, error.message);
      }
    }
  }
  
  if (filesToDelete.length > 0) {
    console.log(`\n${filesToDelete.length} files have been verified as safe to delete:`);
    filesToDelete.forEach(f => console.log(`  ✓ ${f.file}`));
    
    if (dryRun) {
      console.log('\nDry run mode: No files were actually deleted.');
      return;
    }
    
    if (autoDelete) {
      console.log('\nAuto-delete mode: Deleting verified files...');
      let deletedCount = 0;
      filesToDelete.forEach(f => {
        try {
          fs.unlinkSync(f.path);
          console.log(`✓ Deleted ${f.file}`);
          deletedCount++;
        } catch (error) {
          console.error(`✗ Failed to delete ${f.file}:`, error.message);
        }
      });
      console.log(`\nCleanup completed! ${deletedCount} files deleted.`);
    } else {
      // 询问用户是否删除
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question(`\nDo you want to delete these ${filesToDelete.length} files? (y/N): `, (answer) => {
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
          let deletedCount = 0;
          filesToDelete.forEach(f => {
            try {
              fs.unlinkSync(f.path);
              console.log(`✓ Deleted ${f.file}`);
              deletedCount++;
            } catch (error) {
              console.error(`✗ Failed to delete ${f.file}:`, error.message);
            }
          });
          console.log(`\nCleanup completed! ${deletedCount} files deleted.`);
        } else {
          console.log('Cleanup cancelled.');
        }
        rl.close();
      });
    }
  } else {
    console.log('\nNo files were identified as safe to delete.');
  }
} else {
  console.log('No unused files found.');
}

console.log('\nUsage:');
console.log('  node cleanup-unused-files.js           # Interactive mode');
console.log('  node cleanup-unused-files.js -a        # Auto-delete verified files');
console.log('  node cleanup-unused-files.js -d        # Dry run (no actual deletion)');
console.log('  node cleanup-unused-files.js --limit N # Process only first N files');