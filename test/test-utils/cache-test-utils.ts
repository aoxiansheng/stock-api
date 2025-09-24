/**
 * Cache Testing Utilities
 * Shared utilities for cache-related integration tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RedisModule } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { FlexibleMappingRuleResponseDto } from '../../src/core/00-prepare/data-mapper/dto/flexible-mapping-rule.dto';

/**
 * Generate a test rule with optional overrides
 */
export function generateTestRule(overrides: Partial<FlexibleMappingRuleResponseDto> = {}): FlexibleMappingRuleResponseDto {
  return {
    id: `test_rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: `Test Rule ${Date.now()}`,
    description: 'Test rule for testing purposes',
    provider: 'test_provider',
    apiType: 'rest',
    transDataRuleListType: 'test_fields',
    isDefault: false,
    isActive: true,
    priority: 1,
    fieldMappings: {
      'test_field_1': 'mapped_field_1',
      'test_field_2': 'mapped_field_2',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    version: '1.0.0',
    tags: ['test'],
    ...overrides,
  } as FlexibleMappingRuleResponseDto;
}

/**
 * Create a test module with Redis and other common dependencies
 */
export async function createTestModule(additionalImports: any[] = []): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: ['.env.test', '.env'],
      }),
      EventEmitterModule.forRoot(),
      RedisModule.forRootAsync({
        useFactory: (configService: ConfigService) => ({
          type: 'single',
          url: configService.get('REDIS_URL', 'redis://localhost:6379'),
          retryDelayOnFailover: 100,
          enableReadyCheck: false,
          maxRetriesPerRequest: 3,
        }),
        inject: [ConfigService],
      }),
      ...additionalImports,
    ],
  }).compile();
}

/**
 * Wait for Redis connection to be ready
 */
export async function waitForRedis(redis: Redis, timeoutMs: number = 5000): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      await redis.ping();
      return;
    } catch (error) {
      // Wait 100ms before retry
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  throw new Error(`Redis connection timeout after ${timeoutMs}ms`);
}

/**
 * Clean up test keys from Redis
 */
export async function cleanupTestKeys(redis: Redis, pattern: string): Promise<void> {
  try {
    const keys = await scanKeys(redis, pattern);
    if (keys.length > 0) {
      // Delete in batches to avoid blocking Redis
      const BATCH_SIZE = 100;
      for (let i = 0; i < keys.length; i += BATCH_SIZE) {
        const batch = keys.slice(i, i + BATCH_SIZE);
        await redis.del(...batch);
      }
      console.log(`🧹 Cleaned up ${keys.length} test keys matching pattern: ${pattern}`);
    }
  } catch (error) {
    console.warn(`Failed to cleanup test keys: ${error.message}`);
  }
}

/**
 * Scan Redis keys with pattern
 */
export async function scanKeys(redis: Redis, pattern: string, limit: number = 10000): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '0';

  do {
    const result = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', '100');
    cursor = result[0];
    keys.push(...result[1]);

    if (keys.length >= limit) {
      break;
    }
  } while (cursor !== '0');

  return keys;
}

/**
 * Generate multiple test rules for batch testing
 */
export function generateTestRules(count: number, baseOverrides: Partial<FlexibleMappingRuleResponseDto> = {}): FlexibleMappingRuleResponseDto[] {
  const rules: FlexibleMappingRuleResponseDto[] = [];

  for (let i = 0; i < count; i++) {
    rules.push(generateTestRule({
      ...baseOverrides,
      name: `${baseOverrides.name || 'Test Rule'} ${i + 1}`,
      priority: i + 1,
    }));
  }

  return rules;
}

/**
 * Verify cache statistics structure
 */
export function verifyCacheStats(stats: any): void {
  expect(stats).toHaveProperty('hits');
  expect(stats).toHaveProperty('misses');
  expect(stats).toHaveProperty('hitRate');
  expect(stats).toHaveProperty('totalOperations');
  expect(stats).toHaveProperty('errorCount');
  expect(stats).toHaveProperty('avgResponseTimeMs');
  expect(stats).toHaveProperty('lastResetTime');

  expect(typeof stats.hits).toBe('number');
  expect(typeof stats.misses).toBe('number');
  expect(typeof stats.hitRate).toBe('number');
  expect(typeof stats.totalOperations).toBe('number');
  expect(typeof stats.errorCount).toBe('number');
  expect(typeof stats.avgResponseTimeMs).toBe('number');
  expect(stats.lastResetTime).toBeInstanceOf(Date);
}

/**
 * Verify health check structure
 */
export function verifyHealthCheck(health: any): void {
  expect(health).toHaveProperty('success');
  expect(health).toHaveProperty('data');
  expect(health).toHaveProperty('healthScore');
  expect(health).toHaveProperty('checks');

  expect(typeof health.success).toBe('boolean');
  expect(typeof health.healthScore).toBe('number');
  expect(Array.isArray(health.checks)).toBe(true);

  expect(health.data).toHaveProperty('connectionStatus');
  expect(health.data).toHaveProperty('memoryStatus');
  expect(health.data).toHaveProperty('performanceStatus');
  expect(health.data).toHaveProperty('errorRateStatus');
  expect(health.data).toHaveProperty('lastCheckTime');
  expect(health.data).toHaveProperty('uptimeMs');
}

/**
 * Generate test configuration for cache services
 */
export function generateTestCacheConfig(overrides: any = {}): any {
  return {
    redis: {
      host: 'localhost',
      port: 6379,
      password: undefined,
      db: 0,
    },
    cache: {
      defaultTtl: 300,
      maxMemoryPolicy: 'allkeys-lru',
      keyPrefix: 'test:',
    },
    performance: {
      enableMetrics: true,
      maxErrorHistorySize: 100,
      maxPerformanceHistorySize: 1000,
    },
    features: {
      enableCompression: false,
      enableBatching: true,
      enableCircuitBreaker: true,
      batchSize: 50,
    },
    ...overrides,
  };
}

/**
 * Measure operation performance
 */
export async function measurePerformance<T>(
  operation: () => Promise<T>,
  label: string = 'Operation'
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();
  const result = await operation();
  const duration = Date.now() - startTime;

  console.log(`⏱️ ${label} took ${duration}ms`);

  return { result, duration };
}

/**
 * Wait for a condition to be true with timeout
 */
export async function waitForCondition(
  condition: () => Promise<boolean> | boolean,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

/**
 * Create test data for cache operations
 */
export function createTestCacheData(size: number = 10): Array<{key: string, value: any}> {
  return Array.from({ length: size }, (_, i) => ({
    key: `test:key:${i}:${Date.now()}`,
    value: {
      id: i,
      data: `test_data_${i}`,
      timestamp: Date.now(),
      metadata: {
        type: 'test',
        batch: true,
      },
    },
  }));
}

/**
 * Validate cache operation result structure
 */
export function validateCacheResult(result: any, operation: string): void {
  expect(result).toHaveProperty('success');
  expect(result).toHaveProperty('status');
  expect(result).toHaveProperty('operation');
  expect(result).toHaveProperty('timestamp');

  expect(typeof result.success).toBe('boolean');
  expect(typeof result.status).toBe('string');
  expect(typeof result.operation).toBe('string');
  expect(typeof result.timestamp).toBe('number');

  if (operation === 'get') {
    expect(result).toHaveProperty('hit');
    expect(result).toHaveProperty('data');
    expect(typeof result.hit).toBe('boolean');
  }

  if (operation === 'set') {
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('ttl');
    expect(typeof result.data).toBe('boolean');
    expect(typeof result.ttl).toBe('number');
  }

  if (operation === 'delete') {
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('deletedCount');
    expect(typeof result.data).toBe('boolean');
    expect(typeof result.deletedCount).toBe('number');
  }
}

/**
 * Test error scenarios for cache operations
 */
export async function testErrorScenarios(service: any, testCases: Array<{
  operation: string;
  args: any[];
  expectedError?: RegExp;
}>): Promise<void> {
  for (const testCase of testCases) {
    const { operation, args, expectedError } = testCase;

    try {
      await service[operation](...args);
      if (expectedError) {
        throw new Error(`Expected ${operation} to throw error matching ${expectedError}`);
      }
    } catch (error) {
      if (expectedError) {
        expect(error.message).toMatch(expectedError);
      } else {
        throw error; // Re-throw if we didn't expect an error
      }
    }
  }
}