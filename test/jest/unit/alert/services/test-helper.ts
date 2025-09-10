/**
 * Alert服务测试辅助工具
 * 🎯 提供通用的测试数据和模拟对象
 */

import { IAlert, IAlertRule, IMetricData } from '@alert/interfaces';
import { AlertStatus, AlertSeverity } from '@alert/types/alert.types';
import { CreateAlertRuleDto, UpdateAlertRuleDto } from '@alert/dto';

/**
 * 创建模拟的告警规则
 */
export function createMockRule(overrides?: Partial<IAlertRule>): IAlertRule {
  return {
    id: 'rule_test_123',
    name: 'Test Alert Rule',
    description: 'Test rule for unit testing',
    metric: 'test.metric',
    operator: '>',
    threshold: 80,
    duration: 300,
    cooldown: 600,
    severity: 'warning',
    enabled: true,
    channels: [
      {
        id: 'channel_1',
        name: 'Email Channel',
        type: 'email' as any,
        config: { to: 'test@example.com' },
        enabled: true,
      },
    ],
    tags: { env: 'test', module: 'alert' },
    createdBy: 'test_user',
    ...overrides,
  };
}

/**
 * 创建模拟的告警
 */
export function createMockAlert(overrides?: Partial<IAlert>): IAlert {
  const now = new Date();
  return {
    id: 'alert_test_123',
    ruleId: 'rule_test_123',
    ruleName: 'Test Alert Rule',
    metric: 'test.metric',
    value: 85,
    threshold: 80,
    severity: 'warning',
    status: AlertStatus.FIRING,
    message: 'Test alert triggered',
    startTime: now,
    tags: { env: 'test' },
    context: { source: 'unit_test' },
    ...overrides,
  };
}

/**
 * 创建模拟的指标数据
 */
export function createMockMetricData(overrides?: Partial<IMetricData>): IMetricData {
  return {
    metric: 'test.metric',
    value: 85,
    timestamp: new Date(),
    tags: { host: 'test-host' },
    source: 'test-provider',
    ...overrides,
  };
}

/**
 * 创建模拟的规则创建DTO
 */
export function createMockCreateRuleDto(overrides?: Partial<CreateAlertRuleDto>): CreateAlertRuleDto {
  return {
    name: 'New Test Rule',
    description: 'New test rule description',
    metric: 'new.test.metric',
    operator: '>',
    threshold: 90,
    duration: 300,
    cooldown: 600,
    severity: 'critical',
    enabled: true,
    channels: [],
    tags: { env: 'test' },
    ...overrides,
  };
}

/**
 * 创建模拟的规则更新DTO
 */
export function createMockUpdateRuleDto(overrides?: Partial<UpdateAlertRuleDto>): UpdateAlertRuleDto {
  return {
    threshold: 95,
    severity: 'critical',
    ...overrides,
  };
}

/**
 * 创建模拟的仓储层
 */
export function createMockRepository() {
  return {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
    findAllEnabled: jest.fn(),
    findById: jest.fn(),
    findByIds: jest.fn(),
    findActive: jest.fn(),
    toggle: jest.fn(),
    countAll: jest.fn(),
    countEnabled: jest.fn(),
    getStatistics: jest.fn(),
    cleanup: jest.fn(),
  };
}

/**
 * 创建模拟的缓存服务
 */
export function createMockCacheService() {
  return {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    getClient: jest.fn(() => ({
      keys: jest.fn(),
      ttl: jest.fn(),
    })),
    hashGet: jest.fn(),
    hashSet: jest.fn(),
    hashGetAll: jest.fn(),
    hashDel: jest.fn(),
    listPush: jest.fn(),
    listRange: jest.fn(),
    listTrim: jest.fn(),
    setAdd: jest.fn(),
    setMembers: jest.fn(),
    setIsMember: jest.fn(),
    setRemove: jest.fn(),
  };
}

/**
 * 创建模拟的事件发射器
 */
export function createMockEventEmitter() {
  return {
    emit: jest.fn(),
    emitAsync: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    off: jest.fn(),
    removeAllListeners: jest.fn(),
    listenerCount: jest.fn(),
    listeners: jest.fn(),
    rawListeners: jest.fn(),
    eventNames: jest.fn(),
  };
}

/**
 * 创建模拟的分页服务
 */
export function createMockPaginationService() {
  return {
    normalizePaginationQuery: jest.fn(({ page, limit }) => ({
      page: page || 1,
      limit: limit || 20,
    })),
    createPagination: jest.fn((page, limit, total) => ({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    })),
  };
}

/**
 * 测试数据生成器
 */
export class TestDataGenerator {
  private counter = 0;

  /**
   * 生成唯一ID
   */
  generateId(prefix: string = 'test'): string {
    return `${prefix}_${Date.now()}_${++this.counter}`;
  }

  /**
   * 批量生成规则
   */
  generateRules(count: number): IAlertRule[] {
    return Array.from({ length: count }, (_, i) =>
      createMockRule({
        id: this.generateId('rule'),
        name: `Test Rule ${i + 1}`,
        metric: `metric.${i + 1}`,
        threshold: 70 + i * 5,
      })
    );
  }

  /**
   * 批量生成告警
   */
  generateAlerts(count: number): IAlert[] {
    return Array.from({ length: count }, (_, i) =>
      createMockAlert({
        id: this.generateId('alert'),
        ruleId: `rule_${i + 1}`,
        ruleName: `Test Rule ${i + 1}`,
        value: 80 + i * 5,
      })
    );
  }

  /**
   * 批量生成指标数据
   */
  generateMetrics(count: number): IMetricData[] {
    const now = Date.now();
    return Array.from({ length: count }, (_, i) =>
      createMockMetricData({
        metric: `metric.${i + 1}`,
        value: Math.random() * 100,
        timestamp: new Date(now - i * 60000), // 每分钟一个数据点
      })
    );
  }
}

/**
 * 等待异步操作完成
 */
export function waitForAsync(ms: number = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 创建模拟的配置服务
 */
export function createMockConfigService(config: any = {}) {
  return {
    get: jest.fn((key: string) => {
      const keys = key.split('.');
      let value = config;
      for (const k of keys) {
        value = value?.[k];
      }
      return value;
    }),
    getOrThrow: jest.fn((key: string) => {
      const value = config[key];
      if (value === undefined) {
        throw new Error(`Configuration key "${key}" not found`);
      }
      return value;
    }),
  };
}