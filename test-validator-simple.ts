#!/usr/bin/env ts-node

/**
 * 简化的常量验证器测试
 */

// 模拟常量对象用于测试
const mockConstants = {
  HTTP: {
    MESSAGES: {
      SUCCESS: "操作成功",
      CREATE_SUCCESS: "创建成功", // 这个会在CRUD中重复
      NOT_FOUND: "资源不存在",   // 这个会重复
    }
  },
  CRUD: {
    MESSAGES: {
      CREATE_SUCCESS: "创建成功", // 重复
      UPDATE_SUCCESS: "更新成功",
    }
  },
  ERRORS: {
    NOT_FOUND: "资源不存在",      // 重复
    SERVER_ERROR: "服务器错误",
  }
};

/**
 * 简化的重复检测函数
 */
function findDuplicates(obj: any): { value: string; paths: string[] }[] {
  const valueMap = new Map<string, string[]>();
  
  function traverse(current: any, path: string) {
    if (typeof current === 'string') {
      if (!valueMap.has(current)) {
        valueMap.set(current, []);
      }
      valueMap.get(current)!.push(path);
    } else if (typeof current === 'object' && current !== null) {
      Object.entries(current).forEach(([key, value]) => {
        traverse(value, path ? `${path}.${key}` : key);
      });
    }
  }
  
  traverse(obj, '');
  
  const duplicates: { value: string; paths: string[] }[] = [];
  valueMap.forEach((paths, value) => {
    if (paths.length > 1) {
      duplicates.push({ value, paths });
    }
  });
  
  return duplicates;
}

function testSimpleValidator() {
  console.log('🧪 简化常量验证器测试');
  console.log('='.repeat(40));
  
  console.log('📊 测试数据:');
  console.log(JSON.stringify(mockConstants, null, 2));
  console.log('');
  
  const duplicates = findDuplicates(mockConstants);
  
  console.log(`🔍 发现重复项: ${duplicates.length}个`);
  console.log('');
  
  duplicates.forEach((dup, index) => {
    console.log(`${index + 1}. "${dup.value}"`);
    console.log(`   路径: ${dup.paths.join(', ')}`);
    console.log(`   重复次数: ${dup.paths.length}`);
    console.log('');
  });
  
  // 计算重复率
  const allValues: string[] = [];
  function collectValues(obj: any) {
    if (typeof obj === 'string') {
      allValues.push(obj);
    } else if (typeof obj === 'object' && obj !== null) {
      Object.values(obj).forEach(collectValues);
    }
  }
  collectValues(mockConstants);
  
  const uniqueValues = new Set(allValues);
  const duplicationRate = ((allValues.length - uniqueValues.size) / allValues.length) * 100;
  
  console.log('📈 统计信息:');
  console.log(`   总字符串数: ${allValues.length}`);
  console.log(`   唯一值数: ${uniqueValues.size}`);
  console.log(`   重复率: ${duplicationRate.toFixed(1)}%`);
  console.log('');
  
  console.log('✅ 基础验证功能正常工作!');
  console.log('');
  console.log('💡 接下来将这个逻辑集成到实际的常量验证器中...');
}

testSimpleValidator();