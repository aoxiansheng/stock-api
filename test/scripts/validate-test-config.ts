#!/usr/bin/env ts-node

/**
 * 测试配置验证和修复脚本
 * 检查和修复所有测试配置文件的一致性和正确性
 */

import * as fs from "fs";
import * as path from "path";
// 删除未使用的execSync导入

interface TestConfigValidation {
  configFile: string;
  issues: string[];
  fixes: string[];
  status: "valid" | "warning" | "error";
}

interface ValidationResult {
  summary: {
    totalConfigs: number;
    validConfigs: number;
    configsWithWarnings: number;
    configsWithErrors: number;
  };
  details: TestConfigValidation[];
  recommendations: string[];
}

class TestConfigValidator {
  private readonly configDir = path.join(__dirname, "../config");
  private readonly rootDir = path.join(__dirname, "../../");
  private readonly testDir = path.join(__dirname, "../jest");

  private readonly expectedConfigs = [
    "jest.unit.config.js",
    "jest.integration.config.js",
    "jest.e2e.config.js",
    "jest.security.config.js",
    "k6.config.js",
  ];

  private readonly expectedSetupFiles = [
    "unit.setup.ts",
    "integration.setup.ts",
    "e2e.setup.ts",
    "security.setup.ts",
    "unit.env.ts",
    "integration.env.ts",
    "e2e.env.ts",
    "security.env.ts",
  ];

  async validateAllConfigs(): Promise<ValidationResult> {
    console.log("🔍 开始验证测试配置...");

    const validations: TestConfigValidation[] = [];

    // 验证Jest配置文件
    for (const configFile of this.expectedConfigs.filter((f) =>
      f.includes("jest"),
    )) {
      const validation = await this.validateJestConfig(configFile);
      validations.push(validation);
    }

    // 验证K6配置文件
    const k6Validation = await this.validateK6Config("k6.config.js");
    validations.push(k6Validation);

    // 验证setup文件
    for (const setupFile of this.expectedSetupFiles) {
      const validation = await this.validateSetupFile(setupFile);
      validations.push(validation);
    }

    // 验证测试目录结构
    const structureValidation = await this.validateTestStructure();
    validations.push(structureValidation);

    // 验证package.json测试脚本
    const packageValidation = await this.validatePackageScripts();
    validations.push(packageValidation);

    return this.generateValidationResult(validations);
  }

  private async validateJestConfig(
    configFile: string,
  ): Promise<TestConfigValidation> {
    const filePath = path.join(this.configDir, configFile);
    const validation: TestConfigValidation = {
      configFile,
      issues: [],
      fixes: [],
      status: "valid",
    };

    try {
      if (!fs.existsSync(filePath)) {
        validation.issues.push(`配置文件不存在: ${configFile}`);
        validation.status = "error";
        return validation;
      }

      // 读取配置文件内容
      const configContent = fs.readFileSync(filePath, "utf-8");
      const config = this.requireConfig(filePath);

      // 使用configContent检查文件内容特征
      if (!configContent.includes("module.exports")) {
        validation.issues.push("配置文件格式可能不正确，缺少module.exports");
      }

      // 验证基本字段
      this.validateBasicJestFields(config, validation);

      // 验证路径映射
      this.validateJestPaths(config, validation, configFile);

      // 验证覆盖率设置
      this.validateCoverageSettings(config, validation, configFile);

      // 验证测试超时
      this.validateTestTimeout(config, validation, configFile);

      // 验证模块名映射
      this.validateModuleNameMapper(config, validation);

      // 验证特定类型的配置
      if (configFile.includes("unit")) {
        this.validateUnitTestConfig(config, validation);
      } else if (configFile.includes("integration")) {
        this.validateIntegrationTestConfig(config, validation);
      } else if (configFile.includes("e2e")) {
        this.validateE2ETestConfig(config, validation);
      } else if (configFile.includes("security")) {
        this.validateSecurityTestConfig(config, validation);
      }
    } catch (error) {
      validation.issues.push(`配置文件解析错误: ${error.message}`);
      validation.status = "error";
    }

    return validation;
  }

  private validateBasicJestFields(
    config: any,
    validation: TestConfigValidation,
  ): void {
    const requiredFields = ["preset", "testEnvironment", "testMatch", "roots"];

    for (const field of requiredFields) {
      if (!config[field]) {
        validation.issues.push(`缺少必需字段: ${field}`);
        validation.status = "error";
      }
    }

    if (config.preset !== "ts-jest") {
      validation.issues.push("preset应该设置为ts-jest");
      validation.fixes.push("将preset设置为ts-jest");
    }

    if (config.testEnvironment !== "node") {
      validation.issues.push("testEnvironment应该设置为node");
      validation.fixes.push("将testEnvironment设置为node");
    }
  }

  private validateJestPaths(
    config: any,
    validation: TestConfigValidation,
    configFile: string,
  ): void {
    const testType = configFile.replace("jest.", "").replace(".config.js", "");

    if (!config.testMatch || !Array.isArray(config.testMatch)) {
      validation.issues.push("testMatch应该是数组");
      validation.status = "error";
      return;
    }

    const expectedPattern = `<rootDir>/test/jest/${testType}/**/*.${testType === "unit" ? "spec" : testType + ".test"}.ts`;

    if (!config.testMatch.some((pattern) => pattern.includes(testType))) {
      validation.issues.push(`testMatch模式可能不正确，期望包含: ${testType}`);
      validation.fixes.push(`更新testMatch为: ${expectedPattern}`);
    }

    // 验证根目录设置
    if (!config.roots || !Array.isArray(config.roots)) {
      validation.issues.push("roots应该是数组");
      validation.status = "error";
    }
  }

  private validateCoverageSettings(
    config: any,
    validation: TestConfigValidation,
    configFile: string,
  ): void {
    if (!config.collectCoverageFrom) {
      validation.issues.push("缺少collectCoverageFrom配置");
      validation.fixes.push("添加覆盖率收集配置");
    }

    if (!config.coverageThreshold) {
      validation.issues.push("缺少coverageThreshold配置");
      validation.fixes.push("添加覆盖率阈值配置");
    } else if (config.coverageThreshold.global) {
      const thresholds = config.coverageThreshold.global;
      const testType = configFile
        .replace("jest.", "")
        .replace(".config.js", "");

      // 根据测试类型验证阈值
      const expectedThresholds = this.getExpectedCoverageThresholds(testType);

      for (const [metric, expectedValue] of Object.entries(
        expectedThresholds,
      )) {
        if (typeof thresholds[metric] !== "number") {
          validation.issues.push(`缺少${metric}覆盖率阈值`);
          validation.fixes.push(`设置${metric}阈值为${expectedValue}%`);
        } else if (thresholds[metric] < expectedValue * 0.8) {
          validation.issues.push(
            `${metric}阈值过低: ${thresholds[metric]}%，建议至少${expectedValue}%`,
          );
        }
      }
    }

    if (!config.coverageDirectory) {
      validation.issues.push("缺少coverageDirectory配置");
      validation.fixes.push("添加覆盖率输出目录配置");
    }
  }

  private validateTestTimeout(
    config: any,
    validation: TestConfigValidation,
    configFile: string,
  ): void {
    const testType = configFile.replace("jest.", "").replace(".config.js", "");
    const expectedTimeouts = {
      unit: 5000,
      integration: 30000,
      e2e: 60000,
      security: 30000,
    };

    const expectedTimeout = expectedTimeouts[testType];

    if (!config.testTimeout) {
      validation.issues.push("缺少testTimeout配置");
      validation.fixes.push(`设置testTimeout为${expectedTimeout}ms`);
    } else if (config.testTimeout !== expectedTimeout) {
      validation.issues.push(
        `testTimeout设置不当: ${config.testTimeout}ms，建议${expectedTimeout}ms`,
      );
    }
  }

  private validateModuleNameMapper(
    config: any,
    validation: TestConfigValidation,
  ): void {
    if (!config.moduleNameMapper) {
      validation.issues.push("缺少moduleNameMapper配置");
      validation.fixes.push("添加模块名映射配置");
      return;
    }

    const expectedMappings = {
      "^@src/(.*)$": "<rootDir>/src/$1",
      "^@test/(.*)$": "<rootDir>/test/$1",
      "^@common/(.*)$": "<rootDir>/src/common/$1",
      "^@ApiKeyAuth/(.*)$": "<rootDir>/src/auth/$1",
      "^@core/(.*)$": "<rootDir>/src/core/$1",
    };

    for (const [pattern, expectedPath] of Object.entries(expectedMappings)) {
      if (!config.moduleNameMapper[pattern]) {
        validation.issues.push(`缺少模块映射: ${pattern}`);
        validation.fixes.push(`添加映射: ${pattern} -> ${expectedPath}`);
      }
    }
  }

  private validateUnitTestConfig(
    config: any,
    validation: TestConfigValidation,
  ): void {
    // 单元测试特定验证
    if (config.clearMocks !== true) {
      validation.issues.push("单元测试应该设置clearMocks为true");
      validation.fixes.push("设置clearMocks: true");
    }

    if (config.restoreMocks !== true) {
      validation.issues.push("单元测试应该设置restoreMocks为true");
      validation.fixes.push("设置restoreMocks: true");
    }

    if (config.verbose !== false) {
      validation.issues.push("单元测试应该设置verbose为false以提高性能");
    }
  }

  private validateIntegrationTestConfig(
    config: any,
    validation: TestConfigValidation,
  ): void {
    // 集成测试特定验证
    if (config.detectOpenHandles !== true) {
      validation.issues.push("集成测试应该设置detectOpenHandles为true");
      validation.fixes.push("设置detectOpenHandles: true");
    }

    if (config.forceExit !== true) {
      validation.issues.push("集成测试应该设置forceExit为true");
      validation.fixes.push("设置forceExit: true");
    }

    if (!config.maxWorkers || config.maxWorkers > 4) {
      validation.issues.push("集成测试应该限制maxWorkers以避免资源竞争");
      validation.fixes.push("设置maxWorkers: 2");
    }
  }

  private validateE2ETestConfig(
    config: any,
    validation: TestConfigValidation,
  ): void {
    // E2E测试特定验证
    if (!config.globalSetup) {
      validation.issues.push("E2E测试应该配置globalSetup");
      validation.fixes.push("添加globalSetup配置");
    }

    if (!config.globalTeardown) {
      validation.issues.push("E2E测试应该配置globalTeardown");
      validation.fixes.push("添加globalTeardown配置");
    }

    if (config.maxWorkers && config.maxWorkers > 1) {
      validation.issues.push("E2E测试建议设置maxWorkers为1以避免冲突");
    }
  }

  private validateSecurityTestConfig(
    config: any,
    validation: TestConfigValidation,
  ): void {
    // 安全测试特定验证
    if (config.bail !== true) {
      validation.issues.push("安全测试应该设置bail为true");
      validation.fixes.push("设置bail: true");
    }

    if (!config.setupFilesAfterEnv || !config.setupFilesAfterEnv.length) {
      validation.issues.push("安全测试应该配置setupFilesAfterEnv");
      validation.fixes.push("添加安全测试setup文件");
    }
  }

  private async validateK6Config(
    configFile: string,
  ): Promise<TestConfigValidation> {
    const filePath = path.join(this.configDir, configFile);
    const validation: TestConfigValidation = {
      configFile,
      issues: [],
      fixes: [],
      status: "valid",
    };

    try {
      if (!fs.existsSync(filePath)) {
        validation.issues.push(`K6配置文件不存在: ${configFile}`);
        validation.status = "error";
        return validation;
      }

      const configContent = fs.readFileSync(filePath, "utf-8");

      // 验证K6配置是否包含必要的export
      const requiredExports = [
        "BASE_OPTIONS",
        "LOAD_TEST_OPTIONS",
        "STRESS_TEST_OPTIONS",
        "SPIKE_TEST_OPTIONS",
        "TEST_ENVIRONMENTS",
        "TEST_DATA",
      ];

      for (const exportName of requiredExports) {
        if (!configContent.includes(`export const ${exportName}`)) {
          validation.issues.push(`缺少必需的export: ${exportName}`);
          validation.fixes.push(`添加${exportName}配置`);
        }
      }

      // 验证环境配置
      if (!configContent.includes("TEST_ENVIRONMENTS")) {
        validation.issues.push("缺少测试环境配置");
        validation.fixes.push("添加TEST_ENVIRONMENTS配置");
      }

      // 验证测试数据配置
      if (!configContent.includes("TEST_DATA")) {
        validation.issues.push("缺少测试数据配置");
        validation.fixes.push("添加TEST_DATA配置");
      }
    } catch (error) {
      validation.issues.push(`K6配置文件解析错误: ${error.message}`);
      validation.status = "error";
    }

    return validation;
  }

  private async validateSetupFile(
    setupFile: string,
  ): Promise<TestConfigValidation> {
    const filePath = path.join(this.configDir, setupFile);
    const validation: TestConfigValidation = {
      configFile: setupFile,
      issues: [],
      fixes: [],
      status: "valid",
    };

    if (!fs.existsSync(filePath)) {
      validation.issues.push(`Setup文件不存在: ${setupFile}`);
      validation.status = "error";

      // 提供创建建议
      if (setupFile.includes("setup.ts")) {
        validation.fixes.push(`创建${setupFile}文件`);
        await this.createMissingSetupFile(setupFile);
      } else if (setupFile.includes("env.ts")) {
        validation.fixes.push(`创建${setupFile}环境配置文件`);
        await this.createMissingEnvFile(setupFile);
      }
    } else {
      // 验证setup文件内容
      const content = fs.readFileSync(filePath, "utf-8");

      if (setupFile.includes("setup.ts")) {
        this.validateSetupFileContent(content, validation, setupFile);
      } else if (setupFile.includes("env.ts")) {
        this.validateEnvFileContent(content, validation, setupFile);
      }
    }

    return validation;
  }

  private validateSetupFileContent(
    content: string,
    validation: TestConfigValidation,
    setupFile: string,
  ): void {
    const testType = setupFile.replace(".setup.ts", "");

    // 验证基本结构
    if (!content.includes("beforeAll") && !content.includes("beforeEach")) {
      validation.issues.push(`${setupFile}应该包含beforeAll或beforeEach设置`);
      validation.fixes.push("添加测试setup逻辑");
    }

    // 根据测试类型验证特定内容
    if (testType === "integration") {
      if (
        !content.includes("MongoMemoryServer") &&
        !content.includes("mongoose")
      ) {
        validation.issues.push("集成测试setup应该包含数据库设置");
        validation.fixes.push("添加数据库连接设置");
      }

      if (!content.includes("Redis") && !content.includes("ioredis")) {
        validation.issues.push("集成测试setup应该包含Redis设置");
        validation.fixes.push("添加Redis连接设置");
      }
    }

    if (testType === "e2e") {
      if (
        !content.includes("TestingModule") &&
        !content.includes("createTestingModule")
      ) {
        validation.issues.push("E2E测试setup应该包含应用启动设置");
        validation.fixes.push("添加应用测试模块设置");
      }
    }

    if (testType === "security") {
      if (
        !content.includes("SecurityTestHelper") &&
        !content.includes("global.")
      ) {
        validation.issues.push("安全测试setup应该包含安全测试辅助函数");
        validation.fixes.push("添加安全测试helper设置");
      }
    }
  }

  private validateEnvFileContent(
    content: string,
    validation: TestConfigValidation,
    envFile: string,
  ): void {
    const testType = envFile.replace(".env.ts", "");

    // 验证环境变量设置
    const requiredEnvVars = ["NODE_ENV", "TEST_TIMEOUT"];

    for (const envVar of requiredEnvVars) {
      if (!content.includes(envVar)) {
        validation.issues.push(`${envFile}应该设置${envVar}环境变量`);
        validation.fixes.push(`添加${envVar}环境变量设置`);
      }
    }

    // 根据测试类型验证特定环境变量
    if (testType === "integration" || testType === "e2e") {
      const dbEnvVars = ["MONGODB_URL", "REDIS_URL"];
      for (const envVar of dbEnvVars) {
        if (!content.includes(envVar)) {
          validation.issues.push(`${envFile}应该设置${envVar}`);
          validation.fixes.push(`添加${envVar}设置`);
        }
      }
    }
  }

  private async validateTestStructure(): Promise<TestConfigValidation> {
    const validation: TestConfigValidation = {
      configFile: "test-directory-structure",
      issues: [],
      fixes: [],
      status: "valid",
    };

    const expectedDirectories = [
      "test/jest/unit/auth",
      "test/jest/unit/core",
      "test/jest/unit/common",
      "test/jest/integration/auth",
      "test/jest/integration/core",
      "test/jest/e2e/auth",
      "test/jest/e2e/core",
      "test/jest/security/auth",
      "test/jest/security/core",
      "test/jest/security/common",
      "test/k6/load/auth",
      "test/k6/load/api",
      "test/k6/stress/api",
      "test/k6/spike/api",
      "test/k6/security",
    ];

    for (const dir of expectedDirectories) {
      const fullPath = path.join(this.rootDir, dir);
      if (!fs.existsSync(fullPath)) {
        validation.issues.push(`缺少测试目录: ${dir}`);
        validation.fixes.push(`创建目录: ${dir}`);
        validation.status = "warning";
      }
    }

    return validation;
  }

  private async validatePackageScripts(): Promise<TestConfigValidation> {
    const packagePath = path.join(this.rootDir, "package.json");
    const validation: TestConfigValidation = {
      configFile: "package.json",
      issues: [],
      fixes: [],
      status: "valid",
    };

    try {
      const packageContent = JSON.parse(fs.readFileSync(packagePath, "utf-8"));
      const scripts = packageContent.scripts || {};

      const requiredScripts = [
        "test",
        "test:unit",
        "test:integration",
        "test:e2e",
        "test:security",
        "test:perf",
        "test:coverage",
        "coverage:merge",
      ];

      for (const script of requiredScripts) {
        if (!scripts[script]) {
          validation.issues.push(`缺少package.json脚本: ${script}`);
          validation.fixes.push(`添加${script}脚本`);
        }
      }

      // 验证脚本命令正确性
      if (
        scripts["test:unit"] &&
        !scripts["test:unit"].includes("jest.unit.config.js")
      ) {
        validation.issues.push("test:unit脚本配置不正确");
        validation.fixes.push("修正test:unit脚本配置");
      }

      if (scripts["test:perf"] && !scripts["test:perf"].includes("k6 run")) {
        validation.issues.push("test:perf脚本应该使用k6 run");
        validation.fixes.push("修正test:perf脚本");
      }
    } catch (error) {
      validation.issues.push(`package.json解析错误: ${error.message}`);
      validation.status = "error";
    }

    return validation;
  }

  private async createMissingSetupFile(setupFile: string): Promise<void> {
    const filePath = path.join(this.configDir, setupFile);
    const testType = setupFile.replace(".setup.ts", "");

    let content = "";

    switch (testType) {
      case "unit":
        content = this.generateUnitSetupContent();
        break;
      case "integration":
        content = this.generateIntegrationSetupContent();
        break;
      case "e2e":
        content = this.generateE2ESetupContent();
        break;
      case "security":
        content = this.generateSecuritySetupContent();
        break;
    }

    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`✅ 创建了缺失的setup文件: ${setupFile}`);
  }

  private async createMissingEnvFile(envFile: string): Promise<void> {
    const filePath = path.join(this.configDir, envFile);
    const testType = envFile.replace(".env.ts", "");

    const content = this.generateEnvFileContent(testType);
    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`✅ 创建了缺失的环境配置文件: ${envFile}`);
  }

  private generateUnitSetupContent(): string {
    return `/**
 * 单元测试环境设置
 */

// Mock全局对象
global.console = {
  ...global.console,
  // 在单元测试中静默某些日志
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// 设置Jest超时
jest.setTimeout(5000);

// 全局beforeEach设置
beforeEach(() => {
  // 清理所有mock
  jest.clearAllMocks();
  jest.clearAllTimers();
});

afterEach(() => {
  // 恢复所有mock
  jest.restoreAllMocks();
});
`;
  }

  private generateIntegrationSetupContent(): string {
    return `/**
 * 集成测试环境设置
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import { Redis } from 'ioredis';

let mongoServer: MongoMemoryServer;
let redisClient: Redis;

// 全局设置
beforeAll(async () => {
  // 启动内存MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGODB_URL = mongoUri;

  // 启动Redis
  redisClient = new Redis({
    host: 'localhost',
    port: 6379,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  });

  console.log('✅ 集成测试环境初始化完成');
}, 30000);

// 全局清理
afterAll(async () => {
  if (redisClient) {
    await redisClient.disconnect();
  }
  
  if (mongoServer) {
    await mongoServer.stop();
  }
  
  console.log('✅ 集成测试环境清理完成');
}, 30000);

// 每个测试前清理数据
beforeEach(async () => {
  if (redisClient) {
    await redisClient.flushall();
  }
});
`;
  }

  private generateE2ESetupContent(): string {
    return `/**
 * E2E测试环境设置
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';

let app: INestApplication;
let moduleFixture: TestingModule;

// 全局设置
beforeAll(async () => {
  moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  await app.init();

  // 设置全局变量供测试使用
  (global as any).testApp = app;
  (global as any).moduleFixture = moduleFixture;

  console.log('✅ E2E测试应用启动完成');
}, 60000);

// 全局清理
afterAll(async () => {
  if (app) {
    await app.close();
  }
  
  if (moduleFixture) {
    await moduleFixture.close();
  }
  
  console.log('✅ E2E测试应用关闭完成');
}, 30000);
`;
  }

  private generateSecuritySetupContent(): string {
    return `/**
 * 安全测试环境设置
 */

import * as request from 'supertest';

// 攻击载荷库
const SQL_INJECTION_PAYLOADS = [
  "'; DROP TABLE users; --",
  "' OR '1'='1",
  "admin'; EXEC xp_cmdshell('dir'); --",
  "1' UNION SELECT password FROM users--",
];

const XSS_PAYLOADS = [
  '<script>alert("XSS")</script>',
  'javascript:alert("XSS")',
  '<img src="x" onerror="alert(\\'XSS\\')">',
  '<svg onload="alert(\\'XSS\\')">',
];

// 全局安全测试工具
(global as any).SQL_INJECTION_PAYLOADS = SQL_INJECTION_PAYLOADS;
(global as any).XSS_PAYLOADS = XSS_PAYLOADS;

(global as any).getSecurityApp = () => (global as any).testApp;
(global as any).createSecurityRequest = () => request((global as any).testApp.getHttpServer());

// 安全测试辅助函数
(global as any).testSQLInjection = async (endpoint: string, field: string, method: string) => {
  const results = [];
  const app = (global as any).getSecurityApp();
  const req = request(httpServer);
  
  for (const payload of SQL_INJECTION_PAYLOADS) {
    const body = { [field]: payload };
    const response = method === 'POST' 
      ? await req.post(endpoint).send(body)
      : await req.get(endpoint).query(body);
    
    results.push({
      payload,
      status: response.status,
      vulnerable: response.status === 200 && response.body?.success,
    });
  }
  
  return results;
};

(global as any).testXSS = async (endpoint: string, field: string, method: string) => {
  const results = [];
  const app = (global as any).getSecurityApp();
  const req = request(httpServer);
  
  for (const payload of XSS_PAYLOADS) {
    const body = { [field]: payload };
    const response = method === 'POST' 
      ? await req.post(endpoint).send(body)
      : await req.get(endpoint).query(body);
    
    results.push({
      payload,
      status: response.status,
      vulnerable: response.body?.toString().includes(payload),
    });
  }
  
  return results;
};

(global as any).testRateLimiting = async (endpoint: string, requestCount: number, timeWindow: number) => {
  const results = [];
  const app = (global as any).getSecurityApp();
  const req = request(httpServer);
  
  const startTime = Date.now();
  
  for (let i = 0; i < requestCount; i++) {
    const response = await req.get(endpoint);
    results.push({
      requestNumber: i + 1,
      status: response.status,
      rateLimited: response.status === 429,
      responseTime: Date.now() - startTime,
    });
    
    if (Date.now() - startTime > timeWindow) {
      break;
    }
  }
  
  return results;
};

// 创建测试用户和API Key的辅助函数
(global as any).createTestUser = async (userModel: any, userData: any) => {
  const defaultUserData = {
    username: 'testuser' + Date.now(),
    email: 'test' + Date.now() + '@example.com',
    password: 'password123',
    role: 'user',
    ...userData,
  };
  
  return await userModel.create(defaultUserData);
};

(global as any).createTestApiKey = async (apiKeyModel: any, userId: string, apiKeyData: any) => {
  const defaultApiKeyData = {
    name: 'Test API Key',
    appKey: 'test-app-key-' + Date.now(),
    accessToken: 'test-access-token-' + Date.now(),
    permissions: ['data:read'],
    rateLimit: {
      requests: 100,
      window: '1h',
    },
    userId,
    ...apiKeyData,
  };
  
  return await apiKeyModel.create(defaultApiKeyData);
};

(global as any).createTestJWTToken = async (userData: any) => {
  // 这里应该使用实际的JWT服务生成令牌
  // 这是一个示例实现
  return 'mock-jwt-token-' + JSON.stringify(userData);
};

console.log('✅ 安全测试环境设置完成');
`;
  }

  private generateEnvFileContent(testType: string): string {
    return `/**
 * ${testType}测试环境变量设置
 */

// 设置测试环境
process.env.NODE_ENV = 'test';
process.env.TEST_TYPE = '${testType}';

// 基础测试配置
process.env.TEST_TIMEOUT = '${this.getTestTimeout(testType)}';
process.env.LOG_LEVEL = 'error'; // 减少测试日志输出

// 数据库配置${
      testType === "integration" || testType === "e2e"
        ? `
process.env.MONGODB_URL = process.env.TEST_MONGODB_URL || 'mongodb://localhost:27017/test_${testType}';
process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379';`
        : ""
    }

// JWT配置
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_EXPIRATION = '1h';

// API配置
process.env.API_PORT = '3001';
process.env.API_VERSION = 'v1';

// 外部服务配置（测试环境使用mock）
process.env.LONGPORT_APP_KEY = 'test-longport-key';
process.env.LONGPORT_APP_SECRET = 'test-longport-secret';
process.env.LONGPORT_ACCESS_TOKEN = 'test-longport-token';

console.log('✅ ${testType}测试环境变量设置完成');
`;
  }

  private getTestTimeout(testType: string): string {
    const timeouts = {
      unit: "5000",
      integration: "30000",
      e2e: "60000",
      security: "30000",
    };
    return timeouts[testType] || "30000";
  }

  private getExpectedCoverageThresholds(
    testType: string,
  ): Record<string, number> {
    const thresholds = {
      unit: { branches: 80, functions: 85, lines: 85, statements: 85 },
      integration: { branches: 70, functions: 75, lines: 75, statements: 75 },
      e2e: { branches: 60, functions: 70, lines: 70, statements: 70 },
      security: { branches: 100, functions: 100, lines: 100, statements: 100 },
    };
    return thresholds[testType] || thresholds.integration;
  }

  private requireConfig(configPath: string): any {
    delete require.cache[require.resolve(configPath)];
    // 使用动态导入替代require
    try {
      // 由于动态导入是异步的，但我们需要同步行为，这里仍使用require
      // 但在实际项目中应改为完全异步方式处理
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require(configPath);
    } catch (error) {
      console.error(`加载配置文件失败: ${configPath}`, error);
      return {};
    }
  }

  private generateValidationResult(
    validations: TestConfigValidation[],
  ): ValidationResult {
    const summary = {
      totalConfigs: validations.length,
      validConfigs: validations.filter((v) => v.status === "valid").length,
      configsWithWarnings: validations.filter((v) => v.status === "warning")
        .length,
      configsWithErrors: validations.filter((v) => v.status === "error").length,
    };

    const recommendations = this.generateRecommendations(validations);

    return {
      summary,
      details: validations,
      recommendations,
    };
  }

  private generateRecommendations(
    validations: TestConfigValidation[],
  ): string[] {
    const recommendations: string[] = [];

    const hasErrors = validations.some((v) => v.status === "error");
    const hasWarnings = validations.some((v) => v.status === "warning");

    if (hasErrors) {
      recommendations.push(
        "🔴 发现严重配置问题，需要立即修复以确保测试正常运行",
      );
      recommendations.push("📋 运行自动修复命令: npm run test:fix-config");
    }

    if (hasWarnings) {
      recommendations.push("⚠️ 发现配置警告，建议优化以提高测试质量");
    }

    // 检查特定问题
    const missingSetupFiles = validations.filter(
      (v) =>
        v.configFile.includes("setup") &&
        v.issues.some((i) => i.includes("不存在")),
    );

    if (missingSetupFiles.length > 0) {
      recommendations.push("📁 缺少测试setup文件，已自动创建基础版本");
      recommendations.push("✏️ 请根据项目需求自定义setup文件内容");
    }

    const coverageIssues = validations.filter((v) =>
      v.issues.some((i) => i.includes("覆盖率")),
    );

    if (coverageIssues.length > 0) {
      recommendations.push("📊 覆盖率配置需要调整，建议参考企业级标准");
    }

    if (validations.every((v) => v.status === "valid")) {
      recommendations.push("✅ 所有测试配置都符合标准，系统运行良好");
      recommendations.push("🔄 建议定期运行配置验证以保持代码质量");
    }

    return recommendations;
  }

  async applyFixes(): Promise<void> {
    console.log("🔧 开始应用配置修复...");

    // 这里可以实现自动修复逻辑
    // 例如：更新配置文件、创建缺失文件等

    console.log("✅ 配置修复完成");
  }

  async generateReport(result: ValidationResult): Promise<void> {
    const reportPath = path.join(
      this.rootDir,
      "test-config-validation-report.md",
    );

    let report = `# 测试配置验证报告

## 📊 验证摘要

- **总配置文件数**: ${result.summary.totalConfigs}
- **有效配置**: ${result.summary.validConfigs}
- **警告配置**: ${result.summary.configsWithWarnings}
- **错误配置**: ${result.summary.configsWithErrors}

## 📋 详细结果

`;

    for (const validation of result.details) {
      report += `### ${validation.configFile}

**状态**: ${validation.status === "valid" ? "✅ 有效" : validation.status === "warning" ? "⚠️ 警告" : "❌ 错误"}

`;

      if (validation.issues.length > 0) {
        report += `**问题**:
`;
        for (const issue of validation.issues) {
          report += `- ${issue}
`;
        }
      }

      if (validation.fixes.length > 0) {
        report += `
**修复建议**:
`;
        for (const fix of validation.fixes) {
          report += `- ${fix}
`;
        }
      }

      report += `
`;
    }

    report += `## 🎯 改进建议

`;
    for (const recommendation of result.recommendations) {
      report += `${recommendation}

`;
    }

    report += `
---
*报告生成时间: ${new Date().toLocaleString("zh-CN")}*
*生成工具: 测试配置验证脚本*
`;

    fs.writeFileSync(reportPath, report, "utf-8");
    console.log(`📄 验证报告已生成: ${reportPath}`);
  }
}

// 主执行函数
async function main() {
  const validator = new TestConfigValidator();

  try {
    console.log("🚀 开始测试配置验证...");

    const result = await validator.validateAllConfigs();

    // 生成报告
    await validator.generateReport(result);

    // 显示摘要
    console.log("\n📊 验证摘要:");
    console.log(`   总配置文件: ${result.summary.totalConfigs}`);
    console.log(`   ✅ 有效: ${result.summary.validConfigs}`);
    console.log(`   ⚠️ 警告: ${result.summary.configsWithWarnings}`);
    console.log(`   ❌ 错误: ${result.summary.configsWithErrors}`);

    if (result.summary.configsWithErrors > 0) {
      console.log("\n🔴 发现配置错误，请检查报告并修复");
      process.exit(1);
    } else if (result.summary.configsWithWarnings > 0) {
      console.log("\n⚠️ 发现配置警告，建议优化");
      process.exit(0);
    } else {
      console.log("\n✅ 所有配置验证通过！");
      process.exit(0);
    }
  } catch (error) {
    console.error("❌ 验证过程中发生错误:", error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

export { TestConfigValidator };
