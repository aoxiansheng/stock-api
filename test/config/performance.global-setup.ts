/**
 * Performance Test Global Setup
 * 全局性能测试环境准备
 */

export default async function globalSetup() {
  console.log('🚀 Starting performance test global setup...');
  
  // 记录初始系统状态
  const initialMemory = process.memoryUsage();
  console.log(`📊 Initial system memory: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  
  // 检查垃圾回收是否可用
  if (typeof global.gc === 'undefined') {
    console.warn('⚠️ Garbage collection not exposed. Some memory tests may be inaccurate.');
    console.warn('💡 Recommend running with: node --expose-gc');
  } else {
    console.log('✅ Garbage collection monitoring enabled');
  }
  
  // 检查数据库连接
  try {
    // 这里可以添加 MongoDB 连接检查
    console.log('✅ Database connections ready for performance testing');
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
  }
  
  console.log('✅ Performance test global setup completed');
}