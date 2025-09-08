import { ConstantsValidator } from './constants-validator.util';


// 运行验证并输出结果
const result = ConstantsValidator.validateConstants();
console.log(ConstantsValidator.generateReport());

// 输出一些统计信息
const stats = ConstantsValidator.getStatistics();
console.log('\n=== 统计信息 ===');
console.log(`总常量数: ${stats.totalConstants}`);
console.log(`重复项数: ${stats.duplicates}`);
console.log(`重复率: ${stats.duplicationRate}%`);

// 检查是否存在重复
if (ConstantsValidator.hasDuplicates()) {
  console.log('\n=== 发现重复项 ===');
  const duplicates = ConstantsValidator.findDuplicateValues();
  duplicates.slice(0, 10).forEach((dup, index) => {
    console.log(`${index + 1}. "${dup.value}" 出现在 ${dup.count} 个位置:`);
    dup.keys.forEach(key => console.log(`   - ${key}`));
  });
  
  if (duplicates.length > 10) {
    console.log(`... 还有 ${duplicates.length - 10} 个重复项`);
  }
} else {
  console.log('\n✅ 没有发现重复项');
}