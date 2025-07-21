/**
 * E2E测试全局启动设置
 * 在所有E2E测试开始前执行的全局设置
 */

import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

export default async function globalSetup() {
  console.log('🌍 开始E2E测试全局设置...');
  
  try {
    // 启动专用的MongoDB内存服务器
    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'test-e2e-global',
        port: 27020,
      },
    });
    
    const mongoUri = mongoServer.getUri();
    
    // 设置全局环境变量
    process.env.MONGODB_URI = mongoUri;
    process.env.E2E_MONGO_SERVER_URI = mongoUri;
    
    console.log(`✅ E2E全局MongoDB服务器启动: ${mongoUri}`);
    
    // 验证数据库连接
    const mongoose = require('mongoose');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ E2E数据库连接验证成功');
    
    await mongoose.disconnect();
    
    // 设置Redis配置
    process.env.REDIS_URL = 'redis://localhost:6379/4';
    
    // 创建必要的目录
    const fs = require('fs');
    const path = require('path');
    
    const testResultsDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
      console.log('✅ 测试结果目录已创建');
    }
    
    const coverageDir = path.join(process.cwd(), 'coverage');
    if (!fs.existsSync(coverageDir)) {
      fs.mkdirSync(coverageDir, { recursive: true });
      console.log('✅ 覆盖率目录已创建');
    }
    
    console.log('✅ E2E测试全局设置完成');
    
  } catch (error) {
    console.error('❌ E2E测试全局设置失败:', error);
    throw error;
  }
}