/**
 * 单元测试全局设置
 * 设置单元测试环境，Mock外部依赖
 */

import { jest } from '@jest/globals';

// 设置测试超时
jest.setTimeout(5000);

// Mock外部依赖 - 单元测试应该完全隔离
beforeAll(() => {
  // Mock环境变量
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
  process.env.REDIS_URL = 'redis://localhost:6379';
});

// 每个测试前清理
beforeEach(() => {
  jest.clearAllMocks();
});

// 每个测试后清理
afterEach(() => {
  jest.restoreAllMocks();
});

// 测试结束后清理
afterAll(() => {
  jest.clearAllTimers();
});

// 全局测试工具函数
global.createMockUser = () => ({
  _id: '507f1f77bcf86cd799439011',
  username: 'testuser',
  email: 'test@example.com',
  role: 'developer',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

global.createMockApiKey = () => ({
  _id: '507f1f77bcf86cd799439012',
  appKey: 'test-app-key',
  accessToken: 'test-access-token',
  name: 'Test API Key',
  userId: '507f1f77bcf86cd799439011',
  permissions: ['data:read', 'query:execute'],
  isActive: true,
  usageCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// 抑制控制台输出，除非是错误
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error, // 保留错误输出用于调试
};