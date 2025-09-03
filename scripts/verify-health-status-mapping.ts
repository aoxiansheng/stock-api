#!/usr/bin/env bun

/**
 * 验证健康状态枚举和映射功能修复效果
 * 确保内部状态与外部DTO状态正确映射
 */

import { 
  CACHE_STATUS, 
  BasicHealthStatus, 
  ExtendedHealthStatus,
  BASIC_HEALTH_STATUS_VALUES,
  EXTENDED_HEALTH_STATUS_VALUES,
  mapInternalToExternalStatus
} from '../src/cache/constants/cache.constants';

console.log('🧪 验证健康状态枚举和映射功能修复...\n');

// 1. 验证基础健康状态类型定义
console.log('✅ 基础健康状态类型验证:');
console.log(`  - BASIC_HEALTH_STATUS_VALUES: [${BASIC_HEALTH_STATUS_VALUES.join(', ')}]`);
console.log(`  - 状态数量: ${BASIC_HEALTH_STATUS_VALUES.length} (期望: 3)`);

// 2. 验证扩展健康状态类型定义
console.log('\n✅ 扩展健康状态类型验证:');
console.log(`  - EXTENDED_HEALTH_STATUS_VALUES: [${EXTENDED_HEALTH_STATUS_VALUES.join(', ')}]`);
console.log(`  - 状态数量: ${EXTENDED_HEALTH_STATUS_VALUES.length} (期望: 6)`);

// 3. 验证状态映射函数功能
console.log('\n✅ 状态映射函数验证:');

// 测试每个扩展状态到基础状态的映射
const mappingTests = [
  // healthy 映射组
  { internal: CACHE_STATUS.HEALTHY as ExtendedHealthStatus, expectedExternal: CACHE_STATUS.HEALTHY as BasicHealthStatus },
  { internal: CACHE_STATUS.CONNECTED as ExtendedHealthStatus, expectedExternal: CACHE_STATUS.HEALTHY as BasicHealthStatus },
  
  // warning 映射组
  { internal: CACHE_STATUS.WARNING as ExtendedHealthStatus, expectedExternal: CACHE_STATUS.WARNING as BasicHealthStatus },
  { internal: CACHE_STATUS.DEGRADED as ExtendedHealthStatus, expectedExternal: CACHE_STATUS.WARNING as BasicHealthStatus },
  
  // unhealthy 映射组
  { internal: CACHE_STATUS.UNHEALTHY as ExtendedHealthStatus, expectedExternal: CACHE_STATUS.UNHEALTHY as BasicHealthStatus },
  { internal: CACHE_STATUS.DISCONNECTED as ExtendedHealthStatus, expectedExternal: CACHE_STATUS.UNHEALTHY as BasicHealthStatus },
];

let mappingTestsPassed = 0;
for (const test of mappingTests) {
  const actualExternal = mapInternalToExternalStatus(test.internal);
  const passed = actualExternal === test.expectedExternal;
  
  console.log(`  - ${test.internal} → ${actualExternal} (期望: ${test.expectedExternal}) ${passed ? '✅' : '❌'}`);
  if (passed) mappingTestsPassed++;
}

console.log(`\n  映射测试结果: ${mappingTestsPassed}/${mappingTests.length} 通过`);

// 4. 验证类型安全性
console.log('\n✅ 类型安全性验证:');

// 测试基础状态类型赋值
const testBasicHealthy: BasicHealthStatus = CACHE_STATUS.HEALTHY;
const testBasicWarning: BasicHealthStatus = CACHE_STATUS.WARNING;
const testBasicUnhealthy: BasicHealthStatus = CACHE_STATUS.UNHEALTHY;

console.log(`  - BasicHealthStatus 类型赋值测试:`);
console.log(`    • healthy: ${testBasicHealthy}`);
console.log(`    • warning: ${testBasicWarning}`);
console.log(`    • unhealthy: ${testBasicUnhealthy}`);

// 测试扩展状态类型赋值
const testExtendedConnected: ExtendedHealthStatus = CACHE_STATUS.CONNECTED;
const testExtendedDegraded: ExtendedHealthStatus = CACHE_STATUS.DEGRADED;
const testExtendedDisconnected: ExtendedHealthStatus = CACHE_STATUS.DISCONNECTED;

console.log(`  - ExtendedHealthStatus 类型赋值测试:`);
console.log(`    • connected: ${testExtendedConnected}`);
console.log(`    • degraded: ${testExtendedDegraded}`);
console.log(`    • disconnected: ${testExtendedDisconnected}`);

// 5. 验证映射函数完整性
console.log('\n✅ 映射函数完整性验证:');
const allExtendedStatusesMapped = EXTENDED_HEALTH_STATUS_VALUES.every(status => {
  try {
    const mapped = mapInternalToExternalStatus(status);
    return BASIC_HEALTH_STATUS_VALUES.includes(mapped);
  } catch (error) {
    console.error(`    ❌ 映射失败: ${status} - ${error}`);
    return false;
  }
});

console.log(`  - 所有扩展状态可映射: ${allExtendedStatusesMapped ? '✅' : '❌'}`);

// 6. 验证常量一致性
console.log('\n✅ 常量一致性验证:');
const basicStatusesInExtended = BASIC_HEALTH_STATUS_VALUES.every(basic => 
  EXTENDED_HEALTH_STATUS_VALUES.includes(basic as ExtendedHealthStatus)
);
console.log(`  - 基础状态包含在扩展状态中: ${basicStatusesInExtended ? '✅' : '❌'}`);

const noExtraBasicStates = BASIC_HEALTH_STATUS_VALUES.length === 3;
const noExtraExtendedStates = EXTENDED_HEALTH_STATUS_VALUES.length === 6;

console.log(`  - 基础状态数量正确 (3个): ${noExtraBasicStates ? '✅' : '❌'}`);
console.log(`  - 扩展状态数量正确 (6个): ${noExtraExtendedStates ? '✅' : '❌'}`);

// 综合结果
const allTestsPassed = mappingTestsPassed === mappingTests.length && 
                      allExtendedStatusesMapped && 
                      basicStatusesInExtended && 
                      noExtraBasicStates && 
                      noExtraExtendedStates;

console.log('\n🎉 健康状态枚举和映射功能修复验证完成！');
if (allTestsPassed) {
  console.log('   ✅ 所有测试通过');
  console.log('   - 6个内部状态映射到3个外部状态');
  console.log('   - 类型安全已确保');
  console.log('   - 映射函数工作正常');
  console.log('   - 常量定义一致');
} else {
  console.log('   ❌ 部分测试失败，需要检查实现');
}