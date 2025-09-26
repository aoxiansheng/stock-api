import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model } from 'mongoose';

import { AlertRule, AlertRuleSchema, AlertRuleDocument } from '@alert/schemas/alert-rule.schema';
import { AlertSeverity } from '@alert/types/alert.types';
import { VALID_OPERATORS, ALERT_DEFAULTS } from '@alert/constants';

describe('AlertRuleSchema', () => {
  let mongod: MongoMemoryServer;
  let module: TestingModule;
  let alertRuleModel: Model<AlertRuleDocument>;
  let connection: Connection;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const mongoUri = mongod.getUri();

    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forFeature([{ name: AlertRule.name, schema: AlertRuleSchema }]),
      ],
    }).compile();

    alertRuleModel = module.get<Model<AlertRuleDocument>>(getModelToken(AlertRule.name));
    connection = module.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
    await connection.close();
    await mongod.stop();
    await module.close();
  });

  beforeEach(async () => {
    await alertRuleModel.deleteMany({});
  });

  describe('Schema Definition', () => {
    it('should have required fields', async () => {
      const rule = new alertRuleModel({
        id: 'test-rule-1',
        name: 'Test Rule',
        metric: 'cpu_usage',
        operator: '>',
        threshold: 80,
      });

      expect(rule.id).toBe('test-rule-1');
      expect(rule.name).toBe('Test Rule');
      expect(rule.metric).toBe('cpu_usage');
      expect(rule.operator).toBe('>');
      expect(rule.threshold).toBe(80);
    });

    it('should have default values for optional fields', async () => {
      const rule = new alertRuleModel({
        id: 'test-rule-2',
        name: 'Test Rule with Defaults',
        metric: 'memory_usage',
        operator: '<',
        threshold: 90,
      });

      // Check default values
      expect(rule.duration).toBe(ALERT_DEFAULTS.duration);
      expect(rule.severity).toBe(ALERT_DEFAULTS.severity);
      expect(rule.enabled).toBe(ALERT_DEFAULTS.enabled);
      expect(rule.channels).toEqual([]);
      expect(rule.tags).toEqual({});
    });

    it('should validate enum fields', async () => {
      const rule = new alertRuleModel({
        id: 'test-rule-3',
        name: 'Test Rule with Enums',
        metric: 'disk_usage',
        operator: 'invalid_operator', // Invalid operator
        threshold: 95,
        severity: 'invalid_severity', // Invalid severity
      });

      await expect(rule.save()).rejects.toThrow();
    });

    it('should accept valid enum values', async () => {
      const rule = new alertRuleModel({
        id: 'test-rule-4',
        name: 'Test Rule with Valid Enums',
        metric: 'network_usage',
        operator: '>=',
        threshold: 1000,
        severity: AlertSeverity.CRITICAL,
        enabled: true,
      });

      const savedRule = await rule.save();
      expect(savedRule.operator).toBe('>=');
      expect(savedRule.severity).toBe(AlertSeverity.CRITICAL);
      expect(savedRule.enabled).toBe(true);
    });

    it('should support all valid operators', async () => {
      for (const operator of VALID_OPERATORS) {
        const rule = new alertRuleModel({
          id: `test-rule-${operator}`,
          name: `Test Rule with ${operator}`,
          metric: 'test_metric',
          operator: operator,
          threshold: 50,
        });

        const savedRule = await rule.save();
        expect(savedRule.operator).toBe(operator);
      }
    });
  });

  describe('Indexes', () => {
    it('should have correct indexes defined', async () => {
      const indexes = await alertRuleModel.listIndexes();
      
      // Check for specific indexes
      const indexNames = indexes.map(index => index.name);
      
      expect(indexNames).toContain('metric_1_enabled_1');
      expect(indexNames).toContain('severity_1_enabled_1');
      // Note: Index names may vary based on MongoDB version and configuration
      expect(indexes.length).toBeGreaterThan(1); // At least more than just _id index
    });
  });

  describe('Semantic Accessors', () => {
    let rule: AlertRuleDocument;

    beforeEach(async () => {
      rule = new alertRuleModel({
        id: 'test-rule-5',
        name: 'Test Rule with Accessors',
        metric: 'test_metric',
        operator: '>',
        threshold: 100,
        createdBy: 'test-user',
      });
      
      await rule.save();
    });

    it('should provide semantic accessors for timestamps', () => {
      expect(rule.ruleCreatedAt).toBeDefined();
      expect(rule.ruleUpdatedAt).toBeDefined();
    });

    it('should provide semantic accessors for user fields', () => {
      expect(rule.ruleCreator).toBeDefined();
      expect(rule.ruleOperator).toBe('>');
    });
  });

  describe('Schema Validation', () => {
    it('should reject documents without required fields', async () => {
      const rule = new alertRuleModel({
        // Missing required fields
        name: 'Incomplete Rule',
      });

      await expect(rule.save()).rejects.toThrow();
    });

    it('should enforce unique id constraint', async () => {
      const rule1 = new alertRuleModel({
        id: 'unique-id',
        name: 'Rule 1',
        metric: 'cpu_usage',
        operator: '>',
        threshold: 80,
      });

      await rule1.save();

      const rule2 = new alertRuleModel({
        id: 'unique-id', // Same id
        name: 'Rule 2',
        metric: 'memory_usage',
        operator: '<',
        threshold: 90,
      });

      await expect(rule2.save()).rejects.toThrow();
    });

    it('should handle complex channel configurations', async () => {
      const channels = [
        {
          name: 'Email Channel',
          type: 'email',
          config: { recipients: ['admin@example.com'] },
          enabled: true,
        },
        {
          name: 'Slack Channel',
          type: 'slack',
          config: { webhook: 'https://hooks.slack.com/...' },
          enabled: true,
        },
      ];

      const rule = new alertRuleModel({
        id: 'test-rule-6',
        name: 'Rule with Channels',
        metric: 'api_response_time',
        operator: '>',
        threshold: 5000,
        channels,
      });

      const savedRule = await rule.save();
      expect(savedRule.channels).toHaveLength(2);
      expect(savedRule.channels[0].name).toBe('Email Channel');
      expect(savedRule.channels[1].type).toBe('slack');
    });

    it('should handle complex tag structures', async () => {
      const tags = {
        environment: 'production',
        service: 'api',
        team: 'backend',
        version: '2.1.0',
      };

      const rule = new alertRuleModel({
        id: 'test-rule-7',
        name: 'Rule with Tags',
        metric: 'error_rate',
        operator: '>',
        threshold: 0.05,
        tags,
      });

      const savedRule = await rule.save();
      expect(savedRule.tags).toEqual(tags);
    });
  });
});