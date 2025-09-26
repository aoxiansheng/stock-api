import {
  MONITORING_MESSAGE_STATUS_DESCRIPTIONS,
  MonitoringMessageFormatter,
  MONITORING_METRIC_STATUS_DESCRIPTIONS,
  MONITORING_MESSAGE_TYPES,
  MONITORING_MESSAGE_SEVERITY,
  type MonitoringMessageType,
  type MonitoringMessageSeverity,
  type MonitoringMetricStatusDescriptions,
} from '@monitoring/constants/messages/monitoring-messages.constants';

describe('MonitoringMessagesConstants', () => {
  describe('MONITORING_MESSAGE_STATUS_DESCRIPTIONS', () => {
    it('should define an empty object for message status descriptions', () => {
      expect(MONITORING_MESSAGE_STATUS_DESCRIPTIONS).toEqual({});
    });
  });

  describe('MonitoringMessageFormatter', () => {
    it('should format message by returning the same message', () => {
      const message = 'Test message';
      const formatted = MonitoringMessageFormatter.format(message);
      expect(formatted).toBe(message);
    });

    it('should format empty message', () => {
      const message = '';
      const formatted = MonitoringMessageFormatter.format(message);
      expect(formatted).toBe(message);
    });
  });

  describe('MONITORING_METRIC_STATUS_DESCRIPTIONS', () => {
    it('should define an empty object for metric status descriptions', () => {
      expect(MONITORING_METRIC_STATUS_DESCRIPTIONS).toEqual({});
    });
  });

  describe('MONITORING_MESSAGE_TYPES', () => {
    it('should define all message types', () => {
      expect(MONITORING_MESSAGE_TYPES.OPERATION).toBe('operation');
      expect(MONITORING_MESSAGE_TYPES.ERROR).toBe('error');
      expect(MONITORING_MESSAGE_TYPES.LOG).toBe('log');
      expect(MONITORING_MESSAGE_TYPES.NOTIFICATION).toBe('notification');
      expect(MONITORING_MESSAGE_TYPES.STATUS).toBe('status');
      expect(MONITORING_MESSAGE_TYPES.ACTION).toBe('action');
    });

    it('should have correct type for MonitoringMessageType', () => {
      const messageType: MonitoringMessageType = MONITORING_MESSAGE_TYPES.OPERATION;
      expect(messageType).toBe('operation');
    });
  });

  describe('MONITORING_MESSAGE_SEVERITY', () => {
    it('should define message severity levels', () => {
      expect(MONITORING_MESSAGE_SEVERITY.WARNING).toBe(1);
      expect(MONITORING_MESSAGE_SEVERITY.ERROR).toBe(2);
    });

    it('should have correct type for MonitoringMessageSeverity', () => {
      const severity: MonitoringMessageSeverity = MONITORING_MESSAGE_SEVERITY.WARNING;
      expect(severity).toBe(1);
    });
  });

  describe('Type Definitions', () => {
    it('should have correct type for MonitoringMetricStatusDescriptions', () => {
      const descriptions: MonitoringMetricStatusDescriptions = MONITORING_METRIC_STATUS_DESCRIPTIONS;
      expect(descriptions).toEqual({});
    });
  });
});