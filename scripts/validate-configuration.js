/**
 * 配置验证脚本
 * 🎯 验证ConfigurationModule配置加载和合规性
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 设置环境变量
process.env.DISABLE_AUTO_INIT = 'true';
process.env.NODE_ENV = 'test';

console.log('🔧 开始验证Common组件配置合规性...\n');

// 配置文件路径
const configFiles = [
  'src/appcore/configuration/config.module.ts',
  'src/cache/config/cache-unified.config.ts',
  'src/common/config/common-constants.config.ts',
  'src/appcore/config/environment.config.ts',
  'src/appcore/services/environment-config.service.ts'
];

let passedTests = 0;
let totalTests = configFiles.length;

console.log('📋 测试清单：');
configFiles.forEach((file, index) => {
  console.log(`  ${index + 1}. ${file}`);
});
console.log('');

// 验证文件存在性
console.log('📁 检查配置文件存在性...');
for (const file of configFiles) {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✅ ${file}`);
    passedTests++;
  } else {
    console.log(`  ❌ ${file} - 文件不存在`);
  }
}

console.log(`\n📊 存在性检查结果: ${passedTests}/${totalTests} 通过\n`);

// 类型检查
console.log('🔍 执行TypeScript类型检查...');
let typeCheckPassed = 0;

async function runTypeCheck(file) {
  return new Promise((resolve) => {
    const child = spawn('npm', ['run', 'typecheck:file', '--', file], {
      env: { ...process.env, DISABLE_AUTO_INIT: 'true' },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data;
    });

    child.stderr.on('data', (data) => {
      stderr += data;
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`  ✅ ${file} - 类型检查通过`);
        typeCheckPassed++;
      } else {
        console.log(`  ❌ ${file} - 类型检查失败`);
        if (stderr) {
          console.log(`     错误: ${stderr.slice(0, 200)}...`);
        }
      }
      resolve();
    });

    // 10秒超时
    setTimeout(() => {
      child.kill();
      console.log(`  ⏰ ${file} - 超时`);
      resolve();
    }, 10000);
  });
}

// 顺序执行类型检查
async function runAllTypeChecks() {
  for (const file of configFiles) {
    await runTypeCheck(file);
  }
  
  console.log(`\n📊 类型检查结果: ${typeCheckPassed}/${totalTests} 通过\n`);

  // 环境变量示例文件检查
  console.log('📝 检查环境变量示例文件...');
  const envExamplePath = path.join(__dirname, '..', '.env.example');
  if (fs.existsSync(envExamplePath)) {
    const envContent = fs.readFileSync(envExamplePath, 'utf8');
    const requiredVars = [
      'CACHE_DEFAULT_TTL',
      'DEFAULT_BATCH_SIZE',
      'ENV_DEBUG_LOGS',
      'NODE_ENV'
    ];
    
    let envVarsPassed = 0;
    for (const varName of requiredVars) {
      if (envContent.includes(varName)) {
        console.log(`  ✅ ${varName} - 环境变量已定义`);
        envVarsPassed++;
      } else {
        console.log(`  ❌ ${varName} - 环境变量缺失`);
      }
    }
    
    console.log(`\n📊 环境变量检查结果: ${envVarsPassed}/${requiredVars.length} 通过\n`);
  } else {
    console.log('  ❌ .env.example 文件不存在\n');
  }

  // 总结
  console.log('🎯 Common组件配置合规性验证总结:');
  console.log('==========================================');
  console.log(`文件存在性: ${passedTests}/${totalTests} 通过`);
  console.log(`类型检查: ${typeCheckPassed}/${totalTests} 通过`);
  
  const overallPassed = passedTests + typeCheckPassed;
  const overallTotal = totalTests * 2;
  const successRate = Math.round((overallPassed / overallTotal) * 100);
  
  console.log(`总体通过率: ${overallPassed}/${overallTotal} (${successRate}%)`);
  
  if (successRate >= 80) {
    console.log('✅ 配置合规性验证通过! 🎉');
    process.exit(0);
  } else {
    console.log('❌ 配置合规性验证失败! 需要修复问题。');
    process.exit(1);
  }
}

runAllTypeChecks().catch(console.error);