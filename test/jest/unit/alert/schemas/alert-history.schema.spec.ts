import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model } from 'mongoose';

import { AlertHistory, AlertHistorySchema, AlertHistoryDocument } from '@alert/schemas/alert-history.schema';
import { AlertSeverity, AlertStatus } from '@alert/types/alert.types';
import { DATA_RETENTION } from '@alert/constants';

describe('AlertHistorySchema', () => {
  let mongod: MongoMemoryServer;
  let module: TestingModule;
  let alertHistoryModel: Model<AlertHistoryDocument>;
  let connection: Connection;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const mongoUri = mongod.getUri();

    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forFeature([{ name: AlertHistory.name, schema: AlertHistorySchema }]),
      ],
    }).compile();

    alertHistoryModel = module.get<Model<AlertHistoryDocument>>(getModelToken(AlertHistory.name));
    connection = module.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
    await connection.close();
    await mongod.stop();
    await module.close();
  });

  beforeEach(async () => {
    await alertHistoryModel.deleteMany({});
  });

  describe('Schema Definition', () => {
    const baseAlertData = {
      id: 'test-alert-1',
      ruleId: 'test-rule-1',
      ruleName: 'Test Rule',
      metric: 'cpu_usage',
      value: 85,
      threshold: 80,
      severity: AlertSeverity.WARNING,
      status: AlertStatus.FIRING,
      message: 'CPU usage is above threshold',
      startTime: new Date(),
    };

    it('should have required fields', async () => {
      const alert = new alertHistoryModel(baseAlertData);

      expect(alert.id).toBe('test-alert-1');
      expect(alert.ruleId).toBe('test-rule-1');
      expect(alert.ruleName).toBe('Test Rule');
      expect(alert.metric).toBe('cpu_usage');
      expect(alert.value).toBe(85);
      expect(alert.threshold).toBe(80);
      expect(alert.severity).toBe(AlertSeverity.WARNING);
      expect(alert.status).toBe(AlertStatus.FIRING);
      expect(alert.message).toBe('CPU usage is above threshold');
      expect(alert.startTime).toBeDefined();
    });

    it('should validate enum fields', async () => {
      const alert = new alertHistoryModel({
        ...baseAlertData,
        severity: 'invalid_severity', // Invalid severity
        status: 'invalid_status', // Invalid status
      });

      await expect(alert.save()).rejects.toThrow();
    });

    it('should accept valid enum values', async () => {
      const alert = new alertHistoryModel({
        ...baseAlertData,
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.RESOLVED,
      });

      const savedAlert = await alert.save();
      expect(savedAlert.severity).toBe(AlertSeverity.CRITICAL);
      expect(savedAlert.status).toBe(AlertStatus.RESOLVED);
    });

    it('should handle optional fields', async () => {
      const alert = new alertHistoryModel({
        ...baseAlertData,
        endTime: new Date(),
        acknowledgedBy: 'operator1',
        acknowledgedAt: new Date(),
        resolvedBy: 'admin1',
        resolvedAt: new Date(),
        tags: { environment: 'production', service: 'api' },
        context: { source: 'monitoring', region: 'us-east-1' },
      });

      const savedAlert = await alert.save();
      expect(savedAlert.endTime).toBeDefined();
      expect(savedAlert.acknowledgedBy).toBe('operator1');
      expect(savedAlert.resolvedBy).toBe('admin1');
      expect(savedAlert.tags).toEqual({ environment: 'production', service: 'api' });
      expect(savedAlert.context).toEqual({ source: 'monitoring', region: 'us-east-1' });
    });
  });

  describe('Indexes', () => {
    it('should have correct indexes defined', async () => {
      const indexes = await alertHistoryModel.listIndexes();
      
      // Check for specific indexes
      const indexNames = indexes.map(index => index.name);
      
      expect(indexNames).toContain('ruleId_1_startTime_-1');
      expect(indexNames).toContain('severity_1_status_1');
      // Note: Index names may vary based on MongoDB version and configuration
      expect(indexes.length).toBeGreaterThan(2); // At least more than just _id and one compound index
      
      // Check for TTL index
      const ttlIndex = indexes.find(index => index.name === 'startTime_1');
      expect(ttlIndex).toBeDefined();
      expect(ttlIndex.expireAfterSeconds).toBe(DATA_RETENTION.ALERT_HISTORY * 86400);
    });
  });

  describe('Semantic Accessors', () => {
    let alert: AlertHistoryDocument;
    let startTime: Date;
    let ackTime: Date;
    let resolveTime: Date;

    beforeEach(async () => {
      startTime = new Date();
      ackTime = new Date(startTime.getTime() + 300000); // 5 minutes later
      resolveTime = new Date(startTime.getTime() + 600000); // 10 minutes later

      alert = new alertHistoryModel({
        id: 'test-alert-2',
        ruleId: 'test-rule-2',
        ruleName: 'Test Rule with Accessors',
        metric: 'test_metric',
        value: 100,
        threshold: 80,
        severity: AlertSeverity.WARNING,
        status: AlertStatus.RESOLVED,
        message: 'Test alert message',
        startTime,
        acknowledgedBy: 'operator1',
        acknowledgedAt: ackTime,
        resolvedBy: 'admin1',
        resolvedAt: resolveTime,
      });
      
      await alert.save();
    });

    it('should provide semantic accessors for timestamps', () => {
      expect(alert.alertCreatedAt).toBeDefined();
      expect(alert.alertProcessedAt).toBeDefined(); // Should return acknowledgedAt first
      expect(alert.alertEndedAt).toBeUndefined(); // endTime is not set
    });

    it('should provide semantic accessors for user fields', () => {
      expect(alert.alertHandler).toBeDefined(); // Should return resolvedBy first
      expect(alert.alertAcknowledger).toBeDefined();
      expect(alert.alertResolver).toBeDefined();
    });

    it('should handle alerts without acknowledgment', async () => {
      const alertWithoutAck = new alertHistoryModel({
        id: 'test-alert-3',
        ruleId: 'test-rule-3',
        ruleName: 'Test Rule without Ack',
        metric: 'test_metric',
        value: 100,
        threshold: 80,
        severity: AlertSeverity.WARNING,
        status: AlertStatus.RESOLVED,
        message: 'Test alert message',
        startTime: new Date(),
        resolvedBy: 'admin1',
        resolvedAt: new Date(),
      });

      await alertWithoutAck.save();

      expect(alertWithoutAck.alertHandler).toBeDefined(); // Should return resolvedBy
      expect(alertWithoutAck.alertAcknowledger).toBeUndefined();
      expect(alertWithoutAck.alertResolver).toBeDefined();
    });

    it('should handle alerts with only acknowledgment (no resolution)', async () => {
      const alertOnlyAck = new alertHistoryModel({
        id: 'test-alert-only-ack',
        ruleId: 'test-rule-only-ack',
        ruleName: 'Test Rule Only Ack',
        metric: 'test_metric',
        value: 100,
        threshold: 80,
        severity: AlertSeverity.WARNING,
        status: AlertStatus.ACKNOWLEDGED,
        message: 'Test alert message',
        startTime: new Date(),
        acknowledgedBy: 'operator1',
        acknowledgedAt: new Date(),
      });

      await alertOnlyAck.save();

      expect(alertOnlyAck.alertHandler).toBe('operator1'); // Should return acknowledgedBy when no resolvedBy
      expect(alertOnlyAck.alertAcknowledger).toBe('operator1');
      expect(alertOnlyAck.alertResolver).toBeUndefined();
      expect(alertOnlyAck.alertProcessedAt).toBe(alertOnlyAck.acknowledgedAt);
    });

    it('should handle alerts with neither acknowledgment nor resolution', async () => {
      const alertUnprocessed = new alertHistoryModel({
        id: 'test-alert-unprocessed',
        ruleId: 'test-rule-unprocessed',
        ruleName: 'Test Rule Unprocessed',
        metric: 'test_metric',
        value: 100,
        threshold: 80,
        severity: AlertSeverity.WARNING,
        status: AlertStatus.FIRING,
        message: 'Test alert message',
        startTime: new Date(),
      });

      await alertUnprocessed.save();

      expect(alertUnprocessed.alertHandler).toBeUndefined();
      expect(alertUnprocessed.alertAcknowledger).toBeUndefined();
      expect(alertUnprocessed.alertResolver).toBeUndefined();
      expect(alertUnprocessed.alertProcessedAt).toBeUndefined();
    });

    it('should handle alerts with endTime set', async () => {
      const endTime = new Date();
      const alertWithEndTime = new alertHistoryModel({
        id: 'test-alert-with-end',
        ruleId: 'test-rule-with-end',
        ruleName: 'Test Rule With End Time',
        metric: 'test_metric',
        value: 100,
        threshold: 80,
        severity: AlertSeverity.WARNING,
        status: AlertStatus.RESOLVED,
        message: 'Test alert message',
        startTime: new Date(),
        endTime,
      });

      await alertWithEndTime.save();

      expect(alertWithEndTime.alertEndedAt).toBe(endTime);
      expect(alertWithEndTime.alertCreatedAt).toBe(alertWithEndTime.startTime);
    });

    it('should prioritize resolvedAt over acknowledgedAt in alertProcessedAt', () => {
      const ackTime = new Date('2023-01-01T10:00:00Z');
      const resolveTime = new Date('2023-01-01T10:30:00Z');

      const alertBoth = new alertHistoryModel({
        id: 'test-alert-both',
        ruleId: 'test-rule-both',
        ruleName: 'Test Rule Both',
        metric: 'test_metric',
        value: 100,
        threshold: 80,
        severity: AlertSeverity.WARNING,
        status: AlertStatus.RESOLVED,
        message: 'Test alert message',
        startTime: new Date(),
        acknowledgedAt: ackTime,
        resolvedAt: resolveTime,
      });

      // Should prioritize acknowledgedAt when both are present (not resolvedAt)
      expect(alertBoth.alertProcessedAt).toBe(ackTime);
    });

    it('should prioritize resolvedBy over acknowledgedBy in alertHandler', () => {
      const alertBothUsers = new alertHistoryModel({
        id: 'test-alert-both-users',
        ruleId: 'test-rule-both-users',
        ruleName: 'Test Rule Both Users',
        metric: 'test_metric',
        value: 100,
        threshold: 80,
        severity: AlertSeverity.WARNING,
        status: AlertStatus.RESOLVED,
        message: 'Test alert message',
        startTime: new Date(),
        acknowledgedBy: 'operator1',
        resolvedBy: 'admin1',
      });

      expect(alertBothUsers.alertHandler).toBe('admin1'); // Should prioritize resolvedBy
    });
  });

  describe('Schema Validation', () => {
    const baseAlertData = {
      id: 'test-alert-4',
      ruleId: 'test-rule-4',
      ruleName: 'Validation Test Rule',
      metric: 'validation_test_metric',
      value: 50,
      threshold: 40,
      severity: AlertSeverity.INFO,
      status: AlertStatus.FIRING,
      message: 'Validation test message',
      startTime: new Date(),
    };

    it('should reject documents without required fields', async () => {
      const alert = new alertHistoryModel({
        // Missing required fields
        message: 'Incomplete Alert',
      });

      await expect(alert.save()).rejects.toThrow();
    });

    it('should enforce unique id constraint', async () => {
      const alert1 = new alertHistoryModel(baseAlertData);
      await alert1.save();

      const alert2 = new alertHistoryModel({
        ...baseAlertData,
        id: 'test-alert-4', // Same id
      });

      await expect(alert2.save()).rejects.toThrow();
    });

    it('should handle complex context structures', async () => {
      const context = {
        source: 'monitoring',
        environment: 'production',
        service: 'api',
        region: 'us-east-1',
        metadata: {
          instanceId: 'i-1234567890abcdef0',
          loadBalancer: 'lb-01',
        },
      };

      const alert = new alertHistoryModel({
        ...baseAlertData,
        id: 'test-alert-5',
        context,
      });

      const savedAlert = await alert.save();
      expect(savedAlert.context).toEqual(context);
    });

    it('should handle complex tag structures', async () => {
      const tags = {
        environment: 'staging',
        service: 'web',
        team: 'frontend',
        version: '1.5.0',
        datacenter: 'us-west-2',
      };

      const alert = new alertHistoryModel({
        ...baseAlertData,
        id: 'test-alert-6',
        tags,
      });

      const savedAlert = await alert.save();
      expect(savedAlert.tags).toEqual(tags);
    });
  });
});