import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model } from 'mongoose';

import { AlertRule, AlertRuleSchema, AlertRuleDocument } from '@alert/schemas/alert-rule.schema';
import { AlertHistory, AlertHistorySchema, AlertHistoryDocument } from '@alert/schemas/alert-history.schema';

describe('Alert Schemas Index', () => {
  let mongod: MongoMemoryServer;
  let module: TestingModule;
  let alertRuleModel: Model<AlertRuleDocument>;
  let alertHistoryModel: Model<AlertHistoryDocument>;
  let connection: Connection;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const mongoUri = mongod.getUri();

    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forFeature([
          { name: AlertRule.name, schema: AlertRuleSchema },
          { name: AlertHistory.name, schema: AlertHistorySchema }
        ]),
      ],
    }).compile();

    alertRuleModel = module.get<Model<AlertRuleDocument>>(getModelToken(AlertRule.name));
    alertHistoryModel = module.get<Model<AlertHistoryDocument>>(getModelToken(AlertHistory.name));
    connection = module.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
    await connection.close();
    await mongod.stop();
    await module.close();
  });

  beforeEach(async () => {
    await alertRuleModel.deleteMany({});
    await alertHistoryModel.deleteMany({});
  });

  describe('Schema Exports', () => {
    it('should export AlertRule schema components', () => {
      expect(AlertRule).toBeDefined();
      expect(AlertRuleSchema).toBeDefined();
      expect(alertRuleModel).toBeDefined();
    });

    it('should export AlertHistory schema components', () => {
      expect(AlertHistory).toBeDefined();
      expect(AlertHistorySchema).toBeDefined();
      expect(alertHistoryModel).toBeDefined();
    });

    it('should be able to create instances of both schemas', async () => {
      const rule = new alertRuleModel({
        id: 'export-test-rule',
        name: 'Export Test Rule',
        metric: 'cpu_usage',
        operator: '>',
        threshold: 80,
      });

      const alert = new alertHistoryModel({
        id: 'export-test-alert',
        ruleId: 'export-test-rule',
        ruleName: 'Export Test Rule',
        metric: 'cpu_usage',
        value: 85,
        threshold: 80,
        severity: 'warning' as any,
        status: 'firing' as any,
        message: 'Export test message',
        startTime: new Date(),
      });

      const savedRule = await rule.save();
      const savedAlert = await alert.save();

      expect(savedRule.id).toBe('export-test-rule');
      expect(savedAlert.id).toBe('export-test-alert');
    });
  });

  describe('Schema Integration', () => {
    it('should maintain referential integrity between rules and alerts', async () => {
      // Create a rule
      const rule = new alertRuleModel({
        id: 'integrity-test-rule',
        name: 'Integrity Test Rule',
        metric: 'memory_usage',
        operator: '>',
        threshold: 90,
      });

      await rule.save();

      // Create an alert referencing the rule
      const alert = new alertHistoryModel({
        id: 'integrity-test-alert',
        ruleId: 'integrity-test-rule',
        ruleName: 'Integrity Test Rule',
        metric: 'memory_usage',
        value: 95,
        threshold: 90,
        severity: 'warning' as any,
        status: 'firing' as any,
        message: 'Integrity test message',
        startTime: new Date(),
      });

      const savedAlert = await alert.save();

      // Verify the relationship
      expect(savedAlert.ruleId).toBe('integrity-test-rule');
      expect(savedAlert.ruleName).toBe('Integrity Test Rule');
    });

    it('should support querying related data', async () => {
      // Create multiple rules
      const rules = [
        new alertRuleModel({
          id: 'query-test-rule-1',
          name: 'Query Test Rule 1',
          metric: 'cpu_usage',
          operator: '>',
          threshold: 80,
        }),
        new alertRuleModel({
          id: 'query-test-rule-2',
          name: 'Query Test Rule 2',
          metric: 'memory_usage',
          operator: '>',
          threshold: 90,
        }),
      ];

      await Promise.all(rules.map(rule => rule.save()));

      // Create alerts for both rules
      const alerts = [
        new alertHistoryModel({
          id: 'query-test-alert-1',
          ruleId: 'query-test-rule-1',
          ruleName: 'Query Test Rule 1',
          metric: 'cpu_usage',
          value: 85,
          threshold: 80,
          severity: 'warning' as any,
          status: 'firing' as any,
          message: 'Query test alert 1',
          startTime: new Date(),
        }),
        new alertHistoryModel({
          id: 'query-test-alert-2',
          ruleId: 'query-test-rule-1',
          ruleName: 'Query Test Rule 1',
          metric: 'cpu_usage',
          value: 88,
          threshold: 80,
          severity: 'warning' as any,
          status: 'firing' as any,
          message: 'Query test alert 2',
          startTime: new Date(),
        }),
        new alertHistoryModel({
          id: 'query-test-alert-3',
          ruleId: 'query-test-rule-2',
          ruleName: 'Query Test Rule 2',
          metric: 'memory_usage',
          value: 95,
          threshold: 90,
          severity: 'warning' as any,
          status: 'firing' as any,
          message: 'Query test alert 3',
          startTime: new Date(),
        }),
      ];

      await Promise.all(alerts.map(alert => alert.save()));

      // Query alerts by ruleId
      const rule1Alerts = await alertHistoryModel.find({ ruleId: 'query-test-rule-1' }).exec();
      const rule2Alerts = await alertHistoryModel.find({ ruleId: 'query-test-rule-2' }).exec();

      expect(rule1Alerts).toHaveLength(2);
      expect(rule2Alerts).toHaveLength(1);
      expect(rule1Alerts.every(alert => alert.ruleId === 'query-test-rule-1')).toBe(true);
      expect(rule2Alerts.every(alert => alert.ruleId === 'query-test-rule-2')).toBe(true);
    });
  });
});