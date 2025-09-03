#!/usr/bin/env ts-node

/**
 * 常量验证器测试脚本
 */

import { ConstantsValidator } from './src/common/utils/constants-validator.util';

async function testConstantsValidator() {
  console.log('🧪 测试常量重复检测功能');
  console.log('='.repeat(50));

  try {
    // 1. 快速检测是否有重复
    console.log('1️⃣ 快速重复检测:');
    const hasDuplicates = ConstantsValidator.hasDuplicates();
    console.log(`   是否存在重复: ${hasDuplicates ? '❌ 是' : '✅ 否'}`);
    console.log('');

    // 2. 获取统计信息
    console.log('2️⃣ 统计信息:');
    const stats = ConstantsValidator.getStatistics();
    console.log(`   字符串常量总数: ${stats.stringConstants}`);
    console.log(`   重复项数量: ${stats.duplicates}`);
    console.log(`   重复率: ${stats.duplicationRate}%`);
    console.log('');

    // 3. 查找重复项（限制显示前5个）
    console.log('3️⃣ 重复项列表（前5个）:');
    const duplicates = ConstantsValidator.findDuplicateValues();
    duplicates.slice(0, 5).forEach((dup, index) => {
      console.log(`   ${index + 1}. "${dup.value}"`);
      console.log(`      重复次数: ${dup.count}`);
      console.log(`      位置: ${dup.keys.slice(0, 3).join(', ')}${dup.keys.length > 3 ? '...' : ''}`);
      console.log('');
    });

    // 4. 运行完整验证
    console.log('4️⃣ 完整验证结果:');
    const result = ConstantsValidator.validateConstants();
    console.log(`   验证状态: ${result.isValid ? '✅ 通过' : '❌ 失败'}`);
    console.log(`   错误数量: ${result.errors.length}`);
    console.log(`   警告数量: ${result.warnings.length}`);
    
    if (result.errors.length > 0) {
      console.log('   错误详情:');
      result.errors.slice(0, 3).forEach((error, index) => {
        console.log(`     ${index + 1}. ${error}`);
      });
    }

    console.log('');
    console.log('✅ 常量验证器测试完成!');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('详细错误:', error);
  }
}

// 运行测试
testConstantsValidator();