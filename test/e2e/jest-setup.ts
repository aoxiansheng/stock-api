/**
 * Jest E2E 测试全局设置
 * 在所有测试运行之前加载测试环境变量
 */
import { config } from 'dotenv';
import { resolve } from 'path';

// 加载 .env.test 文件
const result = config({ path: resolve(__dirname, '../../.env.test') });

if (result.error) {
  console.warn('⚠️  警告: 未能加载 .env.test 文件:', result.error.message);
  console.warn('   测试将使用默认环境变量或系统环境变量');
} else {
  console.log('✅ 已加载测试环境变量从: .env.test');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`   MONGODB_URI: ${process.env.MONGODB_URI}`);
  console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '***已设置***' : '未设置'}`);
}

// 设置全局测试超时
jest.setTimeout(30000);
