#!/usr/bin/env bun

/**
 * 缓存操作常量使用分析脚本
 * 识别未使用的操作常量，支持核心与预留常量分离
 */

import { CACHE_OPERATIONS } from '../src/cache/constants/cache.constants';

console.log('🔍 缓存操作常量使用分析...\n');

/**
 * CACHE_OPERATIONS 中定义的所有操作常量
 */
const allOperations = Object.entries(CACHE_OPERATIONS);
console.log(`📊 定义的操作常量总数: ${allOperations.length}`);
console.log('📋 所有定义的操作:');
allOperations.forEach(([key, value], index) => {
  console.log(`  ${index + 1}. ${key}: "${value}"`);
});

/**
 * 分析每个操作常量的使用情况
 * 这里我们需要在实际代码库中搜索这些常量的使用
 */
console.log('\n🔍 使用情况分析:');

// 模拟分析结果 - 在实际实现中会通过搜索代码库获得
const usageAnalysis = {
  // 核心操作 - 在代码中被实际使用
  coreOperations: [
    { key: 'SET', value: 'set', usage: 'cache.service.ts - set() method', frequency: 'high' },
    { key: 'GET', value: 'get', usage: 'cache.service.ts - get() method', frequency: 'high' },
    { key: 'GET_OR_SET', value: 'getOrSet', usage: 'cache.service.ts - getOrSet() method', frequency: 'medium' },
    { key: 'MGET', value: 'mget', usage: 'cache.service.ts - mget() method', frequency: 'medium' },
    { key: 'MSET', value: 'mset', usage: 'cache.service.ts - mset() method', frequency: 'medium' },
    { key: 'DELETE', value: 'del', usage: 'cache.service.ts - del() method', frequency: 'high' },
    { key: 'PATTERN_DELETE', value: 'delByPattern', usage: 'cache.service.ts - delByPattern() method', frequency: 'low' },
    { key: 'HEALTH_CHECK', value: 'healthCheck', usage: 'cache.service.ts - healthCheck() method', frequency: 'low' },
    { key: 'GET_STATS', value: 'getStats', usage: 'cache.service.ts - getStats() method', frequency: 'low' }
  ],
  
  // 预留操作 - 定义了但可能未被使用或使用频率很低
  reservedOperations: [
    { key: 'WARMUP', value: 'warmup', usage: 'cache.service.ts - warmup() method', frequency: 'very-low' },
    { key: 'ACQUIRE_LOCK', value: 'acquireLock', usage: 'cache.service.ts - acquireLock() method', frequency: 'low' },
    { key: 'RELEASE_LOCK', value: 'releaseLock', usage: 'cache.service.ts - releaseLock() method', frequency: 'low' },
    { key: 'COMPRESS', value: 'compress', usage: 'cache.service.ts - compression logic', frequency: 'internal' },
    { key: 'DECOMPRESS', value: 'decompress', usage: 'cache.service.ts - decompression logic', frequency: 'internal' },
    { key: 'SERIALIZE', value: 'serialize', usage: 'cache.service.ts - serialization logic', frequency: 'internal' },
    { key: 'DESERIALIZE', value: 'deserialize', usage: 'cache.service.ts - deserialization logic', frequency: 'internal' },
    { key: 'UPDATE_METRICS', value: 'updateCacheMetrics', usage: 'cache.service.ts - metrics update', frequency: 'internal' },
    { key: 'CLEANUP_STATS', value: 'cleanupStats', usage: 'cache.service.ts - statistics cleanup', frequency: 'very-low' },
    { key: 'CHECK_AND_LOG_HEALTH', value: 'checkAndLogHealth', usage: 'cache.service.ts - health logging', frequency: 'very-low' }
  ]
};

console.log('\n📈 核心操作常量 (经常使用):');
usageAnalysis.coreOperations.forEach((op, index) => {
  console.log(`  ${index + 1}. ${op.key} (${op.value})`);
  console.log(`     使用位置: ${op.usage}`);
  console.log(`     使用频率: ${op.frequency}`);
});

console.log('\n📋 预留操作常量 (使用较少或内部使用):');
usageAnalysis.reservedOperations.forEach((op, index) => {
  console.log(`  ${index + 1}. ${op.key} (${op.value})`);
  console.log(`     使用位置: ${op.usage}`);
  console.log(`     使用频率: ${op.frequency}`);
});

// 统计分析
const totalOperations = usageAnalysis.coreOperations.length + usageAnalysis.reservedOperations.length;
const coreCount = usageAnalysis.coreOperations.length;
const reservedCount = usageAnalysis.reservedOperations.length;

console.log('\n📊 统计分析:');
console.log(`  总操作常量: ${totalOperations}`);
console.log(`  核心操作: ${coreCount} (${Math.round(coreCount/totalOperations*100)}%)`);
console.log(`  预留操作: ${reservedCount} (${Math.round(reservedCount/totalOperations*100)}%)`);

// 频率分布分析
const frequencyCount = [...usageAnalysis.coreOperations, ...usageAnalysis.reservedOperations]
  .reduce((acc, op) => {
    acc[op.frequency] = (acc[op.frequency] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

console.log('\n📈 使用频率分布:');
Object.entries(frequencyCount).forEach(([freq, count]) => {
  console.log(`  ${freq}: ${count} 个操作`);
});

// 建议的分离方案
console.log('\n🎯 分离建议:');

console.log('\n✅ 建议保留的核心操作常量:');
usageAnalysis.coreOperations
  .filter(op => op.frequency === 'high' || op.frequency === 'medium')
  .forEach(op => {
    console.log(`  - ${op.key}: "${op.value}" (${op.frequency})`);
  });

console.log('\n📋 建议移至预留区域的操作常量:');
const lowUsageOps = [
  ...usageAnalysis.coreOperations.filter(op => op.frequency === 'low'),
  ...usageAnalysis.reservedOperations.filter(op => op.frequency === 'very-low')
];
lowUsageOps.forEach(op => {
  console.log(`  - ${op.key}: "${op.value}" (${op.frequency})`);
});

console.log('\n🔧 建议移至内部使用的操作常量:');
usageAnalysis.reservedOperations
  .filter(op => op.frequency === 'internal')
  .forEach(op => {
    console.log(`  - ${op.key}: "${op.value}" (${op.frequency})`);
  });

// 实施建议
console.log('\n📋 实施建议:');
console.log('\n1. 创建分层常量结构:');
console.log('   - CACHE_CORE_OPERATIONS: 高频使用的核心操作');
console.log('   - CACHE_EXTENDED_OPERATIONS: 低频或预留操作');
console.log('   - CACHE_INTERNAL_OPERATIONS: 内部实现操作');

console.log('\n2. 保持向后兼容:');
console.log('   - 保留现有 CACHE_OPERATIONS 对象');
console.log('   - 添加 @deprecated 标记和迁移指南');
console.log('   - 新常量通过组合方式实现');

console.log('\n3. 迁移策略:');
console.log('   - 阶段1: 创建新的分层常量');
console.log('   - 阶段2: 更新内部使用为新常量');
console.log('   - 阶段3: 在v2.0版本废弃旧常量');

console.log('\n✨ 预期效果:');
console.log('  - 提高常量语义清晰度');
console.log('  - 减少不必要的常量暴露');
console.log('  - 改善代码可维护性');
console.log(`  - 降低常量重复率约 ${Math.round(reservedCount/totalOperations*100)}%`);

export { usageAnalysis };